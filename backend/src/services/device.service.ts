import { getDatabase } from './database.service';
import { wsService } from './websocket.service';
import { mqttBridgeService } from './mqtt-bridge.service';
import { updateDeviceStatusDB, updateSensorDataDB, updateRelayStateDB } from '../features/devices/devices.controller';
import { recordSensorDataDB } from '../features/sensors/sensors.controller';
import { checkAlertRules } from '../features/notifications/notification.service';

class DeviceService {
    init(): void {
        console.log('[Device] Initializing device service...');

        // Handle 'state' messages for sensors and relays
        mqttBridgeService.registerHandler('state', (room: string, deviceId: string, payload: any) => {
            if (payload.sensorId && payload.value !== undefined) {
                this.handleSensorUpdate(room, deviceId, payload.sensorId, payload.value);
            } else if (payload.relayId && payload.state !== undefined) {
                this.handleRelayUpdate(room, deviceId, payload.relayId, payload.state);
            } else if (payload.power_usage === undefined) {
                // General update if not handled by EnergyService
                wsService.broadcast('device_update', { room, deviceId, ...payload });
            }
        });

        // Handle 'status' messages (online/offline)
        mqttBridgeService.registerHandler('status', (room: string, deviceId: string, payload: any) => {
            const status = payload.status as 'online' | 'offline';
            if (status) {
                updateDeviceStatusDB(deviceId, status);
                wsService.broadcast('device_update', { room, deviceId, status });
                console.log(`[Device] ${deviceId} is now ${status}`);
            }
        });
    }

    private handleSensorUpdate(room: string, deviceId: string, sensorId: string, value: number): void {
        updateSensorDataDB(deviceId, sensorId, value);
        recordSensorDataDB(deviceId, sensorId, value);
        wsService.broadcast('sensor_data', { room, deviceId, sensorId, value });
        checkAlertRules(deviceId, sensorId, value);
    }

    private handleRelayUpdate(room: string, deviceId: string, relayId: string, state: boolean): void {
        updateRelayStateDB(deviceId, relayId, state);
        wsService.broadcast('relay_state', { room, deviceId, relayId, state });
    }
}

export const deviceService = new DeviceService();
