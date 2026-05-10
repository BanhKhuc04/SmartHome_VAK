import axios from 'axios';
import { config } from '../config';

class TelegramService {
    private lastSentAt = new Map<string, number>();
    private readonly spamThreshold = 5 * 60 * 1000; // 5 minutes

    isTelegramEnabled(): boolean {
        return config.telegram.enabled && !!config.telegram.botToken && !!config.telegram.chatId;
    }

    async sendTelegramMessage(text: string): Promise<boolean> {
        if (!this.isTelegramEnabled()) return false;

        try {
            const url = `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`;
            await axios.post(url, {
                chat_id: config.telegram.chatId,
                text,
                parse_mode: 'HTML',
            }, { timeout: 5000 });
            return true;
        } catch (error: any) {
            console.warn(`[Telegram] Failed to send message: ${error.message}`);
            return false;
        }
    }

    async notifyCommandSuccess(deviceName: string, command: string, topic: string) {
        if (!config.telegram.notifyCommands) return;
        const msg = `✅ <b>Command Success</b>\nDevice: <code>${deviceName}</code>\nAction: <code>${command}</code>\nTopic: <code>${topic}</code>`;
        await this.sendTelegramMessage(msg);
    }

    async notifyCommandFailure(deviceName: string, command: string, error: string) {
        if (!config.telegram.notifyErrors) return;
        const msg = `❌ <b>Command Failed</b>\nDevice: <code>${deviceName}</code>\nAction: <code>${command}</code>\nError: <code>${error}</code>`;
        await this.sendTelegramMessage(msg);
    }

    async notifySystemAlert(title: string, message: string, severity: 'info' | 'warning' | 'error' = 'info') {
        if (!config.telegram.notifySystem) return;
        
        // Anti-spam logic for system alerts
        const cacheKey = `alert:${title}:${severity}`;
        const now = Date.now();
        const lastSent = this.lastSentAt.get(cacheKey) || 0;
        
        if (now - lastSent < this.spamThreshold) {
            return;
        }

        const icon = severity === 'error' ? '🚨' : severity === 'warning' ? '⚠️' : 'ℹ️';
        const msg = `${icon} <b>System ${title}</b>\n${message}`;
        
        if (await this.sendTelegramMessage(msg)) {
            this.lastSentAt.set(cacheKey, now);
        }
    }

    async notifyMqttConnected() {
        await this.notifySystemAlert('MQTT Connected', 'Nexus established link with broker.', 'info');
    }

    async notifyMqttDisconnected() {
        await this.notifySystemAlert('MQTT Offline', 'Nexus lost connection to broker!', 'error');
    }

    async notifySensorAlert(deviceId: string, metric: string, value: any, severity: 'warning' | 'critical') {
        if (!config.telegram.notifySystem) return;
        
        const cacheKey = `sensor:${deviceId}:${metric}:${severity}`;
        const now = Date.now();
        const lastSent = this.lastSentAt.get(cacheKey) || 0;
        
        if (now - lastSent < this.spamThreshold) return;

        const icon = severity === 'critical' ? '🚨' : '⚠️';
        const msg = `${icon} <b>Sensor Alert</b>\nDevice: <code>${deviceId}</code>\nMetric: <code>${metric}</code>\nValue: <code>${value}</code>\nSeverity: <b>${severity.toUpperCase()}</b>`;
        
        if (await this.sendTelegramMessage(msg)) {
            this.lastSentAt.set(cacheKey, now);
        }
    }
}

export const telegramService = new TelegramService();
