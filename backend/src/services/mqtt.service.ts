import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { config } from '../config';
import { MqttSensorPayload, MqttRelayPayload, MqttDeviceStatusPayload } from '../types';

type MessageHandler = (topic: string, payload: unknown) => void;

class MqttService {
    private client: MqttClient | null = null;
    private handlers: Map<string, MessageHandler[]> = new Map();
    private isConnected = false;
    private reconnectCount = 0;

    connect(): void {
        const options: IClientOptions = {
            clientId: `home-smart-backend-${Date.now()}`,
            clean: true,
            reconnectPeriod: 5000,
            connectTimeout: 30000,
        };

        if (config.mqtt.username) {
            options.username = config.mqtt.username;
            options.password = config.mqtt.password;
        }

        console.log(`[MQTT] Connecting to ${config.mqtt.brokerUrl}...`);
        this.client = mqtt.connect(config.mqtt.brokerUrl, options);

        let hasLoggedFailure = false;

        this.client.on('connect', () => {
            this.isConnected = true;
            hasLoggedFailure = false;
            console.log('[MQTT] ✅ Connected successfully');
            this.subscribeToTopics();
        });

        this.client.on('error', () => {
            if (!hasLoggedFailure) {
                hasLoggedFailure = true;
                console.warn('[MQTT] ⚠️ Broker unreachable — will retry silently in background');
            }
            // Silent after first log
        });

        this.client.on('reconnect', () => {
            // Silent — already logged once
        });

        this.client.on('close', () => {
            this.isConnected = false;
            // Silent — already logged once
        });

        this.client.on('message', (topic: string, message: Buffer) => {
            try {
                const payload = JSON.parse(message.toString());
                this.notifyHandlers(topic, payload);
            } catch {
                console.warn(`[MQTT] Invalid message on ${topic}:`, message.toString());
            }
        });
    }

    private subscribeToTopics(): void {
        if (!this.client) return;

        const prefix = config.mqtt.topicPrefix;
        const topics = [
            `${prefix}/+/+/state`,     // home/{room}/{device}/state
            `${prefix}/+/+/status`,    // home/{room}/{device}/status
            `${prefix}/+/+/sensors/#`, // home/{room}/{device}/sensors/temp
        ];

        topics.forEach((topic) => this.subscribe(topic));
    }

    subscribe(topic: string): void {
        if (!this.client) return;

        this.client.subscribe(topic, { qos: 1 }, (err) => {
            if (err) {
                console.error(`[MQTT] Failed to subscribe to ${topic}:`, err.message);
            } else {
                console.log(`[MQTT] Subscribed to ${topic}`);
            }
        });
    }

    publish(topic: string, payload: unknown): void {
        if (!this.client || !this.isConnected) {
            console.warn('[MQTT] Cannot publish - not connected');
            return;
        }

        const message = JSON.stringify(payload);
        this.client.publish(topic, message, { qos: 1 }, (err) => {
            if (err) {
                console.error(`[MQTT] Publish error on ${topic}:`, err.message);
            }
        });
    }

    publishCommand(location: string, deviceId: string, command: string | Record<string, unknown>): void {
        const prefix = config.mqtt.topicPrefix;
        const topic = `${prefix}/${location}/${deviceId}/set`;
        const payload = typeof command === 'string' ? { command } : command;
        this.publish(topic, payload);
    }

    publishRelayCommand(location: string, deviceId: string, relayId: string, state: boolean): void {
        const prefix = config.mqtt.topicPrefix;
        const topic = `${prefix}/${location}/${deviceId}/${relayId}/set`;
        this.publish(topic, { state });
    }

    onMessage(topicPattern: string, handler: MessageHandler): void {
        const handlers = this.handlers.get(topicPattern) || [];
        handlers.push(handler);
        this.handlers.set(topicPattern, handlers);
    }

    private notifyHandlers(topic: string, payload: unknown): void {
        this.handlers.forEach((handlers, pattern) => {
            if (this.topicMatches(topic, pattern)) {
                handlers.forEach((handler) => handler(topic, payload));
            }
        });
    }

    private topicMatches(topic: string, pattern: string): boolean {
        const topicParts = topic.split('/');
        const patternParts = pattern.split('/');

        for (let i = 0; i < patternParts.length; i++) {
            if (patternParts[i] === '#') return true;
            if (patternParts[i] !== '+' && patternParts[i] !== topicParts[i]) return false;
        }

        return topicParts.length === patternParts.length;
    }

    getConnectionStatus(): boolean {
        return this.isConnected;
    }

    disconnect(): void {
        if (this.client) {
            this.client.end();
            this.client = null;
            this.isConnected = false;
            console.log('[MQTT] Disconnected');
        }
    }
}

export const mqttService = new MqttService();
