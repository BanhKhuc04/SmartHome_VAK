import cron, { ScheduledTask } from 'node-cron';
import { getDatabase } from './database.service';
import { mqttService } from './mqtt.service';
import { logAuditEvent } from './audit-log.service';
import { AutomationRule, DeviceCommand } from '../types';

type AutomationRow = {
    id: string;
    name: string;
    device_id: string;
    command: DeviceCommand;
    schedule: string;
    enabled: number;
    description: string;
    last_run: string | null;
    created_at: string;
    updated_at: string;
};

class AutomationService {
    private tasks = new Map<string, ScheduledTask>();

    start(): void {
        this.reload();
    }

    stop(): void {
        for (const task of this.tasks.values()) {
            task.stop();
            task.destroy();
        }
        this.tasks.clear();
    }

    reload(): void {
        this.stop();

        const db = getDatabase();
        const automations = db.prepare(`
            SELECT id, name, device_id, command, schedule, enabled, description, last_run, created_at, updated_at
            FROM automations
            WHERE enabled = 1
        `).all() as AutomationRow[];

        for (const automation of automations) {
            if (!cron.validate(automation.schedule)) {
                console.warn(`[Automation] Skipping invalid cron: ${automation.id}`);
                continue;
            }

            const task = cron.schedule(automation.schedule, () => {
                this.executeAutomation(automation.id);
            });

            this.tasks.set(automation.id, task);
        }
    }

    getAll(): AutomationRule[] {
        const db = getDatabase();
        const rows = db.prepare(`
            SELECT id, name, device_id, command, schedule, enabled, description, last_run, created_at, updated_at
            FROM automations
            ORDER BY created_at DESC
        `).all() as AutomationRow[];

        return rows.map(this.mapRow);
    }

    upsert(input: {
        id: string;
        name: string;
        device_id: string;
        command: DeviceCommand;
        schedule: string;
        enabled: boolean;
        description?: string;
    }): AutomationRule {
        const db = getDatabase();
        db.prepare(`
            INSERT INTO automations (id, name, device_id, command, schedule, enabled, description, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                device_id = excluded.device_id,
                command = excluded.command,
                schedule = excluded.schedule,
                enabled = excluded.enabled,
                description = excluded.description,
                updated_at = CURRENT_TIMESTAMP
        `).run(
            input.id,
            input.name,
            input.device_id,
            input.command,
            input.schedule,
            input.enabled ? 1 : 0,
            input.description || ''
        );

        this.reload();

        const row = db.prepare(`
            SELECT id, name, device_id, command, schedule, enabled, description, last_run, created_at, updated_at
            FROM automations
            WHERE id = ?
        `).get(input.id) as AutomationRow;

        logAuditEvent({
            category: 'automation',
            action: 'automation_saved',
            device_id: input.device_id,
            message: `Automation ${input.name} saved`,
            payload_json: input,
        });

        return this.mapRow(row);
    }

    delete(id: string): boolean {
        const db = getDatabase();
        const existing = db.prepare('SELECT name, device_id FROM automations WHERE id = ?').get(id) as { name: string; device_id: string } | undefined;
        const result = db.prepare('DELETE FROM automations WHERE id = ?').run(id);
        this.reload();

        if (existing && result.changes > 0) {
            logAuditEvent({
                category: 'automation',
                action: 'automation_deleted',
                device_id: existing.device_id,
                message: `Automation ${existing.name} deleted`,
            });
        }

        return result.changes > 0;
    }

    private executeAutomation(id: string): void {
        const db = getDatabase();
        const automation = db.prepare(`
            SELECT a.id, a.name, a.device_id, a.command, d.cmd_topic
            FROM automations a
            JOIN devices d ON d.device_id = a.device_id
            WHERE a.id = ?
        `).get(id) as { id: string; name: string; device_id: string; command: DeviceCommand; cmd_topic: string } | undefined;

        if (!automation) return;

        mqttService.publishCommand(automation.cmd_topic, automation.command);
        db.prepare('UPDATE automations SET last_run = CURRENT_TIMESTAMP WHERE id = ?').run(id);

        logAuditEvent({
            category: 'automation',
            action: 'automation_executed',
            device_id: automation.device_id,
            message: `Automation ${automation.name} executed`,
            payload_json: {
                command: automation.command,
                cmd_topic: automation.cmd_topic,
            },
        });
    }

    private mapRow(row: AutomationRow): AutomationRule {
        return {
            id: row.id,
            name: row.name,
            device_id: row.device_id,
            command: row.command,
            schedule: row.schedule,
            enabled: row.enabled === 1,
            description: row.description,
            last_run: row.last_run,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }
}

export const automationService = new AutomationService();
