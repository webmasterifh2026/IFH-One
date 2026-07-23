'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Shield } from 'lucide-react';
import { EnterpriseCard } from '@/components/ui/enterprise-card';
import { apiFetch } from '@/lib/api/fetch';

export default function RoleMatrixPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesData, permsData] = await Promise.all([
        apiFetch('/roles?limit=100'),
        apiFetch('/roles/permissions'),
      ]);

      setRoles(rolesData.data || rolesData || []);
      setPermissions(permsData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Determine if a role has a permission
  const [rolePerms, setRolePerms] = useState<Record<string, Set<string>>>({});

  useEffect(() => {
    if (roles.length === 0) return;
    const fetchAllRolePerms = async () => {
      const permsMap: Record<string, Set<string>> = {};
      await Promise.all(
        roles.map(async (role) => {
          try {
            const data = await apiFetch(`/roles/${role.id}/permissions`);
            permsMap[role.id] = new Set((data || []).map((p: any) => p.id));
          } catch (e) {
            permsMap[role.id] = new Set();
          }
        })
      );
      setRolePerms(permsMap);
    };
    fetchAllRolePerms();
  }, [roles]);

  const permissionsByModule = useMemo(() => {
    const map: Record<string, any[]> = {};
    permissions.forEach((p) => {
      if (!map[p.module]) map[p.module] = [];
      map[p.module].push(p);
    });
    return map;
  }, [permissions]);

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      <Link
        href="/roles"
        className="inline-flex items-center gap-2 text-[13px] font-medium text-gray-500 hover:text-gray-900 transition-colors mb-2"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Roles
      </Link>

      <div>
        <h1 className="font-display italic font-medium text-[32px] leading-tight tracking-tight text-gray-900">
          Enterprise Permission Matrix
        </h1>
        <p className="text-[15px] text-gray-500 mt-1.5 font-medium">
          A holistic view of all roles and their assigned permissions across the
          platform.
        </p>
      </div>

      <EnterpriseCard noPadding className="overflow-x-auto">
        {loading ? (
          <div className="p-16 text-center text-gray-400">
            Loading matrix...
          </div>
        ) : roles.length === 0 ? (
          <div className="p-16 text-center text-gray-500">
            No roles available.
          </div>
        ) : (
          <table className="w-full text-left border-collapse ifh-table ifh-table">
            <thead>
              <tr>
                <th className="px-6 py-4 bg-gray-50/80 border-b border-gray-200 sticky left-0 z-10 w-80 min-w-[320px]">
                  <span className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider">
                    Module / Permission
                  </span>
                </th>
                {roles.map((role) => (
                  <th
                    key={role.id}
                    className="px-4 py-4 bg-gray-50/80 border-b border-gray-200 text-center min-w-[120px]"
                  >
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="h-8 w-8 rounded-lg bg-[#0F7B45]/10 flex items-center justify-center">
                        <Shield className="h-4 w-4 text-[#0F7B45]" />
                      </div>
                      <span
                        className="text-[13px] font-semibold text-gray-900 line-clamp-1"
                        title={role.name}
                      >
                        {role.name}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.entries(permissionsByModule).map(([module, perms]) => (
                <React.Fragment key={module}>
                  {/* Module Row */}
                  <tr className="bg-gray-50/40">
                    <td
                      className="px-6 py-3 font-semibold text-gray-900 text-[13px] sticky left-0 bg-gray-50/40 border-r border-gray-100"
                      colSpan={1}
                    >
                      {module}
                    </td>
                    {roles.map((role) => (
                      <td key={role.id} className="px-4 py-3 bg-gray-50/40" />
                    ))}
                  </tr>
                  {/* Permissions Rows */}
                  {perms.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-2.5 sticky left-0 bg-white border-r border-gray-100">
                        <div className="flex flex-col">
                          <span className="text-[13px] font-medium text-gray-800">
                            {p.name}
                          </span>
                          <span className="text-[11px] text-gray-400 font-mono mt-0.5">
                            {p.key}
                          </span>
                        </div>
                      </td>
                      {roles.map((role) => {
                        const hasPerm = rolePerms[role.id]?.has(p.id);
                        return (
                          <td
                            key={role.id}
                            className="px-4 py-2.5 text-center border-l border-gray-50"
                          >
                            {hasPerm ? (
                              <div className="w-5 h-5 mx-auto rounded bg-[#0F7B45] flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 mx-auto rounded border border-gray-200 bg-gray-50/50 flex items-center justify-center" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </EnterpriseCard>
    </div>
  );
}
