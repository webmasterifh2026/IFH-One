'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight, Plus, Edit, Trash2, TrendingUp, ExternalLink, X, Filter, Sparkles, Upload, Download } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { apiFetch } from '@/lib/api/fetch';
import { AdaptiveSearch } from '@/components/ui/adaptive-search';
import { ImportItemsModal } from '@/components/ui/import-items-modal';
import Link from 'next/link';

interface ItemRow {
  id: string;
  itemCode: string;
  description: string;
  category?: string;
  subGroup?: string;
  uom: string;
  status?: string;
  createdAt?: string;
}

const PAGE_SIZES = [25, 50, 100];





export default function ItemsPage() {
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search & Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterUom, setFilterUom] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  
  // Quick Filters
  const [qfDuplicates, setQfDuplicates] = useState(false);
  const [qfRecent, setQfRecent] = useState(false);
  const [qfFrequent, setQfFrequent] = useState(false);

  // Pagination & Sorting
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [sortBy, setSortBy] = useState('description');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isFuzzyFallback, setIsFuzzyFallback] = useState(false);

  // CRUD Modals
  const [showModal, setShowModal] = useState<'create' | 'edit' | 'delete' | 'insights' | null>(null);
  const [currentItem, setCurrentItem] = useState<ItemRow | null>(null);
  const [formData, setFormData] = useState({ itemCode: '', description: '', category: '', subGroup: '', uom: '' });
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<any[]>([]);
  const [forceSave, setForceSave] = useState(false);

  // Item Insights
  const [insights, setInsights] = useState<any>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // reset to page 1
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const skip = (page - 1) * limit;
      const qs = new URLSearchParams();
      qs.set('skip', String(skip));
      qs.set('take', String(limit));
      if (debouncedSearch) qs.set('search', debouncedSearch);
      if (filterUom) qs.set('uom', filterUom);
      if (filterCategory) qs.set('category', filterCategory);
      if (filterStatus) qs.set('status', filterStatus);
      if (qfDuplicates) qs.set('duplicatesOnly', 'true');
      if (qfRecent) qs.set('recentlyViewed', 'true');
      if (qfFrequent) qs.set('frequentlyUsed', 'true');
      qs.set('sortBy', sortBy);
      qs.set('sortOrder', sortOrder);

      const result = await apiFetch(`/skus?${qs.toString()}`);
      const data = result?.data ?? (Array.isArray(result) ? result : []);
      const meta = result?.meta ?? {};

      let fuzzy = false;
      if (debouncedSearch && data.length > 0) {
        const q = debouncedSearch.toLowerCase();
        fuzzy = data.every((item: ItemRow) => 
          !item.itemCode.toLowerCase().includes(q) && 
          !item.description.toLowerCase().includes(q)
        );
      }

      setItems(data);
      setTotal(meta.total ?? data.length);
      setTotalPages(meta.totalPages ?? 1);
      setIsFuzzyFallback(fuzzy);
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, filterUom, filterCategory, filterStatus, qfDuplicates, qfRecent, qfFrequent, sortBy, sortOrder]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const loadInsights = async (sku: string) => {
    setInsightsLoading(true);
    setInsights(null);
    try {
      const res = await apiFetch(`/skus/${encodeURIComponent(sku)}/insights`);
      if (res && res.insights) {
        setInsights(res.insights);
      }
    } catch (e: any) {
      setModalError(e?.message || 'Failed to load insights');
    } finally {
      setInsightsLoading(false);
    }
  };

  const openModal = (type: 'create' | 'edit' | 'delete' | 'insights', item?: ItemRow) => {
    setShowModal(type);
    setCurrentItem(item || null);
    if (item) {
      setFormData({
        itemCode: item.itemCode,
        description: item.description,
        category: item.category || '',
        subGroup: item.subGroup || '',
        uom: item.uom,
      });
      if (type === 'insights') {
        loadInsights(item.itemCode);
        // Record view silently
        apiFetch(`/skus/${encodeURIComponent(item.itemCode)}/record-view`, {
          method: 'POST',
          body: JSON.stringify({ itemCode: item.itemCode })
        }).catch(err => console.error('Failed to record view', err));
      } else if (type === 'edit') {
        apiFetch(`/skus/${encodeURIComponent(item.itemCode)}/record-view`, {
          method: 'POST',
          body: JSON.stringify({ itemCode: item.itemCode })
        }).catch(err => console.error('Failed to record view', err));
      }
    } else {
      setFormData({ itemCode: '', description: '', category: '', subGroup: '', uom: '' });
    }
    setModalError('');
  };

  const closeModal = () => {
    setShowModal(null);
    setCurrentItem(null);
    setFormData({ itemCode: '', description: '', category: '', subGroup: '', uom: '' });
    setModalError('');
    setInsights(null);
    setDuplicateWarning([]);
    setForceSave(false);
  };

  const handleSave = async (isForced = false) => {
    setModalError('');
    setModalLoading(true);
    try {
      if (!isForced && !forceSave && (showModal === 'create' || showModal === 'edit')) {
        // Check for duplicates
        const qs = new URLSearchParams();
        qs.set('itemCode', formData.itemCode);
        if (showModal === 'edit' && currentItem) {
          qs.set('excludeId', currentItem.id);
        }
        const dups = await apiFetch(`/skus/check-duplicates?${qs.toString()}`);
        if (dups && Array.isArray(dups) && dups.length > 0) {
          setDuplicateWarning(dups);
          setModalLoading(false);
          return; // Stop saving, show warning
        }
      }

      if (showModal === 'create') {
        const res = await apiFetch('/skus', {
          method: 'POST',
          body: JSON.stringify({
            itemCode: formData.itemCode,
            description: formData.description,
            category: formData.category,
            subGroup: formData.subGroup,
            uom: formData.uom,
          })
        });
        if (res.error) throw new Error(res.error);
      } else if (showModal === 'edit' && currentItem) {
        const res = await apiFetch(`/skus/${encodeURIComponent(currentItem.id)}`, {
          method: 'PUT',
          body: JSON.stringify({ 
            itemCode: formData.itemCode,
            description: formData.description,
            category: formData.category,
            subGroup: formData.subGroup,
            uom: formData.uom,
          })
        });
        if (res.error) throw new Error(res.error);
      }
      closeModal();
      loadItems();
    } catch (e: any) {
      setModalError(e?.message || 'Operation failed');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentItem) return;
    setModalError('');
    setModalLoading(true);
    try {
      const res = await apiFetch(`/skus/${encodeURIComponent(currentItem.id)}`, {
        method: 'DELETE'
      });
      if (res.error) throw new Error(res.error);
      closeModal();
      loadItems();
    } catch (e: any) {
      setModalError(e?.message || 'Delete failed');
    } finally {
      setModalLoading(false);
    }
  };

  
  

  const handleExport = async () => {
    try {
      const skip = (page - 1) * limit;
      const qs = new URLSearchParams();
      if (debouncedSearch) qs.set('search', debouncedSearch);
      if (filterUom) qs.set('uom', filterUom);
      if (filterCategory) qs.set('category', filterCategory);
      if (filterStatus) qs.set('status', filterStatus);
      if (qfDuplicates) qs.set('duplicatesOnly', 'true');
      if (qfRecent) qs.set('recentlyViewed', 'true');
      if (qfFrequent) qs.set('frequentlyUsed', 'true');
      
      // Use relative URL to go through Next.js proxy, avoiding cross-origin issues
      const fetchUrl = `/api/skus/export/skus?${qs.toString()}`;
      
      const res = await fetch(fetchUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ifh_token')}`
        }
      });
      if (!res.ok) throw new Error('Failed to export');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'IFH_One_Items_Export.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      setError('Export failed: ' + err.message);
    }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4 }}>{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="page-content">
      <PageHeader
        title="Items Master Data"
        description="Complete item catalog with full CRUD management and analytical insights."
      />

      {error && <div style={{ margin: '16px 0', padding: '12px 16px', background: '#fee2e2', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>{error}</div>}

      {/* Search & Actions */}
      <div className="ifh-card" style={{ padding: '12px 14px', marginBottom: 16, marginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '300px' }}>
            <AdaptiveSearch 
              value={search}
              onChange={setSearch}
              onSelect={(opt) => {
                setSearch(opt.value);
                setPage(1);
              }}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button 
              className="ifh-btn-ghost" style={{ background: showFilters ? 'var(--surface2)' : 'transparent', height: 36, padding: '0 14px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500  }} 
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter style={{ width: 15, height: 15 }} />
              <span>Filters</span>
              { (filterUom || filterCategory || filterStatus) && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)' }} /> }
            </button>
            <button 
              className="ifh-btn-secondary" 
              onClick={() => setShowImportModal(true)}
              style={{ height: 36, padding: '0 16px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.15s ease' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--card)')}
            >
              <Upload style={{ width: 15, height: 15, color: 'var(--text-secondary)' }} />
              <span>Import</span>
            </button>
            <button 
              className="ifh-btn-secondary" 
              onClick={handleExport}
              style={{ height: 36, padding: '0 16px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.15s ease' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--card)')}
            >
              <Download style={{ width: 15, height: 15, color: 'var(--text-secondary)' }} />
              <span>Export</span>
            </button>
            <button 
              className="ifh-btn-primary" 
              onClick={() => openModal('create')}
              style={{ height: 36, padding: '0 18px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer', transition: 'all 0.15s ease' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <Plus style={{ width: 15, height: 15 }} />
              <span>Create Item</span>
            </button>
          </div>
        </div>

        {showFilters && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div>
              <label className="ifh-label">Category</label>
              <input 
                type="text" 
                placeholder="e.g. MECHANICAL" 
                value={filterCategory} 
                onChange={e => { setFilterCategory(e.target.value); setPage(1); }} 
                className="ifh-input" 
              />
            </div>
            <div>
              <label className="ifh-label">UOM</label>
              <input 
                type="text" 
                placeholder="e.g. NOS, KGS" 
                value={filterUom} 
                onChange={e => { setFilterUom(e.target.value); setPage(1); }} 
                className="ifh-input" 
              />
            </div>
            <div>
              <label className="ifh-label">Status</label>
              <select 
                value={filterStatus} 
                onChange={e => { setFilterStatus(e.target.value); setPage(1); }} 
                className="ifh-input"
              >
                <option value="">All</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
            
            <div style={{ gridColumn: '1 / -1', marginTop: 12 }}>
              <label className="ifh-label">Quick Filters</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                <button 
                  className={`ifh-btn-${qfDuplicates ? 'primary' : 'ghost'}`}
                  style={{ padding: '6px 12px', fontSize: 13, border: '1px solid var(--border)' }}
                  onClick={() => { setQfDuplicates(!qfDuplicates); setPage(1); }}
                >
                  Duplicate Items
                </button>
                <button 
                  className={`ifh-btn-${qfRecent ? 'primary' : 'ghost'}`}
                  style={{ padding: '6px 12px', fontSize: 13, border: '1px solid var(--border)' }}
                  onClick={() => { setQfRecent(!qfRecent); setPage(1); }}
                >
                  Recently Viewed
                </button>
                {qfRecent && (
                  <button 
                    className="ifh-btn-ghost"
                    style={{ padding: '6px 12px', fontSize: 13, border: '1px solid #fee2e2', color: '#dc2626', background: '#fef2f2' }}
                    onClick={async () => {
                      await apiFetch('/skus/clear-recent-views', { method: 'POST' });
                      setQfRecent(false);
                      setPage(1);
                    }}
                  >
                    Clear History
                  </button>
                )}
                <button 
                  className={`ifh-btn-${qfFrequent ? 'primary' : 'ghost'}`}
                  style={{ padding: '6px 12px', fontSize: 13, border: '1px solid var(--border)' }}
                  onClick={() => { setQfFrequent(!qfFrequent); setPage(1); }}
                >
                  Frequently Used
                </button>
                <button 
                  className={`ifh-btn-${filterUom === 'missing' ? 'primary' : 'ghost'}`}
                  style={{ padding: '6px 12px', fontSize: 13, border: '1px solid var(--border)' }}
                  onClick={() => { setFilterUom(filterUom === 'missing' ? '' : 'missing'); setPage(1); }}
                >
                  Missing UOM
                </button>
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
              <button 
                className="ifh-btn-ghost" 
                onClick={() => {
                  setFilterUom('');
                  setFilterCategory('');
                  setFilterStatus('');
                  setQfDuplicates(false);
                  setQfRecent(false);
                  setQfFrequent(false);
                  setSearch('');
                  setPage(1);
                }}
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="ifh-card" style={{ padding: 0, overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading items...</div>
        ) : (
          <>
            {isFuzzyFallback && (
              <div style={{
                padding: '12px 16px',
                fontSize: 13,
                fontWeight: 500,
                color: '#D97706',
                background: '#FEF3C7',
                border: '1px solid #FDE68A',
                borderBottom: 'none',
                borderRadius: '6px 6px 0 0',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <Sparkles size={16} />
                No exact matches found for "{debouncedSearch}". Did you mean...
              </div>
            )}
            <table className="ifh-table" >
              <thead>
                <tr>
              <th  onClick={() => handleSort('itemCode')}>Item Code <SortIcon col="itemCode" /></th>
                <th  onClick={() => handleSort('description')}>Description <SortIcon col="description" /></th>
                <th  onClick={() => handleSort('category')}>Category <SortIcon col="category" /></th>
                <th  onClick={() => handleSort('subGroup')}>Sub Group <SortIcon col="subGroup" /></th>
                <th  onClick={() => handleSort('uom')}>UOM <SortIcon col="uom" /></th>
                <th  onClick={() => handleSort('status')}>Status <SortIcon col="status" /></th>
                <th  onClick={() => handleSort('createdAt')}>Created <SortIcon col="createdAt" /></th>
                <th >Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>No items found.</td></tr>
              ) : items.map((i) => (
                <tr key={i.id} style={{ transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td >{i.itemCode}</td>
                  <td >{i.description}</td>
                  <td >{i.category || '-'}</td>
                  <td >{i.subGroup || '-'}</td>
                  <td >{i.uom}</td>
                  <td >
                    <span style={{ padding: '4px 8px', background: i.status === 'Active' ? '#dcfce7' : '#f1f5f9', color: i.status === 'Active' ? '#166534' : '#475569', borderRadius: 4, fontSize: 11, fontWeight: 500 }}>{i.status || 'Active'}</span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {i.createdAt ? new Date(i.createdAt).toLocaleDateString() : '-'}
                  </td>
                  <td >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                      <button 
                        onClick={() => openModal('insights', i)} 
                        title="Item Insights"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: '#3b82f6', display: 'flex' }}
                      >
                        <TrendingUp style={{ width: 15, height: 15 }} />
                      </button>
                      <button 
                        onClick={() => openModal('edit', i)} 
                        title="Edit Item"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-secondary)', display: 'flex' }}
                      >
                        <Edit style={{ width: 15, height: 15 }} />
                      </button>
                      <button 
                        onClick={() => openModal('delete', i)} 
                        title="Delete Item"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: '#dc2626', display: 'flex' }}
                      >
                        <Trash2 style={{ width: 15, height: 15 }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </>
        )}
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Rows per page:</span>
          <select
            value={limit}
            onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
            className="ifh-input" style={{ width: 70  }}
          >
            {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Showing {items.length > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, total)} of {total}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="ifh-btn-ghost" style={{ padding: '0 8px', opacity: page === 1 ? 0.5 : 1  }}
            >
              <ChevronLeft style={{ width: 16, height: 16 }} />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="ifh-btn-ghost" style={{ padding: '0 8px', opacity: page >= totalPages ? 0.5 : 1  }}
            >
              <ChevronRight style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="ifh-card" style={{ width: '100%', maxWidth: showModal === 'insights' ? 600 : 450, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                {showModal === 'create' ? 'Create Item' : 
                 showModal === 'edit' ? `Edit Item: ${currentItem?.itemCode}` : 
                 showModal === 'insights' ? `Item Insights: ${currentItem?.itemCode}` :
                 'Delete Item'}
              </h3>
              <button onClick={closeModal} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <div style={{ padding: 20, maxHeight: '80vh', overflowY: 'auto' }}>
              {modalError && (
                <div style={{ padding: 10, background: '#fee2e2', color: '#dc2626', fontSize: 13, borderRadius: 6, marginBottom: 16 }}>
                  {modalError}
                </div>
              )}

              {showModal === 'create' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label className="ifh-label">Item Code *</label>
                    <input 
                      value={formData.itemCode} 
                      onChange={e => setFormData({ ...formData, itemCode: e.target.value })} 
                      className="ifh-input" 
                      placeholder="e.g. MECH-001"
                    />
                  </div>
                  <div>
                    <label className="ifh-label">Description *</label>
                    <textarea 
                      value={formData.description} 
                      onChange={e => setFormData({ ...formData, description: e.target.value })} 
                      className="ifh-input" style={{ height: 60, padding: '8px 10px', resize: 'vertical'  }} 
                      placeholder="Enter detailed description..."
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label className="ifh-label">Category</label>
                      <input 
                        value={formData.category} 
                        onChange={e => setFormData({ ...formData, category: e.target.value })} 
                        className="ifh-input" 
                        placeholder="e.g. MECHANICAL"
                      />
                    </div>
                    <div>
                      <label className="ifh-label">Sub Group</label>
                      <input 
                        value={formData.subGroup} 
                        onChange={e => setFormData({ ...formData, subGroup: e.target.value })} 
                        className="ifh-input" 
                        placeholder="e.g. Equipment"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="ifh-label">Unit of Measure (UOM) *</label>
                    <input 
                      value={formData.uom} 
                      onChange={e => setFormData({ ...formData, uom: e.target.value })} 
                      className="ifh-input" 
                      placeholder="e.g. KGS, NOS"
                    />
                  </div>
                </div>
              )}

              {showModal === 'delete' && currentItem && (
                <div>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    Are you sure you want to delete item <strong style={{ color: 'var(--text-primary)' }}>{currentItem.itemCode}</strong>?
                    <br/><br/>
                    This action will remove the item from the master database but will <strong style={{ color: '#dc2626' }}>not</strong> affect existing procurement history. This action cannot be undone.
                  </p>
                </div>
              )}

              {showModal === 'insights' && currentItem && (
                <div>
                  {insightsLoading ? (
                    <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Crunching data...</div>
                  ) : insights ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div style={{ background: 'var(--surface2)', padding: 16, borderRadius: 8 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Times Requested</div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary)', marginTop: 4 }}>{insights.totalTimesRequested}</div>
                      </div>
                      <div style={{ background: 'var(--surface2)', padding: 16, borderRadius: 8 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Quantity Requested</div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b', marginTop: 4 }}>
                          {insights.totalQuantityRequested.toLocaleString()} <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>{currentItem.uom}</span>
                        </div>
                      </div>
                      <div style={{ background: 'var(--surface2)', padding: 16, borderRadius: 8 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Unique Indents</div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>{insights.totalIndents}</div>
                      </div>
                      <div style={{ background: 'var(--surface2)', padding: 16, borderRadius: 8 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total POs Issued</div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981', marginTop: 4 }}>{insights.totalPurchaseOrders}</div>
                      </div>
                      
                      <div style={{ gridColumn: '1 / -1', background: 'var(--surface2)', padding: 16, borderRadius: 8, marginTop: 8 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>Top Vendor Suppliers</div>
                        {insights.mostFrequentVendors?.length > 0 ? (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {insights.mostFrequentVendors.map((v: string, i: number) => (
                              <span key={i} style={{ padding: '4px 10px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
                                {v}
                              </span>
                            ))}
                          </div>
                        ) : <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No vendor data mapped yet</div>}
                      </div>

                      <div style={{ gridColumn: '1 / -1', background: 'var(--surface2)', padding: 16, borderRadius: 8, marginTop: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Last Procurement Date</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>
                              {insights.lastProcurementDate ? new Date(insights.lastProcurementDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never procured'}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Active Stages</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)', marginTop: 4 }}>
                              {insights.currentActiveStages?.length > 0 ? insights.currentActiveStages.map((s: number) => `S${s}`).join(', ') : 'None'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No insights available</div>
                  )}
                </div>
              )}
            </div>

            {duplicateWarning.length > 0 && (
              <div style={{ padding: '16px 20px', background: '#FEF2F2', borderTop: '1px solid #FEE2E2' }}>
                <h4 style={{ margin: '0 0 8px', color: '#DC2626', fontSize: 14 }}>Possible Duplicates Detected</h4>
                <p style={{ margin: '0 0 12px', fontSize: 13, color: '#991B1B' }}>We found {duplicateWarning.length} existing item(s) that might be duplicates. Do you still want to proceed?</p>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#7F1D1D' }}>
                  {duplicateWarning.map((d: any, i: number) => (
                    <li key={i} style={{ marginBottom: 4 }}>
                      <strong>{d.itemCode}</strong> - {d.description} ({d.uom})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10, background: 'var(--surface2)' }}>
              <button className="ifh-btn-ghost" onClick={closeModal} disabled={modalLoading}>
                {showModal === 'insights' ? 'Close' : 'Cancel'}
              </button>
              
              {(showModal === 'create' || showModal === 'edit') && (
                <button 
                  className="ifh-btn-primary" style={{ opacity: modalLoading ? 0.7 : 1, background: duplicateWarning.length > 0 ? '#DC2626' : undefined  }} 
                  onClick={() => {
                    if (duplicateWarning.length > 0) {
                      setForceSave(true);
                      handleSave(true);
                    } else {
                      handleSave();
                    }
                  }} 
                  disabled={modalLoading || !formData.itemCode || !formData.description}
                >
                  {modalLoading ? 'Saving...' : (duplicateWarning.length > 0 ? 'Continue Anyway' : 'Save Item')}
                </button>
              )}

              {showModal === 'delete' && (
                <button 
                  className="ifh-btn-primary" style={{ background: '#dc2626', opacity: modalLoading ? 0.7 : 1  }} 
                  onClick={handleDelete} 
                  disabled={modalLoading}
                >
                  {modalLoading ? 'Deleting...' : 'Delete Item'}
                </button>
              )}

              {showModal === 'insights' && (
                <Link 
                  href={`/procurement?search=${encodeURIComponent(currentItem?.itemCode || '')}`} 
                  className="ifh-btn-primary" style={{ textDecoration: 'none' }} 
                  onClick={closeModal}
                >
                  View Procurement History
                  <ExternalLink style={{ width: 14, height: 14 }} />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Import Modal */}
      {showImportModal && (
        <ImportItemsModal 
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
            loadItems();
          }}
        />
      )}

    </div>
  );
}
