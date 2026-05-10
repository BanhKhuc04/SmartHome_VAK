import cron, { ScheduledTask } from 'node-cron';
import { getDatabase } from './database.service';
import { mqttService } from './mqtt.service';
import { telegramService } from './telegram.service';
import { logAuditEvent } from './audit-log.service';
import { wsService } from './websocket.service';
import {
    AutomationRule,
    AutomationRun,
    RuleTriggerType,
    RuleAction,
    RuleConditionGroup,
    ConditionField,
    DeviceStatus
} from '../types';

class AutomationService {
    private scheduledTasks = new Map<string, ScheduledTask>();

    start(): void {
        this.reloadSchedules();
    }

    stop(): void {
        for (const task of this.scheduledTasks.values()) {
            task.stop();
        }
        this.scheduledTasks.clear();
    }

    reloadSchedules(): void {
        this.stop();
        const db = getDatabase();
        const rules = db.prepare(`SELECT * FROM automation_rules WHERE enabled = 1 AND trigger_type = 'schedule'`).all() as any[];

        for (const row of rules) {
            const rule = this.mapRowToRule(row);
            const cronExpression = rule.trigger_config?.cron;
            if (cronExpression && cron.validate(cronExpression)) {
                const task = cron.schedule(cronExpression, () => {
                    this.evaluateRule(rule, { source: 'schedule', cron: cronExpression });
                });
                this.scheduledTasks.set(rule.id, task);
            } else {
                console.warn(`[Automation] Invalid or missing cron expression for rule ${rule.id}`);
            }
        }
    }

    // ==========================================
    // Event Hooks
    // ==========================================

    handleTelemetryEvent(deviceId: string, payload: any): void {
        const rules = this.getEnabledRulesByTrigger('telemetry');
        for (const rule of rules) {
            const targetDevice = rule.trigger_config?.device_id;
            if (targetDevice === '*' || targetDevice === deviceId) {
                // Combine payload with deviceId for variable substitution and evaluation
                const triggerData = { device_id: deviceId, ...payload };
                this.evaluateRule(rule, triggerData);
            }
        }
    }

    handleDeviceStatusEvent(deviceId: string, status: DeviceStatus): void {
        const rules = this.getEnabledRulesByTrigger('device_status');
        for (const rule of rules) {
            const targetDevice = rule.trigger_config?.device_id;
            const targetStatus = rule.trigger_config?.status;
            if ((targetDevice === '*' || targetDevice === deviceId) &&
                (targetStatus === '*' || targetStatus === status)) {
                this.evaluateRule(rule, { device_id: deviceId, status });
            }
        }
    }

    handleMqttEvent(event: string): void {
        const rules = this.getEnabledRulesByTrigger('mqtt_event');
        for (const rule of rules) {
            if (rule.trigger_config?.event === event || rule.trigger_config?.event === '*') {
                this.evaluateRule(rule, { event });
            }
        }
    }

    // ==========================================
    // Core Engine
    // ==========================================

    async evaluateRule(rule: AutomationRule, triggerData: any, isManual: boolean = false): Promise<void> {
        // 1. Check Cooldown (skip if manual)
        if (!isManual && rule.last_triggered_at) {
            const lastTrigger = new Date(rule.last_triggered_at).getTime();
            const now = Date.now();
            if (now - lastTrigger < rule.cooldown_seconds * 1000) {
                this.recordRun(rule.id, 'skipped', triggerData, null, null, 'Cooldown active');
                return;
            }
        }

        // 2. Evaluate Conditions
        let conditionsMet = true;
        let conditionResult: any = { matched: true };

        if (rule.conditions && Object.keys(rule.conditions).length > 0) {
            conditionsMet = this.checkConditions(rule.conditions, triggerData);
            conditionResult = { matched: conditionsMet, data: triggerData };
        }

        if (!conditionsMet) {
            // We usually don't record failed condition checks to avoid spam, unless manual
            if (isManual) {
                this.recordRun(rule.id, 'failed', triggerData, conditionResult, null, 'Conditions not met');
            }
            return;
        }

        // 3. Execute Actions
        let actionResult: any = [];
        let status: 'success' | 'failed' = 'success';
        let errorMessage = '';

        try {
            for (const action of rule.actions) {
                const res = await this.executeAction(action, triggerData, rule);
                actionResult.push(res);
            }
        } catch (err: any) {
            status = 'failed';
            errorMessage = err.message || 'Action execution failed';
        }

        // 4. Update Rule Status and Record Run
        const db = getDatabase();
        db.prepare('UPDATE automation_rules SET last_triggered_at = CURRENT_TIMESTAMP, last_result = ? WHERE id = ?')
            .run(status, rule.id);

        this.recordRun(rule.id, status, triggerData, conditionResult, actionResult, status === 'success' ? 'Executed successfully' : errorMessage);
    }

