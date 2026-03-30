import { getDatabase } from './database.service';
import { mqttService } from './mqtt.service';
import { wsService } from './websocket.service';

export interface AutomationRule {
    id: string;
    name: string;
    trigger_json: string;
    conditions_json: string;
    actions_json: string;
    enabled: number;
    last_triggered?: string;
}

class AutomationService {
    private interval: NodeJS.Timeout | null = null;

    start(): void {
        console.log('[Automation] Starting engine...');
        this.interval = setInterval(() => this.evaluateRules(), 1000);
    }

    stop(): void {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    async evaluateRules(): Promise<void> {
        const db = getDatabase();
        const rules = db.prepare('SELECT * FROM automation_rules WHERE enabled = 1').all() as AutomationRule[];

        for (const rule of rules) {
            try {
                const trigger = JSON.parse(rule.trigger_json);
                const conditions = JSON.parse(rule.conditions_json);
                const actions = JSON.parse(rule.actions_json);

                if (this.checkTrigger(trigger) && this.checkConditions(conditions)) {
                    await this.executeActions(rule.id, actions);
                }
            } catch (err) {
                console.error(`[Automation] Error evaluating rule ${rule.id}:`, err);
            }
        }
    }

    private checkTrigger(trigger: any): boolean {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        if (trigger.type === 'time') {
            return trigger.value === currentTime;
        }

        const db = getDatabase();
        if (trigger.type === 'sensor') {
            const sensorState = db.prepare(`
                SELECT value FROM sensor_history 
                WHERE sensor_id = ? AND device_id = ? 
                ORDER BY recorded_at DESC LIMIT 1
            `).get(trigger.sensorId, trigger.deviceId) as { value: number } | undefined;

            if (!sensorState) return false;

            const val = sensorState.value;
            if (trigger.operator === 'gt') return val > trigger.value;
            if (trigger.operator === 'lt') return val < trigger.value;
            if (trigger.operator === 'eq') return val == trigger.value;
        }

        if (trigger.type === 'device') {
            const device = db.prepare('SELECT status FROM devices WHERE id = ?').get(trigger.deviceId) as { status: string } | undefined;
            return device?.status === trigger.value;
        }
        
        return false;
    }

    private checkConditions(conditions: any[]): boolean {
        if (!conditions || conditions.length === 0) return true;

        const db = getDatabase();
        for (const cond of conditions) {
            if (cond.type === 'sensor') {
                const sensorState = db.prepare(`
                    SELECT value FROM sensor_history 
                    WHERE sensor_id = ? AND device_id = ? 
                    ORDER BY recorded_at DESC LIMIT 1
                `).get(cond.sensorId, cond.deviceId) as { value: number } | undefined;
                
                if (!sensorState) return false;

                const val = sensorState.value;
                if (cond.operator === 'gt' && !(val > cond.value)) return false;
                if (cond.operator === 'lt' && !(val < cond.value)) return false;
                if (cond.operator === 'eq' && !(val == cond.value)) return false;
            }
        }

        return true;
    }

    private async executeActions(ruleId: string, actions: any[]): Promise<void> {
        const db = getDatabase();
        
        // Cooldown guard to prevent rapid firing (especially for time triggers within the same minute)
        const rule = db.prepare('SELECT last_triggered FROM automation_rules WHERE id = ?').get(ruleId) as { last_triggered: string };
        if (rule.last_triggered) {
            const lastTrip = new Date(rule.last_triggered).getTime();
            if (Date.now() - lastTrip < 55000) return; // ~1 minute cooldown
        }

        console.log(`[Automation] ⚡ Triggering rule: ${ruleId}`);
        
        for (const action of actions) {
            if (action.type === 'device') {
                const device = db.prepare(`
                    SELECT d.location, r.name as room_name 
                    FROM devices d 
                    LEFT JOIN rooms r ON d.room_id = r.id 
                    WHERE d.id = ?
                `).get(action.deviceId) as { location: string, room_name: string | null };

                const topicRoom = device?.room_name || device?.location || 'default';
                mqttService.publishCommand(topicRoom, action.deviceId, action.command);
            } 
            else if (action.type === 'scene') {
                // Future: Implement scene activation logic
                console.log(`[Automation] Activating scene: ${action.sceneId}`);
            }
            else if (action.type === 'notification') {
                db.prepare(`
                    INSERT INTO notifications (type, title, message) 
                    VALUES (?, ?, ?)
                `).run(action.level || 'info', action.title || 'Automation Alert', action.message);
                wsService.broadcast('notification', { title: action.title, message: action.message });
            }
        }

        db.prepare('UPDATE automation_rules SET last_triggered = CURRENT_TIMESTAMP WHERE id = ?').run(ruleId);
        wsService.broadcast('automation_triggered', { ruleId });
    }
}

export const automationService = new AutomationService();
