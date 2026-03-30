import dotenv from 'dotenv';
dotenv.config();

function requireEnv(key: string, fallback?: string): string {
    const value = process.env[key] || fallback;
    if (!value) {
        throw new Error(`❌ Missing required env: ${key}`);
    }
    return value;
}

const isProduction = process.env.NODE_ENV === 'production';

export const config = {
    port: parseInt(process.env.PORT || '4000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction,

    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    },

    jwt: {
        secret: isProduction
            ? requireEnv('JWT_SECRET')
            : (process.env.JWT_SECRET || 'dev-only-secret-change-in-production'),
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },

    mqtt: {
        brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
        username: process.env.MQTT_USERNAME || undefined,
        password: process.env.MQTT_PASSWORD || undefined,
        topicPrefix: process.env.MQTT_TOPIC_PREFIX || 'home',
    },

    ws: {
        path: process.env.WS_PATH || '/ws',
    },

    db: {
        path: process.env.DB_PATH || './data/home-smart.db',
    },

    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN || '',
        chatId: process.env.TELEGRAM_CHAT_ID || '',
    },
} as const;
