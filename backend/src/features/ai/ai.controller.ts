import { Request, Response } from 'express';
import { processAIChat } from '../../services/ai.service';

export async function handleAIChat(req: Request, res: Response): Promise<void> {
    const { prompt } = req.body;
    
    if (!prompt) {
        res.status(400).json({ success: false, error: 'Prompt is required', timestamp: new Date().toISOString() });
        return;
    }

    try {
        const response = await processAIChat(prompt);
        res.json({ success: true, data: { response }, timestamp: new Date().toISOString() });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message, timestamp: new Date().toISOString() });
    }
}
