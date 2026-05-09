import React, { ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiService } from '../services/api.service';

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

        const handleExpired = () => {
            setUser(null);
            setError('Session expired. Please log in again.');
        };

        window.addEventListener('auth:session-expired', handleExpired);
        return () => window.removeEventListener('auth:session-expired', handleExpired);
    }, [checkAuth]);

    const login = useCallback(async (username: string, password: string) => {
        setError(null);
        try {
            const result = await apiService.login(username, password) as { user: User } | undefined;
            if (result?.user) {
                setUser(result.user);
                return true;
            }
            return false;
        } catch (error: any) {
            setError(error.response?.data?.error || error.message || 'Login failed');
            return false;
        }
    }, []);

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
