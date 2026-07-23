'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  ExternalLink,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  X,
  Upload,
  Download,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { ImportVendorsModal } from '@/components/ui/import-vendors-modal';
import { apiFetch, buildApiUrl } from '@/lib/api/fetch';
import { hasPermission, isSuperAdmin } from '@/lib/auth';
import Link from 'next/link';

interface Vendor {
  id: string; // UUID from backend, not number
  vendorCode: string;
  vendorName: string;
  email?: string;
  contact?: string;
  address?: string;
  status: string;
  createdAt?: string;
}

const PAGE_SIZES = [25, 50, 100];

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search & Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination & Sorting
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [sortBy, setSortBy] = useState('B');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // CRUD Modals
  const [showModal, setShowModal] = useState<
    'create' | 'edit' | 'delete' | 'insights' | null
  >(null);
  const [currentVendor, setCurrentVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState({
    vendorCode: '',
    vendorName: '',
    email: '',
    contact: '',
    address: '',
  });
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Vendor Insights
  const [insights, setInsights] = useState<any>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Bulk Import
  const [showImportModal, setShowImportModal] = useState(false);

  const canImportVendors =
    isSuperAdmin() ||
    hasPermission('vendor.import') ||
    hasPermission('vendor.create');
  const canExportVendors =
    isSuperAdmin() ||
    hasPermission('vendor.export') ||
    hasPermission('vendor.view');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, statusFilter, dateFrom, dateTo]);

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const loadVendors = useCallback(async () => {
    try {
      setLoading(true);
      const skip = (page - 1) * limit;
      const qs = new URLSearchParams();
      qs.set('skip', String(skip));
      qs.set('take', String(limit));
      if (debouncedSearch) qs.set('search', debouncedSearch);
      if (statusFilter !== 'all') qs.set('status', statusFilter);
      if (dateFrom) qs.set('createdFrom', dateFrom);
      if (dateTo) qs.set('createdTo', dateTo);
      qs.set('sortBy', sortBy);
      qs.set('sortOrder', sortOrder);

      const result = await apiFetch(`/vendors?${qs.toString()}`);
      const data = result?.data ?? (Array.isArray(result) ? result : []);
      const meta = result?.meta ?? {};

      setVendors(data);
      setTotal(meta.total ?? data.length);
      setTotalPages(meta.totalPages ?? 1);
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  }, [
    page,
    limit,
    debouncedSearch,
    statusFilter,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  const handleExport = async () => {
    try {
      const url = buildApiUrl('/vendors/export');
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('ifh_token')}`,
        },
      });
      if (!res.ok) throw new Error('Failed to export vendors');
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `IFH_One_Vendors_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadInsights = async (vendorId: string) => {
    setInsightsLoading(true);
    setInsights(null);
    try {
      const res = await apiFetch(
        `/vendors/${encodeURIComponent(vendorId)}/insights`
      );
      if (res && res.insights) {
        setInsights(res.insights);
      }
    } catch (e: any) {
      setModalError(e?.message || 'Failed to load insights');
    } finally {
      setInsightsLoading(false);
    }
  };

  const openModal = (
    type: 'create' | 'edit' | 'delete' | 'insights',
    vendor?: Vendor
  ) => {
    setShowModal(type);
    setCurrentVendor(vendor || null);
    if (vendor) {
      setFormData({
        vendorCode: vendor.vendorCode,
        vendorName: vendor.vendorName,
        email: vendor.email || '',
        contact: vendor.contact || '',
        address: vendor.address || '',
      });
      if (type === 'insights') {
        loadInsights(vendor.vendorCode);
      }
    } else {
      setFormData({
        vendorCode: '',
        vendorName: '',
        email: '',
        contact: '',
        address: '',
      });
    }
    setModalError('');
  };

  const closeModal = () => {
    setShowModal(null);
    setCurrentVendor(null);
    setFormData({
      vendorCode: '',
      vendorName: '',
      email: '',
      contact: '',
      address: '',
    });
    setModalError('');
    setInsights(null);
  };

  const handleSave = async () => {
    setModalError('');

    // Client-side validation
    if (showModal === 'create' && !formData.vendorCode) {
      setModalError('Vendor ID is required');
      return;
    }
    if (!formData.vendorName || formData.vendorName.length < 2) {
      setModalError('Vendor Name is required (minimum 2 characters)');
      return;
    }
    if (formData.email && !formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setModalError('Please enter a valid email address');
      return;
    }
    if (formData.contact && formData.contact.length > 20) {
      setModalError('Contact cannot exceed 20 characters');
      return;
    }
    if (formData.address && formData.address.length > 255) {
      setModalError('Address cannot exceed 255 characters');
      return;
    }

    setModalLoading(true);
    try {
      if (showModal === 'create') {
        const res = await apiFetch('/vendors', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        if (res.error) throw new Error(res.error);
      } else if (showModal === 'edit' && currentVendor) {
        const res = await apiFetch(
          `/vendors/${encodeURIComponent(currentVendor.vendorCode)}`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              vendorName: formData.vendorName,
              email: formData.email,
              contact: formData.contact,
              address: formData.address,
            }),
          }
        );
        if (res.error) throw new Error(res.error);
      }
      closeModal();
      loadVendors();
    } catch (e: any) {
      setModalError(e?.message || 'Operation failed');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentVendor) return;
    setModalError('');
    setModalLoading(true);
    try {
      const res = await apiFetch(
        `/vendors/${encodeURIComponent(currentVendor.vendorCode)}`,
        { method: 'DELETE' }
      );
      if (res.error) throw new Error(res.error);
      closeModal();
      loadVendors();
    } catch (e: any) {
      setModalError(e?.message || 'Delete failed');
    } finally {
      setModalLoading(false);
    }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col)
      return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
    return (
      <span style={{ marginLeft: 4 }}>{sortOrder === 'asc' ? '↑' : '↓'}</span>
    );
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  return (
    <div className="page-content">
      <PageHeader
        title="Vendors Dashboard"
        description="Complete vendor master registry with advanced CRUD and insights."
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            {canExportVendors && (
              <button
                className="ifh-btn-ghost"
                onClick={handleExport}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 38,
                  padding: '0 16px',
                  fontSize: 13,
                }}
              >
                <Download style={{ width: 14, height: 14 }} />
                Export
              </button>
            )}
            {canImportVendors && (
              <button
                className="ifh-btn-ghost"
                onClick={() => setShowImportModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 38,
                  padding: '0 16px',
                  fontSize: 13,
                }}
              >
                <Upload style={{ width: 14, height: 14 }} />
                Bulk Import
              </button>
            )}
          </div>
        }
      />

      {error && (
        <div
          style={{
            margin: '16px 0',
            padding: '12px 16px',
            background: '#fee2e2',
            borderRadius: 8,
            color: '#dc2626',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {showImportModal && (
        <ImportVendorsModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
            loadVendors();
          }}
        />
      )}

      {/* Search & Filters */}
      <div
        className="ifh-card"
        style={{ padding: '14px 16px', marginBottom: 16, marginTop: 20 }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flex: 1,
              minWidth: 280,
            }}
          >
            <Search
              style={{
                width: 16,
                height: 16,
                color: 'var(--text-muted)',
                flexShrink: 0,
              }}
            />
            <input
              type="text"
              placeholder="Search by Vendor Name, Code, Email, or Contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ifh-input"
              style={{
                border: 'none',
                background: 'transparent',
                flex: 1,
                padding: 0,
              }}
            />
            <button
              className="ifh-btn-ghost"
              onClick={() => setShowFilters((f) => !f)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 36,
                padding: '0 14px',
                fontSize: 13,
              }}
            >
              <Filter style={{ width: 14, height: 14 }} />
              Filters
            </button>
          </div>
          <button
            className="ifh-btn-primary"
            onClick={() => openModal('create')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 36,
              padding: '0 16px',
              fontSize: 13,
            }}
          >
            <Plus style={{ width: 14, height: 14 }} />
            New Vendor
          </button>
        </div>

        {showFilters && (
          <div
            style={{
              marginTop: 14,
              paddingTop: 14,
              borderTop: '1px solid var(--border)',
              display: 'flex',
              gap: 16,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}
              >
                Status:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="ifh-input"
                style={{ width: 120 }}
              >
                <option value="all">All</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="BLACKLISTED">Blacklisted</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}
              >
                Created:
              </span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="ifh-input"
                style={{ width: 140 }}
              />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                to
              </span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="ifh-input"
                style={{ width: 140 }}
              />
            </div>
            <button
              className="ifh-btn-ghost"
              style={{ background: 'var(--surface2)' }}
              onClick={clearFilters}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="ifh-card" style={{ padding: 0, overflow: 'auto' }}>
        {loading ? (
          <div
            style={{
              padding: 40,
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 13,
            }}
          >
            Loading vendors...
          </div>
        ) : (
          <table className="ifh-table">
            <thead>
              <tr>
                <th
                  onClick={() => handleSort('A')}
                  style={{ cursor: 'pointer', width: 100 }}
                >
                  Vendor ID <SortIcon col="A" />
                </th>
                <th
                  onClick={() => handleSort('B')}
                  style={{ cursor: 'pointer' }}
                >
                  Vendor Name <SortIcon col="B" />
                </th>
                <th
                  onClick={() => handleSort('C')}
                  style={{ cursor: 'pointer' }}
                >
                  Email <SortIcon col="C" />
                </th>
                <th
                  onClick={() => handleSort('D')}
                  style={{ cursor: 'pointer' }}
                >
                  Contact <SortIcon col="D" />
                </th>
                <th
                  onClick={() => handleSort('E')}
                  style={{ cursor: 'pointer' }}
                >
                  Address <SortIcon col="E" />
                </th>
                <th>Status</th>
                <th
                  onClick={() => handleSort('createdAt')}
                  style={{ cursor: 'pointer', width: 100 }}
                >
                  Created <SortIcon col="createdAt" />
                </th>
                <th style={{ width: 110 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vendors.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: 40,
                      textAlign: 'center',
                      fontSize: 13,
                      color: 'var(--text-muted)',
                    }}
                  >
                    No vendors found.
                  </td>
                </tr>
              ) : (
                vendors.map((v) => (
                  <tr key={v.vendorCode}>
                    <td>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 600,
                          fontSize: 12,
                        }}
                      >
                        {v.vendorCode}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{v.vendorName}</td>
                    <td style={{ fontSize: 12 }}>{v.email || '—'}</td>
                    <td style={{ fontSize: 12 }}>{v.contact || '—'}</td>
                    <td style={{ fontSize: 12 }}>{v.address || '—'}</td>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 600,
                          background:
                            v.status === 'ACTIVE'
                              ? '#d1fae5'
                              : v.status === 'BLACKLISTED'
                                ? '#fee2e2'
                                : '#f3f4f6',
                          color:
                            v.status === 'ACTIVE'
                              ? '#065f46'
                              : v.status === 'BLACKLISTED'
                                ? '#991b1b'
                                : '#4b5563',
                        }}
                      >
                        {v.status || 'Active'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {v.createdAt
                        ? new Date(v.createdAt).toLocaleDateString('en-IN')
                        : '—'}
                    </td>
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          gap: 4,
                          justifyContent: 'flex-end',
                        }}
                      >
                        <button
                          onClick={() => openModal('insights', v)}
                          title="Insights"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 4,
                            color: '#3b82f6',
                            display: 'flex',
                          }}
                        >
                          <TrendingUp style={{ width: 14, height: 14 }} />
                        </button>
                        <button
                          onClick={() => openModal('edit', v)}
                          title="Edit"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 4,
                            color: 'var(--text-secondary)',
                            display: 'flex',
                          }}
                        >
                          <Edit style={{ width: 14, height: 14 }} />
                        </button>
                        <button
                          onClick={() => openModal('delete', v)}
                          title="Delete"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 4,
                            color: '#dc2626',
                            display: 'flex',
                          }}
                        >
                          <Trash2 style={{ width: 14, height: 14 }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 0',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Rows per page:
          </span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="ifh-input"
            style={{ width: 70 }}
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Showing {vendors.length > 0 ? (page - 1) * limit + 1 : 0} to{' '}
            {Math.min(page * limit, total)} of {total}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="ifh-btn-ghost"
              style={{ padding: '0 8px', opacity: page === 1 ? 0.5 : 1 }}
            >
              <ChevronLeft style={{ width: 16, height: 16 }} />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="ifh-btn-ghost"
              style={{
                padding: '0 8px',
                opacity: page >= totalPages ? 0.5 : 1,
              }}
            >
              <ChevronRight style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            className="ifh-card"
            style={{
              width: '100%',
              maxWidth: showModal === 'insights' ? 600 : 450,
              padding: 0,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  margin: 0,
                  color: 'var(--text-primary)',
                }}
              >
                {showModal === 'create'
                  ? 'Create Vendor'
                  : showModal === 'edit'
                    ? `Edit: ${currentVendor?.vendorCode}`
                    : showModal === 'insights'
                      ? `Vendor Insights: ${currentVendor?.vendorName}`
                      : 'Delete Vendor'}
              </h3>
              <button
                onClick={closeModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>
            <div style={{ padding: 20 }}>
              {modalError && (
                <div
                  style={{
                    padding: 10,
                    background: '#fee2e2',
                    color: '#dc2626',
                    fontSize: 13,
                    borderRadius: 6,
                    marginBottom: 16,
                  }}
                >
                  {modalError}
                </div>
              )}
              {(showModal === 'create' || showModal === 'edit') && (
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                >
                  <div>
                    <label className="ifh-label">
                      Vendor ID {showModal === 'create' ? '*' : ''}
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--text-muted)',
                          marginLeft: 4,
                        }}
                      >
                        (Mandatory)
                      </span>
                    </label>
                    <input
                      value={formData.vendorCode}
                      onChange={(e) =>
                        setFormData({ ...formData, vendorCode: e.target.value })
                      }
                      className="ifh-input"
                      placeholder="e.g. VEN-102"
                      disabled={showModal === 'edit'}
                      maxLength={50}
                    />
                    {showModal === 'create' && !formData.vendorCode && (
                      <div
                        style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}
                      >
                        Vendor ID is required
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="ifh-label">
                      Vendor Name *
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--text-muted)',
                          marginLeft: 4,
                        }}
                      >
                        (Mandatory)
                      </span>
                    </label>
                    <input
                      value={formData.vendorName}
                      onChange={(e) =>
                        setFormData({ ...formData, vendorName: e.target.value })
                      }
                      className="ifh-input"
                      placeholder="e.g. Acme Corp"
                      maxLength={100}
                    />
                    {!formData.vendorName && (
                      <div
                        style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}
                      >
                        Vendor Name is required (2-100 chars)
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="ifh-label">
                      Email
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--text-muted)',
                          marginLeft: 4,
                        }}
                      >
                        (Optional)
                      </span>
                    </label>
                    <input
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="ifh-input"
                      type="email"
                      placeholder="contact@example.com"
                    />
                  </div>
                  <div>
                    <label className="ifh-label">
                      Contact
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--text-muted)',
                          marginLeft: 4,
                        }}
                      >
                        (Optional, max 20 chars)
                      </span>
                    </label>
                    <input
                      value={formData.contact}
                      onChange={(e) =>
                        setFormData({ ...formData, contact: e.target.value })
                      }
                      className="ifh-input"
                      placeholder="+91 98765 43210"
                      maxLength={20}
                    />
                  </div>
                  <div>
                    <label className="ifh-label">
                      Address
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--text-muted)',
                          marginLeft: 4,
                        }}
                      >
                        (Optional)
                      </span>
                    </label>
                    <textarea
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      className="ifh-input"
                      style={{
                        height: 60,
                        padding: '8px 10px',
                        resize: 'vertical',
                      }}
                      placeholder="Full company address..."
                      maxLength={255}
                    />
                  </div>
                </div>
              )}
              {showModal === 'delete' && currentVendor && (
                <div>
                  <p
                    style={{
                      fontSize: 14,
                      color: 'var(--text-secondary)',
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    Are you sure you want to delete vendor{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {currentVendor.vendorName}
                    </strong>{' '}
                    ({currentVendor.vendorCode})?
                    <br />
                    <br />
                    This action cannot be undone.
                  </p>
                </div>
              )}
              {showModal === 'insights' && currentVendor && (
                <div>
                  {insightsLoading ? (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: 20,
                        color: 'var(--text-muted)',
                      }}
                    >
                      Calculating insights...
                    </div>
                  ) : insights ? (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 16,
                      }}
                    >
                      <div
                        style={{
                          background: 'var(--surface2)',
                          padding: 16,
                          borderRadius: 8,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            fontWeight: 600,
                          }}
                        >
                          Total Indents
                        </div>
                        <div
                          style={{
                            fontSize: 24,
                            fontWeight: 700,
                            color: 'var(--primary)',
                            marginTop: 4,
                          }}
                        >
                          {insights.totalIndents}
                        </div>
                      </div>
                      <div
                        style={{
                          background: 'var(--surface2)',
                          padding: 16,
                          borderRadius: 8,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            fontWeight: 600,
                          }}
                        >
                          Total POs
                        </div>
                        <div
                          style={{
                            fontSize: 24,
                            fontWeight: 700,
                            color: '#10b981',
                            marginTop: 4,
                          }}
                        >
                          {insights.totalPurchaseOrders}
                        </div>
                      </div>
                      <div
                        style={{
                          background: 'var(--surface2)',
                          padding: 16,
                          borderRadius: 8,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            fontWeight: 600,
                          }}
                        >
                          Total Qty Ordered
                        </div>
                        <div
                          style={{
                            fontSize: 24,
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            marginTop: 4,
                          }}
                        >
                          {insights.totalQuantityOrdered?.toLocaleString()}
                        </div>
                      </div>
                      <div
                        style={{
                          background: 'var(--surface2)',
                          padding: 16,
                          borderRadius: 8,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            fontWeight: 600,
                          }}
                        >
                          Last Order
                        </div>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            marginTop: 4,
                          }}
                        >
                          {insights.lastOrderDate
                            ? new Date(
                                insights.lastOrderDate
                              ).toLocaleDateString('en-GB')
                            : 'No orders'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: 20,
                        color: 'var(--text-muted)',
                      }}
                    >
                      No insights available
                    </div>
                  )}
                </div>
              )}
            </div>
            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                background: 'var(--surface2)',
              }}
            >
              <button
                className="ifh-btn-ghost"
                onClick={closeModal}
                disabled={modalLoading}
              >
                {showModal === 'insights' ? 'Close' : 'Cancel'}
              </button>
              {(showModal === 'create' || showModal === 'edit') && (
                <button
                  className="ifh-btn-primary"
                  style={{ opacity: modalLoading ? 0.7 : 1 }}
                  onClick={handleSave}
                  disabled={modalLoading}
                >
                  {modalLoading ? 'Saving...' : 'Save'}
                </button>
              )}
              {showModal === 'delete' && (
                <button
                  className="ifh-btn-primary"
                  style={{
                    background: '#dc2626',
                    opacity: modalLoading ? 0.7 : 1,
                  }}
                  onClick={handleDelete}
                  disabled={modalLoading}
                >
                  {modalLoading ? 'Deleting...' : 'Delete'}
                </button>
              )}
              {showModal === 'insights' && (
                <Link
                  href={`/procurement?search=${encodeURIComponent(currentVendor?.vendorCode || '')}`}
                  className="ifh-btn-primary"
                  style={{ textDecoration: 'none' }}
                  onClick={closeModal}
                >
                  View History{' '}
                  <ExternalLink style={{ width: 14, height: 14 }} />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
