/**
 * IFH One — Notifications
 * API-backed notification system.
 */

import { apiFetch } from './api/fetch';

export interface AppNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'escalation' | 'hold' | 'clarification' | 'system';
  title: string;
  message: string;
  href?: string;
  read: boolean;
  createdAt: string;
  procurementId?: string;
  stageNumber?: number;
}

export interface NotificationResponse {
  data: AppNotification[];
  unreadCount: number;
  slaWarningCount?: number;
  escalationCount?: number;
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface InboxSummary {
  TOTAL: number;
  NEW_TASK: number;
  APPROVAL: number;
  REJECTION: number;
  SLA_WARNING: number;
  HOLD: number;
  CLARIFICATION: number;
  ESCALATION: number;
  SYSTEM: number;
}

export async function getNotifications(params?: { read?: boolean; page?: number; limit?: number }): Promise<NotificationResponse> {
  try {
    const qs = new URLSearchParams();
    if (params?.read !== undefined) qs.set('read', String(params.read));
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    return await apiFetch(`/notifications?${qs.toString()}`);
  } catch {
    return { data: [], unreadCount: 0, meta: { total: 0, page: 1, limit: 50, totalPages: 0 } };
  }
}

export async function getUnreadCount(): Promise<number> {
  try {
    const result = await apiFetch('/notifications/unread-count');
    return (result as any)?.unreadCount ?? 0;
  } catch {
    return 0;
  }
}

export async function getInboxSummary(): Promise<InboxSummary> {
  try {
    return await apiFetch('/notifications/inbox-summary');
  } catch {
    return { TOTAL: 0, NEW_TASK: 0, APPROVAL: 0, REJECTION: 0, SLA_WARNING: 0, HOLD: 0, CLARIFICATION: 0, ESCALATION: 0, SYSTEM: 0 };
  }
}

export async function markAsRead(id: string): Promise<void> {
  try {
    await apiFetch(`/notifications/${id}/read`, { method: 'POST' });
  } catch {}
}

export async function markAllRead(): Promise<void> {
  try {
    await apiFetch('/notifications/mark-all-read', { method: 'POST' });
  } catch {}
}

export async function deleteNotification(id: string): Promise<void> {
  try {
    await apiFetch(`/notifications/${id}`, { method: 'DELETE' });
  } catch {}
}

/** @deprecated addNotification — backend has no POST /notifications endpoint */
export async function addNotification(notif: Omit<AppNotification, 'id' | 'createdAt' | 'read'>): Promise<AppNotification | null> {
  return null;
}
