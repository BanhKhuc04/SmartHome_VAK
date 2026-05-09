import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ChevronDown, ChevronUp, Pencil, Plus, Search, Send, Trash2, Wifi, WifiOff, X, Zap, Cpu, Thermometer, LayoutTemplate } from 'lucide-react';
import { apiService } from '../../shared/services/api.service';
import { getApiErrorMessage } from '../../shared/services/api-errors';
import { useToast } from '../../shared/components/Toast';
import { useWebSocket } from '../../shared/hooks/useWebSocket';
import { DeviceCommand, ModuleDevice } from '../../shared/types';

type DeviceFormState = {
    device_id: string; name: string; type: string; location: string;
    ip_address: string; firmware_version: string; metadata_json: string;
    cmd_topic: string; state_topic: string; status_topic: string; telemetry_topic: string;
};

const emptyForm: DeviceFormState = {
    device_id: '', name: '', type: 'pc-control', location: '',
    ip_address: '', firmware_version: '', metadata_json: '{\n  "platform": "ESP8266"\n}',
    cmd_topic: '', state_topic: '', status_topic: '', telemetry_topic: '',
};

const MODULE_TEMPLATES = [
    { id: 'pc-relay', name: 'PC Power Relay', type: 'pc-control', icon: Zap, meta: { platform: "ESP8266", action: "pulse_relay" } },
    { id: 'gen-relay', name: 'Generic Relay', type: 'relay', icon: Zap, meta: { platform: "ESP8266", action: "toggle" } },
    { id: 'temp-sensor', name: 'Temperature Sensor', type: 'sensor', icon: Thermometer, meta: { platform: "ESP8266", sensor: "DHT22" } },
    { id: 'btn-node', name: 'Button Node', type: 'input', icon: Cpu, meta: { platform: "ESP8266", input: "button" } },
    { id: 'disp-node', name: 'Display Node', type: 'display', icon: LayoutTemplate, meta: { platform: "ESP8266", display: "SSD1306" } },
    { id: 'custom', name: 'Custom ESP8266', type: 'custom', icon: Cpu, meta: { platform: "ESP8266" } },
];

function formatTime(v: string | null) { return v ? new Date(v).toLocaleString('vi-VN') : 'Never'; }
function buildDefaultTopics(deviceId: string) {
    const normalized = deviceId.trim() || '<device_id>';
    return {
        cmd_topic: `homelab/device/${normalized}/cmd`,
        state_topic: `homelab/device/${normalized}/state`,
        status_topic: `homelab/device/${normalized}/status`,
        telemetry_topic: `homelab/device/${normalized}/telemetry`,
    };
}
function hasRenderableContent(device: ModuleDevice) {
    return device.device_id.trim().length > 0 && device.name.trim().length > 0;
}

function MetadataPreview({ metadata }: { metadata: Record<string, unknown> }) {
    const preview = Object.entries(metadata).slice(0, 2);
    if (preview.length === 0) {
        return <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No metadata</div>;
    }

    return (
        <div className="space-y-1">
            {preview.map(([key, value]) => (
                <div key={key} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{key}:</span> {String(value)}
                </div>
            ))}
        </div>
    );
}

function DeviceCardSkeleton() {
    return (
        <div className="nexus-card" style={{ padding: '20px 24px' }}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                    <div className="animate-pulse nexus-inset" style={{ width: 44, height: 44, borderRadius: 14 }} />
                    <div className="flex-1 space-y-2">
                        <div className="animate-pulse nexus-inset" style={{ height: 16, width: '52%' }} />
                        <div className="animate-pulse nexus-inset" style={{ height: 12, width: '34%' }} />
                        <div className="animate-pulse nexus-inset" style={{ height: 18, width: 92, borderRadius: 999 }} />
                    </div>
                </div>
                <div className="animate-pulse nexus-inset" style={{ width: 74, height: 24, borderRadius: 999 }} />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
                {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="nexus-inset" style={{ padding: '8px 12px' }}>
                        <div className="animate-pulse" style={{ height: 8, width: '42%', background: 'rgba(148, 163, 184, 0.14)', borderRadius: 999 }} />
                        <div className="animate-pulse mt-2" style={{ height: 12, width: '76%', background: 'rgba(148, 163, 184, 0.2)', borderRadius: 999 }} />
                    </div>
                ))}
            </div>
            <div className="animate-pulse nexus-inset mt-3" style={{ height: 38 }} />
            <div className="flex gap-2 mt-4">
                {[1, 2, 3].map((item) => (
                    <div key={item} className="animate-pulse nexus-inset" style={{ height: 34, flex: 1 }} />
                ))}
            </div>
        </div>
    );
}

