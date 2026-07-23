'use client';

import { useState, useMemo } from 'react';
import { AlertTriangle, X, TrendingUp, Users, Building2, Activity, ChevronRight } from 'lucide-react';
import { type ReportRecord } from '@/lib/api/procurement';
import { useAllReportRecords } from '@/hooks/useQueries';
import { PROCUREMENT_STAGES } from '@/lib/procurement-stages';
import {
  computeSLA, fmtBizHours, slaStatusConfig, STAGE_TAT,
  type SLAResult,
} from '@/lib/business-tat';

// ─── Enrich records with SLA using business TAT engine ───────────────────────

interface EnrichedRecord {
  record: ReportRecord;
  sla: SLAResult;
  responsible: string;
  pendingDays: number;
  expectedCompletion: Date;
  assignedAt: Date;
}

const PROJ_RESPONSIBLES = ['Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sneha Desai', 'Vikram Singh', 'Ananya Gupta'];

function resolveResponsible(r: ReportRecord, i: number): string {
  const cfg = STAGE_TAT[r.currentStage];
  if (cfg?.responsible?.length) return cfg.responsible[0];
  if (r.requestedBy?.fullName) return r.requestedBy.fullName;
  return PROJ_RESPONSIBLES[i % PROJ_RESPONSIBLES.length];
}

function enrichRecord(r: ReportRecord, i: number): EnrichedRecord {
  // Simulate assignedAt: record created + sum of prior stage TATs
  const created = new Date(r.createdAt);
  // Offset into the workflow: each prior stage consumed its TAT
  let bizOffset = 0;
  for (let s = 1; s < r.currentStage; s++) bizOffset += (STAGE_TAT[s]?.tatHours ?? 8);
  // Assign at created + prior stage business hours (simplified: treated as calendar hours for mock)
  const assignedAt = new Date(created.getTime() + bizOffset * 3600000);
  const sla = computeSLA(r.currentStage, assignedAt, null);
  const pendingDays = Math.floor((Date.now() - created.getTime()) / 86400000);
  // Expected completion = current stage deadline + remaining stages estimate
  const remainingStages = 23 - r.currentStage;
  const expectedCompletion = new Date(sla.deadline.getTime() + remainingStages * 2 * 86400000);
  const cfg = STAGE_TAT[r.currentStage];
  const responsible = resolveResponsible(r, i);
  return { record: r, sla, responsible, pendingDays, expectedCompletion, assignedAt };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
}

function fmtDateTime(d: Date) {
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
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

function KpiCard({ label, value, color, sub, onClick, active }: { label: string; value: number | string; color: string; sub?: string; onClick?: () => void; active?: boolean }) {
  return (
    <div onClick={onClick} style={{
      background: active ? color : 'var(--card)', border: `1px solid ${active ? color : 'var(--border)'}`,
      borderRadius: 12, padding: '14px 18px', cursor: onClick ? 'pointer' : 'default',
      boxShadow: active ? `0 0 0 3px ${color}22` : 'var(--shadow-xs)', transition: 'all 120ms',
    }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: active ? '#fff' : color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: active ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: active ? 'rgba(255,255,255,0.6)' : 'var(--text-faint)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ flex: 1, height: 5, borderRadius: 99, background: 'var(--border)' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99 }} />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.07em', borderLeft: '3px solid var(--primary)', paddingLeft: 9 }}>
      {children}
    </div>
  );
}

// ─── Drill-down modal ─────────────────────────────────────────────────────────

