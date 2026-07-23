'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  Search,
  Pencil,
  X,
  Check,
  RefreshCw,
  Shield,
  Trash2,
  RotateCcw,
  Unlock,
  Filter,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { apiFetch } from '@/lib/api/fetch';
import { usePermission } from '@/hooks/usePermission';

interface Role {
  id: string;
  name: string;
  status: string;
}
interface User {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  designation?: string;
  departmentId?: string;
  phone?: string;
  status: string;
  lastLogin?: string;
  createdAt: string;
  userRoles?: { role: Role }[];
}

const DEPARTMENTS = [
  'Purchase',
  'Store',
  'Finance',
  'Projects',
  'Engineering',
  'Administration',
  'QC',
  'Accounts',
];
const PAGE_SIZE = 15;

function blank() {
  return {
    fullName: '',
    email: '',
    employeeId: '',
    designation: '',
    departmentId: '',
    phone: '',
    roleId: '',
    password: '',
  };
}

export default function UsersPage() {
  const { isSuperAdmin, isAdmin } = usePermission();
  const canManage = isSuperAdmin || isAdmin;

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<
    'create' | 'edit' | 'password' | 'role' | null
  >(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [usersData, rolesData] = await Promise.all([
        apiFetch('/users'),
        apiFetch('/roles'),
      ]);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setRoles(
        (rolesData.data || rolesData).filter((r: Role) => r.status === 'ACTIVE')
      );
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      const matchSearch =
        !q ||
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.employeeId && u.employeeId.toLowerCase().includes(q)) ||
        (u.designation && u.designation.toLowerCase().includes(q));
      const matchStatus = statusFilter === 'all' || u.status === statusFilter;
      const matchDept = deptFilter === 'all' || u.departmentId === deptFilter;
      const matchRole =
        roleFilter === 'all' || u.userRoles?.[0]?.role?.id === roleFilter;
      return matchSearch && matchStatus && matchDept && matchRole;
    });
  }, [users, search, statusFilter, deptFilter, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openCreate() {
    setForm(blank());
    setSelectedUser(null);
    setModal('create');
  }
  function openEdit(u: User) {
    setSelectedUser(u);
    setForm({
      fullName: u.fullName,
      email: u.email,
      employeeId: u.employeeId || '',
      designation: u.designation || '',
      departmentId: u.departmentId || '',
      phone: u.phone || '',
      roleId: u.userRoles?.[0]?.role?.id || '',
      password: '',
    });
    setModal('edit');
  }

  async function saveCreate() {
    if (!form.fullName.trim() || !form.email.trim()) return;
    setSaving(true);
    try {
      const created = await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          password: form.password || 'IFH@2026',
        }),
      });
      if (form.roleId) {
        await apiFetch(`/roles/${form.roleId}/users`, {
          method: 'POST',
          body: JSON.stringify({ userId: created.id }),
        });
      }
      setModal(null);
      await load();
    } catch (e: any) {
      alert(e?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const { roleId, password, ...rest } = form;
      const updateData: any = { ...rest };
      if (password) updateData.password = password;
      await apiFetch(`/users/${selectedUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });

      // Role change: remove old, add new
      if (roleId && roleId !== selectedUser.userRoles?.[0]?.role?.id) {
        const oldRoleId = selectedUser.userRoles?.[0]?.role?.id;
        if (oldRoleId)
          await apiFetch(`/roles/${oldRoleId}/users/${selectedUser.id}`, {
            method: 'DELETE',
          }).catch(() => {});
        await apiFetch(`/roles/${roleId}/users`, {
          method: 'POST',
          body: JSON.stringify({ userId: selectedUser.id }),
        });
      }
      setModal(null);
      await load();
    } catch (e: any) {
      alert(e?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(u: User) {
    if (!canManage) return;
    const newStatus = u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await apiFetch(`/users/${u.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      await load();
    } catch (e: any) {
      alert(e?.message || 'Failed');
    }
  }

  async function softDelete(u: User) {
    if (!canManage || !confirm(`Delete user ${u.fullName}?`)) return;
    try {
      await apiFetch(`/users/${u.id}`, { method: 'DELETE' });
      await load();
    } catch (e: any) {
      alert(e?.message || 'Failed');
    }
  }

  async function restore(u: User) {
    if (!canManage) return;
    try {
      await apiFetch(`/users/${u.id}/restore`, { method: 'POST' });
      await load();
    } catch (e: any) {
      alert(e?.message || 'Failed');
    }
  }

  async function unlock(u: User) {
    if (!canManage) return;
    try {
      await apiFetch(`/users/${u.id}/unlock`, { method: 'POST' });
      alert('User unlocked successfully');
      await load();
    } catch (e: any) {
      alert(e?.message || 'Failed');
    }
  }

  async function resetPassword() {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await apiFetch(`/users/${selectedUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ password: form.password || 'IFH@2026' }),
      });
      setModal(null);
    } catch (e: any) {
      alert(e?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  }

  function fmtDate(d?: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <div className="page-content">
      <PageHeader
        title="User Management"
        description="Manage users, roles, access, and status."
        actions={
          canManage ? (
            <button
              onClick={openCreate}
              className="ifh-btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 36,
                padding: '0 16px',
                fontSize: 13,
              }}
            >
              <Plus style={{ width: 14, height: 14 }} /> Add User
            </button>
          ) : undefined
        }
      />

      {error && (
        <div
          style={{
            margin: '12px 0',
            padding: '10px 14px',
            background: '#fee2e2',
            borderRadius: 8,
            color: '#dc2626',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <div className="ifh-card" style={{ padding: '16px', marginBottom: 20 }}>
        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 12px',
              flex: 1,
              minWidth: 200,
              border: '1px solid var(--border)',
              borderRadius: 8,
            }}
          >
            <Search
              style={{
                width: 13,
                height: 13,
                color: 'var(--text-muted)',
                flexShrink: 0,
              }}
            />
            <input
              type="text"
              placeholder="Search by name, email, ID, or designation..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: 13,
                outline: 'none',
                flex: 1,
                color: 'var(--text-primary)',
              }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              height: 38,
              padding: '0 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--card)',
              fontSize: 13,
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          >
            <option value="all">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="LOCKED">Locked</option>
            <option value="DELETED">Deleted</option>
          </select>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            style={{
              height: 38,
              padding: '0 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--card)',
              fontSize: 13,
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          >
            <option value="all">All Departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              height: 38,
              padding: '0 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--card)',
              fontSize: 13,
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          >
            <option value="all">All Roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

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
            Loading users...
          </div>
        ) : (
          <table className="ifh-table">
            <thead>
              <tr>
                {[
                  'Name',
                  'Email',
                  'Emp ID',
                  'Department',
                  'Role',
                  'Status',
                  'Last Login',
                  'Actions',
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
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
                    No users found.
                  </td>
                </tr>
              ) : (
                pageData.map((u) => {
                  const role = u.userRoles?.[0]?.role;
                  const isDeleted = u.status === 'DELETED';
                  return (
                    <tr key={u.id} style={{ opacity: isDeleted ? 0.6 : 1 }}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{u.fullName}</div>
                        {u.designation && (
                          <div
                            style={{
                              fontSize: 11,
                              color: 'var(--text-muted)',
                              marginTop: 2,
                            }}
                          >
                            {u.designation}
                          </div>
                        )}
                      </td>
                      <td>{u.email}</td>
                      <td>{u.employeeId || '—'}</td>
                      <td>{u.departmentId || '—'}</td>
                      <td>
                        {role ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '2px 8px',
                              borderRadius: 5,
                              background: 'rgba(15,123,69,0.08)',
                              fontSize: 11,
                              fontWeight: 600,
                              color: 'var(--primary)',
                            }}
                          >
                            <Shield style={{ width: 10, height: 10 }} />
                            {role.name}
                          </span>
                        ) : (
                          <span
                            style={{ color: 'var(--text-muted)', fontSize: 11 }}
                          >
                            —
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => !isDeleted && toggleStatus(u)}
                          style={{
                            padding: '2px 10px',
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 600,
                            border: 'none',
                            cursor:
                              canManage && !isDeleted ? 'pointer' : 'default',
                            background:
                              u.status === 'ACTIVE'
                                ? '#d1fae5'
                                : u.status === 'LOCKED'
                                  ? '#fef3c7'
                                  : u.status === 'DELETED'
                                    ? '#fee2e2'
                                    : '#f3f4f6',
                            color:
                              u.status === 'ACTIVE'
                                ? '#065f46'
                                : u.status === 'LOCKED'
                                  ? '#92400e'
                                  : u.status === 'DELETED'
                                    ? '#991b1b'
                                    : '#4b5563',
                          }}
                        >
                          {u.status}
                        </button>
                      </td>
                      <td>{fmtDate((u as any).lastLogin)}</td>
                      <td>
                        {canManage && (
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'flex-end',
                              gap: 4,
                            }}
                          >
                            {!isDeleted && (
                              <>
                                {u.status === 'LOCKED' && (
                                  <button
                                    onClick={() => unlock(u)}
                                    className="ifh-btn-ghost"
                                    style={{
                                      padding: '4px 8px',
                                      color: '#d97706',
                                    }}
                                    title="Unlock Account"
                                  >
                                    <Unlock style={{ width: 14, height: 14 }} />
                                  </button>
                                )}
                                <button
                                  onClick={() => openEdit(u)}
                                  className="ifh-btn-ghost"
                                  style={{ padding: '4px 8px' }}
                                  title="Edit"
                                >
                                  <Pencil style={{ width: 14, height: 14 }} />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedUser(u);
                                    setForm((f) => ({ ...f, password: '' }));
                                    setModal('password');
                                  }}
                                  className="ifh-btn-ghost"
                                  style={{ padding: '4px 8px' }}
                                  title="Reset Password"
                                >
                                  <RefreshCw
                                    style={{ width: 14, height: 14 }}
                                  />
                                </button>
                                <button
                                  onClick={() => softDelete(u)}
                                  className="ifh-btn-ghost"
                                  style={{
                                    padding: '4px 8px',
                                    color: '#dc2626',
                                  }}
                                  title="Delete"
                                >
                                  <Trash2 style={{ width: 14, height: 14 }} />
                                </button>
                              </>
                            )}
                            {isDeleted && (
                              <button
                                onClick={() => restore(u)}
                                className="ifh-btn-ghost"
                                style={{ padding: '4px 8px', color: '#0f7b45' }}
                                title="Restore"
                              >
                                <RotateCcw style={{ width: 14, height: 14 }} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderTop: '1px solid var(--border)',
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Page {page} of {totalPages} · {filtered.length} users
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="ifh-btn-ghost"
                style={{ fontSize: 13, padding: '6px 12px' }}
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="ifh-btn-ghost"
                style={{ fontSize: 13, padding: '6px 12px' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {(modal === 'create' || modal === 'edit') && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.45)',
            padding: 16,
          }}
        >
          <div
            className="ifh-card"
            style={{
              width: '100%',
              maxWidth: 'min(500px, calc(100vw - 32px))',
              padding: 0,
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                borderBottom: '1px solid var(--border)',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 700 }}>
                {modal === 'create'
                  ? 'Add User'
                  : `Edit: ${selectedUser?.fullName}`}
              </span>
              <button
                onClick={() => setModal(null)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>
            <div
              style={{
                padding: '20px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
                overflowY: 'auto',
              }}
            >
              <div style={{ gridColumn: '1/-1' }}>
                <label className="ifh-label">
                  Full Name <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  className="ifh-input"
                  value={form.fullName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, fullName: e.target.value }))
                  }
                  placeholder="Full name"
                />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="ifh-label">
                  Email <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  className="ifh-input"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, email: e.target.value }))
                  }
                  placeholder="email@if-himenviro.in"
                />
              </div>
              <div>
                <label className="ifh-label">Employee ID</label>
                <input
                  className="ifh-input"
                  value={form.employeeId}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, employeeId: e.target.value }))
                  }
                  placeholder="EMP-001"
                />
              </div>
              <div>
                <label className="ifh-label">Phone</label>
                <input
                  className="ifh-input"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, phone: e.target.value }))
                  }
                  placeholder="+91 98765 43210"
                />
              </div>
              <div>
                <label className="ifh-label">Role</label>
                <select
                  className="ifh-input"
                  value={form.roleId}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, roleId: e.target.value }))
                  }
                >
                  <option value="">Select role</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="ifh-label">Department</label>
                <select
                  className="ifh-input"
                  value={form.departmentId}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, departmentId: e.target.value }))
                  }
                >
                  <option value="">Select department</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="ifh-label">Designation</label>
                <input
                  className="ifh-input"
                  value={form.designation}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, designation: e.target.value }))
                  }
                  placeholder="Job title"
                />
              </div>
              {modal === 'create' && (
                <div style={{ gridColumn: '1/-1' }}>
                  <label className="ifh-label">Temporary Password</label>
                  <input
                    className="ifh-input"
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, password: e.target.value }))
                    }
                    placeholder="Default: IFH@2026"
                  />
                </div>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                padding: '16px 20px',
                borderTop: '1px solid var(--border)',
                flexShrink: 0,
                background: 'var(--surface2)',
              }}
            >
              <button
                onClick={() => setModal(null)}
                className="ifh-btn-ghost"
                style={{ fontSize: 13, padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button
                onClick={modal === 'create' ? saveCreate : saveEdit}
                disabled={saving || !form.fullName.trim() || !form.email.trim()}
                className="ifh-btn-primary"
                style={{
                  fontSize: 13,
                  padding: '8px 16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Check style={{ width: 14, height: 14 }} />
                {saving
                  ? 'Saving...'
                  : modal === 'create'
                    ? 'Create User'
                    : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {modal === 'password' && selectedUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.45)',
            padding: 16,
          }}
        >
          <div
            className="ifh-card"
            style={{ width: '100%', maxWidth: 400, padding: 0 }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 700 }}>
                Reset Password: {selectedUser.fullName}
              </span>
              <button
                onClick={() => setModal(null)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <label className="ifh-label">New Temporary Password</label>
              <input
                className="ifh-input"
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((p) => ({ ...p, password: e.target.value }))
                }
                placeholder="Enter new password"
              />
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  marginTop: 8,
                }}
              >
                The user will be required to change this upon next login.
              </p>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                padding: '16px 20px',
                borderTop: '1px solid var(--border)',
                background: 'var(--surface2)',
              }}
            >
              <button
                onClick={() => setModal(null)}
                className="ifh-btn-ghost"
                style={{ fontSize: 13, padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button
                onClick={resetPassword}
                disabled={saving || !form.password}
                className="ifh-btn-primary"
                style={{
                  fontSize: 13,
                  padding: '8px 16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <RefreshCw style={{ width: 14, height: 14 }} />
                {saving ? 'Resetting...' : 'Force Password Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
