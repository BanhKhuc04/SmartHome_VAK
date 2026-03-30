import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Bell, Info, AlertTriangle, AlertCircle, CheckCircle2, 
    Trash2, Check, Filter, Calendar, Zap, ShieldAlert, Cpu
} from 'lucide-react';
import { apiService } from '../../shared/services/api.service';

interface Notification {
    id: number;
    type: 'info' | 'warning' | 'danger' | 'success';
    title: string;
    message: string;
    status: 'unread' | 'read';
    created_at: string;
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unread' | 'danger' | 'warning'>('all');

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const res = await apiService.getNotifications();
            if (res.success) {
                setNotifications(res.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const markAsRead = async (id: number) => {
        try {
            await apiService.markNotificationAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'read' } : n));
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const deleteNotification = async (id: number) => {
        try {
            await apiService.deleteNotification(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    };

    const clearAll = async () => {
        if (!confirm('Clear all notification history?')) return;
        try {
            await apiService.clearAllNotifications();
            setNotifications([]);
        } catch (error) {
            console.error('Failed to clear notifications:', error);
        }
    };

    const filtered = notifications.filter(n => {
        if (filter === 'unread') return n.status === 'unread';
        if (filter === 'danger') return n.type === 'danger';
        if (filter === 'warning') return n.type === 'warning';
        return true;
    });

    const getTypeStyles = (type: string) => {
        switch (type) {
            case 'danger': return { icon: AlertCircle, color: 'text-nexus-danger', bg: 'bg-red-50', border: 'border-red-100' };
            case 'warning': return { icon: AlertTriangle, color: 'text-nexus-warning', bg: 'bg-amber-50', border: 'border-amber-100' };
            case 'success': return { icon: CheckCircle2, color: 'text-nexus-success', bg: 'bg-emerald-50', border: 'border-emerald-100' };
            default: return { icon: Info, color: 'text-nexus-primary', bg: 'bg-blue-50', border: 'border-blue-100' };
        }
    };

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col gap-6 animate-fade-in relative">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">System Notifications</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Event Intelligence Matrix v1.2</p>
                </div>
                <div className="flex gap-4">
                    <div className="flex p-1 bg-white border border-black/[0.03] rounded-2xl shadow-soft">
                        {[
                            { id: 'all', label: 'All' },
                            { id: 'unread', label: 'Unread' },
                            { id: 'danger', label: 'Alerts' },
                        ].map(f => (
                            <button 
                                key={f.id}
                                onClick={() => setFilter(f.id as any)}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filter === f.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <button 
                        onClick={clearAll}
                        className="flex items-center gap-2 px-6 py-3 bg-white border border-red-100 text-red-500 rounded-2xl shadow-soft hover:bg-red-50 transition-all text-[10px] font-black uppercase"
                    >
                        <Trash2 size={14} /> Clear All
                    </button>
                </div>
            </div>

            <div className="flex-1 nexus-card p-0 overflow-hidden bg-white/50 backdrop-blur-md border border-black/[0.03] flex flex-col">
                <div className="p-6 border-b border-black/[0.03] flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{filtered.length} Events Logged</span>
                    <div className="flex items-center gap-2">
                        <Filter size={14} className="text-slate-400" />
                        <span className="text-[10px] font-black text-slate-900 uppercase">Filtered by {filter}</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 nexus-scrollbar">
                    {loading ? (
                        <div className="h-full flex items-center justify-center py-20 opacity-30">
                            <div className="w-10 h-10 border-4 border-nexus-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center py-20 text-center opacity-30">
                            <Bell size={48} className="mb-4" />
                            <p className="text-[10px] font-black uppercase text-slate-900">Zero active alerts<br/>Everything is normal</p>
                        </div>
                    ) : (
                        <AnimatePresence initial={false}>
                            {filtered.map(notif => {
                                const styles = getTypeStyles(notif.type);
                                return (
                                    <motion.div
                                        key={notif.id}
                                        layout
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className={`p-5 rounded-3xl border transition-all flex gap-5 group items-start ${styles.bg} ${styles.border} ${notif.status === 'unread' ? 'ring-2 ring-nexus-primary/20 ring-offset-2' : ''}`}
                                    >
                                        <div className={`p-3 rounded-2xl shadow-sm bg-white ${styles.color}`}>
                                            <styles.icon size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className="text-sm font-black text-slate-900 tracking-tight">{notif.title}</h4>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {new Date(notif.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-[11px] font-bold text-slate-600 mt-1 uppercase tracking-tight leading-relaxed">
                                                {notif.message}
                                            </p>
                                            <div className="mt-4 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {notif.status === 'unread' && (
                                                    <button 
                                                        onClick={() => markAsRead(notif.id)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-black/[0.03] rounded-xl text-[9px] font-black uppercase text-slate-600 hover:bg-slate-50 transition-all"
                                                    >
                                                        <Check size={12} /> Mark Read
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => deleteNotification(notif.id)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-50 rounded-xl text-[9px] font-black uppercase text-red-500 hover:bg-red-50 transition-all"
                                                >
                                                    <Trash2 size={12} /> Delete
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    )}
                </div>
            </div>

            {/* AI Summary Sidebar (Optional/Visual) */}
            <div className="absolute right-0 top-32 w-64 translate-x-[110%] hidden xl:block">
                <div className="nexus-card bg-slate-900 p-6 space-y-6">
                    <div className="flex items-center gap-2">
                         <ShieldAlert className="text-nexus-danger" size={16} />
                         <span className="text-[10px] font-black uppercase text-white tracking-widest">Active Threats</span>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed">
                        Nexus Security Engine is active. 0 motion detections in restricted zones during past 24h.
                    </p>
                    <div className="h-px bg-white/10" />
                    <div className="flex items-center gap-2">
                         <Cpu className="text-nexus-primary" size={16} />
                         <span className="text-[10px] font-black uppercase text-white tracking-widest">System Health</span>
                    </div>
                    <div className="space-y-3">
                        {['Node-Red', 'Mosquitto', 'Ollama'].map(s => (
                            <div key={s} className="flex justify-between items-center text-[9px] font-black uppercase">
                                <span className="text-slate-500">{s}</span>
                                <span className="text-nexus-success">Active</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

