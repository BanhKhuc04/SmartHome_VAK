import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Zap, Cpu, MousePointer2, Home, 
  Layers, Activity, ShieldCheck, Bell, ListTodo, 
  Settings, User, LogOut, Search, Clock, Map,
  BarChart3, Share2, Sparkles, Sun, Moon,
} from 'lucide-react';

import { ToastProvider } from './shared/components/Toast';
import { SettingsProvider, useSettings } from './shared/contexts/SettingsContext';
import { Screensaver } from './shared/components/Screensaver';
import { AuthProvider, useAuth } from './shared/hooks/useAuth';

import { LoginPage } from './features/auth/LoginPage';
import NotificationsPage from './features/notifications/NotificationsPage';
import RoomsPage from './features/rooms/RoomsPage';
import ScenesPage from './features/scenes/ScenesPage';
import SecurityPage from './features/security/SecurityPage';
import { LogsPage } from './features/logs/LogsPage';
import { SettingsPage } from './features/settings/SettingsPage';

import DeviceManager from './features/devices/DeviceManager';
import AIAssistant from './features/ai-assistant/AIAssistant';
import AdvancedDashboard from './features/advanced-dashboard/AdvancedDashboard';
import AutomationBuilder from './features/automation-builder/AutomationBuilder';
import HouseMapPage from './features/house-map/HouseMapPage';
import EnergyAnalyticsPage from './features/energy/EnergyAnalyticsPage';
import AIRobot from './features/ai-assistant/AIRobot';
import { useWebSocket } from './shared/hooks/useWebSocket';
import { apiService } from './shared/services/api.service';
import './styles/index.css';

type PageId = 'dashboard' | 'devices' | 'automation' | 'ai' | 'rooms' | 'map' | 'scenes' | 'energy' | 'security' | 'notifications' | 'logs' | 'settings';

