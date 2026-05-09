import { useEffect, useState } from 'react';
import { ExternalLink, HardDrive, Network, Radio, Server, Wifi } from 'lucide-react';
import { apiService } from '../../shared/services/api.service';
import { useWebSocket } from '../../shared/hooks/useWebSocket';
import { SystemHealth } from '../../shared/types';

export default function SystemPage() {
    const [health, setHealth] = useState<SystemHealth | null>(null);

    useEffect(() => {
        apiService.getSystemHealth().then(setHealth).catch(() => setHealth(null));
    }, []);

    useWebSocket((message) => {
        if (message.type === 'system_health') {
            setHealth(message.payload as SystemHealth);
        }
    });

    if (!health) {
        return <div className="nexus-card p-8 text-sm text-slate-400">Loading system health...</div>;
    }

    const cards = [
        { label: 'MQTT Broker', value: health.mqtt.connected ? 'Connected' : 'Disconnected', icon: Radio },
        { label: 'WebSocket Clients', value: `${health.websocket.clients}`, icon: Wifi },
        { label: 'SQLite', value: health.sqlite.connected ? 'Ready' : 'Offline', icon: HardDrive },
        { label: 'Host', value: `${health.host.hostname} (${health.host.arch})`, icon: Server },
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h2 className="text-3xl font-black tracking-tight text-primary">System</h2>
                <p className="text-sm text-secondary mt-2">Orange Pi health, native MQTT status, SQLite readiness, and Pi-hole entrypoint.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {cards.map((card) => (
                    <div key={card.label} className="nexus-card p-6">
                        <div className="flex items-center justify-between mb-6">
                            <card.icon size={20} className="text-nexus-primary" />
                            <span className="text-[10px] uppercase font-black tracking-[0.2em] text-muted">{card.label}</span>
                        </div>
                        <div className="text-lg font-black text-primary">{card.value}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
                <div className="nexus-card p-8 space-y-4">
                    <h3 className="text-xl font-black text-primary">Runtime Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-secondary">
                        <div><span className="font-black text-primary">Broker:</span> {health.mqtt.broker_url}</div>
                        <div><span className="font-black text-primary">WS Path:</span> {health.websocket.path}</div>
                        <div><span className="font-black text-primary">DB Path:</span> {health.sqlite.path}</div>
                        <div><span className="font-black text-primary">Platform:</span> {health.host.platform}</div>
                        <div><span className="font-black text-primary">Uptime:</span> {Math.round(health.host.uptime_seconds / 60)} minutes</div>
                        <div><span className="font-black text-primary">Free RAM:</span> {(health.host.free_memory_bytes / 1024 / 1024).toFixed(0)} MB</div>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase font-black tracking-[0.2em] text-muted mb-2">Subscriptions</p>
                        <div className="space-y-2">
                            {health.mqtt.subscriptions.map((subscription) => (
                                <div key={subscription} className="rounded-2xl bg-black/5 px-4 py-3 font-mono text-xs text-primary">
                                    {subscription}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="nexus-card p-8 flex flex-col justify-between">
                    <div>
                        <div className="w-14 h-14 rounded-[20px] bg-nexus-primary/10 text-nexus-primary flex items-center justify-center mb-5">
                            <Network size={26} />
                        </div>
                        <h3 className="text-xl font-black text-primary">Pi-hole Native</h3>
                        <p className="text-sm text-secondary mt-3">
                            Pi-hole chạy native trên mạng nội bộ. HomeCore Nexus chỉ link sang panel quản trị, không embed hay proxy.
                        </p>
                    </div>
                    <a
                        href={health.pihole_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-slate-900 px-5 py-4 font-black uppercase text-[11px] tracking-[0.18em] shadow-soft hover:shadow-premium transition-all"
                    >
                        Open Pi-hole
                        <ExternalLink size={14} />
                    </a>
                </div>
            </div>
        </div>
    );
}
