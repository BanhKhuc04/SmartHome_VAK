import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Activity,
    Cpu,
    LayoutDashboard,
    Menu,
    Settings,
    Server,
    TerminalSquare,
    X,
} from 'lucide-react';
import { ToastProvider } from './shared/components/Toast';
import { Screensaver } from './shared/components/Screensaver';
import { SettingsProvider, useSettings } from './shared/contexts/SettingsContext';
import { useAuth, AuthProvider } from './shared/hooks/useAuth';
import { useWebSocket } from './shared/hooks/useWebSocket';
import { LoginPage } from './features/auth/LoginPage';
import AdvancedDashboard from './features/advanced-dashboard/AdvancedDashboard';
import DeviceManager from './features/devices/DeviceManager';
import { LogsPage } from './features/logs/LogsPage';
import AutomationBuilder from './features/automation-builder/AutomationBuilder';
import { SettingsPage } from './features/settings/SettingsPage';
import SystemPage from './features/system/SystemPage';
import './styles/index.css';

type PageId = 'dashboard' | 'modules' | 'automation' | 'logs' | 'system' | 'settings';

function AppShell() {
    const { settings, updateSettings } = useSettings();
    const { isAuthenticated, isLoading, user, logout } = useAuth();
    const [activePage, setActivePage] = useState<PageId>('dashboard');
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [wsConnected, setWsConnected] = useState(false);

    useWebSocket((message) => {
        if (message.type === 'connection_status') {
            setWsConnected(true);
        }
    });

    useEffect(() => {
        if (!wsConnected) {
            const timer = window.setTimeout(() => setWsConnected(false), 3500);
            return () => window.clearTimeout(timer);
        }
        return undefined;
    }, [wsConnected]);

    const navItems = useMemo(() => [
        { id: 'dashboard' as PageId, label: 'Dashboard', icon: LayoutDashboard },
        { id: 'modules' as PageId, label: 'Module Center', icon: Cpu },
        { id: 'automation' as PageId, label: 'Automation', icon: Activity },
        { id: 'logs' as PageId, label: 'Logs', icon: TerminalSquare },
        { id: 'system' as PageId, label: 'System', icon: Server },
        { id: 'settings' as PageId, label: 'Settings', icon: Settings },
    ], []);

    const renderPage = () => {
        switch (activePage) {
            case 'dashboard':
                return <AdvancedDashboard />;
            case 'modules':
                return <DeviceManager />;
            case 'automation':
                return <AutomationBuilder />;
            case 'logs':
                return <LogsPage />;
            case 'system':
                return <SystemPage />;
            case 'settings':
                return <SettingsPage />;
            default:
                return <AdvancedDashboard />;
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-primary">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-nexus-primary to-cyan-400 mx-auto mb-5 animate-pulse" />
                    <p className="text-sm font-semibold text-secondary">Booting HomeCore Nexus...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <LoginPage />;
    }

    return (
        <Screensaver idleTimeout={settings.screensaverTimeout * 1000}>
            <div className="min-h-screen text-primary">
                <div className={`fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-40 lg:hidden ${mobileNavOpen ? 'block' : 'hidden'}`} onClick={() => setMobileNavOpen(false)} />

                <aside className={`fixed left-0 top-0 h-full w-[280px] glass-v2 z-50 border-r border-white/10 transition-transform duration-300 lg:translate-x-0 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="p-6 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-[22px] bg-gradient-to-br from-nexus-primary to-cyan-400 flex items-center justify-center text-white shadow-premium">
                                    <Server size={26} />
                                </div>
                                <div>
                                    <h1 className="text-xl font-black tracking-tight text-primary">HomeCore Nexus</h1>
                                    <p className="text-[10px] uppercase font-black tracking-[0.22em] text-muted">Control Center</p>
                                </div>
                            </div>
                            <button className="lg:hidden p-2 rounded-xl hover:bg-white/10" onClick={() => setMobileNavOpen(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        <nav className="space-y-2 flex-1">
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setActivePage(item.id);
                                        setMobileNavOpen(false);
                                    }}
                                    className={`sidebar-nav-item ${activePage === item.id ? 'active' : ''}`}
                                >
                                    <item.icon size={18} />
                                    <span className="uppercase tracking-[0.12em] text-[11px] font-black">{item.label}</span>
                                </button>
                            ))}
                        </nav>

                        <div className="pt-6 border-t border-white/10 space-y-3">
                            <div className="rounded-2xl bg-black/5 px-4 py-3">
                                <div className="text-[10px] uppercase font-black tracking-[0.2em] text-muted mb-2">Realtime Link</div>
                                <div className={`inline-flex items-center gap-2 text-xs font-semibold ${wsConnected ? 'text-emerald-400' : 'text-amber-300'}`}>
                                    <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400' : 'bg-amber-300'}`} />
                                    {wsConnected ? 'WebSocket online' : 'Waiting for backend event'}
                                </div>
                            </div>
                            <div className="rounded-2xl bg-black/5 px-4 py-3">
                                <div className="text-sm font-black text-primary">{user?.username}</div>
                                <div className="text-[10px] uppercase font-black tracking-[0.18em] text-muted">Authenticated Operator</div>
                            </div>
                            <button
                                onClick={() => logout()}
                                className="w-full rounded-2xl bg-white text-slate-900 py-3 text-[11px] font-black uppercase tracking-[0.18em] shadow-soft hover:shadow-premium transition-all"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </aside>

                <div className="lg:ml-[280px] min-h-screen flex flex-col">
                    <header className="sticky top-0 z-30 backdrop-blur-2xl bg-black/5 border-b border-white/10 px-4 sm:px-6 lg:px-10 py-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                                <button className="lg:hidden p-3 rounded-2xl glass-v2" onClick={() => setMobileNavOpen(true)}>
                                    <Menu size={18} />
                                </button>
                                <div>
                                    <div className="text-[10px] uppercase font-black tracking-[0.24em] text-muted">Orange Pi One</div>
                                    <div className="text-xl sm:text-2xl font-black tracking-tight text-primary">
                                        {navItems.find((item) => item.id === activePage)?.label}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
                                    className="rounded-2xl glass-v2 px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em]"
                                >
                                    Theme: {settings.theme}
                                </button>
                            </div>
                        </div>
                    </header>

                    <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 lg:py-8">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activePage}
                                initial={{ opacity: 0, y: 18 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -12 }}
                                transition={{ duration: 0.25, ease: 'easeOut' }}
                                className="max-w-[1600px] mx-auto"
                            >
                                {renderPage()}
                            </motion.div>
                        </AnimatePresence>
                    </main>
                </div>
            </div>
        </Screensaver>
    );
}

function App() {
    return (
        <SettingsProvider>
            <AuthProvider>
                <ToastProvider>
                    <AppShell />
                </ToastProvider>
            </AuthProvider>
        </SettingsProvider>
    );
}

export default App;
