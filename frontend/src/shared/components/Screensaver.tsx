import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSettings, CustomImage } from '../contexts/SettingsContext';
import { apiService } from '../services/api.service';
import { SystemHealth } from '../types';

interface ScreensaverProps {
    idleTimeout?: number; // ms before screensaver activates
    children: React.ReactNode;
}

interface Particle {
    x: number; y: number; vx: number; vy: number;
    radius: number; opacity: number; hue: number;
}

interface Ripple {
    x: number; y: number; radius: number; opacity: number; maxRadius: number;
}

export const Screensaver: React.FC<ScreensaverProps> = ({ idleTimeout = 30000, children }) => {
    const { settings } = useSettings();
    const { 
        screensaverBackground: type, 
        activeCustomImageIds, 
        customScreensaverImages, 
        slideshowInterval 
    } = settings;
    
    const [lastActive, setLastActive] = useState(Date.now());
    const [isIdle, setIsIdle] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [ripples, setRipples] = useState<Ripple[]>([]);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animFrameRef = useRef<number>(0);
    const particlesRef = useRef<Particle[]>([]);
    const mousePos = useRef({ x: 0, y: 0 });
    const isWakingUp = useRef(false);
    const idleStartTimeRef = useRef(0);

    const GRACE_PERIOD = 1500;

    // Get selected media objects
    const activeMedia = useMemo(() => {
        return activeCustomImageIds
            .map(id => customScreensaverImages.find(img => img.id === id))
            .filter((img): img is CustomImage => !!img);
    }, [activeCustomImageIds, customScreensaverImages]);

    // Background URLs based on type
    const getStaticBackgroundUrl = () => {
        switch (type) {
            case 'space': return 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1920&auto=format&fit=crop';
            case 'nature': return 'https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=1920&auto=format&fit=crop';
            case 'ocean': return 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?q=80&w=1920&auto=format&fit=crop';
            default: return '';
        }
    };

    const staticBgUrl = getStaticBackgroundUrl();

    // Generate particles
    const initParticles = useCallback(() => {
        const particles: Particle[] = [];
        for (let i = 0; i < 60; i++) {
            particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                radius: Math.random() * 3 + 1,
                opacity: Math.random() * 0.5 + 0.2,
                hue: 200 + Math.random() * 60,
            });
        }
        particlesRef.current = particles;
    }, []);

    // Animate particles on canvas
    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particlesRef.current.forEach((p, i) => {
                particlesRef.current.forEach((p2, j) => {
                    if (i >= j) return;
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 150) {
                        ctx.beginPath();
                        ctx.strokeStyle = `hsla(${p.hue}, 70%, 60%, ${0.15 * (1 - dist / 150)})`;
                        ctx.lineWidth = 0.5;
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                });

                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

                ctx.beginPath();
                const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3);
                gradient.addColorStop(0, `hsla(${p.hue}, 80%, 70%, ${p.opacity})`);
                gradient.addColorStop(1, `hsla(${p.hue}, 80%, 70%, 0)`);
                ctx.fillStyle = gradient;
                ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
                ctx.fill();
            });
            animFrameRef.current = requestAnimationFrame(draw);
        };
        draw();
    }, []);

    // Consolidated Idle Timer Logic
    useEffect(() => {
        if (isWakingUp.current) return;

        const checkIdle = () => {
            const now = Date.now();
            if (!isIdle && now - lastActive >= idleTimeout) {
                setIsIdle(true);
                idleStartTimeRef.current = now;
                initParticles();
            }
        };

        const timer = setInterval(checkIdle, 1000);
        return () => clearInterval(timer);
    }, [isIdle, lastActive, idleTimeout, initParticles]);

    // Slideshow transition logic
    useEffect(() => {
        if (isIdle && activeMedia.length > 1) {
            const timer = setInterval(() => {
                setCurrentIndex(prev => (prev + 1) % activeMedia.length);
            }, slideshowInterval * 1000);
            return () => clearInterval(timer);
        } else if (!isIdle) {
            setCurrentIndex(0);
        }
    }, [isIdle, activeMedia.length, slideshowInterval]);

    // Reset idle timer / Trigger wake up
    const handleInteraction = useCallback((e?: Event) => {
        const now = Date.now();
        
        if (isIdle) {
            // Check grace period to prevent immediate dismissal from "fake" events
            if (now - idleStartTimeRef.current < GRACE_PERIOD) return;
            if (isWakingUp.current) return;

            // Trigger Wake Up
            isWakingUp.current = true;
            const mx = mousePos.current.x || window.innerWidth / 2;
            const my = mousePos.current.y || window.innerHeight / 2;
            
            const newRipples: Ripple[] = [];
            for (let i = 0; i < 3; i++) {
                newRipples.push({
                    x: mx + (Math.random() - 0.5) * 100,
                    y: my + (Math.random() - 0.5) * 100,
                    radius: 0,
                    opacity: 0.6 - i * 0.15,
                    maxRadius: 300 + i * 200,
                });
            }
            setRipples(newRipples);
            setIsTransitioning(true);

            setTimeout(() => {
                setIsIdle(false);
                setLastActive(Date.now());
                cancelAnimationFrame(animFrameRef.current);
            }, 400);

            setTimeout(() => {
                setIsTransitioning(false);
                setRipples([]);
                isWakingUp.current = false;
            }, 1200);
            return;
        }

        // If not idle, just update last active
        setLastActive(now);
    }, [isIdle]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (mousePos.current.x === e.clientX && mousePos.current.y === e.clientY) return;
        mousePos.current = { x: e.clientX, y: e.clientY };
        handleInteraction(e);
    }, [handleInteraction]);

    useEffect(() => {
        const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
        const genericHandler = (e: Event) => handleInteraction(e);
        
        window.addEventListener('mousemove', handleMouseMove);
        events.forEach(e => window.addEventListener(e, genericHandler));
        
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            events.forEach(e => window.removeEventListener(e, genericHandler));
            cancelAnimationFrame(animFrameRef.current);
        };
    }, [handleInteraction, handleMouseMove]);

    useEffect(() => {
        if (isIdle && type === 'default') {
            animate();
        }
        return () => cancelAnimationFrame(animFrameRef.current);
    }, [isIdle, animate, type]);

    useEffect(() => {
        if (ripples.length === 0) return;
        const interval = setInterval(() => {
            setRipples(prev => prev.map(r => ({
                ...r,
                radius: r.radius + 12,
                opacity: Math.max(0, r.opacity - 0.012),
            })).filter(r => r.opacity > 0));
        }, 16);
        return () => clearInterval(interval);
    }, [ripples.length]);

    return (
        <>
            {children}

            <AnimatePresence>
                {isIdle && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="screensaver-overlay"
                        style={{
                            position: 'fixed', inset: 0, zIndex: 9999,
                            background: staticBgUrl ? `url(${staticBgUrl}) center/cover no-repeat` : 'linear-gradient(135deg, #0a0a1a 0%, #0d1117 30%, #1a0a2e 70%, #0a1628 100%)',
                            cursor: 'none',
                        }}
                    >
                        {/* Custom Slideshow Layer */}
                        {type === 'custom' && activeMedia.length > 0 && activeMedia[currentIndex] && (
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeMedia[currentIndex].id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 1.5, ease: "easeInOut" }}
                                    className="absolute inset-0"
                                >
                                    {activeMedia[currentIndex].type === 'video' ? (
                                        <video 
                                            src={activeMedia[currentIndex].url} 
                                            muted 
                                            loop 
                                            autoPlay 
                                            playsInline
                                            onError={() => {
                                                console.error('Screensaver video load failed, skipping...');
                                                setCurrentIndex(prev => (prev + 1) % activeMedia.length);
                                            }}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <img 
                                            src={activeMedia[currentIndex].url} 
                                            alt="Custom Screensaver" 
                                            className="w-full h-full object-cover"
                                            style={{
                                                filter: activeMedia[currentIndex].filters ? 
                                                    `brightness(${activeMedia[currentIndex].filters?.brightness}%) contrast(${activeMedia[currentIndex].filters?.contrast}%) blur(${activeMedia[currentIndex].filters?.blur}px) ${activeMedia[currentIndex].filters?.grayscale ? 'grayscale(100%)' : ''}` : 'none'
                                            }}
                                        />
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        )}

                        {/* Vignette Overlay (Always visible if background is an image/video) */}
                        {(staticBgUrl || type === 'custom') && (
                            <div className="absolute inset-0" style={{
                                background: 'radial-gradient(circle at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 80%, rgba(0,0,0,0.9) 100%)'
                            }} />
                        )}

                        {type === 'default' && <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />}
                        {type === 'monitor' && <ScreensaverMonitor />}

                        {/* Clock UI (Hidden in Monitor mode) */}
                        {type !== 'monitor' && (
                            <div style={{
                                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                                textAlign: 'center', zIndex: 1,
                            }}>
                            <div style={{
                                fontSize: 'clamp(4rem, 12vw, 8rem)', fontWeight: 200,
                                background: type === 'default'
                                    ? 'linear-gradient(135deg, rgba(99,102,241,0.9), rgba(168,85,247,0.9), rgba(59,130,246,0.9))'
                                    : 'white',
                                WebkitBackgroundClip: 'text', WebkitTextFillColor: type === 'default' ? 'transparent' : 'white',
                                letterSpacing: '0.05em', fontFamily: "'Inter', system-ui, sans-serif",
                                textShadow: type !== 'default' ? '0 4px 20px rgba(0,0,0,0.5)' : 'none',
                                lineHeight: 1, marginBottom: '0.5rem',
                            }}>
                                <ScreensaverClock />
                            </div>
                            <div style={{
                                fontSize: 'clamp(1rem, 3vw, 1.5rem)', fontWeight: 300,
                                color: type === 'default' ? 'rgba(148,163,184,0.6)' : 'rgba(255,255,255,0.8)',
                                letterSpacing: '0.2em',
                                textTransform: 'uppercase',
                            }}>
                                <ScreensaverDate />
                            </div>
                            <div style={{
                                marginTop: '3rem', fontSize: '0.875rem',
                                color: type === 'default' ? 'rgba(148,163,184,0.3)' : 'rgba(255,255,255,0.5)',
                                animation: 'pulse 3s ease-in-out infinite',
                            }}>
                                HomeCore Nexus • Di chuột để quay lại
                            </div>
                        </div>
                        )}

                        {/* Floating orbs for default background */}
                        {type === 'default' && (
                            <div className="screensaver-orbs">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} style={{
                                        position: 'absolute',
                                        width: `${200 + i * 80}px`, height: `${200 + i * 80}px`,
                                        borderRadius: '50%',
                                        background: `radial-gradient(circle, hsla(${220 + i * 30}, 70%, 50%, 0.08), transparent)`,
                                        top: `${15 + i * 20}%`, left: `${10 + i * 22}%`,
                                        animation: `screensaverFloat ${8 + i * 3}s ease-in-out infinite alternate`,
                                        animationDelay: `${i * 1.5}s`,
                                        filter: 'blur(40px)',
                                    }} />
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Water ripple transition */}
            {isTransitioning && ripples.map((ripple, i) => (
                <div key={i} style={{
                    position: 'fixed', zIndex: 10000,
                    left: ripple.x - ripple.radius,
                    top: ripple.y - ripple.radius,
                    width: ripple.radius * 2,
                    height: ripple.radius * 2,
                    borderRadius: '50%',
                    border: `2px solid rgba(99, 102, 241, ${ripple.opacity})`,
                    boxShadow: `
                        0 0 ${20 + ripple.radius * 0.1}px rgba(99, 102, 241, ${ripple.opacity * 0.3}),
                        inset 0 0 ${10 + ripple.radius * 0.05}px rgba(139, 92, 246, ${ripple.opacity * 0.15})
                    `,
                    backdropFilter: ripple.opacity > 0.2 ? `blur(${Math.max(0, 8 - ripple.radius * 0.02)}px)` : 'none',
                    pointerEvents: 'none',
                    transition: 'none',
                }} />
            ))}
        </>
    );
};

