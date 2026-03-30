// ============================================
// Device Types
// ============================================

export interface Device {
    id: string;
    name: string;
    type: 'esp8266' | 'esp32';
    location: string;
    status: 'online' | 'offline';
    lastSeen: string;
    relays: Relay[];
    sensors: Sensor[];
}

export interface Relay {
    id: string;
    name: string;
    pin: number;
    state: boolean;
}

export interface Sensor {
    id: string;
    name: string;
    type: 'temperature' | 'humidity' | 'light' | 'motion' | 'gas';
    value: number;
    unit: string;
    lastUpdated: string;
}

// ============================================
// API Types
// ============================================

export interface RelayCommand {
    deviceId: string;
    relayId: string;
    state: boolean;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: string;
}

// ============================================
// WebSocket Types
// ============================================

export type WebSocketMessageType =
    | 'device_update'
    | 'sensor_data'
    | 'relay_state'
    | 'automation_triggered'
    | 'connection_status'
    | 'system_metrics'
    | 'energy_update'
    | 'ota_progress'
    | 'ota_completed'
    | 'ota_failed'
    | 'notification';

export interface WebSocketMessage {
    type: WebSocketMessageType;
    payload: any;
    timestamp: string;
}

// ============================================
// MQTT Types
// ============================================

export interface MqttSensorPayload {
    deviceId: string;
    sensorId: string;
    type: string;
    value: number;
    unit: string;
}

export interface MqttRelayPayload {
    deviceId: string;
    relayId: string;
    state: boolean;
}

export interface MqttDeviceStatusPayload {
    deviceId: string;
    status: 'online' | 'offline';
}
