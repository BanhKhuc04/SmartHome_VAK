import os from 'os';
import { config } from '../config';
import { getDatabase } from './database.service';
import { mqttService } from './mqtt.service';
import { wsService } from './websocket.service';
import { SystemHealth } from '../types';

export function getSystemHealth(): SystemHealth {
    const db = getDatabase();
    db.pragma('user_version');
    const mqttConnected = mqttService.getConnectionStatus();

    return {
        status: mqttConnected ? 'healthy' : 'degraded',
        mqtt: {
            connected: mqttConnected,
            broker_url: config.mqtt.brokerUrl,
            topic_root: config.mqtt.topicRoot,
            subscriptions: mqttService.getSubscriptions(),
        },
        websocket: {
            clients: wsService.getClientCount(),
            path: config.ws.path,
        },
        sqlite: {
            connected: true,
            path: config.db.path,
        },
        host: {
            hostname: os.hostname(),
            platform: os.platform(),
            arch: os.arch(),
            uptime_seconds: os.uptime(),
            total_memory_bytes: os.totalmem(),
            free_memory_bytes: os.freemem(),
            load_average: os.loadavg(),
        },
        pihole_url: config.app.piholeUrl,
        telegram: {
            enabled: config.telegram.enabled,
            configured: !!config.telegram.botToken && !!config.telegram.chatId,
            bot_token_prefix: config.telegram.botToken ? `${config.telegram.botToken.substring(0, 10)}...` : null,
            chat_id_masked: config.telegram.chatId ? `***${config.telegram.chatId.slice(-4)}` : null,
        },
        timestamp: new Date().toISOString(),
    };
}

export async function runDiagnostics(): Promise<import('../types').DiagnosticResult> {
    const startDb = performance.now();
    let dbOk = false;
    try {
        const db = getDatabase();
        db.pragma('user_version');
        dbOk = true;
    } catch (e) {
        // DB error
    }
    const endDb = performance.now();
    
    const mqttConnected = mqttService.getConnectionStatus();
    const warnings: string[] = [];
    const recommendations: string[] = [];
    
    if (!mqttConnected) {
        warnings.push('MQTT broker connection is offline.');
        recommendations.push('Check Mosquitto service status and network connectivity.');
    }
    if (!dbOk) {
        warnings.push('SQLite database is inaccessible.');
        recommendations.push('Check file permissions for the database path.');
    }
    if (os.freemem() < 100 * 1024 * 1024) { // Less than 100MB
        warnings.push('Host memory is running critically low.');
        recommendations.push('Reboot the Orange Pi or stop unnecessary services.');
    }
    
    return {
        timestamp: new Date().toISOString(),
        services: {
            api: true, // If this code runs, API is working
            mqtt: mqttConnected,
            database: dbOk,
        },
        latency: {
            db_query_ms: Math.round(endDb - startDb),
        },
        warnings,
        recommendations,
    };
}
