import { useEffect, useMemo, useState } from 'react';
import { Clock3, Plus, Trash2 } from 'lucide-react';
import { apiService } from '../../shared/services/api.service';
import { useToast } from '../../shared/components/Toast';
import { AutomationRule, DeviceCommand, ModuleDevice } from '../../shared/types';

function createDraft(devices: ModuleDevice[]): AutomationRule {
    return {
        id: `automation-${Date.now()}`,
        name: 'Automation Lite',
        device_id: devices[0]?.device_id || 'pc_relay_01',
        command: 'pulse',
        schedule: '0 8 * * *',
        enabled: true,
        description: 'Simple scheduled command',
        last_run: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
}

export default function AutomationBuilder() {
    const { showToast } = useToast();
    const [devices, setDevices] = useState<ModuleDevice[]>([]);
    const [automations, setAutomations] = useState<AutomationRule[]>([]);
    const [draft, setDraft] = useState<AutomationRule | null>(null);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        try {
            setLoading(true);
            const [deviceData, automationData] = await Promise.all([
                apiService.getDevices(),
                apiService.getAutomations(),
            ]);
            setDevices(deviceData);
            setAutomations(automationData);
            setDraft((current) => current || createDraft(deviceData));
        } catch (error: any) {
            showToast(error.message || 'Failed to load automations', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, []);

    const selectedDevice = useMemo(() => devices.find((device) => device.device_id === draft?.device_id) || null, [devices, draft?.device_id]);

    const saveDraft = async () => {
        if (!draft) return;
        try {
            const saved = await apiService.saveAutomation(draft);
            if (saved) {
                showToast(`Saved ${saved.name}`, 'success');
                await load();
                setDraft(createDraft(devices));
            }
        } catch (error: any) {
            showToast(error.message || 'Failed to save automation', 'error');
        }
    };

    const removeAutomation = async (id: string) => {
        try {
            await apiService.deleteAutomation(id);
            showToast(`Deleted ${id}`, 'success');
            await load();
        } catch (error: any) {
            showToast(error.message || 'Failed to delete automation', 'error');
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h2 className="text-3xl font-black tracking-tight text-primary">Automation Lite</h2>
                <p className="text-secondary mt-2">
                    v1 chỉ hỗ trợ schedule đơn giản: chọn module, raw command `pulse/on/off`, và cron expression. Không dùng visual builder fake API.
                </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1fr] gap-6">
                <div className="nexus-card p-8 space-y-5">
                    <div className="flex items-center gap-3">
                        <Clock3 size={18} className="text-nexus-primary" />
                        <div>
                            <h3 className="text-xl font-black text-primary">Create Schedule</h3>
                            <p className="text-sm text-secondary mt-2">Example: `0 8 * * *` to run every day at 08:00.</p>
                        </div>
                    </div>

                    {draft && (
                        <>
                            <label className="block">
                                <span className="text-[10px] uppercase font-black tracking-[0.2em] text-muted">Automation name</span>
                                <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="input-glass w-full mt-2" />
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className="block">
                                    <span className="text-[10px] uppercase font-black tracking-[0.2em] text-muted">Module</span>
                                    <select value={draft.device_id} onChange={(event) => setDraft({ ...draft, device_id: event.target.value })} className="input-glass w-full mt-2">
                                        {devices.map((device) => <option key={device.device_id} value={device.device_id}>{device.name}</option>)}
                                    </select>
                                </label>
                                <label className="block">
                                    <span className="text-[10px] uppercase font-black tracking-[0.2em] text-muted">Command</span>
                                    <select value={draft.command} onChange={(event) => setDraft({ ...draft, command: event.target.value as DeviceCommand })} className="input-glass w-full mt-2">
                                        <option value="pulse">pulse</option>
                                        <option value="on">on</option>
                                        <option value="off">off</option>
                                    </select>
                                </label>
                            </div>
                            <label className="block">
                                <span className="text-[10px] uppercase font-black tracking-[0.2em] text-muted">Cron schedule</span>
                                <input value={draft.schedule} onChange={(event) => setDraft({ ...draft, schedule: event.target.value })} className="input-glass w-full mt-2 font-mono" />
                            </label>
                            <label className="block">
                                <span className="text-[10px] uppercase font-black tracking-[0.2em] text-muted">Description</span>
                                <textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="w-full mt-2 min-h-[120px] rounded-3xl border border-white/10 bg-white/10 px-4 py-4 outline-none" />
                            </label>
                            <label className="inline-flex items-center gap-3">
                                <input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} />
                                <span className="text-sm text-primary font-semibold">Enabled immediately</span>
                            </label>
                            <button onClick={() => void saveDraft()} className="btn-premium">
                                <Plus size={16} />
                                Save Automation
                            </button>
                        </>
                    )}
                </div>

                <div className="nexus-card p-8">
                    <h3 className="text-xl font-black text-primary">Saved Rules</h3>
                    <p className="text-sm text-secondary mt-2">Source of truth is backend SQLite + cron scheduler.</p>
                    <div className="space-y-3 mt-6">
                        {loading ? (
                            <div className="text-sm text-secondary">Loading automations...</div>
                        ) : automations.length === 0 ? (
                            <div className="rounded-3xl bg-black/5 px-5 py-5 text-sm text-secondary">No automation saved yet.</div>
                        ) : automations.map((automation) => (
                            <div key={automation.id} className="rounded-3xl bg-black/5 px-5 py-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="text-lg font-black text-primary">{automation.name}</div>
                                        <div className="text-xs text-secondary mt-2">{automation.device_id} • {automation.command} • {automation.schedule}</div>
                                        {selectedDevice && automation.device_id === selectedDevice.device_id && (
                                            <div className="text-xs text-secondary mt-2">Topic: {selectedDevice.cmd_topic}</div>
                                        )}
                                    </div>
                                    <button onClick={() => void removeAutomation(automation.id)} className="text-rose-300">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
