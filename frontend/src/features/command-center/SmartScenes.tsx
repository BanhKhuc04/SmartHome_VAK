import { motion } from 'framer-motion';
import { Gamepad2, BookOpen, MonitorPlay, Moon } from 'lucide-react';

const scenes = [
  {
    id: 1,
    title: 'CS:GO / Gaming',
    desc: 'Dims ambient to neon cyan. High network priority routing.',
    icon: <Gamepad2 className="w-5 h-5" />,
    activeColors: { bg: 'bg-cyan-900/20', border: 'border-cyan-500/50', iconBg: 'bg-cyan-500/20', text: 'text-cyan-400', glow: 'bg-cyan-500/20' },
    active: true,
  },
  {
    id: 2,
    title: 'Study / Focus',
    desc: 'Cool white lights. Mutes non-essential notifications.',
    icon: <BookOpen className="w-5 h-5" />,
    activeColors: { bg: 'bg-purple-900/20', border: 'border-purple-500/50', iconBg: 'bg-purple-500/20', text: 'text-purple-400', glow: 'bg-purple-500/20' },
    active: false,
  },
  {
    id: 3,
    title: 'Cinema Mode',
    desc: 'Pitch black lighting. Dolby Atmos eq preset enabled.',
    icon: <MonitorPlay className="w-5 h-5" />,
    activeColors: { bg: 'bg-amber-900/20', border: 'border-amber-500/50', iconBg: 'bg-amber-500/20', text: 'text-amber-400', glow: 'bg-amber-500/20' },
    active: false,
  },
  {
    id: 4,
    title: 'Sleep Routine',
    desc: 'Fade out over 30m. Arms house perimeter security.',
    icon: <Moon className="w-5 h-5" />,
    activeColors: { bg: 'bg-slate-800/50', border: 'border-slate-500/50', iconBg: 'bg-slate-700/50', text: 'text-slate-300', glow: 'bg-slate-500/20' },
    active: false,
  }
];

export default function SmartScenes() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-semibold text-lg text-white tracking-wide">Smart Scenes & Routines</h2>
        <span className="text-xs font-mono text-slate-400 bg-black/20 px-2 py-1 rounded border border-white/5">Auto-trigger enabled</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
        {scenes.map((scene) => (
          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            key={scene.id}
            className={`cursor-pointer rounded-2xl p-4 border transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
              scene.active 
                ? `${scene.activeColors.bg} ${scene.activeColors.border} shadow-[0_0_15px_rgba(34,211,238,0.1)]` 
                : 'bg-black/20 border-white/10 hover:bg-white/5'
            }`}
          >
            {scene.active && (
              <div className={`absolute top-0 right-0 w-16 h-16 ${scene.activeColors.glow} blur-2xl rounded-full`} />
            )}
            <div className="flex items-center gap-3 mb-4 relative z-10 w-full">
              <div className={`p-2 rounded-xl shrink-0 ${scene.active ? `${scene.activeColors.iconBg} ${scene.activeColors.text}` : 'bg-white/5 text-slate-400'}`}>
                {scene.icon}
              </div>
              <h3 className={`font-medium text-sm truncate ${scene.active ? 'text-white' : 'text-slate-300'}`}>{scene.title}</h3>
              {scene.active && (
                <div className="ml-auto w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.8)] shrink-0" />
              )}
            </div>
            <p className="text-xs text-slate-400/80 leading-relaxed font-mono relative z-10">
              {scene.desc}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
