'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Eye,
  Plus,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  PauseCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { BulkActionToolbar } from '@/components/procurement/bulk-action-toolbar';
import { BulkStageUpdateModal } from '@/components/procurement/bulk-stage-update-modal';
import {
  getProcurements,
  performStageAction,
  getStageKPIs,
  type ProcurementListItem,
} from '@/lib/api/procurement';
import { formatDate, getStageDefinition } from '@/lib/procurement-stages';
import { hasRole } from '@/lib/auth';

const BULK_UPDATE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'DOER'];

export interface WorkflowQueuePageProps {
  title: string;
  description: string;
  stage?: number | number[];
  status?: string;
  detailHref?: (id: string) => string;
  allowedActions?: Array<'APPROVE' | 'HOLD' | 'REJECT'>;
  showNewButton?: boolean;
  newHref?: string;
  newLabel?: string;
  queueTitle?: string;
  queueDescription?: string;
  emptyMessage?: string;
}

// No quick actions from queue — users must open the record to perform actions
const STAGE_QUICK_ACTIONS: Record<
  number,
  Array<'APPROVE' | 'HOLD' | 'REJECT'>
> = {};

const PRIORITY_STYLES: Record<
  string,
  { bg: string; color: string; label: string }
> = {
  LOW: { bg: 'rgba(107,128,112,0.1)', color: '#6B8070', label: 'Low' },
  NORMAL: { bg: 'rgba(37,99,235,0.1)', color: '#2563EB', label: 'Normal' },
  HIGH: { bg: 'rgba(234,88,12,0.1)', color: '#EA580C', label: 'High' },
  URGENT: { bg: 'rgba(220,38,38,0.1)', color: '#DC2626', label: 'Urgent' },
};

