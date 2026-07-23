'use client';

import {
  Bell,
  ChevronDown,
  User,
  Settings,
  CheckCheck,
  LogOut,
  Lock,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GlobalSearch } from './global-search';
import {
  getNotifications,
  markAsRead,
  markAllRead,
  type AppNotification,
} from '@/lib/notifications';
import { useAuth } from '@/contexts/AuthContext';
import { useUnreadCount } from '@/hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import { QK } from '@/hooks/useQueries';

export default function TopHeader() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const { data: unread = 0 } = useUnreadCount();
  const qc = useQueryClient();
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const displayName = user?.name || 'User';
  const displayRole = user?.roles?.[0] || 'Viewer';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Notification type → visual config
  const notifMeta = (type: string) => {
    switch (type) {
      case 'success':
        return { color: '#059669', label: 'Approved' };
      case 'error':
        return { color: '#DC2626', label: 'Rejected' };
      case 'warning':
        return { color: '#D97706', label: 'SLA Alert' };
      case 'escalation':
        return { color: '#7C3AED', label: 'Escalation' };
      case 'hold':
        return { color: '#9333EA', label: 'Hold' };
      case 'clarification':
        return { color: '#0891B2', label: 'Clarification' };
      case 'system':
        return { color: '#6B7280', label: 'System' };
      default:
        return { color: 'var(--primary)', label: 'Info' };
    }
  };

  function notifTimeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  return (
    <header
      className="flex items-center justify-between flex-shrink-0 sticky top-0 z-30"
      style={{
        height: 'var(--topbar-h)',
        background: 'var(--card)',
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
      }}
    >
      {/* Hamburger — mobile only */}
      <button
        className="lg:hidden"
        onClick={() => window.dispatchEvent(new Event('sidebar:open'))}
        style={{
          padding: '6px 8px',
          marginRight: 8,
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          borderRadius: 7,
          cursor: 'pointer',
          color: 'var(--text-primary)',
          fontSize: 16,
          lineHeight: 1,
        }}
        aria-label="Open menu"
      >
        ☰
      </button>

      <GlobalSearch />

      <div className="flex items-center" style={{ gap: 4 }}>
        {/* Notifications */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setNotifOpen(!notifOpen);
              getNotifications()
                .then((r) => setNotifs(r.data))
                .catch(() => {});
            }}
            className="rounded-lg transition-colors relative"
            style={{
              padding: 8,
              color: 'var(--text-muted)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface2)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
            title="Notifications"
          >
            <Bell style={{ width: 17, height: 17 }} />
            {unread > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 5,
                  right: 5,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  background: 'var(--primary)',
                  color: '#fff',
                  fontSize: 9,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid var(--card)',
                  padding: '0 3px',
                }}
              >
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setNotifOpen(false)}
              />
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 8px)',
                  zIndex: 50,
                  width: 380,
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 14,
                  boxShadow: 'var(--shadow-lg)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                    }}
                  >
                    Notifications{' '}
                    {unread > 0 && (
                      <span
                        style={{
                          marginLeft: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 10,
                          background: 'var(--primary)',
                          color: '#fff',
                        }}
                      >
                        {unread}
                      </span>
                    )}
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {unread > 0 && (
                      <button
                        onClick={() => {
                          markAllRead();
                          getNotifications()
                            .then((r) => setNotifs(r.data))
                            .catch(() => {});
                          qc.invalidateQueries({ queryKey: QK.unreadCount });
                        }}
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--primary)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <CheckCheck style={{ width: 12, height: 12 }} /> Mark
                        all read
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {notifs.length === 0 ? (
                    <div
                      style={{
                        padding: '32px 16px',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        fontSize: 13,
                      }}
                    >
                      No notifications
                    </div>
                  ) : (
                    notifs.slice(0, 10).map((n) => {
                      const { color } = notifMeta(n.type);
                      return (
                        <div
                          key={n.id}
                          onClick={() => {
                            markAsRead(n.id);
                            getNotifications()
                              .then((r) => setNotifs(r.data))
                              .catch(() => {});
                            qc.invalidateQueries({ queryKey: QK.unreadCount });
                            if (n.href) {
                              setNotifOpen(false);
                              router.push(n.href);
                            }
                          }}
                          style={{
                            padding: '12px 16px',
                            cursor: 'pointer',
                            background: n.read ? 'transparent' : `${color}08`,
                            borderBottom: '1px solid var(--border)',
                            borderLeft: n.read
                              ? '3px solid transparent'
                              : `3px solid ${color}`,
                            display: 'flex',
                            gap: 10,
                            alignItems: 'flex-start',
                            transition: 'background 100ms',
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background =
                              'var(--surface2)';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background =
                              n.read ? 'transparent' : `${color}08`;
                          }}
                        >
                          {/* colored dot */}
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: n.read ? 'var(--border)' : color,
                              flexShrink: 0,
                              marginTop: 5,
                            }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: 8,
                                marginBottom: 2,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: n.read ? 500 : 700,
                                  color: 'var(--text-primary)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {n.title}
                              </div>
                              <span
                                style={{
                                  fontSize: 10,
                                  color: 'var(--text-faint)',
                                  flexShrink: 0,
                                }}
                              >
                                {notifTimeAgo(n.createdAt)}
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: 'var(--text-muted)',
                                lineHeight: 1.4,
                                overflow: 'hidden',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                              }}
                            >
                              {n.message}
                            </div>
                            {(n.stageNumber || n.href) && (
                              <div
                                style={{
                                  display: 'flex',
                                  gap: 6,
                                  marginTop: 6,
                                  alignItems: 'center',
                                }}
                              >
                                {n.stageNumber && (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 600,
                                      padding: '1px 6px',
                                      borderRadius: 99,
                                      background: `${color}18`,
                                      color,
                                    }}
                                  >
                                    {' '}
                                    Stage {n.stageNumber}
                                  </span>
                                )}
                                {n.href && (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 600,
                                      color: 'var(--primary)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 3,
                                    }}
                                  >
                                    View →
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                {/* Footer: View All */}
                <div
                  style={{
                    padding: '10px 16px',
                    borderTop: '1px solid var(--border)',
                    textAlign: 'center',
                  }}
                >
                  <button
                    onClick={() => {
                      setNotifOpen(false);
                      router.push('/notifications');
                    }}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--primary)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    View All Notifications →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div
          style={{
            width: 1,
            height: 22,
            background: 'var(--border)',
            margin: '0 8px',
          }}
        />

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center rounded-lg transition-colors"
            style={{
              gap: 10,
              padding: '5px 8px 5px 6px',
              background: profileOpen ? 'var(--surface2)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface2)';
            }}
            onMouseLeave={(e) => {
              if (!profileOpen)
                e.currentTarget.style.background = 'transparent';
            }}
          >
            <div
              className="flex items-center justify-center rounded-lg flex-shrink-0"
              style={{
                width: 30,
                height: 30,
                background: 'var(--primary-light)',
                fontSize: 11,
                fontWeight: 800,
                color: 'var(--primary)',
                letterSpacing: '-0.02em',
              }}
            >
              {initials || <User style={{ width: 15, height: 15 }} />}
            </div>
            <div className="text-left hidden sm:block">
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  lineHeight: 1,
                  fontFamily: 'var(--font-sans)',
                  maxWidth: 120,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {displayName}
              </p>
              <p
                style={{
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  marginTop: 3,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {displayRole}
              </p>
            </div>
            <ChevronDown
              style={{
                width: 13,
                height: 13,
                color: 'var(--text-faint)',
                transition: 'transform 150ms',
                transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </button>

          {profileOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setProfileOpen(false)}
              />
              <div
                className="absolute z-50"
                style={{
                  right: 0,
                  top: 'calc(100% + 6px)',
                  width: 200,
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  boxShadow: 'var(--shadow-lg)',
                  padding: '6px',
                  overflow: 'hidden',
                }}
              >
                {/* User info */}
                <div
                  style={{
                    padding: '8px 10px 10px',
                    borderBottom: '1px solid var(--border)',
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {displayName}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      marginTop: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {user?.email}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: 5,
                        background: 'var(--primary-light)',
                        color: 'var(--primary)',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {displayRole}
                    </span>
                  </div>
                </div>
                {[
                  { label: 'My Profile', href: '/profile', icon: User },
                  {
                    label: 'Change Password',
                    href: '/profile?tab=password',
                    icon: Lock,
                  },
                ].map(({ label, href, icon: Icon }) => (
                  <button
                    key={href}
                    onClick={() => {
                      setProfileOpen(false);
                      router.push(href);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 8,
                      fontSize: 13,
                      color: 'var(--text-primary)',
                      fontWeight: 500,
                      textDecoration: 'none',
                      transition: 'background 120ms',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sans)',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = 'var(--surface2)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = 'transparent')
                    }
                  >
                    <Icon
                      style={{
                        width: 13,
                        height: 13,
                        color: 'var(--text-muted)',
                      }}
                    />
                    {label}
                  </button>
                ))}
                <div
                  style={{
                    margin: '4px 0',
                    borderTop: '1px solid var(--border)',
                  }}
                />
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderRadius: 8,
                    fontSize: 13,
                    color: '#DC2626',
                    fontWeight: 500,
                    cursor: 'pointer',
                    background: 'transparent',
                    border: 'none',
                    transition: 'background 120ms',
                    fontFamily: 'var(--font-sans)',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = '#FEF2F2')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'transparent')
                  }
                >
                  <LogOut style={{ width: 13, height: 13 }} />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
