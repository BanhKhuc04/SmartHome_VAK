import { Moon, Sun } from 'lucide-react';
import { useAuth } from '../../shared/hooks/useAuth';
import { useSettings } from '../../shared/contexts/SettingsContext';

export const SettingsPage = () => {
    const { user } = useAuth();
    const { settings, updateSettings } = useSettings();

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
            <div>
                <h2 className="text-3xl font-black tracking-tight text-primary">Settings</h2>
                <p className="text-secondary mt-2">Local UI preferences and deployment references for Orange Pi + native services.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-6">
                <div className="nexus-card p-8 space-y-5">
                    <h3 className="text-xl font-black text-primary">Operator Profile</h3>
                    <div className="rounded-3xl bg-black/5 px-5 py-5">
                        <div className="text-[10px] uppercase font-black tracking-[0.2em] text-muted mb-2">Username</div>
                        <div className="text-lg font-black text-primary">{user?.username}</div>
                    </div>
                    <div className="rounded-3xl bg-black/5 px-5 py-5">
                        <div className="text-[10px] uppercase font-black tracking-[0.2em] text-muted mb-2">Role</div>
                        <div className="text-lg font-black text-primary">{user?.role}</div>
                    </div>
                </div>

                <div className="nexus-card p-8 space-y-5">
                    <h3 className="text-xl font-black text-primary">Appearance</h3>
                    <div className="flex gap-3">
                        <button
                            onClick={() => updateSettings({ theme: 'dark' })}
                            className={`flex-1 rounded-3xl px-5 py-5 border ${settings.theme === 'dark' ? 'bg-nexus-primary text-white border-nexus-primary' : 'bg-white/10 text-primary border-white/10'}`}
                        >
                            <Moon size={18} className="mx-auto mb-3" />
                            <div className="text-[11px] uppercase font-black tracking-[0.18em]">Dark</div>
                        </button>
                        <button
                            onClick={() => updateSettings({ theme: 'light' })}
                            className={`flex-1 rounded-3xl px-5 py-5 border ${settings.theme === 'light' ? 'bg-nexus-primary text-white border-nexus-primary' : 'bg-white/10 text-primary border-white/10'}`}
                        >
                            <Sun size={18} className="mx-auto mb-3" />
                            <div className="text-[11px] uppercase font-black tracking-[0.18em]">Light</div>
                        </button>
                    </div>
                    <label className="block">
                        <span className="text-[10px] uppercase font-black tracking-[0.2em] text-muted">Screensaver timeout (seconds)</span>
                        <input
                            type="number"
                            value={settings.screensaverTimeout}
                            onChange={(event) => updateSettings({ screensaverTimeout: Number(event.target.value) })}
                            className="input-glass w-full mt-2"
                        />
                    </label>
                </div>
            </div>

            <div className="nexus-card p-8 space-y-5">
                <h3 className="text-xl font-black text-primary">Deployment References</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="rounded-3xl bg-black/5 px-5 py-5">
                        <div className="text-[10px] uppercase font-black tracking-[0.2em] text-muted mb-2">MQTT Broker</div>
                        <div className="font-mono text-primary">{settings.mqttBroker}</div>
                    </div>
                    <div className="rounded-3xl bg-black/5 px-5 py-5">
                        <div className="text-[10px] uppercase font-black tracking-[0.2em] text-muted mb-2">Pi-hole URL</div>
                        <div className="font-mono text-primary break-all">{settings.piholeUrl}</div>
                    </div>
                    <div className="rounded-3xl bg-black/5 px-5 py-5">
                        <div className="text-[10px] uppercase font-black tracking-[0.2em] text-muted mb-2">Node Label</div>
                        <div className="text-primary font-semibold">{settings.nodeLabel}</div>
                    </div>
                </div>
                <p className="text-sm text-secondary">
                    Đây là local UI settings. Broker native, systemd backend, và frontend static sẽ được mô tả đầy đủ trong README deploy cho Orange Pi.
                </p>
            </div>
        </div>
    );
};
