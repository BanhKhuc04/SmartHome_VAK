import { Request, Response } from 'express';
import { getDatabase } from '../../services/database.service';
import { logAuditEvent } from '../../services/audit-log.service';
import { wsService } from '../../services/websocket.service';
import { telegramService } from '../../services/telegram.service';
import { DiscoveredModule } from '../../types';

export function getDiscoveredModules(req: Request, res: Response): void {
    const db = getDatabase();
    const rows = db.prepare(`
        SELECT * FROM discovered_modules 
        ORDER BY status DESC, last_seen DESC
    `).all() as any[];

    const modules: DiscoveredModule[] = rows.map(row => ({
        id: row.id,
        device_id: row.device_id,
        name: row.name,
        type: row.type,
        platform: row.platform,
        ip_address: row.ip_address,
        firmware_version: row.firmware_version,
        capabilities: JSON.parse(row.capabilities_json),
        cmd_topic: row.cmd_topic,
        state_topic: row.state_topic,
        status_topic: row.status_topic,
        telemetry_topic: row.telemetry_topic,
        status: row.status,
        first_seen: row.first_seen,
        last_seen: row.last_seen
    }));

    res.json({
        success: true,
        data: modules,
        timestamp: new Date().toISOString()
    });
}

export function approveDiscoveredModule(req: Request, res: Response): void {
    const deviceId = req.params.deviceId;
    const { name, type, location } = req.body as { name?: string; type?: string; location?: string };
    const db = getDatabase();

    const row = db.prepare('SELECT * FROM discovered_modules WHERE device_id = ?').get(deviceId) as any;

    if (!row) {
        res.status(404).json({ success: false, error: 'Module not found', timestamp: new Date().toISOString() });
        return;
    }

    try {
        const approveTransaction = db.transaction(() => {
            // 1. Create real device
            db.prepare(`
                INSERT INTO devices (
                    device_id, name, type, location, status, ip_address, firmware_version,
                    cmd_topic, state_topic, status_topic, telemetry_topic, metadata_json
                )
                VALUES (?, ?, ?, ?, 'offline', ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(device_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    type = EXCLUDED.type,
                    location = EXCLUDED.location,
                    ip_address = EXCLUDED.ip_address,
                    firmware_version = EXCLUDED.firmware_version,
                    updated_at = CURRENT_TIMESTAMP
            `).run(
                deviceId,
                name || row.name,
                type || row.type,
                location || 'Auto-discovered',
                row.ip_address,
                row.firmware_version,
                row.cmd_topic,
                row.state_topic,
                row.status_topic,
                row.telemetry_topic,
                JSON.stringify({
                    platform: row.platform,
                    capabilities: JSON.parse(row.capabilities_json),
                    source: 'discovery',
                    discovered_at: row.first_seen
                })
            );

            // 2. Update status
            db.prepare('UPDATE discovered_modules SET status = ?, last_seen = CURRENT_TIMESTAMP WHERE device_id = ?')
                .run('approved', deviceId);
        });

        approveTransaction();

        logAuditEvent({
            category: 'device_update',
            action: 'module_approved',
            actor: req.user?.username || 'system',
            device_id: deviceId as string,
            message: `Module ${deviceId} approved and created as device.`,
        });

        void telegramService.notifySystemAlert('Module Approved', `Module <code>${deviceId}</code> has been approved by <code>${req.user?.username}</code>`, 'info');
        wsService.broadcast('module_discovery', { device_id: deviceId, status: 'approved', action: 'approved' });

        res.json({ success: true, data: { device_id: deviceId }, timestamp: new Date().toISOString() });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message, timestamp: new Date().toISOString() });
    }
}

export function ignoreDiscoveredModule(req: Request, res: Response): void {
    const deviceId = req.params.deviceId;
    const db = getDatabase();

    db.prepare('UPDATE discovered_modules SET status = ?, last_seen = CURRENT_TIMESTAMP WHERE device_id = ?')
        .run('ignored', deviceId);

    logAuditEvent({
        category: 'system',
        action: 'module_ignored',
        actor: req.user?.username || 'system',
        device_id: deviceId as string,
        message: `Module ${deviceId} ignored.`,
    });

    wsService.broadcast('module_discovery', { device_id: deviceId, status: 'ignored', action: 'ignored' });

    res.json({ success: true, timestamp: new Date().toISOString() });
}

export function resetDiscoveredModule(req: Request, res: Response): void {
    const deviceId = req.params.deviceId;
    const db = getDatabase();

    db.prepare('UPDATE discovered_modules SET status = ?, last_seen = CURRENT_TIMESTAMP WHERE device_id = ?')
        .run('pending', deviceId);

    wsService.broadcast('module_discovery', { device_id: deviceId, status: 'pending', action: 'reset' });

    res.json({ success: true, timestamp: new Date().toISOString() });
}

export function deleteDiscoveredModule(req: Request, res: Response): void {
    const deviceId = req.params.deviceId;
    const db = getDatabase();

    db.prepare('DELETE FROM discovered_modules WHERE device_id = ?').run(deviceId);

    res.json({ success: true, timestamp: new Date().toISOString() });
}
