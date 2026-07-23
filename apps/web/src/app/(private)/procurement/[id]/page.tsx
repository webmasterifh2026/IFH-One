'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Package, User, Calendar, Tag, Building2,
  MessageSquare, Clock, Activity, List, Ban, Paperclip
} from 'lucide-react';
import { EnterpriseCard, EnterpriseCardHeader } from '@/components/ui/enterprise-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { WorkflowTracker } from '@/components/procurement/workflow-tracker';
import { StagePanel } from '@/components/procurement/stage-panel';
import { AuditTrail } from '@/components/procurement/audit-trail';
import { AllStagesView } from '@/components/procurement/all-stages-view';
import { getProcurement, cancelProcurement, type Procurement } from '@/lib/api/procurement';
import { formatDate, formatDateTime, getStageDefinition } from '@/lib/procurement-stages';
import { AttachmentsPanel } from '@/components/procurement/attachments-panel';

type ActiveTab = 'overview' | 'stages' | 'remarks' | 'attachments' | 'history';

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'text-gray-500 bg-gray-100',
  NORMAL: 'text-blue-600 bg-blue-50',
  HIGH: 'text-orange-600 bg-orange-50',
  URGENT: 'text-red-600 bg-red-50',
};

export default function ProcurementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [procurement, setProcurement] = useState<Procurement | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelRemarks, setCancelRemarks] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const data = await getProcurement(id);
      setProcurement(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdate = (updated: Procurement) => {
    setProcurement(updated);
  };

  const handleCancel = async () => {
    if (!procurement) return;
    setCancelling(true);
    try {
      const updated = await cancelProcurement(procurement.id, cancelRemarks);
      setProcurement(updated);
      setCancelModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="page-content" style={{ maxWidth: 1440, margin: '0 auto' }}>
        <div className="animate-pulse space-y-4">
          <div style={{ height: 32, width: 192, background: 'var(--surface2)', borderRadius: 10 }} />
          <div style={{ height: 128, background: 'var(--surface2)', borderRadius: 14 }} />
          <div style={{ height: 256, background: 'var(--surface2)', borderRadius: 14 }} />
        </div>
      </div>
    );
  }

  if (!procurement) {
    return (
      <div style={{ padding: '80px 32px', textAlign: 'center' }}>
        <p style={{ fontSize: 15, color: 'var(--text-muted)' }}>Procurement record not found.</p>
        <Link href="/procurement" style={{ color: 'var(--primary)', fontWeight: 600, marginTop: 8, display: 'inline-block' }}>
          Back to Procurement
        </Link>
      </div>
    );
  }

  const stageDef = getStageDefinition(procurement.currentStage);
  const progressPct = procurement.status === 'COMPLETED'
    ? 100
    : Math.round((procurement.currentStage / 23) * 100);

  const TABS: { id: ActiveTab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'stages', label: 'All Stages', count: procurement.stages.length },
    { id: 'remarks', label: 'Remarks', count: procurement.remarks.length },
    { id: 'attachments', label: 'Attachments', count: procurement.attachments.length },
    { id: 'history', label: 'Audit Trail', count: procurement.history.length },
  ];

  // Extract dynamic metadata from history
  const rfqMeta = procurement.history.find(h => h.stageNumber === 4 && h.metadata)?.metadata;
  const rfqNumber = rfqMeta ? JSON.parse(rfqMeta).rfqNumber : undefined;
  
  const poMeta = procurement.history.find(h => h.stageNumber === 6 && h.metadata)?.metadata;
  const poNumber = poMeta ? JSON.parse(poMeta).poNumber : undefined;

  const grnMeta = procurement.history.find(h => h.stageNumber === 11 && h.metadata)?.metadata;
  const grnNumber = grnMeta ? JSON.parse(grnMeta).grnNumber : undefined;

  const ageInDays = Math.max(0, Math.floor((Date.now() - new Date(procurement.createdAt).getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="page-content" style={{ paddingBottom: 60, maxWidth: 1440, margin: '0 auto' }}>
      {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
      <Link
        href="/procurement"
        className="inline-flex items-center gap-2 transition-colors"
        style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', textDecoration: 'none', marginBottom: 16, display: 'inline-flex' }}
      >
        <ArrowLeft style={{ width: 13, height: 13 }} />
        Back to Procurement
      </Link>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4" style={{ marginBottom: 16 }}>
        <div className="flex-1">
          <div className="flex items-center gap-3" style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '3px 10px', borderRadius: 6 }}>
              {procurement.referenceNo}
            </span>
            <StatusBadge status={procurement.status} />
            <span style={{
              display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 8px', borderRadius: 6,
              fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
              background: procurement.priority === 'URGENT' ? 'rgba(220,38,38,0.1)' : procurement.priority === 'HIGH' ? 'rgba(234,88,12,0.1)' : 'rgba(37,99,235,0.1)',
              color: procurement.priority === 'URGENT' ? '#DC2626' : procurement.priority === 'HIGH' ? '#EA580C' : '#2563EB',
            }}>
              {procurement.priority}
            </span>
          </div>
          <h1 className="font-display" style={{ fontSize: 24, fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.2, letterSpacing: '-0.015em' }}>
            {procurement.title}
          </h1>
          {procurement.description && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 5, maxWidth: 640 }}>{procurement.description}</p>
          )}
        </div>

        {/* Actions */}
        {!['COMPLETED', 'CANCELLED', 'REJECTED'].includes(procurement.status) && (
          <button
            onClick={() => setCancelModal(true)}
            className="inline-flex items-center gap-2 flex-shrink-0"
            style={{ height: 36, padding: '0 14px', borderRadius: 8, border: '1px solid rgba(220,38,38,0.3)', color: '#DC2626', fontSize: 13, fontWeight: 600, background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.05)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Ban style={{ width: 14, height: 14 }} />
            Cancel
          </button>
        )}
      </div>

      {/* ── Progress Bar ─────────────────────────────────────────────────── */}
      <div className="ifh-card" style={{ padding: '16px 20px' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
          <div>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Stage {procurement.currentStage} of 23
            </span>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
              {stageDef?.name}
            </p>
          </div>
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary)', letterSpacing: '-0.02em', fontFamily: 'var(--font-sans)' }}>
            {progressPct}%
          </span>
        </div>
        <div style={{ height: 6, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 99,
            background: procurement.status === 'COMPLETED' ? '#16A34A'
              : procurement.status === 'REJECTED' ? '#DC2626'
              : procurement.status === 'ON_HOLD' ? '#D97706'
              : 'var(--primary)',
            width: `${progressPct}%`, transition: 'width 600ms ease',
          }} />
        </div>

        {/* Compact workflow tracker */}
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', overflowX: 'auto' }}>
          <WorkflowTracker
            currentStage={procurement.currentStage}
            stages={procurement.stages}
            status={procurement.status}
            compact
          />
        </div>
      </div>

      {/* ── Main Grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN — Stage action + tabs */}
        <div className="lg:col-span-2 space-y-5">
          {/* Stage Action Panel */}
          <StagePanel procurement={procurement} onUpdate={handleUpdate} />

          {/* Tabs */}
          <div className="ifh-card" style={{ overflow: 'hidden' }}>
            {/* Tab header */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '12px 18px', fontSize: 13, fontWeight: isActive ? 600 : 500,
                      whiteSpace: 'nowrap', borderBottom: `2px solid ${isActive ? 'var(--primary)' : 'transparent'}`,
                      color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      fontFamily: 'var(--font-sans)', transition: 'color 120ms',
                      borderBottomStyle: 'solid', borderBottomWidth: 2,
                      borderBottomColor: isActive ? 'var(--primary)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--text-primary)'; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--text-muted)'; }}
                  >
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 18, height: 18, borderRadius: '50%', fontSize: 9, fontWeight: 700,
                        background: isActive ? 'var(--primary-light)' : 'var(--surface2)',
                        color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                      }}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            <div className="p-6">
              {activeTab === 'overview' && (
                <div className="space-y-5">
                  {/* Items Table */}
                  {procurement.items.length > 0 && (
                    <div>
                      <h3 className="text-[13px] font-semibold text-gray-700 mb-3">Items ({procurement.items.length})</h3>
                      <div className="rounded-xl border border-gray-200 overflow-x-auto">
                        <table className="w-full text-left border-collapse ifh-table ifh-table">
                          <thead>
                            <tr className="bg-gray-50/80 border-b border-gray-200">
                              <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Item</th>
                              <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Code</th>
                              <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right">Qty</th>
                              <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Unit</th>
                              <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Attachment</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {procurement.items.map((item) => (
                              <tr key={item.id} className="hover:bg-gray-50/30">
                                <td className="px-4 py-3">
                                  <p className="text-[13px] font-semibold text-gray-900">{item.itemName}</p>
                                  {item.description && <p className="text-[11px] text-gray-400 mt-0.5">{item.description}</p>}
                                </td>
                                <td className="px-4 py-3 text-[12px] text-gray-500 font-mono">{item.itemCode || '—'}</td>
                                <td className="px-4 py-3 text-[13px] font-semibold text-gray-900 text-right">{Number(item.quantity).toLocaleString()}</td>
                                <td className="px-4 py-3 text-[12px] text-gray-500">{item.unit || '—'}</td>
                                <td className="px-4 py-3 text-[12px] text-gray-500">
                                  {item.attachmentUrl ? (
                                    <a
                                      href={item.attachmentUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[#0F7B45] hover:underline font-semibold"
                                    >
                                      <Paperclip className="w-3.5 h-3.5" />
                                      {item.attachmentName || 'View'}
                                    </a>
                                  ) : (
                                    '—'
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Workflow tracker full */}
                  <div>
                    <h3 className="text-[13px] font-semibold text-gray-700 mb-3">Workflow Progress</h3>
                    <WorkflowTracker
                      currentStage={procurement.currentStage}
                      stages={procurement.stages}
                      status={procurement.status}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'stages' && (
                <AllStagesView stages={procurement.stages} currentStage={procurement.currentStage} />
              )}

              {activeTab === 'remarks' && (
                <div className="space-y-4">
                  {procurement.remarks.length === 0 ? (
                    <div className="text-center py-8 text-[13px] text-gray-400">No remarks yet.</div>
                  ) : (
                    procurement.remarks.map((remark) => {
                      const sdef = remark.stageNumber !== null && remark.stageNumber !== undefined
                        ? getStageDefinition(remark.stageNumber)
                        : undefined;
                      return (
                        <div key={remark.id} className="flex gap-3">
                          <div className="w-7 h-7 rounded-full bg-[#0F7B45]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-[11px] font-bold text-[#0F7B45]">
                              {remark.author.fullName.charAt(0)}
                            </span>
                          </div>
                          <div className="flex-1 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[12px] font-semibold text-gray-900">{remark.author.fullName}</span>
                              <span className="text-[11px] text-gray-400">{formatDateTime(remark.createdAt)}</span>
                              {sdef && (
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md uppercase">
                                  Stage {remark.stageNumber}: {sdef.shortName}
                                </span>
                              )}
                            </div>
                            <p className="text-[13px] text-gray-700 leading-relaxed">{remark.comment}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {activeTab === 'attachments' && (
                <AttachmentsPanel
                  attachments={procurement.attachments}
                  procurementId={procurement.id}
                  stageNumber={procurement.currentStage}
                  onAttachmentsChange={(updated) => setProcurement(p => p ? { ...p, attachments: updated } : p)}
                />
              )}

              {activeTab === 'history' && (
                <AuditTrail history={procurement.history} />
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — Metadata */}
        <div className="space-y-4">
          {/* Info Card */}
          <EnterpriseCard>
            <EnterpriseCardHeader title="Procurement Information" />
            <div className="space-y-3">
              <InfoRow icon={Clock} label="Workflow Age" value={`${ageInDays} Days`} />
              {rfqNumber && (
                <InfoRow icon={Package} label="RFQ Number" value={rfqNumber} />
              )}
              {poNumber && (
                <InfoRow icon={Building2} label="PO Number" value={poNumber} />
              )}
              {grnNumber && (
                <InfoRow icon={Package} label="GRN Number" value={grnNumber} />
              )}
              <InfoRow icon={User} label="Requested By" value={procurement.requestedBy.fullName} sub={procurement.requestedBy.employeeId} />
              {procurement.assignedTo && (
                <InfoRow icon={User} label="Assigned To" value={procurement.assignedTo.fullName} sub={procurement.assignedTo.employeeId} />
              )}
              {procurement.departmentId && (
                <InfoRow icon={Building2} label="Department" value={procurement.departmentId} />
              )}
              {procurement.projectId && (
                <InfoRow icon={Tag} label="Project" value={procurement.projectId} />
              )}
              <InfoRow icon={Calendar} label="Created" value={formatDate(procurement.createdAt)} />
              {procurement.completedAt && (
                <InfoRow icon={Calendar} label="Completed" value={formatDate(procurement.completedAt)} />
              )}
            </div>
          </EnterpriseCard>

          {/* Vendor Info (if any) */}
          {procurement.vendorName && (
            <EnterpriseCard>
              <EnterpriseCardHeader title="Vendor" />
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-9 h-9 rounded-lg bg-[#0F7B45]/10 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-[#0F7B45]" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-gray-900">{procurement.vendorName}</p>
                  {procurement.vendorId && <p className="text-[11px] text-gray-400 font-mono">{procurement.vendorId}</p>}
                </div>
              </div>
            </EnterpriseCard>
          )}

          {/* Quick Stats */}
          <EnterpriseCard>
            <EnterpriseCardHeader title="Quick Stats" />
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Items', value: procurement.items.length, icon: Package },
                { label: 'Remarks', value: procurement.remarks.length, icon: MessageSquare },
                { label: 'Attachments', value: procurement.attachments.length, icon: Paperclip },
                { label: 'Events', value: procurement.history.length, icon: Activity },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100">
                  <stat.icon className="w-3.5 h-3.5 text-gray-400" />
                  <div>
                    <p className="text-[15px] font-bold text-gray-900 leading-none">{stat.value}</p>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mt-0.5">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </EnterpriseCard>

          {/* Recent activity */}
          {procurement.history.length > 0 && (
            <EnterpriseCard>
              <EnterpriseCardHeader title="Recent Activity" />
              <div className="space-y-2.5">
                {[...procurement.history]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 4)
                  .map((h) => (
                    <div key={h.id} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#0F7B45] mt-1.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-gray-700 truncate">{h.description}</p>
                        <p className="text-[11px] text-gray-400">{h.performedBy.fullName} · {formatDateTime(h.createdAt)}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </EnterpriseCard>
          )}
        </div>
      </div>

      {/* ── Cancel Modal ─────────────────────────────────────────────────── */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div className="ifh-card" style={{ padding: 24, width: '100%', maxWidth: 440, margin: '0 16px', boxShadow: 'var(--shadow-xl)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Cancel Procurement</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              This will cancel the workflow permanently. Provide a reason below.
            </p>
            <textarea
              value={cancelRemarks}
              onChange={(e) => setCancelRemarks(e.target.value)}
              placeholder="Reason for cancellation…"
              rows={3}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--card)',
                fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)',
                outline: 'none', resize: 'vertical', marginBottom: 16,
              }}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setCancelModal(false)}
                className="ifh-btn-ghost"
              >
                Back
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  height: 38, padding: '0 16px', borderRadius: 8,
                  background: '#DC2626', color: '#fff', fontSize: 13,
                  fontWeight: 600, cursor: 'pointer', border: 'none',
                  opacity: cancelling ? 0.6 : 1, fontFamily: 'var(--font-sans)',
                }}
              >
                {cancelling ? 'Cancelling…' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper ─────────────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div style={{
        width: 24, height: 24, borderRadius: 6, background: 'var(--surface2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
      }}>
        <Icon style={{ width: 12, height: 12, color: 'var(--text-muted)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{label}</p>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
        {sub && <p style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>{sub}</p>}
      </div>
    </div>
  );
}
