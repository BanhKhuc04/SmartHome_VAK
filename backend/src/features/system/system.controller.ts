import { Request, Response } from 'express';
import { getSystemHealth } from '../../services/system.service';

export function getHealth(_req: Request, res: Response): void {
    res.json({
        success: true,
        data: getSystemHealth(),
        timestamp: new Date().toISOString(),
    });
}
