'use client';

import { useAuth } from '@/contexts/AuthContext';

export type StageAction =
  | 'view'
  | 'edit'
  | 'approve'
  | 'reject'
  | 'hold'
  | 'bulk_update'
  | 'export'
  | 'reassign';

/**
 * usePermission — v2.6.0
 *
 * Provides a fully database-driven, granular RBAC hook for the frontend.
 *
 * Key methods:
 *  can(key)             — checks a flat permission key (e.g. 'indent.create')
 *  canAny(keys[])       — true if user has at least one of the keys
 *  canAll(keys[])       — true if user has all of the keys
 *  canStage(n, action)  — checks a specific workflow stage action using both
 *                         the permission key list AND the stagePermissions map
 *  canEditStage(n)      — true only if the user is a doer for that stage
 *  isDoerForStage(n)    — alias for canEditStage
 *
 * Super Admin bypasses all checks.
 * Procurement Manager (isAdmin) gets full stage access.
 */
export function usePermission() {
  const { user } = useAuth();
  const perms: string[] = user?.permissions || [];
  const roles: string[] = user?.roles || [];
  const stagePermissions = user?.stagePermissions || {};

  const isSuperAdmin = roles.some(
    (r) => r === 'Super Admin' || r === 'SUPER_ADMIN',
  );
  const isAdmin =
    isSuperAdmin ||
    roles.some(
      (r) =>
        r === 'Procurement Manager' ||
        r === 'Admin' ||
        r === 'ADMIN' ||
        r === 'PROCUREMENT_MANAGER',
    );

  /** Check a flat permission key */
  function can(key: string): boolean {
    if (isSuperAdmin) return true;
    return perms.includes(key);
  }

  /** True if user has at least one of the given keys */
  function canAny(keys: string[]): boolean {
    if (isSuperAdmin) return true;
    return keys.some((k) => perms.includes(k));
  }

  /** True if user has all of the given keys */
  function canAll(keys: string[]): boolean {
    if (isSuperAdmin) return true;
    return keys.every((k) => perms.includes(k));
  }

  /**
   * canStage — check if the user can perform `action` at workflow stage `stage`.
   *
   * Checks BOTH:
   *  1. The flat permission key  `workflow.stage${stage}.${action}`
   *  2. The structured stagePermissions map returned from the API
   *
   * Either one being true is sufficient.
   */
  function canStage(stage: number, action: StageAction): boolean {
    if (isSuperAdmin || isAdmin) return true;

    // 1. Check flat permission key
    const permKey = `workflow.stage${stage}.${action}`;
    if (perms.includes(permKey)) return true;

    // 2. Check structured stagePermissions map
    const sp = stagePermissions[String(stage)];
    if (!sp) return false;

    switch (action) {
      case 'view':        return sp.canView;
      case 'edit':        return sp.canEdit;
      case 'approve':     return sp.canApprove;
      case 'hold':        return sp.canHold;
      case 'reject':      return sp.canReject;
      case 'bulk_update': return sp.canBulkUpdate;
      case 'export':      return sp.canExport;
      case 'reassign':    return sp.canReassign;
      default:            return false;
    }
  }

  /**
   * canEditStage — true only if the user has edit rights at this stage.
   * This is the key gate for showing edit controls vs read-only views.
   */
  function canEditStage(stage: number): boolean {
    return canStage(stage, 'edit');
  }

  /** Alias */
  const isDoerForStage = canEditStage;

  /**
   * getStageActions — returns all permitted actions at a given stage.
   * Useful for building action menus dynamically.
   */
  function getStageActions(stage: number): StageAction[] {
    const all: StageAction[] = [
      'view', 'edit', 'approve', 'reject', 'hold',
      'bulk_update', 'export', 'reassign',
    ];
    return all.filter((a) => canStage(stage, a));
  }

  /**
   * getViewableStages — returns the list of stage numbers the user can view.
   * Used for navigation filtering.
   */
  function getViewableStages(): number[] {
    if (isSuperAdmin || isAdmin) {
      return Array.from({ length: 22 }, (_, i) => i + 1);
    }
    const stages: number[] = [];
    for (let i = 1; i <= 22; i++) {
      if (canStage(i, 'view')) stages.push(i);
    }
    return stages;
  }

  /**
   * getEditableStages — returns the list of stage numbers the user can edit.
   * Users should NEVER see edit controls for stages not in this list.
   */
  function getEditableStages(): number[] {
    if (isSuperAdmin || isAdmin) {
      return Array.from({ length: 22 }, (_, i) => i + 1);
    }
    const stages: number[] = [];
    for (let i = 1; i <= 22; i++) {
      if (canStage(i, 'edit') || canStage(i, 'approve')) stages.push(i);
    }
    return stages;
  }

  return {
    can,
    canAny,
    canAll,
    canStage,
    canEditStage,
    isDoerForStage,
    getStageActions,
    getViewableStages,
    getEditableStages,
    isSuperAdmin,
    isAdmin,
    permissions: perms,
    roles,
    stagePermissions,
  };
}
