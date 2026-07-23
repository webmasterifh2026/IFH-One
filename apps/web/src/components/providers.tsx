'use client';

/**
 * Providers — v2.6.1
 *
 * Changes:
 *  - QueryClient retry config aligned with per-query overrides in useQueries.ts
 *  - retryDelay uses exponential backoff to avoid hammering a cold-starting backend
 *  - BackendStatusBanner mounted here so it's available on every page
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { BackendStatusBanner } from '@/components/layout/BackendStatusBanner';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60_000, // 5 min default
        gcTime: 10 * 60_000, // 10 min cache retention
        retry: 2, // 2 retries (overridden per-query in useQueries.ts)
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000), // 1s, 2s, 4s… cap 10s
        refetchOnWindowFocus: false, // don't refetch on tab switch
      },
      mutations: {
        retry: 0, // mutations never retry — avoid double-submitting
      },
    },
  });
}

// Singleton outside of render so it's not recreated on hot reload
let browserQueryClient: QueryClient | undefined;
function getQueryClient() {
  if (typeof window === 'undefined') return makeQueryClient(); // SSR: always fresh
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BackendStatusBanner />
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
}
