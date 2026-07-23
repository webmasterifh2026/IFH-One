'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { type ReportRecord } from '@/lib/api/procurement';
import { PROCUREMENT_STAGES } from '@/lib/procurement-stages';
import { WORKFLOW_ROUTES } from '@/lib/workflow-routes';
import { computeSLA, fmtBizHours, slaStatusConfig, STAGE_TAT, type SLAResult } from '@/lib/business-tat';
import { useAllReportRecords } from '@/hooks/useQueries';

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function KpiTile({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="ifh-card p-4 flex flex-col gap-1">
      <div style={{ fontSize: 26, fontWeight: 700, color: color || 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.02em' }}>{label}</div>
    </div>
  );
}

function SLAPill({ status }: { status: SLAResult['status'] }) {
  const cfg = slaStatusConfig(status);
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

const RESPONSIBLES = ['Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sneha Desai', 'Vikram Singh', 'Ananya Gupta'];

/** Resolve responsible person for a record — stage TAT config first, then assignedTo, then fallback */
function resolveResponsible(r: ReportRecord, i: number): string {
  const stageCfg = STAGE_TAT[r.currentStage];
  if (stageCfg?.responsible?.length) return stageCfg.responsible[0];
  // Try to get from the record's requestedBy (requestor name as fallback)
  if (r.requestedBy?.fullName) return r.requestedBy.fullName;
  return RESPONSIBLES[i % RESPONSIBLES.length];
}

export default function ControlTowerPage() {
  const { data: records = [], isLoading: loading } = useAllReportRecords();

  const pending = records.filter(r => ['DRAFT', 'IN_PROGRESS', 'SUBMITTED'].includes(r.status)).length;
  const rejected = records.filter(r => r.status === 'REJECTED').length;
  const onHold = records.filter(r => r.status === 'ON_HOLD').length;
  const completed = records.filter(r => r.status === 'COMPLETED').length;
  // Store-fulfilled: COMPLETED records that ended at stage 2 (store availability)
  const fulfilled = records.filter(r => r.status === 'COMPLETED' && r.currentStage === 2).length;
  const paid = records.filter(r => r.status === 'COMPLETED' && r.currentStage === 23).length;

  const recent = [...records]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  // Business SLA metrics
  const slaData = useMemo(() => records.map((r, i) => {
    let bizOffset = 0;
    for (let s = 1; s < r.currentStage; s++) bizOffset += (STAGE_TAT[s]?.tatHours ?? 8);
    const assignedAt = new Date(new Date(r.createdAt).getTime() + bizOffset * 3600000);
    const sla = computeSLA(r.currentStage, assignedAt, null);
    const responsible = resolveResponsible(r, i);
    return { r, sla, responsible };
  }), [records]);

  const now = Date.now();
  const dayMs = 86400000;
  const slaDelayed = slaData.filter(d => d.sla.status === 'delayed');
  const slaDelayedToday = slaDelayed.filter(d => d.sla.deadline.getTime() > now - dayMs && d.sla.deadline.getTime() <= now);
  const slaDelayedWeek = slaDelayed.filter(d => d.sla.deadline.getTime() > now - 7 * dayMs && d.sla.deadline.getTime() <= now);
  const slaOnTime = slaData.filter(d => d.sla.status === 'on_time');
  const avgCompliance = slaData.length > 0 ? Math.round((slaOnTime.length / slaData.length) * 100) : 100;
  const avgBizHrs = slaData.length > 0
    ? slaData.reduce((s, d) => s + d.sla.bizHoursConsumed, 0) / slaData.length
    : 0;

  const stageCounts = PROCUREMENT_STAGES.map(s => ({
    stage: s,
    count: records.filter(r => r.currentStage === s.number).length,
  }));

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)', fontSize: 14 }}>
      Loading...
    </div>
  );

  
  const tdStyle: React.CSSProperties = {
    padding: '10px 12px', fontSize: 13, color: 'var(--text-primary)',
    borderBottom: '1px solid var(--border)',
  };

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-display" style={{ fontSize: 22, fontWeight: 400, color: 'var(--text-primary)', margin: 0 }}>
          Workflow Control Tower
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Complete procurement pipeline visibility
        </p>
      </div>

      {/* KPI Strip */}
      <div className="kpi-grid-8" style={{ marginBottom: 16 }}>
        <KpiTile label="Total Indents" value={records.length} />
        <KpiTile label="Pending Approvals" value={pending} />
        <KpiTile label="Rejected" value={rejected} />
        <KpiTile label="On Hold" value={onHold} />
        <KpiTile label="Completed" value={completed} />
        <KpiTile label="From Inventory" value={fulfilled} />
        <KpiTile label="Paid" value={paid} />
      </div>

      {/* SLA Metrics Strip */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 16px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap', rowGap: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginRight: 16, whiteSpace: 'nowrap' }}>Business SLA</span>
        {[
          { label: 'Total Delayed', value: slaDelayed.length, color: '#DC2626', href: '/pending-delays' },
          { label: 'Delayed Today', value: slaDelayedToday.length, color: '#EA580C', href: '/pending-delays' },
          { label: 'Delayed This Week', value: slaDelayedWeek.length, color: '#B45309', href: '/pending-delays' },
          { label: 'SLA Compliance', value: `${avgCompliance}%`, color: avgCompliance >= 80 ? '#059669' : avgCompliance >= 60 ? '#D97706' : '#DC2626', href: '/pending-delays' },
          { label: 'Avg Stage Time', value: fmtBizHours(avgBizHrs), color: '#7C3AED', href: '/pending-delays' },
        ].map(({ label, value, color, href }, i) => (
          <Link key={label} href={href} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            {i > 0 && <span style={{ width: 1, height: 28, background: 'var(--border)', margin: '0 12px', flexShrink: 0 }} />}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1 }}>{value}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
            </div>
          </Link>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>Mon–Fri + 2nd/4th/5th Sat · 09:00–18:00</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
          {/* Stage Pipeline */}
          <div className="ifh-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Stage Pipeline
              </h2>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 580 }}>
              {stageCounts.map(({ stage, count }) => {
                const route = WORKFLOW_ROUTES[stage.number]?.list || '/dashboard';
                return (
                  <Link key={stage.number} href={route} style={{ textDecoration: 'none' }}>
                    <div
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 16px', borderBottom: '1px solid var(--border)',
                        cursor: 'pointer', transition: 'background 120ms',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--surface2)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                    >
                      <span style={{
                        width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0,
                        background: 'var(--surface2)', color: 'var(--text-muted)',
                      }}>
                        {stage.number}
                      </span>
                      <span style={{ flex: 1, fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>
                        {stage.name}
                      </span>
                      <span style={{
                        fontSize: 13, fontWeight: 700,
                        color: count > 0 ? 'var(--primary)' : 'var(--text-muted)',
                      }}>
                        {count}
                      </span>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: count > 0 ? '#22c55e' : 'var(--border)',
                      }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="ifh-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Live Indent Tracker
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Current stage · responsible person · planned vs actual · delay</p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="ifh-table" >
                <thead>
                  <tr>
                    <th >Ref No</th>
                    <th >Title</th>
                    <th >Current Stage</th>
                    <th >Responsible</th>
                    <th >Assigned</th>
                    <th >Deadline</th>
                    <th >Delay (Biz)</th>
                    <th >SLA</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        No records found
                      </td>
                    </tr>
                  )}
                  {recent.map((r, i) => {
                    const stageName = PROCUREMENT_STAGES.find(s => s.number === r.currentStage)?.name || `Stage ${r.currentStage}`;
                    const slaEntry = slaData.find(d => d.r.id === r.id);
                    const sla = slaEntry?.sla;
                    const responsible = slaEntry?.responsible || RESPONSIBLES[i % RESPONSIBLES.length];
                    return (
                    <tr key={r.id}>
                      <td >
                        {r.referenceNo}
                      </td>
                      <td >
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.title}
                        </span>
                      </td>
                      <td >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 20, height: 20, borderRadius: 5, background: 'var(--surface2)', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }}>{r.currentStage}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{stageName}</span>
                        </span>
                      </td>
                      <td >{responsible}</td>
                      <td >{sla ? sla.assignedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</td>
                      <td >{sla ? sla.deadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</td>
                      <td >
                        {sla && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: sla.delayHours > 0 ? '#DC2626' : sla.delayHours < 0 ? '#059669' : '#0F7B45' }}>
                            {sla.delayHours > 0 ? `+${fmtBizHours(sla.delayHours)}` : sla.delayHours < 0 ? `-${fmtBizHours(-sla.delayHours)}` : 'On Time'}
                          </span>
                        )}
                      </td>
                      <td style={tdStyle}>{sla && <SLAPill status={sla.status} />}</td>
                    </tr>
                    );
                  })
                }
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={8} style={{ padding: '8px 12px', fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
                      Showing 10 most recent · business TAT engine: Mon–Fri + 2nd/4th/5th Sat · 09:00–18:00
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
    </div>
  );
}
