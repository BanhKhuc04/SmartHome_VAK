import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { apiService } from '../services/api.service';

interface User {
    id: number;
    username: string;
    email: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<boolean>;
    register: (username: string, email: string, password: string) => Promise<boolean>;
    logout: () => void;
    error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Verify session on initial mount or page refresh
    const checkAuth = useCallback(async () => {
        setIsLoading(true);
        console.log('[AuthContext] Verifying session...');
        try {
            const userData = await apiService.getMe();
            console.log('[AuthContext] Session verified:', userData);
            if (userData) {
                setUser(userData as User);
            }
        } catch (err) {
            console.warn('[AuthContext] No active session found');
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        checkAuth();

        // Listen for session expiration events from the API interceptor
        const handleSessionExpired = () => {
            setUser(null);
            setError('Your session has expired. Please login again.');
        };

        window.addEventListener('auth:session-expired', handleSessionExpired);
        return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
    }, [checkAuth]);

    const login = useCallback(async (username: string, password: string): Promise<boolean> => {
        setError(null);
        console.log(`[AuthContext] Attempting login for: ${username}`);
        try {
            const userData = await apiService.login(username, password);
            console.log('[AuthContext] Login response:', userData);
            if (userData) {
                setUser(userData.user);
                return true;
            }
            return false;
        } catch (err: any) {
            console.error('[AuthContext] Login error:', err);
            setError(err.response?.data?.error || err.message || 'Login failed');
            return false;
        }
    }, []);

    const register = useCallback(async (username: string, email: string, password: string): Promise<boolean> => {
        setError(null);
        try {
            const userData = await apiService.register(username, email, password);
            if (userData) {
                setUser(userData.user);
                return true;
            }
            return false;
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || 'Registration failed');
            return false;
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            await apiService.logout();
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            setUser(null);
            setError(null);
        }
    }, []);

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout, error }}>
            {children}
        </AuthContext.Provider>
    );
};

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}
