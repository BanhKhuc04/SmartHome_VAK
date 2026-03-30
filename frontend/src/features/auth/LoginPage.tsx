import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    User, Lock, Mail, ArrowRight, Sparkles, 
    ShieldCheck, Eye, EyeOff, LogIn
} from 'lucide-react';
import { useAuth } from '../../shared/hooks/useAuth';

const MeshBackground = () => (
    <div className="fixed inset-0 overflow-hidden z-0 pointer-events-none">
        <motion.div 
            animate={{ 
                x: [0, 100, 0],
                y: [0, -50, 0],
                scale: [1, 1.2, 1],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/20 blur-[120px] rounded-full"
        />
        <motion.div 
            animate={{ 
                x: [0, -80, 0],
                y: [0, 100, 0],
                scale: [1, 1.5, 1],
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-400/20 blur-[150px] rounded-full"
        />
        <motion.div 
            animate={{ 
                opacity: [0.3, 0.6, 0.3],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-white/30 blur-[100px] rounded-full"
        />
    </div>
);

export const LoginPage: React.FC = () => {
    const { login, register, error, isLoading } = useAuth();
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isRegister) {
            await register(username, email, password);
        } else {
            await login(username, password);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        visible: { 
            opacity: 1, 
            scale: 1,
            transition: { 
                type: "spring",
                stiffness: 100,
                damping: 15,
                staggerChildren: 0.1
            }
        },
        exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center p-6 bg-slate-50/50 overflow-hidden">
            <MeshBackground />

            <AnimatePresence mode="wait">
                <motion.div
                    key={isRegister ? 'register' : 'login'}
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="relative z-10 w-full max-w-[440px] nexus-card p-10 bg-white/70 backdrop-blur-[32px] border border-white/60 shadow-premium"
                >
                    <div className="flex flex-col items-center text-center mb-10">
                        <motion.div 
                            initial={{ rotate: -10, scale: 0.8 }}
                            animate={{ rotate: 0, scale: 1 }}
                            className="w-20 h-20 bg-gradient-to-br from-nexus-primary to-nexus-secondary rounded-[28px] flex items-center justify-center text-white shadow-lg mb-6 relative group"
                        >
                            <div className="absolute inset-0 bg-white/20 blur-xl group-hover:blur-2xl transition-all rounded-[28px] -z-10" />
                            <ShieldCheck size={40} strokeWidth={1.5} />
                        </motion.div>
                        
                        <motion.h1 
                            variants={itemVariants}
                            className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2"
                        >
                            Nexus OS <span className="text-nexus-primary">v2</span>
                        </motion.h1>
                        <motion.p 
                            variants={itemVariants}
                            className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2"
                        >
                            Unified Intelligence Core
                        </motion.p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <motion.div variants={itemVariants} className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Architect Alias</label>
                            <div className="relative group">
                                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-nexus-primary transition-colors" size={18} />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    required
                                    placeholder="Username"
                                    className="w-full bg-white/50 border border-slate-200/60 rounded-full py-4 pl-14 pr-6 text-sm font-bold placeholder:text-slate-300 outline-none focus:ring-4 focus:ring-nexus-primary/10 focus:border-nexus-primary transition-all tabular-nums text-slate-800"
                                />
                            </div>
                        </motion.div>

                        {isRegister && (
                            <motion.div variants={itemVariants} className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Neural Link ID</label>
                                <div className="relative group">
                                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-nexus-primary transition-colors" size={18} />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        required
                                        placeholder="Email Address"
                                        className="w-full bg-white/50 border border-slate-200/60 rounded-full py-4 pl-14 pr-6 text-sm font-bold placeholder:text-slate-300 outline-none focus:ring-4 focus:ring-nexus-primary/10 focus:border-nexus-primary transition-all text-slate-800"
                                    />
                                </div>
                            </motion.div>
                        )}

                        <motion.div variants={itemVariants} className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Access Cipher</label>
                            <div className="relative group">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-nexus-primary transition-colors" size={18} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    placeholder="Password"
                                    className="w-full bg-white/50 border border-slate-200/60 rounded-full py-4 pl-14 pr-14 text-sm font-bold placeholder:text-slate-300 outline-none focus:ring-4 focus:ring-nexus-primary/10 focus:border-nexus-primary transition-all tracking-widest text-slate-800"
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-nexus-primary transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </motion.div>

                        <AnimatePresence>
                            {(error || isLoading) && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    {error ? (
                                        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-[10px] font-bold text-rose-500 uppercase tracking-widest text-center">
                                            {error}
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-nexus-primary/10 border border-nexus-primary/20 rounded-2xl text-[10px] font-bold text-nexus-primary uppercase tracking-widest text-center flex items-center justify-center gap-3">
                                            <Sparkles size={14} className="animate-spin" /> Verifying Credentials...
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <motion.button
                            variants={itemVariants}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-slate-900 text-white rounded-full py-5 font-black uppercase text-[11px] tracking-[0.2em] shadow-premium hover:shadow-hover transition-all flex items-center justify-center gap-3 group disabled:opacity-50"
                        >
                            {isRegister ? (
                                <>Initialize Core <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>
                            ) : (
                                <>Authenticate Access <LogIn size={16} className="group-hover:translate-x-1 transition-transform" /></>
                            )}
                        </motion.button>

                        <motion.div 
                            variants={itemVariants}
                            className="text-center pt-4"
                        >
                            <button
                                type="button"
                                onClick={() => setIsRegister(!isRegister)}
                                className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-nexus-primary transition-colors"
                            >
                                {isRegister ? (
                                    <>Already synchronized? <span className="text-nexus-primary">Login</span></>
                                ) : (
                                    <>Request new access? <span className="text-nexus-primary">Initialize</span></>
                                )}
                            </button>
                        </motion.div>
                    </form>

                    {!isRegister && (
                        <motion.div 
                            variants={itemVariants}
                            className="mt-8 pt-6 border-t border-slate-100/50 flex flex-col items-center gap-2"
                        >
                            <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em]">Matrix Guest Access</p>
                            <code className="text-[10px] font-bold text-slate-400">admin / admin123</code>
                        </motion.div>
                    )}
                </motion.div>
            </AnimatePresence>
            
            <div className="fixed bottom-10 text-[9px] font-black text-slate-400 uppercase tracking-[0.5em] pointer-events-none z-10">
                Nexus Intelligence © 2026 • Build Stable 2.0.4
            </div>
        </div>
    );
};