function AppContent() {
  const { isAuthenticated, user, logout, isLoading } = useAuth();
  const { settings, updateSettings } = useSettings();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [unreadCount, setUnreadCount] = useState(0);

  // Real-time Notifications
  useWebSocket((msg) => {
    if (msg.type === 'notification') {
      setUnreadCount(prev => prev + 1);
    }
  });

  useEffect(() => {
    if (isAuthenticated) {
      apiService.getNotifications(1, 1).then(res => {
        // Just a simple count for now, in production you'd get actual unread count
        // For demo, we'll just check if there are any unread in the first page
        const unread = res.data?.filter((n: any) => n.status === 'unread').length || 0;
        setUnreadCount(unread);
      });
    }
  }, [isAuthenticated, activePage]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)', animation: 'pulse 2s infinite' }}>🏠</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>Đang tải Home Smart...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const navItems = [
    { id: 'dashboard' as PageId, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'map' as PageId, label: 'House Map', icon: Map },
    { id: 'devices' as PageId, label: 'Devices', icon: Cpu },
    { id: 'energy' as PageId, label: 'Energy', icon: BarChart3 },
    { id: 'automation' as PageId, label: 'Automation', icon: Share2 },
    { id: 'ai' as PageId, label: 'Aria AI', icon: Sparkles },
    { id: 'rooms' as PageId, label: 'Rooms', icon: Layers },
    { id: 'scenes' as PageId, label: 'Scenes', icon: Activity },
    { id: 'security' as PageId, label: 'Security', icon: ShieldCheck },
    { id: 'notifications' as PageId, label: 'Notifications', icon: Bell },
    { id: 'logs' as PageId, label: 'System Logs', icon: ListTodo },
    { id: 'settings' as PageId, label: 'Settings', icon: Settings },
  ];

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <AdvancedDashboard />;
      case 'map': return <HouseMapPage />;
      case 'devices': return <DeviceManager />;
      case 'energy': return <EnergyAnalyticsPage />;
      case 'automation': return <AutomationBuilder />;
      case 'ai': return <AIAssistant />;
      case 'notifications': return <NotificationsPage />;
      case 'logs': return <LogsPage />;
      case 'settings': return <SettingsPage />;
      case 'rooms': return <RoomsPage />;
      case 'scenes': return <ScenesPage />;
      case 'security': return <SecurityPage />;
      default: return <AdvancedDashboard />;
    }
  };

    return (
        <Screensaver idleTimeout={settings.screensaverTimeout * 1000}>
      <div className="flex min-h-screen bg-nexus-bg dark:bg-slate-900 text-primary dark:text-white font-inter selection:bg-nexus-primary/20 selection:text-nexus-primary transition-colors duration-500">
        {/* Sidebar */}
        <aside 
          onMouseEnter={() => setSidebarOpen(true)}
          onMouseLeave={() => setSidebarOpen(false)}
          className={`fixed left-0 top-0 h-full glass-v2 z-50 transition-all duration-700 ease-[cubic-bezier(0.2,0,0,1)] border-r border-white/10 ${sidebarOpen ? 'w-80' : 'w-24'}`}
          style={{ borderRadius: '0 32px 32px 0' }}
        >
          <div className="p-6 flex flex-col h-full">
            {/* Logo Area */}
            <div className="flex items-center gap-4 mb-10 px-2 mt-4">
              <div className="w-12 h-12 rounded-2xl bg-nexus-accent shadow-premium flex items-center justify-center shrink-0">
                <Zap className="text-white" size={24} fill="currentColor" />
              </div>
              {sidebarOpen && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }} 
                >
                  <h1 className="text-xl font-black tracking-tighter text-primary">NEXUS<span className="text-nexus-primary">OS</span></h1>
                  <p className="text-[9px] font-black text-muted uppercase tracking-widest leading-none">Command Center</p>
                </motion.div>
              )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-none">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  className={`sidebar-nav-item ${activePage === item.id ? 'active' : ''}`}
                >
                  <item.icon size={20} className={activePage === item.id ? 'stroke-[2.5px]' : 'stroke-2'} />
                  {sidebarOpen && (
                    <span className="truncate pr-4 uppercase tracking-[0.1em] text-[11px] font-black">
                      {item.label}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            {/* User Profile */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <div className="flex items-center gap-4 mb-4 px-2">
                 <div className="w-10 h-10 rounded-full bg-white/40 border border-white/60 shadow-sm flex items-center justify-center text-nexus-primary shrink-0 overflow-hidden">
                    <User size={20} />
                 </div>
                 {sidebarOpen && (
                   <div className="overflow-hidden">
                    <p className="text-[11px] font-black uppercase truncate text-primary">{user?.username || 'Admin'}</p>
                     <p className="text-[9px] font-bold text-muted uppercase tracking-widest">Architect</p>
                   </div>
                 )}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col ml-24 min-h-screen relative overflow-hidden">
          {/* Top Navbar */}
          <header className="sticky top-0 z-40 bg-glass backdrop-blur-xl border-b border-glass px-10 h-24 flex items-center justify-between shadow-sm transition-colors duration-500">
            <div className="flex items-center gap-4 flex-1 max-w-xl">
               <div className="relative w-full group">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-nexus-primary" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search smart system..." 
                    className="input-glass w-full pl-14"
                  />
               </div>
            </div>

             <div className="flex items-center gap-6">
               <button
                onClick={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
                className="relative p-3 bg-white dark:bg-slate-800 border border-black/[0.03] dark:border-white/5 rounded-2xl shadow-soft hover:shadow-premium transition-all text-slate-400 dark:text-slate-300 hover:text-nexus-primary dark:hover:text-nexus-primary"
                title={settings.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
               >
                  {settings.theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
               </button>

               <button 
                onClick={() => setActivePage('notifications')}
                className="relative p-3 bg-white dark:bg-slate-800 border border-black/[0.03] dark:border-white/5 rounded-2xl shadow-soft hover:shadow-premium transition-all text-slate-400 dark:text-slate-300 hover:text-nexus-primary dark:hover:text-nexus-primary"
               >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-4 h-4 bg-nexus-danger border-2 border-white rounded-full flex items-center justify-center text-[8px] font-black text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
               </button>

               <div className="h-8 w-px bg-white/10" />

               <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                     <p className="text-[11px] font-black text-primary leading-none uppercase tracking-tighter">{user?.username || 'Admin'}</p>
                     <div className="flex items-center gap-1 justify-end mt-1.5 opacity-50">
                        <div className="w-1 h-1 rounded-full bg-nexus-primary" />
                        <p className="text-[9px] font-bold text-muted uppercase tracking-widest">Super User</p>
                     </div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-glass border border-glass shadow-premium p-0.5 overflow-hidden">
                     <div className="w-full h-full rounded-xl bg-slate-500/10 overflow-hidden" />
                  </div>
               </div>
            </div>
          </header>

          {/* Dynamic Page Content */}
          <main className="flex-1 p-6 lg:p-10 overflow-y-auto nexus-scrollbar relative">
            {/* Background Base */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-slate-100/50 -z-10" />
            <AnimatePresence mode="wait">
              <motion.div
                key={activePage}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="w-full max-w-[1600px] mx-auto"
              >
                {renderPage()}
              </motion.div>
            </AnimatePresence>
          </main>

        {/* Floating Holographic AI Assistant */}
        <div className="fixed bottom-10 right-10 z-[60] pointer-events-none">
           <motion.div 
             initial={{ scale: 0, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             whileHover={{ scale: 1.1 }}
             className="pointer-events-auto cursor-pointer group relative"
             onClick={() => setActivePage('ai')}
           >
              <div className="absolute inset-0 bg-nexus-primary/20 rounded-full blur-2xl group-hover:bg-nexus-primary/40 transition-all duration-500" />
              <div className="relative w-24 h-24 bg-white/40 backdrop-blur-3xl border-2 border-white rounded-full shadow-premium flex items-center justify-center overflow-hidden">
                 <div className="scale-[0.6]">
                    <AIRobot initialState="happy" embedded={true} />
                 </div>
              </div>
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                 <div className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 whitespace-nowrap">
                    <div className="w-1.5 h-1.5 rounded-full bg-nexus-success animate-pulse" />
                    Aria Online
                 </div>
                 <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-900 mx-auto" />
              </div>
           </motion.div>
        </div>
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
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}

export default App;