export default function DeviceManager() {
    const { showToast } = useToast();
    const [devices, setDevices] = useState<ModuleDevice[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline' | 'unknown'>('all');
    const [loading, setLoading] = useState(true);
    const [formState, setFormState] = useState<DeviceFormState>(emptyForm);
    const [editingDevice, setEditingDevice] = useState<ModuleDevice | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [commandTarget, setCommandTarget] = useState<ModuleDevice | null>(null);
    const [selectedCommand, setSelectedCommand] = useState<DeviceCommand>('pulse');
    const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [typeFilter, setTypeFilter] = useState<'all' | string>('all');
    const [manualTopics, setManualTopics] = useState(false);
    const [activeTemplate, setActiveTemplate] = useState<string>('pc-relay');
    const [deviceToDelete, setDeviceToDelete] = useState<ModuleDevice | null>(null);
    const [cooldownRemaining, setCooldownRemaining] = useState(0);

    const loadDevices = async () => {
        try {
            setLoading(true);
            setErrorMessage(null);
            const data = await apiService.getDevices(statusFilter === 'all' ? undefined : statusFilter);
            setDevices(data.filter(hasRenderableContent));
        } catch (error: unknown) {
            const message = getApiErrorMessage(error);
            setDevices([]);
            setErrorMessage(message);
            showToast(message, 'error');
        } finally { setLoading(false); }
    };

    useEffect(() => { void loadDevices(); }, [statusFilter]);

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
    });

    const availableTypes = useMemo(() => Array.from(new Set(devices.map((device) => device.type))).sort(), [devices]);

    const filteredDevices = useMemo(() => devices.filter((d) => {
        const t = search.toLowerCase();
        const matchesType = typeFilter === 'all' || d.type === typeFilter;
        return matchesType && (d.device_id.toLowerCase().includes(t) || d.name.toLowerCase().includes(t) || d.type.toLowerCase().includes(t) || d.location.toLowerCase().includes(t));
    }), [devices, search, typeFilter]);

    const openCreate = () => {
        setEditingDevice(null);
        setManualTopics(false);
        setActiveTemplate('pc-relay');
        setFormState(emptyForm);
        setShowForm(true);
    };
    const openEdit = (device: ModuleDevice) => {
        setEditingDevice(device);
        setManualTopics(true);
        setActiveTemplate('');
        setFormState({
            device_id: device.device_id,
            name: device.name,
            type: device.type,
            location: device.location,
            ip_address: device.ip_address || '',
            firmware_version: device.firmware_version || '',
            metadata_json: JSON.stringify(device.metadata_json, null, 2),
            cmd_topic: device.cmd_topic,
            state_topic: device.state_topic,
            status_topic: device.status_topic,
            telemetry_topic: device.telemetry_topic,
        });
        setShowForm(true);
    };

    const applyTemplate = (tpl: typeof MODULE_TEMPLATES[0]) => {
        setActiveTemplate(tpl.id);
        setFormState(c => ({
            ...c,
            type: tpl.type,
            metadata_json: JSON.stringify(tpl.meta, null, 2),
        }));
    };

    const saveDevice = async () => {
        try {
            const defaultTopics = buildDefaultTopics(formState.device_id);
            const payload = {
                device_id: formState.device_id,
                name: formState.name,
                type: formState.type,
                location: formState.location,
                ip_address: formState.ip_address || null,
                firmware_version: formState.firmware_version || null,
                metadata_json: JSON.parse(formState.metadata_json || '{}'),
                cmd_topic: manualTopics ? formState.cmd_topic : defaultTopics.cmd_topic,
                state_topic: manualTopics ? formState.state_topic : defaultTopics.state_topic,
                status_topic: manualTopics ? formState.status_topic : defaultTopics.status_topic,
                telemetry_topic: manualTopics ? formState.telemetry_topic : defaultTopics.telemetry_topic,
            };
            if (editingDevice) { await apiService.updateDevice(editingDevice.device_id, payload); showToast(`Updated ${editingDevice.device_id}`, 'success'); }
            else { await apiService.createDevice(payload); showToast(`Created ${payload.device_id}`, 'success'); }
            setShowForm(false); setFormState(emptyForm); await loadDevices();
        } catch (error: any) { showToast(error.message || 'Failed to save module', 'error'); }
    };

    const removeDevice = async (id: string) => {
        try { await apiService.deleteDevice(id); showToast(`Deleted ${id}`, 'success'); await loadDevices(); }
        catch (error: any) { showToast(error.message || 'Failed to delete module', 'error'); }
        finally { setDeviceToDelete(null); }
    };

    const confirmCommand = async () => {
        if (!commandTarget || cooldownRemaining > 0) return;
        
        try { 
            await apiService.sendDeviceCommand(commandTarget.device_id, selectedCommand); 
            showToast(`Queued "${selectedCommand}" for ${commandTarget.device_id}`, 'success'); 
            setCooldownRemaining(selectedCommand === 'pulse' ? 3 : 1);
            setCommandTarget(null); 
        }
        catch (error: any) { showToast(error.message || 'Command failed', 'error'); }
    };

    useEffect(() => {
        if (!showForm || manualTopics) {
            return;
        }
        const topics = buildDefaultTopics(formState.device_id);
        setFormState((current) => ({
            ...current,
            ...topics,
        }));
    }, [formState.device_id, manualTopics, showForm]);

    const toggleTopics = (id: string) => {
        setExpandedTopics((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };

    const defaultTopicPreview = buildDefaultTopics(formState.device_id);

    return (
        <div className="page-shell animate-fade-in">
            {/* Header */}
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                <div>
                    <h2 className="font-black tracking-tight" style={{ fontSize: 24, color: 'var(--text-primary)' }}>Module Center</h2>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Manage ESP8266 nodes, sensors, and remote relays.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative min-w-[240px]">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search modules..." className="input-glass pl-9" />
                    </div>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="input-glass" style={{ minWidth: 130 }}>
                        <option value="all">All statuses</option>
                        <option value="online">Online</option>
                        <option value="offline">Offline</option>
                        <option value="unknown">Unknown</option>
                    </select>
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input-glass" style={{ minWidth: 150 }}>
                        <option value="all">All types</option>
                        {availableTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                    <button onClick={openCreate} className="btn-premium justify-center" style={{ minWidth: 156 }}><Plus size={16} /> Add Module</button>
                </div>
            </div>

            {/* Device Grid */}
            {loading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[1, 2, 3].map((k) => <DeviceCardSkeleton key={k} />)}
                </div>
            ) : errorMessage ? (
                <div className="nexus-card flex flex-col items-start gap-3" style={{ padding: '28px 24px' }}>
                    <div className="flex items-center gap-3">
                        <AlertTriangle size={22} style={{ color: 'var(--nexus-warning)' }} />
                        <div>
                            <div className="font-bold" style={{ fontSize: 15, color: 'var(--text-primary)' }}>Unable to load modules</div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{errorMessage}</div>
                        </div>
                    </div>
                    <button onClick={() => void loadDevices()} className="btn-premium">Retry Connection</button>
                </div>
            ) : filteredDevices.length === 0 ? (
                <div className="nexus-card flex flex-col items-center justify-center" style={{ padding: '64px 24px' }}>
                    <div className="p-4 rounded-full bg-[var(--bg-inset)] mb-4">
                        <Wifi size={32} style={{ color: 'var(--nexus-primary)' }} />
                    </div>
                    <div className="font-black" style={{ fontSize: 18, color: 'var(--text-primary)' }}>No modules found</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Register your first ESP8266 node to get started.</div>
                    <button onClick={openCreate} className="btn-premium mt-6"><Plus size={15} /> Add Module</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-5">
                    {filteredDevices.map((device) => (
                        <div key={device.device_id} className="nexus-card flex flex-col" style={{ padding: '24px' }}>
                            {/* Card header */}
                            <div className="flex items-start justify-between gap-3 mb-5">
                                <div className="flex items-start gap-4">
                                    <div className="flex items-center justify-center" style={{ width: 48, height: 48, borderRadius: 12, background: device.status === 'online' ? 'rgba(16,185,129,0.1)' : 'var(--bg-inset)', color: device.status === 'online' ? '#34d399' : 'var(--text-muted)' }}>
                                        {device.status === 'online' ? <Wifi size={24} /> : <WifiOff size={24} />}
                                    </div>
                                    <div>
                                        <h3 className="font-black" style={{ fontSize: 18, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{device.name}</h3>
                                        <p className="font-mono mt-1" style={{ fontSize: 12, color: 'var(--nexus-primary)' }}>{device.device_id}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="cat-badge system">{device.type}</span>
                                            {device.last_state && (
                                                <span className="cat-badge" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
                                                    State: {device.last_state}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <span className={`status-badge ${device.status === 'online' ? 'online' : 'offline'}`} style={{ padding: '6px 12px', fontSize: 11 }}>
                                    <span className="status-dot" />{device.status}
                                </span>
                            </div>

                            {/* Info grid */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="nexus-inset" style={{ padding: '10px 14px' }}>
                                    <div className="font-extrabold uppercase" style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 4 }}>Location</div>
                                    <div className="font-bold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{device.location || 'Not set'}</div>
                                </div>
                                <div className="nexus-inset" style={{ padding: '10px 14px' }}>
                                    <div className="font-extrabold uppercase" style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 4 }}>Last Seen</div>
                                    <div className="font-bold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{formatTime(device.last_seen)}</div>
                                </div>
                                <div className="nexus-inset" style={{ padding: '10px 14px' }}>
                                    <div className="font-extrabold uppercase" style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 4 }}>IP Address</div>
                                    <div className="font-bold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{device.ip_address || 'Unknown'}</div>
                                </div>
                                <div className="nexus-inset" style={{ padding: '10px 14px' }}>
                                    <div className="font-extrabold uppercase" style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 4 }}>Firmware</div>
                                    <div className="font-bold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{device.firmware_version || 'Unknown'}</div>
                                </div>
                            </div>

                            <div className="nexus-inset mb-4" style={{ padding: '12px 14px' }}>
                                <div className="font-extrabold uppercase" style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 6 }}>Metadata</div>
                                <MetadataPreview metadata={device.metadata_json} />
                            </div>

                            {/* MQTT Topics (collapsible) */}
                            <button onClick={() => toggleTopics(device.device_id)} className="w-full flex items-center justify-between mt-auto nexus-inset transition-colors hover:bg-white/5" style={{ padding: '10px 14px', cursor: 'pointer', border: 'none' }}>
                                <span className="font-extrabold uppercase" style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--text-muted)' }}>MQTT Topic Endpoints</span>
                                {expandedTopics.has(device.device_id) ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
                            </button>
                            {expandedTopics.has(device.device_id) && (
                                <div className="nexus-inset mt-2 space-y-2 font-mono" style={{ padding: '12px 14px', fontSize: 11, color: 'var(--text-secondary)' }}>
                                    <div className="flex items-start gap-2"><span className="text-slate-500 font-bold min-w-[50px]">CMD:</span> <span className="text-blue-400 break-all">{device.cmd_topic}</span></div>
                                    <div className="flex items-start gap-2"><span className="text-slate-500 font-bold min-w-[50px]">STATE:</span> <span className="text-green-400 break-all">{device.state_topic}</span></div>
                                    <div className="flex items-start gap-2"><span className="text-slate-500 font-bold min-w-[50px]">STATUS:</span> <span className="text-amber-400 break-all">{device.status_topic}</span></div>
                                    <div className="flex items-start gap-2"><span className="text-slate-500 font-bold min-w-[50px]">TELEM:</span> <span className="text-purple-400 break-all">{device.telemetry_topic}</span></div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-white/5">
                                <button onClick={() => openEdit(device)} className="btn-ghost" style={{ padding: '8px 14px', fontSize: 12 }}>
                                    <Pencil size={14} /> Edit
                                </button>
                                <button onClick={() => { setCommandTarget(device); setSelectedCommand('pulse'); }} disabled={cooldownRemaining > 0 || device.status === 'offline'} className={`btn-command ${cooldownRemaining > 0 ? 'command-cooldown opacity-50' : ''}`}>
                                    <Zap size={14} /> {cooldownRemaining > 0 ? `Wait ${cooldownRemaining}s` : 'Pulse Power'}
                                </button>
                                <button onClick={() => { setCommandTarget(device); setSelectedCommand('on'); }} disabled={cooldownRemaining > 0 || device.status === 'offline'} className={`btn-command ${cooldownRemaining > 0 ? 'command-cooldown opacity-50' : ''}`}>
                                    <Send size={14} /> ON
                                </button>
                                <button onClick={() => { setCommandTarget(device); setSelectedCommand('off'); }} disabled={cooldownRemaining > 0 || device.status === 'offline'} className={`btn-command ${cooldownRemaining > 0 ? 'command-cooldown opacity-50' : ''}`}>
                                    <Send size={14} /> OFF
                                </button>
                                <button onClick={() => setDeviceToDelete(device)} className="btn-danger ml-auto" style={{ padding: '8px 14px', fontSize: 12 }}>
                                    <Trash2 size={14} /> Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Form Modal */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {showForm && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0" style={{ background: 'var(--overlay-bg)', backdropFilter: 'blur(4px)' }} onClick={() => setShowForm(false)} />
                        <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} 
                            className="relative w-full max-w-4xl bg-[var(--bg-card)] rounded-[var(--radius-lg)] border border-[var(--border-primary)] shadow-2xl flex flex-col" 
                            style={{ maxHeight: '90vh' }}>
                            
                            {/* Modal Header */}
                            <div className="p-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[var(--bg-card)] z-10 rounded-t-[var(--radius-lg)]">
                                <div>
                                    <h3 className="font-black text-xl text-white">{editingDevice ? 'Edit Module' : 'Register New Module'}</h3>
                                    <p className="text-xs text-slate-400 mt-1">Configure module identity, templates, and MQTT bindings.</p>
                                </div>
                                <button onClick={() => setShowForm(false)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 overflow-y-auto custom-scrollbar">
                                {!editingDevice && (
                                    <div className="mb-8">
                                        <div className="font-extrabold uppercase text-[10px] tracking-widest text-slate-500 mb-4">Module Templates</div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {MODULE_TEMPLATES.map(tpl => {
                                                const Icon = tpl.icon;
                                                return (
                                                    <button key={tpl.id} onClick={() => applyTemplate(tpl)} className={`module-template-card flex flex-col items-start gap-2 ${activeTemplate === tpl.id ? 'active' : ''}`}>
                                                        <Icon size={18} style={{ color: activeTemplate === tpl.id ? 'var(--nexus-primary)' : 'var(--text-muted)' }} />
                                                        <div className="text-sm font-bold text-white text-left">{tpl.name}</div>
                                                        <div className="text-[10px] text-slate-500 uppercase">{tpl.type}</div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="font-extrabold uppercase text-[10px] tracking-widest text-slate-500 mb-4">Identity & Network</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                    {[['device_id', 'Device ID (Required)'], ['name', 'Display Name (Required)'], ['type', 'Module Type'], ['location', 'Location'], ['ip_address', 'IP Address'], ['firmware_version', 'Firmware Version']].map(([field, label]) => (
                                        <label key={field} className="block">
                                            <span className="font-bold text-[11px] text-slate-400 mb-1.5 block">{label}</span>
                                            <input value={formState[field as keyof DeviceFormState]} disabled={field === 'device_id' && editingDevice !== null}
                                                onChange={(e) => setFormState((c) => ({ ...c, [field]: e.target.value }))} 
                                                className="input-glass w-full" 
                                                placeholder={`Enter ${label.toLowerCase()}...`}
                                            />
                                        </label>
                                    ))}
                                </div>

                                <div className="font-extrabold uppercase text-[10px] tracking-widest text-slate-500 mb-4">MQTT Configuration</div>
                                <div className="nexus-inset p-4 mb-4">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                        <div>
                                            <div className="font-bold text-sm text-white">Topic Generation</div>
                                            <div className="text-xs text-slate-400 mt-1">
                                                Topics auto-generate based on Device ID (<span className="font-mono text-blue-400">homelab/device/&lt;device_id&gt;/...</span>). Enable manual override to customize.
                                            </div>
                                        </div>
                                        <label className="flex items-center gap-2 text-sm font-bold text-white cursor-pointer select-none">
                                            <input type="checkbox" checked={manualTopics} onChange={(e) => setManualTopics(e.target.checked)} className="rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900" />
                                            Manual Override
                                        </label>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                    {[
                                        ['cmd_topic', 'CMD Topic', defaultTopicPreview.cmd_topic],
                                        ['state_topic', 'State Topic', defaultTopicPreview.state_topic],
                                        ['status_topic', 'Status Topic', defaultTopicPreview.status_topic],
                                        ['telemetry_topic', 'Telemetry Topic', defaultTopicPreview.telemetry_topic],
                                    ].map(([field, label, fallback]) => (
                                        <label key={field} className="block">
                                            <span className="font-bold text-[11px] text-slate-400 mb-1.5 block">{label}</span>
                                            <input
                                                value={manualTopics ? formState[field as keyof DeviceFormState] : fallback}
                                                disabled={!manualTopics}
                                                onChange={(e) => setFormState((current) => ({ ...current, [field]: e.target.value }))}
                                                className={`input-glass w-full font-mono text-xs ${!manualTopics ? 'opacity-60' : ''}`}
                                            />
                                        </label>
                                    ))}
                                </div>

                                <div className="font-extrabold uppercase text-[10px] tracking-widest text-slate-500 mb-4">Advanced</div>
                                <label className="block">
                                    <span className="font-bold text-[11px] text-slate-400 mb-1.5 block">Metadata JSON</span>
                                    <textarea 
                                        value={formState.metadata_json} 
                                        onChange={(e) => setFormState((c) => ({ ...c, metadata_json: e.target.value }))} 
                                        className="input-glass w-full font-mono text-xs p-3" 
                                        style={{ minHeight: 140 }} 
                                        placeholder={'{\n  "key": "value"\n}'}
                                    />
                                </label>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-white/5 bg-[var(--bg-card)] mt-auto sticky bottom-0 z-10 rounded-b-[var(--radius-lg)] flex justify-end gap-3">
                                <button onClick={() => setShowForm(false)} className="btn-ghost px-6">Cancel</button>
                                <button onClick={() => void saveDevice()} disabled={!formState.device_id || !formState.name} className="btn-premium px-8">
                                    {editingDevice ? 'Save Changes' : 'Register Module'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Command Confirm Modal */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {commandTarget && (
                        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0" style={{ background: 'var(--overlay-bg)', backdropFilter: 'blur(4px)' }} onClick={() => setCommandTarget(null)} />
                        <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} className="relative w-full max-w-lg nexus-card" style={{ padding: '24px 28px' }}>
                            <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle size={18} style={{ color: 'var(--nexus-warning)' }} />
                                <h3 className="font-black" style={{ fontSize: 18, color: 'var(--text-primary)' }}>Confirm Command</h3>
                            </div>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                                Raw MQTT command will be published. UI updates after backend/MQTT event.
                            </p>
                            <div className="nexus-inset space-y-2 mb-4" style={{ padding: '14px 16px' }}>
                                <div style={{ fontSize: 13 }}><span className="font-bold" style={{ color: 'var(--text-primary)' }}>Module:</span> <span style={{ color: 'var(--text-secondary)' }}>{commandTarget.name}</span></div>
                                <div style={{ fontSize: 13 }}><span className="font-bold" style={{ color: 'var(--text-primary)' }}>Device ID:</span> <span className="font-mono" style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{commandTarget.device_id}</span></div>
                                <div style={{ fontSize: 13 }}><span className="font-bold" style={{ color: 'var(--text-primary)' }}>Topic:</span> <span className="font-mono" style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{commandTarget.cmd_topic}</span></div>
                                <div style={{ fontSize: 13 }}><span className="font-bold" style={{ color: 'var(--text-primary)' }}>Command:</span> <span style={{ color: 'var(--nexus-warning)', fontWeight: 700, textTransform: 'uppercase' }}>{selectedCommand}</span></div>
                            </div>
                            <div className="nexus-inset mb-5" style={{ padding: '12px 14px', border: '1px solid rgba(245, 158, 11, 0.18)' }}>
                                <div className="font-extrabold uppercase" style={{ fontSize: 9, letterSpacing: '0.12em', color: '#fbbf24', marginBottom: 4 }}>Warning</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>This action sends a live MQTT command to the module. Use <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>pulse</span> for a momentary power trigger and avoid assuming final relay state until MQTT status returns.</div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button onClick={() => setCommandTarget(null)} className="btn-ghost">Cancel</button>
                                <button onClick={() => void confirmCommand()} disabled={cooldownRemaining > 0} className="btn-premium px-8">
                                    {cooldownRemaining > 0 ? `Wait ${cooldownRemaining}s` : `Confirm Send`}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Delete Confirm Modal */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {deviceToDelete && (
                        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0" style={{ background: 'var(--overlay-bg)', backdropFilter: 'blur(4px)' }} onClick={() => setDeviceToDelete(null)} />
                        <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} className="relative w-full max-w-md nexus-card" style={{ padding: '24px 28px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 rounded-full bg-red-500/10 text-red-500">
                                    <Trash2 size={20} />
                                </div>
                                <h3 className="font-black text-lg text-white">Delete Module</h3>
                            </div>
                            <p className="text-sm text-slate-400 mb-5">
                                Are you sure you want to delete <strong className="text-white">{deviceToDelete.name}</strong>? This action cannot be undone and will remove all associated telemetry history.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setDeviceToDelete(null)} className="btn-ghost">Cancel</button>
                                <button onClick={() => void removeDevice(deviceToDelete.device_id)} className="btn-danger px-6 font-bold">
                                    Delete Module
                                </button>
                            </div>
                        </motion.div>
                    </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
