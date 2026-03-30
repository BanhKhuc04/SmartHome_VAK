import { motion } from 'framer-motion';
import { Droplets, TrendingDown, AlertTriangle } from 'lucide-react';

export default function ResourceAnalytics() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-semibold text-lg text-white tracking-wide">Resource & Fluid Management</h2>
        <div className="flex gap-2">
          <span className="text-xs font-mono text-emerald-400 bg-emerald-900/20 px-2 py-1 rounded border border-emerald-500/30 flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
            <TrendingDown className="w-3 h-3" />
            -12% Water Usage
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
        {/* Main Fluid Widget */}
        <div className="col-span-1 md:col-span-2 relative bg-black/40 rounded-2xl border border-white/5 overflow-hidden flex flex-col sm:flex-row items-start sm:items-end justify-between p-6 h-64 md:h-auto">
          <div className="absolute inset-0 z-0 opacity-40">
            {/* SVG Wave simulation */}
            <svg className="absolute bottom-0 w-full h-32" viewBox="0 0 1000 100" preserveAspectRatio="none">
              <motion.path 
                animate={{ d: [
                  "M0,50 C250,10 500,90 1000,50 L1000,100 L0,100 Z",
                  "M0,50 C250,90 500,10 1000,50 L1000,100 L0,100 Z"
                ] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                fill="url(#waterGrad)" 
              />
              <defs>
                <linearGradient id="waterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(34, 211, 238, 0.4)" />
                  <stop offset="100%" stopColor="rgba(59, 130, 246, 0.1)" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          
          <div className="relative z-10 space-y-2 mb-4 sm:mb-0">
            <div className="flex items-center gap-2">
              <Droplets className="text-cyan-400 w-5 h-5 shadow-[0_0_10px_rgba(34,211,238,0.5)] rounded-full" />
              <h3 className="text-slate-300 font-medium">Main Reservoir</h3>
            </div>
            <div className="text-4xl sm:text-5xl font-light text-white font-mono tracking-tighter">
              4,204 <span className="text-lg text-slate-500 font-sans tracking-normal">Liters</span>
            </div>
            <p className="text-xs text-slate-400 font-mono bg-black/40 backdrop-blur-sm px-2 py-1 rounded inline-block border border-white/5">Predicted capacity exhaustion: <span className="text-cyan-400">14 days</span></p>
          </div>
          
          <div className="relative z-10 flex flex-col items-center sm:items-end space-y-2 w-full sm:w-auto mt-4 sm:mt-0">
             <div className="h-6 w-full sm:h-32 sm:w-8 bg-slate-900 rounded-full border border-white/10 overflow-hidden relative sm:rotate-180 flex sm:block border-b-cyan-500/30">
               <motion.div 
                 initial={{ width: 0, height: 0 }} 
                 animate={{ height: "70%", width: "70%" }} 
                 transition={{ duration: 2, ease: "easeOut" }}
                 className="h-full sm:w-full bg-gradient-to-r sm:bg-gradient-to-t from-cyan-600 to-cyan-300 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.4)]" 
               />
             </div>
             <span className="text-[10px] sm:text-xs font-mono text-cyan-400 font-bold tracking-widest text-center sm:text-right w-full">70% FULL</span>
          </div>
        </div>

        {/* Alerts & Modules */}
        <div className="flex flex-col gap-4">
          <div className="p-4 bg-amber-900/10 border border-amber-500/20 rounded-2xl relative overflow-hidden group shadow-[0_0_15px_rgba(245,158,11,0.05)]">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 blur-xl rounded-full" />
            <div className="flex gap-3 relative z-10">
              <AlertTriangle className="text-amber-500 w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-amber-400 font-medium text-sm mb-1">Micro-Leak Detected</h4>
                <p className="text-[11px] text-amber-500/70 leading-relaxed font-mono">Zone B-4 irrigation showing 0.2L/hr variance. AI isolated valve.</p>
              </div>
            </div>
          </div>

          <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col font-mono text-xs shadow-inner">
            <h4 className="text-slate-400 mb-4 uppercase tracking-wider text-[10px]">Filter Lifecycle</h4>
            <div className="space-y-4 flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
               <div>
                 <div className="flex justify-between items-center mb-1.5">
                   <span className="text-slate-300 tracking-wide">Intake A</span>
                   <span className="text-emerald-400">92%</span>
                 </div>
                 <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden shadow-inner">
                   <div className="w-[92%] h-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                 </div>
               </div>

               <div>
                 <div className="flex justify-between items-center mb-1.5">
                   <span className="text-slate-300 tracking-wide">RO Membrane</span>
                   <span className="text-amber-400">41%</span>
                 </div>
                 <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden shadow-inner">
                   <div className="w-[41%] h-full bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
