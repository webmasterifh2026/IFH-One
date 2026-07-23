'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/fetch';

// ─── Query Keys ───────────────────────────────────────────────────────────────
export const QK = {
  dashboard: ['dashboard-stats'] as const,
  commandCenter: ['command-center'] as const,
  controlTower: ['control-tower'] as const,
  pendingAnalytics: ['pending-analytics'] as const,
  lifecycle: (p: object) => ['lifecycle', p] as const,
  procurement: (id: string) => ['procurement', id] as const,
  procurements: (p: object) => ['procurements', p] as const,
  roles: ['roles'] as const,
  permissions: ['permissions'] as const,
  users: (p?: object) => ['users', p] as const,
  departments: ['departments'] as const,
  projects: (p?: object) => ['projects', p] as const,
  vendors: (p?: object) => ['vendors', p] as const,
  items: (p?: object) => ['items', p] as const,
  notifications: ['notifications'] as const,
  unreadCount: ['notifications', 'unread'] as const,
};

// ─── Short stale times for live operational data ──────────────────────────────
const LIVE = { staleTime: 30_000, retry: 2 }; // 30s — workflow queues
const SEMI = { staleTime: 2 * 60_000, retry: 2 }; // 2min — dashboard/reports
const CACHE = { staleTime: 10 * 60_000, retry: 1 }; // 10min — master data

// ─── Dashboard ────────────────────────────────────────────────────────────────
export function useDashboardStats() {
  return useQuery({
    queryKey: QK.dashboard,
    queryFn: () => apiFetch('/procurement/dashboard-stats'),
    ...SEMI,
  });
}

// ─── Command Center ───────────────────────────────────────────────────────────
export function useCommandCenter() {
  return useQuery({
    queryKey: QK.commandCenter,
    queryFn: () => apiFetch('/procurement/command-center'),
    ...SEMI,
  });
}

// ─── Control Tower ────────────────────────────────────────────────────────────
export function useControlTower() {
  return useQuery({
    queryKey: QK.controlTower,
    queryFn: () => apiFetch('/procurement/control-tower'),
    ...LIVE,
  });
}

// ─── Pending Analytics ────────────────────────────────────────────────────────
export function usePendingAnalytics() {
  return useQuery({
    queryKey: QK.pendingAnalytics,
    queryFn: () => apiFetch('/procurement/pending-analytics'),
    ...LIVE,
  });
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────
export function useLifecycle(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search) qs.set('search', params.search);
  if (params.status) qs.set('status', params.status);
  return useQuery({
    queryKey: QK.lifecycle(params),
    queryFn: () => apiFetch(`/procurement/lifecycle?${qs.toString()}`),
    ...SEMI,
  });
}

// ─── Procurement list ─────────────────────────────────────────────────────────
export function useProcurements(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  stage?: number;
}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search) qs.set('search', params.search);
  if (params.status) qs.set('status', params.status);
  if (params.stage !== undefined) qs.set('stage', String(params.stage));
  return useQuery({
    queryKey: QK.procurements(params),
    queryFn: () => apiFetch(`/procurement?${qs.toString()}`),
    ...LIVE,
  });
}

// ─── Single Procurement ───────────────────────────────────────────────────────
export function useProcurement(id: string) {
  return useQuery({
    queryKey: QK.procurement(id),
    queryFn: () => apiFetch(`/procurement/${id}`),
    enabled: !!id,
    ...LIVE,
  });
}

// ─── Master Data (long cache) ─────────────────────────────────────────────────
export function useRoles() {
  return useQuery({
    queryKey: QK.roles,
    queryFn: () => apiFetch('/roles'),
    ...CACHE,
  });
}

export function usePermissions() {
  return useQuery({
    queryKey: QK.permissions,
    queryFn: () => apiFetch('/permissions'),
    ...CACHE,
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: QK.departments,
    queryFn: () => apiFetch('/departments'),
    ...CACHE,
  });
}

export function useProjects(params?: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.search) qs.set('search', params.search);
  return useQuery({
    queryKey: QK.projects(params),
    queryFn: () => apiFetch(`/projects?${qs.toString()}`),
    ...CACHE,
  });
}

export function useVendors(params?: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.search) qs.set('search', params.search);
  return useQuery({
    queryKey: QK.vendors(params),
    queryFn: () => apiFetch(`/vendors?${qs.toString()}`),
    ...CACHE,
  });
}

export function useItems(params?: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.search) qs.set('search', params.search);
  return useQuery({
    queryKey: QK.items(params),
    queryFn: () => apiFetch(`/skus?${qs.toString()}`),
    ...CACHE,
  });
}

export function useUsers(params?: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.search) qs.set('search', params.search);
  return useQuery({
    queryKey: QK.users(params),
    queryFn: () => apiFetch(`/users?${qs.toString()}`),
    staleTime: 60_000,
  });
}

// ─── Notifications ────────────────────────────────────────────────────────────
export function useUnreadCount() {
  // refetchIntervalInBackground: false — stop polling when tab is hidden
  // refetchInterval is a function: return false when the last query failed
  // to avoid hammering an unreachable backend every 60s.
  return useQuery({
    queryKey: QK.unreadCount,
    queryFn: async () => {
      const r = await apiFetch('/notifications/unread-count');
      return typeof r === 'number' ? r : (r?.unreadCount ?? 0);
    },
    staleTime: 30_000,
    refetchIntervalInBackground: false,
    // Only poll when the last fetch succeeded
    refetchInterval: (query) =>
      query.state.status === 'error' ? false : 60_000,
    // React Query default retries (3) with backoff cover transient failures
    retry: 2,
  });
}

// ─── All Records for Reports (replaces 4× independent getAllRecordsForReports()) ─
export function useAllReportRecords() {
  return useQuery({
    queryKey: ['report-records-all'],
    queryFn: () =>
      import('@/lib/api/procurement').then((m) => m.getAllRecordsForReports()),
    staleTime: 2 * 60_000, // 2 min — shared across control-tower, lifecycle, pending-delays, archived
    gcTime: 5 * 60_000,
  });
}

// ─── Cache invalidation helper ────────────────────────────────────────────────
export function useInvalidate() {
  const qc = useQueryClient();
  return {
    invalidateProcurements: () =>
      qc.invalidateQueries({ queryKey: ['procurements'] }),
    invalidateDashboard: () => qc.invalidateQueries({ queryKey: QK.dashboard }),
    invalidateCommandCenter: () =>
      qc.invalidateQueries({ queryKey: QK.commandCenter }),
    invalidateReports: () =>
      qc.invalidateQueries({ queryKey: ['report-records-all'] }),
    invalidateAll: () =>
      qc
        .invalidateQueries({ queryKey: ['procurements'] })
        .then(() => qc.invalidateQueries({ queryKey: QK.dashboard }))
        .then(() => qc.invalidateQueries({ queryKey: QK.commandCenter }))
        .then(() => qc.invalidateQueries({ queryKey: QK.controlTower }))
        .then(() => qc.invalidateQueries({ queryKey: QK.pendingAnalytics }))
        .then(() => qc.invalidateQueries({ queryKey: ['report-records-all'] })),
  };
}