export function WorkflowQueuePage({
  title,
  description,
  stage,
  status,
  detailHref = (id) => `/procurement/${id}`,
  allowedActions,
  showNewButton = false,
  newHref = '/indents/new',
  newLabel = 'New Indent',
  queueTitle = 'Queue',
  queueDescription = 'Records pending action at this stage',
  emptyMessage = 'No records in queue. Create an indent or advance records from the previous stage.',
}: WorkflowQueuePageProps) {
  const router = useRouter();
  const [allRecords, setAllRecords] = useState<ProcurementListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [kpis, setKpis] = useState<{
    totalProcessed: number;
    totalApproved: number;
    totalRejected: number;
    averageDelayHours: number;
    approvalRate: number;
    rejectionRate: number;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [canBulkUpdate, setCanBulkUpdate] = useState(false);

  useEffect(() => {
    setCanBulkUpdate(BULK_UPDATE_ROLES.some((r) => hasRole(r)));
  }, []);

  const stageKey =
    stage === undefined
      ? ''
      : Array.isArray(stage)
        ? stage.join(',')
        : String(stage);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const stageList =
        stage === undefined
          ? undefined
          : Array.isArray(stage)
            ? stage
            : [stage];
      if (stageList && stageList.length > 1) {
        const results = await Promise.all(
          stageList.map((s) =>
            getProcurements({
              page: 1,
              limit: 50,
              search: search || undefined,
              stage: s,
              status,
            })
          )
        );
        const merged = results.flatMap((r) => r.data);
        const unique = Array.from(
          new Map(merged.map((r) => [r.id, r])).values()
        );
        setAllRecords(unique);
        setTotal(unique.length);
      } else {
        const result = await getProcurements({
          page,
          limit: 20,
          search: search || undefined,
          stage: stageList?.[0],
          status,
        });
        setAllRecords(result.data);
        setTotal(result.meta.total);
      }

      const singleStage = stageList?.[0];
      if (typeof singleStage === 'number' && singleStage <= 2) {
        const kpiResult = await getStageKPIs(singleStage);
        setKpis(kpiResult);
      } else {
        setKpis(null);
      }
    } catch {
      setAllRecords([]);
      setTotal(0);
      setKpis(null);
    } finally {
      setLoading(false);
    }
  }, [stageKey, search, status, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchTerm);
    setPage(1);
  };

  const handleAction = async (
    recordId: string,
    action: 'APPROVE' | 'REJECT' | 'HOLD'
  ) => {
    setActionLoading(recordId);
    try {
      await performStageAction(recordId, action, {
        remarks: `${action} from queue`,
      });
      fetchData();
    } catch {
      /* noop */
    } finally {
      setActionLoading(null);
    }
  };

  const records =
    statusFilter === 'IN_PROGRESS'
      ? allRecords.filter(
          (r) =>
            r.status === 'IN_PROGRESS' ||
            r.status === 'SUBMITTED' ||
            r.status === 'DRAFT'
        )
      : statusFilter
        ? allRecords.filter((r) => r.status === statusFilter)
        : allRecords;

  const allSelected =
    records.length > 0 && records.every((r) => selectedIds.has(r.id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (allSelected) return new Set();
      return new Set(records.map((r) => r.id));
    });
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkComplete = () => {
    clearSelection();
    fetchData();
  };

  return (
    <div className="page-content" style={{ maxWidth: 1440, margin: '0 auto' }}>
      {/* Header */}
      <PageHeader
        title={title}
        description={description}
        actions={
          showNewButton ? (
            <button
              onClick={() => router.push(newHref)}
              className="ifh-btn-primary"
            >
              <Plus style={{ width: 14, height: 14 }} />
              {newLabel}
            </button>
          ) : undefined
        }
      />

      {/* Stage Performance KPIs */}
      {kpis && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--text-muted)',
              marginBottom: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
            }}
          >
            Stage Performance KPIs (All-time Live Stats)
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 16,
            }}
          >
            {[
              {
                label: 'Total Processed',
                value: kpis.totalProcessed,
                color: 'var(--primary)',
                description: 'Records entered stage',
              },
              {
                label: 'Total Approved',
                value: kpis.totalApproved,
                color: '#059669',
                description: 'Approved or completed',
              },
              {
                label: 'Total Rejected',
                value: kpis.totalRejected,
                color: '#DC2626',
                description: 'Rejected at this stage',
              },
              {
                label: 'Average Delay',
                value: (() => {
                  const h = kpis.averageDelayHours;
                  if (h <= 0) return '0 days';
                  const BIZ_HRS_PER_DAY = 9;
                  if (h < 1) return `${Math.round(h * 60)}m`;
                  if (h < BIZ_HRS_PER_DAY) return `${h.toFixed(1)}h`;
                  return `${(h / BIZ_HRS_PER_DAY).toFixed(1)} days`;
                })(),
                color: '#D97706',
                description: 'Business delay average',
              },
              {
                label: 'Approval Rate',
                value: `${kpis.approvalRate.toFixed(1)}%`,
                color: '#0D9488',
                description: 'Approved vs processed',
              },
              {
                label: 'Rejection Rate',
                value: `${kpis.rejectionRate.toFixed(1)}%`,
                color: '#E11D48',
                description: 'Rejected vs processed',
              },
            ].map((card) => (
              <div
                key={card.label}
                className="ifh-card"
                style={{
                  padding: '16px 20px',
                  borderRadius: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-xs)',
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  transition: 'all 150ms ease',
                  cursor: 'default',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  e.currentTarget.style.borderColor = card.color;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: card.color,
                    lineHeight: 1,
                  }}
                >
                  {card.value}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    marginTop: 8,
                  }}
                >
                  {card.label}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--text-muted)',
                    marginTop: 2,
                  }}
                >
                  {card.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status filter tabs */}
      <div
        style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}
      >
        {[
          { label: 'All', value: '' },
          { label: 'Pending', value: 'IN_PROGRESS' },
          { label: 'On Hold', value: 'ON_HOLD' },
          { label: 'Approved', value: 'COMPLETED' },
          { label: 'Rejected', value: 'REJECTED' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              border:
                '1px solid ' +
                (statusFilter === tab.value
                  ? 'var(--primary)'
                  : 'var(--border)'),
              background:
                statusFilter === tab.value ? 'var(--primary)' : 'transparent',
              color: statusFilter === tab.value ? '#fff' : 'var(--text-muted)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {tab.label}
            <span style={{ marginLeft: 6, opacity: 0.7 }}>
              (
              {tab.value === ''
                ? allRecords.length
                : tab.value === 'IN_PROGRESS'
                  ? allRecords.filter(
                      (r) =>
                        r.status === 'IN_PROGRESS' ||
                        r.status === 'SUBMITTED' ||
                        r.status === 'DRAFT'
                    ).length
                  : allRecords.filter((r) => r.status === tab.value).length}
              )
            </span>
          </button>
        ))}
      </div>

      {/* Queue card */}
      <div className="ifh-card" style={{ overflow: 'hidden' }}>
        {/* Card header */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              {queueTitle}
            </div>
            <div
              style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}
            >
              {queueDescription}
            </div>
          </div>
          {/* Search */}
          <form
            onSubmit={handleSearch}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexShrink: 0,
            }}
          >
            <div style={{ position: 'relative' }}>
              <Search
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 13,
                  height: 13,
                  color: 'var(--text-faint)',
                }}
              />
              <input
                type="text"
                placeholder="Search records…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  height: 34,
                  paddingLeft: 30,
                  paddingRight: 10,
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surface2)',
                  fontSize: 12,
                  color: 'var(--text-primary)',
                  outline: 'none',
                  width: 'min(220px, 100%)',
                  fontFamily: 'var(--font-sans)',
                  transition: 'border-color 150ms',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.background = 'var(--card)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.background = 'var(--surface2)';
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                height: 34,
                padding: '0 14px',
                borderRadius: 8,
                background: 'var(--primary-light)',
                border: '1px solid rgba(15,123,69,0.2)',
                color: 'var(--primary)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                whiteSpace: 'nowrap',
              }}
            >
              Search
            </button>
          </form>
        </div>

        {/* Table */}
        {loading ? (
          <div
            className="flex items-center justify-center"
            style={{ padding: '60px 0' }}
          >
            <Loader2
              style={{ width: 28, height: 28, color: 'var(--primary)' }}
              className="animate-spin"
            />
          </div>
        ) : records.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center"
            style={{ padding: '64px 24px', textAlign: 'center' }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: 'var(--surface2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <FileText
                style={{ width: 24, height: 24, color: 'var(--text-faint)' }}
              />
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              No records found
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--text-muted)',
                marginTop: 6,
                maxWidth: 400,
              }}
            >
              {emptyMessage}
            </div>
            {showNewButton && (
              <button
                onClick={() => router.push(newHref)}
                className="ifh-btn-primary"
                style={{ marginTop: 20 }}
              >
                <Plus style={{ width: 14, height: 14 }} /> {newLabel}
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="ifh-table">
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--surface2)',
                  }}
                >
                  {canBulkUpdate && (
                    <th style={{ padding: '10px 14px', width: 32 }}>
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        aria-label="Select all records"
                        style={{ width: 15, height: 15, cursor: 'pointer' }}
                      />
                    </th>
                  )}
                  {(() => {
                    const baseHeaders = ['Reference', 'Title'];
                    if (status === 'REJECTED' || status === 'ON_HOLD') {
                      baseHeaders.push('Project', 'Vendor', 'Remarks');
                    }
                    baseHeaders.push(
                      'Stage',
                      'Priority',
                      'Status',
                      'Requested By',
                      'Date',
                      'Actions'
                    );
                    return baseHeaders.map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '10px 14px',
                          textAlign: h === 'Actions' ? 'right' : 'left',
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.07em',
                          textTransform: 'uppercase',
                          color: 'var(--text-muted)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ));
                  })()}
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const stageDef = getStageDefinition(record.currentStage);
                  const canAction =
                    record.status !== 'COMPLETED' &&
                    record.status !== 'REJECTED';
                  const pri =
                    PRIORITY_STYLES[record.priority] ?? PRIORITY_STYLES.NORMAL;
                  const isLoading = actionLoading === record.id;
                  const stageActions =
                    allowedActions ??
                    STAGE_QUICK_ACTIONS[record.currentStage] ??
                    [];

                  // Extract remarks from the latest stage history if available
                  let remarks = '—';
                  if (status === 'REJECTED' || status === 'ON_HOLD') {
                    if (record.stages && record.stages.length > 0) {
                      const lastStage = [...record.stages].sort(
                        (a, b) =>
                          new Date(b.createdAt).getTime() -
                          new Date(a.createdAt).getTime()
                      )[0];
                      remarks = lastStage.remarks || '—';
                    }
                  }

                  return (
                    <tr
                      key={record.id}
                      style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={(e) =>
                        ((
                          e.currentTarget as HTMLTableRowElement
                        ).style.background = 'var(--surface2)')
                      }
                      onMouseLeave={(e) =>
                        ((
                          e.currentTarget as HTMLTableRowElement
                        ).style.background = 'transparent')
                      }
                    >
                      {canBulkUpdate && (
                        <td style={{ padding: '11px 14px' }}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(record.id)}
                            onChange={() => toggleSelectOne(record.id)}
                            aria-label={`Select ${record.referenceNo}`}
                            style={{ width: 15, height: 15, cursor: 'pointer' }}
                          />
                        </td>
                      )}
                      <td style={{ padding: '11px 14px' }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            color: 'var(--primary)',
                          }}
                        >
                          {record.referenceNo}
                        </span>
                      </td>
                      <td style={{ padding: '11px 14px', maxWidth: 200 }}>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: 'var(--text-primary)',
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {record.title}
                        </span>
                      </td>
                      {(status === 'REJECTED' || status === 'ON_HOLD') && (
                        <>
                          <td style={{ padding: '11px 14px' }}>
                            <span
                              style={{
                                fontSize: 12,
                                color: 'var(--text-secondary)',
                              }}
                            >
                              {record.projectName || '—'}
                            </span>
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <span
                              style={{
                                fontSize: 12,
                                color: 'var(--text-secondary)',
                              }}
                            >
                              {record.vendorName || '—'}
                            </span>
                          </td>
                          <td style={{ padding: '11px 14px', maxWidth: 150 }}>
                            <span
                              style={{
                                fontSize: 12,
                                color: 'var(--text-secondary)',
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={remarks}
                            >
                              {remarks}
                            </span>
                          </td>
                        </>
                      )}
                      <td style={{ padding: '11px 14px' }}>
                        <span
                          style={{
                            fontSize: 12,
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {stageDef?.shortName ||
                            `Stage ${record.currentStage}`}
                        </span>
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            height: 20,
                            padding: '0 7px',
                            borderRadius: 5,
                            background: pri.bg,
                            color: pri.color,
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                          }}
                        >
                          {pri.label}
                        </span>
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <StatusBadge status={record.status} />
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <span
                          style={{ fontSize: 12, color: 'var(--text-muted)' }}
                        >
                          {record.requestedBy?.fullName || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <span
                          style={{
                            fontSize: 12,
                            color: 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatDate(record.createdAt)}
                        </span>
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <div className="flex items-center justify-end gap-1.5">
                          {canAction &&
                            !isLoading &&
                            stageActions.length > 0 && (
                              <>
                                {stageActions.includes('APPROVE') && (
                                  <button
                                    onClick={() =>
                                      handleAction(record.id, 'APPROVE')
                                    }
                                    title="Approve"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      height: 26,
                                      padding: '0 9px',
                                      borderRadius: 6,
                                      background: '#16A34A',
                                      color: '#fff',
                                      fontSize: 11,
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      border: 'none',
                                      fontFamily: 'var(--font-sans)',
                                    }}
                                  >
                                    <CheckCircle2
                                      style={{ width: 11, height: 11 }}
                                    />{' '}
                                    Approve
                                  </button>
                                )}
                                {stageActions.includes('HOLD') && (
                                  <button
                                    onClick={() =>
                                      handleAction(record.id, 'HOLD')
                                    }
                                    title="Hold"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      height: 26,
                                      padding: '0 9px',
                                      borderRadius: 6,
                                      background: '#D97706',
                                      color: '#fff',
                                      fontSize: 11,
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      border: 'none',
                                      fontFamily: 'var(--font-sans)',
                                    }}
                                  >
                                    <PauseCircle
                                      style={{ width: 11, height: 11 }}
                                    />{' '}
                                    Hold
                                  </button>
                                )}
                                {stageActions.includes('REJECT') && (
                                  <button
                                    onClick={() =>
                                      handleAction(record.id, 'REJECT')
                                    }
                                    title="Reject"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      height: 26,
                                      padding: '0 9px',
                                      borderRadius: 6,
                                      background: '#DC2626',
                                      color: '#fff',
                                      fontSize: 11,
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      border: 'none',
                                      fontFamily: 'var(--font-sans)',
                                    }}
                                  >
                                    <XCircle
                                      style={{ width: 11, height: 11 }}
                                    />{' '}
                                    Reject
                                  </button>
                                )}
                              </>
                            )}
                          {isLoading && (
                            <Loader2
                              style={{
                                width: 16,
                                height: 16,
                                color: 'var(--primary)',
                              }}
                              className="animate-spin"
                            />
                          )}
                          <Link
                            href={detailHref(record.id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              height: 26,
                              padding: '0 9px',
                              borderRadius: 6,
                              background: 'var(--primary-light)',
                              color: 'var(--primary)',
                              fontSize: 11,
                              fontWeight: 600,
                              textDecoration: 'none',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <Eye style={{ width: 11, height: 11 }} /> Open
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {!loading && total > 20 && (
          <div
            className="flex items-center justify-between"
            style={{
              padding: '10px 20px',
              borderTop: '1px solid var(--border)',
              background: 'var(--surface2)',
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Showing {records.length} of {total} records
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="ifh-btn-ghost"
                style={{ height: 30, padding: '0 12px', fontSize: 12 }}
              >
                Previous
              </button>
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  padding: '0 8px',
                }}
              >
                Page {page}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={records.length < 20}
                className="ifh-btn-ghost"
                style={{ height: 30, padding: '0 12px', fontSize: 12 }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {canBulkUpdate && (
        <>
          <BulkActionToolbar
            selectedCount={selectedIds.size}
            onChangeStage={() => setBulkModalOpen(true)}
            onClear={clearSelection}
          />
          <BulkStageUpdateModal
            isOpen={bulkModalOpen}
            onClose={() => setBulkModalOpen(false)}
            selectedIds={Array.from(selectedIds)}
            onComplete={handleBulkComplete}
          />
        </>
      )}
    </div>
  );
}