    private checkConditions(conditions: RuleConditionGroup, data: any): boolean {
        if (conditions.all && conditions.all.length > 0) {
            for (const cond of conditions.all) {
                if (!this.evaluateConditionField(cond, data)) return false;
            }
        }
        if (conditions.any && conditions.any.length > 0) {
            let anyMatched = false;
            for (const cond of conditions.any) {
                if (this.evaluateConditionField(cond, data)) {
                    anyMatched = true;
                    break;
                }
            }
            if (!anyMatched) return false;
        }
        return true;
    }

    private evaluateConditionField(cond: ConditionField, data: any): boolean {
        // Resolve nested fields like payload.temperature if needed, though usually flat
        const actualValue = data[cond.field];
        const targetValue = cond.value;

        switch (cond.operator) {
            case '>': return Number(actualValue) > Number(targetValue);
            case '>=': return Number(actualValue) >= Number(targetValue);
            case '<': return Number(actualValue) < Number(targetValue);
            case '<=': return Number(actualValue) <= Number(targetValue);
            case '==': return actualValue == targetValue;
            case '!=': return actualValue != targetValue;
            case 'contains': return String(actualValue).includes(String(targetValue));
            case 'exists': return actualValue !== undefined && actualValue !== null;
            default: return false;
        }
    }

    private async executeAction(action: RuleAction, data: any, rule: AutomationRule): Promise<any> {
        if (action.type === 'telegram') {
            const message = this.replaceVariables(action.message || 'Automation triggered', data, rule);
            await telegramService.sendTelegramMessage(message);
            return { action: 'telegram', message };
        } 
        
        if (action.type === 'device_command') {
            const deviceId = action.device_id;
            const command = action.command;
            if (deviceId && command) {
                const db = getDatabase();
                const device = db.prepare('SELECT cmd_topic FROM devices WHERE device_id = ?').get(deviceId) as { cmd_topic: string } | undefined;
                if (device?.cmd_topic) {
                    mqttService.publishRaw(device.cmd_topic, command);
                    return { action: 'device_command', target: deviceId, command };
                } else {
                    throw new Error(`Device ${deviceId} not found or no cmd_topic`);
                }
            }
        }

        if (action.type === 'log') {
            const message = this.replaceVariables(action.message || `Rule ${rule.name} triggered`, data, rule);
            logAuditEvent({
                category: 'automation',
                action: 'rule_log',
                message,
                payload_json: data
            });
            return { action: 'log', message };
        }

        return { action: action.type, result: 'unknown' };
    }

    private replaceVariables(template: string, data: any, rule: AutomationRule): string {
        let result = template;
        const vars = { ...data, rule_name: rule.name, timestamp: new Date().toISOString() };
        
        // Match {{variable}}
        result = result.replace(/\{\{([^}]+)\}\}/g, (match, p1) => {
            const key = p1.trim();
            const val = vars[key];
            return (val !== undefined && val !== null) ? String(val) : 'N/A';
        });
        
