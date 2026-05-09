import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock3, Plus, Trash2 } from 'lucide-react';
import { apiService } from '../../shared/services/api.service';
import { useToast } from '../../shared/components/Toast';
import { getApiErrorMessage } from '../../shared/services/api-errors';
import { AutomationRule, DeviceCommand, ModuleDevice } from '../../shared/types';

function createDraft(devices: ModuleDevice[]): AutomationRule {
    return {
        id: `automation-${Date.now()}`, name: 'Automation Lite', device_id: devices[0]?.device_id || 'pc_relay_01',
        command: 'pulse', schedule: '0 8 * * *', enabled: true, description: 'Simple scheduled command',
        last_run: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
}

export default function AutomationBuilder() {
    const { showToast } = useToast();
    const [devices, setDevices] = useState<ModuleDevice[]>([]);
    const [automations, setAutomations] = useState<AutomationRule[]>([]);
    const [draft, setDraft] = useState<AutomationRule | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const load = async () => {
        try {
            setLoading(true);
            setErrorMessage(null);
            const [deviceData, automationData] = await Promise.all([apiService.getDevices(), apiService.getAutomations()]);
            setDevices(deviceData); setAutomations(automationData);
            setDraft((c) => c || createDraft(deviceData));
        } catch (error: unknown) {
            const message = getApiErrorMessage(error);
            setErrorMessage(message);
            showToast(message, 'error');
        }
        finally { setLoading(false); }
    };

    useEffect(() => { void load(); }, []);

    const selectedDevice = useMemo(() => devices.find((d) => d.device_id === draft?.device_id) || null, [devices, draft?.device_id]);

    const saveDraft = async () => {
        if (!draft) return;
        try {
            const saved = await apiService.saveAutomation(draft);
            if (saved) { showToast(`Saved ${saved.name}`, 'success'); await load(); setDraft(createDraft(devices)); }
        } catch (error: any) { showToast(error.message || 'Failed to save automation', 'error'); }
    };

    const removeAutomation = async (id: string) => {
        try { await apiService.deleteAutomation(id); showToast(`Deleted ${id}`, 'success'); await load(); }
        catch (error: any) { showToast(error.message || 'Failed to delete', 'error'); }
    };

    return (
        <div className="page-shell animate-fade-in">
            <div className="mb-6">
                <h2 className="font-black tracking-tight" style={{ fontSize: 24, color: 'var(--text-primary)' }}>Automation Center</h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                    Schedule recurring commands to automatically control your ESP8266 modules.
                </p>
            </div>

            {errorMessage && (
                <div className="nexus-inset flex items-center gap-3" style={{ padding: '12px 14px', border: '1px solid rgba(245, 158, 11, 0.18)' }}>
                    <AlertTriangle size={18} style={{ color: 'var(--nexus-warning)' }} />
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Automation endpoints are temporarily unavailable: {errorMessage}</div>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1fr] gap-4">
                {/* Create form */}
                <div className="nexus-card" style={{ padding: '20px 24px' }}>
                    <div className="flex items-center gap-2 mb-4">
                        <Clock3 size={16} style={{ color: 'var(--nexus-primary)' }} />
                        <div>
                            <h3 className="font-black" style={{ fontSize: 16, color: 'var(--text-primary)' }}>Create Schedule</h3>
                            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Example: 0 8 * * * runs daily at 08:00.</p>
                        </div>
                    </div>
                    {draft && (
                        <div className="space-y-3">
                            <label className="block">
                                <span className="font-extrabold uppercase" style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Name</span>
                                <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="input-glass w-full" placeholder="e.g. Daily Reboot" />
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className="block">
                                    <span className="font-extrabold uppercase" style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Module Target</span>
                                    <select value={draft.device_id} onChange={(e) => setDraft({ ...draft, device_id: e.target.value })} className="input-glass w-full text-sm">
                                        {devices.length === 0 && <option value="pc_relay_01">No modules available</option>}
                                        {devices.map((d) => <option key={d.device_id} value={d.device_id}>{d.name} ({d.device_id})</option>)}
                                    </select>
                                </label>
                                <label className="block">
                                    <span className="font-extrabold uppercase" style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Command Action</span>
                                    <select value={draft.command} onChange={(e) => setDraft({ ...draft, command: e.target.value as DeviceCommand })} className="input-glass w-full text-sm font-bold text-blue-400 uppercase">
                                        <option value="pulse">Pulse Power</option><option value="on">Turn ON</option><option value="off">Turn OFF</option>
                                    </select>
                                </label>
                            </div>
                            <label className="block">
                                <span className="font-extrabold uppercase" style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Cron schedule</span>
                                <input value={draft.schedule} onChange={(e) => setDraft({ ...draft, schedule: e.target.value })} className="input-glass w-full font-mono text-sm tracking-widest" placeholder="0 8 * * *" />
                                {draft.schedule.trim() === '' && <span className="text-[10px] text-red-400 mt-1 block">Schedule is required</span>}
                            </label>
                            <label className="block">
                                <span className="font-extrabold uppercase" style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Description (Optional)</span>
                                <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="input-glass w-full text-sm p-3" style={{ minHeight: 80 }} placeholder="What does this do?" />
                            </label>
                            <label className="flex items-center gap-3 p-3 mt-2 rounded-[var(--radius-md)] bg-[var(--bg-inset)] cursor-pointer select-none">
                                <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} className="rounded border-slate-700 bg-slate-800 text-blue-500 w-4 h-4 focus:ring-blue-500 focus:ring-offset-slate-900" />
                                <div>
                                    <div className="font-bold text-sm text-white">Enable Rule Immediately</div>
                                    <div className="text-xs text-slate-500">Active rules will run according to schedule</div>
                                </div>
                            </label>
                            <button onClick={() => void saveDraft()} disabled={devices.length === 0 || draft.schedule.trim() === ''} className="btn-premium w-full mt-4 justify-center py-3"><Plus size={16} /> Save Automation</button>
                        </div>
                    )}
                </div>

                {/* Saved rules */}
                <div className="nexus-card" style={{ padding: '20px 24px' }}>
                    <h3 className="font-black" style={{ fontSize: 16, color: 'var(--text-primary)' }}>Saved Rules</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, marginBottom: 16 }}>Source of truth: backend SQLite + cron scheduler.</p>
                    <div className="space-y-2">
                        {loading ? (
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading...</div>
                        ) : automations.length === 0 ? (
                            <div className="nexus-inset" style={{ padding: '16px', textAlign: 'center' }}>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No automations saved yet.</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>Create a lightweight schedule or leave this page as a foundation state.</div>
                            </div>
                        ) : automations.map((a) => (
                            <div key={a.id} className="nexus-inset" style={{ padding: '14px 16px' }}>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`status-dot ${a.enabled ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-slate-500'}`} />
                                            <div className="font-black text-[15px] text-white">{a.name}</div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3 mt-3">
                                            <div className="bg-white/5 rounded px-3 py-2">
                                                <div className="text-[9px] font-bold uppercase text-slate-500 mb-1 tracking-widest">Target</div>
                                                <div className="text-xs font-mono text-blue-400">{a.device_id}</div>
                                            </div>
                                            <div className="bg-white/5 rounded px-3 py-2">
                                                <div className="text-[9px] font-bold uppercase text-slate-500 mb-1 tracking-widest">Action</div>
                                                <div className="text-xs font-bold text-amber-400 uppercase">{a.command}</div>
                                            </div>
                                            <div className="col-span-2 bg-white/5 rounded px-3 py-2 flex items-center justify-between">
                                                <div>
                                                    <div className="text-[9px] font-bold uppercase text-slate-500 mb-1 tracking-widest">Schedule</div>
                                                    <div className="text-xs font-mono tracking-wider">{a.schedule}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => void removeAutomation(a.id)} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
