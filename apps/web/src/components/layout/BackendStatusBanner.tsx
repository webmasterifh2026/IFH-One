'use client';

/**
 * BackendStatusBanner — v2.6.1
 *
 * Renders a non-intrusive top banner when the backend is unreachable.
 * Automatically dismisses when connectivity is restored.
 *
 * States shown:
 *  - "Backend is starting…"  (offline, initially checking)
 *  - "Reconnecting…"         (offline, retrying)
 *  - Nothing                 (online)
 */

import { useEffect, useState } from 'react';
import { useBackendStatus } from '@/hooks/useBackendStatus';
import { useQueryClient } from '@tanstack/react-query';

export function BackendStatusBanner() {
  const { isOnline, isChecking } = useBackendStatus();
  const qc = useQueryClient();
  const [visible, setVisible] = useState(false);
  const [recovering, setRecovering] = useState(false);

  // Delay showing the banner slightly — avoids flash on fast connections
  useEffect(() => {
    if (isOnline) {
      setRecovering(false);
      // Small delay before hiding so users can read "Reconnected"
      const tid = setTimeout(() => setVisible(false), 1200);
      return () => clearTimeout(tid);
    } else {
      const tid = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(tid);
    }
  }, [isOnline]);

  // When backend recovers, refetch all stale queries automatically
  useEffect(() => {
    function onRecovered() {
      setRecovering(true);
      qc.invalidateQueries();
    }
    window.addEventListener('backend:recovered', onRecovered);
    return () => window.removeEventListener('backend:recovered', onRecovered);
  }, [qc]);

  if (!visible) return null;

  const message = recovering
    ? 'Reconnected — refreshing data…'
    : isChecking
      ? 'Connecting to server…'
      : 'Server is unavailable — retrying automatically…';

  const bgColor = recovering ? 'var(--success, #16a34a)' : '#b45309';

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: bgColor,
        color: '#fff',
        textAlign: 'center',
        padding: '8px 16px',
        fontSize: 13,
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        transition: 'background 0.3s ease',
      }}
    >
      {/* Spinner or checkmark */}
      {!recovering ? (
        <span
          style={{
            display: 'inline-block',
            width: 12,
            height: 12,
            border: '2px solid rgba(255,255,255,0.4)',
            borderTopColor: '#fff',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            flexShrink: 0,
          }}
        />
      ) : (
        <span style={{ fontSize: 14 }}>✓</span>
      )}
      {message}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
