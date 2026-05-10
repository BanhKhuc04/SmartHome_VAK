import React, { useEffect, useState } from 'react';
import { apiService } from '../../shared/services/api.service';
import { AutomationRule, AutomationRun } from '../../shared/types';
import { Activity, Settings2, PlayCircle, AlertCircle } from 'lucide-react';

export default function AutomationSnapshot() {
    const [rules, setRules] = useState<AutomationRule[]>([]);
    const [recentRuns, setRecentRuns] = useState<AutomationRun[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [rulesData, runsData] = await Promise.all([
                    apiService.getAutomations(),
                    apiService.getAutomationRuns(undefined, 20)
                ]);
                setRules(rulesData);
                setRecentRuns(runsData);
            } catch (error) {
                console.error("Failed to load automation stats", error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const enabledRulesCount = rules.filter(r => r.enabled).length;
    const failedRunsCount = recentRuns.filter(r => r.status === 'failed').length;
    const lastRun = recentRuns[0];

    return (
        <div className="flex flex-col h-full">
            <h3 className="font-black text-sm uppercase tracking-widest text-blue-400 mb-4 flex items-center gap-2">
                <Settings2 size={16} /> Automation Engine
            </h3>
            
            {loading ? (
                <div className="text-[var(--text-muted)] animate-pulse text-sm">Loading...</div>
            ) : (
                <div className="flex-1 grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-xl p-4 flex flex-col justify-center border border-white/5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Total Rules</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-white">{rules.length}</span>
                            <span className="text-xs text-blue-400 font-bold">{enabledRulesCount} Active</span>
                        </div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 flex flex-col justify-center border border-white/5 relative overflow-hidden">
                        {failedRunsCount > 0 && (
                            <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-bl-full blur-xl" />
                        )}
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Failed Runs (Last 20)</span>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-3xl font-black ${failedRunsCount > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                {failedRunsCount}
                            </span>
                            {failedRunsCount > 0 && <AlertCircle size={14} className="text-red-400" />}
                        </div>
                    </div>

                    <div className="col-span-2 bg-white/5 rounded-xl p-4 border border-white/5 flex items-center justify-between">
                        <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Last Run Status</span>
                            <div className="flex items-center gap-2">
                                {lastRun ? (
                                    <>
                                        {lastRun.status === 'success' && <Activity size={14} className="text-green-400" />}
                                        {lastRun.status === 'failed' && <AlertCircle size={14} className="text-red-400" />}
                                        {lastRun.status === 'skipped' && <PlayCircle size={14} className="text-amber-400" />}
                                        <span className="text-sm font-bold text-white uppercase">{lastRun.status}</span>
                                    </>
                                ) : (
                                    <span className="text-sm font-bold text-[var(--text-muted)] uppercase">No runs yet</span>
                                )}
                            </div>
                        </div>
                        {lastRun && (
                            <div className="text-right">
                                <span className="text-[10px] text-slate-400 block">{new Date(lastRun.created_at).toLocaleTimeString()}</span>
                                <span className="text-[10px] font-mono text-blue-400">{lastRun.rule_id}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
