'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Shield,
  Save,
  Users,
  Layers,
  CheckCircle2,
  XCircle,
  Pencil,
  X,
  Check,
  UserPlus,
  UserMinus,
} from 'lucide-react';
import { EnterpriseCard } from '@/components/ui/enterprise-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { apiFetch } from '@/lib/api/fetch';

interface Permission {
  id: string;
  module: string;
  key: string;
  description: string | null;
}

interface WorkflowStage {
  id?: string;
  workflowStage: number;
  canView: boolean;
  canEdit: boolean;
  canApprove: boolean;
}

interface AssignedUser {
  id: string;
  fullName: string;
  email: string;
  employeeId: string;
  designation: string | null;
  status: string;
}

export default function RoleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleId = params.id as string;
  const startInEdit = searchParams.get('edit') === 'true';

  // Role data
  const [role, setRole] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editing, setEditing] = useState(startInEdit);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('ACTIVE');

  // Permissions
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [assignedPermissionIds, setAssignedPermissionIds] = useState<
    Set<string>
  >(new Set());
  const [permissionsDirty, setPermissionsDirty] = useState(false);

  // Workflow stages
  const [workflowStages, setWorkflowStages] = useState<WorkflowStage[]>([]);
  const [workflowDirty, setWorkflowDirty] = useState(false);

  // Assigned users
  const [assignedUsers, setAssignedUsers] = useState<AssignedUser[]>([]);

  // Tab state
  const [activeTab, setActiveTab] = useState<
    'permissions' | 'workflow' | 'users'
  >('permissions');

  // Saving
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const fetchRole = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/roles/${roleId}`);
      setRole(data);
      setEditName(data.name);
      setEditDescription(data.description || '');
      setEditStatus(data.status);

      // Map assigned permissions
      const ids = new Set<string>(
        data.rolePermissions?.map((rp: any) => rp.permission.id) || []
      );
      setAssignedPermissionIds(ids);

      // Map workflow stages (init 22 steps)
      const existingStages = data.workflowStages || [];
      const stages: WorkflowStage[] = [];
      for (let i = 1; i <= 22; i++) {
        const existing = existingStages.find(
          (ws: any) => ws.workflowStage === i
        );
        stages.push({
          workflowStage: i,
          canView: existing?.canView || false,
          canEdit: existing?.canEdit || false,
          canApprove: existing?.canApprove || false,
        });
      }
      setWorkflowStages(stages);

      // Map assigned users
      setAssignedUsers(data.userRoles?.map((ur: any) => ur.user) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [roleId]);

  const fetchAllPermissions = useCallback(async () => {
    try {
      const data = await apiFetch('/roles/permissions');
      setAllPermissions(data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchRole();
    fetchAllPermissions();
  }, [fetchRole, fetchAllPermissions]);

  // Group permissions by module
  const permissionsByModule = allPermissions.reduce<
    Record<string, Permission[]>
  >((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  const togglePermission = (id: string) => {
    const next = new Set(assignedPermissionIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setAssignedPermissionIds(next);
    setPermissionsDirty(true);
  };

  const toggleModuleAll = (module: string) => {
    const modulePerms = permissionsByModule[module] || [];
    const allChecked = modulePerms.every((p) =>
      assignedPermissionIds.has(p.id)
    );
    const next = new Set(assignedPermissionIds);
    modulePerms.forEach((p) => {
      if (allChecked) next.delete(p.id);
      else next.add(p.id);
    });
    setAssignedPermissionIds(next);
    setPermissionsDirty(true);
  };

  const toggleWorkflowCell = (
    stage: number,
    field: 'canView' | 'canEdit' | 'canApprove'
  ) => {
    setWorkflowStages((prev) =>
      prev.map((ws) =>
        ws.workflowStage === stage ? { ...ws, [field]: !ws[field] } : ws
      )
    );
    setWorkflowDirty(true);
  };

  const handleSaveRole = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      // Update role info
      if (editing) {
        await apiFetch(`/roles/${roleId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: editName.trim().toUpperCase(),
            description: editDescription.trim(),
            status: editStatus,
          }),
        });
        setEditing(false);
      }

      // Save permissions
      if (permissionsDirty) {
        await apiFetch(`/roles/${roleId}/permissions`, {
          method: 'PUT',
          body: JSON.stringify({
            permissionIds: Array.from(assignedPermissionIds),
          }),
        });
        setPermissionsDirty(false);
      }

      // Save workflow stages
      if (workflowDirty) {
        const activeStages = workflowStages.filter(
          (ws) => ws.canView || ws.canEdit || ws.canApprove
        );
        await apiFetch(`/roles/${roleId}/workflow-stages`, {
          method: 'PUT',
          body: JSON.stringify({ stages: activeStages }),
        });
        setWorkflowDirty(false);
      }

      setSaveMsg('All changes saved successfully.');
      fetchRole();
    } catch (err: any) {
      setSaveMsg(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    try {
      await apiFetch(`/roles/${roleId}/users/${userId}`, { method: 'DELETE' });
      setAssignedUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <p className="text-[14px] text-gray-400 font-medium">
          Loading role details...
        </p>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <p className="text-[14px] text-red-500 font-medium">Role not found.</p>
      </div>
    );
  }

  const hasDirtyChanges = editing || permissionsDirty || workflowDirty;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-6xl mx-auto px-8 py-10">
        {/* Navigation */}
        <Link
          href="/roles"
          className="inline-flex items-center gap-2 text-[13px] font-medium text-gray-500 hover:text-gray-900 transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Roles
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-[#0F7B45]/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-[#0F7B45]" />
            </div>
            <div>
              {editing ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-[24px] font-bold tracking-tight text-gray-900 bg-transparent border-b-2 border-[#0F7B45] focus:outline-none pb-0.5"
                />
              ) : (
                <h1 className="text-[24px] font-bold tracking-tight text-gray-900">
                  {role.name}
                </h1>
              )}
              <div className="flex items-center gap-3 mt-1">
                {role.status === 'ACTIVE' ? (
                  <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-700">
                    <CheckCircle2 className="w-3 h-3" /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-gray-500">
                    <XCircle className="w-3 h-3" /> Inactive
                  </span>
                )}
                <span className="text-[12px] text-gray-400">•</span>
                <span className="text-[12px] text-gray-500 font-medium">
                  {assignedUsers.length} user
                  {assignedUsers.length !== 1 ? 's' : ''} assigned
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
            )}
            {hasDirtyChanges && (
              <button
                onClick={handleSaveRole}
                disabled={saving}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[#0F7B45] text-white text-[13px] font-semibold hover:bg-[#0A5C34] transition-colors disabled:opacity-50 shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>

        {/* Save Feedback */}
        {saveMsg && (
          <div
            className={`rounded-xl px-4 py-3 text-[13px] font-medium mb-6 ${saveMsg.startsWith('Error') ? 'bg-red-50 text-red-700 border border-red-200/60' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'}`}
          >
            {saveMsg}
          </div>
        )}

        {/* Role Info Card (editing mode) */}
        {editing && (
          <EnterpriseCard className="mb-6 p-6">
            <h3 className="text-[14px] font-semibold text-gray-900 mb-4">
              Role Information
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0F7B45]/20 focus:border-[#0F7B45] transition-all resize-none"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0F7B45]/20 focus:border-[#0F7B45] transition-all appearance-none"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>
          </EnterpriseCard>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
          {[
            { key: 'permissions', label: 'Permissions', icon: Shield },
            { key: 'workflow', label: 'Workflow Access', icon: Layers },
            { key: 'users', label: 'Assigned Users', icon: Users },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`inline-flex items-center gap-2 px-5 py-3 text-[13px] font-semibold border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? 'border-[#0F7B45] text-[#0F7B45]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* PERMISSIONS TAB */}
        {activeTab === 'permissions' && (
          <div className="space-y-4">
            {Object.entries(permissionsByModule).map(([module, perms]) => {
              const allChecked = perms.every((p) =>
                assignedPermissionIds.has(p.id)
              );
              const someChecked = perms.some((p) =>
                assignedPermissionIds.has(p.id)
              );
              return (
                <EnterpriseCard
                  noPadding
                  key={module}
                  className="overflow-hidden"
                >
                  {/* Module Header */}
                  <div
                    className="flex items-center justify-between px-6 py-4 bg-gray-50/50 border-b border-gray-100 cursor-pointer"
                    onClick={() => toggleModuleAll(module)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          allChecked
                            ? 'bg-[#0F7B45] border-[#0F7B45]'
                            : someChecked
                              ? 'border-[#0F7B45] bg-[#0F7B45]/10'
                              : 'border-gray-300'
                        }`}
                      >
                        {(allChecked || someChecked) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span className="text-[14px] font-semibold text-gray-900">
                        {module}
                      </span>
                    </div>
                    <span className="text-[12px] text-gray-500 font-medium">
                      {
                        perms.filter((p) => assignedPermissionIds.has(p.id))
                          .length
                      }{' '}
                      / {perms.length}
                    </span>
                  </div>
                  {/* Permission Items */}
                  <div className="divide-y divide-gray-50">
                    {perms.map((p) => (
                      <label
                        key={p.id}
                        className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer"
                      >
                        <div
                          className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-colors ${
                            assignedPermissionIds.has(p.id)
                              ? 'bg-[#0F7B45] border-[#0F7B45]'
                              : 'border-gray-300'
                          }`}
                          style={{ width: '18px', height: '18px' }}
                        >
                          {assignedPermissionIds.has(p.id) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[13px] font-medium text-gray-800">
                            {p.key}
                          </span>
                        </div>
                        <span className="text-[12px] text-gray-400">
                          {p.description || ''}
                        </span>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={assignedPermissionIds.has(p.id)}
                          onChange={() => togglePermission(p.id)}
                        />
                      </label>
                    ))}
                  </div>
                </EnterpriseCard>
              );
            })}
          </div>
        )}

        {/* WORKFLOW ACCESS TAB */}
        {activeTab === 'workflow' && (
          <EnterpriseCard noPadding className="overflow-hidden">
            <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
              <h3 className="text-[14px] font-semibold text-gray-900">
                Workflow Stage Access Matrix
              </h3>
              <p className="text-[12px] text-gray-500 mt-0.5">
                Define view, edit, and approval access for each procurement
                workflow stage.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left ifh-table ifh-table">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-6 py-3 text-[12px] font-semibold text-gray-500 uppercase tracking-wider w-32">
                      Stage
                    </th>
                    <th className="px-6 py-3 text-[12px] font-semibold text-gray-500 uppercase tracking-wider text-center w-24">
                      View
                    </th>
                    <th className="px-6 py-3 text-[12px] font-semibold text-gray-500 uppercase tracking-wider text-center w-24">
                      Edit
                    </th>
                    <th className="px-6 py-3 text-[12px] font-semibold text-gray-500 uppercase tracking-wider text-center w-24">
                      Approve
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {workflowStages.map((ws) => (
                    <tr
                      key={ws.workflowStage}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-3">
                        <span className="text-[13px] font-medium text-gray-800">
                          Step {ws.workflowStage}
                        </span>
                      </td>
                      {(['canView', 'canEdit', 'canApprove'] as const).map(
                        (field) => (
                          <td key={field} className="px-6 py-3 text-center">
                            <button
                              onClick={() =>
                                toggleWorkflowCell(ws.workflowStage, field)
                              }
                              className={`w-5 h-5 rounded border-2 inline-flex items-center justify-center transition-colors ${
                                ws[field]
                                  ? 'bg-[#0F7B45] border-[#0F7B45]'
                                  : 'border-gray-300 hover:border-gray-400'
                              }`}
                            >
                              {ws[field] && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </button>
                          </td>
                        )
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </EnterpriseCard>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <EnterpriseCard noPadding className="overflow-hidden">
            <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-semibold text-gray-900">
                  Assigned Users
                </h3>
                <p className="text-[12px] text-gray-500 mt-0.5">
                  {assignedUsers.length} user
                  {assignedUsers.length !== 1 ? 's' : ''} assigned to this role.
                </p>
              </div>
            </div>
            {assignedUsers.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Users}
                  headline="No users assigned"
                  description="Assign users from the User Management module."
                />
              </div>
            ) : (
              <table className="w-full text-left ifh-table ifh-table">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-6 py-3 text-[12px] font-semibold text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-[12px] font-semibold text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-[12px] font-semibold text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-[12px] font-semibold text-gray-500 uppercase tracking-wider text-center">
                      Status
                    </th>
                    <th className="px-6 py-3 text-[12px] font-semibold text-gray-500 uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {assignedUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-3 text-[13px] font-medium text-gray-900">
                        {user.employeeId}
                      </td>
                      <td className="px-6 py-3 text-[13px] text-gray-700">
                        {user.fullName}
                      </td>
                      <td className="px-6 py-3 text-[13px] text-gray-500">
                        {user.email}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <StatusBadge status={user.status} />
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => handleRemoveUser(user.id)}
                          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-red-600 hover:text-red-800 transition-colors"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </EnterpriseCard>
        )}
      </div>
    </div>
  );
}
