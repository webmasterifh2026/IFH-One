'use client';

import Link from 'next/link';
import {
  FileText, CheckCircle2,
  BarChart3,
  TrendingUp, ArrowRight, Activity, AlertCircle,
  Clock, Users, XCircle, Shield, Timer, Archive, Pause
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { EnterpriseCard } from '@/components/ui/enterprise-card';
import { type DashboardStats } from '@/lib/api/procurement';
import { WORKFLOW_ROUTES } from '@/lib/workflow-routes';
import { useDashboardStats } from '@/hooks/useQueries';
import { useBackendStatus } from '@/hooks/useBackendStatus';

function KpiTile({ label, value, icon: Icon, href, color = '#0F7B45' }: {
  label: string; value: string | number; icon: React.ComponentType<{ style?: React.CSSProperties }>;
  href: string; color?: string;
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div
        className="ifh-card flex flex-col p-5 h-full transition-all duration-150"
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(15,123,69,0.25)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-xs)';
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div
            className="flex items-center justify-center rounded-xl"
            style={{ width: 36, height: 36, background: `${color}14` }}
          >
            <Icon style={{ width: 16, height: 16, color }} />
          </div>
          <ArrowRight style={{ width: 13, height: 13, color: 'var(--text-faint)' }} />
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.02em', fontFamily: 'var(--font-sans)' }}>
          {value}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5, fontWeight: 500, letterSpacing: '0.02em' }}>
          {label}
        </div>
      </div>
    </Link>
  );
}

const STAGE_GROUPS = [
  {
    label: 'Requisition',
    stages: [0, 1, 2, 3],
    color: '#0F7B45',
  },
  {
    label: 'Sourcing',
    stages: [4, 5, 6],
    color: '#2563EB',
  },
  {
    label: 'Order',
    stages: [7, 8, 9, 10, 11],
    color: '#D97706',
  },
  {
    label: 'Receipt',
    stages: [12, 13, 14, 15, 16],
    color: '#7C3AED',
  },
  {
    label: 'Finance',
    stages: [17, 18, 19, 20, 21, 22, 23],
    color: '#DC2626',
  },
];

