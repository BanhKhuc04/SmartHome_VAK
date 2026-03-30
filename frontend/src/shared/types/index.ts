// ============================================
// Device Types
// ============================================

export interface Device {
    id: string;
    name: string;
    type: 'esp8266' | 'esp32';
    location: string;
    room_id?: string;
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

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: string;
}

export interface RelayCommand {
    relayId: string;
    state: boolean;
}

// ============================================
// WebSocket Types
// ============================================

export type WebSocketMessageType =
    | 'device_update'
    | 'sensor_data'
    | 'relay_state'
    | 'connection_status'
    | 'system_metrics'
    | 'notification'
    | 'automation_triggered'
    | 'energy_update';

export interface WebSocketMessage {
    type: WebSocketMessageType;
    payload: Record<string, unknown>;
    timestamp: string;
}

// ============================================
// Sensor Data
// ============================================

export interface SensorDataPoint {
    value: number;
    timestamp: string;
}

export type SensorHistory = Record<string, SensorDataPoint[]>;
