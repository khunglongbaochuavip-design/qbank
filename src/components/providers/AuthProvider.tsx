'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from '@/lib/api-client';

interface User { id: string; email: string; fullName: string; role: string; }
interface AuthContextType { user: User | null; loading: boolean; login: (email: string, password: string) => Promise<User>; logout: () => void; }

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;
    try { return JSON.parse(localStorage.getItem('qbank_user') || 'null'); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('qbank_token');
    if (token) {
      api.get<User>('/auth/me')
        .then(data => { setUser(data); localStorage.setItem('qbank_user', JSON.stringify(data)); })
        .catch(() => { localStorage.removeItem('qbank_token'); localStorage.removeItem('qbank_user'); setUser(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<{ accessToken: string; user: User }>('/auth/login', { email, password });
    localStorage.setItem('qbank_token', data.accessToken);
    localStorage.setItem('qbank_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('qbank_token');
    localStorage.removeItem('qbank_user');
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
