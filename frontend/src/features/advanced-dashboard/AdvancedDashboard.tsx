import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cpu, Zap, Thermometer, Wind, ShieldCheck, 
  Navigation, CheckCircle2, Info, Activity, 
  Sparkles, Server, ZapOff, Lightbulb, SlidersHorizontal, LayoutDashboard,
  ShieldAlert, Lock, Unlock, AlertTriangle, Fingerprint, LockKeyhole,
  History, Settings2, Bell, Fan
} from 'lucide-react';
import { useWebSocket } from '../../shared/hooks/useWebSocket';
import HouseMap3D from '../house-map/HouseMap3D';

// --- Premium Sub-components ---

const ProgressRing = ({ value, label, icon: Icon, color, size = 90 }: { value: number, label: string, icon?: any, color: string, size?: number }) => {
  const radius = (size / 2) - 6;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group cursor-help transition-transform duration-300 hover:scale-105" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="rotate-[-90deg]">
          <circle 
            stroke="rgba(0,0,0,0.03)" 
            strokeWidth="6" 
            fill="transparent" 
            r={radius} 
            cx={size / 2} 
            cy={size / 2} 
          />
          <motion.circle 
            stroke={color} 
            strokeWidth="6" 
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            strokeLinecap="round"
            fill="transparent" 
            r={radius} 
            cx={size / 2} 
            cy={size / 2} 
            className="drop-shadow-[0_0_4px_rgba(0,0,0,0.2)]"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
           {Icon && <Icon size={14} className="text-slate-400 mb-0.5 group-hover:text-nexus-primary transition-colors" />}
           <span className="text-xs font-black tracking-tighter text-slate-900">{Math.round(value)}%</span>
        </div>
      </div>
      <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">{label}</span>
    </div>
  );
};

const MiniLineGraph = ({ data, color }: { data: number[], color: string }) => {
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 100},${40 - (v / max) * 35}`).join(' ');
  
  return (
    <div className="w-full h-16 overflow-hidden mt-4 group">
      <svg viewBox="0 0 100 40" className="w-full h-full preserve-3d" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline points={`0,40 ${points} 100,40`} fill={`url(#grad-${color})`} className="opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
        <motion.polyline 
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: "easeInOut" }}
          points={points} 
          fill="none" 
          stroke={color} 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)] group-hover:drop-shadow-[0_4px_8px_rgba(245,158,11,0.3)] transition-all duration-500"
        />
      </svg>
    </div>
  );
};

