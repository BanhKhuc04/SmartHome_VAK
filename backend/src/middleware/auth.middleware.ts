import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface TokenPayload {
    userId: number;
    username: string;
    role: string;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.accessToken;

    let token: string | undefined;

    if (cookieToken) {
        token = cookieToken;
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    if (!token) {
        res.status(401).json({
            success: false,
            error: 'Access token required',
            timestamp: new Date().toISOString(),
        });
        return;
    }

    try {
        const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;
        req.user = decoded;
        next();
    } catch {
        res.status(401).json({
            success: false,
            error: 'Invalid or expired token',
            timestamp: new Date().toISOString(),
        });
    }
}

export function adminMiddleware(req: Request, res: Response, next: NextFunction): void {
    const user = req.user;
    if (!user || user.role !== 'admin') {
        res.status(403).json({
            success: false,
            error: 'Admin access required',
            timestamp: new Date().toISOString(),
        });
        return;
    }
    next();
}
