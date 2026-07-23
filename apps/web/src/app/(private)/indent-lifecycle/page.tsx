'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Filter, X, Eye, Download, Edit2, FileText, CheckCircle2,
  Clock, XCircle, AlertCircle, User, ArrowLeft, LayoutGrid, List,
  ChevronDown, ExternalLink
} from 'lucide-react';
import { type ReportRecord } from '@/lib/api/procurement';
import { useAllReportRecords } from '@/hooks/useQueries';
import { PROCUREMENT_STAGES } from '@/lib/procurement-stages';
import { computeSLA, fmtBizHours, slaStatusConfig, STAGE_TAT, type SLAResult } from '@/lib/business-tat';

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_FILTERS = [
  { label: 'Indent Verification', stage: 1 },
  { label: 'Store Availability', stage: 2 },
  { label: 'RFQ', stage: 3 },
  { label: 'Evaluation', stage: 4 },
  { label: 'Negotiation', stage: 5 },
  { label: 'PO Creation', stage: 6 },
  { label: 'PO Approval 1', stage: 7 },
  { label: 'PO Approval 2', stage: 8 },
  { label: 'Vendor Acceptance', stage: 9 },
  { label: 'Vendor Follow Up', stage: 10 },
  { label: 'Material Receipt', stage: 11 },
  { label: 'Inspection', stage: 12 },
  { label: 'Debit Note', stage: 15 },
  { label: 'Bill To Accounts', stage: 16 },
  { label: 'Bill To Purchase', stage: 17 },
  { label: 'Bill Creation', stage: 18 },
  { label: 'Tally Entry', stage: 19 },
  { label: 'Bill Approval 1', stage: 20 },
  { label: 'Bill Approval 2', stage: 21 },
  { label: 'Payment Advice', stage: 22 },
];

const PAGE_SIZES = [10, 25, 50, 100];

// Mock per-record FMS fields (deterministic from record index) — real fields pulled from record when available
const RESPONSIBLES = ['Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sneha Desai', 'Vikram Singh', 'Ananya Gupta'];
const UOMS = ['Nos', 'Kg', 'MT', 'Ltr', 'Set', 'Mtr', 'Unit'];
const PAINTING_SPECS = ['Epoxy primer + polyurethane topcoat', 'Hot dip galvanized', 'Red oxide primer', '—', '2 coat epoxy, 75μm DFT'];
const PACKING_REQS = ['Wooden crate', 'Bubble wrap + cardboard', 'Standard packing', 'Waterproof packing'];
const CERTS = ['IBR', 'BIS', 'CE Mark', 'ATEX', 'ISO 9001', '—'];

function resolveDoerName(r: ReportRecord): string {
  // Real assignee (from ProcurementStage.assignedToId, resolved server-side —
  // including AO carry-forward for RFQ/TCE/Negotiation/PO Creation) wins.
  if (r.assignedTo?.fullName) return r.assignedTo.fullName;
  const cfg = STAGE_TAT[r.currentStage];
  if (cfg?.responsible?.length) return cfg.responsible.join(', ');
  return '—';
}

function resolveLifecycleResponsible(r: ReportRecord, i: number): string {
  const cfg = STAGE_TAT[r.currentStage];
  if (cfg?.responsible?.length) return cfg.responsible[0];
  if (r.requestedBy?.fullName) return r.requestedBy.fullName;
  return RESPONSIBLES[i % RESPONSIBLES.length];
}

function computeRecordSLA(r: ReportRecord): SLAResult {
  let bizOffset = 0;
  for (let s = 1; s < r.currentStage; s++) bizOffset += (STAGE_TAT[s]?.tatHours ?? 8);
  const assignedAt = new Date(new Date(r.createdAt).getTime() + bizOffset * 3600000);
  return computeSLA(r.currentStage, assignedAt, null);
}

