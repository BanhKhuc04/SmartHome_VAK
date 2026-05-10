import { Request, Response } from 'express';
import { automationService } from '../../services/automation.service';
import { AutomationRule } from '../../types';

export function getAutomations(_req: Request, res: Response): void {
    res.json({
        success: true,
        data: automationService.getAll(),
        timestamp: new Date().toISOString(),
    });
}

export function getAutomationById(req: Request, res: Response): void {
    const rule = automationService.getById(req.params.id as string);
    if (!rule) {
        res.status(404).json({
            success: false,
            error: 'Rule not found',
            timestamp: new Date().toISOString(),
        });
        return;
    }
    res.json({
        success: true,
        data: rule,
        timestamp: new Date().toISOString(),
    });
}

export function upsertAutomation(req: Request, res: Response): void {
    try {
        const input = req.body as Partial<AutomationRule>;
        const automation = automationService.upsert(input);
        res.json({
            success: true,
            data: automation,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to save rule',
            timestamp: new Date().toISOString(),
        });
    }
}

export function deleteAutomation(req: Request, res: Response): void {
    const deleted = automationService.delete(req.params.id as string);
    if (!deleted) {
        res.status(404).json({
            success: false,
            error: 'Rule not found',
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

export function toggleAutomation(req: Request, res: Response): void {
    const { action } = req.params; // enable or disable
    const enabled = action === 'enable';
    const toggled = automationService.toggleEnable(req.params.id as string, enabled);
    
    if (!toggled) {
        res.status(404).json({
            success: false,
            error: 'Rule not found',
            timestamp: new Date().toISOString(),
        });
        return;
    }

    res.json({
        success: true,
        data: { id: req.params.id, enabled },
        timestamp: new Date().toISOString(),
    });
}

export async function runAutomation(req: Request, res: Response): Promise<void> {
    const rule = automationService.getById(req.params.id as string);
    if (!rule) {
        res.status(404).json({
            success: false,
            error: 'Rule not found',
            timestamp: new Date().toISOString(),
        });
        return;
    }

    try {
        await automationService.evaluateRule(rule, { source: 'manual_run_from_api' }, true);
        res.json({
            success: true,
            data: { executed: true },
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || 'Execution failed',
            timestamp: new Date().toISOString(),
        });
    }
}

export function getAutomationRuns(req: Request, res: Response): void {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const ruleId = req.query.rule_id as string | undefined;
    
    const runs = automationService.getRecentRuns(limit, ruleId);
    
    res.json({
        success: true,
        data: runs,
        timestamp: new Date().toISOString(),
    });
}
