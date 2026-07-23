'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Check,
  Shield,
  Copy,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { apiFetch } from '@/lib/api/fetch';
import { usePermission } from '@/hooks/usePermission';

interface Permission {
  id: string;
  key: string;
  module: string;
  description?: string;
}
interface Role {
  id: string;
  name: string;
  description?: string;
  status: string;
  createdAt: string;
  usersCount?: number;
  rolePermissions?: { permission: Permission }[];
}

const STAGE_NAMES: Record<number, string> = {
  1: 'Indent Creation',
  2: 'Indent Verification',
  3: 'Store Check',
  4: 'RFQ Float',
  5: 'TCO Evaluation',
  6: 'Negotiation',
  7: 'PO Creation',
  8: 'PO Approval L1',
  9: 'PO Approval L2',
  10: 'Vendor Acceptance',
  11: 'Vendor Follow-Up',
  12: 'Material Receipt',
  13: 'Material Inspection',
  14: 'Secondary Inspection',
  15: 'Final Inspection',
  16: 'Debit Note',
  17: 'Bill to Accounts',
  18: 'Bill to Purchase',
  19: 'Bill Creation',
  20: 'Tally Entry',
  21: 'Bill Approval L1',
  22: 'Bill Approval L2',
};

export default function RolesPage() {
  const { isSuperAdmin, isAdmin } = usePermission();
  const canManage = isSuperAdmin || isAdmin;

  const [roles, setRoles] = useState<Role[]>([]);
  const [allPerms, setAllPerms] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<
    'create' | 'edit' | 'permissions' | 'clone' | null
  >(null);
  const [selected, setSelected] = useState<Role | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [cloneName, setCloneName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Permission editor state
  const [checkedPerms, setCheckedPerms] = useState<Set<string>>(new Set());
  const [stagePerms, setStagePerms] = useState<
    Record<number, { canView: boolean; canEdit: boolean; canApprove: boolean }>
  >({});
  const [expandedMods, setExpandedMods] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [rolesRes, permsRes] = await Promise.all([
        apiFetch('/roles'),
        apiFetch('/roles/permissions'),
      ]);
      setRoles(rolesRes.data || rolesRes);
      setAllPerms(Array.isArray(permsRes) ? permsRes : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = roles.filter(
    (r) => !search || r.name.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = allPerms.reduce(
    (acc, p) => {
      if (!acc[p.module]) acc[p.module] = [];
      acc[p.module].push(p);
      return acc;
    },
    {} as Record<string, Permission[]>
  );

  async function openPermissions(role: Role) {
    setSelected(role);
    try {
      const [perms, stages] = await Promise.all([
        apiFetch(`/roles/${role.id}/permissions`),
        apiFetch(`/roles/${role.id}/workflow-stages`),
      ]);
      setCheckedPerms(
        new Set(
          (Array.isArray(perms) ? perms : []).map((p: Permission) => p.id)
        )
      );
      const sm: Record<
        number,
        { canView: boolean; canEdit: boolean; canApprove: boolean }
      > = {};
      for (let i = 1; i <= 22; i++)
        sm[i] = { canView: false, canEdit: false, canApprove: false };
      for (const s of Array.isArray(stages) ? stages : []) {
        sm[s.workflowStage] = {
          canView: s.canView,
          canEdit: s.canEdit,
          canApprove: s.canApprove,
        };
      }
      setStagePerms(sm);
    } catch {}
    setModal('permissions');
  }

  async function savePermissions() {
    if (!selected) return;
    setSaving(true);
    try {
      await apiFetch(`/roles/${selected.id}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({ permissionIds: Array.from(checkedPerms) }),
      });
      const stages = Object.entries(stagePerms).map(([n, v]) => ({
        workflowStage: parseInt(n),
        ...v,
      }));
      await apiFetch(`/roles/${selected.id}/workflow-stages`, {
        method: 'PUT',
        body: JSON.stringify({ stages }),
      });
      setModal(null);
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function createRole() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await apiFetch('/roles', { method: 'POST', body: JSON.stringify(form) });
      setModal(null);
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateRole() {
    if (!selected || !form.name.trim()) return;
    setSaving(true);
    try {
      await apiFetch(`/roles/${selected.id}`, {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      setModal(null);
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function cloneRole() {
    if (!selected || !cloneName.trim()) return;
    setSaving(true);
    try {
      await apiFetch(`/roles/${selected.id}/clone`, {
        method: 'POST',
        body: JSON.stringify({ name: cloneName }),
      });
      setModal(null);
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(role: Role) {
    const status = role.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await apiFetch(`/roles/${role.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  function toggleMod(mod: string) {
    setExpandedMods((prev) => {
      const s = new Set(prev);
      s.has(mod) ? s.delete(mod) : s.add(mod);
      return s;
    });
  }

  function toggleModPerms(mod: string, checked: boolean) {
    const modPerms = grouped[mod] || [];
    setCheckedPerms((prev) => {
      const s = new Set(prev);
      modPerms.forEach((p) => (checked ? s.add(p.id) : s.delete(p.id)));
      return s;
    });
  }

  return (
    <div className="page-content">
      <PageHeader
        title="Role Management"
        description="Configure roles and their permission sets."
        actions={
          canManage ? (
            <button
              onClick={() => {
                setForm({ name: '', description: '' });
                setModal('create');
              }}
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
              <Plus style={{ width: 14, height: 14 }} /> Create Role
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

      <div
        className="ifh-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 14px',
          marginBottom: 14,
          marginTop: 18,
        }}
      >
        <Search
          style={{
            width: 14,
            height: 14,
            color: 'var(--text-muted)',
            flexShrink: 0,
          }}
        />
        <input
          type="text"
          placeholder="Search roles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ifh-input"
          style={{ border: 'none', background: 'transparent', flex: 1 }}
        />
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
            Loading roles...
          </div>
        ) : (
          <table className="ifh-table">
            <thead>
              <tr>
                {[
                  'Role',
                  'Description',
                  'Users',
                  'Status',
                  'Permissions',
                  '',
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
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
                    No roles found.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            background: 'rgba(15,123,69,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Shield
                            style={{
                              width: 13,
                              height: 13,
                              color: 'var(--primary)',
                            }}
                          />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>
                          {r.name}
                        </span>
                      </div>
                    </td>
                    <td>{r.description || '—'}</td>
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          fontSize: 12,
                        }}
                      >
                        <Users
                          style={{
                            width: 12,
                            height: 12,
                            color: 'var(--text-muted)',
                          }}
                        />
                        {r.usersCount ?? 0}
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={() => canManage && toggleStatus(r)}
                        style={{
                          padding: '2px 10px',
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 600,
                          border: 'none',
                          cursor: canManage ? 'pointer' : 'default',
                          background:
                            r.status === 'ACTIVE' ? '#d1fae5' : '#f3f4f6',
                          color: r.status === 'ACTIVE' ? '#065f46' : '#6b7280',
                        }}
                      >
                        {r.status}
                      </button>
                    </td>
                    <td>{r.rolePermissions?.length ?? '—'}</td>
                    <td>
                      {canManage && (
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 4,
                          }}
                        >
                          <button
                            title="Edit permissions"
                            onClick={() => openPermissions(r)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: 6,
                              border: '1px solid var(--border)',
                              background: 'var(--surface2)',
                              cursor: 'pointer',
                              color: 'var(--primary)',
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            Permissions
                          </button>
                          <button
                            title="Edit role"
                            onClick={() => {
                              setSelected(r);
                              setForm({
                                name: r.name,
                                description: r.description || '',
                              });
                              setModal('edit');
                            }}
                            className="ifh-btn-ghost"
                            style={{ padding: '4px 8px' }}
                          >
                            <Pencil style={{ width: 12, height: 12 }} />
                          </button>
                          <button
                            title="Clone role"
                            onClick={() => {
                              setSelected(r);
                              setCloneName(`${r.name} (Copy)`);
                              setModal('clone');
                            }}
                            className="ifh-btn-ghost"
                            style={{ padding: '4px 8px' }}
                          >
                            <Copy style={{ width: 12, height: 12 }} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
              maxWidth: 'min(420px, calc(100vw - 32px))',
              padding: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 18px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700 }}>
                {modal === 'create' ? 'Create Role' : 'Edit Role'}
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
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <div
              style={{
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div>
                <label className="ifh-label">Role Name</label>
                <input
                  className="ifh-input"
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g. Purchase Manager"
                />
              </div>
              <div>
                <label className="ifh-label">Description</label>
                <textarea
                  className="ifh-input"
                  style={{ height: 72, padding: '8px 10px', resize: 'none' }}
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  placeholder="Optional description"
                />
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
                padding: '12px 18px',
                borderTop: '1px solid var(--border)',
              }}
            >
              <button
                onClick={() => setModal(null)}
                className="ifh-btn-ghost"
                style={{ fontSize: 13, padding: '6px 14px' }}
              >
                Cancel
              </button>
              <button
                onClick={modal === 'create' ? createRole : updateRole}
                disabled={saving}
                className="ifh-btn-primary"
                style={{
                  fontSize: 13,
                  padding: '6px 14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Check style={{ width: 13, height: 13 }} />
                {saving ? 'Saving...' : modal === 'create' ? 'Create' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clone Modal */}
      {modal === 'clone' && (
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
            style={{ width: '100%', maxWidth: 380, padding: 0 }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 18px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700 }}>
                Clone Role: {selected?.name}
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
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <div style={{ padding: '16px 18px' }}>
              <label className="ifh-label">New Role Name</label>
              <input
                className="ifh-input"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                placeholder="Name for the cloned role"
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
                padding: '12px 18px',
                borderTop: '1px solid var(--border)',
              }}
            >
              <button
                onClick={() => setModal(null)}
                className="ifh-btn-ghost"
                style={{ fontSize: 13, padding: '6px 14px' }}
              >
                Cancel
              </button>
              <button
                onClick={cloneRole}
                disabled={saving}
                className="ifh-btn-primary"
                style={{
                  fontSize: 13,
                  padding: '6px 14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Copy style={{ width: 13, height: 13 }} />
                {saving ? 'Cloning...' : 'Clone'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Editor Modal */}
      {modal === 'permissions' && selected && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
            padding: 16,
          }}
        >
          <div
            className="ifh-card"
            style={{
              width: '100%',
              maxWidth: 780,
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 18px',
                borderBottom: '1px solid var(--border)',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700 }}>
                Permissions: {selected.name}
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
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 18px' }}>
              {/* Module permissions */}
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  marginBottom: 8,
                }}
              >
                Module Permissions
              </div>
              {Object.entries(grouped)
                .filter(([m]) => m !== 'Workflow')
                .map(([mod, perms]) => {
                  const allChecked = perms.every((p) => checkedPerms.has(p.id));
                  const someChecked = perms.some((p) => checkedPerms.has(p.id));
                  const open = expandedMods.has(mod);
                  return (
                    <div
                      key={mod}
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        marginBottom: 6,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 12px',
                          background: 'var(--surface2)',
                          cursor: 'pointer',
                        }}
                        onClick={() => toggleMod(mod)}
                      >
                        <input
                          type="checkbox"
                          checked={allChecked}
                          ref={(el) => {
                            if (el)
                              el.indeterminate = !allChecked && someChecked;
                          }}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleModPerms(mod, e.target.checked);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            marginRight: 8,
                            accentColor: 'var(--primary)',
                            width: 14,
                            height: 14,
                          }}
                        />
                        <span
                          style={{ fontSize: 12, fontWeight: 700, flex: 1 }}
                        >
                          {mod}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            color: 'var(--text-muted)',
                            marginRight: 8,
                          }}
                        >
                          {perms.filter((p) => checkedPerms.has(p.id)).length}/
                          {perms.length}
                        </span>
                        {open ? (
                          <ChevronUp
                            style={{
                              width: 13,
                              height: 13,
                              color: 'var(--text-muted)',
                            }}
                          />
                        ) : (
                          <ChevronDown
                            style={{
                              width: 13,
                              height: 13,
                              color: 'var(--text-muted)',
                            }}
                          />
                        )}
                      </div>
                      {open && (
                        <div
                          style={{
                            padding: '8px 12px',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 6,
                          }}
                        >
                          {perms.map((p) => (
                            <label
                              key={p.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                                cursor: 'pointer',
                                padding: '3px 8px',
                                borderRadius: 5,
                                border: '1px solid var(--border)',
                                fontSize: 11,
                                background: checkedPerms.has(p.id)
                                  ? 'rgba(15,123,69,0.08)'
                                  : 'transparent',
                                color: checkedPerms.has(p.id)
                                  ? 'var(--primary)'
                                  : 'var(--text-secondary)',
                                fontWeight: checkedPerms.has(p.id) ? 600 : 400,
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checkedPerms.has(p.id)}
                                onChange={(e) => {
                                  setCheckedPerms((prev) => {
                                    const s = new Set(prev);
                                    e.target.checked
                                      ? s.add(p.id)
                                      : s.delete(p.id);
                                    return s;
                                  });
                                }}
                                style={{
                                  accentColor: 'var(--primary)',
                                  width: 12,
                                  height: 12,
                                }}
                              />
                              {p.key.split('.').slice(1).join('.')}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

              {/* Workflow Stage permissions */}
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  marginTop: 16,
                  marginBottom: 8,
                }}
              >
                Workflow Stage Access
              </div>
              <div
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                <table className="ifh-table">
                  <thead>
                    <tr style={{ background: 'var(--surface2)' }}>
                      {['Stage', 'Can View', 'Can Edit', 'Can Approve'].map(
                        (h) => (
                          <th
                            key={h}
                            style={{
                              padding: '7px 12px',
                              fontSize: 10,
                              fontWeight: 700,
                              color: 'var(--text-muted)',
                              textTransform: 'uppercase',
                              textAlign: h === 'Stage' ? 'left' : 'center',
                              borderBottom: '1px solid var(--border)',
                            }}
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 22 }, (_, i) => i + 1).map((n) => (
                      <tr
                        key={n}
                        style={{ borderBottom: '1px solid var(--border)' }}
                      >
                        <td
                          style={{
                            padding: '6px 12px',
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                        >
                          S{n} · {STAGE_NAMES[n]}
                        </td>
                        {(['canView', 'canEdit', 'canApprove'] as const).map(
                          (f) => (
                            <td
                              key={f}
                              style={{
                                textAlign: 'center',
                                padding: '6px 12px',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={stagePerms[n]?.[f] ?? false}
                                onChange={(e) =>
                                  setStagePerms((prev) => ({
                                    ...prev,
                                    [n]: { ...prev[n], [f]: e.target.checked },
                                  }))
                                }
                                style={{
                                  accentColor: 'var(--primary)',
                                  width: 14,
                                  height: 14,
                                  cursor: 'pointer',
                                }}
                              />
                            </td>
                          )
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
                padding: '12px 18px',
                borderTop: '1px solid var(--border)',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {checkedPerms.size} permissions selected
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setModal(null)}
                  className="ifh-btn-ghost"
                  style={{ fontSize: 13, padding: '6px 14px' }}
                >
                  Cancel
                </button>
                <button
                  onClick={savePermissions}
                  disabled={saving}
                  className="ifh-btn-primary"
                  style={{
                    fontSize: 13,
                    padding: '6px 14px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <Check style={{ width: 13, height: 13 }} />
                  {saving ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
