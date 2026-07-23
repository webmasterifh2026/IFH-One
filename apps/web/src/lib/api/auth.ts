import { apiFetch } from './fetch';
import { saveAuth, clearAuth, getToken, type AuthUser } from '@/lib/auth';

export async function login(
  email: string,
  password: string
): Promise<{ user: AuthUser; access_token: string }> {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  saveAuth(data.access_token, data.user);
  return data;
}

export async function logout() {
  const token = getToken();
  if (token) {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      /* ignore */
    }
  }
  clearAuth();
}

export async function getMe(): Promise<AuthUser> {
  return apiFetch('/auth/me');
}

export async function getUsers() {
  return apiFetch('/users');
}

export async function createUser(data: any) {
  return apiFetch('/users', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateUser(id: string, data: any) {
  return apiFetch(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function changePassword(id: string, password: string) {
  return apiFetch(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ password }),
  });
}
