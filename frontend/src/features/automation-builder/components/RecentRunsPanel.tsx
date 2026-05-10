import React from 'react';
import { AutomationRun } from '../../../shared/types';
import { Activity, CheckCircle2, XCircle, SkipForward } from 'lucide-react';

interface Props {
    runs: AutomationRun[];
    loading: boolean;
}

export function RecentRunsPanel({ runs, loading }: Props) {
    if (loading) {
        return <div className="text-sm text-[var(--text-muted)] animate-pulse p-4">Loading runs...</div>;
    }

    if (runs.length === 0) {
        return (
            <div className="nexus-inset p-4 text-center">
                <div className="text-sm text-[var(--text-muted)]">No recent automation runs.</div>
            </div>
        );
    }

    return (
        <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
            {runs.map((run) => (
                <div key={run.id} className="nexus-inset p-3">
                    <div className="flex items-start gap-3">
                        {run.status === 'success' && <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />}
                        {run.status === 'failed' && <XCircle size={16} className="text-red-500 mt-0.5 shrink-0" />}
                        {run.status === 'skipped' && <SkipForward size={16} className="text-amber-500 mt-0.5 shrink-0" />}
                        
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-white truncate">{run.rule_id}</span>
                                <span className="text-[10px] text-[var(--text-muted)] shrink-0 ml-2">
                                    {new Date(run.created_at).toLocaleTimeString()}
                                </span>
                            </div>
                            <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                {run.message}
                            </div>
                            {run.status === 'success' && run.action_result && (
                                <div className="mt-2 bg-black/20 rounded p-2 text-[10px] font-mono text-blue-400 overflow-x-auto">
                                    {JSON.stringify(run.action_result, null, 2)}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
