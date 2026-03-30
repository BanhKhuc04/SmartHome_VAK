import { Request, Response } from 'express';
import { getDatabase } from '../../services/database.service';
import path from 'path';
import fs from 'fs';

const FIRMWARE_DIR = process.env.FIRMWARE_DIR || path.join(__dirname, '../../../data/firmware');

// Ensure firmware directory exists
if (!fs.existsSync(FIRMWARE_DIR)) {
    fs.mkdirSync(FIRMWARE_DIR, { recursive: true });
}

interface FirmwareRow {
    id: number; version: string; device_type: string; filename: string;
    file_size: number; checksum: string; description: string;
    uploaded_by: number; created_at: string;
}

// GET /api/ota/firmwares
export function listFirmwares(_req: Request, res: Response): void {
    const db = getDatabase();
    const firmwares = db.prepare('SELECT * FROM firmwares ORDER BY created_at DESC').all() as FirmwareRow[];
    res.json({ success: true, data: firmwares, timestamp: new Date().toISOString() });
}

// POST /api/ota/upload
export function uploadFirmware(req: Request, res: Response): void {
    // In production, use multer for file upload
    // This is a simplified version using raw body
    const { version, deviceType, description } = req.body;

    if (!version) {
        res.status(400).json({ success: false, error: 'Version is required', timestamp: new Date().toISOString() });
        return;
    }

    const db = getDatabase();
    const userId = req.user?.userId;
    const filename = `firmware_${deviceType || 'esp8266'}_v${version.replace(/\./g, '_')}.bin`;

    try {
        const result = db.prepare(
            'INSERT INTO firmwares (version, device_type, filename, file_size, description, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(version, deviceType || 'esp8266', filename, 0, description || '', userId);

        res.status(201).json({
            success: true,
            data: {
                id: result.lastInsertRowid,
                version,
                deviceType: deviceType || 'esp8266',
                filename,
                uploadPath: `/api/ota/upload/${result.lastInsertRowid}/binary`,
            },
            timestamp: new Date().toISOString(),
        });
    } catch (err: any) {
        res.status(400).json({ success: false, error: err.message, timestamp: new Date().toISOString() });
    }
}

// DELETE /api/ota/firmwares/:id
export function deleteFirmware(req: Request, res: Response): void {
    const id = parseInt(req.params.id as string);
    const db = getDatabase();

    const firmware = db.prepare('SELECT * FROM firmwares WHERE id = ?').get(id) as FirmwareRow | undefined;
    if (!firmware) {
        res.status(404).json({ success: false, error: 'Firmware not found', timestamp: new Date().toISOString() });
        return;
    }

    // Delete file if exists
    const filePath = path.join(FIRMWARE_DIR, firmware.filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    db.prepare('DELETE FROM firmwares WHERE id = ?').run(id);
    res.json({ success: true, data: { deleted: id }, timestamp: new Date().toISOString() });
}

// GET /api/ota/check/:deviceType
// ESP8266 checks for latest firmware
export function checkForUpdate(req: Request, res: Response): void {
    const deviceType = req.params.deviceType as string || 'esp8266';
    const currentVersion = req.query.version as string;

    const db = getDatabase();
    const latest = db.prepare(
        'SELECT * FROM firmwares WHERE device_type = ? ORDER BY created_at DESC LIMIT 1'
    ).get(deviceType) as FirmwareRow | undefined;

    if (!latest) {
        res.json({ success: true, data: { updateAvailable: false }, timestamp: new Date().toISOString() });
        return;
    }

    const updateAvailable = currentVersion ? latest.version !== currentVersion : true;

    res.json({
        success: true,
        data: {
            updateAvailable,
            latestVersion: latest.version,
            currentVersion: currentVersion || 'unknown',
            downloadUrl: updateAvailable ? `/api/ota/download/${latest.id}` : null,
            fileSize: latest.file_size,
        },
        timestamp: new Date().toISOString(),
    });
}

// GET /api/ota/download/:id
export function downloadFirmware(req: Request, res: Response): void {
    const id = parseInt(req.params.id as string);
    const db = getDatabase();
    const firmware = db.prepare('SELECT * FROM firmwares WHERE id = ?').get(id) as FirmwareRow | undefined;

    if (!firmware) {
        res.status(404).json({ success: false, error: 'Firmware not found', timestamp: new Date().toISOString() });
        return;
    }

    const filePath = path.join(FIRMWARE_DIR, firmware.filename);
    if (!fs.existsSync(filePath)) {
        res.status(404).json({ success: false, error: 'Firmware file not found on server', timestamp: new Date().toISOString() });
        return;
    }

    res.download(filePath, firmware.filename);
}
