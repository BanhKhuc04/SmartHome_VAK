import { useEffect, useState } from 'react';
import { Copy, Check, Database, ExternalLink, Network, Radio, RefreshCcw, Server, Wifi, AlertTriangle, Activity, Cpu, HardDrive, Send } from 'lucide-react';
import { apiService } from '../../shared/services/api.service';
import { useWebSocket } from '../../shared/hooks/useWebSocket';
import { getApiErrorMessage } from '../../shared/services/api-errors';
import { SystemHealth, DiagnosticResult } from '../../shared/types';

function formatUptime(s: number): string {
    const d = Math.floor(s / 86400); const h = Math.floor((s % 86400) / 3600); const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

function CopyVal({ label, value }: { label: string; value: string }) {
    const [copied, setCopied] = useState(false);
    const copy = () => { navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); };
    return (
        <div className="nexus-inset flex items-center justify-between gap-2" style={{ padding: '10px 14px' }}>
            <div>
                <div className="font-extrabold uppercase" style={{ fontSize: 8, letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                <div className="font-mono" style={{ fontSize: 12, color: 'var(--text-primary)', wordBreak: 'break-all' }}>{value}</div>
            </div>
            <button onClick={copy} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }} title="Copy">
                {copied ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
            </button>
        </div>
    );
}

export default function SystemPage() {
    const [health, setHealth] = useState<SystemHealth | null>(null);
    const [loading, setLoading] = useState(true);
    const [runningDiagnostics, setRunningDiagnostics] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);

    const handleTestTelegram = async () => {
        try {
            setLoading(true);
            const res = await apiService.testTelegram();
            if (res) {
                alert('Test notification sent successfully!');
            }
        } catch (error) {
            alert('Failed to send test notification: ' + getApiErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const handleRunDiagnostics = async () => {
        try {
            setRunningDiagnostics(true);
            const result = await apiService.runDiagnostics();
            setDiagnosticResult(result);
            if (result?.warnings?.length) {
                // Could toast here
            }
        } catch (error) {
            alert('Failed to run diagnostics: ' + getApiErrorMessage(error));
        } finally {
            setRunningDiagnostics(false);
        }
    };

    const loadHealth = async () => {
        try {
            setLoading(true);
            setErrorMessage(null);
            const result = await apiService.getSystemHealth();
            setHealth(result);
        } catch (error: unknown) {
            setHealth(null);
            setErrorMessage(getApiErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void loadHealth(); }, []);

    useWebSocket((message) => { if (message.type === 'system_health') setHealth(message.payload as SystemHealth); });

    if (loading && !health) {
        return (
            <div className="nexus-card flex flex-col items-center justify-center animate-fade-in" style={{ padding: '48px 24px' }}>
                <Server size={32} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                <div className="font-bold" style={{ fontSize: 15, color: 'var(--text-secondary)' }}>Loading system health...</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Waiting for backend response.</div>
            </div>
        );
    }

    if (!health) {
        return (
            <div className="nexus-card error-state animate-fade-in">
                <AlertTriangle size={28} style={{ color: 'var(--nexus-warning)' }} />
                <div className="font-bold" style={{ fontSize: 15, color: 'var(--text-primary)' }}>System diagnostics unavailable</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{errorMessage || 'Unable to reach backend health endpoint.'}</div>
                <button onClick={() => void loadHealth()} className="btn-premium"><RefreshCcw size={14} /> Retry</button>
            </div>
        );
    }

    const cards = [
        { label: 'Backend API', value: health.status === 'healthy' ? 'Healthy' : 'Degraded', icon: Server, ok: health.status === 'healthy' },
        { label: 'MQTT Broker', value: health.mqtt.connected ? 'Connected' : 'Disconnected', icon: Radio, ok: health.mqtt.connected },
        { label: 'WebSocket', value: `${health.websocket.clients} Active`, icon: Wifi, ok: true },
        { label: 'SQLite DB', value: health.sqlite.connected ? 'Ready' : 'Offline', icon: Database, ok: health.sqlite.connected },
        { label: 'Host Uptime', value: formatUptime(health.host.uptime_seconds), icon: Activity, ok: true },
    ];

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000/ws';

    return (
        <div className="page-shell animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h2 className="font-black tracking-tight" style={{ fontSize: 24, color: 'var(--text-primary)' }}>System Status</h2>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Orange Pi health, MQTT broker metrics, SQLite, and network services.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleRunDiagnostics} disabled={runningDiagnostics} className="btn-ghost">
                        <Activity size={16} className={runningDiagnostics ? 'animate-spin' : ''} /> {runningDiagnostics ? 'Running...' : 'Run Diagnostics'}
                    </button>
                    <button onClick={() => void loadHealth()} className="btn-premium">
                        <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} /> {loading ? 'Refreshing...' : 'Refresh Status'}
                    </button>
                </div>
            </div>

            {errorMessage && (
                <div className="nexus-inset flex items-center justify-between gap-3" style={{ padding: '12px 14px', border: '1px solid rgba(245, 158, 11, 0.18)' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Showing last known health snapshot. Latest refresh error: {errorMessage}</div>
                    <button onClick={() => void loadHealth()} className="btn-ghost" style={{ flexShrink: 0 }}><RefreshCcw size={14} /> Retry</button>
                </div>
            )}

            <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
                {cards.map((c) => (
                    <div key={c.label} className="nexus-card" style={{ padding: '16px 20px' }}>
                        <div className="flex items-center justify-between mb-3">
                            <c.icon size={18} style={{ color: c.ok ? '#10b981' : '#f59e0b' }} />
                            <span className="font-extrabold uppercase" style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--text-muted)' }}>{c.label}</span>
                        </div>
                        <div className="font-black" style={{ fontSize: 16, color: 'var(--text-primary)' }}>{c.value}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-4">
                <div className="nexus-card space-y-5" style={{ padding: '24px 28px' }}>
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                        <Cpu size={20} style={{ color: 'var(--nexus-primary)' }} />
                        <h3 className="font-black text-lg text-white">Host Runtime Metrics</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="nexus-inset" style={{ padding: '12px 16px' }}>
                            <div className="font-extrabold uppercase text-[9px] tracking-[0.15em] text-slate-500 mb-2">Host Identity</div>
                            <div className="font-bold text-sm text-white">{health.host.hostname} <span className="text-slate-400">({health.host.arch})</span></div>
                        </div>
                        <div className="nexus-inset" style={{ padding: '12px 16px' }}>
                            <div className="font-extrabold uppercase text-[9px] tracking-[0.15em] text-slate-500 mb-2">OS Platform</div>
                            <div className="font-bold text-sm text-white">{health.host.platform}</div>
                        </div>
                        <div className="nexus-inset" style={{ padding: '12px 16px' }}>
                            <div className="font-extrabold uppercase text-[9px] tracking-[0.15em] text-slate-500 mb-2">Memory Usage</div>
                            <div className="font-bold text-sm text-white flex justify-between">
                                <span>Free: {(health.host.free_memory_bytes / 1024 / 1024).toFixed(0)} MB</span>
                                <span className="text-slate-500">/ Total: {(health.host.total_memory_bytes / 1024 / 1024).toFixed(0)} MB</span>
                            </div>
                        </div>
                        <div className="nexus-inset" style={{ padding: '12px 16px' }}>
                            <div className="font-extrabold uppercase text-[9px] tracking-[0.15em] text-slate-500 mb-2">Database Path</div>
                            <div className="font-mono text-xs text-blue-400 truncate" title={health.sqlite.path}>{health.sqlite.path}</div>
                        </div>
                    </div>
                    
                    <div className="pt-2 border-t border-white/5">
                        <div className="flex items-center gap-2 font-extrabold uppercase mb-3 text-[10px] tracking-widest text-slate-500">
                            <Radio size={12} /> Active MQTT Subscriptions
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {health.mqtt.subscriptions.map((s) => (
                                <div key={s} className="nexus-inset font-mono flex items-center before:content-[''] before:w-1.5 before:h-1.5 before:bg-blue-500 before:rounded-full before:mr-2" style={{ padding: '8px 12px', fontSize: 11, color: 'var(--text-primary)' }}>{s}</div>
                            ))}
                        </div>
                    </div>

                    {/* Diagnostic Result Section */}
                    {diagnosticResult && (
                        <div className="pt-4 border-t border-white/5 animate-fade-in">
                            <h4 className="font-black text-sm text-white mb-3">Latest Diagnostic Report</h4>
                            <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4">
                                <div className="text-xs text-slate-400 mb-2">Ran at: {new Date(diagnosticResult.timestamp).toLocaleString()}</div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                                    <div className={`text-xs font-bold px-2 py-1 rounded ${diagnosticResult.services.api ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>API: {diagnosticResult.services.api ? 'OK' : 'FAIL'}</div>
                                    <div className={`text-xs font-bold px-2 py-1 rounded ${diagnosticResult.services.mqtt ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>MQTT: {diagnosticResult.services.mqtt ? 'OK' : 'FAIL'}</div>
                                    <div className={`text-xs font-bold px-2 py-1 rounded ${diagnosticResult.services.database ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>DB: {diagnosticResult.services.database ? 'OK' : 'FAIL'}</div>
                                    <div className="text-xs font-bold px-2 py-1 rounded bg-blue-500/10 text-blue-400">DB Latency: {diagnosticResult.latency.db_query_ms}ms</div>
                                </div>

                                {diagnosticResult.warnings.length > 0 && (
                                    <div className="space-y-2 mb-3">
                                        <div className="text-xs font-bold text-red-400">Warnings:</div>
                                        <ul className="list-disc pl-4 text-xs text-slate-300 space-y-1">
                                            {diagnosticResult.warnings.map((w, i) => <li key={i}>{w}</li>)}
                                        </ul>
                                    </div>
                                )}
                                {diagnosticResult.recommendations.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="text-xs font-bold text-blue-400">Recommendations:</div>
                                        <ul className="list-disc pl-4 text-xs text-slate-300 space-y-1">
                                            {diagnosticResult.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                                        </ul>
                                    </div>
                                )}
                                {diagnosticResult.warnings.length === 0 && (
                                    <div className="text-sm font-bold text-green-400 flex items-center gap-2">
                                        <Check size={14} /> System is running optimally. No issues found.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    {/* Pi-hole */}
                    <div className="nexus-card" style={{ padding: '20px 24px' }}>
                        <div className="flex items-center gap-2 mb-3">
                            <Network size={18} style={{ color: 'var(--nexus-primary)' }} />
                            <span className="font-extrabold uppercase" style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--text-muted)' }}>Pi-hole</span>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>Native Pi-hole on local network.</p>
                        <a href={health.pihole_url} target="_blank" rel="noreferrer" className="btn-ghost justify-center w-full">
                            Open Pi-hole <ExternalLink size={13} />
                        </a>
                    </div>
                    
                    {/* Telegram Notifications */}
                    <div className="nexus-card" style={{ padding: '20px 24px' }}>
                        <div className="flex items-center gap-2 mb-3">
                            <Send size={18} style={{ color: health.telegram.configured ? '#0088cc' : 'var(--text-muted)' }} />
                            <span className="font-extrabold uppercase" style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--text-muted)' }}>Telegram Notifications</span>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Status:</span>
                                <span className={`status-chip !py-0.5 !px-2 ${health.telegram.enabled ? '!bg-green-500/10 !text-green-400' : '!bg-red-500/10 !text-red-400'}`} style={{ fontSize: 10 }}>
                                    {health.telegram.enabled ? 'Enabled' : 'Disabled'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Config:</span>
                                <span style={{ fontSize: 12, color: health.telegram.configured ? 'var(--text-primary)' : 'var(--nexus-warning)', fontWeight: 600 }}>
                                    {health.telegram.configured ? 'Configured' : 'Missing Env'}
                                </span>
                            </div>
                            {health.telegram.configured && (
                                <div className="space-y-2 mt-2 pt-2 border-t border-white/5">
                                    <div className="flex items-center justify-between">
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Bot:</span>
                                        <code style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{health.telegram.bot_token_prefix}</code>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Chat:</span>
                                        <code style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{health.telegram.chat_id_masked}</code>
                                    </div>
                                </div>
                            )}
                            <button 
                                onClick={handleTestTelegram} 
                                disabled={loading || !health.telegram.configured} 
                                className="btn-ghost justify-center w-full mt-2"
                                style={{ border: '1px solid var(--border-primary)', opacity: health.telegram.configured ? 1 : 0.5 }}
                            >
                                <Send size={13} /> {loading ? 'Sending...' : 'Send Test Notification'}
                            </button>
                        </div>
                    </div>

                    {/* Copyable values */}
                    <div className="nexus-card space-y-2" style={{ padding: '20px 24px' }}>
                        <h3 className="font-black mb-3" style={{ fontSize: 14, color: 'var(--text-primary)' }}>Quick Copy</h3>
                        <CopyVal label="MQTT Broker" value={health.mqtt.broker_url} />
                        <CopyVal label="Topic Root" value={health.mqtt.topic_root} />
                        <CopyVal label="API Base URL" value={API_URL} />
                        <CopyVal label="WS URL" value={WS_URL} />
                        <CopyVal label="DB Path" value={health.sqlite.path} />
                    </div>
                </div>
            </div>
        </div>
    );
}
