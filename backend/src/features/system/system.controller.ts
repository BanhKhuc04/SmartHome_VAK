import { Request, Response } from 'express';
import { getSystemHealth } from '../../services/system.service';
import { telegramService } from '../../services/telegram.service';

export function getHealth(_req: Request, res: Response): void {
    res.json({
        success: true,
        data: getSystemHealth(),
        timestamp: new Date().toISOString(),
    });
}

export async function testTelegram(req: Request, res: Response): Promise<void> {
    const success = await telegramService.sendTelegramMessage(
        `🧪 <b>Test Notification</b>\nUser: <code>${req.user?.username ?? 'unknown'}</code>\nTime: <code>${new Date().toISOString()}</code>\nStatus: <i>System Integration Verified</i>`
    );

    if (success) {
        res.json({
            success: true,
            data: { message: 'Test notification sent successfully' },
            timestamp: new Date().toISOString(),
        });
    } else {
        res.status(503).json({
            success: false,
            error: 'Failed to send Telegram message. Check backend logs and BOT_TOKEN.',
            timestamp: new Date().toISOString(),
        });
    }
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
