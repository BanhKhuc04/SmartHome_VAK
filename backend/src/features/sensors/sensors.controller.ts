import { Request, Response } from 'express';
import { getDatabase } from '../../services/database.service';
import { ApiResponse } from '../../types';

interface SensorHistoryRow {
    id: number; device_id: string; sensor_id: string; value: number; recorded_at: string;
}

// GET /api/sensors/:deviceId/data
export function getSensorDataDB(req: Request, res: Response): void {
    const deviceId = req.params.deviceId as string;
    const limit = parseInt(req.query.limit as string) || 100;
    const db = getDatabase();

    const device = db.prepare('SELECT id FROM devices WHERE id = ?').get(deviceId);
    if (!device) {
        res.status(404).json({ success: false, error: 'Device not found', timestamp: new Date().toISOString() });
        return;
    }

    const sensors = db.prepare('SELECT * FROM sensors WHERE device_id = ?').all(deviceId) as any[];
    const result: Record<string, { value: number; timestamp: string }[]> = {};

    for (const sensor of sensors) {
        const history = db.prepare(
            'SELECT value, recorded_at as timestamp FROM sensor_history WHERE device_id = ? AND sensor_id = ? ORDER BY recorded_at DESC LIMIT ?'
        ).all(deviceId, sensor.id, limit) as SensorHistoryRow[];
        result[sensor.id] = history.reverse().map(h => ({ value: h.value, timestamp: h.recorded_at || (h as any).timestamp }));
    }

    res.json({ success: true, data: result, timestamp: new Date().toISOString() } as ApiResponse);
}

// Helper: record sensor data (called from MQTT handler)
export function recordSensorDataDB(deviceId: string, sensorId: string, value: number): void {
    const db = getDatabase();
    db.prepare('INSERT INTO sensor_history (device_id, sensor_id, value) VALUES (?, ?, ?)').run(deviceId, sensorId, value);
}
