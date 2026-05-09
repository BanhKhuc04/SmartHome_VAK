import cron from 'node-cron';
import { Request, Response } from 'express';
import { automationService } from '../../services/automation.service';

export function getAutomations(_req: Request, res: Response): void {
    res.json({
        success: true,
        data: automationService.getAll(),
        timestamp: new Date().toISOString(),
    });
}

export function upsertAutomation(req: Request, res: Response): void {
    const input = req.body as {
        id: string;
        name: string;
        device_id: string;
        command: 'pulse' | 'on' | 'off';
        schedule: string;
        enabled: boolean;
        description?: string;
    };

    if (!cron.validate(input.schedule)) {
        res.status(400).json({
            success: false,
            error: 'Invalid cron schedule',
            timestamp: new Date().toISOString(),
        });
        return;
    }

    const automation = automationService.upsert(input);
    res.json({
        success: true,
        data: automation,
        timestamp: new Date().toISOString(),
    });
}

export function deleteAutomation(req: Request, res: Response): void {
    const deleted = automationService.delete(req.params.id as string);
    if (!deleted) {
        res.status(404).json({
            success: false,
            error: 'Automation not found',
            timestamp: new Date().toISOString(),
        });
        return;
    }

    res.json({
        success: true,
        data: { deleted: req.params.id },
        timestamp: new Date().toISOString(),
    });
}
