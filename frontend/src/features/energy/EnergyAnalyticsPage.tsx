import { motion } from 'framer-motion';
import { Zap, TrendingUp, TrendingDown, DollarSign, Calendar, Cpu, Sparkles } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

const hourlyData = [
    { time: '00:00', usage: 1.2 }, { time: '04:00', usage: 0.8 }, { time: '08:00', usage: 2.5 },
    { time: '12:00', usage: 3.8 }, { time: '16:00', usage: 3.2 }, { time: '20:00', usage: 4.5 },
    { time: '23:59', usage: 1.5 },
];

const dailyData = [
    { day: 'Mon', usage: 12.5 }, { day: 'Tue', usage: 14.2 }, { day: 'Wed', usage: 11.8 },
    { day: 'Thu', usage: 15.6 }, { day: 'Fri', usage: 18.9 }, { day: 'Sat', usage: 22.4 },
    { day: 'Sun', usage: 20.1 },
];

const deviceUsage = [
    { name: 'AC Unit', value: 45, color: '#3B82F6' },
    { name: 'Water Heater', value: 25, color: '#8B5CF6' },
    { name: 'Lighting', value: 15, color: '#10B981' },
    { name: 'Refrigerator', value: 10, color: '#F59E0B' },
    { name: 'Others', value: 5, color: '#94A3B8' },
];

export default function EnergyAnalyticsPage() {
    return (
        <div className="h-[calc(100vh-140px)] flex flex-col gap-6 animate-fade-in overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Energy Intelligence</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sustainability Matrix v2.4</p>
                </div>
                <div className="flex gap-4">
                    <button className="flex items-center gap-2 px-6 py-3 bg-white border border-black/[0.03] rounded-2xl shadow-soft hover:shadow-premium transition-all text-xs font-black uppercase text-slate-600">
                        <Calendar size={16} /> March 2026
                    </button>
                    <button className="flex items-center gap-2 px-8 py-3 bg-nexus-primary text-white rounded-2xl shadow-lg shadow-nexus-primary/20 hover:scale-105 active:scale-95 transition-all text-xs font-black uppercase">
                        Export Report
                    </button>
                </div>
            </div>

            {/* Top Stats */}
            <div className="grid grid-cols-4 gap-6">
                {[
                    { label: 'Total Usage', value: '142.5 kWh', icon: Zap, change: '+12%', color: 'text-nexus-primary' },
                    { label: 'Est. Cost', value: '$24.50', icon: DollarSign, change: '-4%', color: 'text-nexus-success' },
                    { label: 'Avg. Load', value: '2.4 kW', icon: TrendingUp, change: '+0.5%', color: 'text-nexus-warning' },
                    { label: 'Carbon Saved', value: '12.4 kg', icon: TrendingDown, change: '+18%', color: 'text-nexus-secondary' },
                ].map((stat, i) => (
                    <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: i * 0.1 }}
                        key={stat.label} 
                        className="nexus-card p-6 bg-white/80 border border-black/[0.03] relative overflow-hidden"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-2xl bg-slate-50 border border-black/[0.02] ${stat.color}`}>
                                <stat.icon size={18} />
                            </div>
                            <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${
                                stat.change.startsWith('+') && stat.label === 'Total Usage' ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'
                            }`}>
                                {stat.change}
                            </span>
                        </div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</h4>
                        <p className="text-2xl font-black text-slate-900 tracking-tighter mt-1">{stat.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-3 gap-6 flex-1 min-h-[400px]">
                {/* Hourly Usage */}
                <div className="col-span-2 nexus-card p-8 bg-white/80 border border-black/[0.03] flex flex-col">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-xs font-black uppercase text-slate-900 tracking-widest">Load Velocity</h3>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Real-time consumption flow (kWh)</p>
                        </div>
                        <div className="flex p-1 bg-slate-100 rounded-xl">
                            {['Hourly', 'Daily', 'Monthly'].map(opt => (
                                <button key={opt} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${opt === 'Hourly' ? 'bg-white shadow-sm text-nexus-primary' : 'text-slate-400 hover:text-slate-600'}`}>
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={hourlyData}>
                                <defs>
                                    <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94A3B8' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94A3B8' }} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}
                                    itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}
                                />
                                <Area type="monotone" dataKey="usage" stroke="#3B82F6" strokeWidth={4} fillOpacity={1} fill="url(#colorUsage)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Consuming Devices */}
                <div className="nexus-card p-8 bg-white/80 border border-black/[0.03]">
                    <h3 className="text-xs font-black uppercase text-slate-900 tracking-widest mb-8">Asset Breakdown</h3>
                    <div className="space-y-6">
                        {deviceUsage.map((device, i) => (
                            <div key={device.name} className="space-y-2">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase">
                                    <span className="text-slate-900">{device.name}</span>
                                    <span className="text-slate-400">{device.value}%</span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${device.value}%` }}
                                        transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                                        className="h-full rounded-full"
                                        style={{ backgroundColor: device.color }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* AI Insight Box */}
                    <div className="mt-12 p-5 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[32px] relative overflow-hidden group">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-nexus-primary/20 blur-3xl rounded-full" />
                         <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles className="text-nexus-primary" size={14} />
                                <span className="text-[9px] font-black uppercase text-white tracking-widest">AI Intelligence</span>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-tighter">
                                Optimization detected. Shifting AC cooling by 2°C between 14:00-16:00 could save <span className="text-white">15% ($4.20)</span> this month.
                            </p>
                         </div>
                    </div>
                </div>
            </div>

            {/* Weekly Comparison */}
            <div className="nexus-card p-8 bg-white/80 border border-black/[0.03] min-h-[300px]">
                 <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-xs font-black uppercase text-slate-900 tracking-widest">Historical Matrix</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Usage comparison: Current week vs average</p>
                    </div>
                 </div>
                 <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dailyData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94A3B8' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94A3B8' }} />
                            <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                            <Bar dataKey="usage" radius={[10, 10, 0, 0]} barSize={40}>
                                {dailyData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.usage > 20 ? '#EF4444' : '#3B82F6'} opacity={0.8} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                 </div>
            </div>
        </div>
    );
}
