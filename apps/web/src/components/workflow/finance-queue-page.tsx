'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Edit3, Save, X, Loader2, ListCollapse } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { getProcurements, performBulkMultiStageAction, type ProcurementItem } from '@/lib/api/procurement';
import { FinanceLifecycleDrawer } from './finance-lifecycle-drawer';

interface FlattenedItem extends ProcurementItem {
  procurement: any;
  _selected: boolean;
  _bulkAction?: string;
  _bulkRemarks?: string;
  _billNumber?: string;
  _grnNumber?: string;
  poNumber?: string;
  financeStatus?: string;
  grnNumber?: string;
  billNumber?: string;
  tallyEntryNo?: string;
  paymentAdviceNo?: string;
  [key: string]: any;
}

interface FinanceQueuePageProps {
  title: string;
  description: string;
  stage: number;
  slug: string;
}

export function FinanceQueuePage({ title, description, stage, slug }: FinanceQueuePageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FlattenedItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<{ proc: any; item: any } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [bulkAction, setBulkAction] = useState<string>('APPROVE');

  const showBillNo = stage >= 18;
  const showGrnNo = stage === 16;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getProcurements({ limit: 100, stage });
      const flatItems: FlattenedItem[] = [];
      result.data.forEach((proc: any) => {
        if (proc.items && proc.items.length > 0) {
          proc.items.forEach((item: any) => {
            flatItems.push({ 
              ...item, 
              procurement: proc, 
              _selected: false,
              _billNumber: item.billNumber || '',
              _grnNumber: item.grnNumber || '',
              _bulkRemarks: item.financeRemarks || ''
            });
          });
        }
      });
      setItems(flatItems);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [stage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSelectAll = (checked: boolean) => {
    setItems(prev => prev.map(item => ({ ...item, _selected: checked })));
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, _selected: checked } : item));
  };

  const handleItemChange = (id: string, field: string, value: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const selectedItems = useMemo(() => items.filter(i => i._selected), [items]);
  const allSelected = items.length > 0 && selectedItems.length === items.length;

  const handleBulkSubmit = async () => {
    if (selectedItems.length === 0) return;
    setSubmitting(true);
    try {
      const updates = selectedItems.map(item => ({
        procurementId: item.id, // Backend maps this to itemId
        action: bulkAction,
        remarks: item._bulkRemarks,
        metadata: {
          billNumber: item._billNumber,
          grnNumber: item._grnNumber,
        }
      }));

      await performBulkMultiStageAction(updates);
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to process records');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: '100%', overflowX: 'hidden' }}>
      <PageHeader title={title} description={description} />

      <div style={{ padding: 16, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', background: 'var(--card)', border: '1px dashed var(--border)', borderRadius: 8, marginBottom: 24 }}>
        <div style={{ fontWeight: 500, fontSize: 14, flex: 1 }}>
          {selectedItems.length} record(s) selected
        </div>
        
        <select 
          style={{ height: 36, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', padding: '4px 12px', fontSize: 14 }}
          value={bulkAction}
          onChange={(e) => setBulkAction(e.target.value)}
        >
          <option value="APPROVE">Approve / Process</option>
          <option value="HOLD">Hold</option>
          <option value="REJECT">Reject</option>
        </select>

        <button 
          onClick={handleBulkSubmit} 
          disabled={submitting || selectedItems.length === 0}
          className="ifh-btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          {submitting ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : <Save style={{ width: 16, height: 16 }} />}
          Apply Action
        </button>
      </div>

      <div style={{ borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', maxHeight: '70vh' }}>
          <table style={{ width: '100%', fontSize: 14, textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--muted)', position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                <th style={{ padding: 12, width: 48, textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                  <input type="checkbox" checked={allSelected} onChange={(e) => handleSelectAll(e.target.checked)} />
                </th>
                <th style={{ padding: 12, fontWeight: 500, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', minWidth: 120 }}>Indent No.</th>
                <th style={{ padding: 12, fontWeight: 500, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', minWidth: 120 }}>Item Indent No.</th>
                <th style={{ padding: 12, fontWeight: 500, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', minWidth: 200 }}>Item Description</th>
                <th style={{ padding: 12, fontWeight: 500, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', minWidth: 120 }}>PO Number</th>
                {showGrnNo && <th style={{ padding: 12, fontWeight: 500, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', minWidth: 150 }}>GRN</th>}
                {showBillNo && <th style={{ padding: 12, fontWeight: 500, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', minWidth: 150 }}>Bill No.</th>}
                <th style={{ padding: 12, fontWeight: 500, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', minWidth: 120 }}>Status</th>
                <th style={{ padding: 12, fontWeight: 500, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', minWidth: 200 }}>Remarks</th>
                <th style={{ padding: 12, fontWeight: 500, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', minWidth: 100, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Loader2 style={{ width: 24, height: 24, animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                    Loading records...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                    No records found in this stage.
                  </td>
                </tr>
              ) : (
                items.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: 12, textAlign: 'center' }}>
                      <input 
                        type="checkbox"
                        checked={item._selected} 
                        onChange={(e) => handleSelectItem(item.id, e.target.checked)} 
                      />
                    </td>
                    <td style={{ padding: 12, fontWeight: 500 }}>{item.procurement.referenceNo}</td>
                    <td style={{ padding: 12 }}>{item.itemCode || '-'}</td>
                    <td style={{ padding: 12 }}>{item.itemName}</td>
                    <td style={{ padding: 12 }}>{item.poNumber || '-'}</td>
                    {showGrnNo && (
                      <td style={{ padding: 12 }}>
                        <input 
                          placeholder="GRN..." 
                          value={item._grnNumber}
                          onChange={(e) => handleItemChange(item.id, '_grnNumber', e.target.value)}
                          style={{ border: '1px solid var(--border)', padding: '4px 8px', borderRadius: 4, width: '100%' }}
                        />
                      </td>
                    )}
                    {showBillNo && (
                      <td style={{ padding: 12 }}>
                        <input 
                          placeholder="Bill No..." 
                          value={item._billNumber}
                          onChange={(e) => handleItemChange(item.id, '_billNumber', e.target.value)}
                          style={{ border: '1px solid var(--border)', padding: '4px 8px', borderRadius: 4, width: '100%' }}
                        />
                      </td>
                    )}
                    <td style={{ padding: 12 }}>
                      <StatusBadge status={item.financeStatus || 'PENDING'} />
                    </td>
                    <td style={{ padding: 12 }}>
                      <input 
                        placeholder="Remarks..." 
                        value={item._bulkRemarks}
                        onChange={(e) => handleItemChange(item.id, '_bulkRemarks', e.target.value)}
                        style={{ border: '1px solid var(--border)', padding: '4px 8px', borderRadius: 4, width: '100%' }}
                      />
                    </td>
                    <td style={{ padding: 12, textAlign: 'center' }}>
                      <button 
                        className="ifh-btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: 4, margin: '0 auto', fontSize: 12, padding: '4px 8px' }}
                        onClick={() => {
                          setActiveItem({ proc: item.procurement, item });
                          setDrawerOpen(true);
                        }}
                      >
                        <ListCollapse style={{ width: 14, height: 14 }} />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <FinanceLifecycleDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        procurement={activeItem?.proc}
        item={activeItem?.item}
      />
    </div>
  );
}
