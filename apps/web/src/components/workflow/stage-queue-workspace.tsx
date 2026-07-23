'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Eye, Edit3, Save, X, Loader2, AlertCircle
} from 'lucide-react';

import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { getProcurements, performBulkMultiStageAction, getStageKPIs, type ProcurementListItem, type ProcurementItem } from '@/lib/api/procurement';
import { apiFetch } from '@/lib/api/fetch';
import { formatDate } from '@/lib/procurement-stages';
import { useAuth } from '@/contexts/AuthContext';
import { getStageConfig, StageConfig, StageField } from './stage-config';

interface StageQueueWorkspaceProps {
  title: string;
  description: string;
  stage: number;
  /** Route slug used to navigate to the detail page, e.g. "store-check" */
  slug: string;
}

interface FlattenedItem extends ProcurementItem {
  procurement: ProcurementListItem;
  _selected: boolean;
}

const QueueRow = memo(function QueueRow({
  item, idx, title, slug, onSelect, onView,
}: {
  item: FlattenedItem;
  idx: number;
  title: string;
  slug: string;
  onSelect: (id: string, checked: boolean) => void;
  onView: (procurementId: string) => void;
}) {
  const cardNo = item.bbuCode || `${item.procurement.referenceNo}-${String((item.procurement.items ?? []).findIndex(i => i.id === item.id) + 1).padStart(3, '0')}`;
  return (
    <tr style={{ background: item._selected ? 'rgba(37,99,235,0.03)' : undefined }}>
      <td style={{ position: 'sticky', left: 0, background: item._selected ? 'rgba(239,246,255,1)' : 'var(--card)', zIndex: 5, textAlign: 'center', padding: '10px 8px', borderRight: '1px solid var(--border)' }}>
        <input type="checkbox" checked={item._selected} onChange={e => onSelect(item.id, e.target.checked)} />
      </td>
      <td style={{ position: 'sticky', left: 40, background: item._selected ? 'rgba(239,246,255,1)' : 'var(--card)', zIndex: 5, textAlign: 'center', borderRight: '1px solid var(--border)' }}>
        <button onClick={() => onView(item.procurement.id)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }} title="View Record">
          <Eye style={{ width: 16, height: 16 }} />
        </button>
      </td>
      <td>{item.procurement.stages?.[item.procurement.currentStage]?.startedAt ? new Date(item.procurement.stages[item.procurement.currentStage].startedAt!).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(',', '') : '—'}</td>
      <td><StatusBadge status={item.procurement.stages?.[item.procurement.currentStage]?.stageName || title} /></td>
      <td>{(item.procurement.stages?.[item.procurement.currentStage] as any)?.assignedTo?.fullName || item.procurement.assignedTo?.fullName || '—'}</td>
      <td>{formatDate(item.procurement.createdAt)}</td>
      <td style={{ fontWeight: 600 }}>{cardNo}</td>
      <td>{item.procurement.requestedBy?.fullName || '—'}</td>
      <td>{item.procurement.projectId || '—'}</td>
      <td>{item.procurement.projectName || '—'}</td>
      <td>
        {item.attachmentName ? (
          <a href={item.attachmentUrl || '#'} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>{item.attachmentName}</a>
        ) : '—'}
      </td>
      <td>{item.procurement.itemType || '—'}</td>
      <td>{item.procurement.description || '—'}</td>
      <td style={{ fontFamily: 'monospace' }}>{item.itemCode || '—'}</td>
      <td style={{ fontWeight: 600 }}>{item.itemName}</td>
      <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.quantity}</td>
      <td>{item.unit || '—'}</td>
      <td>{item.technicalSpec || '—'}</td>
      <td>{item.approvedMakes || '—'}</td>
      <td>{item.procurement.requiredDate ? formatDate(item.procurement.requiredDate) : '—'}</td>
      <td>{item.procurement.paintingSpec || '—'}</td>
      <td>{item.procurement.packingRequirement || '—'}</td>
      <td>{item.procurement.certification || '—'}</td>
      <td>{item.procurement.manuals || '—'}</td>
      <td>{item.procurement.warrantyGuarantee || '—'}</td>
      <td>{item.procurement.ga || '—'}</td>
      <td>—</td>
      <td>{(item.procurement as any).poNumber || '—'}</td>
      <td>{(item.procurement as any).grnNumber || '—'}</td>
    </tr>
  );
});

