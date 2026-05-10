export type DeviceStatus = 'online' | 'offline' | 'unknown';
export type DeviceCommand = 'pulse' | 'on' | 'off';
export type AuditLogCategory = 'auth' | 'command' | 'device_update' | 'mqtt_event' | 'automation' | 'system';
export type WebSocketMessageType =
    | 'connection_status'
    | 'device_status'
    | 'device_state'
    | 'device_telemetry'
    | 'audit_log'
    | 'system_health'
    | 'module_discovery';

export interface DiscoveredModule {
    id: number;
    device_id: string;
    name: string;
    type: string;
    platform: string | null;
    ip_address: string | null;
    firmware_version: string | null;
    capabilities: string[];
    cmd_topic: string;
    state_topic: string;
    status_topic: string;
    telemetry_topic: string;
    status: 'pending' | 'approved' | 'ignored';
    first_seen: string;
    last_seen: string;
    raw_payload?: any;
}

export interface ModuleDevice {
    device_id: string;
    name: string;
    type: string;
    location: string;
    status: DeviceStatus;
    ip_address: string | null;
    firmware_version: string | null;
    cmd_topic: string;
    state_topic: string;
    status_topic: string;
    telemetry_topic: string;
    last_seen: string | null;
    metadata_json: Record<string, unknown>;
    last_state: string | null;
    telemetry_last_payload: Record<string, unknown> | string | null;
    created_at: string;
    updated_at: string;
}

export interface AuditLogEntry {
    id: number;
    category: AuditLogCategory;
    action: string;
    message: string;
    device_id: string | null;
    actor: string | null;
    payload_json: Record<string, unknown> | string | null;
    created_at: string;
}

export interface AutomationRule {
    id: string;
    name: string;
    device_id: string;
    command: DeviceCommand;
    schedule: string;
    enabled: boolean;
    description: string;
    last_run: string | null;
    created_at: string;
    updated_at: string;
}

export interface SystemHealth {
    status: 'healthy' | 'degraded';
    mqtt: {
        connected: boolean;
        broker_url: string;
        topic_root: string;
        subscriptions: string[];
    };
    websocket: {
        clients: number;
        path: string;
    };
    sqlite: {
        connected: boolean;
        path: string;
    };
    host: {
        hostname: string;
        platform: string;
        arch: string;
        uptime_seconds: number;
        total_memory_bytes: number;
        free_memory_bytes: number;
        load_average: number[];
    };
    pihole_url: string;
    telegram: {
        enabled: boolean;
        configured: boolean;
        bot_token_prefix: string | null;
        chat_id_masked: string | null;
    };
    timestamp: string;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    details?: string[];
    timestamp: string;
}

export interface WebSocketMessage<T = unknown> {
    type: WebSocketMessageType;
    payload: T;
    timestamp: string;
}

export interface DiagnosticResult {
    timestamp: string;
    services: {
        api: boolean;
        mqtt: boolean;
        database: boolean;
    };
    latency: {
        db_query_ms: number;
    };
    warnings: string[];
    recommendations: string[];
}
