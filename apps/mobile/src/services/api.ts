import { API_BASE_URL } from '../config';
import { tokenService } from './token';

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await tokenService.getToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 401) {
    await tokenService.clear();
    throw new Error('Session expirée');
  }
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`API ${res.status}: ${txt}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}