function mockFMS(r: ReportRecord, idx: number) {
  const i = idx;
  const rec = r as any;
  const planDate = new Date(new Date(r.createdAt).getTime() + ((i % 7) + 3) * 86400000);
  const delayDays = [-2, 0, 3, 1, -1, 5, 0, 2, -3, 4][i % 10];
  const actualDate = new Date(planDate.getTime() + delayDays * 86400000);
  const pendingMs = Date.now() - new Date(r.createdAt).getTime();
  const pendingDays = Math.floor(pendingMs / 86400000);
  const item = rec.items?.[0];
  return {
    responsible: resolveLifecycleResponsible(r, i),
    doer: resolveDoerName(r),
    filledBy: r.requestedBy?.fullName || RESPONSIBLES[(i + 2) % RESPONSIBLES.length],
    planned: planDate,
    actual: actualDate,
    delayDays,
    pendingDays,
    itemwiseNo: `${r.referenceNo}-I${String((i % 3) + 1).padStart(2, '0')}`,
    skuCode: item?.itemCode || `SKU-${String(i + 1).padStart(4, '0')}`,
    itemDesc: item?.itemName || 'Steel Pipes DN200',
    qty: item?.quantity || 10,
    uom: item?.unit || UOMS[i % UOMS.length],
    // Use real fields from the procurement record when available
    techSpec: item?.technicalSpec || rec.items?.[0]?.technicalSpec || '—',
    approvedMakes: item?.approvedMakes || rec.items?.[0]?.approvedMakes || '—',
    requiredDate: rec.requiredDate ? new Date(rec.requiredDate) : new Date(new Date(r.createdAt).getTime() + (30 + i % 30) * 86400000),
    paintingSpec: rec.paintingSpec || PAINTING_SPECS[i % PAINTING_SPECS.length],
    packingReq: rec.packingRequirement || PACKING_REQS[i % PACKING_REQS.length],
    cert: rec.certification || CERTS[i % CERTS.length],
    manuals: rec.manuals || (i % 3 === 0 ? 'Required' : '—'),
    warrantyGuarantee: rec.warrantyGuarantee || (i % 4 === 0 ? '12 Months' : i % 4 === 1 ? '18 Months' : '—'),
    ga: rec.ga || (i % 5 === 0 ? 'Required' : '—'),
    // PO/GRN numbers: use vendorName as indicator or stage-based placeholder
    poNumber: r.currentStage >= 6 && rec.vendorName ? `${rec.vendorName} / PO-${r.currentStage >= 8 ? 'Approved' : 'Pending'}` : r.currentStage >= 6 ? `PO-2026-${String(i + 1).padStart(4, '0')}` : '—',
    grnNumber: r.currentStage >= 11 ? `GRN-2026-${String(i + 1).padStart(4, '0')}` : '—',
    indentRemarks: `Standard procurement for ${rec.projectName || 'project site'}`,
    itemType: rec.itemType || ['Mechanical', 'Electrical', 'Instrumentation', 'Civil', 'Consumable'][i % 5],
  };
}

// ─── Status color ─────────────────────────────────────────────────────────────
function statusPill(status: string) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    DRAFT: { bg: '#F3F4F6', color: '#6B7280', label: 'Draft' },
    IN_PROGRESS: { bg: '#DBEAFE', color: '#1D4ED8', label: 'Pending' },
    APPROVED: { bg: '#D1FAE5', color: '#065F46', label: 'Approved' },
    COMPLETED: { bg: '#D1FAE5', color: '#065F46', label: 'Completed' },
    ON_HOLD: { bg: '#FEF3C7', color: '#92400E', label: 'Hold' },
    REJECTED: { bg: '#FEE2E2', color: '#991B1B', label: 'Rejected' },
  };
  const s = map[status] || { bg: '#F3F4F6', color: '#6B7280', label: status };
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

