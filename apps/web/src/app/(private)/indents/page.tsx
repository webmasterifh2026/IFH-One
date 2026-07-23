'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Edit3, Copy, Trash2, Loader2, AlertCircle, Search, FileText } from 'lucide-react';
import { getProcurements } from '@/lib/api/procurement';
import { apiFetch } from '@/lib/api/fetch';
import { formatDate } from '@/lib/procurement-stages';

interface ProcurementItem {
  id: string;
  itemCode?: string;
  itemName: string;
  description?: string;
  unit?: string;
  quantity: number;
  technicalSpec?: string;
  approvedMakes?: string;
  attachmentName?: string;
  attachmentUrl?: string;
}

interface ProcurementRecord {
  id: string;
  referenceNo: string;
  title: string;
  description?: string;
  status: string;
  currentStage: number;
  priority: string;
  createdAt: string;
  updatedAt: string;
  projectId?: string;
  projectName?: string;
  application?: string;
  itemType?: string;
  requiredDate?: string;
  paintingSpecRemark?: string;
  packingRequirement?: string;
  certification?: string;
  manuals?: string;
  warrantyGuarantee?: string;
  ga?: string;
  requestedBy?: { id: string; fullName: string; employeeId: string };
  items?: ProcurementItem[];
}

interface FlattenedItem extends ProcurementItem {
  procurement: ProcurementRecord;
}

