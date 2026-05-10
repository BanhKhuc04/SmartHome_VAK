import { config } from '../config';
import { getDatabase } from './database.service';
import { wsService } from './websocket.service';
import { telegramService } from './telegram.service';
import { automationService } from './automation.service';
import { TelemetryPayload } from '../types';

class TelemetryService {
    private lastAlertAt = new Map<string, number>();

    async handleTelemetry(deviceId: string, payload: string) {
        let data: TelemetryPayload;
        try {
            data = JSON.parse(payload);
        } catch (error) {
            console.warn(`[Telemetry] Invalid JSON from ${deviceId}`);
            return;
        }

        if (typeof data !== 'object' || data === null) {
            console.warn(`[Telemetry] Payload is not an object from ${deviceId}`);
            return;
        }

        const normalized = this.normalize(data);
        const db = getDatabase();

        // 1. Update device status/last_seen if known
        const device = db.prepare('SELECT device_id FROM devices WHERE device_id = ?').get(deviceId);
        if (device) {
            db.prepare(`
                UPDATE devices 
                SET status = 'online', last_seen = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE device_id = ?
            `).run(deviceId);

            // 2. Upsert latest telemetry (only for known devices - FK constraint)
            db.prepare(`
                INSERT INTO device_telemetry_latest (
                    device_id, payload_json, temperature, humidity, pressure, rssi, battery, uptime, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(device_id) DO UPDATE SET
                    payload_json = EXCLUDED.payload_json,
                    temperature = EXCLUDED.temperature,
                    humidity = EXCLUDED.humidity,
                    pressure = EXCLUDED.pressure,
                    rssi = EXCLUDED.rssi,
                    battery = EXCLUDED.battery,
                    uptime = EXCLUDED.uptime,
                    updated_at = CURRENT_TIMESTAMP
            `).run(
                deviceId,
                payload,
                normalized.temperature,
                normalized.humidity,
                normalized.pressure,
                normalized.rssi,
                normalized.battery,
                normalized.uptime
            );

            // 3. Insert history
            db.prepare(`
                INSERT INTO device_telemetry_history (
                    device_id, payload_json, temperature, humidity, pressure, rssi, battery, uptime
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                deviceId,
                payload,
                normalized.temperature,
                normalized.humidity,
                normalized.pressure,
                normalized.rssi,
                normalized.battery,
                normalized.uptime
            );

            // 4. Trim history
            this.trimHistory(deviceId);
        } else {
            console.warn(`[Telemetry] Received data from unknown device: ${deviceId} - skipping DB storage`);
        }

        // Trigger Automation Engine
        automationService.handleTelemetryEvent(deviceId, normalized);

        // 5. Check thresholds
        this.checkThresholds(deviceId, normalized);

        // 6. Broadcast via WebSocket
        wsService.broadcast('telemetry_update', {
            device_id: deviceId,
            telemetry: normalized,
            timestamp: new Date().toISOString()
        });
    }

    private normalize(data: TelemetryPayload) {
        return {
            temperature: typeof data.temperature === 'number' ? data.temperature : null,
            humidity: typeof data.humidity === 'number' ? data.humidity : null,
            pressure: typeof data.pressure === 'number' ? data.pressure : null,
            rssi: typeof data.rssi === 'number' ? data.rssi : null,
            battery: typeof data.battery === 'number' ? data.battery : null,
            uptime: typeof data.uptime === 'number' ? data.uptime : null,
            original: data
        };
    }

    private trimHistory(deviceId: string) {
        const db = getDatabase();
        // Keep last 1000 records
        db.prepare(`
            DELETE FROM device_telemetry_history 
            WHERE id IN (
                SELECT id FROM device_telemetry_history 
                WHERE device_id = ? 
                ORDER BY created_at DESC 
                LIMIT -1 OFFSET ?
            )
        `).run(deviceId, config.telemetry.retentionCount);
    }

    private checkThresholds(deviceId: string, data: any) {
        const { thresholds } = config.telemetry;

        // Temperature thresholds
        if (data.temperature !== null) {
            if (data.temperature >= thresholds.temperature.critical) {
                this.sendAlert(deviceId, 'temperature', data.temperature, 'critical');
            } else if (data.temperature >= thresholds.temperature.warning) {
                this.sendAlert(deviceId, 'temperature', data.temperature, 'warning');
            }
        }

        // Humidity thresholds
        if (data.humidity !== null && data.humidity >= thresholds.humidity.warning) {
            this.sendAlert(deviceId, 'humidity', data.humidity, 'warning');
        }

        // RSSI weak
        if (data.rssi !== null && data.rssi <= thresholds.rssi.weak) {
            this.sendAlert(deviceId, 'rssi', data.rssi, 'warning');
        }
    }

    private sendAlert(deviceId: string, metric: string, value: number, severity: 'warning' | 'critical') {
        void telegramService.notifySensorAlert(deviceId, metric, value, severity);
        
        // Also broadcast as system alert via WebSocket
        wsService.broadcast('system_health', {
            type: 'sensor_alert',
            deviceId,
            metric,
            value,
            severity
        });
    }
}

export const telemetryService = new TelemetryService();
