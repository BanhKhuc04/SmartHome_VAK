import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../../services/database.service';
import { ApiResponse } from '../../types';
import { config } from '../../config';

interface UserRow {
    id: number;
    username: string;
    email: string;
    password_hash: string;
    role: string;
    created_at: string;
}

interface TokenPayload {
    userId: number;
    username: string;
    role: string;
}

function generateTokens(user: UserRow) {
    const payload: TokenPayload = {
        userId: user.id,
        username: user.username,
        role: user.role,
    };

    const accessToken = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn } as jwt.SignOptions);
    const refreshToken = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.refreshExpiresIn } as jwt.SignOptions);

    return { accessToken, refreshToken };
}

// Helper to set tokens in cookies
function setTokenCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
    const isProd = config.nodeEnv === 'production';
    
    res.cookie('accessToken', tokens.accessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 15 * 60 * 1000, // 15 mins
    });

    res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
}

// POST /api/auth/register
export function register(req: Request, res: Response): void {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        res.status(400).json({
            success: false,
            error: 'Username, email, and password are required',
            timestamp: new Date().toISOString(),
        });
        return;
    }

    if (password.length < 6) {
        res.status(400).json({
            success: false,
            error: 'Password must be at least 6 characters',
            timestamp: new Date().toISOString(),
        });
        return;
    }

    const db = getDatabase();

    try {
        const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
        if (existing) {
            res.status(409).json({
                success: false,
                error: 'Username or email already exists',
                timestamp: new Date().toISOString(),
            });
            return;
        }

        const passwordHash = bcrypt.hashSync(password, 10);
        const result = db.prepare(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)'
        ).run(username, email, passwordHash);

        const user: UserRow = {
            id: result.lastInsertRowid as number,
            username,
            email,
            password_hash: passwordHash,
            role: 'user',
            created_at: new Date().toISOString(),
        };

        const tokens = generateTokens(user);
        setTokenCookies(res, tokens);

        res.status(201).json({
            success: true,
            data: {
                user: { id: user.id, username: user.username, email: user.email, role: user.role }
            },
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Auth] Register error:', error);
        res.status(500).json({
            success: false,
            error: 'Registration failed',
            timestamp: new Date().toISOString(),
        });
    }
}

// POST /api/auth/login
export function login(req: Request, res: Response): void {
    const { username, password } = req.body;

    if (!username || !password) {
        res.status(400).json({
            success: false,
            error: 'Username and password are required',
            timestamp: new Date().toISOString(),
        });
        return;
    }

    const db = getDatabase();

    try {
        console.log(`[Auth] Login attempt: ${username}`);
        const user = db.prepare(
            'SELECT * FROM users WHERE username = ? OR email = ?'
        ).get(username, username) as UserRow | undefined;

        if (!user) {
            console.warn(`[Auth] User not found: ${username}`);
            res.status(401).json({
                success: false,
                error: 'Invalid credentials',
                timestamp: new Date().toISOString(),
            });
            return;
        }

        const passMatch = bcrypt.compareSync(password, user.password_hash);
        console.log(`[Auth] Password match for ${username}: ${passMatch}`);

        if (!passMatch) {
            res.status(401).json({
                success: false,
                error: 'Invalid credentials',
                timestamp: new Date().toISOString(),
            });
            return;
        }

        const tokens = generateTokens(user);
        console.log(`[Auth] Tokens generated for ${username}`);
        setTokenCookies(res, tokens);

        res.json({
            success: true,
            data: {
                user: { id: user.id, username: user.username, email: user.email, role: user.role }
            },
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Auth] Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed',
            timestamp: new Date().toISOString(),
        });
    }
}

// POST /api/auth/refresh
export function refreshToken(req: Request, res: Response): void {
    const token = req.cookies.refreshToken;

    if (!token) {
        res.status(400).json({
            success: false,
            error: 'Refresh token is required',
            timestamp: new Date().toISOString(),
        });
        return;
    }

    try {
        const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;
        const db = getDatabase();
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.userId) as UserRow | undefined;

        if (!user) {
            res.status(401).json({ success: false, error: 'User not found', timestamp: new Date().toISOString() });
            return;
        }

        const tokens = generateTokens(user);
        setTokenCookies(res, tokens);

        res.json({
            success: true,
            data: {
                user: { id: user.id, username: user.username, email: user.email, role: user.role }
            },
            timestamp: new Date().toISOString(),
        });
    } catch {
        res.status(401).json({
            success: false,
            error: 'Invalid or expired refresh token',
            timestamp: new Date().toISOString(),
        });
    }
}

// POST /api/auth/logout
export function logout(_req: Request, res: Response): void {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.json({
        success: true,
        message: 'Logged out successfully',
        timestamp: new Date().toISOString(),
    });
}

// GET /api/auth/me
export function getMe(req: Request, res: Response): void {
    const user = req.user;
    if (!user) {
        res.status(401).json({ success: false, error: 'Not authenticated', timestamp: new Date().toISOString() });
        return;
    }

    const db = getDatabase();
    const userData = db.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?').get(user.userId) as any;

    if (!userData) {
        res.status(404).json({ success: false, error: 'User data not found', timestamp: new Date().toISOString() });
        return;
    }

    res.json({
        success: true,
        data: {
            id: userData.id,
            username: userData.username,
            email: userData.email,
            role: userData.role
        },
        timestamp: new Date().toISOString(),
    });
}