export default function DashboardPage() {
  const { data: _rawStats, isLoading: loading, isError: error } = useDashboardStats();
  const { isOnline } = useBackendStatus();
  const procStats = _rawStats as DashboardStats | undefined;
  const now = new Date();

  const kpis = [
    { label: 'Total Indents',  value: procStats?.totalIndents ?? '—', icon: FileText,     href: '/indents',           color: '#0F7B45' },
    { label: 'In Progress',    value: procStats?.inProgress   ?? '—', icon: Activity,     href: '/procurement',       color: '#2563EB' },
    { label: 'Pending',        value: procStats?.pending      ?? '—', icon: Clock,        href: '/procurement',       color: '#0EA5E9' },
    { label: 'On Hold',        value: procStats?.onHold       ?? '—', icon: Pause,        href: '/hold-records',      color: '#D97706' },
    { label: 'Delayed',        value: procStats?.delayed      ?? '—', icon: AlertCircle,  href: '/pending-delays',    color: '#EA580C' },
    { label: 'Completed',      value: procStats?.completed    ?? '—', icon: CheckCircle2, href: '/procurement',       color: '#16A34A' },
    { label: 'Rejected',       value: procStats?.rejected     ?? '—', icon: XCircle,      href: '/rejected-records',  color: '#DC2626' },
    { label: 'Archived',       value: procStats?.archived     ?? '—', icon: Archive,      href: '/archived-indents',  color: '#6B7280' },
  ];

  const activePipeline = procStats?.stagePipeline?.filter(s => s.count > 0) ?? [];
  const totalActive = activePipeline.reduce((s, x) => s + x.count, 0);

  return (
    <div className="page-content" style={{ maxWidth: 1440, margin: '0 auto' }}>

      {/* ── Header ── */}
      <PageHeader
        title="Procurement Dashboard"
        description={`${now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · IFH One Enterprise ERP`}
        isDashboard
        actions={
          <Link
            href="/indents/new"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              height: 38, padding: '0 16px', borderRadius: 10,
              background: 'var(--primary)', color: '#fff',
              fontSize: 13, fontWeight: 600, textDecoration: 'none',
              transition: 'background 150ms',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'var(--primary-hover)')}
            onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'var(--primary)')}
          >
            <FileText style={{ width: 14, height: 14 }} />
            New Indent
          </Link>
        }
      />

      {/* ── KPI Grid — 8 tiles ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4" style={{ marginBottom: 24 }}>
        {loading
          ? Array(8).fill(null).map((_, i) => (
            <div key={i} className="ifh-card p-5 animate-pulse" style={{ minHeight: 108 }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--surface2)' }} />
              <div style={{ width: 40, height: 24, borderRadius: 6, background: 'var(--surface2)', marginTop: 12 }} />
              <div style={{ width: 70, height: 11, borderRadius: 4, background: 'var(--surface2)', marginTop: 6 }} />
            </div>
          ))
          : kpis.map((k) => <KpiTile key={k.label} {...k} />)
        }
      </div>

      {/* ── Main row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5" style={{ marginBottom: 24 }}>

        {/* Pipeline overview — 2 cols */}
        <div style={{ gridColumn: 'span 2' }}>
          <EnterpriseCard noPadding className="h-full flex flex-col">
            <div
              className="flex items-center justify-between"
              style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Workflow Pipeline</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {totalActive} records active across {activePipeline.length} stages
                </div>
              </div>
              <Link
                href="/procurement"
                style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                View All <ArrowRight style={{ width: 12, height: 12 }} />
              </Link>
            </div>
            <div style={{ padding: '16px 20px', flex: 1 }}>
              {STAGE_GROUPS.map(group => {
                const stages = procStats?.stagePipeline?.filter(s => group.stages.includes(s.stage)) ?? [];
                const groupTotal = stages.reduce((s, x) => s + x.count, 0);
                return (
                  <div key={group.label} style={{ marginBottom: 16 }}>
                    <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: group.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                        {group.label}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: group.color, marginLeft: 'auto' }}>
                        {loading ? '—' : groupTotal}
                      </span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {stages.map(s => (
                        <Link
                          key={s.stage}
                          href={WORKFLOW_ROUTES[s.stage as keyof typeof WORKFLOW_ROUTES]?.list ?? '/procurement'}
                          style={{ textDecoration: 'none' }}
                        >
                          <div
                            className="transition-all"
                            style={{
                              padding: '5px 10px', borderRadius: 7,
                              background: s.count > 0 ? `${group.color}10` : 'var(--surface2)',
                              border: `1px solid ${s.count > 0 ? `${group.color}25` : 'var(--border)'}`,
                              cursor: s.count > 0 ? 'pointer' : 'default',
                            }}
                          >
                            <div style={{ fontSize: 15, fontWeight: 700, color: s.count > 0 ? group.color : 'var(--text-faint)', lineHeight: 1 }}>
                              {loading ? '—' : s.count}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {s.name}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </EnterpriseCard>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          {/* Quick actions */}
          <EnterpriseCard noPadding>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Quick Actions</div>
            </div>
            <div style={{ padding: '10px 12px' }}>
              {[
                { label: 'Create New Indent', href: '/indents/new', icon: FileText, primary: true },
                { label: 'Indent Lifecycle Tracker', href: '/indent-lifecycle', icon: TrendingUp, primary: false },
                { label: 'Vendor Management', href: '/vendors', icon: Users, primary: false },
                { label: 'Reports & Analytics', href: '/reports/kpi', icon: BarChart3, primary: false },
              ].map(({ label, href, icon: Icon, primary }) => (
                <Link
                  key={href}
                  href={href}
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    className="flex items-center gap-3 rounded-lg transition-all"
                    style={{
                      padding: '9px 10px', marginBottom: 2,
                      background: primary ? 'var(--primary-light)' : 'transparent',
                    }}
                    onMouseEnter={e => {
                      if (!primary) (e.currentTarget as HTMLDivElement).style.background = 'var(--surface2)';
                    }}
                    onMouseLeave={e => {
                      if (!primary) (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                    }}
                  >
                    <Icon style={{ width: 15, height: 15, color: primary ? 'var(--primary)' : 'var(--text-muted)', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: primary ? 600 : 500, color: primary ? 'var(--primary)' : 'var(--text-secondary)' }}>
                      {label}
                    </span>
                    <ArrowRight style={{ width: 12, height: 12, color: 'var(--text-faint)', marginLeft: 'auto' }} />
                  </div>
                </Link>
              ))}
            </div>
          </EnterpriseCard>

          {/* System Status — driven by real health check */}
          <EnterpriseCard noPadding>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>System Status</div>
            </div>
            <div style={{ padding: '12px 18px' }}>
              {[
                { name: 'Procurement Engine',   ok: isOnline },
                { name: 'Workflow Service',      ok: isOnline },
                { name: 'Approval Engine',       ok: isOnline },
                { name: 'Notification Service',  ok: isOnline },
                { name: 'Database',              ok: !error && !loading ? true : isOnline },
              ].map(({ name, ok }) => (
                <div key={name} className="flex items-center justify-between" style={{ padding: '6px 0' }}>
                  <div className="flex items-center gap-2.5">
                    <div style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: ok ? '#16A34A' : '#DC2626',
                      boxShadow: ok ? '0 0 6px rgba(22,163,74,0.35)' : 'none',
                    }} />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{name}</span>
                  </div>
                  <span style={{ fontSize: 11, color: ok ? '#16A34A' : '#DC2626', fontWeight: 600 }}>
                    {ok ? 'Operational' : 'Down'}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                Last checked: {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </EnterpriseCard>
        </div>
      </div>


      {/* ── SLA KPI Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" style={{ marginBottom: 24 }}>
        <Link href="/control-tower" style={{ textDecoration: 'none' }}>
          <div
            className="ifh-card flex items-center gap-4 p-5 transition-all duration-150"
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(22,163,74,0.3)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; }}
          >
            <div className="flex items-center justify-center rounded-xl" style={{ width: 40, height: 40, background: '#16A34A14', flexShrink: 0 }}>
              <Shield style={{ width: 18, height: 18, color: '#16A34A' }} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#16A34A', lineHeight: 1 }}>
                {loading ? '—' : (procStats?.sla?.onTrack ?? 0)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>SLA On Track</div>
            </div>
          </div>
        </Link>
        <Link href="/control-tower" style={{ textDecoration: 'none' }}>
          <div
            className="ifh-card flex items-center gap-4 p-5 transition-all duration-150"
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(217,119,6,0.3)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; }}
          >
            <div className="flex items-center justify-center rounded-xl" style={{ width: 40, height: 40, background: '#D9770614', flexShrink: 0 }}>
              <Timer style={{ width: 18, height: 18, color: '#D97706' }} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#D97706', lineHeight: 1 }}>
                {loading ? '—' : (procStats?.sla?.approaching ?? 0)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>Approaching SLA</div>
            </div>
          </div>
        </Link>
        <Link href="/control-tower" style={{ textDecoration: 'none' }}>
          <div
            className="ifh-card flex items-center gap-4 p-5 transition-all duration-150"
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(220,38,38,0.3)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; }}
          >
            <div className="flex items-center justify-center rounded-xl" style={{ width: 40, height: 40, background: '#DC262614', flexShrink: 0 }}>
              <AlertCircle style={{ width: 18, height: 18, color: '#DC2626' }} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#DC2626', lineHeight: 1 }}>
                {loading ? '—' : (procStats?.sla?.breached ?? 0)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>SLA Breached</div>
            </div>
          </div>
        </Link>
      </div>

      {/* ── Footer ── */}
      <div style={{ marginTop: 32, textAlign: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 500 }}>
          IFH One · Enterprise Procurement Management System · V2.10.0
        </span>
      </div>
    </div>
  );
}
