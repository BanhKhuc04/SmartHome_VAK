import { useState } from 'react';
import { motion } from 'framer-motion';
import { LockKeyhole, Server, UserRound } from 'lucide-react';
import { useAuth } from '../../shared/hooks/useAuth';

export const LoginPage = () => {
    const { login, error, isLoading } = useAuth();
    const [username, setUsername] = useState('admin');
    const [password, setPassword] = useState('admin123');

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        await login(username, password);
    };

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_35%),linear-gradient(180deg,_rgba(15,23,42,1),_rgba(2,6,23,1))] text-white flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="w-full max-w-md rounded-[32px] border border-white/10 bg-white/10 backdrop-blur-2xl shadow-2xl p-8"
            >
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg">
                        <Server size={30} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">HomeCore Nexus</h1>
                        <p className="text-[11px] uppercase tracking-[0.25em] text-slate-300 font-bold">Control Center</p>
                    </div>
                </div>

                <div className="mb-8 rounded-3xl bg-white/5 border border-white/10 p-4">
                    <p className="text-sm text-slate-200">
                        Dashboard tối ưu cho Orange Pi One để quản lý MQTT modules và relay ESP8266 theo `device_id`.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <label className="block">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Username</span>
                        <div className="mt-2 flex items-center gap-3 rounded-2xl bg-white/10 border border-white/10 px-4 py-4">
                            <UserRound size={18} className="text-slate-300" />
                            <input
                                value={username}
                                onChange={(event) => setUsername(event.target.value)}
                                className="bg-transparent w-full outline-none text-sm font-semibold placeholder:text-slate-400"
                                placeholder="admin"
                            />
                        </div>
                    </label>

                    <label className="block">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Password</span>
                        <div className="mt-2 flex items-center gap-3 rounded-2xl bg-white/10 border border-white/10 px-4 py-4">
                            <LockKeyhole size={18} className="text-slate-300" />
                            <input
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                className="bg-transparent w-full outline-none text-sm font-semibold placeholder:text-slate-400"
                                placeholder="admin123"
                            />
                        </div>
                    </label>

                    {error && (
                        <div className="rounded-2xl bg-rose-500/15 border border-rose-400/30 px-4 py-3 text-sm text-rose-100">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full rounded-2xl bg-white text-slate-950 font-black uppercase tracking-[0.2em] py-4 shadow-lg hover:shadow-xl transition disabled:opacity-60"
                    >
                        {isLoading ? 'Authenticating...' : 'Enter Control Center'}
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-slate-400">
                    Demo access: <span className="font-semibold text-slate-200">admin / admin123</span>
                </div>
            </motion.div>
        </div>
    );
};