function DrillDown({ title, rows, onClose }: { title: string; rows: EnrichedRecord[]; onClose: () => void }) {
  
  
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, width: 960, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-xl)' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{title} <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>({rows.length} records)</span></span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X style={{ width: 16, height: 16 }} /></button>
        </div>
        <div style={{ overflowY: 'auto' }}>
          <table className="ifh-table" >
            <thead>
              <tr>
                {['Indent No', 'Project', 'Stage', 'Responsible', 'Assigned At', 'Deadline', 'Biz Hrs Consumed', 'TAT', 'Delay', 'SLA', 'Pending', 'Expected'].map(h => (
                  <th key={h} >{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={12} >No records</td></tr>
              ) : rows.map(({ record: r, sla, responsible, pendingDays, expectedCompletion, assignedAt }, i) => {
                const stageName = PROCUREMENT_STAGES.find(s => s.number === r.currentStage)?.name || `Stage ${r.currentStage}`;
                return (
                  <tr key={r.id} style={{ background: i % 2 === 0 ? 'var(--card)' : 'var(--surface2)' }}>
                    <td >
                      <a href={`/procurement/${r.id}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>{r.referenceNo}</a>
                    </td>
                    <td >{(r as any).projectName || '—'}</td>
                    <td >{r.currentStage} — {stageName}</td>
                    <td >{responsible}</td>
                    <td >{fmtDateTime(assignedAt)}</td>
                    <td >{fmtDateTime(sla.deadline)}</td>
                    <td >{fmtBizHours(sla.bizHoursConsumed)}</td>
                    <td >{sla.tatHours}h</td>
                    <td >
                      <span style={{ fontWeight: 700, color: sla.delayHours > 0 ? '#DC2626' : '#059669' }}>
                        {sla.delayHours > 0 ? `+${fmtBizHours(sla.delayHours)}` : sla.delayHours < 0 ? `-${fmtBizHours(-sla.delayHours)}` : 'On Time'}
                      </span>
                    </td>
                    <td ><SLAPill status={sla.status} /></td>
                    <td >{pendingDays}d</td>
                    <td >{fmtDate(expectedCompletion)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function PendingDelaysPage() {
  const { data: allRecords = [], isLoading: loading } = useAllReportRecords();
  const [filterProject, setFilterProject] = useState('');
  const [filterResponsible, setFilterResponsible] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterBucket, setFilterBucket] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [drill, setDrill] = useState<{ title: string; rows: EnrichedRecord[] } | null>(null);

  const enriched = useMemo(() =>
    allRecords.map((r, i) => enrichRecord(r, i)),
    [allRecords]
  );

  const filtered = useMemo(() => enriched.filter(e => {
    if (filterProject && (e.record as any).projectName !== filterProject) return false;
    if (filterResponsible && e.responsible !== filterResponsible) return false;
    if (filterStage && e.record.currentStage !== Number(filterStage)) return false;
    if (filterStatus && e.record.status !== filterStatus) return false;
    if (filterBucket) {
      const d = e.sla.delayHours;
      if (filterBucket === 'delayed' && !(d > 0)) return false;
      if (filterBucket === 'at_risk' && e.sla.status !== 'at_risk') return false;
      if (filterBucket === 'on_time' && e.sla.status !== 'on_time') return false;
    }
    return true;
  }), [enriched, filterProject, filterResponsible, filterStage, filterBucket, filterStatus]);

  // KPI counts
  const delayed = filtered.filter(e => e.sla.status === 'delayed');
  const atRisk = filtered.filter(e => e.sla.status === 'at_risk');
  const onTime = filtered.filter(e => e.sla.status === 'on_time');
  const pending = filtered.filter(e => ['DRAFT', 'IN_PROGRESS'].includes(e.record.status));

  // Today / this week
  const now = Date.now();
  const dayMs = 86400000;
  const delayedToday = delayed.filter(e => e.sla.deadline.getTime() > now - dayMs && e.sla.deadline.getTime() <= now);
  const delayedWeek = delayed.filter(e => e.sla.deadline.getTime() > now - 7 * dayMs && e.sla.deadline.getTime() <= now);

  // Avg SLA compliance
  const avgCompliance = filtered.length > 0
    ? Math.round((onTime.length / filtered.length) * 100)
    : 100;

  // Avg stage completion (biz hours consumed across all)
  const avgBizHrs = filtered.length > 0
    ? filtered.reduce((s, e) => s + e.sla.bizHoursConsumed, 0) / filtered.length
    : 0;

  // Stage analytics
  const stageAnalytics = PROCUREMENT_STAGES.filter(s => s.number > 0 && s.number < 23).map(s => {
    const atStage = filtered.filter(e => e.record.currentStage === s.number);
    const atDelayed = atStage.filter(e => e.sla.status === 'delayed');
    const delays = atDelayed.map(e => e.sla.delayHours);
    const worst = atDelayed.reduce((m, e) => e.sla.delayHours > m.sla.delayHours ? e : m, atDelayed[0]);
    const cfg = STAGE_TAT[s.number];
    return {
      stage: s, cfg,
      total: atStage.length,
      delayed: atDelayed.length,
      atRisk: atStage.filter(e => e.sla.status === 'at_risk').length,
      avgDelayH: delays.length > 0 ? delays.reduce((a, b) => a + b, 0) / delays.length : 0,
      maxDelayH: delays.length > 0 ? Math.max(...delays) : 0,
      totalDelayH: delays.reduce((a, b) => a + b, 0),
      worst: worst || null,
    };
  }).filter(s => s.total > 0).sort((a, b) => b.delayed - a.delayed);

  // Bottlenecks
  const PROJECTS = ['SSPCL Singrauli', 'NTPC Vindhyachal', 'Adani Mundra', 'CESC Budge Budge', 'JSW Ratnagiri', 'Tata Power', 'NHPC', 'SJVN'];
  const byProject = Object.entries(
    filtered.reduce((acc, e) => {
      const p = (e.record as any).projectName || 'Unknown';
      if (!acc[p]) acc[p] = { delayed: 0, total: 0 };
      acc[p].total++;
      if (e.sla.status === 'delayed') acc[p].delayed++;
      return acc;
    }, {} as Record<string, { delayed: number; total: number }>)
  ).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.delayed - a.delayed).slice(0, 8);

  const byResponsible = Object.entries(
    filtered.reduce((acc, e) => {
      const r = e.responsible;
      if (!acc[r]) acc[r] = { delayed: 0, total: 0, totalDelayH: 0 };
      acc[r].total++;
      if (e.sla.status === 'delayed') { acc[r].delayed++; acc[r].totalDelayH += e.sla.delayHours; }
      return acc;
    }, {} as Record<string, { delayed: number; total: number; totalDelayH: number }>)
  ).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.totalDelayH - a.totalDelayH).slice(0, 6);

  const maxProjDel = Math.max(...byProject.map(p => p.delayed), 1);
  const maxRespDelH = Math.max(...byResponsible.map(r => r.totalDelayH), 1);

  const uniqueProjects = [...new Set(allRecords.map(r => (r as any).projectName).filter(Boolean))];
  const allResponsibles = [...new Set(Object.values(STAGE_TAT).flatMap(c => c.responsible))].filter(Boolean);
  const hasFilter = filterProject || filterResponsible || filterStage || filterBucket || filterStatus;

  const inputS: React.CSSProperties = { height: 32, padding: '0 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--card)', fontSize: 12, color: 'var(--text-primary)', outline: 'none' };
  
  

  const mgmtRows = [...filtered].sort((a, b) => b.sla.delayHours - a.sla.delayHours).slice(0, 20);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)', fontSize: 14 }}>
      Loading...
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface2)' }}>
      {/* Header */}
      <div style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)', padding: '16px max(16px, min(28px, 3vw))' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="font-display" style={{ fontSize: 20, fontWeight: 400, color: 'var(--text-primary)', margin: 0 }}>
              Pending & Delayed Tasks Analytics
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Business TAT engine — Mon–Fri + 2nd/4th/5th Sat · 09:00–18:00 · 9h/day
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select style={inputS} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
              <option value="">All Projects</option>
              {uniqueProjects.map(p => <option key={p}>{p}</option>)}
            </select>
            <select style={inputS} value={filterResponsible} onChange={e => setFilterResponsible(e.target.value)}>
              <option value="">All Responsible</option>
              {allResponsibles.map(r => <option key={r}>{r}</option>)}
            </select>
            <select style={inputS} value={filterStage} onChange={e => setFilterStage(e.target.value)}>
              <option value="">All Stages</option>
              {PROCUREMENT_STAGES.filter(s => s.number > 0 && s.number < 23).map(s => (
                <option key={s.number} value={s.number}>{s.number} — {s.name}</option>
              ))}
            </select>
            <select style={inputS} value={filterBucket} onChange={e => setFilterBucket(e.target.value)}>
              <option value="">All SLA Status</option>
              <option value="delayed">Delayed</option>
              <option value="at_risk">At Risk</option>
              <option value="on_time">On Time</option>
            </select>
            <select style={inputS} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Record Status</option>
              {['DRAFT', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'REJECTED'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            {hasFilter && (
              <button onClick={() => { setFilterProject(''); setFilterResponsible(''); setFilterStage(''); setFilterBucket(''); setFilterStatus(''); }}
                style={{ ...inputS, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: 'var(--primary)', fontWeight: 600 }}>
                <X style={{ width: 12, height: 12 }} /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '20px max(16px, min(28px, 3vw))', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Command Center KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
          <KpiCard label="Total Delayed" value={delayed.length} color="#DC2626"
            active={filterBucket === 'delayed'} onClick={() => { setFilterBucket('delayed'); setDrill({ title: 'All Delayed', rows: delayed }); }} />
          <KpiCard label="At Risk" value={atRisk.length} color="#D97706"
            active={filterBucket === 'at_risk'} onClick={() => { setFilterBucket('at_risk'); setDrill({ title: 'At Risk', rows: atRisk }); }} />
          <KpiCard label="On Time" value={onTime.length} color="#059669"
            active={filterBucket === 'on_time'} onClick={() => { setFilterBucket('on_time'); setDrill({ title: 'On Time', rows: onTime }); }} />
          <KpiCard label="Delayed Today" value={delayedToday.length} color="#EA580C"
            onClick={() => setDrill({ title: 'Delayed Today', rows: delayedToday })} />
          <KpiCard label="Delayed This Week" value={delayedWeek.length} color="#B45309"
            onClick={() => setDrill({ title: 'Delayed This Week', rows: delayedWeek })} />
          <KpiCard label="SLA Compliance" value={`${avgCompliance}%`} color={avgCompliance >= 80 ? '#059669' : avgCompliance >= 60 ? '#D97706' : '#DC2626'} sub="across all stages" />
          <KpiCard label="Avg Stage Time" value={fmtBizHours(avgBizHrs)} color="#7C3AED" sub="business hours" />
        </div>

        {/* Stage TAT config strip */}
        <div>
          <SectionTitle>Stage TAT Configuration (Business Hours)</SectionTitle>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.values(STAGE_TAT).map(cfg => (
              <div key={cfg.stage} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', fontSize: 11, display: 'flex', flex: '0 0 auto', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 9, fontWeight: 700, background: 'var(--surface2)', borderRadius: 4, padding: '1px 5px', color: 'var(--text-muted)' }}>{cfg.stage}</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cfg.name}</span>
                <span style={{ fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace' }}>{cfg.tatHours}h</span>
                {cfg.responsible.length > 0 && (
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{cfg.responsible.join(', ')}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>

          {/* Stage-wise SLA analytics */}
          <div>
            <SectionTitle>Step-wise SLA Analytics — Business TAT</SectionTitle>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <table className="ifh-table" >
                <thead>
                  <tr>
                    {['Stage', 'TAT', 'Total', 'Delayed', 'At Risk', 'Avg Delay', 'Max Delay', 'Responsible', 'Worst Indent', ''].map(h => (
                      <th key={h} >{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stageAnalytics.length === 0 ? (
                    <tr><td colSpan={10} >No data</td></tr>
                  ) : stageAnalytics.map(({ stage, cfg, total, delayed: del, atRisk: ar, avgDelayH, maxDelayH, worst }) => (
                    <tr key={stage.number}
                      style={{ cursor: del > 0 ? 'pointer' : 'default' }}
                      onClick={() => del > 0 && setDrill({ title: `SLA Breached — ${stage.name}`, rows: filtered.filter(e => e.record.currentStage === stage.number && e.sla.status === 'delayed') })}
                      onMouseEnter={e => { if (del > 0) (e.currentTarget as HTMLTableRowElement).style.background = 'var(--surface2)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                    >
                      <td >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 20, height: 20, borderRadius: 4, background: 'var(--surface2)', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }}>{stage.number}</span>
                          <span style={{ fontSize: 12 }}>{stage.name}</span>
                        </span>
                      </td>
                      <td >{cfg?.tatHours ?? '—'}h</td>
                      <td >{total}</td>
                      <td ><span style={{ fontWeight: 700, color: del > 0 ? '#DC2626' : 'var(--text-faint)' }}>{del}</span></td>
                      <td ><span style={{ fontWeight: 600, color: ar > 0 ? '#D97706' : 'var(--text-faint)' }}>{ar}</span></td>
                      <td ><span style={{ color: avgDelayH > 0 ? '#DC2626' : '#059669', fontWeight: 600 }}>{avgDelayH > 0 ? `+${fmtBizHours(avgDelayH)}` : '—'}</span></td>
                      <td ><span style={{ color: maxDelayH > 0 ? '#DC2626' : 'var(--text-faint)', fontWeight: 700 }}>{maxDelayH > 0 ? `+${fmtBizHours(maxDelayH)}` : '—'}</span></td>
                      <td >{cfg?.responsible?.join(', ') || '—'}</td>
                      <td >{worst?.record.referenceNo || '—'}</td>
                      <td >{del > 0 && <ChevronRight style={{ width: 12, height: 12, color: 'var(--text-muted)' }} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottlenecks */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <SectionTitle>Top Delayed Projects</SectionTitle>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
                {byProject.map(p => (
                  <div key={p.name}
                    onClick={() => setDrill({ title: `Delayed — ${p.name}`, rows: filtered.filter(e => (e.record as any).projectName === p.name && e.sla.status === 'delayed') })}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                    <Building2 style={{ width: 12, height: 12, color: 'var(--text-faint)', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    <MiniBar value={p.delayed} max={maxProjDel} color="#DC2626" />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#DC2626', minWidth: 20, textAlign: 'right' }}>{p.delayed}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <SectionTitle>SLA Breach by Responsible Person</SectionTitle>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
                {byResponsible.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>No assigned delays</p>
                ) : byResponsible.map(r => (
                  <div key={r.name}
                    onClick={() => setDrill({ title: `SLA Breach — ${r.name}`, rows: filtered.filter(e => e.responsible === r.name && e.sla.status === 'delayed') })}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                    <Users style={{ width: 12, height: 12, color: 'var(--text-faint)', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{r.delayed} delayed</span>
                    <MiniBar value={r.totalDelayH} max={maxRespDelH} color="#EA580C" />
                    <span style={{ fontSize: 11, color: '#EA580C', fontWeight: 700, minWidth: 36, textAlign: 'right' }}>{fmtBizHours(r.totalDelayH)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Workflow heatmap */}
        <div>
          <SectionTitle>Workflow SLA Heatmap (Business TAT)</SectionTitle>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PROCUREMENT_STAGES.filter(s => s.number > 0 && s.number <= 22).map(s => {
                const atStage = filtered.filter(e => e.record.currentStage === s.number);
                const delCnt = atStage.filter(e => e.sla.status === 'delayed').length;
                const riskCnt = atStage.filter(e => e.sla.status === 'at_risk').length;
                const pct = atStage.length > 0 ? delCnt / atStage.length : 0;
                const bg = atStage.length === 0 ? 'var(--surface2)' :
                  pct === 0 && riskCnt === 0 ? '#D1FAE5' :
                  pct === 0 && riskCnt > 0 ? '#FEF3C7' :
                  pct < 0.4 ? '#FDE68A' :
                  pct < 0.7 ? '#FCA5A5' : '#DC2626';
                const textC = pct >= 0.7 && atStage.length > 0 ? '#fff' : atStage.length === 0 ? 'var(--text-faint)' : '#111';
                const cfg = STAGE_TAT[s.number];
                return (
                  <div key={s.number}
                    onClick={() => delCnt > 0 && setDrill({ title: `Delayed — ${s.name}`, rows: atStage.filter(e => e.sla.status === 'delayed') })}
                    title={`${s.name} · TAT ${cfg?.tatHours ?? '—'}h · ${delCnt}/${atStage.length} delayed`}
                    style={{ padding: '8px 10px', borderRadius: 8, background: bg, color: textC, cursor: delCnt > 0 ? 'pointer' : 'default', minWidth: 78, textAlign: 'center' }}>
                    <div style={{ fontSize: 9, opacity: 0.7, marginBottom: 2 }}>Stage {s.number}</div>
                    <div style={{ fontSize: 10, lineHeight: 1.2, marginBottom: 4, fontWeight: 600 }}>{s.name}</div>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{delCnt}</div>
                    <div style={{ fontSize: 9, opacity: 0.8 }}>{cfg?.tatHours ?? '—'}h TAT</div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 12, fontSize: 11, color: 'var(--text-muted)', alignItems: 'center' }}>
              <span>SLA:</span>
              {[['#D1FAE5', 'On Time'], ['#FEF3C7', 'At Risk (80%+)'], ['#FDE68A', '<40% delayed'], ['#FCA5A5', '<70% delayed'], ['#DC2626', '>70% delayed']].map(([c, l]) => (
                <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: c, display: 'inline-block', border: '1px solid rgba(0,0,0,0.1)' }} /> {l}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Management table */}
        <div>
          <SectionTitle>Management View — SLA Breach Detail (Top 20)</SectionTitle>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="ifh-table" >
                <thead>
                  <tr>
                    {['Indent No', 'Project', 'Stage', 'Responsible Person', 'TAT', 'Biz Hrs Used', 'Delay', 'SLA', 'Status', 'Pending', 'Expected Completion'].map(h => (
                      <th key={h} >{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mgmtRows.map(({ record: r, sla, responsible, pendingDays, expectedCompletion }, i) => {
                    const stageName = PROCUREMENT_STAGES.find(s => s.number === r.currentStage)?.name || `Stage ${r.currentStage}`;
                    return (
                      <tr key={r.id}
                        style={{ background: i % 2 === 0 ? 'var(--card)' : 'var(--surface2)', cursor: 'pointer' }}
                        onClick={() => setDrill({ title: r.referenceNo, rows: [{ record: r, sla, responsible, pendingDays, expectedCompletion, assignedAt: sla.assignedAt }] })}
                        onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(15,123,69,0.05)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = i % 2 === 0 ? 'var(--card)' : 'var(--surface2)'; }}
                      >
                        <td >
                          <a href={`/procurement/${r.id}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>{r.referenceNo}</a>
                        </td>
                        <td >{(r as any).projectName || '—'}</td>
                        <td >{r.currentStage} — {stageName}</td>
                        <td >{responsible}</td>
                        <td >{sla.tatHours}h</td>
                        <td >{fmtBizHours(sla.bizHoursConsumed)}</td>
                        <td >
                          <span style={{ fontWeight: 700, color: sla.delayHours > 0 ? '#DC2626' : sla.delayHours < 0 ? '#059669' : 'var(--text-muted)' }}>
                            {sla.delayHours > 0 ? `+${fmtBizHours(sla.delayHours)}` : sla.delayHours < 0 ? `-${fmtBizHours(-sla.delayHours)}` : '0'}
                          </span>
                        </td>
                        <td ><SLAPill status={sla.status} /></td>
                        <td >
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: r.status === 'COMPLETED' ? '#D1FAE5' : r.status === 'ON_HOLD' ? '#FEF3C7' : '#DBEAFE', color: r.status === 'COMPLETED' ? '#065F46' : r.status === 'ON_HOLD' ? '#92400E' : '#1D4ED8' }}>
                            {r.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td >{pendingDays}d</td>
                        <td >{fmtDate(expectedCompletion)}</td>
                      </tr>
                    );
                  })}
                  {mgmtRows.length === 0 && (
                    <tr><td colSpan={11} >No records</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Command Center nav */}
        <div>
          <SectionTitle>Command Center</SectionTitle>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { label: 'Operations Dashboard', href: '/control-tower', icon: Activity },
              { label: 'Indent Lifecycle', href: '/indent-lifecycle', icon: TrendingUp },
              { label: 'Pending & Delays', href: '/pending-delays', icon: AlertTriangle },
            ].map(({ label, href, icon: Icon }) => (
              <a key={href} href={href}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 10, border: `1px solid ${href === '/pending-delays' ? 'var(--primary)' : 'var(--border)'}`, background: 'var(--card)', textDecoration: 'none', fontSize: 13, fontWeight: 600, color: href === '/pending-delays' ? 'var(--primary)' : 'var(--text-primary)' }}>
                <Icon style={{ width: 13, height: 13 }} /> {label}
              </a>
            ))}
          </div>
        </div>

      </div>

      {drill && <DrillDown title={drill.title} rows={drill.rows} onClose={() => setDrill(null)} />}
    </div>
  );
}
