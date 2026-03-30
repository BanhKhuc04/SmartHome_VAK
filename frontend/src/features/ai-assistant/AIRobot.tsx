import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Terminal } from 'lucide-react';

export type RobotState = 'idle' | 'happy' | 'thinking' | 'sleep' | 'alert';

interface AIRobotProps {
    initialState?: RobotState;
    embedded?: boolean;
    size?: 'sm' | 'base' | 'lg';
}

export default function AIRobot({ initialState = 'idle', embedded = false, size = 'base' }: AIRobotProps) {
    const [robotState, setRobotState] = useState<RobotState>(initialState);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState([
        { role: 'ai', content: 'Good evening. All systems are running normally. How can I assist you today?' }
    ]);
    const robotRef = useRef<HTMLDivElement>(null);

    // Track mouse position
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!robotRef.current) return;
            const rect = robotRef.current.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const moveX = (e.clientX - centerX) / window.innerWidth;
            const moveY = (e.clientY - centerY) / window.innerHeight;
            
            // Adjust tracking sensitivity based on size
            const multiplier = size === 'lg' ? 40 : 20;
            setMousePos({ x: moveX * multiplier, y: moveY * multiplier });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [size]);

    // Random blinks
    useEffect(() => {
        const blinkInterval = setInterval(() => {
            if (robotState === 'idle' || robotState === 'happy') {
                const prevState = robotState;
                setRobotState('sleep');
                setTimeout(() => setRobotState(prevState), 150);
            }
        }, 5000 + Math.random() * 5000);
        return () => clearInterval(blinkInterval);
    }, [robotState]);

    const handleSendMessage = async () => {
        if (!message.trim()) return;
        const userPrompt = message;
        setChatHistory(prev => [...prev, { role: 'user', content: userPrompt }]);
        setMessage('');
        setRobotState('thinking');
        try {
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: userPrompt })
            });
            const data = await res.json();
            if (data.success) {
                setRobotState('happy');
                setChatHistory(prev => [...prev, { role: 'ai', content: data.data.response }]);
                setTimeout(() => setRobotState('idle'), 3000);
            } else {
                setRobotState('alert');
                setChatHistory(prev => [...prev, { role: 'ai', content: "Error" }]);
                setTimeout(() => setRobotState('idle'), 3000);
            }
        } catch (err) {
            setRobotState('alert');
            setChatHistory(prev => [...prev, { role: 'ai', content: "Connection lost." }]);
            setTimeout(() => setRobotState('idle'), 3000);
        }
    }

    const renderEyes = () => {
        const eyeColor = {
            idle: '#22d3ee',
            happy: '#10b981',
            thinking: '#a855f7',
            sleep: '#64748b',
            alert: '#f59e0b'
        }[robotState];

        return (
            <svg width="60" height="20" viewBox="0 0 60 20" className="drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]" style={{ filter: `drop-shadow(0 0 8px ${eyeColor}80)` }}>
                {robotState === 'sleep' ? (
                    <>
                        <line x1="10" y1="10" x2="20" y2="10" stroke={eyeColor} strokeWidth="3" strokeLinecap="round" />
                        <line x1="40" y1="10" x2="50" y2="10" stroke={eyeColor} strokeWidth="3" strokeLinecap="round" />
                    </>
                ) : robotState === 'happy' ? (
                    <>
                        <path d="M10 12 Q15 5 20 12" fill="none" stroke={eyeColor} strokeWidth="3" strokeLinecap="round" />
                        <path d="M40 12 Q45 5 50 12" fill="none" stroke={eyeColor} strokeWidth="3" strokeLinecap="round" />
                    </>
                ) : (
                    <>
                        <circle cx="15" cy="10" r="4" fill={eyeColor} />
                        <circle cx="45" cy="10" r="4" fill={eyeColor} />
                    </>
                )}
            </svg>
        );
    };

    const containerSizeClass = size === 'lg' ? 'w-[360px] h-[360px]' : size === 'sm' ? 'w-16 h-16' : 'w-24 h-24';
    const innerSizeClass = size === 'lg' ? 'w-[320px] h-[320px]' : size === 'sm' ? 'w-14 h-14' : 'w-20 h-20';
    const scaleClass = size === 'lg' ? 'scale-[4]' : size === 'sm' ? 'scale-[0.7]' : 'scale-100';

    const RobotFace = (
        <motion.div 
            ref={robotRef}
            whileHover={!embedded ? { scale: 1.05 } : {}}
            onClick={() => !embedded && setIsOpen(!isOpen)}
            animate={{ y: [0, size === 'lg' ? -20 : -8, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className={`${containerSizeClass} rounded-full bg-slate-900 border-2 border-white/5 shadow-2xl flex items-center justify-center relative ${!embedded ? 'cursor-pointer pointer-events-auto group' : ''}`}
        >
            {/* Pulsing Glow Border */}
            <motion.div 
                animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.02, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className={`absolute inset-0 rounded-full blur-xl ${
                    robotState === 'idle' ? 'bg-cyan-500/30' :
                    robotState === 'happy' ? 'bg-emerald-500/30' :
                    robotState === 'thinking' ? 'bg-purple-500/30' :
                    robotState === 'alert' ? 'bg-amber-500/30' : 'bg-slate-500/20'
                }`} 
            />
            
            <div className={`${innerSizeClass} rounded-full bg-black flex items-center justify-center relative overflow-hidden border border-white/10 z-10 shadow-[inset_0_0_60px_rgba(0,0,0,0.8)]`}>
                <motion.div 
                    animate={{ x: mousePos.x, y: mousePos.y }}
                    transition={{ type: "spring", stiffness: size === 'lg' ? 200 : 400, damping: size === 'lg' ? 40 : 30 }}
                    className={`relative z-10 flex flex-col items-center justify-center ${scaleClass}`}
                >
                    {renderEyes()}
                    <div className={`h-1 rounded-full mt-2 transition-all duration-300 ${
                        robotState === 'happy' ? 'bg-emerald-500/30 w-10 opacity-100' :
                        robotState === 'idle' ? 'bg-cyan-500/10 w-8 opacity-50' : 'opacity-0'
                    }`} />
                </motion.div>
            </div>
        </motion.div>
    );

    if (embedded) return RobotFace;

    return (
        <div className="fixed bottom-10 right-10 z-50 flex flex-col items-end gap-6 pointer-events-none">
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="w-96 bg-white/90 backdrop-blur-2xl border border-black/[0.03] rounded-[32px] shadow-premium flex flex-col overflow-hidden pointer-events-auto"
                    >
                        <div className="p-6 border-b border-black/[0.03] flex justify-between items-center">
                            <h4 className="text-xs font-black uppercase text-slate-900 tracking-widest">Nexus Core Chat</h4>
                            <button onClick={() => setIsOpen(false)}><X size={16} className="text-slate-400" /></button>
                        </div>
                        <div className="h-64 overflow-y-auto p-6 space-y-4">
                            {chatHistory.map((c, i) => (
                                <div key={i} className={`flex ${c.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-4 rounded-2xl text-[11px] font-bold ${c.role === 'user' ? 'bg-nexus-primary text-white' : 'bg-slate-50 text-slate-700'}`}>
                                        {c.content}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-black/[0.03] flex gap-2">
                             <input 
                                type="text" 
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Command..."
                                className="flex-1 bg-white border border-black/[0.03] rounded-xl px-4 py-2 text-xs font-bold outline-none"
                             />
                             <button onClick={handleSendMessage} className="p-2 bg-nexus-primary text-white rounded-xl"><Send size={16} /></button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            {RobotFace}
        </div>
    );
}
