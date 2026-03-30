import axios, { AxiosInstance, AxiosError } from 'axios';
import { Device, ApiResponse, Relay, SensorHistory } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiService {
    private client: AxiosInstance;

    constructor(baseUrl: string) {
        this.client = axios.create({
            baseURL: baseUrl,
            withCredentials: true, // Crucial for HTTP-only cookies
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Response Interceptor for handling 401s and refreshing tokens
        this.client.interceptors.response.use(
            (response) => response,
            async (error: AxiosError) => {
                const originalRequest = error.config as any;

                // If error is 401 and we haven't tried to refresh yet
                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true;

                    // Exclude login/register/refresh from retry loop to avoid infinite loops
                    const isAuthPath = originalRequest.url?.includes('/auth/login') || 
                                     originalRequest.url?.includes('/auth/register') ||
                                     originalRequest.url?.includes('/auth/refresh');

                    if (!isAuthPath) {
                        try {
                            // Attempt to refresh the token via the backend refresh route
                            // The backend will update the cookies
                            await this.client.post('/auth/refresh');
                            
                            // Retry the original request
                            return this.client(originalRequest);
                        } catch (refreshError) {
                            // Refresh failed, possibly session expired
                            window.dispatchEvent(new CustomEvent('auth:session-expired'));
                            return Promise.reject(refreshError);
                        }
                    }
                }

                return Promise.reject(error);
            }
        );
    }

    // ============ Auth ============
    async login(username: string, password: string) {
        const res = await this.client.post<ApiResponse<any>>('/auth/login', { username, password });
        return res.data.data;
    }

    async register(username: string, email: string, password: string) {
        const res = await this.client.post<ApiResponse<any>>('/auth/register', { username, email, password });
        return res.data.data;
    }

    async logout() {
        const res = await this.client.post<ApiResponse<any>>('/auth/logout');
        return res.data;
    }

    async getMe() {
        const res = await this.client.get<ApiResponse<any>>('/auth/me');
        return res.data.data;
    }

    // ============ Devices ============
    async getDevices(): Promise<Device[]> {
        const res = await this.client.get<ApiResponse<Device[]>>('/devices');
        return res.data.data || [];
    }

    async getDeviceById(id: string): Promise<Device | null> {
        const res = await this.client.get<ApiResponse<Device>>(`/devices/${id}`);
        return res.data.data || null;
    }

    async createDevice(device: any) {
        const res = await this.client.post<ApiResponse<any>>('/devices', device);
        return res.data.data;
    }

    async updateDevice(id: string, data: any) {
        const res = await this.client.put<ApiResponse<any>>(`/devices/${id}`, data);
        return res.data.data;
    }

    async deleteDevice(id: string) {
        const res = await this.client.delete<ApiResponse<any>>(`/devices/${id}`);
        return res.data.data;
    }

    async toggleRelay(deviceId: string, command: { relayId: string; state: boolean }): Promise<Relay | null> {
        const res = await this.client.post<ApiResponse<Relay>>(`/devices/${deviceId}/relay`, command);
        return res.data.data || null;
    }

    // ============ Sensors ============
    async getSensorData(deviceId: string): Promise<SensorHistory> {
        const res = await this.client.get<ApiResponse<SensorHistory>>(`/sensors/${deviceId}/data`);
        return res.data.data || {};
    }

    // ============ Schedules ============
    async getSchedules() {
        const res = await this.client.get<ApiResponse<any[]>>('/schedules');
        return res.data.data || [];
    }

    async createSchedule(data: any) {
        const res = await this.client.post<ApiResponse<any>>('/schedules', data);
        return res.data.data;
    }

    async updateSchedule(id: number, data: any) {
        const res = await this.client.put<ApiResponse<any>>(`/schedules/${id}`, data);
        return res.data.data;
    }

    async deleteSchedule(id: number) {
        const res = await this.client.delete<ApiResponse<any>>(`/schedules/${id}`);
        return res.data.data;
    }

    async saveAutomationRule(rule: any) {
        const res = await this.client.post<ApiResponse<any>>('/rules', rule);
        return res.data.data;
    }

    // ============ Notifications ============
    async getNotifications(page = 1, limit = 50) {
        const res = await this.client.get<ApiResponse<any[]>>(`/notifications?page=${page}&limit=${limit}`);
        return res.data;
    }

    async markNotificationAsRead(id: number) {
        const res = await this.client.patch<ApiResponse<any>>(`/notifications/${id}/read`);
        return res.data.data;
    }

    async deleteNotification(id: number) {
        const res = await this.client.delete<ApiResponse<any>>(`/notifications/${id}`);
        return res.data.data;
    }

    async clearAllNotifications() {
        const res = await this.client.delete<ApiResponse<any>>('/notifications');
        return res.data.data;
    }

    // ============ OTA ============
    async getFirmwares() {
        const res = await this.client.get<ApiResponse<any[]>>('/ota/firmwares');
        return res.data.data || [];
    }

    // ============ Health ============
    async checkHealth() {
        const res = await this.client.get<ApiResponse<any>>('/health');
        return res.data.data;
    }
}

export const apiService = new ApiService(API_BASE_URL);