export function StageQueueWorkspace({ title, description, stage, slug }: StageQueueWorkspaceProps) {
  const router = useRouter();
  const { user } = useAuth();

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FlattenedItem[]>([]);
  const [kpis, setKpis] = useState<any>(null);

  const [users, setUsers] = useState<{ id: string; fullName: string }[]>([]);

  const config = getStageConfig(stage);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const [bulkUpdates, setBulkUpdates] = useState<Record<string, Record<string, any>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [bulkResult, setBulkResult] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getProcurements({ page, limit: 20, stage });

      const flatItems: FlattenedItem[] = [];
      result.data.forEach(proc => {
        if (proc.items && proc.items.length > 0) {
          proc.items.forEach(item => {
            flatItems.push({ ...item, procurement: proc, _selected: false });
          });
        }
      });
      setItems(flatItems);
      setTotalPages(result.meta?.totalPages || 1);

      if (stage <= 2) {
        const kpiResult = await getStageKPIs(stage);
        setKpis(kpiResult);
      } else {
        setKpis(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [stage, page]);

  useEffect(() => {
    fetchData();
    apiFetch('/users').then(d => Array.isArray(d) ? setUsers(d) : []).catch(() => {});
  }, [fetchData]);

  // Selection Logic
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setItems(prev => prev.map(item => ({ ...item, _selected: checked })));
  };

  const handleSelectItem = useCallback((id: string, checked: boolean) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, _selected: checked } : item));
  }, []);

  const handleViewRecord = useCallback((procurementId: string) => {
    router.push(`/${slug}/${procurementId}`);
  }, [router, slug]);

  const selectedItems = useMemo(() => items.filter(i => i._selected), [items]);
  const allSelected = items.length > 0 && selectedItems.length === items.length;

  const openBulkModal = () => {
    const initialUpdates: Record<string, Record<string, any>> = {};
    selectedItems.forEach(item => {
      initialUpdates[item.id] = {
        assignedToId: item.assignedToId || user?.id || '',
        toFrom: item.toFrom || '',
        remarks: '',
        action: '',
        ...(config?.storeCheckQuantityReconciliation ? { availableQty: '' } : {}),
      };
      if (config) {
        config.fields.forEach(f => {
          initialUpdates[item.id][f.id] = '';
        });
      }
    });
    setBulkUpdates(initialUpdates);
    setShowBulkModal(true);
    setBulkResult(null);
  };

  const handleBulkSubmit = async () => {
    if (!config) { alert('No configuration found for this stage.'); return; }

    const requiredQtyById = new Map(selectedItems.map(i => [i.id, Number(i.quantity) || 0]));

    for (const [itemId, update] of Object.entries(bulkUpdates)) {
      if (config.storeCheckQuantityReconciliation) {
        const requiredQty = requiredQtyById.get(itemId) ?? 0;
        const availableQty = Number(update.availableQty);
        if (update.availableQty === '' || update.availableQty === undefined || isNaN(availableQty)) {
          alert('Available Stock Quantity is mandatory for all selected items.'); return;
        }
        if (availableQty < 0) { alert('Available Stock Quantity cannot be negative.'); return; }
        if (availableQty > requiredQty) { alert('Available Stock Quantity cannot exceed Required Quantity.'); return; }
        continue; // action is derived automatically below, not user-selected
      }

      if (!update.action) { alert('Action is mandatory for all selected items.'); return; }
      if (['HOLD', 'REJECT', 'CLARIFICATION'].includes(update.action) && !update.remarks?.trim()) {
        alert('Remarks are mandatory when putting on hold, rejecting, or requesting clarification.'); return;
      }
      if (config.requiresAssignedTo !== false) {
        if (!update.assignedToId) { alert('Responsible Person is mandatory for all selected items.'); return; }
      }

      // To/From and Hold/Cancelled are optional unless the chosen action requires them.
      if (update.action === 'HOLD') {
        if (config.toFromOptions && !update.toFrom) { alert('To / From is mandatory when putting an item on hold.'); return; }
        if (config.fields.some(f => f.id === 'holdCancelled') && !update.holdCancelled) {
          alert('Hold / Cancelled is mandatory when putting an item on hold.'); return;
        }
      }

      for (const field of config.fields) {
        if (field.id === 'holdCancelled') continue; // conditionally required above, not unconditionally
        if (field.required && !update[field.id]) {
          alert(`${field.label} is mandatory for all selected items.`); return;
        }
      }
    }
    setSubmitting(true);
    try {
      const updatesList = Object.entries(bulkUpdates).map(([itemId, updateData]) => {
        const metadata: any = {};
        config.fields.forEach(f => { metadata[f.id] = updateData[f.id]; });

        if (config.storeCheckQuantityReconciliation) {
          const requiredQty = requiredQtyById.get(itemId) ?? 0;
          const availableQty = Number(updateData.availableQty) || 0;
          const shortQty = Math.max(0, requiredQty - availableQty);
          metadata.shortQty = shortQty;
          metadata.requiredQty = requiredQty;
          metadata.availableQty = availableQty;
          return {
            procurementId: itemId,
            action: shortQty === 0 ? 'AVAILABLE' : 'NOT_AVAILABLE',
            remarks: updateData.remarks,
            metadata,
          };
        }

        return {
          procurementId: itemId,
          action: updateData.action,
          remarks: updateData.remarks,
          assignedToId: updateData.assignedToId,
          toFrom: updateData.toFrom,
          metadata,
        };
      });
      const result = await performBulkMultiStageAction(updatesList, { notifyUsers: true });
      setBulkResult(result);
    } catch (err: any) {
      alert(err.message || 'Bulk update failed');
    } finally {
      setSubmitting(false);
    }
  };

  const closeAndRefresh = () => { 
    setShowBulkModal(false); 
    setBulkResult(null); 
    fetchData(); 
  };

  const applyAllAssignedTo = (val: string) => {
    if (!val) return;
    setBulkUpdates(prev => { const n = { ...prev }; Object.keys(n).forEach(id => { n[id].assignedToId = val; }); return n; });
  };
  const applyAllToFrom = (val: string) => {
    if (!val) return;
    setBulkUpdates(prev => { const n = { ...prev }; Object.keys(n).forEach(id => { n[id].toFrom = val; }); return n; });
  };
  const applyAllRemarks = (val: string) => {
    if (!val) return;
    setBulkUpdates(prev => { const n = { ...prev }; Object.keys(n).forEach(id => { n[id].remarks = val; }); return n; });
  };
  const applyAllAction = (val: string) => {
    if (!val) return;
    setBulkUpdates(prev => { const n = { ...prev }; Object.keys(n).forEach(id => { n[id].action = val; }); return n; });
  };

  // KPI delay formatter
  const formatDelay = (h: number) => {
    if (h <= 0) return '0 days';
    const BIZ = 9;
    if (h < 1) return `${Math.round(h * 60)}m`;
    if (h < BIZ) return `${h.toFixed(1)}h`;
    return `${(h / BIZ).toFixed(1)} days`;
  };

  return (
    <div className="page-content" style={{ maxWidth: '100%', margin: '0 auto' }}>
      <PageHeader title={title} description={description} />



      {/* Row 2: Performance KPIs */}
      {kpis && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Stage Performance KPIs (All-time Live Stats)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            {[
              { label: 'Total Processed', value: kpis.totalProcessed, color: 'var(--primary)', description: 'Records entered stage' },
              { label: 'Total Approved', value: kpis.totalApproved, color: '#059669', description: 'Approved or completed' },
              { label: 'Total Rejected', value: kpis.totalRejected, color: '#DC2626', description: 'Rejected at this stage' },
              { label: 'Average Delay', value: formatDelay(kpis.averageDelayHours), color: '#D97706', description: 'Business delay average' },
              { label: 'Approval Rate', value: `${(kpis.approvalRate || 0).toFixed(1)}%`, color: '#0D9488', description: 'Approved vs processed' },
              { label: 'Rejection Rate', value: `${(kpis.rejectionRate || 0).toFixed(1)}%`, color: '#E11D48', description: 'Rejected vs processed' },
            ].map(card => (
              <div key={card.label} className="ifh-card p-4" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{card.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: card.color, marginTop: 4, marginBottom: 4 }}>{card.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{card.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table Card */}
      <div className="ifh-card" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

        {/* Bulk action bar — only visible when rows selected */}
        {selectedItems.length > 0 && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface2)', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(37, 99, 235, 0.1)', padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(37, 99, 235, 0.2)' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#2563EB' }}>{selectedItems.length} item(s) selected</span>
              <button
                onClick={openBulkModal}
                style={{ background: '#2563EB', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Edit3 style={{ width: 14, height: 14 }} />
                Bulk Update
              </button>
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              <Loader2 className="animate-spin" style={{ width: 32, height: 32, marginBottom: 12 }} />
              <p>Loading queue...</p>
            </div>
          ) : items.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              <AlertCircle style={{ width: 32, height: 32, marginBottom: 12, opacity: 0.5 }} />
              <p>No records pending at this stage.</p>
            </div>
          ) : (
            <table className="ifh-table" style={{ minWidth: 3500 }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--card)', zIndex: 10 }}>
                <tr>
                  <th style={{ position: 'sticky', left: 0, background: 'var(--card)', zIndex: 20, width: 40, textAlign: 'center', padding: '12px 8px', borderRight: '1px solid var(--border)' }}>
                    <input type="checkbox" checked={allSelected} onChange={handleSelectAll} />
                  </th>
                  <th style={{ position: 'sticky', left: 40, background: 'var(--card)', zIndex: 20, width: 80, textAlign: 'center', borderRight: '1px solid var(--border)' }}>Actions</th>
                  <th style={{ width: 160 }}>Pending Timestamp</th>
                  <th style={{ width: 140 }}>Pending Stage</th>
                  <th style={{ width: 140 }}>Doer Name</th>
                  <th style={{ width: 160 }}>Indent Raised Timestamp</th>
                  <th style={{ width: 140 }}>Itemwise Indent No.</th>
                  <th style={{ width: 140 }}>Filled By</th>
                  <th style={{ width: 120 }}>Project ID</th>
                  <th style={{ width: 160 }}>Project Name</th>
                  <th style={{ width: 140 }}>Item Attachment</th>
                  <th style={{ width: 120 }}>Item Type</th>
                  <th style={{ width: 180 }}>Remarks – Indent Raised</th>
                  <th style={{ width: 120 }}>SKU Code</th>
                  <th style={{ minWidth: 250 }}>Item Description</th>
                  <th style={{ width: 100, textAlign: 'right' }}>Quantity</th>
                  <th style={{ width: 80 }}>UOM</th>
                  <th style={{ width: 200 }}>Technical Specification</th>
                  <th style={{ width: 160 }}>Approved Makes</th>
                  <th style={{ width: 140 }}>Required Date</th>
                  <th style={{ width: 160 }}>Painting Specification</th>
                  <th style={{ width: 160 }}>Packing Requirement</th>
                  <th style={{ width: 140 }}>Certification</th>
                  <th style={{ width: 120 }}>Manuals</th>
                  <th style={{ width: 160 }}>Warranty & Guarantee</th>
                  <th style={{ width: 120 }}>GA Drawing</th>
                  <th style={{ width: 140 }}>Indent Form Card</th>
                  <th style={{ width: 120 }}>PO Number</th>
                  <th style={{ width: 120 }}>GRN Number</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <QueueRow
                    key={item.id}
                    item={item}
                    idx={idx}
                    title={title}
                    slug={slug}
                    onSelect={handleSelectItem}
                    onView={handleViewRecord}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {!loading && items.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface2)' }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Page {page} of {totalPages}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 6, background: page === 1 ? 'var(--surface3)' : 'var(--card)', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 13, color: page === 1 ? 'var(--text-muted)' : 'var(--text-primary)' }}
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 6, background: page === totalPages ? 'var(--surface3)' : 'var(--card)', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: 13, color: page === totalPages ? 'var(--text-muted)' : 'var(--text-primary)' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Update Modal */}
      {showBulkModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--card)', width: '90%', maxWidth: 1200, maxHeight: '90vh', borderRadius: 12, display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>

            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Bulk Update</h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  {bulkResult ? 'Update Summary' : `Review and update fields for ${selectedItems.length} item(s).`}
                </p>
              </div>
              {!submitting && !bulkResult && (
                <button onClick={() => setShowBulkModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <X style={{ width: 20, height: 20 }} />
                </button>
              )}
            </div>

            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              {bulkResult ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ flex: 1, padding: 16, borderRadius: 8, background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.2)' }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#059669' }}>{bulkResult.totalUpdated}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#059669' }}>Updated Successfully</div>
                    </div>
                    <div style={{ flex: 1, padding: 16, borderRadius: 8, background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.2)' }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#D97706' }}>{bulkResult.totalSkipped}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#D97706' }}>Skipped</div>
                    </div>
                    <div style={{ flex: 1, padding: 16, borderRadius: 8, background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)' }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#DC2626' }}>{bulkResult.totalFailed}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#DC2626' }}>Failed</div>
                    </div>
                  </div>
                  {bulkResult.failedRecords?.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 700, color: '#DC2626', marginBottom: 8 }}>Errors</h4>
                      <ul style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {bulkResult.failedRecords.map((f: any, i: number) => (
                          <li key={i}>{f.referenceNo || f.id}: {f.reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Quick Fill Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '12px 16px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>Quick Fill:</span>
                    {config && config.actions.length > 0 && !config.storeCheckQuantityReconciliation && (
                      <select onChange={e => applyAllAction(e.target.value)} style={{ padding: '6px', borderRadius: 4, border: '1px solid var(--border)', fontSize: 12, minWidth: 160 }}>
                        <option value="">Apply to all: Action</option>
                        {config.actions.map(a => <option key={a.action} value={a.action}>{a.label}</option>)}
                      </select>
                    )}
                    {config?.requiresAssignedTo !== false && (
                      <>
                        <select onChange={e => applyAllAssignedTo(e.target.value)} style={{ padding: '6px', borderRadius: 4, border: '1px solid var(--border)', fontSize: 12, minWidth: 140 }}>
                          <option value="">Apply to all: Resp. Person</option>
                          {config?.responsiblePersonOptions
                            ? config.responsiblePersonOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)
                            : users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                        </select>
                        {config?.toFromOptions ? (
                          <select onChange={e => { applyAllToFrom(e.target.value); e.target.value = ''; }} style={{ padding: '6px', borderRadius: 4, border: '1px solid var(--border)', fontSize: 12, minWidth: 140 }}>
                            <option value="">Apply to all: To / From</option>
                            {config.toFromOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        ) : (
                          <input type="text" placeholder="To / From" onBlur={e => { applyAllToFrom(e.target.value); e.target.value = ''; }} style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid var(--border)', fontSize: 12, minWidth: 120 }} />
                        )}
                      </>
                    )}
                    {config?.fields.map(f => {
                      if (f.type === 'select') {
                        return (
                          <select key={f.id} onChange={e => {
                            const val = e.target.value;
                            setBulkUpdates(prev => {
                              const n = { ...prev };
                              Object.keys(n).forEach(id => { n[id][f.id] = val; });
                              return n;
                            });
                          }} style={{ padding: '6px', borderRadius: 4, border: '1px solid var(--border)', fontSize: 12, minWidth: 140 }}>
                            <option value="">Apply to all: {f.label}</option>
                            {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        );
                      }
                      return (
                        <input key={f.id} type={f.type} placeholder={`Apply to all: ${f.label}`} onBlur={e => {
                          const val = e.target.value;
                          setBulkUpdates(prev => {
                            const n = { ...prev };
                            Object.keys(n).forEach(id => { n[id][f.id] = val; });
                            return n;
                          });
                          e.target.value = '';
                        }} style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid var(--border)', fontSize: 12, minWidth: 140 }} />
                      )
                    })}
                    <input type="text" placeholder="Apply to all: Remarks" onBlur={e => { applyAllRemarks(e.target.value); e.target.value = ''; }} style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid var(--border)', fontSize: 12, flex: 1, minWidth: 140 }} />
                  </div>

                  {/* Per-item table */}
                  <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflowX: 'auto' }}>
                    <table className="ifh-table" style={{ width: '100%', minWidth: 800 }}>
                      <thead style={{ background: 'var(--surface2)' }}>
                        <tr>
                          <th style={{ padding: '10px 12px', textAlign: 'left', minWidth: 150 }}>Indent No.</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', minWidth: 180 }}>Itemwise Indent No.</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', minWidth: 200 }}>Item Description</th>
                          {config?.requiresAssignedTo !== false && <th style={{ padding: '10px 12px', textAlign: 'left', minWidth: 180 }}>Resp. Person *</th>}
                          {config?.requiresAssignedTo !== false && <th style={{ padding: '10px 12px', textAlign: 'left', minWidth: 150 }}>To / From</th>}
                          {config?.storeCheckQuantityReconciliation && (
                            <>
                              <th style={{ padding: '10px 12px', textAlign: 'right', minWidth: 130 }}>Required Qty</th>
                              <th style={{ padding: '10px 12px', textAlign: 'right', minWidth: 150 }}>Available Stock Qty *</th>
                              <th style={{ padding: '10px 12px', textAlign: 'right', minWidth: 170 }}>Qty to Procure</th>
                            </>
                          )}
                          {config?.fields.map(f => (
                            <th key={f.id} style={{ padding: '10px 12px', textAlign: 'left', minWidth: 150 }}>{f.label}{f.required ? ' *' : ''}</th>
                          ))}
                          {config && config.actions.length > 0 && !config.storeCheckQuantityReconciliation && <th style={{ padding: '10px 12px', textAlign: 'left', minWidth: 180 }}>Action *</th>}
                          <th style={{ padding: '10px 12px', textAlign: 'left', minWidth: 200 }}>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedItems.map((item) => {
                          const u = bulkUpdates[item.id];
                          const indentNo = item.bbuCode || `${item.procurement.referenceNo}-${String((item.procurement.items ?? []).findIndex(i => i.id === item.id) + 1).padStart(3, '0')}`;
                          return (
                            <tr key={item.id} style={{ borderTop: '1px solid var(--border)' }}>
                              <td style={{ padding: '10px 12px', fontWeight: 600 }}>{item.procurement.referenceNo}</td>
                              <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{indentNo}</td>
                              <td style={{ padding: '10px 12px', fontWeight: 600 }}>{item.itemName}</td>
                              {config?.storeCheckQuantityReconciliation && (() => {
                                const requiredQty = Number(item.quantity) || 0;
                                const availableRaw = u?.availableQty;
                                const availableQty = availableRaw === '' || availableRaw === undefined ? null : Number(availableRaw);
                                const invalid = availableQty !== null && (isNaN(availableQty) || availableQty < 0 || availableQty > requiredQty);
                                const toProcure = availableQty !== null && !invalid ? requiredQty - availableQty : null;
                                return (
                                  <>
                                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-secondary)' }}>{requiredQty}</td>
                                    <td style={{ padding: '8px 12px' }}>
                                      <input
                                        type="number"
                                        min={0}
                                        max={requiredQty}
                                        placeholder="0"
                                        value={availableRaw ?? ''}
                                        onChange={e => setBulkUpdates(prev => ({ ...prev, [item.id]: { ...prev[item.id], availableQty: e.target.value } }))}
                                        style={{ width: '100%', padding: '6px 10px', borderRadius: 4, textAlign: 'right', border: `1px solid ${invalid || availableQty === null ? '#DC2626' : 'var(--border)'}`, outline: 'none' }}
                                      />
                                      {invalid && availableQty !== null && (
                                        <div style={{ fontSize: 11, color: '#DC2626', marginTop: 2 }}>
                                          {availableQty < 0 ? 'Cannot be negative' : 'Cannot exceed required qty'}
                                        </div>
                                      )}
                                    </td>
                                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: toProcure === 0 ? '#059669' : toProcure !== null ? '#D97706' : 'var(--text-muted)' }}>
                                      {toProcure !== null ? toProcure : '—'}
                                    </td>
                                  </>
                                );
                              })()}
                              {config?.requiresAssignedTo !== false && (
                                <td style={{ padding: '8px 12px' }}>
                                  <select
                                    value={u?.assignedToId || ''}
                                    onChange={e => setBulkUpdates(prev => ({ ...prev, [item.id]: { ...prev[item.id], assignedToId: e.target.value } }))}
                                    style={{ width: '100%', padding: '6px', borderRadius: 4, border: `1px solid ${!u?.assignedToId ? '#DC2626' : 'var(--border)'}` }}
                                  >
                                    <option value="">Select Person...</option>
                                    {config?.responsiblePersonOptions
                                      ? config.responsiblePersonOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)
                                      : users.map(usr => <option key={usr.id} value={usr.id}>{usr.fullName}</option>)}
                                  </select>
                                </td>
                              )}
                              {config?.requiresAssignedTo !== false && (
                                <td style={{ padding: '8px 12px' }}>
                                  {config?.toFromOptions ? (
                                    <select
                                      value={u?.toFrom || ''}
                                      onChange={e => setBulkUpdates(prev => ({ ...prev, [item.id]: { ...prev[item.id], toFrom: e.target.value } }))}
                                      style={{ width: '100%', padding: '6px', borderRadius: 4, border: `1px solid ${u?.action === 'HOLD' && !u?.toFrom ? '#DC2626' : 'var(--border)'}` }}
                                    >
                                      <option value="">Select...</option>
                                      {config.toFromOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                  ) : (
                                    <input
                                      type="text"
                                      placeholder="To / From..."
                                      value={u?.toFrom || ''}
                                      onChange={e => setBulkUpdates(prev => ({ ...prev, [item.id]: { ...prev[item.id], toFrom: e.target.value } }))}
                                      style={{ width: '100%', padding: '6px 12px', borderRadius: 4, border: '1px solid var(--border)', outline: 'none' }}
                                    />
                                  )}
                                </td>
                              )}
                              {config?.fields.map(f => (
                                <td key={f.id} style={{ padding: '8px 12px' }}>
                                  {f.type === 'select' ? (
                                    <select
                                      value={u?.[f.id] || ''}
                                      onChange={e => setBulkUpdates(prev => ({ ...prev, [item.id]: { ...prev[item.id], [f.id]: e.target.value } }))}
                                      style={{ width: '100%', padding: '6px', borderRadius: 4, border: `1px solid ${f.required && !u?.[f.id] ? '#DC2626' : 'var(--border)'}` }}
                                    >
                                      <option value="">Select...</option>
                                      {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                  ) : (
                                    <input
                                      type={f.type}
                                      placeholder={f.placeholder || f.label}
                                      value={u?.[f.id] || ''}
                                      onChange={e => setBulkUpdates(prev => ({ ...prev, [item.id]: { ...prev[item.id], [f.id]: e.target.value } }))}
                                      style={{ width: '100%', padding: '6px 12px', borderRadius: 4, border: `1px solid ${f.required && !u?.[f.id] ? '#DC2626' : 'var(--border)'}`, outline: 'none' }}
                                    />
                                  )}
                                </td>
                              ))}
                              {config && config.actions.length > 0 && !config.storeCheckQuantityReconciliation && (
                                <td style={{ padding: '8px 12px' }}>
                                  <select
                                    value={u?.action || ''}
                                    onChange={e => setBulkUpdates(prev => ({ ...prev, [item.id]: { ...prev[item.id], action: e.target.value } }))}
                                    style={{ width: '100%', padding: '6px', borderRadius: 4, border: `1px solid ${!u?.action ? '#DC2626' : 'var(--border)'}` }}
                                  >
                                    <option value="">Select Action...</option>
                                    {config.actions.map(a => <option key={a.action} value={a.action}>{a.label}</option>)}
                                  </select>
                                </td>
                              )}
                              <td style={{ padding: '8px 12px' }}>
                                <textarea
                                  rows={1}
                                  placeholder="Optional notes..."
                                  value={u?.remarks || ''}
                                  onChange={e => setBulkUpdates(prev => ({ ...prev, [item.id]: { ...prev[item.id], remarks: e.target.value } }))}
                                  style={{ width: '100%', padding: '6px 12px', borderRadius: 4, border: '1px solid var(--border)', outline: 'none', resize: 'vertical' }}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 12, background: 'var(--surface2)', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
              {bulkResult ? (
                <button onClick={closeAndRefresh} className="ifh-btn-primary">Done</button>
              ) : (
                <>
                  <button onClick={() => setShowBulkModal(false)} className="ifh-btn-secondary" disabled={submitting}>Cancel</button>
                  <button onClick={handleBulkSubmit} disabled={submitting} className="ifh-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {submitting ? <Loader2 className="animate-spin" style={{ width: 16, height: 16 }} /> : <Save style={{ width: 16, height: 16 }} />}
                    Update Selected
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
