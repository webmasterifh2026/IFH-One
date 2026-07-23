'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  Bell, CheckCheck, Trash2, ExternalLink, RefreshCw,
  Info, CheckCircle2, AlertTriangle, XCircle, Clock, ShieldAlert,
  PauseCircle, MessageSquare, Settings,
} from 'lucide-react';
import {
  getNotifications, getInboxSummary, markAsRead, markAllRead,
  deleteNotification, type AppNotification, type InboxSummary,
} from '@/lib/notifications';
import { QK } from '@/hooks/useQueries';
import { formatDateTime } from '@/lib/procurement-stages';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDateTime(iso);
}

const formatFull = formatDateTime;

type NotifType = AppNotification['type'];

const TYPE_META: Record<NotifType, { label: string; color: string; bg: string; Icon: React.ComponentType<any> }> = {
  info:          { label: 'Info',          color: '#2563EB', bg: '#EFF6FF', Icon: Info },
  success:       { label: 'Approved',      color: '#059669', bg: '#F0FDF4', Icon: CheckCircle2 },
  warning:       { label: 'SLA Alert',     color: '#D97706', bg: '#FFFBEB', Icon: AlertTriangle },
  error:         { label: 'Rejected',      color: '#DC2626', bg: '#FEF2F2', Icon: XCircle },
  escalation:    { label: 'Escalation',    color: '#7C3AED', bg: '#F5F3FF', Icon: ShieldAlert },
  hold:          { label: 'On Hold',       color: '#9333EA', bg: '#FAF5FF', Icon: PauseCircle },
  clarification: { label: 'Clarification', color: '#0891B2', bg: '#ECFEFF', Icon: MessageSquare },
  system:        { label: 'System',        color: '#6B7280', bg: '#F9FAFB', Icon: Settings },
};

type TabId = 'all' | 'unread' | 'workflow' | 'approvals' | 'rejections' | 'holds' | 'sla' | 'system';

const TABS: { id: TabId; label: string; types?: NotifType[] }[] = [
  { id: 'all',       label: 'All' },
  { id: 'unread',    label: 'Unread' },
  { id: 'workflow',  label: 'Workflow',    types: ['info'] },
  { id: 'approvals', label: 'Approvals',   types: ['success'] },
  { id: 'rejections',label: 'Rejections',  types: ['error'] },
  { id: 'holds',     label: 'Holds',       types: ['hold', 'clarification'] },
  { id: 'sla',       label: 'SLA Alerts',  types: ['warning', 'escalation'] },
  { id: 'system',    label: 'System',      types: ['system'] },
];

// ─── Notification Card ────────────────────────────────────────────────────────

