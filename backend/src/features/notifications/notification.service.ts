import { getDatabase } from '../../services/database.service';
import { wsService } from '../../services/websocket.service';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

interface AlertRule {
    id: number; name: string; device_id: string; sensor_id: string;
    condition: string; threshold: number; channel: string;
    enabled: number; last_triggered: string | null; cooldown_minutes: number;
}

export function createNotification(type: 'info' | 'warning' | 'danger' | 'success', title: string, message: string): void {
    const db = getDatabase();
    try {
        const result = db.prepare(
            'INSERT INTO notifications (type, title, message) VALUES (?, ?, ?)'
        ).run(type, title, message);

        // Broadcast to all clients
        wsService.broadcast('notification', {
            id: result.lastInsertRowid,
            type,
            title,
            message,
            status: 'unread',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[NotificationService] Failed to save notification:', error);
    }
}

export function checkAlertRules(deviceId: string, sensorId: string, value: number): void {
    const db = getDatabase();
    const rules = db.prepare(
        'SELECT * FROM alert_rules WHERE device_id = ? AND sensor_id = ? AND enabled = 1'
    ).all(deviceId, sensorId) as AlertRule[];

    for (const rule of rules) {
        if (isTriggered(rule, value)) {
            // Check cooldown
            if (rule.last_triggered) {
                const lastTriggered = new Date(rule.last_triggered).getTime();
                const cooldownMs = rule.cooldown_minutes * 60000;
                if (Date.now() - lastTriggered < cooldownMs) continue;
            }

            triggerAlert(rule, value);
        }
    }
}

function isTriggered(rule: AlertRule, value: number): boolean {
    switch (rule.condition) {
        case 'gt': return value > rule.threshold;
        case 'lt': return value < rule.threshold;
        case 'gte': return value >= rule.threshold;
        case 'lte': return value <= rule.threshold;
        case 'eq': return value === rule.threshold;
        default: return false;
    }
}

function triggerAlert(rule: AlertRule, value: number): void {
    const db = getDatabase();
    const conditionText: Record<string, string> = {
        gt: '>', lt: '<', gte: '>=', lte: '<=', eq: '=',
    };

    const message = `⚠️ Alert: ${rule.name}\nDevice: ${rule.device_id}\nSensor: ${rule.sensor_id}\nValue: ${value} ${conditionText[rule.condition]} ${rule.threshold}`;

    console.log(`[Alert] ${message}`);

    // Save and Broadcast
    createNotification('danger', `Alert: ${rule.name}`, message);

    // Send notification to external channels
    if (rule.channel === 'telegram') {
        sendTelegramNotification(message);
    }
}

async function sendTelegramNotification(message: string): Promise<void> {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.log('[Telegram] Bot not configured, skipping notification');
        return;
    }

    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML' }),
        });

        if (!response.ok) {
            console.error('[Telegram] Send failed:', response.statusText);
        } else {
            console.log('[Telegram] Notification sent');
        }
    } catch (error) {
        console.error('[Telegram] Error:', error);
    }
}
