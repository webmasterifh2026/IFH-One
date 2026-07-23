'use client';

/**
 * useBackendStatus — v2.6.1
 *
 * Tracks whether the API backend is reachable.
 *
 * Strategy:
 *  1. On mount, probe GET /api/health/ping (public, no auth, lightweight).
 *  2. Listen to the 'backend:status' CustomEvent emitted by apiFetch
 *     so any successful/failed request updates the shared state.
 *  3. When offline: probe every RECONNECT_INTERVAL_MS until recovered.
 *  4. When online: stop probing — normal API traffic confirms liveness.
 *
 * Returns:
 *   isOnline   — true when backend is confirmed reachable
 *   isChecking — true during the initial probe only
 *   lastChecked — timestamp of most recent probe
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { buildApiUrl } from '@/lib/api/fetch';

const PING_PATH = '/health/ping';
const RECONNECT_INTERVAL_MS = 8_000;  // probe every 8s when offline
const PING_TIMEOUT_MS = 5_000;

type BackendStatus = {
  isOnline: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
};

async function pingBackend(): Promise<boolean> {
  const url = buildApiUrl(PING_PATH);
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(tid);
  }
}

export function useBackendStatus(): BackendStatus {
  const [isOnline, setIsOnline] = useState(true); // optimistic
  const [isChecking, setIsChecking] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopReconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearInterval(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  }, []);

  const startReconnect = useCallback(() => {
    if (reconnectTimer.current) return; // already polling
    reconnectTimer.current = setInterval(async () => {
      const ok = await pingBackend();
      setLastChecked(new Date());
      if (ok) {
        setIsOnline(true);
        stopReconnect();
        // Tell the rest of the app to refetch
        window.dispatchEvent(new CustomEvent('backend:recovered'));
      }
    }, RECONNECT_INTERVAL_MS);
  }, [stopReconnect]);

  // Initial probe
  useEffect(() => {
    let cancelled = false;
    setIsChecking(true);
    pingBackend().then((ok) => {
      if (cancelled) return;
      setIsOnline(ok);
      setLastChecked(new Date());
      setIsChecking(false);
      if (!ok) startReconnect();
    });
    return () => {
      cancelled = true;
    };
  }, [startReconnect]);

  // Listen to apiFetch status events
  useEffect(() => {
    function onStatus(e: Event) {
      const online = (e as CustomEvent<{ online: boolean }>).detail.online;
      setIsOnline((prev) => {
        if (!prev && online) {
          // Recovered — tell the app to refetch
          stopReconnect();
          window.dispatchEvent(new CustomEvent('backend:recovered'));
        }
        if (prev && !online) {
          startReconnect();
        }
        return online;
      });
      setLastChecked(new Date());
    }
    window.addEventListener('backend:status', onStatus);
    return () => window.removeEventListener('backend:status', onStatus);
  }, [startReconnect, stopReconnect]);

  // Cleanup on unmount
  useEffect(() => () => stopReconnect(), [stopReconnect]);

  return { isOnline, isChecking, lastChecked };
}
