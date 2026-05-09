import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Pencil, Plus, Search, Send, Trash2, Wifi, WifiOff, X } from 'lucide-react';
import { apiService } from '../../shared/services/api.service';
import { useToast } from '../../shared/components/Toast';
import { useWebSocket } from '../../shared/hooks/useWebSocket';
import { DeviceCommand, ModuleDevice } from '../../shared/types';

type DeviceFormState = {
    device_id: string;
    name: string;
    type: string;
    location: string;
    ip_address: string;
    firmware_version: string;
    metadata_json: string;
};

const emptyForm: DeviceFormState = {
    device_id: '',
    name: '',
    type: 'pc-control',
    location: '',
    ip_address: '',
    firmware_version: '',
    metadata_json: '{\n  "platform": "ESP8266"\n}',
};

function formatTime(value: string | null) {
    return value ? new Date(value).toLocaleString() : 'Never';
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
    const [submittingCommand, setSubmittingCommand] = useState(false);

    const loadDevices = async () => {
        try {
            setLoading(true);
            const data = await apiService.getDevices(statusFilter === 'all' ? undefined : statusFilter);
            setDevices(data);
        } catch (error: any) {
            showToast(error.message || 'Failed to load modules', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadDevices();
    }, [statusFilter]);

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
    });

    const filteredDevices = useMemo(() => devices.filter((device) => {
        const term = search.toLowerCase();
        return (
            device.device_id.toLowerCase().includes(term) ||
            device.name.toLowerCase().includes(term) ||
            device.type.toLowerCase().includes(term) ||
            device.location.toLowerCase().includes(term)
        );
    }), [devices, search]);

    const openCreate = () => {
        setEditingDevice(null);
        setFormState(emptyForm);
        setShowForm(true);
    };

    const openEdit = (device: ModuleDevice) => {
        setEditingDevice(device);
        setFormState({
            device_id: device.device_id,
            name: device.name,
            type: device.type,
            location: device.location,
            ip_address: device.ip_address || '',
            firmware_version: device.firmware_version || '',
            metadata_json: JSON.stringify(device.metadata_json, null, 2),
        });
        setShowForm(true);
    };

    const saveDevice = async () => {
        try {
            const payload = {
                device_id: formState.device_id,
                name: formState.name,
                type: formState.type,
                location: formState.location,
                ip_address: formState.ip_address || null,
                firmware_version: formState.firmware_version || null,
                metadata_json: JSON.parse(formState.metadata_json || '{}'),
            };

            if (editingDevice) {
                await apiService.updateDevice(editingDevice.device_id, payload);
                showToast(`Updated ${editingDevice.device_id}`, 'success');
            } else {
                await apiService.createDevice(payload);
                showToast(`Created ${payload.device_id}`, 'success');
            }

            setShowForm(false);
            setFormState(emptyForm);
            await loadDevices();
        } catch (error: any) {
            showToast(error.message || 'Failed to save module', 'error');
        }
    };

    const removeDevice = async (device_id: string) => {
        try {
            await apiService.deleteDevice(device_id);
            showToast(`Deleted ${device_id}`, 'success');
            await loadDevices();
        } catch (error: any) {
            showToast(error.message || 'Failed to delete module', 'error');
        }
    };

    const confirmCommand = async () => {
        if (!commandTarget) return;
        setSubmittingCommand(true);
        try {
            await apiService.sendDeviceCommand(commandTarget.device_id, selectedCommand);
            showToast(`Queued ${selectedCommand} for ${commandTarget.device_id}`, 'success');
            setCommandTarget(null);
        } catch (error: any) {
            showToast(error.message || 'Command failed', 'error');
        } finally {
            setSubmittingCommand(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-primary">Module Center</h2>
                    <p className="text-secondary mt-2">Manage MQTT modules by `device_id`, topics, firmware metadata, and live backend state.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative min-w-[240px]">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search modules..."
                            className="input-glass w-full pl-11"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                        className="input-glass"
                    >
                        <option value="all">All statuses</option>
                        <option value="online">Online</option>
                        <option value="offline">Offline</option>
                        <option value="unknown">Unknown</option>
                    </select>
                    <button onClick={openCreate} className="btn-premium justify-center">
                        <Plus size={16} />
                        Add Module
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[1, 2].map((key) => <div key={key} className="nexus-card h-56 animate-pulse" />)}
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredDevices.map((device) => (
                        <div key={device.device_id} className="nexus-card p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center ${device.status === 'online' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/10 text-slate-300'}`}>
                                        {device.status === 'online' ? <Wifi size={24} /> : <WifiOff size={24} />}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-primary">{device.name}</h3>
                                        <p className="font-mono text-sm text-secondary mt-1">{device.device_id}</p>
                                        <div className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-full bg-black/5 text-[10px] uppercase font-black tracking-[0.18em] text-muted">
                                            <CheckCircle2 size={12} className="text-nexus-primary" />
                                            {device.type}
                                        </div>
                                    </div>
                                </div>
                                <div className={`px-4 py-2 rounded-full text-[10px] uppercase font-black tracking-[0.18em] ${device.status === 'online' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-300'}`}>
                                    {device.status}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 text-sm">
                                <div className="rounded-2xl bg-black/5 px-4 py-4">
                                    <div className="text-[10px] uppercase font-black tracking-[0.2em] text-muted mb-2">Location</div>
                                    <div className="font-semibold text-primary">{device.location || 'Not set'}</div>
                                </div>
                                <div className="rounded-2xl bg-black/5 px-4 py-4">
                                    <div className="text-[10px] uppercase font-black tracking-[0.2em] text-muted mb-2">Last Seen</div>
                                    <div className="font-semibold text-primary">{formatTime(device.last_seen)}</div>
                                </div>
                                <div className="rounded-2xl bg-black/5 px-4 py-4">
                                    <div className="text-[10px] uppercase font-black tracking-[0.2em] text-muted mb-2">IP Address</div>
                                    <div className="font-semibold text-primary">{device.ip_address || 'Unknown'}</div>
                                </div>
                                <div className="rounded-2xl bg-black/5 px-4 py-4">
                                    <div className="text-[10px] uppercase font-black tracking-[0.2em] text-muted mb-2">Firmware</div>
                                    <div className="font-semibold text-primary">{device.firmware_version || 'Unknown'}</div>
                                </div>
                            </div>

                            <div className="mt-6 rounded-3xl bg-black/5 px-4 py-4">
                                <div className="text-[10px] uppercase font-black tracking-[0.2em] text-muted mb-2">MQTT Topics</div>
                                <div className="space-y-2 font-mono text-xs text-primary break-all">
                                    <div>cmd: {device.cmd_topic}</div>
                                    <div>state: {device.state_topic}</div>
                                    <div>status: {device.status_topic}</div>
                                    <div>telemetry: {device.telemetry_topic}</div>
                                </div>
                            </div>

                            <div className="mt-6 flex flex-wrap gap-3">
                                <button onClick={() => openEdit(device)} className="rounded-2xl bg-white px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-900 shadow-soft">
                                    <Pencil size={14} className="inline mr-2" />
                                    Edit
                                </button>
                                <button onClick={() => setCommandTarget(device)} className="rounded-2xl bg-nexus-primary px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-premium">
                                    <Send size={14} className="inline mr-2" />
                                    Command
                                </button>
                                <button onClick={() => void removeDevice(device.device_id)} className="rounded-2xl bg-rose-500/15 px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-rose-300">
                                    <Trash2 size={14} className="inline mr-2" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {showForm && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/60" onClick={() => setShowForm(false)} />
                        <motion.div initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.96 }} className="relative w-full max-w-2xl nexus-card p-8">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-2xl font-black text-primary">{editingDevice ? 'Edit Module' : 'Add Module'}</h3>
                                    <p className="text-sm text-secondary mt-2">Module metadata and MQTT topic configuration.</p>
                                </div>
                                <button className="p-2 rounded-xl hover:bg-white/10" onClick={() => setShowForm(false)}>
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    ['device_id', 'Device ID'],
                                    ['name', 'Name'],
                                    ['type', 'Type'],
                                    ['location', 'Location'],
                                    ['ip_address', 'IP Address'],
                                    ['firmware_version', 'Firmware'],
                                ].map(([field, label]) => (
                                    <label key={field} className="block">
                                        <span className="text-[10px] uppercase font-black tracking-[0.2em] text-muted">{label}</span>
                                        <input
                                            value={formState[field as keyof DeviceFormState]}
                                            disabled={field === 'device_id' && editingDevice !== null}
                                            onChange={(event) => setFormState((current) => ({ ...current, [field]: event.target.value }))}
                                            className="input-glass w-full mt-2"
                                        />
                                    </label>
                                ))}
                            </div>

                            <label className="block mt-4">
                                <span className="text-[10px] uppercase font-black tracking-[0.2em] text-muted">metadata_json</span>
                                <textarea
                                    value={formState.metadata_json}
                                    onChange={(event) => setFormState((current) => ({ ...current, metadata_json: event.target.value }))}
                                    className="w-full mt-2 min-h-[150px] rounded-3xl border border-white/10 bg-white/10 px-4 py-4 font-mono text-sm outline-none"
                                />
                            </label>

                            <div className="flex justify-end gap-3 mt-6">
                                <button onClick={() => setShowForm(false)} className="rounded-2xl bg-white/10 px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-primary">
                                    Cancel
                                </button>
                                <button onClick={() => void saveDevice()} className="rounded-2xl bg-nexus-primary px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-premium">
                                    Save Module
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {commandTarget && (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/60" onClick={() => setCommandTarget(null)} />
                        <motion.div initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.96 }} className="relative w-full max-w-lg nexus-card p-8">
                            <h3 className="text-2xl font-black text-primary">Confirm Command</h3>
                            <p className="text-secondary mt-3">
                                Command sẽ được publish raw tới topic MQTT hiện tại của module. UI sẽ chờ event backend/MQTT để phản ánh trạng thái thật.
                            </p>
                            <div className="mt-5 rounded-3xl bg-black/5 px-4 py-4 text-sm">
                                <div><span className="font-black text-primary">Module:</span> {commandTarget.name} ({commandTarget.device_id})</div>
                                <div className="mt-2"><span className="font-black text-primary">cmd_topic:</span> <span className="font-mono">{commandTarget.cmd_topic}</span></div>
                            </div>
                            <div className="grid grid-cols-3 gap-3 mt-5">
                                {(['pulse', 'on', 'off'] as DeviceCommand[]).map((command) => (
                                    <button
                                        key={command}
                                        onClick={() => setSelectedCommand(command)}
                                        className={`rounded-2xl px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] transition ${selectedCommand === command ? 'bg-nexus-primary text-white shadow-premium' : 'bg-white text-slate-900 shadow-soft'}`}
                                    >
                                        {command}
                                    </button>
                                ))}
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button onClick={() => setCommandTarget(null)} className="rounded-2xl bg-white/10 px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-primary">
                                    Cancel
                                </button>
                                <button onClick={() => void confirmCommand()} disabled={submittingCommand} className="rounded-2xl bg-white px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-900 shadow-soft disabled:opacity-60">
                                    {submittingCommand ? 'Sending...' : `Send ${selectedCommand}`}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
