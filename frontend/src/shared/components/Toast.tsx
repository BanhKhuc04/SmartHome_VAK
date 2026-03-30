import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

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

    const icons: Record<ToastType, string> = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const colors: Record<ToastType, string> = {
        success: 'rgba(16,185,129,0.2)', error: 'rgba(239,68,68,0.2)',
        info: 'rgba(59,130,246,0.2)', warning: 'rgba(245,158,11,0.2)',
    };
    const borderColors: Record<ToastType, string> = {
        success: 'rgba(16,185,129,0.4)', error: 'rgba(239,68,68,0.4)',
        info: 'rgba(59,130,246,0.4)', warning: 'rgba(245,158,11,0.4)',
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div style={{ position: 'fixed', top: 'var(--space-4)', right: 'var(--space-4)', zIndex: 10001, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', pointerEvents: 'none' }}>
                {toasts.map(toast => (
                    <div key={toast.id} style={{
                        padding: 'var(--space-3) var(--space-5)',
                        background: colors[toast.type],
                        backdropFilter: 'blur(20px)',
                        border: `1px solid ${borderColors[toast.type]}`,
                        borderRadius: 'var(--radius-lg)',
                        color: 'var(--text-primary)',
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 500,
                        animation: 'slideInRight 0.3s ease-out',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                        pointerEvents: 'auto',
                        minWidth: '250px',
                        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                    }}>
                        <span style={{ fontSize: '1.2rem' }}>{icons[toast.type]}</span>
                        {toast.message}
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
