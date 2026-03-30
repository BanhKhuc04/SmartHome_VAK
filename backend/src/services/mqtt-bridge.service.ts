import { mqttService } from './mqtt.service';

export type MqttMessageHandler = (room: string, deviceId: string, payload: any) => void;

class MqttBridgeService {
    private handlers: Map<string, MqttMessageHandler[]> = new Map();

    init(): void {
        console.log('[MQTT Bridge] Initializing message routing...');
        
        // Listen to the main state topic: home/{room}/{deviceId}/state
        mqttService.onMessage('home/+/+/state', (topic: string, payload: any) => {
            this.routeMessage(topic, payload);
        });

        // Listen to the status topic: home/{room}/{deviceId}/status
        mqttService.onMessage('home/+/+/status', (topic: string, payload: any) => {
            this.routeMessage(topic, payload);
        });
    }

    /**
     * Register a handler for a specific topic type (e.g., 'state', 'status')
     */
    registerHandler(type: string, handler: MqttMessageHandler): void {
        const handlers = this.handlers.get(type) || [];
        handlers.push(handler);
        this.handlers.set(type, handlers);
        console.log(`[MQTT Bridge] Registered handler for type: ${type}`);
    }

    private routeMessage(topic: string, payload: any): void {
        const parts = topic.split('/');
        // Format: home/{room}/{deviceId}/{type}
        if (parts.length < 4) return;

        const room = parts[1];
        const deviceId = parts[2];
        const type = parts[3];

        const handlers = this.handlers.get(type);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(room, deviceId, payload);
                } catch (err) {
                    console.error(`[MQTT Bridge] Error in handler for ${type}:`, err);
                }
            });
        }
    }
}

export const mqttBridgeService = new MqttBridgeService();
