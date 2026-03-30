import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, Send, Bot } from 'lucide-react';

export default function AIAgentWidget() {
  const [isListening, setIsListening] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'agent', text: 'System metrics nominal. How can I assist you today, Commander?' }
  ]);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text: input }]);
    setInput('');
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'agent', text: 'Executing command structure. Rerouting power.' }]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full z-10 min-h-[400px]">
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <Bot className="text-cyan-400 w-6 h-6 z-10 relative" />
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-cyan-500/20 rounded-full blur-md"
          />
        </div>
        <h2 className="font-semibold text-lg text-white tracking-wide">Nexus AI</h2>
        <div className="ml-auto text-xs font-mono text-cyan-400/70 border border-cyan-400/20 px-2 py-1 rounded bg-cyan-900/10 shrink-0">
          v4.0.2
        </div>
      </div>

      {/* Voice wave animation */}
      <div className="h-16 flex items-center justify-center gap-1 mb-4 select-none">
        {[...Array(9)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              height: isListening ? [10, 40, 15, 60, 10] : [10, 15, 12, 16, 10],
            }}
            transition={{
              duration: isListening ? 0.8 : 2,
              repeat: Infinity,
              delay: i * 0.1,
              ease: "easeInOut"
            }}
            className="w-1.5 bg-gradient-to-t from-cyan-600 to-cyan-300 rounded-full"
            style={{ minHeight: '4px' }}
          />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4 scrollbar-thin scrollbar-thumb-white/10">
        {messages.map((msg, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={idx} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`text-sm py-2 px-3 rounded-2xl max-w-[85%] ${
              msg.role === 'user' 
                ? 'bg-purple-500/20 text-purple-100 border border-purple-500/30 rounded-br-sm' 
                : 'bg-white/5 text-slate-300 border border-white/10 rounded-bl-sm font-mono'
            }`}>
              {msg.text}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="relative mt-auto">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Command interface..." 
          className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-4 pr-24 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-colors placeholder:text-slate-600 font-mono"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <button 
            onClick={() => setIsListening(!isListening)}
            className={`p-2 rounded-lg transition-colors ${isListening ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Mic className="w-4 h-4" />
          </button>
          <button onClick={handleSend} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
