import axios, { AxiosError, AxiosInstance } from 'axios';
import { ApiResponse, AuditLogEntry, AutomationRule, DeviceCommand, ModuleDevice, SystemHealth } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiService {
    private client: AxiosInstance;

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
                const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
                if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !originalRequest.url?.includes('/auth/login')) {
                    originalRequest._retry = true;
                    try {
                        await this.client.post('/auth/refresh');
                        return this.client(originalRequest);
                    } catch {
                        window.dispatchEvent(new CustomEvent('auth:session-expired'));
                    }
                }

                return Promise.reject(error);
            }
        );
    }

    async login(username: string, password: string) {
        const res = await this.client.post<ApiResponse<{ user: unknown }>>('/auth/login', { username, password });
        return res.data.data;
    }

    async logout() {
        const res = await this.client.post<ApiResponse<{ logged_out: boolean }>>('/auth/logout');
        return res.data.data;
    }

    async getMe() {
        const res = await this.client.get<ApiResponse<unknown>>('/auth/me');
        return res.data.data;
    }

    async getDevices(status?: string): Promise<ModuleDevice[]> {
        const res = await this.client.get<ApiResponse<ModuleDevice[]>>('/devices', {
            params: status ? { status } : undefined,
        });
        return res.data.data || [];
    }

    async getDeviceById(device_id: string): Promise<ModuleDevice | null> {
        const res = await this.client.get<ApiResponse<ModuleDevice>>(`/devices/${device_id}`);
        return res.data.data || null;
    }

    async createDevice(payload: Partial<ModuleDevice>) {
        const res = await this.client.post<ApiResponse<ModuleDevice>>('/devices', payload);
        return res.data.data || null;
    }

    async updateDevice(device_id: string, payload: Partial<ModuleDevice>) {
        const res = await this.client.patch<ApiResponse<ModuleDevice>>(`/devices/${device_id}`, payload);
        return res.data.data || null;
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
