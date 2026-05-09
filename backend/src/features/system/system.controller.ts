import { Request, Response } from 'express';
import { getSystemHealth } from '../../services/system.service';

export function getHealth(_req: Request, res: Response): void {
    res.json({
        success: true,
        data: getSystemHealth(),
        timestamp: new Date().toISOString(),
    });
}

export async function runDiagnostics(_req: Request, res: Response): Promise<void> {
    try {
        const result = await require('../../services/system.service').runDiagnostics();
        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || 'Diagnostic run failed',
            timestamp: new Date().toISOString(),
        });
    }
}
