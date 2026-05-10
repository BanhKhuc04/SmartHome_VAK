import { config } from '../config';
import { getDatabase } from './database.service';
import { wsService } from './websocket.service';
import { telegramService } from './telegram.service';
import { logAuditEvent } from './audit-log.service';
import { DiscoveredModule } from '../types';

const DEVICE_ID_REGEX = /^[a-zA-Z0-9_-]{3,64}$/;
const ALLOWED_TYPES = ['relay', 'pc-control', 'sensor', 'button', 'display', 'light', 'fan', 'custom'];

interface DiscoveryPayload {
    device_id: string;
    name: string;
    type: string;
    platform?: string;
    ip?: string;
    firmware?: string;
    capabilities?: string[];
    topics: {
        cmd: string;
        state: string;
        status: string;
        telemetry: string;
    };
}

class DiscoveryService {
    private lastNotified = new Map<string, number>();

    handleDiscoveryMessage(payload: string): void {
        let data: DiscoveryPayload;
        try {
            data = JSON.parse(payload);
        } catch (error) {
            console.warn('[Discovery] Received invalid JSON payload');
            return;
        }

        if (!this.validatePayload(data)) {
            console.warn(`[Discovery] Invalid payload received for device_id: ${data?.device_id}`);
            return;
        }

        this.upsertDiscoveredModule(data, payload);
    }

    private validatePayload(data: DiscoveryPayload): boolean {
        if (!data.device_id || !DEVICE_ID_REGEX.test(data.device_id)) return false;
        if (!data.name || data.name.length < 2) return false;
        if (!ALLOWED_TYPES.includes(data.type)) return false;
        if (!data.topics || typeof data.topics !== 'object') return false;

        const { cmd, state, status, telemetry } = data.topics;
        const requiredPrefix = `homelab/device/${data.device_id}/`;

        if (!cmd?.startsWith(requiredPrefix)) return false;
        if (!state?.startsWith(requiredPrefix)) return false;
        if (!status?.startsWith(requiredPrefix)) return false;
        if (!telemetry?.startsWith(requiredPrefix)) return false;

        return true;
    }

    private upsertDiscoveredModule(data: DiscoveryPayload, rawPayload: string): void {
        const db = getDatabase();
        
        const existing = db.prepare('SELECT status, last_seen FROM discovered_modules WHERE device_id = ?')
            .get(data.device_id) as { status: string; last_seen: string } | undefined;

        const capabilitiesJson = JSON.stringify(data.capabilities || []);

        if (existing) {
            db.prepare(`
                UPDATE discovered_modules
                SET
                    name = ?,
                    type = ?,
                    platform = ?,
                    ip_address = ?,
                    firmware_version = ?,
                    capabilities_json = ?,
                    cmd_topic = ?,
                    state_topic = ?,
                    status_topic = ?,
                    telemetry_topic = ?,
                    raw_payload_json = ?,
                    last_seen = CURRENT_TIMESTAMP
                WHERE device_id = ?
            `).run(
                data.name,
                data.type,
                data.platform || null,
                data.ip || null,
                data.firmware || null,
                capabilitiesJson,
                data.topics.cmd,
                data.topics.state,
                data.topics.status,
                data.topics.telemetry,
                rawPayload,
                data.device_id
            );
            
            // If already approved, we might want to update the device table too if ip/firmware changed
            if (existing.status === 'approved') {
                this.syncApprovedDevice(data);
            }
        } else {
            db.prepare(`
                INSERT INTO discovered_modules (
                    device_id, name, type, platform, ip_address, firmware_version,
                    capabilities_json, cmd_topic, state_topic, status_topic, telemetry_topic, raw_payload_json
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                data.device_id,
                data.name,
                data.type,
                data.platform || null,
                data.ip || null,
                data.firmware || null,
                capabilitiesJson,
                data.topics.cmd,
                data.topics.state,
                data.topics.status,
                data.topics.telemetry,
                rawPayload
            );

            logAuditEvent({
                category: 'system',
                action: 'module_discovered',
                message: `New module discovered: ${data.device_id} (${data.type})`,
                device_id: data.device_id,
                payload_json: data,
            });

            this.notifyNewDiscovery(data.device_id);
        }

        wsService.broadcast('module_discovery', { 
            device_id: data.device_id, 
            status: existing ? existing.status : 'pending',
            action: existing ? 'updated' : 'new'
        });
    }

    private syncApprovedDevice(data: DiscoveryPayload): void {
        const db = getDatabase();
        db.prepare(`
            UPDATE devices
            SET
                ip_address = COALESCE(?, ip_address),
                firmware_version = COALESCE(?, firmware_version),
                updated_at = CURRENT_TIMESTAMP
            WHERE device_id = ?
        `).run(data.ip || null, data.firmware || null, data.device_id);
    }

    private notifyNewDiscovery(deviceId: string): void {
        const now = Date.now();
        const last = this.lastNotified.get(deviceId) || 0;
        
        if (now - last > 5 * 60 * 1000) {
            void telegramService.notifySystemAlert(
                'Discovery',
                `New module discovered and waiting for approval: <code>${deviceId}</code>`,
                'info'
            );
            this.lastNotified.set(deviceId, now);
        }
    }
}

export const discoveryService = new DiscoveryService();
