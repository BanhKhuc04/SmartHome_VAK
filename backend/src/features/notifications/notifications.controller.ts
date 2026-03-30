import { Request, Response } from 'express';
import { getDatabase } from '../../services/database.service';
import { ApiResponse } from '../../types';
import { config } from '../../config';
import { parsePagination, buildPaginatedResponse } from '../../utils/pagination';

interface AlertRuleRow {
    id: number; name: string; device_id: string; sensor_id: string;
    condition: string; threshold: number; channel: string;
    enabled: number; last_triggered: string | null; cooldown_minutes: number;
    created_by: number; created_at: string;
}

// GET /api/notifications/rules?page=1&limit=20
export function getAlertRules(req: Request, res: Response): void {
    const db = getDatabase();
    const { page, limit, offset } = parsePagination(req);
    const total = (db.prepare('SELECT COUNT(*) as count FROM alert_rules').get() as any).count;
    const rules = db.prepare(`
    SELECT ar.*, d.name as device_name, s.name as sensor_name
    FROM alert_rules ar
    LEFT JOIN devices d ON ar.device_id = d.id
    LEFT JOIN sensors s ON ar.sensor_id = s.id AND ar.device_id = s.device_id
    ORDER BY ar.created_at DESC LIMIT ? OFFSET ?
  `).all(limit, offset);
    res.json(buildPaginatedResponse(rules, total, { page, limit, offset }));
}

// POST /api/notifications/rules
export function createAlertRule(req: Request, res: Response): void {
    const { name, deviceId, sensorId, condition, threshold, channel, cooldownMinutes } = req.body;
    if (!name || !deviceId || !sensorId || !condition || threshold === undefined) {
        res.status(400).json({ success: false, error: 'Missing required fields', timestamp: new Date().toISOString() });
        return;
    }
    const db = getDatabase();
    const userId = req.user?.userId;
    try {
        const result = db.prepare(
            'INSERT INTO alert_rules (name, device_id, sensor_id, condition, threshold, channel, cooldown_minutes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(name, deviceId, sensorId, condition, threshold, channel || 'telegram', cooldownMinutes || 5, userId);
        res.status(201).json({ success: true, data: { id: result.lastInsertRowid, name }, timestamp: new Date().toISOString() });
    } catch (err: any) {
        res.status(400).json({ success: false, error: err.message, timestamp: new Date().toISOString() });
    }
}

// PUT /api/notifications/rules/:id
export function updateAlertRule(req: Request, res: Response): void {
    const id = parseInt(req.params.id as string);
    const { name, condition, threshold, channel, enabled, cooldownMinutes } = req.body;
    const db = getDatabase();
    const existing = db.prepare('SELECT * FROM alert_rules WHERE id = ?').get(id);
    if (!existing) { res.status(404).json({ success: false, error: 'Rule not found', timestamp: new Date().toISOString() }); return; }
    db.prepare(
        'UPDATE alert_rules SET name = COALESCE(?, name), condition = COALESCE(?, condition), threshold = COALESCE(?, threshold), channel = COALESCE(?, channel), enabled = COALESCE(?, enabled), cooldown_minutes = COALESCE(?, cooldown_minutes) WHERE id = ?'
    ).run(name, condition, threshold, channel, enabled !== undefined ? (enabled ? 1 : 0) : null, cooldownMinutes, id);
    res.json({ success: true, data: { id, updated: true }, timestamp: new Date().toISOString() });
}

// DELETE /api/notifications/rules/:id
export function deleteAlertRule(req: Request, res: Response): void {
    const id = parseInt(req.params.id as string);
    const db = getDatabase();
    const result = db.prepare('DELETE FROM alert_rules WHERE id = ?').run(id);
    if (result.changes === 0) { res.status(404).json({ success: false, error: 'Rule not found', timestamp: new Date().toISOString() }); return; }
    res.json({ success: true, data: { deleted: id }, timestamp: new Date().toISOString() });
}

// ============================================
// Notifications Logic
// ============================================

// GET /api/notifications?page=1&limit=50
export function getNotifications(req: Request, res: Response): void {
    const db = getDatabase();
    const { page, limit, offset } = parsePagination(req);
    const total = (db.prepare('SELECT COUNT(*) as count FROM notifications').get() as any).count;
    
    const logs = db.prepare(`
        SELECT * FROM notifications 
        ORDER BY created_at DESC LIMIT ? OFFSET ?
    `).all(limit, offset);
    
    res.json(buildPaginatedResponse(logs, total, { page, limit, offset }));
}

// PATCH /api/notifications/:id/read
export function markAsRead(req: Request, res: Response): void {
    const id = parseInt(req.params.id as string);
    const db = getDatabase();
    const result = db.prepare('UPDATE notifications SET status = "read" WHERE id = ?').run(id);
    
    if (result.changes === 0) {
        res.status(404).json({ success: false, error: 'Notification not found', timestamp: new Date().toISOString() });
        return;
    }
    res.json({ success: true, timestamp: new Date().toISOString() });
}

// DELETE /api/notifications/:id
export function deleteNotification(req: Request, res: Response): void {
    const id = parseInt(req.params.id as string);
    const db = getDatabase();
    const result = db.prepare('DELETE FROM notifications WHERE id = ?').run(id);
    
    if (result.changes === 0) {
        res.status(404).json({ success: false, error: 'Notification not found', timestamp: new Date().toISOString() });
        return;
    }
    res.json({ success: true, timestamp: new Date().toISOString() });
}

// DELETE /api/notifications
export function clearAllNotifications(_req: Request, res: Response): void {
    const db = getDatabase();
    db.prepare('DELETE FROM notifications').run();
    res.json({ success: true, timestamp: new Date().toISOString() });
}

// GET /api/notifications/settings
export function getNotificationSettings(_req: Request, res: Response): void {
    res.json({
        success: true,
        data: {
            telegram: {
                enabled: !!config.telegram.botToken,
                botToken: config.telegram.botToken ? '***configured***' : '',
                chatId: config.telegram.chatId || '',
            },
            email: {
                enabled: !!process.env.SMTP_HOST,
                host: process.env.SMTP_HOST || '',
                from: process.env.SMTP_FROM || '',
            },
        },
        timestamp: new Date().toISOString(),
    });
}
