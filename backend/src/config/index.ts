import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

function requireEnv(key: string, fallback?: string): string {
    const value = process.env[key] || fallback;
    if (!value) {
        throw new Error(`Missing required env: ${key}`);
    }
    return value;
}

const isProduction = process.env.NODE_ENV === 'production';
const defaultTopicRoot = process.env.MQTT_TOPIC_ROOT || 'homelab/device';
const cookieSecure = process.env.COOKIE_SECURE === 'true';
const cookieSameSite = process.env.COOKIE_SAMESITE || (cookieSecure ? 'none' : 'lax');

export const config = {
    port: parseInt(process.env.PORT || '5000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction,

    app: {
        name: process.env.APP_NAME || 'HomeCore Nexus',
        piholeUrl: process.env.PIHOLE_URL || 'http://192.168.0.103/admin',
    },

    cors: {
        origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(o => o.trim()),
    },

    jwt: {
        secret: isProduction
            ? requireEnv('JWT_SECRET')
            : (process.env.JWT_SECRET || 'homecore-nexus-dev-secret-change-me'),
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        cookieSecure,
        cookieSameSite,
    },

    mqtt: {
        brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://127.0.0.1:1883',
        username: process.env.MQTT_USERNAME || undefined,
        password: process.env.MQTT_PASSWORD || undefined,
        topicRoot: defaultTopicRoot,
        subscriptions: [
            `${defaultTopicRoot}/+/status`,
            `${defaultTopicRoot}/+/state`,
            `${defaultTopicRoot}/+/telemetry`,
        ],
    },

    ws: {
        path: process.env.WS_PATH || '/ws',
    },

    db: {
        path: process.env.DB_PATH || path.resolve(process.cwd(), 'data/homecore-nexus.db'),
    },
    
    telegram: {
        enabled: process.env.TELEGRAM_ENABLED === 'true',
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        chatId: process.env.TELEGRAM_CHAT_ID,
        notifyCommands: process.env.TELEGRAM_NOTIFY_COMMANDS !== 'false',
        notifyErrors: process.env.TELEGRAM_NOTIFY_ERRORS !== 'false',
        notifySystem: process.env.TELEGRAM_NOTIFY_SYSTEM !== 'false',
    },
} as const;
