import { Request, Response } from 'express';
import { getDatabase } from '../../services/database.service';

export function getAllRules(req: Request, res: Response): void {
    const db = getDatabase();
    const rules = db.prepare('SELECT * FROM automation_rules ORDER BY created_at DESC').all();
    res.json({ success: true, data: rules, timestamp: new Date().toISOString() });
}

export function upsertRule(req: Request, res: Response): void {
    const { id, name, trigger, conditions, actions, enabled } = req.body;
    
    if (!id || !name || !trigger || !actions) {
        res.status(400).json({ success: false, error: 'Missing required fields', timestamp: new Date().toISOString() });
        return;
    }

    const db = getDatabase();
    try {
        const stmt = db.prepare(`
            INSERT INTO automation_rules (id, name, trigger_json, conditions_json, actions_json, enabled, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                name = EXCLUDED.name,
                trigger_json = EXCLUDED.trigger_json,
                conditions_json = EXCLUDED.conditions_json,
                actions_json = EXCLUDED.actions_json,
                enabled = EXCLUDED.enabled,
                updated_at = CURRENT_TIMESTAMP
        `);

        stmt.run(
            id,
            name,
            JSON.stringify(trigger),
            JSON.stringify(conditions || []),
            JSON.stringify(actions),
            enabled === false ? 0 : 1
        );

        res.json({ success: true, data: { id, name }, timestamp: new Date().toISOString() });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message, timestamp: new Date().toISOString() });
    }
}

export function deleteRule(req: Request, res: Response): void {
    const { id } = req.params;
    const db = getDatabase();
    const result = db.prepare('DELETE FROM automation_rules WHERE id = ?').run(id);
    
    if (result.changes === 0) {
        res.status(404).json({ success: false, error: 'Rule not found', timestamp: new Date().toISOString() });
        return;
    }
    
    res.json({ success: true, data: { deleted: id }, timestamp: new Date().toISOString() });
}
