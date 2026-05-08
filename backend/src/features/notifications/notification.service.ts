import { getDatabase } from '../../services/database.service';

type AlertCondition = 'gt' | 'lt' | 'eq' | 'gte' | 'lte';

interface AlertRuleRow {
    id: number;
    name: string;
    device_id: string;
    sensor_id: string;
    condition: AlertCondition;
    threshold: number;
    channel: 'telegram' | 'email';
    enabled: number;
    last_triggered: string | null;
    cooldown_minutes: number;
}

function matchesCondition(value: number, threshold: number, condition: AlertCondition): boolean {
    switch (condition) {
        case 'gt':
            return value > threshold;
        case 'lt':
            return value < threshold;
        case 'eq':
            return value === threshold;
        case 'gte':
            return value >= threshold;
        case 'lte':
            return value <= threshold;
        default:
            return false;
    }
}

function isCoolingDown(lastTriggered: string | null, cooldownMinutes: number): boolean {
    if (!lastTriggered) return false;

    const lastTriggeredAt = new Date(lastTriggered).getTime();
    if (Number.isNaN(lastTriggeredAt)) return false;

    const cooldownMs = Math.max(cooldownMinutes, 0) * 60 * 1000;
    return Date.now() - lastTriggeredAt < cooldownMs;
}

function mapNotificationType(condition: AlertCondition): 'info' | 'warning' | 'danger' {
    if (condition === 'lt' || condition === 'lte') {
        return 'warning';
    }

    return 'danger';
}

export function checkAlertRules(deviceId: string, sensorId: string, value: number): void {
    const db = getDatabase();

    const rules = db.prepare(`
        SELECT id, name, device_id, sensor_id, condition, threshold, channel, enabled, last_triggered, cooldown_minutes
        FROM alert_rules
        WHERE device_id = ? AND sensor_id = ? AND enabled = 1
    `).all(deviceId, sensorId) as AlertRuleRow[];

    if (rules.length === 0) return;

    const insertNotification = db.prepare(`
        INSERT INTO notifications (type, title, message, status)
        VALUES (?, ?, ?, 'unread')
    `);

    const updateRule = db.prepare(`
        UPDATE alert_rules
        SET last_triggered = CURRENT_TIMESTAMP
        WHERE id = ?
    `);

    const getDeviceAndSensor = db.prepare(`
        SELECT d.name AS device_name, s.name AS sensor_name, s.unit AS sensor_unit
        FROM devices d
        LEFT JOIN sensors s ON s.device_id = d.id AND s.id = ?
        WHERE d.id = ?
    `);

    const metadata = getDeviceAndSensor.get(sensorId, deviceId) as
        | { device_name?: string; sensor_name?: string; sensor_unit?: string }
        | undefined;

    for (const rule of rules) {
        if (!matchesCondition(value, rule.threshold, rule.condition)) {
            continue;
        }

        if (isCoolingDown(rule.last_triggered, rule.cooldown_minutes)) {
            continue;
        }

        const sensorLabel = metadata?.sensor_name || sensorId;
        const deviceLabel = metadata?.device_name || deviceId;
        const unit = metadata?.sensor_unit || '';
        const formattedValue = `${value}${unit ? ` ${unit}` : ''}`;
        const formattedThreshold = `${rule.threshold}${unit ? ` ${unit}` : ''}`;

        insertNotification.run(
            mapNotificationType(rule.condition),
            rule.name,
            `${sensorLabel} on ${deviceLabel} reached ${formattedValue} (rule: ${rule.condition} ${formattedThreshold}).`
        );

        updateRule.run(rule.id);
        console.log(`[Notifications] Triggered alert rule #${rule.id} for ${deviceId}/${sensorId}`);
    }
}
