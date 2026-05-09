import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCcw, Search } from 'lucide-react';
import { apiService } from '../../shared/services/api.service';
import { useToast } from '../../shared/components/Toast';
import { getApiErrorMessage } from '../../shared/services/api-errors';
import { useWebSocket } from '../../shared/hooks/useWebSocket';
import { AuditLogCategory, AuditLogEntry } from '../../shared/types';

export const LogsPage = () => {
    const { showToast } = useToast();
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | AuditLogCategory>('all');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const loadLogs = async () => {
        try {
            setLoading(true);
            setErrorMessage(null);
            const data = await apiService.getLogs({ limit: 200, category: filter === 'all' ? undefined : filter });
            setLogs(data);
        }
        catch (error: unknown) {
            const message = getApiErrorMessage(error);
            setErrorMessage(message);
            showToast(message, 'error');
        }
        finally { setLoading(false); }
    };

    useEffect(() => { void loadLogs(); }, [filter]);

    useWebSocket((message) => {
        if (message.type === 'audit_log') {
            const payload = message.payload as AuditLogEntry;
            setLogs((current) => [payload, ...current].slice(0, 250));
        }
    });

    const filtered = useMemo(() => logs.filter((log) => {
        const matchesFilter = filter === 'all' || log.category === filter;
        const term = search.toLowerCase();
        const haystack = `${log.category} ${log.action} ${log.message} ${log.device_id || ''} ${log.actor || ''}`.toLowerCase();
        return matchesFilter && haystack.includes(term);
    }), [logs, filter, search]);

    return (
        <div className="page-shell animate-fade-in">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h2 className="font-black tracking-tight" style={{ fontSize: 24, color: 'var(--text-primary)' }}>System Audit Logs</h2>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Real-time event stream from auth, commands, device state, MQTT, and system internals.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative min-w-[220px]">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search event logs..." className="input-glass pl-9 w-full" />
                    </div>
                    <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="input-glass" style={{ minWidth: 150 }}>
                        <option value="all">All Categories</option>
                        <option value="auth">Auth</option>
                        <option value="command">Command</option>
                        <option value="device_update">Device Update</option>
                        <option value="mqtt_event">MQTT Event</option>
                        <option value="automation">Automation</option>
                        <option value="system">System</option>
                    </select>
                    <button onClick={() => void loadLogs()} className="btn-premium justify-center" style={{ minWidth: 120 }}>
                        <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} /> {loading ? 'Loading...' : 'Refresh'}
                    </button>
                </div>
            </div>

            <div className="nexus-card overflow-hidden">
                {loading ? (
                    <div className="empty-state">
                        <div className="font-bold" style={{ fontSize: 15, color: 'var(--text-secondary)' }}>Loading logs...</div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Fetching recent audit events from backend.</div>
                    </div>
                ) : errorMessage ? (
                    <div className="error-state">
                        <AlertTriangle size={28} style={{ color: 'var(--nexus-warning)' }} />
                        <div className="font-bold" style={{ fontSize: 15, color: 'var(--text-primary)' }}>Unable to load logs</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{errorMessage}</div>
                        <button onClick={() => void loadLogs()} className="btn-premium">Retry</button>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state">
                        <div className="font-bold" style={{ fontSize: 15, color: 'var(--text-secondary)' }}>No logs found</div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Events will appear here as they occur.</div>
                    </div>
                ) : (
                    <>
                    <div className="hidden md:block overflow-x-auto p-2">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5">
                                    {['Time', 'Category', 'Device', 'Message', 'Actor'].map((h) => (
                                        <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((log) => (
                                    <tr key={log.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{new Date(log.created_at).toLocaleString('vi-VN')}</td>
                                        <td className="px-4 py-3 whitespace-nowrap"><span className={`cat-badge ${log.category}`}>{log.category}</span></td>
                                        <td className="px-4 py-3 whitespace-nowrap font-mono text-blue-400" style={{ fontSize: 12 }}>{log.device_id || '—'}</td>
                                        <td className="px-4 py-3 font-semibold text-white" style={{ fontSize: 13, lineHeight: 1.4 }}>{log.message}</td>
                                        <td className="px-4 py-3 whitespace-nowrap" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{log.actor || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="md:hidden space-y-2 p-4">
                        {filtered.map((log) => (
                            <div key={log.id} className="nexus-inset" style={{ padding: '12px 14px' }}>
                                <div className="flex items-center justify-between gap-2">
                                    <span className={`cat-badge ${log.category}`}>{log.category}</span>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(log.created_at).toLocaleTimeString()}</span>
                                </div>
                                <div className="font-semibold mt-2" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{log.message}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>{log.device_id || 'No device'} • {log.actor || 'system'}</div>
                            </div>
                        ))}
                    </div>
                    </>
                )}
            </div>
        </div>
    );
};
