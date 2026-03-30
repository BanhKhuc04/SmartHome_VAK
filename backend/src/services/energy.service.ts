import { getDatabase } from './database.service';
import { mqttBridgeService } from './mqtt-bridge.service';
import { wsService } from './websocket.service';

export interface EnergyAnalytics {
    hourly: { hour: string; usage: number }[];
    daily: { day: string; usage: number }[];
    monthly: { month: string; usage: number }[];
}

class EnergyService {
    init(mqttBridge: typeof mqttBridgeService): void {
        console.log('[Energy] Initializing energy tracking...');
        mqttBridge.registerHandler('state', (room: string, deviceId: string, payload: any) => {
            if (payload && payload.power_usage !== undefined) {
                this.logEnergy(deviceId, payload.power_usage);
                wsService.broadcast('energy_update', { room, deviceId, power_usage: payload.power_usage });
            }
        });
    }

    logEnergy(deviceId: string, powerUsage: number): void {
        const db = getDatabase();
        try {
            db.prepare('INSERT INTO energy_logs (device_id, power_usage) VALUES (?, ?)').run(deviceId, powerUsage);
        } catch (err) {
            console.error(`[Energy] Error logging power usage for ${deviceId}:`, err);
        }
    }

    getAggregatedUsage(deviceId: string, timeframe: 'hourly' | 'daily' | 'monthly'): any[] {
        const db = getDatabase();
        let query = '';

        if (timeframe === 'hourly') {
            query = `
                SELECT strftime('%Y-%m-%d %H:00', recorded_at) as time, AVG(power_usage) as usage
                FROM energy_logs
                WHERE device_id = ? AND recorded_at > datetime('now', '-24 hours')
                GROUP BY time
                ORDER BY time ASC
            `;
        } else if (timeframe === 'daily') {
            query = `
                SELECT strftime('%Y-%m-%d', recorded_at) as time, AVG(power_usage) as usage
                FROM energy_logs
                WHERE device_id = ? AND recorded_at > datetime('now', '-30 days')
                GROUP BY time
                ORDER BY time ASC
            `;
        } else {
            query = `
                SELECT strftime('%Y-%m', recorded_at) as time, AVG(power_usage) as usage
                FROM energy_logs
                WHERE device_id = ?
                GROUP BY time
                ORDER BY time ASC
            `;
        }

        return db.prepare(query).all(deviceId);
    }

    getEnergySummary(deviceId?: string): any {
        const db = getDatabase();
        const params = deviceId ? [deviceId] : [];
        const filter = deviceId ? 'WHERE device_id = ?' : '';

        const totalUsage = db.prepare(`SELECT SUM(power_usage) as total FROM energy_logs ${filter}`).get(...params) as { total: number };
        const avgUsageDay = db.prepare(`
            SELECT AVG(daily_avg) as avg FROM (
                SELECT AVG(power_usage) as daily_avg FROM energy_logs ${filter} GROUP BY strftime('%Y-%m-%d', recorded_at)
            )
        `).get(...params) as { avg: number };

        return {
            total: totalUsage.total || 0,
            averageDaily: avgUsageDay.avg || 0
        };
    }
}

export const energyService = new EnergyService();
