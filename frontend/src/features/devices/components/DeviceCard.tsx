import React from 'react';
import { Device, Sensor, Relay } from '../../../shared/types';
import { StatusBadge } from '../../../shared/components';
import { RelayControl } from './RelayControl';

interface DeviceCardProps {
    device: Device;
    onRelayChange?: (deviceId: string, relayId: string, state: boolean) => void;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({ device, onRelayChange }) => {
    const isOffline = device.status === 'offline';

    const getDeviceIcon = (): string => {
        const loc = device.location.toLowerCase();
        if (loc.includes('phòng khách') || loc.includes('living')) return '🏠';
        if (loc.includes('phòng ngủ') || loc.includes('bed')) return '🛏️';
        if (loc.includes('bếp') || loc.includes('kitchen')) return '🍳';
        if (loc.includes('sân') || loc.includes('garden')) return '🌿';
        if (loc.includes('garage')) return '🚗';
        return '📡';
    };

    const getSensorIcon = (type: string): string => {
        switch (type) {
            case 'temperature': return '🌡️';
            case 'humidity': return '💧';
            case 'light': return '☀️';
            case 'motion': return '🏃';
            case 'gas': return '⚠️';
            default: return '📊';
        }
    };

    const formatTimeSince = (isoDate: string): string => {
        const diff = Date.now() - new Date(isoDate).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Vừa xong';
        if (mins < 60) return `${mins} phút trước`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} giờ trước`;
        return `${Math.floor(hours / 24)} ngày trước`;
    };

    return (
        <div className={`device-card animate-fade-in ${isOffline ? 'offline' : ''}`}>
            <div className="device-card-header">
                <div className="device-info">
                    <div className="device-avatar">{getDeviceIcon()}</div>
                    <div>
                        <div className="device-name">{device.name}</div>
                        <div className="device-location">
                            📍 {device.location} • {formatTimeSince(device.lastSeen)}
                        </div>
                    </div>
                </div>
                <StatusBadge status={device.status} />
            </div>

            <div className="device-card-body">
                {/* Sensors */}
                {device.sensors.length > 0 && (
                    <div className="device-sensors">
                        {device.sensors.map((sensor: Sensor) => (
                            <div key={sensor.id} className="sensor-item">
                                <div className="sensor-value">
                                    {getSensorIcon(sensor.type)} {sensor.value}{sensor.unit}
                                </div>
                                <div className="sensor-label">{sensor.name}</div>
                            </div>
                        ))}
                    </div>
                )}

                {device.relays.length > 0 && (
                    <div className="device-relays">
                        {device.relays.map((relay: Relay) => (
                            <RelayControl
                                key={relay.id}
                                deviceId={device.id}
                                relay={relay}
                                disabled={isOffline}
                                onStateChange={(relayId, state) => onRelayChange?.(device.id, relayId, state)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
