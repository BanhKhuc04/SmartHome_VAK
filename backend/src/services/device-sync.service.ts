import { getDatabase } from './database.service';
import { mqttService } from './mqtt.service';
import { logAuditEvent } from './audit-log.service';
import { wsService } from './websocket.service';
import { DeviceStatus, MqttInboundMessage } from '../types';

function extractDeviceId(topic: string): string | null {
    const parts = topic.split('/');
    return parts.length >= 3 ? parts[2] : null;
}

function asObject(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }
    return value as Record<string, unknown>;
}

function normalizeStatus(value: unknown): DeviceStatus {
    if (typeof value === 'string') {
        if (value === 'online' || value === 'offline') {
            return value;
        }
    }
    return 'unknown';
}

function ensureKnownDevice(device_id: string): void {
    const db = getDatabase();
    const existing = db.prepare('SELECT device_id FROM devices WHERE device_id = ?').get(device_id) as { device_id: string } | undefined;
    if (existing) return;

    const topicBase = `homelab/device/${device_id}`;
    db.prepare(`
        INSERT INTO devices (
            device_id, name, type, location, status, cmd_topic, state_topic, status_topic, telemetry_topic, metadata_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        device_id,
        device_id,
        'generic-module',
        '',
        'unknown',
        `${topicBase}/cmd`,
        `${topicBase}/state`,
        `${topicBase}/status`,
        `${topicBase}/telemetry`,
        JSON.stringify({})
    );
}

function updateDeviceHeartbeat(device_id: string, patch: {
    status?: DeviceStatus;
    ip_address?: string | null;
    firmware_version?: string | null;
}): void {
    const db = getDatabase();
    db.prepare(`
        UPDATE devices
        SET
            status = COALESCE(?, status),
            ip_address = COALESCE(?, ip_address),
            firmware_version = COALESCE(?, firmware_version),
            last_seen = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE device_id = ?
    `).run(
        patch.status ?? null,
        patch.ip_address ?? null,
        patch.firmware_version ?? null,
        device_id
    );
}

function broadcastDeviceStatus(device_id: string): void {
    const db = getDatabase();
    const row = db.prepare(`
        SELECT device_id, status, ip_address, firmware_version, last_seen
        FROM devices
        WHERE device_id = ?
    `).get(device_id) as {
        device_id: string;
        status: DeviceStatus;
        ip_address: string | null;
        firmware_version: string | null;
        last_seen: string | null;
    };

    if (row) {
        wsService.broadcast('device_status', row);
    }
}

function handleStatusMessage(message: MqttInboundMessage): void {
    const device_id = extractDeviceId(message.topic);
    if (!device_id) return;

    ensureKnownDevice(device_id);

    const payload = asObject(message.parsedPayload);
    const statusValue = payload?.status ?? message.parsedPayload;
    const ipAddress = typeof payload?.ip_address === 'string'
        ? payload.ip_address
        : typeof payload?.ip === 'string'
            ? payload.ip
            : null;
    const firmwareVersion = typeof payload?.firmware_version === 'string'
        ? payload.firmware_version
        : typeof payload?.firmware === 'string'
            ? payload.firmware
            : null;

    updateDeviceHeartbeat(device_id, {
        status: normalizeStatus(statusValue),
        ip_address: ipAddress,
        firmware_version: firmwareVersion,
    });

    logAuditEvent({
        category: 'mqtt_event',
        action: 'status_received',
        device_id,
        message: `MQTT status received for ${device_id}`,
        payload_json: {
            topic: message.topic,
            payload: message.parsedPayload,
        },
    });

    broadcastDeviceStatus(device_id);
}

function handleStateMessage(message: MqttInboundMessage): void {
    const device_id = extractDeviceId(message.topic);
    if (!device_id) return;

    ensureKnownDevice(device_id);
    updateDeviceHeartbeat(device_id, {});

    const db = getDatabase();
    db.prepare(`
        INSERT INTO device_states (device_id, state_value, payload_json, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(device_id) DO UPDATE SET
            state_value = excluded.state_value,
            payload_json = excluded.payload_json,
            updated_at = CURRENT_TIMESTAMP
    `).run(
        device_id,
        typeof message.parsedPayload === 'string' ? message.parsedPayload : message.rawPayload,
        JSON.stringify(message.parsedPayload)
    );

    logAuditEvent({
        category: 'mqtt_event',
        action: 'state_received',
        device_id,
        message: `MQTT state received for ${device_id}`,
        payload_json: {
            topic: message.topic,
            payload: message.parsedPayload,
        },
    });

    wsService.broadcast('device_state', {
        device_id,
        state: message.parsedPayload,
        raw_payload: message.rawPayload,
        last_seen: new Date().toISOString(),
    });
}

function handleTelemetryMessage(message: MqttInboundMessage): void {
    const device_id = extractDeviceId(message.topic);
    if (!device_id) return;

    ensureKnownDevice(device_id);

    const payload = asObject(message.parsedPayload);
    updateDeviceHeartbeat(device_id, {
        ip_address: typeof payload?.ip_address === 'string' ? payload.ip_address : null,
        firmware_version: typeof payload?.firmware_version === 'string' ? payload.firmware_version : null,
    });

    const db = getDatabase();
    db.prepare(`
        INSERT INTO device_telemetry (device_id, payload_json, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(device_id) DO UPDATE SET
            payload_json = excluded.payload_json,
            updated_at = CURRENT_TIMESTAMP
    `).run(device_id, JSON.stringify(message.parsedPayload));

    logAuditEvent({
        category: 'mqtt_event',
        action: 'telemetry_received',
        device_id,
        message: `MQTT telemetry received for ${device_id}`,
        payload_json: {
            topic: message.topic,
            payload: message.parsedPayload,
        },
    });

    wsService.broadcast('device_telemetry', {
        device_id,
        telemetry: message.parsedPayload,
        last_seen: new Date().toISOString(),
    });
}

class DeviceSyncService {
    start(): void {
        mqttService.onMessage('homelab/device/+/status', handleStatusMessage);
        mqttService.onMessage('homelab/device/+/state', handleStateMessage);
        mqttService.onMessage('homelab/device/+/telemetry', handleTelemetryMessage);
    }
}

export const deviceSyncService = new DeviceSyncService();
