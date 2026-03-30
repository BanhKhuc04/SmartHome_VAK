import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
    ShieldCheck, ShieldAlert, Lock, Unlock, 
    Cctv, Eye, EyeOff, Radio, TriangleAlert, 
    Activity, History, BellRing
} from 'lucide-react';

export default function SecurityPage() {
    const [isArmed, setIsArmed] = useState(false);
    const [camsActive, setCamsActive] = useState(true);

    return (
        <div className="space-y-10 animate-fade-in pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Security Perimeter</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Defense & Multi-Sensor Guard</p>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={() => setIsArmed(!isArmed)}
                        className={`group relative flex items-center gap-3 px-8 py-4 rounded-2xl transition-all duration-500 font-black uppercase text-[10px] tracking-widest shadow-premium ${isArmed ? 'bg-nexus-danger text-white' : 'bg-white border border-black/[0.03] text-slate-900'}`}
                    >
                        {isArmed ? <ShieldAlert size={16} className="animate-pulse" /> : <ShieldCheck size={16} className="text-nexus-success" />}
                        {isArmed ? 'Perimeter Armed' : 'System Disarmed'}
                        {isArmed && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-ping" />
                        )}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Visual Map / Status */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="nexus-card bg-slate-900 border-none p-10 min-h-[400px] flex flex-col justify-center items-center text-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent opacity-50" />
                        
                        {/* Guard Eye (Animated) */}
                        <div className="relative mb-10">
                            <motion.div 
                                animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] }}
                                transition={{ duration: 3, repeat: Infinity }}
                                className="absolute inset-0 bg-nexus-primary blur-3xl rounded-full"
                            />
                            <div className="relative w-32 h-32 rounded-full border-2 border-white/20 flex items-center justify-center">
                                <Lock size={48} className={isArmed ? 'text-nexus-danger' : 'text-slate-500'} />
                            </div>
                        </div>

                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">
                            {isArmed ? 'Full Guard Protocol Active' : 'System Monitoring Only'}
                        </h3>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] max-w-md leading-relaxed">
                            {isArmed 
                                ? 'AI Guard is analyzing motion vectors and thermal signatures across 4 zones. Rapid response enabled.' 
                                : 'Motion detection is currently in logging-only mode. External alerts are suppressed.'}
                        </p>

                        <div className="mt-12 flex gap-8">
                            {[
                                { label: 'Motion', active: true },
                                { label: 'Gas/LPG', active: true },
                                { label: 'Thermal', active: isArmed },
                            ].map(z => (
                                <div key={z.label} className="flex flex-col items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${z.active ? 'bg-nexus-success animate-pulse shadow-[0_0_8px_rgba(16,185,129,1)]' : 'bg-slate-700'}`} />
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{z.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="nexus-card p-6 flex items-center gap-6">
                            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-nexus-primary">
                                <Cctv size={24} />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                    <p className="text-[10px] font-black uppercase text-slate-400">Stream Status</p>
                                    <span className="text-[10px] font-black text-nexus-success uppercase">Live</span>
                                </div>
                                <h4 className="text-sm font-black uppercase text-slate-900">4 Active Cameras</h4>
                            </div>
                            <button 
                                onClick={() => setCamsActive(!camsActive)}
                                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                {camsActive ? <Eye size={18} /> : <EyeOff size={18} />}
                            </button>
                         </div>
                         <div className="nexus-card p-6 flex items-center gap-6">
                            <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-nexus-danger">
                                <Radio size={24} />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                    <p className="text-[10px] font-black uppercase text-slate-400">Signal Integrity</p>
                                    <span className="text-[10px] font-black text-nexus-success uppercase">99%</span>
                                </div>
                                <h4 className="text-sm font-black uppercase text-slate-900">Mesh Encrypted</h4>
                            </div>
                            <div className="p-3">
                                <Activity size={18} className="text-slate-400" />
                            </div>
                         </div>
                    </div>
                </div>

                {/* Event Feed */}
                <div className="nexus-card bg-white p-0 flex flex-col h-full overflow-hidden">
                    <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                         <div className="flex items-center gap-2">
                            <History size={16} className="text-slate-400" />
                            <span className="text-[10px] font-black uppercase text-slate-900 tracking-widest">Security Log</span>
                         </div>
                         <div className="w-2 h-2 rounded-full bg-nexus-danger animate-ping" />
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 nexus-scrollbar">
                        {[
                            { time: '01:54 AM', msg: 'Front Door Locked (Auto)', type: 'info' },
                            { time: '11:20 PM', msg: 'Motion Detected: Yard (Ignore Pattern)', type: 'warning' },
                            { time: '09:15 PM', msg: 'System Disarmed by Admin', type: 'danger' },
                            { time: '08:00 PM', msg: 'Night Shield Protocol Engaged', type: 'info' },
                            { time: '06:30 PM', msg: 'Backyard Sensor Heartbeat OK', type: 'success' },
                        ].map((log, i) => (
                            <div key={i} className="flex gap-4 group">
                                <div className="text-[9px] font-black text-slate-300 group-hover:text-slate-400 transition-colors pt-1 tabular-nums w-12 text-right">
                                    {log.time}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <p className="text-[11px] font-bold text-slate-700 uppercase tracking-tight leading-none">{log.msg}</p>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1 h-1 rounded-full ${log.type === 'danger' ? 'bg-nexus-danger' : log.type === 'warning' ? 'bg-nexus-warning' : 'bg-nexus-primary'}`} />
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{log.type} event</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button className="m-6 mt-0 p-4 border border-slate-100 rounded-2xl flex items-center justify-center gap-2 text-[9px] font-black uppercase text-slate-500 hover:bg-slate-50 transition-all">
                        <BellRing size={14} /> Full Log Analysis
                    </button>
                </div>
            </div>
        </div>
    );
}
