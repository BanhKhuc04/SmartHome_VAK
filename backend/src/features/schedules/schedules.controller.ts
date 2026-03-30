import { Request, Response } from 'express';
import { getDatabase } from '../../services/database.service';
import { ApiResponse } from '../../types';
import { parsePagination, buildPaginatedResponse } from '../../utils/pagination';

interface ScheduleRow {
    id: number; name: string; device_id: string; relay_id: string;
    action: string; cron_expression: string; enabled: number;
    last_run: string | null; created_by: number; created_at: string;
}

// GET /api/schedules?page=1&limit=20
export function getAllSchedules(req: Request, res: Response): void {
    const db = getDatabase();
    const { page, limit, offset } = parsePagination(req);
    const total = (db.prepare('SELECT COUNT(*) as count FROM schedules').get() as any).count;
    const schedules = db.prepare(`
    SELECT s.*, d.name as device_name
    FROM schedules s
    LEFT JOIN devices d ON s.device_id = d.id
    ORDER BY s.created_at DESC LIMIT ? OFFSET ?
  `).all(limit, offset) as (ScheduleRow & { device_name: string })[];
    res.json(buildPaginatedResponse(schedules, total, { page, limit, offset }));
}

// POST /api/schedules
export function createSchedule(req: Request, res: Response): void {
    const { name, deviceId, relayId, action, cronExpression, enabled } = req.body;
    if (!name || !deviceId || !relayId || !action || !cronExpression) {
        res.status(400).json({ success: false, error: 'Missing required fields', timestamp: new Date().toISOString() });
        return;
    }

    const db = getDatabase();
    const userId = req.user?.userId;

    try {
        const result = db.prepare(
            'INSERT INTO schedules (name, device_id, relay_id, action, cron_expression, enabled, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(name, deviceId, relayId, action, cronExpression, enabled !== undefined ? (enabled ? 1 : 0) : 1, userId);

        res.status(201).json({
            success: true,
            data: { id: result.lastInsertRowid, name, deviceId, relayId, action, cronExpression, enabled: enabled !== false },
            timestamp: new Date().toISOString(),
        });
    } catch (err: any) {
        res.status(400).json({ success: false, error: err.message, timestamp: new Date().toISOString() });
    }
}

// PUT /api/schedules/:id
export function updateSchedule(req: Request, res: Response): void {
    const id = parseInt(req.params.id as string);
    const { name, action, cronExpression, enabled } = req.body;
    const db = getDatabase();

    const existing = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id);
    if (!existing) { res.status(404).json({ success: false, error: 'Schedule not found', timestamp: new Date().toISOString() }); return; }

    db.prepare(
        'UPDATE schedules SET name = COALESCE(?, name), action = COALESCE(?, action), cron_expression = COALESCE(?, cron_expression), enabled = COALESCE(?, enabled), updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(name, action, cronExpression, enabled !== undefined ? (enabled ? 1 : 0) : null, id);

    res.json({ success: true, data: { id, updated: true }, timestamp: new Date().toISOString() });
}

// DELETE /api/schedules/:id
export function deleteSchedule(req: Request, res: Response): void {
    const id = parseInt(req.params.id as string);
    const db = getDatabase();
    const result = db.prepare('DELETE FROM schedules WHERE id = ?').run(id);
    if (result.changes === 0) { res.status(404).json({ success: false, error: 'Schedule not found', timestamp: new Date().toISOString() }); return; }
    res.json({ success: true, data: { deleted: id }, timestamp: new Date().toISOString() });
}