function delayBadge(days: number) {
  if (days === 0) return <span style={{ fontSize: 11, fontWeight: 700, color: '#059669' }}>On Time</span>;
  if (days > 0) return <span style={{ fontSize: 11, fontWeight: 700, color: '#DC2626' }}>+{days}d</span>;
  return <span style={{ fontSize: 11, fontWeight: 700, color: '#059669' }}>{days}d</span>;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
}

// ─── Th ───────────────────────────────────────────────────────────────────────
function Th({ children, sticky }: { children: React.ReactNode; sticky?: boolean }) {
  return (
    <th style={{
      padding: '8px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.06em', color: 'var(--text-muted)', whiteSpace: 'nowrap',
      borderBottom: '2px solid var(--border)', borderRight: '1px solid var(--border)',
      background: 'var(--surface2)', textAlign: 'left',
      ...(sticky ? { position: 'sticky', left: 0, zIndex: 2, background: 'var(--surface2)' } : {}),
    }}>
      {children}
    </th>
  );
}

function Td({ children, mono, sticky }: { children: React.ReactNode; mono?: boolean; sticky?: boolean }) {
  return (
    <td style={{
      padding: '7px 10px', fontSize: 12, color: 'var(--text-primary)',
      borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)',
      whiteSpace: 'nowrap', fontFamily: mono ? 'monospace' : undefined,
      ...(sticky ? { position: 'sticky', left: 0, zIndex: 1, background: 'var(--card)' } : {}),
    }}>
      {children}
    </td>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────
function DetailDrawer({ record, fms, onClose }: { record: ReportRecord; fms: ReturnType<typeof mockFMS>; onClose: () => void }) {
  const progress = Math.round((record.currentStage / 23) * 100);
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, display: 'flex',
    }}>
      <div style={{ flex: 1, background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div style={{
        width: 540, background: 'var(--card)', borderLeft: '1px solid var(--border)',
        overflowY: 'auto', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace' }}>{record.referenceNo}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{fms.itemwiseNo}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X style={{ width: 18, height: 18 }} /></button>
        </div>

        <div style={{ padding: '16px 20px', flex: 1 }}>
          {/* Progress */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
              <span>Stage {record.currentStage} of 23 — {PROCUREMENT_STAGES.find(s => s.number === record.currentStage)?.name}</span>
              <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{progress}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, background: 'var(--primary)', width: `${progress}%` }} />
            </div>
          </div>

          {/* Info grid */}
          {[
            ['Title', record.title],
            ['Project', (record as any).projectName || record.projectId || '—'],
            ['Status', record.status],
            ['Priority', record.priority],
            ['Responsible Person', fms.responsible],
            ['Doer', fms.doer],
            ['Filled By', fms.filledBy],
            ['SKU Code', fms.skuCode],
            ['Item Description', fms.itemDesc],
            ['Quantity', `${fms.qty} ${fms.uom}`],
            ['Technical Spec', fms.techSpec || '—'],
            ['Approved Makes', fms.approvedMakes],
            ['Item Type', fms.itemType],
            ['Required Date', fmtDate(fms.requiredDate)],
            ['Painting Spec', fms.paintingSpec],
            ['Packing Req', fms.packingReq],
            ['Certification', fms.cert],
            ['Manuals', fms.manuals],
            ['Warranty', fms.warrantyGuarantee],
            ['GA', fms.ga],
            ['PO Number', fms.poNumber],
            ['GRN Number', fms.grnNumber],
            ['Planned Date', fmtDate(fms.planned)],
            ['Actual Date', fmtDate(fms.actual)],
            ['Time Delay', fms.delayDays === 0 ? 'On Time' : `${fms.delayDays > 0 ? '+' : ''}${fms.delayDays} days`],
            ['Pending Since', `${fms.pendingDays} days`],
            ['Indent Remarks', fms.indentRemarks],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '7px 0' }}>
              <span style={{ width: 160, fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', flexShrink: 0 }}>{k}</span>
              <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{v}</span>
            </div>
          ))}

          {/* Actions */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 20 }}>
            {[
              { label: 'Open Indent', href: `/procurement/${record.id}` },
              { label: 'Open PO', href: fms.poNumber !== '—' ? `/procurement/${record.id}?tab=po` : undefined },
              { label: 'Open GRN', href: fms.grnNumber !== '—' ? `/procurement/${record.id}?tab=grn` : undefined },
              { label: 'View Attachments', href: `/procurement/${record.id}?tab=attachments` },
            ].map(a => (
              <a key={a.label} href={a.href || '#'}
                style={{
                  padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  border: '1px solid var(--border)', color: a.href && a.href !== '#' ? 'var(--primary)' : 'var(--text-faint)',
                  textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5,
                  background: 'var(--surface2)', cursor: a.href && a.href !== '#' ? 'pointer' : 'not-allowed',
                  opacity: a.href && a.href !== '#' ? 1 : 0.5,
                }}>
                <ExternalLink style={{ width: 11, height: 11 }} /> {a.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function IndentLifecyclePage() {
  const { data: allRecords = [], isLoading: loading } = useAllReportRecords();
  const [search, setSearch] = useState('');
  const [stepFilter, setStepFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [fmsMode, setFmsMode] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [detailRecord, setDetailRecord] = useState<{ record: ReportRecord; fms: ReturnType<typeof mockFMS> } | null>(null);
  const [stepDropOpen, setStepDropOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [amendPoOpen, setAmendPoOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setStepDropOpen(false);
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Enrich records with mock FMS data once
  const enriched = useMemo(() =>
    allRecords.map((r, i) => ({ record: r, fms: mockFMS(r, i) })),
    [allRecords]
  );

  // Filter
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return enriched.filter(({ record: r, fms }) => {
      if (stepFilter !== null && r.currentStage !== stepFilter) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.referenceNo.toLowerCase().includes(q) ||
        fms.itemwiseNo.toLowerCase().includes(q) ||
        fms.filledBy.toLowerCase().includes(q) ||
        fms.doer.toLowerCase().includes(q) ||
        fms.responsible.toLowerCase().includes(q) ||
        fms.skuCode.toLowerCase().includes(q) ||
        fms.itemDesc.toLowerCase().includes(q) ||
        fms.poNumber.toLowerCase().includes(q) ||
        ((r as any).projectName || '').toLowerCase().includes(q) ||
        (r.projectId || '').toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q)
      );
    });
  }, [enriched, search, stepFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const allOnPageSelected = paginated.length > 0 && paginated.every(({ record }) => selectedIds.has(record.id));

  function toggleAll() {
    if (allOnPageSelected) {
      const next = new Set(selectedIds);
      paginated.forEach(({ record }) => next.delete(record.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      paginated.forEach(({ record }) => next.add(record.id));
      setSelectedIds(next);
    }
  }

  function clearFilters() {
    setSearch('');
    setStepFilter(null);
    setStatusFilter('');
    setPage(1);
  }

  const hasFilter = search || stepFilter !== null || statusFilter;
  const selCount = selectedIds.size;
  const selWithPO = [...selectedIds].filter(id => {
    const e = enriched.find(({ record }) => record.id === id);
    return e && e.fms.poNumber !== '—';
  }).length;

  function exportCSV() {
    const rows = filtered.map(({ record: r, fms }) => [
      r.referenceNo, fms.itemwiseNo, fms.filledBy, fms.doer, fms.responsible,
      r.projectId || '', (r as any).projectName || '', fms.skuCode, fms.itemDesc,
      fms.qty, fms.uom, fms.techSpec, fms.approvedMakes, r.status,
      PROCUREMENT_STAGES.find(s => s.number === r.currentStage)?.name || '',
      fmtDate(fms.planned), fmtDate(fms.actual),
      fms.delayDays === 0 ? 'On Time' : `${fms.delayDays > 0 ? '+' : ''}${fms.delayDays}d`,
      fms.poNumber, fms.grnNumber,
    ].join(','));
    const header = 'Indent No,Itemwise Indent No,Filled By,Doer,Responsible Person,Project ID,Project Name,SKU Code,Item Description,Qty,UOM,Tech Spec,Approved Makes,Status,Current Stage,Planned Date,Actual Date,Delay,PO Number,GRN Number';
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'indent-lifecycle-fms.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const btnStyle = (active?: boolean): React.CSSProperties => ({
    padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
    background: active ? 'var(--primary)' : 'var(--card)',
    color: active ? '#fff' : 'var(--text-primary)',
    display: 'flex', alignItems: 'center', gap: 6,
  });

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)', fontSize: 14 }}>
      Loading...
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface2)' }}>
      {/* TOP ACTION BAR */}
      <div style={{
        padding: '12px 24px', background: 'var(--card)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        position: 'sticky', top: 0, zIndex: 30,
      }}>
        {/* Step filter dropdown */}
        <div ref={dropRef} style={{ position: 'relative' }}>
          <button style={btnStyle(stepFilter !== null)} onClick={() => setStepDropOpen(v => !v)}>
            <Filter style={{ width: 13, height: 13 }} />
            Filter By Steps {stepFilter !== null && `(${STEP_FILTERS.find(s => s.stage === stepFilter)?.label})`}
            <ChevronDown style={{ width: 12, height: 12 }} />
          </button>
          {stepDropOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50,
              background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10,
              boxShadow: 'var(--shadow-lg)', minWidth: 220, maxHeight: 340, overflowY: 'auto', padding: 6,
            }}>
              <button onClick={() => { setStepFilter(null); setStepDropOpen(false); setPage(1); }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: stepFilter === null ? 700 : 400, color: stepFilter === null ? 'var(--primary)' : 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                All Steps
              </button>
              {STEP_FILTERS.map(s => (
                <button key={s.stage} onClick={() => { setStepFilter(s.stage); setStepDropOpen(false); setPage(1); }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: stepFilter === s.stage ? 700 : 400, color: stepFilter === s.stage ? 'var(--primary)' : 'var(--text-primary)', background: stepFilter === s.stage ? 'var(--primary-light)' : 'none', border: 'none', cursor: 'pointer' }}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ ...btnStyle(), paddingLeft: 10, paddingRight: 10, height: 34, appearance: 'none', minWidth: 130 } as React.CSSProperties}
        >
          <option value="">Filter Indents</option>
          {['DRAFT', 'IN_PROGRESS', 'ON_HOLD', 'APPROVED', 'COMPLETED', 'REJECTED'].map(s => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>

        {/* FMS toggle */}
        <button style={btnStyle(fmsMode)} onClick={() => setFmsMode(v => !v)}>
          <LayoutGrid style={{ width: 13, height: 13 }} />
          {fmsMode ? 'View FMS' : 'Simple View'}
        </button>

        {/* Clear */}
        {hasFilter && (
          <button style={btnStyle()} onClick={clearFilters}>
            <X style={{ width: 13, height: 13 }} /> Clear Filters
          </button>
        )}

        <div style={{ flex: 1 }} />

        {/* Bulk actions */}
        {selCount > 0 && (
          <>
            <button style={{ ...btnStyle(), background: 'var(--primary)', color: '#fff', border: 'none' }}>
              <Edit2 style={{ width: 13, height: 13 }} /> Edit Selected ({selCount})
            </button>
            {selWithPO > 0 && (
              <button style={{ ...btnStyle(), background: '#2563EB', color: '#fff', border: 'none' }} onClick={() => setAmendPoOpen(true)}>
                <FileText style={{ width: 13, height: 13 }} /> Amend PO Number ({selWithPO})
              </button>
            )}
          </>
        )}

        {/* Export */}
        <button style={btnStyle()} onClick={exportCSV}>
          <Download style={{ width: 13, height: 13 }} /> Bulk Export
        </button>
      </div>

      {/* SEARCH BAR */}
      <div style={{ padding: '10px 24px', background: 'var(--card)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 280 }}>
          <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-faint)' }} />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search indent no, filled by, doer, responsible, SKU, item, PO number, project..."
            style={{
              width: '100%', height: 34, paddingLeft: 32, paddingRight: search ? 30 : 12,
              borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)',
              fontSize: 13, color: 'var(--text-primary)', outline: 'none', fontFamily: 'var(--font-sans)',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--card)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface2)'; }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)' }}>
              <X style={{ width: 13, height: 13 }} />
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
          <span>Showing <strong style={{ color: 'var(--text-primary)' }}>{Math.min((page - 1) * pageSize + 1, filtered.length)}</strong> – <strong style={{ color: 'var(--text-primary)' }}>{Math.min(page * pageSize, filtered.length)}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> Itemwise Indents</span>
          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            style={{ height: 28, borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, background: 'var(--card)', color: 'var(--text-primary)', padding: '0 8px' }}>
            {PAGE_SIZES.map(s => <option key={s} value={s}>{s} / page</option>)}
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div style={{ overflowX: 'auto', flex: 1 }}>
        <table className="ifh-table" >
          <thead>
            <tr>
              <Th sticky>
                <input type="checkbox" checked={allOnPageSelected} onChange={toggleAll} style={{ cursor: 'pointer' }} />
              </Th>
              <Th>Actions</Th>
              <Th>Pending Since</Th>
              <Th>Pending Stage</Th>
              <Th>Doer Name</Th>
              <Th>Indent Raised</Th>
              <Th>Itemwise Indent No</Th>
              <Th>Filled By</Th>
              <Th>Project ID</Th>
              <Th>Project Name</Th>
              <Th>Item Type</Th>
              <Th>Remarks</Th>
              <Th>SKU Code</Th>
              <Th>Item Description</Th>
              <Th>Qty</Th>
              <Th>UOM</Th>
              {fmsMode && <>
                <Th>Tech Spec</Th>
                <Th>Approved Makes</Th>
                <Th>Required Date</Th>
                <Th>Painting Spec</Th>
                <Th>Packing Req</Th>
                <Th>Certification</Th>
                <Th>Manuals</Th>
                <Th>Warranty</Th>
                <Th>GA</Th>
                <Th>Indent Form</Th>
              </>}
              <Th>PO Number</Th>
              <Th>GRN Number</Th>
              <Th>Current Status</Th>
              <Th>Current Stage</Th>
              <Th>Responsible Person</Th>
              <Th>Planned Date</Th>
              <Th>Actual Date</Th>
              <Th>Time Delay</Th>
              <Th>TAT (Biz)</Th>
              <Th>Biz Hrs Used</Th>
              <Th>SLA Status</Th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={fmsMode ? 36 : 26} style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  No records match your filters
                </td>
              </tr>
            ) : paginated.map(({ record: r, fms }, ri) => {
              const isSel = selectedIds.has(r.id);
              const stageName = PROCUREMENT_STAGES.find(s => s.number === r.currentStage)?.name || `Stage ${r.currentStage}`;
              return (
                <tr key={r.id}
                  style={{ background: isSel ? 'rgba(15,123,69,0.04)' : ri % 2 === 0 ? 'var(--card)' : 'var(--surface2)', cursor: 'default' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(15,123,69,0.06)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = isSel ? 'rgba(15,123,69,0.04)' : ri % 2 === 0 ? 'var(--card)' : 'var(--surface2)'; }}
                >
                  <Td sticky>
                    <input type="checkbox" checked={isSel}
                      onChange={() => {
                        const next = new Set(selectedIds);
                        isSel ? next.delete(r.id) : next.add(r.id);
                        setSelectedIds(next);
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                  </Td>
                  {/* Actions */}
                  <Td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => setDetailRecord({ record: r, fms })}
                        title="View Lifecycle"
                        style={{ padding: '3px 7px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--card)', cursor: 'pointer', fontSize: 10, fontWeight: 600, color: 'var(--primary)' }}>
                        View
                      </button>
                      <a href={`/procurement/${r.id}`} title="Open Indent"
                        style={{ padding: '3px 7px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--card)', textDecoration: 'none', fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Open
                      </a>
                    </div>
                  </Td>
                  <Td>
                    <span style={{ color: fms.pendingDays > 14 ? '#DC2626' : 'var(--text-primary)', fontWeight: fms.pendingDays > 14 ? 700 : 400 }}>
                      {fms.pendingDays}d
                    </span>
                  </Td>
                  <Td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px', color: 'var(--text-muted)' }}>{r.currentStage}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{stageName}</span>
                    </span>
                  </Td>
                  <Td>{fms.doer}</Td>
                  <Td mono>{new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}</Td>
                  <Td mono>
                    <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{fms.itemwiseNo}</span>
                  </Td>
                  <Td>{fms.filledBy}</Td>
                  <Td mono>{r.projectId || '—'}</Td>
                  <Td>{(r as any).projectName || '—'}</Td>
                  <Td>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 6, background: 'var(--surface2)', color: 'var(--text-muted)' }}>{fms.itemType}</span>
                  </Td>
                  <Td>
                    <span style={{ maxWidth: 160, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-muted)', fontSize: 11 }} title={fms.indentRemarks}>{fms.indentRemarks}</span>
                  </Td>
                  <Td mono>{fms.skuCode}</Td>
                  <Td>
                    <span style={{ maxWidth: 180, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }} title={fms.itemDesc}>{fms.itemDesc}</span>
                  </Td>
                  <Td mono>{fms.qty}</Td>
                  <Td>{fms.uom}</Td>
                  {fmsMode && <>
                    <Td>
                      <span style={{ maxWidth: 140, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 11, color: 'var(--text-muted)' }} title={fms.techSpec}>{fms.techSpec || '—'}</span>
                    </Td>
                    <Td>
                      <span style={{ maxWidth: 120, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 11 }} title={fms.approvedMakes}>{fms.approvedMakes}</span>
                    </Td>
                    <Td mono>{fmtDate(fms.requiredDate)}</Td>
                    <Td>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fms.paintingSpec}</span>
                    </Td>
                    <Td>
                      <span style={{ fontSize: 11 }}>{fms.packingReq}</span>
                    </Td>
                    <Td>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 5, background: fms.cert !== '—' ? '#DBEAFE' : 'var(--surface2)', color: fms.cert !== '—' ? '#1D4ED8' : 'var(--text-faint)' }}>{fms.cert}</span>
                    </Td>
                    <Td>
                      <span style={{ fontSize: 11, color: fms.manuals === 'Required' ? '#D97706' : 'var(--text-faint)' }}>{fms.manuals}</span>
                    </Td>
                    <Td>
                      <span style={{ fontSize: 11, color: fms.warrantyGuarantee !== '—' ? 'var(--text-primary)' : 'var(--text-faint)' }}>{fms.warrantyGuarantee}</span>
                    </Td>
                    <Td>
                      <span style={{ fontSize: 11, color: fms.ga === 'Required' ? '#D97706' : 'var(--text-faint)' }}>{fms.ga}</span>
                    </Td>
                    <Td>
                      <a href={`/procurement/${r.id}`} style={{ fontSize: 11, color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>View Form</a>
                    </Td>
                  </>}
                  <Td mono>
                    <span style={{ color: fms.poNumber !== '—' ? 'var(--primary)' : 'var(--text-faint)', fontWeight: fms.poNumber !== '—' ? 700 : 400 }}>{fms.poNumber}</span>
                  </Td>
                  <Td mono>
                    <span style={{ color: fms.grnNumber !== '—' ? '#059669' : 'var(--text-faint)', fontWeight: fms.grnNumber !== '—' ? 700 : 400 }}>{fms.grnNumber}</span>
                  </Td>
                  <Td>{statusPill(r.status)}</Td>
                  <Td mono>{r.currentStage}</Td>
                  <Td>{fms.responsible}</Td>
                  <Td mono>{fmtDate(fms.planned)}</Td>
                  <Td mono>{fmtDate(fms.actual)}</Td>
                  <Td>{delayBadge(fms.delayDays)}</Td>
                  {(() => {
                    const sla = computeRecordSLA(r);
                    const cfg = slaStatusConfig(sla.status);
                    return (
                      <>
                        <Td mono>{sla.tatHours}h</Td>
                        <Td mono>{fmtBizHours(sla.bizHoursConsumed)}</Td>
                        <Td>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
                            {cfg.label}
                          </span>
                        </Td>
                      </>
                    );
                  })()}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div style={{
        padding: '12px 24px', background: 'var(--card)', borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
        position: 'sticky', bottom: 0, zIndex: 20,
      }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {selCount > 0 && <strong style={{ color: 'var(--primary)', marginRight: 12 }}>{selCount} selected</strong>}
          Page {page} of {totalPages}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { icon: <ChevronsLeft style={{ width: 13, height: 13 }} />, action: () => setPage(1), disabled: page === 1, title: 'First' },
            { icon: <ChevronLeft style={{ width: 13, height: 13 }} />, action: () => setPage(p => Math.max(1, p - 1)), disabled: page === 1, title: 'Previous' },
          ].map((btn, i) => (
            <button key={i} onClick={btn.action} disabled={btn.disabled} title={btn.title}
              style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', cursor: btn.disabled ? 'not-allowed' : 'pointer', color: btn.disabled ? 'var(--text-faint)' : 'var(--text-primary)' }}>
              {btn.icon}
            </button>
          ))}
          {/* Page numbers */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let p: number;
            if (totalPages <= 5) p = i + 1;
            else if (page <= 3) p = i + 1;
            else if (page >= totalPages - 2) p = totalPages - 4 + i;
            else p = page - 2 + i;
            return (
              <button key={p} onClick={() => setPage(p)}
                style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, fontSize: 12, fontWeight: p === page ? 700 : 400, border: `1px solid ${p === page ? 'var(--primary)' : 'var(--border)'}`, background: p === page ? 'var(--primary)' : 'var(--card)', color: p === page ? '#fff' : 'var(--text-primary)', cursor: 'pointer' }}>
                {p}
              </button>
            );
          })}
          {[
            { icon: <ChevronRight style={{ width: 13, height: 13 }} />, action: () => setPage(p => Math.min(totalPages, p + 1)), disabled: page === totalPages, title: 'Next' },
            { icon: <ChevronsRight style={{ width: 13, height: 13 }} />, action: () => setPage(totalPages), disabled: page === totalPages, title: 'Last' },
          ].map((btn, i) => (
            <button key={i} onClick={btn.action} disabled={btn.disabled} title={btn.title}
              style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', cursor: btn.disabled ? 'not-allowed' : 'pointer', color: btn.disabled ? 'var(--text-faint)' : 'var(--text-primary)' }}>
              {btn.icon}
            </button>
          ))}
        </div>
      </div>

      {/* DETAIL DRAWER */}
      {detailRecord && (
        <DetailDrawer
          record={detailRecord.record}
          fms={detailRecord.fms}
          onClose={() => setDetailRecord(null)}
        />
      )}

      {/* AMEND PO MODAL */}
      {amendPoOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
          <div style={{ background: 'var(--card)', borderRadius: 14, padding: 24, width: 420, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
              Amend PO Number ({selWithPO} records)
            </div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>New PO Number</label>
            <input type="text" placeholder="e.g. PO-2026-XXXX" className="w-full"
              style={{ height: 38, width: '100%', padding: '0 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--surface2)', color: 'var(--text-primary)', outline: 'none', marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setAmendPoOpen(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)' }}>Cancel</button>
              <button onClick={() => setAmendPoOpen(false)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Amend PO</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
