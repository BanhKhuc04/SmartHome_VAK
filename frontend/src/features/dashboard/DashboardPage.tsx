import React, { useState, useEffect, useCallback } from 'react';
import { Device, WebSocketMessage } from '../../shared/types';
import { apiService } from '../../shared/services/api.service';
import { useWebSocket } from '../../shared/hooks/useWebSocket';
import { StatCard, ConnectionIndicator } from '../../shared/components';
import { DeviceCard } from '../devices/components/DeviceCard';
import { SensorChart } from '../sensors/components/SensorChart';

export const DashboardPage: React.FC = () => {
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    // WebSocket for real-time updates
    const handleWsMessage = useCallback((message: WebSocketMessage) => {
        const payload = message.payload as Record<string, unknown>;

        switch (message.type) {
            case 'sensor_data': {
                setDevices((prev) =>
                    prev.map((device) =>
                        device.id === payload.deviceId
                            ? {
                                ...device,
                                sensors: device.sensors.map((s) =>
                                    s.id === payload.sensorId
                                        ? { ...s, value: payload.value as number, lastUpdated: message.timestamp }
                                        : s
                                ),
                            }
                            : device
                    )
                );
                break;
            }
            case 'relay_state': {
                setDevices((prev) =>
                    prev.map((device) =>
                        device.id === payload.deviceId
                            ? {
                                ...device,
                                relays: device.relays.map((r) =>
                                    r.id === payload.relayId ? { ...r, state: payload.state as boolean } : r
                                ),
                            }
                            : device
                    )
                );
                break;
            }
            case 'device_update': {
                setDevices((prev) =>
                    prev.map((device) =>
                        device.id === payload.deviceId
                            ? { ...device, status: payload.status as 'online' | 'offline' }
                            : device
                    )
                );
                break;
            }
        }
    }, []);

    const { isConnected } = useWebSocket(handleWsMessage);

    // Fetch devices
    useEffect(() => {
        const fetchDevices = async () => {
            try {
                const data = await apiService.getDevices();
                setDevices(data);
            } catch (error) {
                console.error('Failed to fetch devices:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDevices();
    }, []);

    // Update clock every second
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Computed stats
    const onlineDevices = devices.filter((d) => d.status === 'online').length;
    const totalRelays = devices.reduce((acc, d) => acc + d.relays.length, 0);
    const activeRelays = devices.reduce(
        (acc, d) => acc + d.relays.filter((r) => r.state).length,
        0
    );
    const totalSensors = devices.reduce((acc, d) => acc + d.sensors.length, 0);

    // Get temperature data for chart
    const tempData = devices
        .flatMap((d) => d.sensors)
        .filter((s) => s.type === 'temperature')
        .map((s) => ({
            value: s.value,
            timestamp: s.lastUpdated,
        }));

    const humData = devices
        .flatMap((d) => d.sensors)
        .filter((s) => s.type === 'humidity')
        .map((s) => ({
            value: s.value,
            timestamp: s.lastUpdated,
        }));

    const handleRelayChange = (deviceId: string, relayId: string, state: boolean) => {
        setDevices((prev) =>
            prev.map((device) =>
                device.id === deviceId
                    ? {
                        ...device,
                        relays: device.relays.map((r) =>
                            r.id === relayId ? { ...r, state } : r
                        ),
                    }
                    : device
            )
        );
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚡</div>
                    <div style={{ color: 'var(--text-secondary)' }}>Đang tải dữ liệu...</div>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Header */}
            <div className="app-header">
                <div className="header-left">
                    <button className="menu-toggle" id="menu-toggle">☰</button>
                    <span className="page-title">Dashboard</span>
                </div>
                <div className="header-right">
                    <ConnectionIndicator connected={isConnected} />
                    <span className="header-time">
                        {currentTime.toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                        })}
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="app-content">
                {/* Stats Overview */}
                <section style={{ marginBottom: 'var(--space-8)' }}>
                    <div className="section-header">
                        <div>
                            <h2 className="section-title">Tổng quan hệ thống</h2>
                            <p className="section-subtitle">
                                {currentTime.toLocaleDateString('vi-VN', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </p>
                        </div>
                    </div>

                    <div className="stats-grid">
                        <StatCard
                            icon="📡"
                            value={`${onlineDevices}/${devices.length}`}
                            label="Thiết bị Online"
                            trend={{ direction: 'up', text: `${Math.round((onlineDevices / Math.max(devices.length, 1)) * 100)}%` }}
                            color="#6366f1"
                            delay={0}
                        />
                        <StatCard
                            icon="⚡"
                            value={`${activeRelays}/${totalRelays}`}
                            label="Relay đang bật"
                            color="#06b6d4"
                            delay={100}
                        />
                        <StatCard
                            icon="🌡️"
                            value={tempData.length > 0 ? `${tempData[0].value}°C` : '--'}
                            label="Nhiệt độ trung bình"
                            trend={tempData.length > 0 ? { direction: tempData[0].value > 30 ? 'up' : 'down', text: tempData[0].value > 30 ? 'Nóng' : 'Bình thường' } : undefined}
                            color="#10b981"
                            delay={200}
                        />
                        <StatCard
                            icon="📊"
                            value={totalSensors}
                            label="Cảm biến hoạt động"
                            color="#f59e0b"
                            delay={300}
                        />
                    </div>
                </section>

                {/* Devices */}
                <section style={{ marginBottom: 'var(--space-8)' }}>
                    <div className="section-header">
                        <div>
                            <h2 className="section-title">Thiết bị</h2>
                            <p className="section-subtitle">Quản lý và điều khiển thiết bị IoT</p>
                        </div>
                    </div>

                    <div className="devices-grid">
                        {devices.map((device, index) => (
                            <DeviceCard
                                key={device.id}
                                device={device}
                                onRelayChange={handleRelayChange}
                            />
                        ))}
                    </div>
                </section>

                {/* Sensor Charts */}
                <section>
                    <div className="section-header">
                        <div>
                            <h2 className="section-title">Biểu đồ cảm biến</h2>
                            <p className="section-subtitle">Dữ liệu theo thời gian thực</p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 'var(--space-6)' }}>
                        <SensorChart
                            title="Nhiệt độ"
                            data={tempData}
                            color="#ef4444"
                            unit="°C"
                        />
                        <SensorChart
                            title="Độ ẩm"
                            data={humData}
                            color="#06b6d4"
                            unit="%"
                        />
                    </div>
                </section>
            </div>
        </>
    );
};