export default function AdvancedDashboard() {
  const [devices, setDevices] = useState<any[]>([]);
  const [systemMetrics, setSystemMetrics] = useState({ cpu: 0, ram: 0, uptime: 0, temp: 0 });
  const [aiLoad, setAiLoad] = useState(24);
  const [isLoading, setIsLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([
    { id: 1, type: 'ai', msg: "Aria optimized living room climate.", time: "Just now" },
    { id: 2, type: 'security', msg: "Front door locked automatically.", time: "2 min ago" },
    { id: 3, type: 'automation', msg: "Evening scene activated.", time: "10 min ago" },
    { id: 4, type: 'device', msg: "Kitchen lights turned off.", time: "14 min ago" },
  ]);

  // Fetch devices
  useEffect(() => {
    fetch('/api/devices')
      .then(res => res.json())
      .then(res => {
        if (res.success) setDevices(res.data);
        setIsLoading(false);
      })
      .catch(err => console.error('[Nexus Dashboard] Fetch error:', err));
  }, []);

  // Real-time updates
  useWebSocket((msg) => {
    if (msg.type === 'system_metrics') {
      setSystemMetrics(msg.payload as any);
      setAiLoad(prev => Math.min(Math.max(prev + (Math.random() * 4 - 2), 10), 85));
    } else if (msg.type === 'sensor_data' || msg.type === 'device_update' || msg.type === 'relay_state') {
       const payload = msg.payload as any;
       
       setDevices(prev => prev.map(dev => {
           if (dev.id === payload.deviceId) {
               if (msg.type === 'sensor_data') {
                   return { ...dev, sensors: dev.sensors.map((s: any) => s.id === payload.sensorId ? { ...s, value: payload.value } : s) };
               }
               if (msg.type === 'relay_state') {
                   // Add to activity log if state changes
                   setRecentActivity(curr => [
                     { id: Date.now(), type: 'device', msg: `${dev.name} turned ${payload.state}.`, time: "Just now" },
                     ...curr.slice(0, 4)
                   ]);
                   return { ...dev, relays: dev.relays.map((r: any) => r.id === payload.relayId ? { ...r, state: payload.state } : r) };
               }
               if (msg.type === 'device_update') {
                   return { ...dev, ...payload };
               }
           }
           return dev;
       }));
    }
  });

  const activeDevices = useMemo(() => {
    return devices.filter(d => d.relays?.some((r: any) => r.state === 'ON') || (d.status === 'online' && d.type !== 'sensor'));
  }, [devices]);

  const avgTemp = useMemo(() => {
    const temps = devices.flatMap(d => d.sensors?.filter((s: any) => s.type === 'temperature').map((s: any) => s.value) || []);
    return temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 22.5;
  }, [devices]);

  // Security calculations
  const securityStatus = useMemo(() => {
    const contactSensors = devices.flatMap(d => d.sensors?.filter((s:any) => s.type === 'contact') || []);
    const motionSensors = devices.flatMap(d => d.sensors?.filter((s:any) => s.type === 'motion') || []);
    const isOpen = contactSensors.some((s:any) => s.value === 'open');
    const isMotion = motionSensors.some((s:any) => s.value === 'active');
    
    return {
      status: isOpen ? 'Warning' : 'Secure',
      color: isOpen ? 'text-nexus-warning' : 'text-nexus-success',
      icon: isOpen ? target => <ShieldAlert {...target} /> : target => <ShieldCheck {...target} />,
      openDoors: contactSensors.filter((s:any) => s.value === 'open').length,
      activeMotion: motionSensors.filter((s:any) => s.value === 'active').length,
    };
  }, [devices]);

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* Dynamic Shell Header */}
      <div className="flex justify-between items-center bg-white/60 backdrop-blur-3xl p-6 lg:p-8 rounded-[32px] border border-white shadow-premium">
        <div>
          <h2 className="text-3xl lg:text-4xl font-black tracking-tighter text-slate-900 leading-none">
            NEXUS <span className="text-nexus-primary">COMMAND</span>
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">Central Node Active • Local Network</p>
        </div>
        <div className="flex gap-4 hidden sm:flex">
           <div className="flex items-center gap-3 px-6 py-3 bg-white border border-black/[0.03] rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer">
              <div className={`w-2 h-2 rounded-full ${securityStatus.status === 'Secure' ? 'bg-nexus-success shadow-[0_0_8px_#22C55E]' : 'bg-nexus-warning shadow-[0_0_8px_#F59E0B]'} animate-pulse`} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${securityStatus.color}`}>{securityStatus.status} Core</span>
           </div>
           <button className="p-3 bg-white border border-black/[0.03] rounded-2xl shadow-sm hover:shadow-premium hover:-translate-y-0.5 transition-all outline-none">
              <Settings2 size={20} className="text-slate-600" />
           </button>
        </div>
      </div>

      {/* Control Center Bento Grid (12-col) */}
      <div className="grid grid-cols-12 gap-6 auto-rows-[minmax(120px,auto)]">
        
        {/* ROW 1: HUD Stats (Height: approx 260px) */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-6">
          {/* Widget 1: System Status */}
          <div className="nexus-card p-6 flex-1 flex flex-col justify-between group overflow-hidden relative">
             <div className="absolute -right-10 -top-10 w-32 h-32 bg-nexus-primary/5 rounded-full blur-3xl group-hover:bg-nexus-primary/10 transition-colors duration-500" />
             <div className="flex justify-between items-center z-10">
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                  <Server size={14} className="text-nexus-primary" />
                  System Vitals
                </h3>
             </div>
             <div className="flex justify-center gap-6 mt-4 z-10">
                <ProgressRing value={systemMetrics.cpu} label="CPU Core" icon={Cpu} color="#3B82F6" size={80} />
                <ProgressRing value={systemMetrics.ram} label="Memory" icon={Activity} color="#8B5CF6" size={80} />
             </div>
             <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-400 tracking-widest mt-6 pt-3 border-t border-black/[0.03] z-10">
                <span>Uptime: {Math.floor(systemMetrics.uptime / 3600)}h {(Math.floor(systemMetrics.uptime / 60) % 60)}m</span>
                <span className="text-nexus-success flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-nexus-success animate-pulse" /> Nom</span>
             </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-3 flex flex-col gap-6">
          {/* Widget 2: Climate/Temperature */}
          <div className="nexus-card p-6 flex-1 flex flex-col justify-between group">
             <div className="flex justify-between items-center z-10">
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                  <Wind size={14} className="text-cyan-500" />
                  Climate
                </h3>
                <Thermometer size={14} className="text-slate-300 group-hover:text-nexus-danger transition-colors" />
             </div>
             <div className="flex justify-center mt-2 z-10">
                <div className="relative w-28 h-28 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                   <div className="absolute inset-0 border-[3px] border-slate-100 rounded-full" />
                   <div className="absolute inset-0 border-r-[3px] border-cyan-500 rounded-full rotate-45 group-hover:rotate-90 transition-transform duration-[2000ms]" />
                   <div className="flex flex-col items-center">
                      <span className="text-3xl font-black text-slate-900 leading-none">{avgTemp.toFixed(1)}°</span>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Global Avg</span>
                   </div>
                </div>
             </div>
             <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-400 tracking-widest mt-6 pt-3 border-t border-black/[0.03] px-2 z-10">
                <span className="text-cyan-500 flex items-center gap-1"><Fan size={10} className="animate-spin-slow" /> 45% RH</span>
                <span className="text-nexus-success">AQI 22</span>
             </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-3 flex flex-col gap-6">
          {/* Widget 3: Security Status */}
          <div className={`nexus-card p-6 flex-1 flex flex-col justify-between group transition-colors duration-500 ${securityStatus.status === 'Warning' ? 'bg-nexus-warning/5 border-nexus-warning/20' : ''}`}>
             <div className="flex justify-between items-start z-10">
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                  {securityStatus.icon({ size: 14, className: securityStatus.color })}
                  Security
                </h3>
                <div className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${securityStatus.status === 'Secure' ? 'bg-nexus-success/10 text-nexus-success' : 'bg-nexus-warning/10 text-nexus-warning'}`}>
                   {securityStatus.status}
                </div>
             </div>
             
             <div className="flex flex-col justify-center items-center py-4 flex-1">
                {securityStatus.status === 'Secure' ? (
                   <LockKeyhole size={48} className="text-nexus-success/80 drop-shadow-[0_0_12px_rgba(34,197,94,0.4)] mb-3 group-hover:scale-110 transition-transform duration-500" strokeWidth={1.5} />
                ) : (
                   <Unlock size={48} className="text-nexus-warning/80 drop-shadow-[0_0_12px_rgba(245,158,11,0.4)] mb-3 group-hover:scale-110 transition-transform duration-500 animate-pulse" strokeWidth={1.5} />
                )}
                <span className="text-xl font-black text-slate-800 uppercase tracking-tighter">Perimeter</span>
             </div>

             <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-400 tracking-widest pt-3 border-t border-black/[0.03]">
                <span className="flex items-center gap-1"><Fingerprint size={10} /> Biometrics On</span>
                <span>{securityStatus.openDoors} Open Doors</span>
             </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-3 flex flex-col gap-6">
          {/* Widget 4: AI Insights */}
          <div className="nexus-card p-6 flex-1 flex flex-col justify-between group overflow-hidden relative">
             <div className="absolute inset-0 bg-gradient-to-br from-nexus-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
             <div className="flex justify-between items-start z-10">
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                  <Sparkles size={14} className="text-nexus-secondary" />
                  Aria Core
                </h3>
                <div className="w-1.5 h-1.5 rounded-full bg-nexus-secondary animate-pulse shadow-[0_0_8px_#8B5CF6]" />
             </div>
             <div className="flex flex-col items-center justify-center mt-2 z-10">
                <span className="text-5xl font-black text-slate-900 tracking-tighter drop-shadow-sm">{aiLoad.toFixed(0)}</span>
                <span className="text-[9px] font-black text-nexus-secondary uppercase tracking-widest mt-1 group-hover:tracking-[0.3em] transition-all">GFLOPS Load</span>
             </div>
             <div className="mt-auto w-full z-10">
                <div className="flex justify-between text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1.5">
                   <span>Neural Processing</span>
                   <span>92% Hash</span>
                </div>
                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                   <motion.div 
                      animate={{ width: `${aiLoad}%` }}
                      className="h-full bg-gradient-to-r from-nexus-primary to-nexus-secondary"
                    />
                </div>
             </div>
          </div>
        </div>

        {/* ROW 2: Holographic Map + Energy Chart */}
        <div className="col-span-12 lg:col-span-8 row-span-2 nexus-card p-0 flex flex-col relative overflow-hidden group min-h-[400px]">
           {/* Widget 5: House Map 3D */}
           <div className="absolute top-6 left-8 z-20 pointer-events-none">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2 drop-shadow-md">
                <Navigation size={18} className="text-nexus-primary" />
                Spatial Telemetry
              </h3>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1.5">Live Zone Monitoring</p>
           </div>
           
           <div className="absolute top-6 right-8 z-20 flex gap-1 p-1 bg-white/60 backdrop-blur-xl rounded-xl border border-white shadow-sm">
              <button className="px-4 py-2 rounded-lg bg-white shadow-soft text-[9px] font-black uppercase text-nexus-primary tracking-widest hover:scale-105 transition-all">3D Render</button>
              <button className="px-4 py-2 rounded-lg text-[9px] font-black uppercase text-slate-500 hover:text-slate-800 tracking-widest hover:bg-white/40 transition-all">Heatmap</button>
           </div>

           <div className="absolute inset-0 bg-slate-50/50">
              <HouseMap3D devices={devices} />
           </div>
           
           {/* Overlay Tags */}
           <div className="absolute bottom-6 left-8 z-20 pointer-events-none space-y-2">
              {devices.filter(d => d.status === 'online').slice(0, 3).map((d, i) => (
                 <motion.div 
                   key={i}
                   initial={{ opacity: 0, x: -10 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: 0.5 + i * 0.1 }}
                   className="bg-white/90 backdrop-blur-xl border border-white/80 px-3 py-1.5 rounded-xl shadow-premium flex items-center gap-2"
                 >
                    <div className="w-1.5 h-1.5 rounded-full bg-nexus-success animate-pulse shadow-[0_0_4px_#22C55E]" />
                    <span className="text-[9px] font-black uppercase text-slate-800 tracking-widest">{d.location} Node</span>
                 </motion.div>
              ))}
           </div>
        </div>

        <div className="col-span-12 lg:col-span-4 row-span-1 nexus-card p-6 flex flex-col justify-between group min-h-[220px]">
           {/* Widget 6: Energy Usage */}
           <div className="flex justify-between items-center z-10">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                <Zap size={14} className="text-nexus-warning" />
                Power Grid Matrix
              </h3>
              <div className="px-2 py-1 rounded bg-nexus-warning/10 text-[8px] font-black uppercase tracking-widest text-nexus-warning">Live</div>
           </div>
           <div className="mt-4 z-10">
              <div className="flex items-baseline gap-2 mb-1">
                 <span className="text-4xl font-black text-slate-900 tracking-tighter leading-none">28.4</span>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">kWh Total</span>
              </div>
              <MiniLineGraph data={[20, 45, 30, 80, 60, 90, 100, 85, 70, 95]} color="#F59E0B" />
           </div>
           <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-400 tracking-widest mt-auto border-t border-black/[0.03] pt-3 z-10">
              <span>Peak: 12:00 PM</span>
              <span className="text-nexus-warning">8.2 kW Load</span>
           </div>
        </div>

        {/* ROW 3: Devices & Activity */}
        <div className="col-span-12 lg:col-span-4 row-span-1 nexus-card p-6 flex flex-col h-[260px] relative overflow-hidden group">
           {/* Widget 7: Active Devices */}
           <div className="absolute top-0 right-0 w-32 h-32 bg-nexus-primary/5 rounded-bl-[100px] pointer-events-none group-hover:scale-110 transition-transform duration-500" />
           <div className="flex justify-between items-center mb-4 z-10">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                <LayoutDashboard size={14} className="text-nexus-primary" />
                Active Nodes
              </h3>
              <span className="text-[9px] font-black px-2 py-1 bg-slate-100 rounded-md text-slate-500 uppercase tracking-widest border border-slate-200">{activeDevices.length} Online</span>
           </div>
           
           <div className="flex-1 space-y-2 overflow-y-auto nexus-scrollbar pr-1 z-10 relative">
              {/* Fade out mask at bottom */}
              <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
              
              {activeDevices.map((dev, i) => (
                 <motion.div 
                   key={i}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="px-4 py-3 rounded-2xl bg-white border border-black/[0.03] flex items-center justify-between hover:border-nexus-primary/20 hover:shadow-soft transition-all duration-300 cursor-pointer"
                 >
                    <div className="flex items-center gap-3">
                       <div className={`p-2 rounded-xl ${dev.status === 'online' ? 'bg-nexus-primary/10 text-nexus-primary' : 'bg-slate-100 text-slate-400'}`}>
                          {dev.type === 'hub' ? <Server size={14} /> : <Lightbulb size={14} />}
                       </div>
                       <div>
                          <p className="text-[10px] font-black uppercase text-slate-900 leading-none">{dev.name}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">{dev.location}</p>
                       </div>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-nexus-success shadow-[0_0_6px_#22C55E]" />
                 </motion.div>
              ))}
              {activeDevices.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-3">
                   <ZapOff size={24} className="opacity-20" />
                   <p className="text-[8px] font-black uppercase tracking-widest">No active nodes</p>
                </div>
              )}
           </div>
        </div>

        <div className="col-span-12 lg:col-span-8 row-span-1 nexus-card p-6 flex flex-col h-[260px] relative group overflow-hidden">
           {/* Widget 8: Recent Activity Log */}
           <div className="flex justify-between items-center mb-4 z-10">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                <History size={14} className="text-nexus-secondary" />
                System Activity Log
              </h3>
              <button className="text-[9px] font-bold uppercase tracking-widest text-nexus-primary hover:text-nexus-primary/80 transition-colors">View All</button>
           </div>

           <div className="flex-1 space-y-3 overflow-y-auto nexus-scrollbar pr-2 z-10 relative">
              <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-white to-transparent pointer-events-none z-20" />
              
              <AnimatePresence>
                  {recentActivity.map((activity, i) => (
                     <motion.div 
                       key={activity.id}
                       initial={{ opacity: 0, x: -10 }}
                       animate={{ opacity: 1, x: 0 }}
                       exit={{ opacity: 0, scale: 0.9 }}
                       className="p-3 bg-slate-50 border border-black/[0.02] rounded-2xl flex items-center justify-between group/item hover:bg-white hover:shadow-sm transition-all duration-300"
                     >
                        <div className="flex items-center gap-3">
                           <div className={`p-2 rounded-xl flex items-center justify-center ${
                             activity.type === 'ai' ? 'bg-nexus-secondary/10 text-nexus-secondary' :
                             activity.type === 'security' ? 'bg-nexus-warning/10 text-nexus-warning' :
                             activity.type === 'automation' ? 'bg-cyan-500/10 text-cyan-500' :
                             'bg-nexus-primary/10 text-nexus-primary'
                           }`}>
                              {activity.type === 'ai' ? <Sparkles size={12} /> :
                               activity.type === 'security' ? <ShieldCheck size={12} /> :
                               activity.type === 'automation' ? <Zap size={12} /> :
                               <LayoutDashboard size={12} />}
                           </div>
                           <p className="text-[11px] font-bold text-slate-700 font-inter">{activity.msg}</p>
                        </div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover/item:text-slate-600 transition-colors">{activity.time}</span>
                     </motion.div>
                  ))}
              </AnimatePresence>
           </div>
        </div>

      </div>
    </div>
  );
}
