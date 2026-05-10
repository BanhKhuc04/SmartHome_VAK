import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { ApiResponse, AuditLogEntry, AutomationRule, DeviceCommand, ModuleDevice, SystemHealth, DiagnosticResult } from '../types';
import { normalizeApiError } from './api-errors';

const getApiBaseUrl = () => {
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl && envUrl !== 'auto') {
        return envUrl;
    }
    
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    return `${protocol}//${host}:5000/api`;
};

const API_BASE_URL = getApiBaseUrl();

type ApiRequestConfig = InternalAxiosRequestConfig & {
    _retry?: boolean;
    skipAuthRefresh?: boolean;
    skipSessionExpiredEvent?: boolean;
};

function normalizeModuleDevice(raw: unknown): ModuleDevice | null {
    if (!raw || typeof raw !== 'object') {
        return null;
    }

    const candidate = raw as Partial<ModuleDevice> & Record<string, unknown>;
    if (typeof candidate.device_id !== 'string' || typeof candidate.name !== 'string') {
        return null;
    }

    return {
        device_id: candidate.device_id,
        name: candidate.name,
        type: typeof candidate.type === 'string' ? candidate.type : 'unknown',
        location: typeof candidate.location === 'string' ? candidate.location : '',
        status: candidate.status === 'online' || candidate.status === 'offline' || candidate.status === 'unknown' ? candidate.status : 'unknown',
        ip_address: typeof candidate.ip_address === 'string' ? candidate.ip_address : null,
        firmware_version: typeof candidate.firmware_version === 'string' ? candidate.firmware_version : null,
        cmd_topic: typeof candidate.cmd_topic === 'string' ? candidate.cmd_topic : '',
        state_topic: typeof candidate.state_topic === 'string' ? candidate.state_topic : '',
        status_topic: typeof candidate.status_topic === 'string' ? candidate.status_topic : '',
        telemetry_topic: typeof candidate.telemetry_topic === 'string' ? candidate.telemetry_topic : '',
        last_seen: typeof candidate.last_seen === 'string' ? candidate.last_seen : null,
        metadata_json: candidate.metadata_json && typeof candidate.metadata_json === 'object' && !Array.isArray(candidate.metadata_json)
            ? candidate.metadata_json as Record<string, unknown>
            : {},
        last_state: typeof candidate.last_state === 'string' ? candidate.last_state : null,
        telemetry_last_payload: candidate.telemetry_last_payload && typeof candidate.telemetry_last_payload === 'object'
            ? candidate.telemetry_last_payload as Record<string, unknown>
            : (typeof candidate.telemetry_last_payload === 'string' ? candidate.telemetry_last_payload : null),
        created_at: typeof candidate.created_at === 'string' ? candidate.created_at : '',
        updated_at: typeof candidate.updated_at === 'string' ? candidate.updated_at : '',
    };
}

class ApiService {
    private client: AxiosInstance;
    private refreshPromise: Promise<void> | null = null;

