import { API_BASE_URL } from '../config';
import { tokenService } from './tokenService';

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await tokenService.getToken();
  const url = `${API_BASE_URL}${path}`;

  console.log(`[API] ${options.method ?? 'GET'} ${url}`);

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });

    if (res.status === 401) {
      await tokenService.clear();
      throw new Error('Session expirée — reconnecte-toi');
    }

    if (!res.ok) {
      const text = await res.text();
      console.error(`[API] ${res.status} ${text}`);
      throw new Error(`API ${res.status}: ${text}`);
    }

    if (res.status === 204) return undefined as T;
    const data = await res.json();
    console.log(`[API] ✓ ${path}`, data);
    return data;
  } catch (e: any) {
    console.error(`[API] ✗ ${path}`, e.message);
    throw e;
  }
}

export async function pingBackend(): Promise<boolean> {
  try {
    const token = await tokenService.getToken();
    const res = await fetch(`${API_BASE_URL}/api/vehicles`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.status < 500;
  } catch {
    return false;
  }
}