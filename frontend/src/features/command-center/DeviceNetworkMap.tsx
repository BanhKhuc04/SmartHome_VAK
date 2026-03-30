import { motion } from 'framer-motion';
import { Cpu, Server, Wifi, Database, Activity } from 'lucide-react';

export default function DeviceNetworkMap() {
  const nodes = [
    { id: '1', label: 'Main Router', x: '50%', y: '20%', icon: <Server className="w-5 h-5 text-purple-400" /> },
    { id: '2', label: 'AI Core Backend', x: '15%', y: '60%', icon: <Database className="w-5 h-5 text-cyan-400" /> },
    { id: '3', label: 'Living Room ESP32', x: '50%', y: '85%', icon: <Cpu className="w-5 h-5 text-emerald-400" /> },
    { id: '4', label: 'Office Node', x: '85%', y: '60%', icon: <Activity className="w-5 h-5 text-amber-400" /> },
  ];

  return (
    <div className="h-full flex flex-col min-h-[400px]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg text-white tracking-wide">Network Topology Viewer</h2>
        <div className="flex items-center gap-2">
          <Wifi className="text-cyan-400 w-4 h-4" />
          <span className="text-xs font-mono text-cyan-400 bg-cyan-900/20 px-2 py-1 rounded border border-cyan-500/30">Node-RED Active</span>
        </div>
      </div>

      <div className="flex-1 relative bg-black/40 rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center">
        {/* Placeholder Grid Background */}
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)', backgroundSize: '30px 30px' }} />

        {/* CSS Connection Lines (Simplified for responsive layout) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
           <defs>
             <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
               <stop offset="0%" stopColor="rgba(168, 85, 247, 0.5)" />
               <stop offset="100%" stopColor="rgba(34, 211, 238, 0.5)" />
             </linearGradient>
           </defs>
           {/* Abstract connections */}
           <motion.path
             d="M 50% 20% L 15% 60% L 50% 85% L 85% 60% Z"
             fill="none"
             stroke="url(#lineGrad)"
             strokeWidth="2"
             strokeDasharray="4 4"
             initial={{ pathLength: 0 }}
             animate={{ pathLength: 1 }}
             transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
             vectorEffect="non-scaling-stroke"
           />
           <motion.path
             d="M 50% 20% L 50% 85%"
             fill="none"
             stroke="url(#lineGrad)"
             strokeWidth="2"
             strokeDasharray="4 4"
             initial={{ pathLength: 0 }}
             animate={{ pathLength: 1 }}
             transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
             vectorEffect="non-scaling-stroke"
             style={{ transformOrigin: "center" }}
           />
        </svg>

        {/* Nodes */}
        {nodes.map(node => (
          <div key={node.id} className="absolute flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing hover:scale-110 transition-transform" style={{ left: node.x, top: node.y }}>
            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/20 shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-center justify-center relative group">
              <div className="absolute inset-0 rounded-xl bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              {node.icon}
            </div>
            <span className="mt-2 text-[10px] font-mono text-slate-300 uppercase tracking-wider bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded shadow-sm whitespace-nowrap border border-white/10">{node.label}</span>
          </div>
        ))}

        {/* Action button overlay */}
        <div className="absolute bottom-4 right-4 text-xs font-mono text-white/50 bg-slate-900/80 px-4 py-2 rounded-lg border border-white/10 hover:text-white hover:border-cyan-500/50 cursor-pointer transition-colors backdrop-blur-md shadow-xl flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
          Deploy Logic
        </div>
      </div>
    </div>
  );
}