    constructor() {
        this.client = axios.create({
            baseURL: API_BASE_URL,
            withCredentials: true,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        this.client.interceptors.response.use(
            (response) => response,
            async (error: AxiosError<ApiResponse>) => {
                const originalRequest = error.config as ApiRequestConfig | undefined;
                const normalized = normalizeApiError(error);

                if (!originalRequest) {
                    return Promise.reject(normalized);
                }

                if (this.shouldAttemptRefresh(error, originalRequest)) {
                    originalRequest._retry = true;
                    try {
                        await this.refreshSession();
                        return this.client(originalRequest);
                    } catch {
                        this.emitSessionExpired(false);
                        return Promise.reject(normalized);
                    }
                }

                if (normalized.isSessionExpired && !originalRequest.skipSessionExpiredEvent && !this.isAuthEndpoint(originalRequest.url)) {
                    this.emitSessionExpired(false);
                }

                return Promise.reject(normalized);
            }
        );
    }

    private isAuthEndpoint(url?: string): boolean {
        const requestUrl = url || '';
        return ['/auth/login', '/auth/logout', '/auth/refresh'].some((path) => requestUrl.includes(path));
    }

    private shouldAttemptRefresh(error: AxiosError<ApiResponse>, request: ApiRequestConfig): boolean {
        if (error.response?.status !== 401) {
            return false;
        }

        if (request._retry || request.skipAuthRefresh) {
            return false;
        }

        if (this.isAuthEndpoint(request.url)) {
            return false;
        }

        return true;
    }

    private async refreshSession(): Promise<void> {
        if (!this.refreshPromise) {
            this.refreshPromise = this.client
                .post('/auth/refresh', undefined, {
                    skipAuthRefresh: true,
                    skipSessionExpiredEvent: true,
                } as ApiRequestConfig)
                .then(() => undefined)
                .finally(() => {
                    this.refreshPromise = null;
                });
        }

        return this.refreshPromise;
    }

    private emitSessionExpired(silent: boolean): void {
        // Only emit if the user was previously logged in
        const wasLoggedIn = localStorage.getItem('nexus_was_logged_in') === 'true';
        if (!wasLoggedIn) return;

        window.dispatchEvent(new CustomEvent('auth:session-expired', {
            detail: {
                message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
                silent,
            },
        }));
    }

    async login(username: string, password: string) {
        const res = await this.client.post<ApiResponse<{ user: unknown }>>('/auth/login', { username, password }, {
            skipAuthRefresh: true,
            skipSessionExpiredEvent: true,
        } as ApiRequestConfig);
        if (res.data.success) {
            localStorage.setItem('nexus_was_logged_in', 'true');
        }
        return res.data.data;
    }

    async logout() {
        const res = await this.client.post<ApiResponse<{ logged_out: boolean }>>('/auth/logout', undefined, {
            skipAuthRefresh: true,
            skipSessionExpiredEvent: true,
        } as ApiRequestConfig);
        localStorage.removeItem('nexus_was_logged_in');
        return res.data.data;
    }

    async getMe() {
        const res = await this.client.get<ApiResponse<unknown>>('/auth/me', {
            skipAuthRefresh: true,
            skipSessionExpiredEvent: true,
        } as ApiRequestConfig);
        return res.data.data;
    }

    async getDevices(status?: string): Promise<ModuleDevice[]> {
        const res = await this.client.get<ApiResponse<ModuleDevice[]>>('/devices', {
            params: status ? { status } : undefined,
        });
        return Array.isArray(res.data.data) ? res.data.data.map(normalizeModuleDevice).filter((device): device is ModuleDevice => device !== null) : [];
    }

    async getDeviceById(device_id: string): Promise<ModuleDevice | null> {
        const res = await this.client.get<ApiResponse<ModuleDevice>>(`/devices/${device_id}`);
        return normalizeModuleDevice(res.data.data);
    }

    async createDevice(payload: Partial<ModuleDevice>) {
        const res = await this.client.post<ApiResponse<ModuleDevice>>('/devices', payload);
        return normalizeModuleDevice(res.data.data);
    }

    async updateDevice(device_id: string, payload: Partial<ModuleDevice>) {
        const res = await this.client.patch<ApiResponse<ModuleDevice>>(`/devices/${device_id}`, payload);
        return normalizeModuleDevice(res.data.data);
    }

    async deleteDevice(device_id: string) {
        const res = await this.client.delete<ApiResponse<{ deleted: string }>>(`/devices/${device_id}`);
        return res.data.data || null;
    }

    async sendDeviceCommand(device_id: string, command: DeviceCommand) {
        const res = await this.client.post<ApiResponse<{ device_id: string; command: DeviceCommand; cmd_topic: string }>>(
            `/devices/${device_id}/command`,
            { command }
        );
        return res.data.data || null;
    }

    async getLogs(params?: { category?: string; device_id?: string; limit?: number }): Promise<AuditLogEntry[]> {
        const res = await this.client.get<ApiResponse<AuditLogEntry[]>>('/logs', { params });
        return res.data.data || [];
    }

    async getSystemHealth(): Promise<SystemHealth | null> {
        const res = await this.client.get<ApiResponse<SystemHealth>>('/system/health');
        return res.data.data || null;
    }

    async runDiagnostics(): Promise<DiagnosticResult | null> {
        const res = await this.client.post<ApiResponse<DiagnosticResult>>('/system/diagnostics');
        return res.data.data || null;
    }

    async testTelegram() {
        const res = await this.client.post<ApiResponse<{ message: string }>>('/system/test-telegram');
        return res.data.data || null;
    }

    async getAutomations(): Promise<AutomationRule[]> {
        const res = await this.client.get<ApiResponse<AutomationRule[]>>('/automations');
        return res.data.data || [];
    }

    async saveAutomation(payload: AutomationRule) {
        const res = await this.client.post<ApiResponse<AutomationRule>>('/automations', payload);
        return res.data.data || null;
    }

    async updateAutomation(payload: AutomationRule) {
        const res = await this.client.patch<ApiResponse<AutomationRule>>(`/automations/${payload.id}`, payload);
        return res.data.data || null;
    }

    async deleteAutomation(id: string) {
        const res = await this.client.delete<ApiResponse<{ deleted: string }>>(`/automations/${id}`);
        return res.data.data || null;
    }
}

export const apiService = new ApiService();
