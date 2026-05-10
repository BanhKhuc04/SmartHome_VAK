import { useEffect, useState } from 'react';
import { AlertTriangle, Plus, Trash2, Play, Settings2, Activity } from 'lucide-react';
import { apiService } from '../../shared/services/api.service';
import { useToast } from '../../shared/components/Toast';
import { getApiErrorMessage } from '../../shared/services/api-errors';
import { AutomationRule, AutomationRun, ModuleDevice } from '../../shared/types';
import { RuleEditorModal } from './components/RuleEditorModal';
import { RecentRunsPanel } from './components/RecentRunsPanel';
import { useWebSocket } from '../../shared/hooks/useWebSocket';

export default function AutomationBuilder() {
    const { showToast } = useToast();
    const { lastMessage } = useWebSocket();
    const [devices, setDevices] = useState<ModuleDevice[]>([]);
    const [rules, setRules] = useState<AutomationRule[]>([]);
    const [runs, setRuns] = useState<AutomationRun[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    
    // Editor State
    const [editingRule, setEditingRule] = useState<Partial<AutomationRule> | null>(null);

    const loadData = async () => {
        try {
            setLoading(true);
            setErrorMessage(null);
            const [deviceData, rulesData, runsData] = await Promise.all([
                apiService.getDevices(),
                apiService.getAutomations(),
                apiService.getAutomationRuns(undefined, 50)
            ]);
            setDevices(deviceData);
            setRules(rulesData);
            setRuns(runsData);
        } catch (error: unknown) {
            const message = getApiErrorMessage(error);
            setErrorMessage(message);
            showToast(message, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void loadData(); }, []);

    // WebSocket Integration for Runs
    useEffect(() => {
        if (lastMessage?.type === 'automation_run') {
            const newRun = lastMessage.payload as AutomationRun;
            setRuns(prev => [newRun, ...prev].slice(0, 50));
            // Reload rules to update last_result and last_triggered_at
            void apiService.getAutomations().then(setRules);
        }
    }, [lastMessage]);

    const handleSaveRule = async (rule: Partial<AutomationRule>) => {
        try {
            await apiService.saveAutomation(rule);
            showToast('Rule saved successfully', 'success');
            setEditingRule(null);
            await loadData();
        } catch (error: any) {
            showToast(error.message || 'Failed to save rule', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this rule?')) return;
        try {
            await apiService.deleteAutomation(id);
            showToast('Rule deleted', 'success');
            await loadData();
        } catch (error: any) {
            showToast(error.message || 'Failed to delete', 'error');
        }
    };

    const handleToggle = async (id: string, enabled: boolean) => {
        try {
            await apiService.toggleAutomation(id, enabled);
            setRules(rules.map(r => r.id === id ? { ...r, enabled } : r));
        } catch (error: any) {
            showToast(error.message || 'Failed to toggle rule', 'error');
        }
    };

    const handleManualRun = async (id: string) => {
        try {
            await apiService.runAutomation(id);
            showToast('Rule executed manually', 'success');
            // The WS will push the new run state soon
        } catch (error: any) {
            showToast(error.message || 'Failed to run rule', 'error');
        }
    };

    return (
        <div className="page-shell animate-fade-in">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="font-black tracking-tight" style={{ fontSize: 24, color: 'var(--text-primary)' }}>Smart Rules</h2>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                        Create intelligent automations based on telemetry, schedules, and device status.
                    </p>
                </div>
                <button onClick={() => setEditingRule({})} className="btn-premium flex items-center gap-2 px-4 py-2">
                    <Plus size={16} /> New Rule
                </button>
            </div>

            {errorMessage && (
                <div className="nexus-inset flex items-center gap-3 mb-6 p-4 border border-amber-500/20">
                    <AlertTriangle size={18} className="text-amber-500" />
                    <div className="text-sm text-[var(--text-secondary)]">Rules Engine Unavailable: {errorMessage}</div>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-6">
                {/* Rules List */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="text-[var(--text-muted)] p-4 text-sm animate-pulse">Loading rules...</div>
                    ) : rules.length === 0 ? (
                        <div className="nexus-inset p-8 text-center border border-dashed border-white/10">
                            <Settings2 size={32} className="mx-auto text-[var(--text-muted)] mb-3" />
                            <div className="text-sm text-[var(--text-secondary)]">No Smart Rules configured yet.</div>
                        </div>
                    ) : rules.map(rule => (
                        <div key={rule.id} className="nexus-card p-5 group transition-all duration-300 hover:border-blue-500/30">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3 flex-1">
                                    <div className="pt-1">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={rule.enabled} onChange={e => handleToggle(rule.id, e.target.checked)} />
                                            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                                        </label>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-black text-[15px] text-white">{rule.name}</h3>
                                            <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-white/5 text-slate-400">
                                                {rule.trigger_type}
                                            </span>
                                        </div>
                                        <p className="text-xs text-[var(--text-secondary)] mb-3">{rule.description || 'No description'}</p>
                                        
                                        <div className="flex items-center gap-4 text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)]">
                                            <div className="flex items-center gap-1">
                                                <Activity size={12} />
                                                <span>{rule.last_result || 'Never Run'}</span>
                                            </div>
                                            {rule.last_triggered_at && (
                                                <span>{new Date(rule.last_triggered_at).toLocaleString()}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleManualRun(rule.id)} title="Run Now" className="p-2 text-green-400 hover:bg-green-400/10 rounded"><Play size={16} /></button>
                                    <button onClick={() => setEditingRule(rule)} title="Edit" className="p-2 text-blue-400 hover:bg-blue-400/10 rounded"><Settings2 size={16} /></button>
                                    <button onClick={() => handleDelete(rule.id)} title="Delete" className="p-2 text-red-500 hover:bg-red-500/10 rounded"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Runs History */}
                <div className="nexus-card p-5 h-fit sticky top-6">
                    <h3 className="font-black text-sm text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Activity size={16} className="text-blue-500" />
                        Recent Runs
                    </h3>
                    <RecentRunsPanel runs={runs} loading={loading} />
                </div>
            </div>

            {/* Editor Modal */}
            {editingRule && (
                <RuleEditorModal 
                    rule={editingRule} 
                    devices={devices} 
                    onSave={handleSaveRule} 
                    onClose={() => setEditingRule(null)} 
                />
            )}
        </div>
    );
}
