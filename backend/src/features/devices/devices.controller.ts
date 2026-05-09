import { Request, Response } from 'express';
import { config } from '../../config';
import { ensureDefaultModuleSeed, getDatabase } from '../../services/database.service';
import { mqttService } from '../../services/mqtt.service';
import { logAuditEvent } from '../../services/audit-log.service';
import { ModuleDevice } from '../../types';

type DeviceRow = {
    device_id: string;
    name: string;
    type: string;
    location: string;
    status: 'online' | 'offline' | 'unknown';
    ip_address: string | null;
    firmware_version: string | null;
    cmd_topic: string;
    state_topic: string;
    status_topic: string;
    telemetry_topic: string;
    last_seen: string | null;
    metadata_json: string;
    created_at: string;
    updated_at: string;
    last_state: string | null;
    telemetry_payload_json: string | null;
};

function defaultTopics(device_id: string): { cmd_topic: string; state_topic: string; status_topic: string; telemetry_topic: string } {
    const base = `${config.mqtt.topicRoot}/${device_id}`;
    return {
        cmd_topic: `${base}/cmd`,
        state_topic: `${base}/state`,
        status_topic: `${base}/status`,
        telemetry_topic: `${base}/telemetry`,
    };
}

function mapDevice(row: DeviceRow): ModuleDevice {
    return {
        device_id: row.device_id,
        name: row.name,
        type: row.type,
        location: row.location,
        status: row.status,
        ip_address: row.ip_address,
        firmware_version: row.firmware_version,
        cmd_topic: row.cmd_topic,
        state_topic: row.state_topic,
        status_topic: row.status_topic,
        telemetry_topic: row.telemetry_topic,
        last_seen: row.last_seen,
        metadata_json: row.metadata_json ? JSON.parse(row.metadata_json) : {},
        last_state: row.last_state,
        telemetry_last_payload: row.telemetry_payload_json ? JSON.parse(row.telemetry_payload_json) : null,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

function selectDeviceById(device_id: string): ModuleDevice | null {
    const db = getDatabase();
    const row = db.prepare(`
        SELECT
            d.device_id,
            d.name,
            d.type,
            d.location,
            d.status,
            d.ip_address,
            d.firmware_version,
            d.cmd_topic,
            d.state_topic,
            d.status_topic,
            d.telemetry_topic,
            d.last_seen,
            d.metadata_json,
            d.created_at,
            d.updated_at,
            ds.state_value AS last_state,
            dt.payload_json AS telemetry_payload_json
        FROM devices d
        LEFT JOIN device_states ds ON ds.device_id = d.device_id
        LEFT JOIN device_telemetry dt ON dt.device_id = d.device_id
        WHERE d.device_id = ?
    `).get(device_id) as DeviceRow | undefined;

    return row ? mapDevice(row) : null;
}

export function getAllDevices(req: Request, res: Response): void {
    const db = getDatabase();
    ensureDefaultModuleSeed(db);
    const statusFilter = typeof req.query.status === 'string' ? req.query.status : null;
    const rows = statusFilter
        ? db.prepare(`
            SELECT
                d.device_id,
                d.name,
                d.type,
                d.location,
                d.status,
                d.ip_address,
                d.firmware_version,
                d.cmd_topic,
                d.state_topic,
                d.status_topic,
                d.telemetry_topic,
                d.last_seen,
                d.metadata_json,
                d.created_at,
                d.updated_at,
                ds.state_value AS last_state,
                dt.payload_json AS telemetry_payload_json
            FROM devices d
            LEFT JOIN device_states ds ON ds.device_id = d.device_id
            LEFT JOIN device_telemetry dt ON dt.device_id = d.device_id
            WHERE d.status = ?
            ORDER BY d.name ASC
        `).all(statusFilter) as DeviceRow[]
        : db.prepare(`
            SELECT
                d.device_id,
                d.name,
                d.type,
                d.location,
                d.status,
                d.ip_address,
                d.firmware_version,
                d.cmd_topic,
                d.state_topic,
                d.status_topic,
                d.telemetry_topic,
                d.last_seen,
                d.metadata_json,
                d.created_at,
                d.updated_at,
                ds.state_value AS last_state,
                dt.payload_json AS telemetry_payload_json
            FROM devices d
            LEFT JOIN device_states ds ON ds.device_id = d.device_id
            LEFT JOIN device_telemetry dt ON dt.device_id = d.device_id
            ORDER BY d.name ASC
        `).all() as DeviceRow[];

    res.json({
        success: true,
        data: rows.map(mapDevice),
        timestamp: new Date().toISOString(),
    });
}

export function getDeviceById(req: Request, res: Response): void {
    ensureDefaultModuleSeed();
    const device = selectDeviceById(req.params.id as string);

    if (!device) {
        res.status(404).json({
            success: false,
            error: 'Device not found',
            timestamp: new Date().toISOString(),
        });
        return;
    }

    res.json({
        success: true,
        data: device,
        timestamp: new Date().toISOString(),
    });
}

export function createDevice(req: Request, res: Response): void {
    const input = req.body as {
        device_id: string;
        name: string;
        type: string;
        location: string;
        ip_address: string | null;
        firmware_version: string | null;
        cmd_topic?: string;
        state_topic?: string;
        status_topic?: string;
        telemetry_topic?: string;
        metadata_json: Record<string, unknown>;
    };
    const db = getDatabase();
    const topics = defaultTopics(input.device_id);

    try {
        db.prepare(`
            INSERT INTO devices (
                device_id, name, type, location, status, ip_address, firmware_version,
                cmd_topic, state_topic, status_topic, telemetry_topic, metadata_json
            )
            VALUES (?, ?, ?, ?, 'offline', ?, ?, ?, ?, ?, ?, ?)
        `).run(
            input.device_id,
            input.name,
            input.type,
            input.location,
            input.ip_address,
            input.firmware_version,
            input.cmd_topic || topics.cmd_topic,
            input.state_topic || topics.state_topic,
            input.status_topic || topics.status_topic,
            input.telemetry_topic || topics.telemetry_topic,
            JSON.stringify(input.metadata_json || {})
        );

        const device = selectDeviceById(input.device_id);
        logAuditEvent({
            category: 'device_update',
            action: 'device_created',
            actor: req.user?.username ?? 'system',
            device_id: input.device_id,
            message: `Device ${input.device_id} created`,
            payload_json: device,
        });

        res.status(201).json({
            success: true,
            data: device,
            timestamp: new Date().toISOString(),
        });
    } catch (error: unknown) {
        res.status(409).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create device',
            timestamp: new Date().toISOString(),
        });
    }
}