export default function DraftIndentsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FlattenedItem[]>([]);
  const [search, setSearch] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterItemType, setFilterItemType] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch only drafts
      const result = await getProcurements({ page: 1, limit: 1000, status: 'DRAFT' });
      
      const flatItems: FlattenedItem[] = [];
      if (result && result.data) {
        result.data.forEach((proc: any) => {
          if (proc.items && proc.items.length > 0) {
            proc.items.forEach((item: any) => {
              flatItems.push({ ...item, procurement: proc });
            });
          }
        });
      }
      setItems(flatItems);
    } catch (err) {
      console.error('Failed to fetch drafts', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this draft indent? This action cannot be undone.')) return;
    setDeletingId(id);
    try {
      await apiFetch(`/procurement/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete draft');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicate = async (id: string) => {
    setDuplicatingId(id);
    try {
      await apiFetch(`/procurement/${id}/duplicate`, { method: 'POST' });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to duplicate draft');
    } finally {
      setDuplicatingId(null);
    }
  };

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(item => {
      if (filterProject && item.procurement.projectId !== filterProject && item.procurement.projectName !== filterProject) return false;
      if (filterItemType && item.procurement.itemType !== filterItemType) return false;
      if (!q) return true;
      return (
        item.procurement.referenceNo.toLowerCase().includes(q) ||
        (item.procurement.projectId || '').toLowerCase().includes(q) ||
        (item.procurement.projectName || '').toLowerCase().includes(q) ||
        item.itemName.toLowerCase().includes(q) ||
        (item.itemCode || '').toLowerCase().includes(q) ||
        (item.procurement.requestedBy?.fullName || '').toLowerCase().includes(q)
      );
    });
  }, [items, search, filterProject, filterItemType]);

  const uniqueProjects = Array.from(new Set(items.map(i => i.procurement.projectName || i.procurement.projectId).filter(Boolean)));
  const uniqueItemTypes = Array.from(new Set(items.map(i => i.procurement.itemType).filter(Boolean)));

  const inputS: React.CSSProperties = { height: 32, padding: '0 10px', borderRadius: 7, border: '1px solid var(--border)', backgroundColor: 'var(--card)', fontSize: 12, color: 'var(--text-primary)', outline: 'none' };

  return (
    <div className="page-content" style={{ maxWidth: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 24, fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.015em', lineHeight: 1.2 }}>
            Indent Creation
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 5 }}>
            Create new indents or manage your saved drafts before submission.
          </p>
        </div>
        <button
          onClick={() => router.push('/indents/new')}
          className="ifh-btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          New Indent
        </button>
      </div>

      {/* Action Bar + Search */}
      <div style={{ padding: '12px 16px', backgroundColor: 'var(--card)', borderBottom: '1px solid var(--border)', borderTopLeftRadius: 12, borderTopRightRadius: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 280 }}>
          <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-faint)' }} />
          <input
            type="text"
            placeholder="Search drafts by Indent No, Project, SKU, Creator..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', height: 36, padding: '0 12px 0 32px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--surface2)', fontSize: 13, outline: 'none' }}
          />
        </div>
        <select style={inputS} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
          <option value="">All Projects</option>
          {uniqueProjects.map((p: any) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select style={inputS} value={filterItemType} onChange={e => setFilterItemType(e.target.value)}>
          <option value="">All Item Types</option>
          {uniqueItemTypes.map((t: any) => <option key={t} value={t}>{t}</option>)}
        </select>
        {(search || filterProject || filterItemType) && (
          <button onClick={() => { setSearch(''); setFilterProject(''); setFilterItemType(''); }}
            style={{ height: 32, padding: '0 12px', borderRadius: 6, border: 'none', backgroundColor: 'var(--surface2)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Table Card */}
      <div className="ifh-card" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: 'none' }}>
        <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              <Loader2 className="animate-spin" style={{ width: 32, height: 32, marginBottom: 12 }} />
              <p>Loading draft indents...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              <AlertCircle style={{ width: 32, height: 32, marginBottom: 12, opacity: 0.5 }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>No Draft Indents Found</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>You don't have any saved drafts matching your criteria.</p>
              <button onClick={() => router.push('/indents/new')} className="ifh-btn-secondary" style={{ marginTop: 16 }}>Create New Draft</button>
            </div>
          ) : (
            <table className="ifh-table" style={{ minWidth: 3500 }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--card)', zIndex: 10 }}>
                <tr>
                  <th style={{ position: 'sticky', left: 0, backgroundColor: 'var(--card)', zIndex: 20, width: 140, textAlign: 'center', borderRight: '1px solid var(--border)' }}>Actions</th>
                  <th style={{ width: 160 }}>Pending Timestamp</th>
                  <th style={{ width: 140 }}>Pending Stage</th>
                  <th style={{ width: 140 }}>Creator Name</th>
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
                {filteredItems.map((item) => {
                  const procId = item.procurement.id;
                  const isDeleting = deletingId === procId;
                  const isDuplicating = duplicatingId === procId;
                  // Compute item index within its own procurement (1-based, padded)
                  const itemIdx = (item.procurement.items ?? []).findIndex(i => i.id === item.id);
                  const itemwiseNo = `${item.procurement.referenceNo}-${String(itemIdx >= 0 ? itemIdx + 1 : 1).padStart(3, '0')}`;
                  
                  return (
                    <tr key={`${item.procurement.id}-${item.id}`} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ position: 'sticky', left: 0, backgroundColor: 'var(--card)', zIndex: 5, textAlign: 'center', borderRight: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                          <button onClick={() => router.push(`/indents/${procId}`)} style={{ backgroundColor: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }} title="View Draft">
                            <Eye style={{ width: 16, height: 16 }} />
                          </button>
                          <button onClick={() => router.push(`/indents/new?draftId=${procId}`)} style={{ backgroundColor: 'none', border: 'none', color: '#2563EB', cursor: 'pointer' }} title="Continue Editing">
                            <Edit3 style={{ width: 16, height: 16 }} />
                          </button>
                          <button onClick={() => handleDuplicate(procId)} disabled={isDuplicating} style={{ backgroundColor: 'none', border: 'none', color: '#D97706', cursor: isDuplicating ? 'not-allowed' : 'pointer' }} title="Duplicate Draft">
                            {isDuplicating ? <Loader2 className="animate-spin" style={{ width: 16, height: 16 }} /> : <Copy style={{ width: 16, height: 16 }} />}
                          </button>
                          <button onClick={() => handleDelete(procId)} disabled={isDeleting} style={{ backgroundColor: 'none', border: 'none', color: '#DC2626', cursor: isDeleting ? 'not-allowed' : 'pointer' }} title="Delete Draft">
                            {isDeleting ? <Loader2 className="animate-spin" style={{ width: 16, height: 16 }} /> : <Trash2 style={{ width: 16, height: 16 }} />}
                          </button>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>—</td>
                      <td><span style={{ padding: '2px 8px', borderRadius: 12, backgroundColor: 'rgba(107, 114, 128, 0.1)', color: '#4B5563', fontSize: 11, fontWeight: 700 }}>Draft</span></td>
                      <td>{item.procurement.requestedBy?.fullName || '—'}</td>
                      <td>{formatDate(item.procurement.createdAt)}</td>
                      <td style={{ fontWeight: 600 }}>{itemwiseNo}</td>
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
                      <td>{item.procurement.paintingSpecRemark || '—'}</td>
                      <td>{item.procurement.packingRequirement || '—'}</td>
                      <td>{item.procurement.certification || '—'}</td>
                      <td>{item.procurement.manuals || '—'}</td>
                      <td>{item.procurement.warrantyGuarantee || '—'}</td>
                      <td>{item.procurement.ga || '—'}</td>
                      <td style={{ color: 'var(--text-muted)' }}>—</td>
                      <td style={{ color: 'var(--text-muted)' }}>—</td>
                      <td style={{ color: 'var(--text-muted)' }}>—</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
