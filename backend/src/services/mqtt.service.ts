import mqtt, { IClientOptions, MqttClient } from 'mqtt';
import { config } from '../config';
import { DeviceCommand, MqttInboundMessage } from '../types';
import { telegramService } from './telegram.service';
import { discoveryService } from './discovery.service';
import { telemetryService } from './telemetry.service';

type MessageHandler = (message: MqttInboundMessage) => void;

function parsePayload(rawPayload: string): unknown {
    try {
        return JSON.parse(rawPayload);
    } catch {
        return rawPayload;
    }
}

class MqttService {
    private client: MqttClient | null = null;
    private handlers = new Map<string, MessageHandler[]>();
    private connected = false;

    connect(): void {
        const options: IClientOptions = {
            clientId: `homecore-nexus-${Date.now()}`,
            clean: true,
            reconnectPeriod: 5000,
            connectTimeout: 30000,
        };

        if (config.mqtt.username) {
            options.username = config.mqtt.username;
            options.password = config.mqtt.password;
        }

        this.client = mqtt.connect(config.mqtt.brokerUrl, options);

        this.client.on('connect', () => {
            this.connected = true;
            console.log(`[MQTT] Connected to ${config.mqtt.brokerUrl}`);
            void telegramService.notifyMqttConnected();
            this.subscribe(config.discovery.topic);
            this.subscribe(`${config.mqtt.topicRoot}/+/telemetry`);
            for (const topic of config.mqtt.subscriptions) {
                this.subscribe(topic);
            }
        });

        this.client.on('close', () => {
            if (this.connected) {
                void telegramService.notifyMqttDisconnected();
            }
            this.connected = false;
        });

        this.client.on('error', (error) => {
            console.warn(`[MQTT] ${error.message}`);
        });

        this.client.on('message', (topic, payloadBuffer) => {
            const rawPayload = payloadBuffer.toString();
            const message: MqttInboundMessage = {
                topic,
                rawPayload,
                parsedPayload: parsePayload(rawPayload),
            };

            if (topic === config.discovery.topic) {
                discoveryService.handleDiscoveryMessage(rawPayload);
                return;
            }

            // Handle wildcard telemetry: homelab/device/+/telemetry
            const telemetryMatch = topic.match(/^homelab\/device\/([^/]+)\/telemetry$/);
            if (telemetryMatch) {
                const deviceId = telemetryMatch[1];
                void telemetryService.handleTelemetry(deviceId, rawPayload);
                return;
            }

            for (const [pattern, handlers] of this.handlers.entries()) {
                if (this.topicMatches(topic, pattern)) {
                    for (const handler of handlers) {
                        handler(message);
                    }
                }
            }
        });
    }

    subscribe(topic: string): void {
        if (!this.client) return;

        this.client.subscribe(topic, { qos: 1 }, (error) => {
            if (error) {
                console.error(`[MQTT] Failed to subscribe ${topic}: ${error.message}`);
            }
        });
    }

    publishCommand(topic: string, command: DeviceCommand): void {
        this.publishRaw(topic, command);
    }

    publishRaw(topic: string, payload: string): void {
        if (!this.client || !this.connected) {
            throw new Error('MQTT broker is not connected');
        }

        this.client.publish(topic, payload, { qos: 1 }, (error) => {
            if (error) {
                console.error(`[MQTT] Failed to publish ${topic}: ${error.message}`);
            }
        });
    }

    onMessage(topicPattern: string, handler: MessageHandler): void {
        const handlers = this.handlers.get(topicPattern) || [];
        handlers.push(handler);
        this.handlers.set(topicPattern, handlers);
    }

    getConnectionStatus(): boolean {
        return this.connected;
    }

    getSubscriptions(): string[] {
        return [...config.mqtt.subscriptions];
    }

    disconnect(): void {
        if (this.client) {
            this.client.end();
            this.client = null;
            this.connected = false;
        }
    }

    private topicMatches(topic: string, pattern: string): boolean {
        const topicParts = topic.split('/');
        const patternParts = pattern.split('/');

        for (let index = 0; index < patternParts.length; index += 1) {
            const patternPart = patternParts[index];
            if (patternPart === '#') return true;
            if (patternPart !== '+' && patternPart !== topicParts[index]) {
                return false;
            }
        }

        return topicParts.length === patternParts.length;
    }
}

export const mqttService = new MqttService();