const ScreensaverClock: React.FC = () => {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    return <>{time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</>;
};

const ScreensaverDate: React.FC = () => {
    const [date] = useState(new Date());
    return <>{date.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</>;
};

const ScreensaverMonitor: React.FC = () => {
    const [health, setHealth] = useState<SystemHealth | null>(null);
    useEffect(() => {
        const fetchHealth = async () => {
            try {
                const res = await apiService.getSystemHealth();
                setHealth(res);
            } catch (e) {}
        };
        fetchHealth();
        const interval = setInterval(fetchHealth, 5000);
        return () => clearInterval(interval);
    }, []);

    if (!health) return <div className="absolute inset-0 flex items-center justify-center bg-black font-mono text-green-500/50">INITIALIZING SYSTEM DIAGNOSTICS...</div>;

    return (
        <div className="absolute inset-0 flex items-center justify-center bg-black font-mono text-green-500 selection:bg-green-500/30 p-4">
            {/* CRT scanline effect overlay */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 2px, 3px 100%' }} />
            
            <div className="max-w-4xl w-full p-8 border border-green-500/30 rounded shadow-[0_0_40px_rgba(34,197,94,0.05)] relative z-10 backdrop-blur-sm bg-black/40">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-green-500/30 pb-4 mb-8">
                    <div>
                        <div className="text-4xl font-black tracking-widest mb-1 drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]">NEXUS TERMINAL</div>
                        <div className="text-xs tracking-widest opacity-80">SYSTEM DIAGNOSTICS & TELEMETRY SUBSYSTEM</div>
                    </div>
                    <div className="text-right mt-4 md:mt-0">
                        <div className="text-3xl font-bold tracking-wider drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]"><ScreensaverClock /></div>
                        <div className="text-[10px] tracking-widest opacity-80 uppercase mt-1"><ScreensaverDate /></div>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-sm tracking-wider">
                    <div className="space-y-3">
                        <div className="text-[10px] tracking-[0.2em] opacity-50 mb-4 border-b border-green-500/20 pb-1">HOST DIAGNOSTICS</div>
                        <div className="flex justify-between"><span>HOSTNAME:</span> <span>{health.host.hostname}</span></div>
                        <div className="flex justify-between"><span>PLATFORM:</span> <span>{health.host.platform}</span></div>
                        <div className="flex justify-between"><span>UPTIME:</span> <span>{Math.floor(health.host.uptime_seconds / 3600)}h {Math.floor((health.host.uptime_seconds % 3600) / 60)}m</span></div>
                        <div className="flex justify-between items-center">
                            <span>MEMORY:</span> 
                            <span className="flex items-center gap-2">
                                <div className="w-24 h-1.5 bg-green-500/20 rounded overflow-hidden">
                                    <div className="h-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]" style={{ width: `${(1 - health.host.free_memory_bytes / health.host.total_memory_bytes) * 100}%` }} />
                                </div>
                                {(health.host.free_memory_bytes / 1024 / 1024).toFixed(0)} MB FREE
                            </span>
                        </div>
                    </div>
                    
                    <div className="space-y-3">
                        <div className="text-[10px] tracking-[0.2em] opacity-50 mb-4 border-b border-green-500/20 pb-1">NETWORK SERVICES</div>
                        <div className="flex justify-between"><span>BACKEND API:</span> <span className={health.status === 'healthy' ? '' : 'text-red-500 animate-pulse'}>{health.status === 'healthy' ? '[ ONLINE ]' : '[ DEGRADED ]'}</span></div>
                        <div className="flex justify-between"><span>MQTT BROKER:</span> <span className={health.mqtt.connected ? '' : 'text-red-500 animate-pulse'}>{health.mqtt.connected ? '[ CONNECTED ]' : '[ OFFLINE ]'}</span></div>
                        <div className="flex justify-between"><span>WEBSOCKET:</span> <span>[ {health.websocket.clients} ACTIVE ]</span></div>
                        <div className="flex justify-between"><span>SQLITE DB:</span> <span>{health.sqlite.connected ? '[ READY ]' : '[ OFFLINE ]'}</span></div>
                    </div>
                </div>
                
                <div className="mt-12 pt-4 border-t border-green-500/30 text-[10px] tracking-[0.2em] opacity-70 text-center animate-pulse">
                    &gt; SYSTEM IS RUNNING OPTIMALLY. AWAITING OPERATOR INPUT...
                </div>
            </div>
        </div>
    );
};
