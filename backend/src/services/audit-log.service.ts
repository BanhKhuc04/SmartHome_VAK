import { getDatabase } from './database.service';
import { wsService } from './websocket.service';
import { AuditLogCategory, AuditLogEntry } from '../types';

interface LogOptions {
    category: AuditLogCategory;
    action: string;
    message: string;
    device_id?: string | null;
    actor?: string | null;
    payload_json?: unknown;
}

export function logAuditEvent(options: LogOptions): AuditLogEntry {
    const db = getDatabase();
    const payloadJson = options.payload_json === undefined ? null : JSON.stringify(options.payload_json);
    const result = db.prepare(`
        INSERT INTO audit_logs (category, action, message, device_id, actor, payload_json)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(
        options.category,
        options.action,
        options.message,
        options.device_id ?? null,
        options.actor ?? null,
        payloadJson
    );

    const row = db.prepare(`
        SELECT id, category, action, message, device_id, actor, payload_json, created_at
        FROM audit_logs
        WHERE id = ?
    `).get(result.lastInsertRowid) as {
        id: number;
        category: AuditLogCategory;
        action: string;
        message: string;
        device_id: string | null;
        actor: string | null;
        payload_json: string | null;
        created_at: string;
    };

    const entry: AuditLogEntry = {
        ...row,
        payload_json: row.payload_json ? JSON.parse(row.payload_json) : null,
    };

    wsService.broadcast('audit_log', entry);
    return entry;
}
