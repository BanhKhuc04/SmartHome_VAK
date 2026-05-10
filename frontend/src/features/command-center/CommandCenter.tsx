import AIAgentWidget from './AIAgentWidget';
import SmartScenes from './SmartScenes';
import DeviceNetworkMap from './DeviceNetworkMap';
import ResourceAnalytics from './ResourceAnalytics';
import SensorSnapshot from './SensorSnapshot';
import { motion } from 'framer-motion';

export default function CommandCenter() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans selection:bg-cyan-500/30 overflow-hidden relative">
      {/* Background glow effects */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      
      <header className="flex justify-between items-center mb-8 relative z-10 w-full max-w-7xl mx-auto">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">
            NEXUS COMMAND
          </h1>
          <p className="text-cyan-500/70 text-sm font-mono mt-1 tracking-widest uppercase">
            SYS.STATUS <span className="text-white">ONLINE</span> // SECURITY: <span className="text-amber-500">DEFCON 5</span>
          </p>
        </div>
        <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.1)]">
          <div className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,1)]" />
          <span className="text-cyan-400 font-mono text-sm tracking-widest uppercase">System Optimal</span>
        </div>
      </header>

      {/* Bento Box Grid Layout */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10 auto-rows-[minmax(280px,auto)]">
        
        {/* Top left - AIAgent Widget (4 columns wide, 2 rows tall) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          className="md:col-span-4 md:row-span-2 rounded-3xl bg-slate-900/50 backdrop-blur-xl border border-white/10 p-6 shadow-2xl overflow-hidden flex flex-col relative group hover:border-cyan-500/50 transition-all duration-500"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <AIAgentWidget />
        </motion.div>

        {/* Top right - Smart Scenes (8 columns wide) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
          className="md:col-span-8 md:row-span-1 rounded-3xl bg-slate-900/50 backdrop-blur-xl border border-white/10 p-6 shadow-2xl relative group hover:border-purple-500/50 transition-all duration-500"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <SmartScenes />
        </motion.div>

        {/* Middle right - Node Network Map (8 columns wide) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
          className="md:col-span-8 md:row-span-1 rounded-3xl bg-slate-900/50 backdrop-blur-xl border border-white/10 p-6 shadow-2xl relative group hover:border-amber-500/50 transition-all duration-500"
        >
          <div className="absolute inset-0 bg-gradient-to-bl from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <DeviceNetworkMap />
        </motion.div>

         {/* Bottom left - Resource Analytics (6 columns wide) */}
         <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}
          className="md:col-span-6 md:row-span-1 rounded-3xl bg-slate-900/50 backdrop-blur-xl border border-white/10 p-6 shadow-2xl relative group hover:border-cyan-500/50 transition-all duration-500"
        >
          <ResourceAnalytics />
        </motion.div>

         {/* Bottom Right - Sensor Snapshot (6 columns wide) */}
         <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}
          className="md:col-span-6 md:row-span-1 rounded-3xl bg-slate-900/50 backdrop-blur-xl border border-white/10 p-6 shadow-2xl flex flex-col relative group hover:border-cyan-500/50 transition-all duration-500"
        >
          <SensorSnapshot />
        </motion.div>

      </div>
    </div>
  );
}
