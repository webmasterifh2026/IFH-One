'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Shield, Check } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { apiFetch } from '@/lib/api/fetch';
import { usePermission } from '@/hooks/usePermission';

interface Permission { id: string; key: string; module: string; description?: string; }
interface Role { id: string; name: string; status: string; }

export default function PermissionsPage() {
  const { isSuperAdmin, isAdmin } = usePermission();
  const canManage = isSuperAdmin || isAdmin;

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePerms, setRolePerms] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedMod, setSelectedMod] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        apiFetch('/roles'),
        apiFetch('/permissions'),
      ]);
      const roleList: Role[] = rolesRes.data || rolesRes;
      const permList: Permission[] = Array.isArray(permsRes) ? permsRes : [];
      setRoles(roleList.filter(r => r.status === 'ACTIVE'));
      setPermissions(permList);

      const rp: Record<string, Set<string>> = {};
      await Promise.all(roleList.map(async r => {
        try {
          const rPerms = await apiFetch(`/roles/${r.id}/permissions`);
          rp[r.id] = new Set((Array.isArray(rPerms) ? rPerms : []).map((p: Permission) => p.id));
        } catch { rp[r.id] = new Set(); }
      }));
      setRolePerms(rp);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const modules = [...new Set(permissions.map(p => p.module))].sort();
  const filteredPerms = permissions.filter(p => {
    const matchMod = selectedMod === 'all' || p.module === selectedMod;
    const matchSearch = !search || p.key.toLowerCase().includes(search.toLowerCase()) || p.module.toLowerCase().includes(search.toLowerCase());
    return matchMod && matchSearch;
  });

  async function togglePerm(roleId: string, permId: string, currentlyHas: boolean) {
    if (!canManage) return;
    setSaving(`${roleId}:${permId}`);
    const current = rolePerms[roleId] ? new Set(rolePerms[roleId]) : new Set<string>();
    currentlyHas ? current.delete(permId) : current.add(permId);
    setRolePerms(prev => ({ ...prev, [roleId]: current }));
    try {
      await apiFetch(`/roles/${roleId}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({ permissionIds: Array.from(current) }),
      });
    } catch {
      currentlyHas ? current.add(permId) : current.delete(permId);
      setRolePerms(prev => ({ ...prev, [roleId]: current }));
    }
    setSaving(null);
  }

  const stickyHeaderStyle: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: 3,
    background: 'var(--card)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  };

  const stickyColStyle: React.CSSProperties = {
    position: 'sticky',
    left: 0,
    zIndex: 2,
    background: 'inherit',
    boxShadow: '2px 0 6px rgba(0,0,0,0.04)',
  };

  return (
    <div className="page-content">
      <PageHeader
        title="Permission Matrix"
        description="Control which roles can access each permission. Changes are saved immediately."
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginTop: 18, marginBottom: 18, flexWrap: 'wrap' }}>
        <div className="ifh-card" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', flex: 1, minWidth: 220 }}>
          <Search style={{ width: 14, height: 14, color: 'var(--text-muted)', flexShrink: 0 }} />
          <input type="text" placeholder="Search permissions by key or module..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', fontSize: 13, outline: 'none', flex: 1, color: 'var(--text-primary)' }} />
        </div>
        <select value={selectedMod} onChange={e => setSelectedMod(e.target.value)}
          className="ifh-input" style={{ height: 40, padding: '0 14px', borderRadius: 8, minWidth: 200, fontSize: 13 }}>
          <option value="all">All Modules</option>
          {modules.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ padding: 50, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>Loading permission matrix...</div>
      ) : (
        <div className="ifh-card" style={{ padding: 0, overflow: 'auto', borderRadius: 10, border: '1px solid var(--border)' }}>
          <div style={{ minWidth: 700 }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ ...stickyHeaderStyle, ...stickyColStyle, padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-primary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.03em', borderBottom: '2px solid var(--border)', minWidth: 220 }}>
                    Permission
                  </th>
                  {roles.map(r => (
                    <th key={r.id} style={{ ...stickyHeaderStyle, padding: '12px 10px', textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.02em', borderBottom: '2px solid var(--border)', minWidth: 110 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                        <Shield style={{ width: 12, height: 12, flexShrink: 0, color: 'var(--primary)' }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90 }}>{r.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPerms.length === 0 ? (
                  <tr><td colSpan={roles.length + 1} style={{ padding: 50, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>No permissions match your search.</td></tr>
                ) : filteredPerms.map((p, idx) => (
                  <tr key={p.id} style={{ background: idx % 2 === 0 ? 'var(--surface1)' : 'var(--surface2)', transition: 'background 0.1s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--hover-bg)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = idx % 2 === 0 ? 'var(--surface1)' : 'var(--surface2)'; }}>
                    <td style={{ ...stickyColStyle, padding: '10px 16px', borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'var(--surface1)' : 'var(--surface2)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--hover-bg)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = idx % 2 === 0 ? 'var(--surface1)' : 'var(--surface2)'; }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: 12 }}>{p.key}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{p.module}</div>
                    </td>
                    {roles.map(r => {
                      const has = rolePerms[r.id]?.has(p.id) ?? false;
                      const isSaving = saving === `${r.id}:${p.id}`;
                      return (
                        <td key={r.id} style={{ textAlign: 'center', padding: '10px 10px', borderBottom: '1px solid var(--border)' }}>
                          <button
                            onClick={() => togglePerm(r.id, p.id, has)}
                            disabled={!canManage || isSaving}
                            title={has ? `Revoke from ${r.name}` : `Grant to ${r.name}`}
                            style={{ width: 24, height: 24, borderRadius: 6, border: '2px solid', cursor: canManage ? 'pointer' : 'default', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 120ms', borderColor: has ? 'var(--primary)' : 'var(--border)', background: has ? 'var(--primary)' : 'transparent', opacity: isSaving ? 0.5 : 1 }}
                          >
                            {has && <Check style={{ width: 14, height: 14, color: '#fff', strokeWidth: 3 }} />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <span>{filteredPerms.length} of {permissions.length} permissions shown</span>
        <span>Click checkboxes to toggle · Changes save instantly</span>
      </div>
    </div>
  );
}