'use client';

/**
 * AuthContext — v2.5.5
 *
 * Changes from v2.5.1:
 *  - getMe() is retried on 'backend:recovered' event so that if the backend
 *    was cold-starting when the page loaded, the user profile is refreshed
 *    once the server comes up — without requiring a manual page reload.
 *  - getMe() failure no longer emits any console error (it's handled silently;
 *    the BackendStatusBanner shows connectivity state instead).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  clearAuth,
  getToken,
  getUser,
  saveAuth,
  type AuthUser,
} from '@/lib/auth';
import { getMe, logout as apiLogout } from '@/lib/api/auth';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  logout: async () => {},
  refreshUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const meInFlight = useRef(false);

  const refreshUser = useCallback(() => {
    const u = getUser();
    const t = getToken();
    setUser(u);
    setToken(t);
  }, []);

  /**
   * Fetch /auth/me and update stored user profile.
   * Silent on failure — the BackendStatusBanner handles connectivity state.
   * Guard against concurrent calls with meInFlight ref.
   */
  const syncProfile = useCallback(async () => {
    const t = getToken();
    if (!t || meInFlight.current) return;
    meInFlight.current = true;
    try {
      const fresh = await getMe();
      saveAuth(t, fresh);
      setUser(fresh);
    } catch {
      // Backend may be cold-starting — we keep existing localStorage state.
      // The 'backend:recovered' event will trigger a retry.
    } finally {
      meInFlight.current = false;
    }
  }, []);

  // Initial load: read localStorage immediately, then sync from server
  useEffect(() => {
    const u = getUser();
    const t = getToken();
    setUser(u);
    setToken(t);
    setLoading(false);
    if (t) syncProfile();
  }, [syncProfile]);

  // When backend recovers from an outage, re-sync the profile
  useEffect(() => {
    const handler = () => {
      if (getToken()) syncProfile();
    };
    window.addEventListener('backend:recovered', handler);
    return () => window.removeEventListener('backend:recovered', handler);
  }, [syncProfile]);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // ignore — proceed with local cleanup regardless
    }
    clearAuth();
    setUser(null);
    setToken(null);
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
