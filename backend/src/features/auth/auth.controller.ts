import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { config } from '../../config';
import { getDatabase } from '../../services/database.service';
import { logAuditEvent } from '../../services/audit-log.service';

type UserRow = {
    id: number;
    username: string;
    email: string;
    password_hash: string;
    role: string;
};

interface TokenPayload {
    userId: number;
    username: string;
    role: string;
}

function generateTokens(user: UserRow): { accessToken: string; refreshToken: string } {
    const payload: TokenPayload = {
        userId: user.id,
        username: user.username,
        role: user.role,
    };

    return {
        accessToken: jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn } as jwt.SignOptions),
        refreshToken: jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.refreshExpiresIn } as jwt.SignOptions),
    };
}

function setTokenCookies(res: Response, tokens: { accessToken: string; refreshToken: string }): void {
    const secure = config.jwt.cookieSecure;
    const sameSite = config.jwt.cookieSameSite as 'lax' | 'strict' | 'none';

    res.cookie('accessToken', tokens.accessToken, {
        httpOnly: true,
        secure,
        sameSite,
        maxAge: 24 * 60 * 60 * 1000,
    });

    res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure,
        sameSite,
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
}

export function register(req: Request, res: Response): void {
    const { username, email, password } = req.body as { username: string; email: string; password: string };
    const db = getDatabase();
    const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email) as { id: number } | undefined;

    if (existing) {
        res.status(409).json({
            success: false,
            error: 'Username or email already exists',
            timestamp: new Date().toISOString(),
        });
        return;
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
        INSERT INTO users (username, email, password_hash, role)
        VALUES (?, ?, ?, 'operator')
    `).run(username, email, passwordHash);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as UserRow;
    const tokens = generateTokens(user);
    setTokenCookies(res, tokens);

    logAuditEvent({
        category: 'auth',
        action: 'register',
        actor: username,
        message: `User ${username} registered`,
    });

    res.status(201).json({
        success: true,
        data: {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
            },
        },
        timestamp: new Date().toISOString(),
    });
}

export function login(req: Request, res: Response): void {
    const { username, password } = req.body as { username: string; password: string };
    const db = getDatabase();
    const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, username) as UserRow | undefined;

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
        logAuditEvent({
            category: 'auth',
            action: 'login_failed',
            actor: username,
            message: `Failed login attempt for ${username}`,
        });

        res.status(401).json({
            success: false,
            error: 'Invalid credentials',
            timestamp: new Date().toISOString(),
        });
        return;
    }

    const tokens = generateTokens(user);
    setTokenCookies(res, tokens);

    logAuditEvent({
        category: 'auth',
        action: 'login_success',
        actor: user.username,
        message: `User ${user.username} logged in`,
    });

    res.json({
        success: true,
        data: {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
            },
        },
        timestamp: new Date().toISOString(),
    });
}

export function refreshToken(req: Request, res: Response): void {
    const refreshTokenValue = req.cookies.refreshToken as string | undefined;
    if (!refreshTokenValue) {
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        res.status(401).json({
            success: false,
            error: 'Refresh token required',
            timestamp: new Date().toISOString(),
        });
        return;
    }

    try {
        const decoded = jwt.verify(refreshTokenValue, config.jwt.secret) as TokenPayload;
        const db = getDatabase();
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.userId) as UserRow | undefined;

        if (!user) {
            throw new Error('User not found');
        }

        const tokens = generateTokens(user);
        setTokenCookies(res, tokens);

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                },
            },
            timestamp: new Date().toISOString(),
        });
    } catch {
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        res.status(401).json({
            success: false,
            error: 'Invalid or expired refresh token',
            timestamp: new Date().toISOString(),
        });
    }
}

export function logout(req: Request, res: Response): void {
    const actor = req.user?.username ?? 'anonymous';
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    logAuditEvent({
        category: 'auth',
        action: 'logout',
        actor,
        message: `User ${actor} logged out`,
    });

    res.json({
        success: true,
        data: { logged_out: true },
        timestamp: new Date().toISOString(),
    });
}

export function getMe(req: Request, res: Response): void {
    if (!req.user) {
        res.status(401).json({
            success: false,
            error: 'Not authenticated',
            timestamp: new Date().toISOString(),
        });
        return;
    }

    const db = getDatabase();
    const user = db.prepare('SELECT id, username, email, role FROM users WHERE id = ?').get(req.user.userId) as {
        id: number;
        username: string;
        email: string;
        role: string;
    } | undefined;

    if (!user) {
        res.status(404).json({
            success: false,
            error: 'User not found',
            timestamp: new Date().toISOString(),
        });
        return;
    }

    res.json({
        success: true,
        data: user,
        timestamp: new Date().toISOString(),
    });
}
