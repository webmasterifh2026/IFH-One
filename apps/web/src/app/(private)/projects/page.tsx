'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  ExternalLink,
  ArrowRight,
  X,
  Plus,
  Edit,
  Trash2,
  Upload,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { apiFetch } from '@/lib/api/fetch';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/status-badge';
import { ImportProjectsModal } from '@/components/ui/import-projects-modal';

interface ProjectRow {
  id: number;
  projectId: string;
  projectCode: string;
  projectName: string;
  totalIndents: number;
  createdAt?: string;
  updatedAt?: string;
}

const PAGE_SIZES = [25, 50, 100];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
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
  const [sortBy, setSortBy] = useState('project_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // View Indents Modal
  const [viewProjectId, setViewProjectId] = useState<string | null>(null);
  const [indents, setIndents] = useState<any[]>([]);
  const [loadingIndents, setLoadingIndents] = useState(false);

  // CRUD Modals
  const [showModal, setShowModal] = useState<
    'create' | 'edit' | 'delete' | null
  >(null);
  const [showImport, setShowImport] = useState(false);
  const [currentProject, setCurrentProject] = useState<ProjectRow | null>(null);
  const [formData, setFormData] = useState({ projectId: '', projectName: '' });
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search
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

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const qs = new URLSearchParams();
      qs.set('page', String(page));
      qs.set('limit', String(limit));
      if (debouncedSearch) qs.set('search', debouncedSearch);
      if (statusFilter !== 'all') qs.set('status', statusFilter);
      if (dateFrom) qs.set('createdFrom', dateFrom);
      if (dateTo) qs.set('createdTo', dateTo);
      qs.set('sortBy', sortBy);
      qs.set('sortOrder', sortOrder);

      const result = await apiFetch(`/projects?${qs.toString()}`);
      const data = result?.data ?? (Array.isArray(result) ? result : []);
      const meta = result?.meta ?? {};

      setProjects(data);
      setTotal(meta.total ?? data.length);
      setTotalPages(meta.totalPages ?? 1);
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Failed to load projects');
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
    loadProjects();
  }, [loadProjects]);

  const loadIndents = async (projectId: string) => {
    setViewProjectId(projectId);
    setLoadingIndents(true);
    try {
      const result = await apiFetch(
        `/procurement?projectId=${encodeURIComponent(projectId)}&limit=100`
      );
      const data = result?.data ?? (Array.isArray(result) ? result : []);
      setIndents(data);
    } catch (e: any) {
      console.error('Failed to load indents', e);
    } finally {
      setLoadingIndents(false);
    }
  };

  // ─── CRUD Handlers ────────────────────────────────────────────────────────
  const openModal = (
    type: 'create' | 'edit' | 'delete',
    project?: ProjectRow
  ) => {
    setShowModal(type);
    setCurrentProject(project || null);
    setFormData(
      project
        ? { projectId: project.projectId, projectName: project.projectName }
        : { projectId: '', projectName: '' }
    );
    setModalError('');
  };

  const closeModal = () => {
    setShowModal(null);
    setCurrentProject(null);
    setFormData({ projectId: '', projectName: '' });
    setModalError('');
  };

  const handleSave = async () => {
    setModalError('');
    setModalLoading(true);
    try {
      if (showModal === 'create') {
        const res = await apiFetch('/projects', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        if (res.error) throw new Error(res.error);
      } else if (showModal === 'edit' && currentProject) {
        const res = await apiFetch(
          `/projects/${encodeURIComponent(currentProject.projectId)}`,
          {
            method: 'PATCH',
            body: JSON.stringify({ projectName: formData.projectName }),
          }
        );
        if (res.error) throw new Error(res.error);
      }
      closeModal();
      loadProjects();
    } catch (e: any) {
      setModalError(e?.message || 'Operation failed');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentProject) return;
    setModalError('');
    setModalLoading(true);
    try {
      const res = await apiFetch(
        `/projects/${encodeURIComponent(currentProject.projectId)}`,
        {
          method: 'DELETE',
        }
      );
      if (res.error) throw new Error(res.error);
      closeModal();
      loadProjects();
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
        title="Projects"
        description="Project master data from projects_db with indent tracking."
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
              placeholder="Search by Project ID or Project Name..."
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
          </div>

          <div
            style={{
              display: 'flex',
              gap: 10,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
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
            <button
              onClick={() => setShowImport(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                height: 36,
                padding: '0 18px',
                borderRadius: 8,
                border: '1.5px solid var(--primary)',
                background: 'transparent',
                color: 'var(--primary)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--primary)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--primary)';
              }}
            >
              <Upload style={{ width: 15, height: 15 }} />
              Import Projects
            </button>
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
              New Project
            </button>
          </div>
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
                Created From:
              </span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="ifh-input"
                style={{ width: 150 }}
              />
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
                To:
              </span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="ifh-input"
                style={{ width: 150 }}
              />
            </div>
            <button
              className="ifh-btn-ghost"
              style={{ background: 'var(--surface2)', marginLeft: 'auto' }}
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
            Loading projects...
          </div>
        ) : (
          <table className="ifh-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th
                  onClick={() => handleSort('project_id')}
                  style={{ cursor: 'pointer' }}
                >
                  Project ID <SortIcon col="project_id" />
                </th>
                <th
                  onClick={() => handleSort('project_name')}
                  style={{ cursor: 'pointer' }}
                >
                  Project Name <SortIcon col="project_name" />
                </th>
                <th>Indents</th>
                <th
                  onClick={() => handleSort('createdAt')}
                  style={{ cursor: 'pointer', width: 120 }}
                >
                  Created <SortIcon col="createdAt" />
                </th>
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: 40,
                      textAlign: 'center',
                      fontSize: 13,
                      color: 'var(--text-muted)',
                    }}
                  >
                    No projects found.
                  </td>
                </tr>
              ) : (
                projects.map((p, idx) => (
                  <tr key={`${p.projectId}-${idx}`}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {(page - 1) * limit + idx + 1}
                    </td>
                    <td>
                      <span
                        style={{ fontFamily: 'monospace', fontWeight: 600 }}
                      >
                        {p.projectId || p.projectCode || '—'}
                      </span>
                    </td>
                    <td>{p.projectName || '—'}</td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          padding: '2px 10px',
                          background: 'var(--surface2)',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                        }}
                      >
                        {p.totalIndents ?? 0}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {p.createdAt
                        ? new Date(p.createdAt).toLocaleDateString('en-IN')
                        : '—'}
                    </td>
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <button
                          onClick={() => loadIndents(p.projectId)}
                          className="ifh-btn-ghost"
                          style={{
                            padding: '0 8px',
                            height: 26,
                            background: 'var(--primary-light)',
                            color: 'var(--primary)',
                            borderColor: 'transparent',
                          }}
                          title="View Indents"
                        >
                          <ExternalLink style={{ width: 14, height: 14 }} />
                        </button>
                        <button
                          onClick={() => openModal('edit', p)}
                          className="ifh-btn-ghost"
                          style={{ padding: '0 8px', height: 26 }}
                          title="Edit"
                        >
                          <Edit
                            style={{
                              width: 14,
                              height: 14,
                              color: 'var(--text-secondary)',
                            }}
                          />
                        </button>
                        <button
                          onClick={() => openModal('delete', p)}
                          className="ifh-btn-ghost"
                          style={{
                            padding: '0 8px',
                            height: 26,
                            color: '#dc2626',
                          }}
                          title="Delete"
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
          marginTop: 12,
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            color: 'var(--text-secondary)',
          }}
        >
          <span>Rows per page:</span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(parseInt(e.target.value));
              setPage(1);
            }}
            className="ifh-input"
            style={{ width: 'auto', padding: '0 8px', height: 28 }}
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <span style={{ marginLeft: 8 }}>
            {total > 0
              ? `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}`
              : '0 results'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{
              border: '1px solid var(--border)',
              background: 'var(--card)',
              borderRadius: 6,
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
              opacity: page <= 1 ? 0.4 : 1,
            }}
          >
            <ChevronLeft style={{ width: 14, height: 14 }} />
          </button>
          <span
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              padding: '0 8px',
            }}
          >
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={{
              border: '1px solid var(--border)',
              background: 'var(--card)',
              borderRadius: 6,
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              opacity: page >= totalPages ? 0.4 : 1,
            }}
          >
            <ChevronRight style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>

      {/* View Indents Modal */}
      {viewProjectId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(2px)',
            }}
            onClick={() => setViewProjectId(null)}
          />
          <div
            className="ifh-card"
            style={{
              position: 'relative',
              width: '90%',
              maxWidth: 900,
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--surface2)',
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    margin: 0,
                    color: 'var(--text-primary)',
                  }}
                >
                  Associated Indents
                </h2>
                <p
                  style={{
                    margin: '4px 0 0 0',
                    fontSize: 12,
                    color: 'var(--text-muted)',
                  }}
                >
                  Project:{' '}
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {viewProjectId}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setViewProjectId(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>
            <div style={{ overflow: 'auto', flex: 1, padding: '20px' }}>
              {loadingIndents ? (
                <div
                  style={{
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    padding: 40,
                    fontSize: 13,
                  }}
                >
                  Loading indents...
                </div>
              ) : indents.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    padding: 40,
                    fontSize: 13,
                  }}
                >
                  No indents found for this project.
                </div>
              ) : (
                <table className="ifh-table">
                  <thead>
                    <tr>
                      <th>Indent No</th>
                      <th>Status</th>
                      <th>Stage</th>
                      <th>Created</th>
                      <th>Requestor</th>
                      <th>Priority</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {indents.map((indent) => (
                      <tr key={indent.id}>
                        <td>{indent.referenceNo}</td>
                        <td>
                          <StatusBadge status={indent.status} />
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: 11,
                              background: 'var(--surface2)',
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontWeight: 500,
                            }}
                          >
                            S{indent.currentStage}
                          </span>
                        </td>
                        <td>
                          {new Date(indent.createdAt).toLocaleDateString()}
                        </td>
                        <td>{indent.requestedBy?.fullName || '—'}</td>
                        <td>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background:
                                indent.priority === 'HIGH' ||
                                indent.priority === 'URGENT'
                                  ? '#fee2e2'
                                  : 'var(--surface2)',
                              color:
                                indent.priority === 'HIGH' ||
                                indent.priority === 'URGENT'
                                  ? '#dc2626'
                                  : 'var(--text-muted)',
                            }}
                          >
                            {indent.priority}
                          </span>
                        </td>
                        <td>
                          <Link
                            href={`/procurement/${indent.id}`}
                            className="ifh-btn-ghost"
                            style={{
                              display: 'inline-flex',
                              padding: '0 10px',
                              height: 26,
                              background: 'var(--primary)',
                              color: 'white',
                              borderColor: 'transparent',
                              textDecoration: 'none',
                            }}
                          >
                            View{' '}
                            <ArrowRight style={{ width: 12, height: 12 }} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CRUD Modals */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 110,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(2px)',
            }}
            onClick={!modalLoading ? closeModal : undefined}
          />
          <div
            className="ifh-card"
            style={{
              position: 'relative',
              width: 400,
              padding: 0,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--surface2)',
              }}
            >
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  margin: 0,
                  color: 'var(--text-primary)',
                }}
              >
                {showModal === 'create'
                  ? 'Create Project'
                  : showModal === 'edit'
                    ? 'Edit Project'
                    : 'Delete Project'}
              </h2>
            </div>
            <div style={{ padding: 20 }}>
              {modalError && (
                <div
                  style={{
                    marginBottom: 16,
                    padding: '10px 12px',
                    background: '#fee2e2',
                    borderRadius: 6,
                    color: '#dc2626',
                    fontSize: 12,
                  }}
                >
                  {modalError}
                </div>
              )}
              {showModal === 'delete' ? (
                <div>
                  <p
                    style={{
                      fontSize: 13,
                      margin: '0 0 16px 0',
                      color: 'var(--text-primary)',
                    }}
                  >
                    Are you sure you want to delete project{' '}
                    <strong style={{ fontFamily: 'monospace' }}>
                      {currentProject?.projectId}
                    </strong>
                    ?
                  </p>
                  <p
                    style={{
                      fontSize: 13,
                      margin: '0 0 16px 0',
                      color: '#dc2626',
                      fontWeight: 500,
                    }}
                  >
                    This action cannot be undone.
                  </p>
                </div>
              ) : (
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                >
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        marginBottom: 6,
                      }}
                    >
                      Project ID
                    </label>
                    <input
                      className="ifh-input"
                      value={formData.projectId}
                      onChange={(e) =>
                        setFormData({ ...formData, projectId: e.target.value })
                      }
                      placeholder="e.g. PRJ-001"
                      disabled={showModal === 'edit'}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        marginBottom: 6,
                      }}
                    >
                      Project Name
                    </label>
                    <input
                      className="ifh-input"
                      value={formData.projectName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          projectName: e.target.value,
                        })
                      }
                      placeholder="e.g. New Factory Setup"
                      autoFocus
                    />
                  </div>
                </div>
              )}
            </div>
            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid var(--border)',
                background: 'var(--surface2)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
              }}
            >
              <button
                onClick={closeModal}
                disabled={modalLoading}
                className="ifh-btn-ghost"
              >
                Cancel
              </button>
              {showModal === 'delete' ? (
                <button
                  onClick={handleDelete}
                  disabled={modalLoading}
                  className="ifh-btn-ghost"
                  style={{
                    background: '#dc2626',
                    color: 'white',
                    borderColor: 'transparent',
                  }}
                >
                  {modalLoading ? 'Deleting...' : 'Delete'}
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={modalLoading}
                  className="ifh-btn-ghost"
                  style={{
                    background: 'var(--primary)',
                    color: 'white',
                    borderColor: 'transparent',
                  }}
                >
                  {modalLoading ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showImport && (
        <ImportProjectsModal
          onClose={() => setShowImport(false)}
          onSuccess={() => {
            setShowImport(false);
            loadProjects();
          }}
        />
      )}
    </div>
  );
}
