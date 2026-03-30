import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
    console.error('[Error]', err.message);

    res.status(500).json({
        success: false,
        error: config.isProduction ? 'Internal server error' : err.message,
        timestamp: new Date().toISOString(),
    });
}

export function requestLogger(req: Request, _res: Response, next: NextFunction): void {
    const start = Date.now();
    _res.on('finish', () => {
        const duration = Date.now() - start;
        // Only log slow requests (>500ms) or errors in production
        if (!config.isProduction || duration > 500 || _res.statusCode >= 400) {
            console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${_res.statusCode} ${duration}ms`);
        }
    });
    next();
}

export function notFoundHandler(_req: Request, res: Response): void {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        timestamp: new Date().toISOString(),
    });
}
