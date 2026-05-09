import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, Clock3, Cpu, RadioTower, Server, ShieldCheck, Zap } from 'lucide-react';
import { apiService } from '../../shared/services/api.service';
import { useToast } from '../../shared/components/Toast';
import { useWebSocket } from '../../shared/hooks/useWebSocket';
import { AuditLogEntry, DeviceCommand, ModuleDevice, SystemHealth } from '../../shared/types';

function formatTime(value: string | null): string {
    if (!value) return 'Never';
    return new Date(value).toLocaleString();
}

export default function AdvancedDashboard() {
    const { showToast } = useToast();
    const [devices, setDevices] = useState<ModuleDevice[]>([]);
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [health, setHealth] = useState<SystemHealth | null>(null);
    const [pendingCommand, setPendingCommand] = useState<DeviceCommand | null>(null);
    const [requestedCommand, setRequestedCommand] = useState<DeviceCommand | null>(null);

    const load = async () => {
        try {
            const [deviceData, logData, healthData] = await Promise.all([
                apiService.getDevices(),
                apiService.getLogs({ limit: 6 }),
                apiService.getSystemHealth(),
            ]);
            setDevices(deviceData);
            setLogs(logData);
            setHealth(healthData);
        } catch (error: any) {
            showToast(error.message || 'Failed to load dashboard', 'error');
        }
    };

    useEffect(() => {
        void load();
    }, []);

    useWebSocket((message) => {
        if (message.type === 'device_status') {
            const payload = message.payload as Pick<ModuleDevice, 'device_id' | 'status' | 'ip_address' | 'firmware_version' | 'last_seen'>;
            setDevices((current) => current.map((device) => (
                device.device_id === payload.device_id ? { ...device, ...payload } : device
            )));
        }

        if (message.type === 'device_state') {
            const payload = message.payload as { device_id: string; state: string };
            setDevices((current) => current.map((device) => (
                device.device_id === payload.device_id ? { ...device, last_state: String(payload.state) } : device
            )));
        }

        if (message.type === 'device_telemetry') {
            const payload = message.payload as { device_id: string; telemetry: ModuleDevice['telemetry_last_payload'] };
            setDevices((current) => current.map((device) => (
                device.device_id === payload.device_id ? { ...device, telemetry_last_payload: payload.telemetry } : device
            )));
        }

        if (message.type === 'audit_log') {
            const payload = message.payload as AuditLogEntry;
            setLogs((current) => [payload, ...current].slice(0, 8));
        }

        if (message.type === 'system_health') {
            setHealth(message.payload as SystemHealth);
        }
    });

    const onlineCount = useMemo(() => devices.filter((device) => device.status === 'online').length, [devices]);
    const offlineCount = devices.length - onlineCount;
    const featuredDevice = devices.find((device) => device.device_id === 'pc_relay_01') || devices[0] || null;

    const sendCommand = async (command: DeviceCommand) => {
        if (!featuredDevice) return;
        setPendingCommand(command);
        try {
            await apiService.sendDeviceCommand(featuredDevice.device_id, command);
            showToast(`Command ${command} sent to ${featuredDevice.device_id}`, 'success');
        } catch (error: any) {
            showToast(error.message || 'Failed to send command', 'error');
        } finally {
            setPendingCommand(null);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="nexus-card p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-muted mb-3">HomeCore Nexus</p>
                    <h2 className="text-4xl font-black tracking-tight text-primary">Orange Pi Module Control</h2>
                    <p className="text-secondary mt-3 max-w-2xl">
                        MQTT-native control center for ESP8266 modules. Source of truth stays on backend and MQTT events, with live WebSocket updates across the UI.
                    </p>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-black/5 px-6 py-5 min-w-[280px]">
                    <div className="flex items-center gap-3 mb-2">
                        <ShieldCheck size={18} className="text-nexus-primary" />
                        <span className="text-[10px] uppercase font-black tracking-[0.2em] text-muted">System Status</span>
                    </div>
                    <div className="text-2xl font-black text-primary">{health?.mqtt.connected ? 'MQTT Ready' : 'MQTT Waiting'}</div>
                    <div className="text-xs text-secondary mt-2">Pi-hole: {health?.pihole_url || 'Not loaded yet'}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {[
                    { label: 'Online Modules', value: onlineCount, icon: RadioTower },
                    { label: 'Offline Modules', value: offlineCount, icon: Server },
                    { label: 'Audit Events', value: logs.length, icon: Activity },
                    { label: 'WS Clients', value: health?.websocket.clients ?? 0, icon: Cpu },
                ].map((card) => (
                    <div key={card.label} className="nexus-card p-6">
                        <div className="flex items-center justify-between mb-5">
                            <card.icon size={20} className="text-nexus-primary" />
                            <span className="text-[10px] uppercase font-black tracking-[0.2em] text-muted">{card.label}</span>
                        </div>
                        <div className="text-4xl font-black text-primary">{card.value}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6">
                <div className="nexus-card p-8">
                    <div className="flex items-center justify-between gap-4 mb-6">
                        <div>
                            <p className="text-[10px] uppercase font-black tracking-[0.2em] text-muted">Quick Control</p>
                            <h3 className="text-2xl font-black text-primary mt-2">{featuredDevice?.name || 'No module available'}</h3>
                        </div>
                        <div className={`px-4 py-2 rounded-full text-[10px] uppercase font-black tracking-[0.2em] ${featuredDevice?.status === 'online' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-300'}`}>
                            {featuredDevice?.status || 'unknown'}
                        </div>
                    </div>

                    {featuredDevice ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                <div className="rounded-2xl bg-black/5 px-4 py-4">
                                    <div className="text-[10px] uppercase font-black tracking-[0.2em] text-muted mb-2">Device ID</div>
                                    <div className="font-mono text-primary font-bold">{featuredDevice.device_id}</div>
                                </div>
                                <div className="rounded-2xl bg-black/5 px-4 py-4">
                                    <div className="text-[10px] uppercase font-black tracking-[0.2em] text-muted mb-2">Last State</div>
                                    <div className="font-bold text-primary">{featuredDevice.last_state || 'No state yet'}</div>
                                </div>
                                <div className="rounded-2xl bg-black/5 px-4 py-4">
                                    <div className="text-[10px] uppercase font-black tracking-[0.2em] text-muted mb-2">Topic</div>
                                    <div className="font-mono text-xs text-primary break-all">{featuredDevice.cmd_topic}</div>
                                </div>
                                <div className="rounded-2xl bg-black/5 px-4 py-4">
                                    <div className="text-[10px] uppercase font-black tracking-[0.2em] text-muted mb-2">Last Seen</div>
                                    <div className="font-bold text-primary">{formatTime(featuredDevice.last_seen)}</div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                {(['pulse', 'on', 'off'] as DeviceCommand[]).map((command) => (
                                    <button
                                        key={command}
                                        onClick={() => setRequestedCommand(command)}
                                        disabled={pendingCommand !== null}
                                        className="px-5 py-3 rounded-2xl bg-white text-slate-900 font-black uppercase text-[11px] tracking-[0.18em] shadow-soft hover:shadow-premium transition disabled:opacity-60"
                                    >
                                        {pendingCommand === command ? 'Sending...' : command}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-secondary">No modules have been registered yet.</div>
                    )}
                </div>

                <div className="nexus-card p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <Clock3 size={18} className="text-nexus-primary" />
                        <div>
                            <p className="text-[10px] uppercase font-black tracking-[0.2em] text-muted">Recent Audit Logs</p>
                            <h3 className="text-xl font-black text-primary mt-2">Backend Event Stream</h3>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {logs.map((log) => (
                            <div key={log.id} className="rounded-2xl bg-black/5 px-4 py-4">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-[10px] uppercase font-black tracking-[0.18em] text-muted">{log.category}</span>
                                    <span className="text-[10px] text-muted">{new Date(log.created_at).toLocaleTimeString()}</span>
                                </div>
                                <div className="mt-2 text-sm font-semibold text-primary">{log.message}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {requestedCommand && featuredDevice && (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/60" onClick={() => setRequestedCommand(null)} />
                        <motion.div initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.96 }} className="relative w-full max-w-lg nexus-card p-8">
                            <h3 className="text-2xl font-black text-primary">Confirm Quick Command</h3>
                            <p className="text-secondary mt-3">
                                Command sẽ được publish raw vào topic hiện tại của module, và Dashboard chỉ cập nhật trạng thái sau khi backend/MQTT phát event thật.
                            </p>
                            <div className="mt-5 rounded-3xl bg-black/5 px-4 py-4 text-sm">
                                <div><span className="font-black text-primary">Module:</span> {featuredDevice.name} ({featuredDevice.device_id})</div>
                                <div className="mt-2"><span className="font-black text-primary">Topic:</span> <span className="font-mono">{featuredDevice.cmd_topic}</span></div>
                                <div className="mt-2"><span className="font-black text-primary">Command:</span> {requestedCommand}</div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button onClick={() => setRequestedCommand(null)} className="rounded-2xl bg-white/10 px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-primary">
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        const command = requestedCommand;
                                        setRequestedCommand(null);
                                        void sendCommand(command);
                                    }}
                                    disabled={pendingCommand !== null}
                                    className="rounded-2xl bg-white px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-900 shadow-soft disabled:opacity-60"
                                >
                                    {pendingCommand === requestedCommand ? 'Sending...' : 'Confirm'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
