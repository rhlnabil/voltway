import { API_BASE_URL } from '../config';

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  console.log(`[API] ${options.method ?? 'GET'} ${url}`);

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
    });

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

/**
 * Vérifie que le backend est joignable.
 */
export async function pingBackend(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/vehicles?userId=1`, {
      method: 'GET',
    });
    return res.status < 500;
  } catch {
    return false;
  }
}