import React from 'react';

interface StatusBadgeProps {
    status: 'online' | 'offline';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    return (
        <span className={`status-badge ${status}`}>
            <span className="status-dot" />
            {status === 'online' ? 'Online' : 'Offline'}
        </span>
    );
};

interface ConnectionIndicatorProps {
    connected: boolean;
}

export const ConnectionIndicator: React.FC<ConnectionIndicatorProps> = ({ connected }) => {
    return (
        <div className="connection-indicator">
            <span className={`dot ${connected ? 'connected' : 'disconnected'}`} />
            {connected ? 'Real-time connected' : 'Connecting...'}
        </div>
    );
};

interface StatCardProps {
    icon: string;
    value: string | number;
    label: string;
    trend?: { direction: 'up' | 'down'; text: string };
    color?: string;
    delay?: number;
}

export const StatCard: React.FC<StatCardProps> = ({ icon, value, label, trend, color, delay = 0 }) => {
    return (
        <div
            className="stat-card animate-fade-in"
            style={{
                '--stat-color': color,
                animationDelay: `${delay}ms`,
            } as React.CSSProperties}
        >
            <div className="stat-icon" style={{ background: color ? `${color}22` : undefined }}>
                {icon}
            </div>
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
            {trend && (
                <span className={`stat-trend ${trend.direction}`}>
                    {trend.direction === 'up' ? '↑' : '↓'} {trend.text}
                </span>
            )}
        </div>
    );
};