export function updateDevice(req: Request, res: Response): void {
    const device_id = req.params.id as string;
    const db = getDatabase();
    const existing = selectDeviceById(device_id);

    if (!existing) {
        res.status(404).json({
            success: false,
            error: 'Device not found',
            timestamp: new Date().toISOString(),
        });
        return;
    }

    const input = req.body as Partial<ModuleDevice>;
    db.prepare(`
        UPDATE devices
        SET
            name = COALESCE(?, name),
            type = COALESCE(?, type),
            location = COALESCE(?, location),
            status = COALESCE(?, status),
            ip_address = ?,
            firmware_version = ?,
            cmd_topic = COALESCE(?, cmd_topic),
            state_topic = COALESCE(?, state_topic),
            status_topic = COALESCE(?, status_topic),
            telemetry_topic = COALESCE(?, telemetry_topic),
            metadata_json = COALESCE(?, metadata_json),
            updated_at = CURRENT_TIMESTAMP
        WHERE device_id = ?
    `).run(
        input.name ?? null,
        input.type ?? null,
        input.location ?? null,
        input.status ?? null,
        input.ip_address ?? existing.ip_address,
        input.firmware_version ?? existing.firmware_version,
        input.cmd_topic ?? null,
        input.state_topic ?? null,
        input.status_topic ?? null,
        input.telemetry_topic ?? null,
        input.metadata_json ? JSON.stringify(input.metadata_json) : null,
        device_id
    );

    const updated = selectDeviceById(device_id);
    logAuditEvent({
        category: 'device_update',
        action: 'device_updated',
        actor: req.user?.username ?? 'system',
        device_id,
        message: `Device ${device_id} updated`,
        payload_json: updated,
    });

    res.json({
        success: true,
        data: updated,
        timestamp: new Date().toISOString(),
    });
}

export function deleteDevice(req: Request, res: Response): void {
    const device_id = req.params.id as string;
    const db = getDatabase();
    const existing = selectDeviceById(device_id);

    if (!existing) {
        res.status(404).json({
            success: false,
            error: 'Device not found',
            timestamp: new Date().toISOString(),
        });
        return;
    }

    const removeDevice = db.transaction((targetDeviceId: string) => {
        logAuditEvent({
            category: 'device_update',
            action: 'device_deleted',
            actor: req.user?.username ?? 'system',
            device_id: targetDeviceId,
            message: `Device ${targetDeviceId} deleted`,
            payload_json: existing,
        });

        db.prepare('DELETE FROM automations WHERE device_id = ?').run(targetDeviceId);
        db.prepare('DELETE FROM device_states WHERE device_id = ?').run(targetDeviceId);
        db.prepare('DELETE FROM device_telemetry WHERE device_id = ?').run(targetDeviceId);
        db.prepare('UPDATE audit_logs SET device_id = NULL WHERE device_id = ?').run(targetDeviceId);

        return db.prepare('DELETE FROM devices WHERE device_id = ?').run(targetDeviceId);
    });

    const result = removeDevice(device_id);

    if (result.changes === 0) {
        res.status(404).json({
            success: false,
            error: 'Device not found',
            timestamp: new Date().toISOString(),
        });
        return;
    }

    res.json({
        success: true,
        data: { deleted: true, device_id },
        timestamp: new Date().toISOString(),
    });
}

export function sendDeviceCommand(req: Request, res: Response): void {
    const device_id = req.params.id as string;
    const { command } = req.body as { command: 'pulse' | 'on' | 'off' };
    const device = selectDeviceById(device_id);

    if (!device) {
        res.status(404).json({
            success: false,
            error: 'Device not found',
            timestamp: new Date().toISOString(),
        });
        return;
    }

    try {
        mqttService.publishCommand(device.cmd_topic, command);

        logAuditEvent({
            category: 'command',
            action: 'device_command_sent',
            actor: req.user?.username ?? 'system',
            device_id,
            message: `Command ${command} sent to ${device_id}`,
            payload_json: {
                command,
                cmd_topic: device.cmd_topic,
            },
        });

        res.json({
            success: true,
            data: {
                device_id,
                command,
                cmd_topic: device.cmd_topic,
            },
            timestamp: new Date().toISOString(),
        });
    } catch (error: unknown) {
        res.status(503).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to publish command',
            timestamp: new Date().toISOString(),
        });
    }
}
