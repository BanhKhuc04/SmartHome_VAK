import React, { ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useToast } from '../components/Toast';
import { apiService } from '../services/api.service';
import { getApiErrorMessage, normalizeApiError } from '../services/api-errors';

interface User {
    id: number;
    username: string;
    email: string;
    role: string;
}

interface AuthContextValue {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const { showToast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const checkAuth = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await apiService.getMe();
            setUser((data as User) || null);
        } catch {
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        checkAuth();

        const handleExpired = (event: Event) => {
            const detail = (event as CustomEvent<{ message?: string; silent?: boolean }>).detail;
            setUser(null);
            setError(detail?.message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            if (!detail?.silent) {
                showToast(detail?.message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'warning');
            }
        };

        window.addEventListener('auth:session-expired', handleExpired);
        return () => window.removeEventListener('auth:session-expired', handleExpired);
    }, [checkAuth, showToast]);

    const login = useCallback(async (username: string, password: string) => {
        setError(null);
        try {
            const result = await apiService.login(username, password) as { user: User } | undefined;
            if (result?.user) {
                setUser(result.user);
                return true;
            }
            return false;
        } catch (error: unknown) {
            const normalized = normalizeApiError(error);
            const message = getApiErrorMessage(error);
            setUser(null);
            setError(message);
            if (!normalized.isSessionExpired) {
                showToast(message, normalized.isRateLimited ? 'warning' : 'error');
            }
            return false;
        }
    }, [showToast]);

    const logout = useCallback(async () => {
        try {
            await apiService.logout();
        } finally {
            setUser(null);
            setError(null);
        }
    }, []);

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, error, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
