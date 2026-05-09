import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Activity,
    Cpu,
    LayoutDashboard,
    LogOut,
    Menu,
    Moon,
    Settings,
    Server,
    Sun,
    TerminalSquare,
    X,
} from 'lucide-react';
import { ToastProvider } from './shared/components/Toast';
import { LoadingScreen } from './shared/components/LoadingScreen';
import { SettingsProvider, useSettings } from './shared/contexts/SettingsContext';
import { useAuth, AuthProvider } from './shared/hooks/useAuth';
import { apiService } from './shared/services/api.service';
import { useWebSocket } from './shared/hooks/useWebSocket';
import { LoginPage } from './features/auth/LoginPage';
import AdvancedDashboard from './features/advanced-dashboard/AdvancedDashboard';
import DeviceManager from './features/devices/DeviceManager';
import { LogsPage } from './features/logs/LogsPage';
import AutomationBuilder from './features/automation-builder/AutomationBuilder';
import { SettingsPage } from './features/settings/SettingsPage';
import SystemPage from './features/system/SystemPage';
import { SystemHealth } from './shared/types';
import './styles/index.css';

type PageId = 'dashboard' | 'modules' | 'automation' | 'logs' | 'system' | 'settings';

function AppShell() {
    const { settings, updateSettings } = useSettings();
    const { isAuthenticated, isLoading, user, logout } = useAuth();
    const [activePage, setActivePage] = useState<PageId>('dashboard');
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [health, setHealth] = useState<SystemHealth | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const { isConnected: wsConnected } = useWebSocket((message) => {
        if (message.type === 'connection_status') {
            return;
        }
        if (message.type === 'system_health') {
            setHealth(message.payload as SystemHealth);
        }
    });

    useEffect(() => {
        void apiService.getSystemHealth().then(setHealth).catch(() => setHealth(null));
    }, []);

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
        return <LoadingScreen />;
    }

    if (!isAuthenticated) {
        return <LoginPage />;
    }

    return (
        <div className="min-h-screen">
            {/* Mobile overlay */}
            {mobileNavOpen && (
                <div
                    className="fixed inset-0 z-40 lg:hidden"
                    style={{ background: 'var(--overlay-bg)' }}
                    onClick={() => setMobileNavOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed left-0 top-0 h-full z-50 border-r transition-transform duration-300 lg:translate-x-0 ${
                    mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
                style={{
                    width: 'var(--sidebar-width)',
                    background: 'var(--bg-sidebar)',
                    backdropFilter: 'blur(24px)',
                    borderColor: 'var(--border-primary)',
                    boxShadow: '24px 0 64px rgba(2, 8, 23, 0.32)',
                }}
            >
                <div className="h-full flex flex-col" style={{ padding: '20px 16px' }}>
                    {/* Logo */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div
                                className="flex items-center justify-center text-white"
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 14,
                                    background: 'linear-gradient(135deg, var(--nexus-primary), var(--nexus-cyan))',
                                    boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)',
                                }}
                            >
                                <Server size={20} />
                            </div>
                            <div>
                                <h1 className="text-base font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                                    HomeCore Nexus
                                </h1>
                                <p
                                    className="font-extrabold uppercase"
                                    style={{
                                        fontSize: 9,
                                        letterSpacing: '0.2em',
                                        color: 'var(--text-muted)',
                                    }}
                                >
                                    Command Center
                                </p>
                            </div>
                        </div>
                        <button
                            className="lg:hidden p-2 rounded-lg"
                            style={{ color: 'var(--text-secondary)' }}
                            onClick={() => setMobileNavOpen(false)}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-1">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setActivePage(item.id);
                                    setMobileNavOpen(false);
                                }}
                                className={`sidebar-nav-item ${activePage === item.id ? 'active' : ''}`}
                            >
                                <item.icon size={16} />
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </nav>

                    {/* Bottom section */}
                    <div className="space-y-3 pt-4" style={{ borderTop: '1px solid var(--border-primary)' }}>
                        <div className="nexus-inset" style={{ display: 'grid', gap: 10 }}>
                            <div
                                className="font-extrabold uppercase"
                                style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--text-muted)' }}
                            >
                                Control Plane
                            </div>
                            {[
                                { label: 'Backend', ok: health !== null, value: health ? 'Ready' : 'Waiting' },
                                { label: 'MQTT', ok: health?.mqtt.connected ?? false, value: health?.mqtt.connected ? 'Linked' : 'Offline' },
                                { label: 'WebSocket', ok: wsConnected, value: wsConnected ? 'Live' : 'Retrying' },
                            ].map((item) => (
                                <div key={item.label} className="flex items-center justify-between gap-3" style={{ fontSize: 12 }}>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="block rounded-full"
                                            style={{
                                                width: 7,
                                                height: 7,
                                                background: item.ok ? '#10b981' : '#f59e0b',
                                                boxShadow: item.ok
                                                    ? '0 0 8px rgba(16,185,129,0.4)'
                                                    : '0 0 8px rgba(245,158,11,0.28)',
                                            }}
                                        />
                                        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{item.label}</span>
                                    </div>
                                    <span style={{ color: item.ok ? '#34d399' : '#fbbf24', fontWeight: 700 }}>{item.value}</span>
                                </div>
                            ))}
                        </div>

                        {/* User info */}
                        <div className="nexus-inset">
                            <div className="font-bold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                                {user?.username}
                            </div>
                            <div
                                className="font-extrabold uppercase"
                                style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--text-muted)' }}
                            >
                                Operator
                            </div>
                        </div>

                        {/* Logout */}
                        <button
                            onClick={() => logout()}
                            className="btn-ghost w-full justify-center"
                            style={{ padding: '8px 16px', fontSize: 11 }}
                        >
                            <LogOut size={14} />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content area */}
            <div className="lg:ml-[260px] min-h-screen flex flex-col">
                {/* Topbar */}
                <header
                    className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 sm:px-6"
                    style={{
                        height: 'var(--header-height)',
                        background: 'var(--bg-header)',
                        backdropFilter: 'blur(20px)',
                        borderBottom: '1px solid var(--border-primary)',
                    }}
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            className="lg:hidden p-2 rounded-lg"
                            style={{
                                background: 'var(--bg-inset)',
                                border: '1px solid var(--border-primary)',
                                color: 'var(--text-primary)',
                            }}
                            onClick={() => setMobileNavOpen(true)}
                        >
                            <Menu size={18} />
                        </button>
                        <div>
                            <div
                                className="font-extrabold uppercase"
                                style={{ fontSize: 9, letterSpacing: '0.2em', color: 'var(--text-muted)' }}
                            >
                                Orange Pi One
                            </div>
                            <div
                                className="font-black tracking-tight"
                                style={{ fontSize: 18, color: 'var(--text-primary)', lineHeight: 1.2 }}
                            >
                                {navItems.find((item) => item.id === activePage)?.label}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 min-w-0">
                        <div className="hidden md:flex items-center gap-2 mr-2">
                            <span className="status-chip">
                                <span className="dot" style={{ background: health ? '#10b981' : '#f59e0b' }} />
                                Backend
                            </span>
                            <span className="status-chip">
                                <span className="dot" style={{ background: health?.mqtt.connected ? '#10b981' : '#f59e0b' }} />
                                MQTT
                            </span>
                            <span className="status-chip">
                                <span className="dot" style={{ background: wsConnected ? '#10b981' : '#f59e0b' }} />
                                WS
                            </span>
                            <span className="status-chip">
                                <span className="dot" style={{ background: health?.sqlite.connected ? '#10b981' : '#f59e0b' }} />
                                SQLite
                            </span>
                        </div>

                        <div className="hidden lg:flex topbar-clock mr-2">
                            {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>

                        {/* Theme toggle */}
                        <button
                            onClick={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
                            className="p-2 rounded-lg transition-colors"
                            style={{
                                background: 'var(--bg-inset)',
                                border: '1px solid var(--border-primary)',
                                color: 'var(--text-secondary)',
                            }}
                            title={`Switch to ${settings.theme === 'dark' ? 'light' : 'dark'} mode`}
                        >
                            {settings.theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                        </button>
                    </div>
                </header>

                {/* Page content — starts immediately below header */}
                <main className="flex-1" style={{ padding: 'var(--page-pad-y) var(--page-pad-x)' }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activePage}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="mx-auto"
                            style={{ maxWidth: 'var(--content-max-width)' }}
                        >
                            {renderPage()}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}

function App() {
    return (
        <SettingsProvider>
            <ToastProvider>
                <AuthProvider>
                    <AppShell />
                </AuthProvider>
            </ToastProvider>
        </SettingsProvider>
    );
}

export default App;