        return result;
    }

    private recordRun(ruleId: string, status: string, triggerSnapshot: any, conditionResult: any, actionResult: any, message: string): void {
        const db = getDatabase();
        const runId = db.prepare(`
            INSERT INTO automation_runs (rule_id, status, trigger_snapshot_json, condition_result_json, action_result_json, message)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            ruleId,
            status,
            triggerSnapshot ? JSON.stringify(triggerSnapshot) : null,
            conditionResult ? JSON.stringify(conditionResult) : null,
            actionResult ? JSON.stringify(actionResult) : null,
            message
        ).lastInsertRowid;

        const run = this.getRun(Number(runId));
        if (run) {
            wsService.broadcast('automation_run', run);
        }
    }

    // ==========================================
    // CRUD Operations
    // ==========================================

    getAll(): AutomationRule[] {
        const db = getDatabase();
        const rows = db.prepare(`SELECT * FROM automation_rules ORDER BY created_at DESC`).all() as any[];
        return rows.map(r => this.mapRowToRule(r));
    }

    getById(id: string): AutomationRule | undefined {
        const db = getDatabase();
        const row = db.prepare(`SELECT * FROM automation_rules WHERE id = ?`).get(id) as any;
        return row ? this.mapRowToRule(row) : undefined;
    }

    upsert(rule: Partial<AutomationRule>): AutomationRule {
        const db = getDatabase();
        const id = rule.id || `rule_${Date.now()}`;
        
        db.prepare(`
            INSERT INTO automation_rules (id, name, description, enabled, trigger_type, trigger_config_json, conditions_json, actions_json, cooldown_seconds, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                description = excluded.description,
                enabled = excluded.enabled,
                trigger_type = excluded.trigger_type,
                trigger_config_json = excluded.trigger_config_json,
                conditions_json = excluded.conditions_json,
                actions_json = excluded.actions_json,
                cooldown_seconds = excluded.cooldown_seconds,
                updated_at = CURRENT_TIMESTAMP
        `).run(
            id,
            rule.name || '',
            rule.description || '',
            rule.enabled ? 1 : 0,
            rule.trigger_type || 'manual',
            JSON.stringify(rule.trigger_config || {}),
            rule.conditions ? JSON.stringify(rule.conditions) : null,
            JSON.stringify(rule.actions || []),
            rule.cooldown_seconds || 300
        );

        this.reloadSchedules();
        return this.getById(id)!;
    }

    delete(id: string): boolean {
        const db = getDatabase();
        const result = db.prepare('DELETE FROM automation_rules WHERE id = ?').run(id);
        this.reloadSchedules();
        return result.changes > 0;
    }

    toggleEnable(id: string, enabled: boolean): boolean {
        const db = getDatabase();
        const result = db.prepare('UPDATE automation_rules SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id);
        this.reloadSchedules();
        return result.changes > 0;
    }

    getRecentRuns(limit: number = 100, ruleId?: string): AutomationRun[] {
        const db = getDatabase();
        let query = 'SELECT * FROM automation_runs';
        const params: any[] = [];
        
        if (ruleId) {
            query += ' WHERE rule_id = ?';
            params.push(ruleId);
        }
        
        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(limit);

        const rows = db.prepare(query).all(...params) as any[];
        return rows.map(r => this.mapRowToRun(r));
    }

    private getRun(id: number): AutomationRun | undefined {
        const db = getDatabase();
        const row = db.prepare('SELECT * FROM automation_runs WHERE id = ?').get(id) as any;
        return row ? this.mapRowToRun(row) : undefined;
    }

    private getEnabledRulesByTrigger(triggerType: RuleTriggerType): AutomationRule[] {
        const db = getDatabase();
        const rows = db.prepare(`SELECT * FROM automation_rules WHERE enabled = 1 AND trigger_type = ?`).all(triggerType) as any[];
        return rows.map(r => this.mapRowToRule(r));
    }

    private mapRowToRule(row: any): AutomationRule {
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            enabled: row.enabled === 1,
            trigger_type: row.trigger_type,
            trigger_config: JSON.parse(row.trigger_config_json),
            conditions: row.conditions_json ? JSON.parse(row.conditions_json) : null,
            actions: JSON.parse(row.actions_json),
            cooldown_seconds: row.cooldown_seconds,
            last_triggered_at: row.last_triggered_at,
            last_result: row.last_result,
            created_at: row.created_at,
            updated_at: row.updated_at
        };
    }

    private mapRowToRun(row: any): AutomationRun {
        return {
            id: row.id,
            rule_id: row.rule_id,
            status: row.status,
            trigger_snapshot: row.trigger_snapshot_json ? JSON.parse(row.trigger_snapshot_json) : null,
            condition_result: row.condition_result_json ? JSON.parse(row.condition_result_json) : null,
            action_result: row.action_result_json ? JSON.parse(row.action_result_json) : null,
            message: row.message,
            created_at: row.created_at
        };
    }
}

export const automationService = new AutomationService();
