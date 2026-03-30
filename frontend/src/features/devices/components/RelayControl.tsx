import React, { useState } from 'react';
import { Relay } from '../../../shared/types';
import { apiService } from '../../../shared/services/api.service';

interface RelayControlProps {
    deviceId: string;
    relay: Relay;
    disabled?: boolean;
    onStateChange?: (relayId: string, newState: boolean) => void;
}

export const RelayControl: React.FC<RelayControlProps> = ({
    deviceId,
    relay,
    disabled = false,
    onStateChange,
}) => {
    const [loading, setLoading] = useState(false);
    const [currentState, setCurrentState] = useState(relay.state);

    const handleToggle = async () => {
        if (loading || disabled) return;

        const newState = !currentState;
        setLoading(true);

        try {
            await apiService.toggleRelay(deviceId, {
                relayId: relay.id,
                state: newState,
            });
            setCurrentState(newState);
            onStateChange?.(relay.id, newState);
        } catch (error) {
            console.error('Failed to toggle relay:', error);
            // Revert on failure
        } finally {
            setLoading(false);
        }
    };

    const getRelayIcon = (): string => {
        const name = relay.name.toLowerCase();
        if (name.includes('đèn') || name.includes('light')) return '💡';
        if (name.includes('quạt') || name.includes('fan')) return '🌀';
        if (name.includes('pump') || name.includes('bơm')) return '💧';
        return '⚡';
    };

    return (
        <div className={`relay-control ${currentState ? 'active' : ''}`}>
            <div className="relay-info">
                <span className="relay-icon">{getRelayIcon()}</span>
                <div>
                    <div className="relay-name">{relay.name}</div>
                    <div className="relay-pin">GPIO {relay.pin}</div>
                </div>
            </div>
            <label className={`toggle-switch ${loading ? 'loading' : ''}`}>
                <input
                    type="checkbox"
                    checked={currentState}
                    onChange={handleToggle}
                    disabled={disabled || loading}
                />
                <span className="toggle-slider" />
            </label>
        </div>
    );
};
