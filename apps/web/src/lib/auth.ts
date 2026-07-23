'use client';

const TOKEN_KEY = 'ifh_token';
const USER_KEY = 'ifh_user';

export interface StagePermissions {
  canView: boolean;
  canEdit: boolean;
  canApprove: boolean;
  canHold: boolean;
  canReject: boolean;
  canBulkUpdate: boolean;
  canExport: boolean;
  canReassign: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  employeeId?: string;
  designation?: string;
  departmentId?: string;
  phone?: string;
  profileImage?: string;
  alternatePhone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  company?: string;
  joiningDate?: string;
  Department?: { name: string };
  roles: string[];
  permissions: string[];
  /** Maps stage number (as string key) to per-action booleans */
  stagePermissions?: Record<string, StagePermissions>;
  passwordChangedAt?: string | null;
  createdAt?: string;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveAuth(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken() && !!getUser();
}

export function hasRole(role: string): boolean {
  const user = getUser();
  if (!user) return false;
  const r = role.toUpperCase();
  return user.roles.some(
    (ur) => ur.toUpperCase() === r || ur.toUpperCase().includes(r)
  );
}

export function isSuperAdmin(): boolean {
  return hasRole('SUPER_ADMIN') || hasRole('SUPER ADMIN') || hasRole('ADMIN');
}

export function hasPermission(permission: string): boolean {
  if (isSuperAdmin()) return true;
  const user = getUser();
  if (!user) return false;
  return user.permissions.includes(permission);
}
