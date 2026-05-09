import { useState } from 'react';
import { motion } from 'framer-motion';
import { LockKeyhole, Server, UserRound } from 'lucide-react';
import { useAuth } from '../../shared/hooks/useAuth';

export const LoginPage = () => {
    const { login, error, isLoading } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        await login(username, password);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6"
            style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(59,130,246,0.1) 0%, transparent 50%), linear-gradient(180deg, #0a0e1a 0%, #070b14 100%)' }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                className="w-full max-w-md"
                style={{ borderRadius: 'var(--radius-2xl)', border: '1px solid var(--border-primary)', background: 'var(--bg-card)', backdropFilter: 'blur(24px)', boxShadow: '0 16px 48px rgba(0,0,0,0.4)', padding: 32 }}>
                <div className="flex items-center gap-4 mb-6">
                    <div className="flex items-center justify-center text-white" style={{ width: 52, height: 52, borderRadius: 18, background: 'linear-gradient(135deg, var(--nexus-primary), var(--nexus-cyan))', boxShadow: '0 8px 24px rgba(59,130,246,0.3)' }}>
                        <Server size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight" style={{ color: '#f1f5f9' }}>HomeCore Nexus</h1>
                        <p className="font-extrabold uppercase" style={{ fontSize: 10, letterSpacing: '0.2em', color: '#64748b' }}>Modular IoT Command Center</p>
                    </div>
                </div>

                <div className="mb-6 nexus-inset" style={{ border: '1px solid var(--border-primary)' }}>
                    <p style={{ fontSize: 13, color: '#94a3b8' }}>MQTT-native control center for ESP8266 modules on Orange Pi One.</p>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-6">
                    {[
                        ['Backend', '#10b981'],
                        ['MQTT', '#06b6d4'],
                        ['ESP8266', '#8b5cf6'],
                    ].map(([label, color]) => (
                        <div key={label} className="nexus-inset" style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <div className="font-extrabold uppercase" style={{ fontSize: 9, letterSpacing: '0.12em', color }}>[{label}]</div>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Local Control</div>
                        </div>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <label className="block">
                        <span className="font-extrabold uppercase" style={{ fontSize: 10, letterSpacing: '0.18em', color: '#94a3b8' }}>Username</span>
                        <div className="mt-2 flex items-center gap-3" style={{ borderRadius: 'var(--radius-md)', background: 'var(--bg-input)', border: '1px solid var(--border-primary)', padding: '10px 14px' }}>
                            <UserRound size={16} style={{ color: '#64748b', flexShrink: 0 }} />
                            <input value={username} onChange={(e) => setUsername(e.target.value)} className="bg-transparent w-full outline-none font-medium" style={{ fontSize: 14, color: '#f1f5f9' }} placeholder="Enter username" autoComplete="username" />
                        </div>
                    </label>

                    <label className="block">
                        <span className="font-extrabold uppercase" style={{ fontSize: 10, letterSpacing: '0.18em', color: '#94a3b8' }}>Password</span>
                        <div className="mt-2 flex items-center gap-3" style={{ borderRadius: 'var(--radius-md)', background: 'var(--bg-input)', border: '1px solid var(--border-primary)', padding: '10px 14px' }}>
                            <LockKeyhole size={16} style={{ color: '#64748b', flexShrink: 0 }} />
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-transparent w-full outline-none font-medium" style={{ fontSize: 14, color: '#f1f5f9' }} placeholder="Enter password" autoComplete="current-password" />
                        </div>
                    </label>

                    {error && (
                        <div style={{ borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '10px 14px', fontSize: 13, color: '#f87171' }}>{error}</div>
                    )}

                    <button type="submit" disabled={isLoading} className="w-full font-black uppercase disabled:opacity-50"
                        style={{ borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, var(--nexus-primary), var(--nexus-secondary))', color: 'white', padding: 14, fontSize: 12, letterSpacing: '0.15em', border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', boxShadow: '0 6px 24px rgba(59,130,246,0.3)' }}>
                        {isLoading ? 'Authenticating...' : 'Enter Command Center'}
                    </button>
                </form>

                <div className="mt-5 text-center" style={{ fontSize: 12, color: '#64748b' }}>
                    Default: <span style={{ color: '#94a3b8', fontWeight: 600 }}>admin / admin123</span>
                </div>
            </motion.div>
        </div>
    );
};
