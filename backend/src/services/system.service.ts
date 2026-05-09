import os from 'os';
import { config } from '../config';
import { getDatabase } from './database.service';
import { mqttService } from './mqtt.service';
import { wsService } from './websocket.service';
import { SystemHealth } from '../types';

export function getSystemHealth(): SystemHealth {
    const db = getDatabase();
    db.pragma('user_version');

    return {
        status: 'healthy',
        mqtt: {
            connected: mqttService.getConnectionStatus(),
            broker_url: config.mqtt.brokerUrl,
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
        timestamp: new Date().toISOString(),
    };
}
