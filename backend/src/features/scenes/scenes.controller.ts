import { Request, Response } from 'express';
import { getDatabase } from '../../services/database.service';
import { mqttService } from '../../services/mqtt.service';

export function getAllScenes(req: Request, res: Response): void {
    const db = getDatabase();
    const scenes = db.prepare('SELECT * FROM smart_scenes ORDER BY name ASC').all();
    res.json({ success: true, data: scenes, timestamp: new Date().toISOString() });
}

export function createScene(req: Request, res: Response): void {
    const { id, name, actions, icon } = req.body;
    if (!id || !name || !actions) {
        res.status(400).json({ success: false, error: 'Missing required fields', timestamp: new Date().toISOString() });
        return;
    }

    const db = getDatabase();
    try {
        db.prepare('INSERT INTO smart_scenes (id, name, actions_json, icon) VALUES (?, ?, ?, ?)').run(
            id, name, JSON.stringify(actions), icon || 'sparkles'
        );
        res.status(201).json({ success: true, data: { id, name }, timestamp: new Date().toISOString() });
    } catch (err: any) {
        res.status(409).json({ success: false, error: err.message, timestamp: new Date().toISOString() });
    }
}

export function activateScene(req: Request, res: Response): void {
    const { id } = req.params;
    const db = getDatabase();
    const scene = db.prepare('SELECT * FROM smart_scenes WHERE id = ?').get(id) as { actions_json: string } | undefined;

    if (!scene) {
        res.status(404).json({ success: false, error: 'Scene not found', timestamp: new Date().toISOString() });
        return;
    }

    try {
        const actions = JSON.parse(scene.actions_json);
        for (const action of actions) {
            if (action.type === 'device') {
                const device = db.prepare('SELECT location FROM devices WHERE id = ?').get(action.deviceId) as { location: string };
                mqttService.publishCommand(device.location || 'default', action.deviceId, action.command);
            }
        }

        db.prepare('UPDATE smart_scenes SET is_active = 0').run(); // Reset others
        db.prepare('UPDATE smart_scenes SET is_active = 1 WHERE id = ?').run(id);

        res.json({ success: true, message: `Scene ${id} activated`, timestamp: new Date().toISOString() });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message, timestamp: new Date().toISOString() });
    }
}
