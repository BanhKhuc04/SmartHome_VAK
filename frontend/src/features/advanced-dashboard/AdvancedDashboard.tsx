import { useEffect, useMemo, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, AlertTriangle, Clock3, Cpu, Database, ExternalLink, Radio, Server, Wifi, Zap, Pause, Play, Copy, CheckCircle2 } from 'lucide-react';
import { apiService } from '../../shared/services/api.service';
import { useToast } from '../../shared/components/Toast';
import { useWebSocket } from '../../shared/hooks/useWebSocket';
import { AuditLogEntry, DeviceCommand, ModuleDevice, SystemHealth } from '../../shared/types';
import { useSettings } from '../../shared/contexts/SettingsContext';

function formatTime(value: string | null): string {
    if (!value) return 'Never';
    return new Date(value).toLocaleString('vi-VN', { 
        hour: '2-digit', minute: '2-digit', second: '2-digit', 
        day: '2-digit', month: '2-digit', year: 'numeric' 
    });
}

function formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

type EventFilter = 'all' | 'command' | 'mqtt' | 'system' | 'error';

export default function AdvancedDashboard() {
    const { showToast } = useToast();
    const { settings } = useSettings();
    const [devices, setDevices] = useState<ModuleDevice[]>([]);
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [health, setHealth] = useState<SystemHealth | null>(null);
    const [requestedCommand, setRequestedCommand] = useState<DeviceCommand | null>(null);
    
    // Cooldown logic
    const [cooldownRemaining, setCooldownRemaining] = useState(0);
    
    // Event stream logic
    const [isStreamPaused, setIsStreamPaused] = useState(false);
    const [eventFilter, setEventFilter] = useState<EventFilter>('all');
    
    const load = async () => {
        try {
            const [deviceData, logData, healthData] = await Promise.all([
                apiService.getDevices(),
                apiService.getLogs({ limit: 25 }),
                apiService.getSystemHealth(),
            ]);
            setDevices(deviceData);
            setLogs(logData);
            setHealth(healthData);
        } catch (error: any) {
            showToast(error.message || 'Failed to load dashboard', 'error');
        }
    };

    useEffect(() => { void load(); }, []);

    // Cooldown timer
    useEffect(() => {
        if (cooldownRemaining <= 0) return;
        const timer = setInterval(() => {
            setCooldownRemaining(prev => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [cooldownRemaining]);

    useWebSocket((message) => {
        if (message.type === 'device_status') {
            const p = message.payload as Pick<ModuleDevice, 'device_id' | 'status' | 'ip_address' | 'firmware_version' | 'last_seen'>;
            setDevices((c) => c.map((d) => d.device_id === p.device_id ? { ...d, ...p } : d));
        }
        if (message.type === 'device_state') {
            const p = message.payload as { device_id: string; state: string };
            setDevices((c) => c.map((d) => d.device_id === p.device_id ? { ...d, last_state: String(p.state) } : d));
        }
        if (message.type === 'device_telemetry') {
            const p = message.payload as { device_id: string; telemetry: ModuleDevice['telemetry_last_payload'] };
            setDevices((c) => c.map((d) => d.device_id === p.device_id ? { ...d, telemetry_last_payload: p.telemetry } : d));
        }
        if (message.type === 'audit_log') {
            if (!isStreamPaused) {
                setLogs((c) => [message.payload as AuditLogEntry, ...c].slice(0, 25));
            }
        }
        if (message.type === 'system_health') {
            setHealth(message.payload as SystemHealth);
        }
    });

    const onlineCount = useMemo(() => devices.filter((d) => d.status === 'online').length, [devices]);
    const offlineCount = devices.length - onlineCount;
    const featuredDevice = useMemo(() => devices.find((d) => d.device_id === 'pc_relay_01') || devices[0] || null, [devices]);

    const filteredLogs = useMemo(() => {
        if (eventFilter === 'all') return logs;
        if (eventFilter === 'error') return logs.filter(l => l.category === 'system' && l.message.toLowerCase().includes('error'));
        if (eventFilter === 'mqtt') return logs.filter(l => l.category === 'mqtt_event');
        return logs.filter(l => l.category === eventFilter);
    }, [logs, eventFilter]);

    const sendCommand = async (command: DeviceCommand) => {
        if (!featuredDevice || cooldownRemaining > 0) return;
        
        try {
            await apiService.sendDeviceCommand(featuredDevice.device_id, command);
            showToast(`Command "${command}" sent to ${featuredDevice.device_id}`, 'success');
            // Apply cooldown: 3s for pulse, 1s for on/off
            setCooldownRemaining(command === 'pulse' ? 3 : 1);
        } catch (error: any) {
            showToast(error.message || 'Failed to send command', 'error');
        }
    };

    const copyTopic = (topic: string) => {
        navigator.clipboard.writeText(topic);
        showToast('Topic copied to clipboard', 'success');
    };

    return (
        <div className="page-shell animate-fade-in">
            {/* Screensaver Photo Preview */}
            {settings.screensaverBackground === 'custom' && settings.customScreensaverImages.filter(img => settings.activeCustomImageIds.includes(img.id)).length > 0 && (
                <div className="mb-4">
                    <PhotoSlideshowWidget />
                </div>
            )}

            {/* Service Status Cards (top row) */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="nexus-card flex items-center gap-3" style={{ padding: '12px 16px' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--nexus-success)', boxShadow: '0 0 8px var(--nexus-success)' }} />
                    <div>
                        <div className="font-bold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>Backend</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Online</div>
                    </div>
                </div>
                <div className="nexus-card flex items-center gap-3" style={{ padding: '12px 16px' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: health?.mqtt.connected ? 'var(--nexus-success)' : 'var(--nexus-warning)', boxShadow: health?.mqtt.connected ? '0 0 8px var(--nexus-success)' : 'none' }} />
                    <div>
                        <div className="font-bold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>MQTT Bridge</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{health?.mqtt.connected ? 'Connected' : 'Disconnected'}</div>
                    </div>
                </div>
                <div className="nexus-card flex items-center gap-3" style={{ padding: '12px 16px' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: health ? 'var(--nexus-success)' : 'var(--text-muted)' }} />
                    <div>
                        <div className="font-bold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>WebSocket</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{health ? `${health.websocket.clients} clients` : 'Waiting'}</div>
                    </div>
                </div>
                <div className="nexus-card flex items-center gap-3" style={{ padding: '12px 16px' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: health?.sqlite.connected ? 'var(--nexus-success)' : 'var(--text-muted)' }} />
                    <div>
                        <div className="font-bold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>SQLite</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{health?.sqlite.connected ? 'Ready' : 'Waiting'}</div>
                    </div>
                </div>
                <div className="nexus-card flex items-center gap-3" style={{ padding: '12px 16px' }}>
                    <Activity size={16} style={{ color: 'var(--nexus-primary)' }} />
                    <div>
                        <div className="font-bold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>System Load</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{health ? health.host.load_average[0].toFixed(2) : '...'}</div>
                    </div>
                </div>
            </div>

            {/* Main Area: Quick Control + Event Stream */}
            <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-4">
                
                {/* Left Column: Quick Control */}
                <div className="nexus-card flex flex-col" style={{ padding: '24px' }}>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <div className="font-extrabold uppercase" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--nexus-primary)' }}>Quick Control Panel</div>
                            <h2 className="font-black mt-1" style={{ fontSize: 24, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{featuredDevice?.name || 'No Module'}</h2>
                        </div>
                        {featuredDevice && (
                            <span className={`status-badge ${featuredDevice.status === 'online' ? 'online' : 'offline'}`} style={{ padding: '6px 14px', fontSize: 11 }}>
                                <span className="status-dot" />{featuredDevice.status}
                            </span>
                        )}
                    </div>

                    {featuredDevice ? (
                        <div className="flex-1 flex flex-col">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="nexus-inset">
                                    <div className="font-extrabold uppercase" style={{ fontSize: 10, letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 6 }}>Device ID</div>
                                    <div className="font-mono font-bold" style={{ fontSize: 14, color: 'var(--text-primary)' }}>{featuredDevice.device_id}</div>
                                </div>
                                <div className="nexus-inset">
                                    <div className="font-extrabold uppercase" style={{ fontSize: 10, letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 6 }}>Last State</div>
                                    <div className="font-bold flex items-center gap-2" style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: featuredDevice.last_state === 'ON' ? 'var(--nexus-success)' : 'var(--text-muted)' }} />
                                        {featuredDevice.last_state || 'Unknown'}
                                    </div>
                                </div>
                                <div className="nexus-inset col-span-2 flex items-center justify-between group">
                                    <div>
                                        <div className="font-extrabold uppercase" style={{ fontSize: 10, letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 6 }}>Command Topic</div>
                                        <div className="font-mono" style={{ fontSize: 12, color: 'var(--nexus-primary)' }}>{featuredDevice.cmd_topic}</div>
                                    </div>
                                    <button onClick={() => copyTopic(featuredDevice.cmd_topic)} className="p-2 rounded-md hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Copy size={14} style={{ color: 'var(--text-secondary)' }} />
                                    </button>
                                </div>
                                <div className="nexus-inset">
                                    <div className="font-extrabold uppercase" style={{ fontSize: 10, letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 6 }}>Firmware</div>
                                    <div className="font-bold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{featuredDevice.firmware_version || 'N/A'}</div>
                                </div>
                                <div className="nexus-inset">
                                    <div className="font-extrabold uppercase" style={{ fontSize: 10, letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 6 }}>Last Seen</div>
                                    <div className="font-bold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{formatTime(featuredDevice.last_seen)}</div>
                                </div>
                            </div>

                            <div className="mt-auto pt-4 border-t border-white/5">
                                <div className="font-extrabold uppercase mb-3" style={{ fontSize: 10, letterSpacing: '0.15em', color: 'var(--text-muted)' }}>Execute Command</div>
                                <div className="grid grid-cols-3 gap-3">
                                    {([
                                        { cmd: 'pulse' as DeviceCommand, label: 'Pulse Power', icon: Zap },
                                        { cmd: 'on' as DeviceCommand, label: 'Relay ON', icon: Play },
                                        { cmd: 'off' as DeviceCommand, label: 'Relay OFF', icon: Pause },
                                    ]).map(({ cmd, label, icon: Icon }) => {
                                        const isCooldown = cooldownRemaining > 0;
                                        return (
                                            <button 
                                                key={cmd} 
                                                onClick={() => setRequestedCommand(cmd)} 
                                                disabled={isCooldown || featuredDevice.status === 'offline'}
                                                className={`btn-command flex-col py-4 gap-2 ${isCooldown ? 'command-cooldown opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <Icon size={18} style={{ marginBottom: 4 }} />
                                                {isCooldown ? `Wait ${cooldownRemaining}s` : label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>No modules registered. Add one in Module Center.</div>
                        </div>
                    )}
                </div>

                {/* Right Column: Event Stream */}
                <div className="nexus-card flex flex-col" style={{ padding: '0' }}>
                    {/* Sticky Header */}
                    <div className="p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[var(--bg-card)] z-10 backdrop-blur-md">
                        <div className="flex items-center gap-2">
                            <Clock3 size={16} style={{ color: 'var(--nexus-primary)' }} />
                            <h3 className="font-black" style={{ fontSize: 15, color: 'var(--text-primary)' }}>Event Stream</h3>
                        </div>
                        <button 
                            onClick={() => setIsStreamPaused(!isStreamPaused)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
                            style={{ 
                                background: isStreamPaused ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.1)', 
                                color: isStreamPaused ? 'var(--nexus-warning)' : 'var(--nexus-primary)' 
                            }}
                        >
                            {isStreamPaused ? <Play size={12} /> : <Pause size={12} />}
                            {isStreamPaused ? 'Paused' : 'Live'}
                        </button>
                    </div>

                    {/* Filter Chips */}
                    <div className="px-4 py-3 border-b border-white/5 flex gap-2 overflow-x-auto scrollbar-none sticky top-[61px] bg-[var(--bg-card)] z-10">
                        {(['all', 'command', 'mqtt', 'system', 'error'] as EventFilter[]).map(f => (
                            <button 
                                key={f} 
                                onClick={() => setEventFilter(f)}
                                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-colors border ${eventFilter === f ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' : 'border-transparent bg-white/5 text-slate-400 hover:bg-white/10'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    {/* Fixed Height Stream Area */}
                    <div className="event-stream-container p-4 space-y-2">
                        {filteredLogs.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-500 text-sm">No events matching filter.</div>
                        ) : filteredLogs.map((log) => (
                            <div key={log.id} className="nexus-inset animate-slide-in" style={{ padding: '10px 14px' }}>
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <div className="flex items-center gap-2">
                                        <span className={`cat-badge ${log.category}`}>{log.category}</span>
                                        {log.device_id && <span className="font-mono text-[10px] text-slate-400">{log.device_id}</span>}
                                    </div>
                                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{new Date(log.created_at).toLocaleTimeString()}</span>
                                </div>
                                <div className="font-semibold" style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4 }}>{log.message}</div>
                                {log.actor && <div className="mt-1 text-[10px] text-slate-500 font-medium">Actor: {log.actor}</div>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Row: Orange Pi Health & Network */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Orange Pi Health */}
                <div className="nexus-card md:col-span-2" style={{ padding: '20px' }}>
                    <div className="flex items-center gap-2 mb-4">
                        <Cpu size={16} style={{ color: 'var(--nexus-primary)' }} />
                        <h3 className="font-black uppercase tracking-widest text-xs" style={{ color: 'var(--text-muted)' }}>Orange Pi Health</h3>
                    </div>
                    
                    {health ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Memory Usage</div>
                                <div className="text-sm font-black text-white mb-2">
                                    {((health.host.total_memory_bytes - health.host.free_memory_bytes) / 1024 / 1024 / 1024).toFixed(2)} GB 
                                    <span className="text-xs text-slate-400 font-medium ml-1">/ {(health.host.total_memory_bytes / 1024 / 1024 / 1024).toFixed(2)} GB</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${((health.host.total_memory_bytes - health.host.free_memory_bytes) / health.host.total_memory_bytes) * 100}%` }} />
                                </div>
                            </div>
                            <div>
                                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Load Average</div>
                                <div className="text-sm font-black text-white">{health.host.load_average.map(l => l.toFixed(2)).join(' • ')}</div>
                            </div>
                            <div>
                                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Uptime</div>
                                <div className="text-sm font-black text-white">{formatUptime(health.host.uptime_seconds)}</div>
                            </div>
                            <div>
                                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Platform</div>
                                <div className="text-sm font-black text-white">{health.host.platform} <span className="text-xs text-slate-400">{health.host.arch}</span></div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-slate-500">Loading health data...</div>
                    )}
                </div>

                {/* Network & Services */}
                <div className="nexus-card" style={{ padding: '20px' }}>
                    <div className="flex items-center gap-2 mb-4">
                        <Server size={16} style={{ color: 'var(--nexus-cyan)' }} />
                        <h3 className="font-black uppercase tracking-widest text-xs" style={{ color: 'var(--text-muted)' }}>Network & Services</h3>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                            <span className="text-slate-400 font-medium">MQTT Broker</span>
                            <span className="text-white font-mono text-xs bg-slate-800 px-2 py-1 rounded">{health?.mqtt.broker_url || settings.mqttBroker}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                            <span className="text-slate-400 font-medium">API Base</span>
                            <span className="text-white font-mono text-xs bg-slate-800 px-2 py-1 rounded">/api/*</span>
                        </div>
                        <div className="flex justify-between items-center text-sm pt-1">
                            <span className="text-slate-400 font-medium">Pi-hole Admin</span>
                            <a href={health?.pihole_url || settings.piholeUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 text-xs bg-blue-500/10 px-2 py-1 rounded">
                                Open <ExternalLink size={12} />
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Module Snapshot */}
            <div className="flex items-center gap-6 px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-[var(--radius-lg)]">
                <div className="text-xs font-black uppercase tracking-widest text-slate-500">Module Snapshot</div>
                <div className="h-4 w-px bg-white/10" />
                <div className="flex gap-4 text-sm font-bold">
                    <span className="text-blue-400">{devices.length} Total</span>
                    <span className="text-green-500">{onlineCount} Online</span>
                    {offlineCount > 0 && <span className="text-amber-500">{offlineCount} Offline</span>}
                </div>
            </div>

            {/* Confirm Command Modal */}
            <AnimatePresence>
                {requestedCommand && featuredDevice && (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0" style={{ background: 'var(--overlay-bg)' }} onClick={() => setRequestedCommand(null)} />
                        <motion.div initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.97 }}
                            className="relative w-full max-w-lg nexus-card" style={{ padding: '24px 28px' }}>
                            <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle size={18} style={{ color: 'var(--nexus-warning)' }} />
                                <h3 className="font-black" style={{ fontSize: 18, color: 'var(--text-primary)' }}>Confirm Command</h3>
                            </div>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                                This will publish a raw MQTT command. Final device state will update only after backend/MQTT feedback.
                            </p>
                            <div className="nexus-inset space-y-2 mb-5" style={{ padding: '14px 16px' }}>
                                <div style={{ fontSize: 13 }}><span className="font-bold" style={{ color: 'var(--text-primary)' }}>Module:</span> <span style={{ color: 'var(--text-secondary)' }}>{featuredDevice.name} ({featuredDevice.device_id})</span></div>
                                <div style={{ fontSize: 13 }}><span className="font-bold" style={{ color: 'var(--text-primary)' }}>Topic:</span> <span className="font-mono" style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{featuredDevice.cmd_topic}</span></div>
                                <div style={{ fontSize: 13 }}><span className="font-bold" style={{ color: 'var(--text-primary)' }}>Command:</span> <span className="font-bold uppercase tracking-wider" style={{ color: 'var(--nexus-warning)' }}>{requestedCommand}</span></div>
                            </div>
                            <div className="nexus-inset mb-5" style={{ padding: '12px 14px', border: '1px solid rgba(245, 158, 11, 0.18)' }}>
                                <div className="font-extrabold uppercase" style={{ fontSize: 9, letterSpacing: '0.12em', color: '#fbbf24', marginBottom: 4 }}>Command Safety</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Use <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Pulse Power</span> for a brief power-button trigger. Use <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Relay ON/OFF</span> only when the relay behavior is expected for this module.</div>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setRequestedCommand(null)} className="btn-ghost">Cancel</button>
                                <button onClick={() => { const cmd = requestedCommand; setRequestedCommand(null); void sendCommand(cmd); }} className="btn-premium" style={{ minWidth: 148 }}>
                                    Confirm <Zap size={14} />
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function PhotoSlideshowWidget() {
    const { settings } = useSettings();
    const [currentIndex, setCurrentIndex] = useState(0);

    const activeImages = useMemo(() => {
        return settings.customScreensaverImages.filter(img => settings.activeCustomImageIds.includes(img.id));
    }, [settings.customScreensaverImages, settings.activeCustomImageIds]);

    useEffect(() => {
        if (activeImages.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % activeImages.length);
        }, settings.slideshowInterval * 1000);
        return () => clearInterval(timer);
    }, [activeImages.length, settings.slideshowInterval]);

    if (activeImages.length === 0) return null;

    return (
        <div className="nexus-card overflow-hidden relative group" style={{ padding: 0, height: 240 }}>
            <AnimatePresence mode="wait">
                <motion.img 
                    key={activeImages[currentIndex].id}
                    src={activeImages[currentIndex].url}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="absolute inset-0 w-full h-full object-cover"
                />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                <div>
                    <div className="font-black text-white text-lg drop-shadow-md">Nexus Gallery</div>
                    <div className="text-xs text-slate-300 drop-shadow-md">{activeImages.length} active images • {settings.slideshowInterval}s interval</div>
                </div>
                <div className="flex gap-1.5">
                    {activeImages.map((_, idx) => (
                        <div key={idx} className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/40'}`} />
                    ))}
                </div>
            </div>
        </div>
    );
}

