import { Request, Response } from 'express';
import { getDatabase } from '../../services/database.service';
import { SensorSummary, DeviceTelemetryLatest } from '../../types';

export function getLatestTelemetry(req: Request, res: Response): void {
    const deviceId = req.params.deviceId;
    const db = getDatabase();
    
    const row = db.prepare('SELECT * FROM device_telemetry_latest WHERE device_id = ?').get(deviceId) as any;
    
    if (!row) {
        res.status(404).json({ success: false, error: 'Telemetry not found', timestamp: new Date().toISOString() });
        return;
    }

    const data: DeviceTelemetryLatest = {
        device_id: row.device_id,
        payload: JSON.parse(row.payload_json),
        temperature: row.temperature,
        humidity: row.humidity,
        pressure: row.pressure,
        rssi: row.rssi,
        battery: row.battery,
        uptime: row.uptime,
        updated_at: row.updated_at
    };

    res.json({ success: true, data, timestamp: new Date().toISOString() });
}

export function getTelemetryHistory(req: Request, res: Response): void {
    const deviceId = req.params.deviceId;
    const limit = parseInt(req.query.limit as string) || 100;
    const db = getDatabase();
    
    const rows = db.prepare(`
        SELECT * FROM device_telemetry_history 
        WHERE device_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
    `).all(deviceId, limit) as any[];

    const history = rows.map(row => ({
        id: row.id,
        device_id: row.device_id,
        payload: JSON.parse(row.payload_json),
        temperature: row.temperature,
        humidity: row.humidity,
        pressure: row.pressure,
        rssi: row.rssi,
        battery: row.battery,
        uptime: row.uptime,
        created_at: row.created_at
    }));

    res.json({ success: true, data: history, timestamp: new Date().toISOString() });
}

export function getAllLatestTelemetry(_req: Request, res: Response): void {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM device_telemetry_latest').all() as any[];

    const data = rows.map(row => ({
        device_id: row.device_id,
        payload: JSON.parse(row.payload_json),
        temperature: row.temperature,
        humidity: row.humidity,
        pressure: row.pressure,
        rssi: row.rssi,
        battery: row.battery,
        uptime: row.uptime,
        updated_at: row.updated_at
    }));

    res.json({ success: true, data, timestamp: new Date().toISOString() });
}

export function getSensorSummaries(_req: Request, res: Response): void {
    const db = getDatabase();
    
    const rows = db.prepare(`
        SELECT d.device_id, d.name, d.status, d.last_seen, t.payload_json
        FROM devices d
        LEFT JOIN device_telemetry_latest t ON d.device_id = t.device_id
        WHERE d.type = 'sensor'
    `).all() as any[];

    const summaries: SensorSummary[] = rows.map(row => ({
        device_id: row.device_id,
        name: row.name,
        status: row.status,
        telemetry: row.payload_json ? JSON.parse(row.payload_json) : {},
        last_seen: row.last_seen
    }));

    res.json({ success: true, data: summaries, timestamp: new Date().toISOString() });
}
