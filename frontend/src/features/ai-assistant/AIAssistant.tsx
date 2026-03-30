import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Terminal } from 'lucide-react';
import AIRobot from './AIRobot';

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'System initialized. Nexus Core is at your service. How can I help you manage your home today?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const speak = (text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMsg })
      });
      const data = await res.json();
      
      setIsTyping(false);
      if (data.success) {
        const aiResponse = data.data.response;
        setMessages(prev => [...prev, { role: 'ai', content: aiResponse }]);
        speak(aiResponse);
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: "I encountered an error processing your request." }]);
      }
    } catch (err) {
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'ai', content: "Communication with Nexus Core was interrupted." }]);
    }
  };

  return (
    <div className="relative h-[calc(100vh-140px)] w-full flex flex-col items-center justify-between rounded-[40px] glass-v2 border border-white/20 shadow-premium overflow-hidden animate-fade-in group">
      
      {/* Immersive Cinematic Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-50/20 to-nexus-primary/10 pointer-events-none" />
      <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-nexus-primary/10 blur-[120px] rounded-full animate-pulse transition-all duration-[4000ms]" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-white/20 blur-[100px] rounded-t-[100%]" />

      {/* Floating Insights (Top Left/Right) */}
      <div className="absolute top-8 left-8 flex items-center gap-2 px-4 py-2 bg-white/40 backdrop-blur-md rounded-2xl border border-white shadow-soft">
         <div className="w-1.5 h-1.5 rounded-full bg-nexus-success animate-pulse" />
         <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Aria Engine Active</span>
      </div>
      <div className="absolute top-8 right-8 flex items-center gap-3">
         <button onClick={() => setVoiceEnabled(!voiceEnabled)} className={`px-4 py-2 bg-white/40 backdrop-blur-md rounded-2xl border border-white shadow-soft text-[10px] font-black uppercase tracking-widest transition-colors ${voiceEnabled ? 'text-nexus-primary' : 'text-slate-400'}`}>
            Voice {voiceEnabled ? 'On' : 'Off'}
         </button>
      </div>

      {/* Top/Center: Gigantic AI Core */}
      <div className="flex-1 flex flex-col items-center justify-center w-full z-10 relative mt-10">
        <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="relative"
        >
            <AIRobot initialState={isTyping ? 'thinking' : 'idle'} embedded={true} size="lg" />
            
            <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 text-center pointer-events-none">
               <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tighter drop-shadow-sm">Aria</h3>
               <p className="text-[10px] font-bold text-nexus-primary uppercase tracking-[0.3em] mt-2 drop-shadow-sm">Neural Command Interface</p>
            </div>
        </motion.div>
      </div>

      {/* Bottom Area: Messages & Input Container */}
      <div className="w-full max-w-4xl z-20 flex flex-col justify-end px-8 pb-10">
        
        {/* Chat History Overlay */}
        <div 
            ref={scrollRef} 
            className="w-full max-h-[35vh] overflow-y-auto scrollbar-none space-y-4 mb-6 relative"
            style={{ maskImage: 'linear-gradient(to bottom, transparent, black 15%, black)' }}
        >
           <div className="pt-20" /> {/* Spacer for mask gradient start */}
           {messages.map((msg, i) => (
             <motion.div 
               initial={{ opacity: 0, y: 10, scale: 0.98 }}
               animate={{ opacity: 1, y: 0, scale: 1 }}
               key={i} 
               className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
             >
                <div className={`max-w-[80%] p-5 backdrop-blur-xl border ${
                  msg.role === 'user' 
                  ? 'bg-nexus-primary/90 text-white shadow-[0_8px_30px_rgba(59,130,246,0.3)] border-nexus-primary rounded-[32px] rounded-tr-lg' 
                  : 'bg-white/80 text-slate-800 shadow-soft border-white rounded-[32px] rounded-tl-lg'
                }`}>
                   <p className="text-sm font-bold leading-relaxed">{msg.content}</p>
                   <div className={`text-[9px] mt-3 font-black uppercase tracking-[0.2em] ${msg.role === 'user' ? 'text-white/70' : 'text-slate-400'}`}>
                      {msg.role === 'user' ? 'Admin' : 'Aria'} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                   </div>
                </div>
             </motion.div>
           ))}
           {isTyping && (
             <div className="flex justify-start">
                <div className="bg-white/80 border border-white p-5 rounded-[32px] rounded-tl-lg shadow-soft backdrop-blur-xl">
                   <div className="flex gap-2">
                      <div className="w-2 h-2 rounded-full bg-nexus-primary animate-bounce shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                      <div className="w-2 h-2 rounded-full bg-nexus-secondary animate-bounce shadow-[0_0_8px_rgba(139,92,246,0.6)] [animation-delay:0.2s]" />
                      <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce shadow-[0_0_8px_rgba(34,211,238,0.6)] [animation-delay:0.4s]" />
                   </div>
                </div>
             </div>
           )}
           <div className="pb-4" /> {/* Bottom Spacer */}
        </div>

        {/* Glowing Input Bar */}
        <div className="relative group w-full">
            <div className="absolute -inset-1 bg-gradient-to-r from-nexus-primary via-nexus-secondary to-cyan-400 rounded-[32px] blur-xl opacity-20 group-focus-within:opacity-40 transition duration-500 animate-pulse" />
            <div className="relative bg-white/90 backdrop-blur-2xl border-2 border-white rounded-[32px] shadow-premium flex items-center pr-2 transition-transform duration-300 group-focus-within:scale-[1.01]">
                <div className="pl-6 text-nexus-primary opacity-60">
                    <Terminal size={22} className="animate-pulse" />
                </div>
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Command Aria to manage the house..."
                    className="flex-1 bg-transparent border-none outline-none px-4 py-5 text-sm font-bold text-slate-800 placeholder:text-slate-400/80"
                />
                <button 
                    onClick={handleSend}
                    className="bg-slate-900 text-white p-4 rounded-3xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all outline-none flex items-center justify-center gap-2 group/btn"
                >
                    <Send size={18} className="group-hover/btn:rotate-12 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest px-1 hidden sm:block">Execute</span>
                </button>
            </div>
        </div>

      </div>
    </div>
  );
}
