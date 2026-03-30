import { Request, Response } from 'express';
import { getDatabase } from '../../services/database.service';
import { mqttService } from '../../services/mqtt.service';
import { ApiResponse } from '../../types';
import { parsePagination, buildPaginatedResponse } from '../../utils/pagination';

interface DeviceRow {
    id: string; name: string; type: string; location: string;
    status: string; last_seen: string; owner_id: number;
    config: string; firmware_version: string; created_at: string;
}
interface RelayRow { id: string; device_id: string; name: string; pin: number; state: number; }
interface SensorRow { id: string; device_id: string; name: string; type: string; unit: string; }

function buildDeviceResponse(d: DeviceRow, relays: RelayRow[], sensors: SensorRow[]) {
    return {
        id: d.id, name: d.name, type: d.type, location: d.location,
        status: d.status, lastSeen: d.last_seen, firmwareVersion: d.firmware_version,
        relays: relays.map(r => ({ id: r.id, name: r.name, pin: r.pin, state: !!r.state })),
        sensors: sensors.map(s => ({ id: s.id, name: s.name, type: s.type, unit: s.unit, value: 0, lastUpdated: '' })),
    };
}

// GET /api/devices?page=1&limit=20
export function getAllDevicesDB(req: Request, res: Response): void {
    const db = getDatabase();
    const { page, limit, offset } = parsePagination(req);

    const total = (db.prepare('SELECT COUNT(*) as count FROM devices').get() as any).count;
    const devices = db.prepare('SELECT * FROM devices ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset) as DeviceRow[];

    // Batch load relays/sensors for this page only
    const deviceIds = devices.map(d => d.id);
    const allRelays = deviceIds.length > 0
        ? db.prepare(`SELECT * FROM relays WHERE device_id IN (${deviceIds.map(() => '?').join(',')})`).all(...deviceIds) as RelayRow[]
        : [];
    const allSensors = deviceIds.length > 0
        ? db.prepare(`SELECT * FROM sensors WHERE device_id IN (${deviceIds.map(() => '?').join(',')})`).all(...deviceIds) as SensorRow[]
        : [];

    const relaysByDevice = new Map<string, RelayRow[]>();
    for (const r of allRelays) { const l = relaysByDevice.get(r.device_id) || []; l.push(r); relaysByDevice.set(r.device_id, l); }
    const sensorsByDevice = new Map<string, SensorRow[]>();
    for (const s of allSensors) { const l = sensorsByDevice.get(s.device_id) || []; l.push(s); sensorsByDevice.set(s.device_id, l); }

    const result = devices.map(d => buildDeviceResponse(d, relaysByDevice.get(d.id) || [], sensorsByDevice.get(d.id) || []));
    res.json(buildPaginatedResponse(result, total, { page, limit, offset }));
}

// GET /api/devices/:id
export function getDeviceByIdDB(req: Request, res: Response): void {
    const id = req.params.id as string;
    const db = getDatabase();
    const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(id) as DeviceRow | undefined;
    if (!device) { res.status(404).json({ success: false, error: 'Device not found', timestamp: new Date().toISOString() }); return; }
    const relays = db.prepare('SELECT * FROM relays WHERE device_id = ?').all(id) as RelayRow[];
    const sensors = db.prepare('SELECT * FROM sensors WHERE device_id = ?').all(id) as SensorRow[];
    res.json({ success: true, data: buildDeviceResponse(device, relays, sensors), timestamp: new Date().toISOString() });
}

// POST /api/devices
export function createDevice(req: Request, res: Response): void {
    const { id, name, type, location, relays, sensors } = req.body;
    if (!id || !name) { res.status(400).json({ success: false, error: 'id and name required', timestamp: new Date().toISOString() }); return; }
    const db = getDatabase();
    const userId = req.user?.userId;
    try {
        db.prepare('INSERT INTO devices (id, name, type, location, owner_id) VALUES (?, ?, ?, ?, ?)').run(id, name, type || 'esp8266', location || '', userId);
        if (Array.isArray(relays)) {
            const stmt = db.prepare('INSERT INTO relays (id, device_id, name, pin) VALUES (?, ?, ?, ?)');
            relays.forEach((r: any) => stmt.run(r.id, id, r.name, r.pin || 0));
        }
        if (Array.isArray(sensors)) {
            const stmt = db.prepare('INSERT INTO sensors (id, device_id, name, type, unit) VALUES (?, ?, ?, ?, ?)');
            sensors.forEach((s: any) => stmt.run(s.id, id, s.name, s.type, s.unit || ''));
        }
        res.status(201).json({ success: true, data: { id, name, type: type || 'esp8266', location: location || '' }, timestamp: new Date().toISOString() });
    } catch (err: any) {
        res.status(409).json({ success: false, error: err.message, timestamp: new Date().toISOString() });
    }
}

// PUT /api/devices/:id
export function updateDevice(req: Request, res: Response): void {
    const id = req.params.id as string;
    const { name, location, type } = req.body;
    const db = getDatabase();
    const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(id);
    if (!device) { res.status(404).json({ success: false, error: 'Device not found', timestamp: new Date().toISOString() }); return; }
    db.prepare('UPDATE devices SET name = COALESCE(?, name), location = COALESCE(?, location), type = COALESCE(?, type), updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(name, location, type, id);
    res.json({ success: true, data: { id, name, location, type }, timestamp: new Date().toISOString() });
}

// DELETE /api/devices/:id
export function deleteDevice(req: Request, res: Response): void {
    const id = req.params.id as string;
    const db = getDatabase();
    const result = db.prepare('DELETE FROM devices WHERE id = ?').run(id);
    if (result.changes === 0) { res.status(404).json({ success: false, error: 'Device not found', timestamp: new Date().toISOString() }); return; }
    res.json({ success: true, data: { deleted: id }, timestamp: new Date().toISOString() });
}

// POST /api/devices/:id/relay
export function toggleRelayDB(req: Request, res: Response): void {
    const id = req.params.id as string;
    const { relayId, state } = req.body;
    const db = getDatabase();
    const relay = db.prepare('SELECT * FROM relays WHERE id = ? AND device_id = ?').get(relayId, id) as RelayRow | undefined;
    if (!relay) { res.status(404).json({ success: false, error: 'Relay not found', timestamp: new Date().toISOString() }); return; }
    db.prepare('UPDATE relays SET state = ? WHERE id = ? AND device_id = ?').run(state ? 1 : 0, relayId, id);
    
    // Get device for location info
    const device = db.prepare('SELECT location FROM devices WHERE id = ?').get(id) as { location: string };
    mqttService.publishRelayCommand(device.location || 'default', id, relayId, state);
    
    res.json({ success: true, data: { id: relayId, name: relay.name, pin: relay.pin, state }, timestamp: new Date().toISOString() });
}

// DB update helpers (called from MQTT handlers)
export function updateDeviceStatusDB(deviceId: string, status: 'online' | 'offline'): void {
    const db = getDatabase();
    db.prepare('UPDATE devices SET status = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?').run(status, deviceId);
}

export function updateSensorDataDB(deviceId: string, sensorId: string, value: number): void {
    const db = getDatabase();
    db.prepare('INSERT INTO sensor_history (device_id, sensor_id, value) VALUES (?, ?, ?)').run(deviceId, sensorId, value);
}

export function updateRelayStateDB(deviceId: string, relayId: string, state: boolean): void {
    const db = getDatabase();
    db.prepare('UPDATE relays SET state = ? WHERE id = ? AND device_id = ?').run(state ? 1 : 0, relayId, deviceId);
}
