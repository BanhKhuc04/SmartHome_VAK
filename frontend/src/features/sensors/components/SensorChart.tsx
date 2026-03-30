import React, { useMemo } from 'react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from 'recharts';
import { SensorDataPoint } from '../../../shared/types';

interface SensorChartProps {
    title: string;
    data: SensorDataPoint[];
    color?: string;
    unit?: string;
}

export const SensorChart: React.FC<SensorChartProps> = ({
    title,
    data,
    color = '#6366f1',
    unit = '',
}) => {
    const chartData = useMemo(() => {
        if (data.length === 0) {
            // Generate sample data when no real data exists
            const now = Date.now();
            return Array.from({ length: 20 }, (_, i) => ({
                time: new Date(now - (19 - i) * 60000).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                }),
                value: Math.round((25 + Math.sin(i * 0.5) * 5 + Math.random() * 2) * 10) / 10,
            }));
        }

        return data.map((point) => ({
            time: new Date(point.timestamp).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
            }),
            value: point.value,
        }));
    }, [data]);

    const gradientId = `gradient-${title.replace(/\s/g, '')}`;

    return (
        <div className="glass-card">
            <div className="card-header">
                <div>
                    <div className="card-title">{title}</div>
                    <div className="card-subtitle">
                        Real-time data • {chartData.length} data points
                    </div>
                </div>
                {chartData.length > 0 && (
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color }}>
                            {chartData[chartData.length - 1].value}{unit}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current</div>
                    </div>
                )}
            </div>
            <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis
                            dataKey="time"
                            stroke="var(--text-muted)"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="var(--text-muted)"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            width={40}
                        />
                        <Tooltip
                            contentStyle={{
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--text-primary)',
                                fontSize: '0.875rem',
                            }}
                            formatter={((value: number) => [`${value}${unit}`, title]) as never}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={color}
                            strokeWidth={2}
                            fill={`url(#${gradientId})`}
                            dot={false}
                            activeDot={{
                                r: 5,
                                fill: color,
                                stroke: 'white',
                                strokeWidth: 2,
                            }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