function NotifCard({
  n, onRead, onDelete, onNavigate,
}: {
  n: AppNotification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (n: AppNotification) => void;
}) {
  const meta = TYPE_META[n.type] ?? TYPE_META.info;
  const { Icon } = meta;

  return (
    <div
      style={{
        display: 'flex', gap: 14, padding: '16px 20px',
        background: n.read ? 'transparent' : `${meta.bg}`,
        borderBottom: '1px solid var(--border)',
        borderLeft: n.read ? '3px solid transparent' : `3px solid ${meta.color}`,
        transition: 'background 150ms',
        cursor: n.href ? 'pointer' : 'default',
      }}
      onClick={() => n.href && onNavigate(n)}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = n.read ? 'transparent' : meta.bg; }}
    >
      {/* Type icon */}
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: `${meta.color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
      }}>
        <Icon style={{ width: 17, height: 17, color: meta.color }} />
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Row 1: title + time */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
          <span style={{
            fontSize: 13, fontWeight: n.read ? 500 : 700,
            color: 'var(--text-primary)', lineHeight: 1.35,
          }}>
            {n.title}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-faint)', flexShrink: 0, marginTop: 2 }}
            title={formatFull(n.createdAt)}>
            {timeAgo(n.createdAt)}
          </span>
        </div>

        {/* Row 2: message */}
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 8px' }}>
          {n.message}
        </p>

        {/* Row 3: meta chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
            background: `${meta.color}18`, color: meta.color, letterSpacing: '0.04em',
          }}>
            {meta.label}
          </span>

          {n.stageNumber && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
              background: 'var(--surface2)', color: 'var(--text-muted)',
            }}>
              Stage {n.stageNumber}
            </span>
          )}

          {!n.read && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
              background: '#2563EB18', color: '#2563EB',
            }}>
              Unread
            </span>
          )}
        </div>

        {/* Row 4: action buttons */}
        <div
          style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}
          onClick={e => e.stopPropagation()}
        >
          {n.href && (
            <button
              onClick={() => onNavigate(n)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 11, fontWeight: 600, padding: '4px 10px',
                borderRadius: 6, border: '1px solid var(--primary)',
                background: 'var(--primary-light)', color: 'var(--primary)',
                cursor: 'pointer',
              }}
            >
              <ExternalLink style={{ width: 11, height: 11 }} />
              View Indent
            </button>
          )}

          {!n.read ? (
            <button
              onClick={() => onRead(n.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 11, fontWeight: 600, padding: '4px 10px',
                borderRadius: 6, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <CheckCheck style={{ width: 11, height: 11 }} />
              Mark Read
            </button>
          ) : null}

          <button
            onClick={() => onDelete(n.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 11, fontWeight: 600, padding: '4px 10px',
              borderRadius: 6, border: '1px solid var(--border)',
              background: 'transparent', color: '#DC2626',
              cursor: 'pointer',
            }}
          >
            <Trash2 style={{ width: 11, height: 11 }} />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [summary, setSummary] = useState<InboxSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const [res, sum] = await Promise.all([
        getNotifications({ page: p, limit: LIMIT }),
        getInboxSummary(),
      ]);
      setNotifications(res.data ?? []);
      setTotal(res.meta?.total ?? 0);
      setTotalPages(res.meta?.totalPages ?? 1);
      setSummary(sum);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(1); }, [load]);

  const filteredNotifications = notifications.filter(n => {
    const tab = TABS.find(t => t.id === activeTab);
    if (!tab) return true;
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !n.read;
    if (tab.types) return tab.types.includes(n.type);
    return true;
  });

  const handleRead = async (id: string) => {
    await markAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    qc.invalidateQueries({ queryKey: QK.unreadCount });
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    qc.invalidateQueries({ queryKey: QK.unreadCount });
  };

  const handleDelete = async (id: string) => {
    await deleteNotification(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    setTotal(t => Math.max(0, t - 1));
    qc.invalidateQueries({ queryKey: QK.unreadCount });
  };

  const handleNavigate = async (n: AppNotification) => {
    if (!n.read) await handleRead(n.id);
    if (n.href) router.push(n.href);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="page-content" style={{ paddingBottom: 60 }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* ── Page header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 24, flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bell style={{ width: 20, height: 20, color: 'var(--primary)' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2, margin: 0 }}>
                Notification Center
              </h1>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                {total} notification{total !== 1 ? 's' : ''}{unreadCount > 0 ? ` · ${unreadCount} unread` : ''}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => load(page)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              <RefreshCw style={{ width: 13, height: 13 }} />
              Refresh
            </button>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(15,123,69,0.25)', background: 'var(--primary-light)', color: 'var(--primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                <CheckCheck style={{ width: 13, height: 13 }} />
                Mark All Read
              </button>
            )}
          </div>
        </div>

        {/* ── Inbox summary chips ── */}
        {summary && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {[
              { key: 'NEW_TASK', label: 'New Tasks', color: '#2563EB' },
              { key: 'APPROVAL', label: 'Approvals', color: '#059669' },
              { key: 'REJECTION', label: 'Rejections', color: '#DC2626' },
              { key: 'SLA_WARNING', label: 'SLA Alerts', color: '#D97706' },
              { key: 'ESCALATION', label: 'Escalations', color: '#7C3AED' },
              { key: 'HOLD', label: 'Holds', color: '#9333EA' },
            ].map(({ key, label, color }) => {
              const count = (summary as any)[key] ?? 0;
              if (count === 0) return null;
              return (
                <span key={key} style={{
                  fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99,
                  background: `${color}12`, color, border: `1px solid ${color}30`,
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                }}>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{count}</span>
                  {label}
                </span>
              );
            })}
          </div>
        )}

        {/* ── Category tabs ── */}
        <div style={{
          display: 'flex', gap: 2, overflowX: 'auto', padding: '0 0 4px',
          marginBottom: 0, borderBottom: '1px solid var(--border)',
        }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            // Count for badge
            let count = 0;
            if (tab.id === 'unread') count = notifications.filter(n => !n.read).length;
            else if (tab.types) count = notifications.filter(n => !n.read && tab.types!.includes(n.type)).length;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '10px 14px', fontSize: 12, fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                  background: 'transparent', border: 'none',
                  borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                  cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 120ms',
                  marginBottom: -1,
                }}
              >
                {tab.label}
                {count > 0 && (
                  <span style={{
                    fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 99,
                    background: isActive ? 'var(--primary)' : 'var(--surface2)',
                    color: isActive ? '#fff' : 'var(--text-muted)',
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Notification list ── */}
        <div className="ifh-card" style={{ marginTop: 0, borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ width: 28, height: 28, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <p style={{ fontSize: 13 }}>Loading notifications…</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div style={{ padding: '60px 24px', textAlign: 'center' }}>
              <Bell style={{ width: 36, height: 36, color: 'var(--border)', margin: '0 auto 16px' }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                No notifications
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {activeTab === 'unread' ? "You're all caught up!" : 'Nothing here yet.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map(n => (
              <NotifCard
                key={n.id}
                n={n}
                onRead={handleRead}
                onDelete={handleDelete}
                onNavigate={handleNavigate}
              />
            ))
          )}
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 24 }}>
            <button
              onClick={() => load(page - 1)}
              disabled={page <= 1}
              style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12, fontWeight: 600, color: page <= 1 ? 'var(--text-faint)' : 'var(--text-primary)', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
            >
              ← Prev
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => load(page + 1)}
              disabled={page >= totalPages}
              style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12, fontWeight: 600, color: page >= totalPages ? 'var(--text-faint)' : 'var(--text-primary)', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
