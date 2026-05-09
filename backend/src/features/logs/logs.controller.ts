import { Request, Response } from 'express';
import { getDatabase } from '../../services/database.service';
import { AuditLogCategory, AuditLogEntry } from '../../types';

type AuditLogRow = {
    id: number;
    category: AuditLogCategory;
    action: string;
    message: string;
    device_id: string | null;
    actor: string | null;
    payload_json: string | null;
    created_at: string;
};

export function getLogs(req: Request, res: Response): void {
    const db = getDatabase();
    const limit = Math.min(Math.max(parseInt((req.query.limit as string) || '100', 10), 1), 500);
    const category = typeof req.query.category === 'string' ? req.query.category : null;
    const device_id = typeof req.query.device_id === 'string' ? req.query.device_id : null;

    let query = `
        SELECT id, category, action, message, device_id, actor, payload_json, created_at
        FROM audit_logs
    `;
    const params: Array<string | number> = [];
    const filters: string[] = [];

    if (category) {
        filters.push('category = ?');
        params.push(category);
    }
    if (device_id) {
        filters.push('device_id = ?');
        params.push(device_id);
    }

    if (filters.length > 0) {
        query += ` WHERE ${filters.join(' AND ')}`;
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const rows = db.prepare(query).all(...params) as AuditLogRow[];
    const logs: AuditLogEntry[] = rows.map((row) => ({
        ...row,
        payload_json: row.payload_json ? JSON.parse(row.payload_json) : null,
    }));

    res.json({
        success: true,
        data: logs,
        timestamp: new Date().toISOString(),
    });
}
