import { useState, useRef } from 'react';
import { Copy, Check, Moon, Sun, Shield, Image as ImageIcon, Monitor, Upload, Trash2, AlertTriangle, MonitorPlay } from 'lucide-react';
import { useAuth } from '../../shared/hooks/useAuth';
import { useSettings } from '../../shared/contexts/SettingsContext';
import { ScreensaverConfig } from './ScreensaverConfig';

function CopyField({ label, value }: { label: string; value: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <div className="nexus-inset flex items-center justify-between gap-3" style={{ padding: '12px 16px' }}>
            <div>
                <div className="font-extrabold uppercase" style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                <div className="font-mono" style={{ fontSize: 12, color: 'var(--text-primary)', wordBreak: 'break-all' }}>{value}</div>
            </div>
            <button
                onClick={() => navigator.clipboard.writeText(value).then(() => {
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1200);
                })}
                className="btn-ghost"
                style={{ padding: '8px 10px', flexShrink: 0 }}
            >
                {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
        </div>
    );
}

export const SettingsPage = () => {
    const { user } = useAuth();
    const { settings, updateSettings } = useSettings();

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000/ws';

    return (
        <div className="page-shell animate-fade-in">
            <div>
                <h2 className="font-black tracking-tight" style={{ fontSize: 22, color: 'var(--text-primary)' }}>Settings</h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>UI preferences and deployment references.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* Profile */}
                <div className="nexus-card space-y-3" style={{ padding: '20px 24px' }}>
                    <h3 className="font-black" style={{ fontSize: 16, color: 'var(--text-primary)' }}>Operator Profile</h3>
                    <div className="nexus-inset" style={{ padding: '12px 16px' }}>
                        <div className="font-extrabold uppercase" style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 4 }}>Username</div>
                        <div className="font-bold" style={{ fontSize: 15, color: 'var(--text-primary)' }}>{user?.username}</div>
                    </div>
                    <div className="nexus-inset" style={{ padding: '12px 16px' }}>
                        <div className="font-extrabold uppercase" style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 4 }}>Role</div>
                        <div className="font-bold" style={{ fontSize: 15, color: 'var(--text-primary)' }}>{user?.role}</div>
                    </div>
                </div>

                {/* Theme */}
                <div className="nexus-card space-y-3" style={{ padding: '20px 24px' }}>
                    <h3 className="font-black" style={{ fontSize: 16, color: 'var(--text-primary)' }}>Appearance</h3>
                    <div className="flex gap-3">
                        <button onClick={() => updateSettings({ theme: 'dark' })}
                            className="flex-1 flex flex-col items-center gap-2 nexus-inset" 
                            style={{ padding: '16px', cursor: 'pointer', border: settings.theme === 'dark' ? '1px solid var(--nexus-primary)' : '1px solid transparent', borderRadius: 'var(--radius-lg)', background: settings.theme === 'dark' ? 'rgba(59,130,246,0.1)' : 'var(--bg-inset)' }}>
                            <Moon size={18} style={{ color: settings.theme === 'dark' ? 'var(--nexus-primary)' : 'var(--text-muted)' }} />
                            <span className="font-bold uppercase" style={{ fontSize: 11, letterSpacing: '0.12em', color: settings.theme === 'dark' ? 'var(--nexus-primary)' : 'var(--text-secondary)' }}>Dark</span>
                        </button>
                        <button onClick={() => updateSettings({ theme: 'light' })}
                            className="flex-1 flex flex-col items-center gap-2 nexus-inset"
                            style={{ padding: '16px', cursor: 'pointer', border: settings.theme === 'light' ? '1px solid var(--nexus-primary)' : '1px solid transparent', borderRadius: 'var(--radius-lg)', background: settings.theme === 'light' ? 'rgba(59,130,246,0.1)' : 'var(--bg-inset)' }}>
                            <Sun size={18} style={{ color: settings.theme === 'light' ? 'var(--nexus-primary)' : 'var(--text-muted)' }} />
                            <span className="font-bold uppercase" style={{ fontSize: 11, letterSpacing: '0.12em', color: settings.theme === 'light' ? 'var(--nexus-primary)' : 'var(--text-secondary)' }}>Light</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Screensaver Configuration */}
            <ScreensaverConfig />

            {/* Deployment refs */}
            <div className="nexus-card space-y-4" style={{ padding: '20px 24px' }}>
                <h3 className="font-black" style={{ fontSize: 16, color: 'var(--text-primary)' }}>Deployment References</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="nexus-inset" style={{ padding: '12px 16px' }}>
                        <div className="font-extrabold uppercase" style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 4 }}>MQTT Broker</div>
                        <div className="font-mono" style={{ fontSize: 12, color: 'var(--text-primary)' }}>{settings.mqttBroker}</div>
                    </div>
                    <div className="nexus-inset" style={{ padding: '12px 16px' }}>
                        <div className="font-extrabold uppercase" style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 4 }}>Pi-hole URL</div>
                        <div className="font-mono" style={{ fontSize: 12, color: 'var(--text-primary)', wordBreak: 'break-all' }}>{settings.piholeUrl}</div>
                    </div>
                    <div className="nexus-inset" style={{ padding: '12px 16px' }}>
                        <div className="font-extrabold uppercase" style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 4 }}>Node Label</div>
                        <div className="font-semibold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>{settings.nodeLabel}</div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <CopyField label="API URL" value={API_URL} />
                    <CopyField label="WS URL" value={WS_URL} />
                </div>
            </div>

            {/* Security */}
            <div className="nexus-card" style={{ padding: '20px 24px' }}>
                <div className="flex items-center gap-2 mb-3">
                    <Shield size={16} style={{ color: 'var(--nexus-warning)' }} />
                    <h3 className="font-black" style={{ fontSize: 14, color: 'var(--text-primary)' }}>Security</h3>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    JWT secrets and MQTT credentials are stored server-side only. This UI does not expose or transmit sensitive tokens. 
                    For production, change default passwords and enable MQTT authentication.
                </p>
            </div>

            <div className="nexus-card" style={{ padding: '20px 24px' }}>
                <h3 className="font-black mb-3" style={{ fontSize: 16, color: 'var(--text-primary)' }}>Build Info</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="nexus-inset" style={{ padding: '12px 16px' }}>
                        <div className="font-extrabold uppercase" style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 4 }}>Product</div>
                        <div className="font-bold" style={{ fontSize: 14, color: 'var(--text-primary)' }}>HomeCore Nexus</div>
                    </div>
                    <div className="nexus-inset" style={{ padding: '12px 16px' }}>
                        <div className="font-extrabold uppercase" style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 4 }}>Profile</div>
                        <div className="font-bold" style={{ fontSize: 14, color: 'var(--text-primary)' }}>Static frontend + local API</div>
                    </div>
                    <div className="nexus-inset" style={{ padding: '12px 16px' }}>
                        <div className="font-extrabold uppercase" style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 4 }}>Version</div>
                        <div className="font-bold" style={{ fontSize: 14, color: 'var(--text-primary)' }}>v1 foundation</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
