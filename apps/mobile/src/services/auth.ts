import { apiFetch } from './api';
import { tokenService } from './token';

export type AuthResponse = {
  token: string;
  userId: number;
  name: string;
  email: string;
};

async function persist(r: AuthResponse) {
  await tokenService.saveToken(r.token);
  await tokenService.saveUser({ userId: r.userId, name: r.name, email: r.email });
}

export const authApi = {
  register: async (email: string, password: string, name: string) => {
    const r = await apiFetch<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    await persist(r);
    return r;
  },
  login: async (email: string, password: string) => {
    const r = await apiFetch<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await persist(r);
    return r;
  },
  logout: () => tokenService.clear(),
};