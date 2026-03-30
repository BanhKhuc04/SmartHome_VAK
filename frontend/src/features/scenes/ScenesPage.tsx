import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Sparkles, Sunset, Moon, Coffee, 
    Tv, PartyPopper, Play, Settings2, Plus,
    HeartPulse
} from 'lucide-react';

const SCENES = [
    { id: 'morning', name: 'Alunni Morning', icon: Coffee, color: 'from-orange-400 to-amber-500', desc: 'Lights 20%, Natural Gradual Fade-in' },
    { id: 'movie', name: 'Cinematic Movie', icon: Tv, color: 'from-purple-600 to-indigo-900', desc: 'Blinds Down, Ambient 5%, OLED Optimized' },
    { id: 'sleep', name: 'Midnight Rest', icon: Moon, color: 'from-slate-800 to-black', desc: 'All Relays OFF, HVAC Eco Mode' },
    { id: 'party', name: 'Neon Party', icon: PartyPopper, color: 'from-pink-500 to-rose-600', desc: 'RGB Cycles, Dynamic Beats Sync' },
];

export default function ScenesPage() {
    const [activeScene, setActiveScene] = useState<string | null>(null);

    return (
        <div className="space-y-10 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Atmospheric Scenes</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Multi-Node Preset Orchestration</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-white border border-black/[0.03] text-slate-900 rounded-2xl shadow-soft hover:shadow-premium transition-all text-[10px] font-black uppercase">
                    <Plus size={14} /> New Composition
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {SCENES.map((scene) => (
                    <motion.div
                        key={scene.id}
                        whileHover={{ y: -5 }}
                        className="relative h-64 nexus-card p-0 overflow-hidden group border-none"
                    >
                        {/* Background Gradient */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${scene.color} opacity-90 transition-transform duration-700 group-hover:scale-110`} />
                        
                        {/* Glass Overlay */}
                        <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px] pointer-events-none" />

                        <div className="relative h-full p-8 flex flex-col justify-between z-10">
                            <div className="flex justify-between items-start">
                                <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 text-white shadow-xl">
                                    <scene.icon size={24} />
                                </div>
                                <button className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white border border-white/20 transition-all">
                                    <Settings2 size={18} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">{scene.name}</h3>
                                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-1">{scene.desc}</p>
                                </div>
                                
                                <button 
                                    onClick={() => setActiveScene(scene.id)}
                                    className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${activeScene === scene.id ? 'bg-white text-slate-900 shadow-2xl' : 'bg-white/20 text-white border border-white/30 hover:bg-white/30'}`}
                                >
                                    {activeScene === scene.id ? (
                                        <>
                                            <HeartPulse size={14} className="animate-pulse" /> Scene Engaged
                                        </>
                                    ) : (
                                        <>
                                            <Play size={14} fill="currentColor" /> Activate Scene
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Visual Pulse for active state */}
                        <AnimatePresence>
                            {activeScene === scene.id && (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute top-4 right-4"
                                >
                                    <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                ))}
            </div>

            <div className="nexus-card bg-slate-900 p-8 border-none overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-nexus-primary/20 blur-[100px] -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-center md:text-left">
                        <h4 className="text-white text-xl font-black uppercase tracking-tight">AI Smart-Orchestration</h4>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1 italic">"Aria is analyzing your patterns to suggest the perfect Lighting/HVAC presets"</p>
                    </div>
                    <button className="px-8 py-4 bg-nexus-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-premium hover:shadow-hover transition-all">
                        Generate AI Scene
                    </button>
                </div>
            </div>
        </div>
    );
}
