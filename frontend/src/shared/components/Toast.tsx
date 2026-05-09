import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let toastId = 0;

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = ++toastId;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    }, []);

    const icons: Record<ToastType, ReactNode> = {
        success: <CheckCircle2 size={16} />,
        error: <XCircle size={16} />,
        info: <Info size={16} />,
        warning: <AlertTriangle size={16} />,
    };
    const colors: Record<ToastType, string> = {
        success: 'rgba(16,185,129,0.15)', error: 'rgba(239,68,68,0.15)',
        info: 'rgba(59,130,246,0.15)', warning: 'rgba(245,158,11,0.15)',
    };
    const borderColors: Record<ToastType, string> = {
        success: 'rgba(16,185,129,0.3)', error: 'rgba(239,68,68,0.3)',
        info: 'rgba(59,130,246,0.3)', warning: 'rgba(245,158,11,0.3)',
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 10001, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
                {toasts.map(toast => (
                    <div key={toast.id} style={{
                        padding: '10px 16px',
                        background: colors[toast.type],
                        backdropFilter: 'blur(20px)',
                        border: `1px solid ${borderColors[toast.type]}`,
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-primary)',
                        fontSize: 13,
                        fontWeight: 600,
                        animation: 'slideInRight 0.3s ease-out',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                        pointerEvents: 'auto',
                        minWidth: 260,
                        maxWidth: 380,
                        display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                        <span style={{ display: 'inline-flex', color: 'var(--text-primary)', flexShrink: 0 }}>{icons[toast.type]}</span>
                        <span>{toast.message}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export function useToast(): ToastContextType {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
}
