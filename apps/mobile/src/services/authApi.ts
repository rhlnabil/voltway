import { apiFetch } from './apiClient';
import { tokenService } from './tokenService';

export type AuthResponse = {
  token: string;
  userId: number;
  name: string;
  email: string;
};

async function persist(response: AuthResponse) {
  await tokenService.saveToken(response.token);
  await tokenService.saveUser({
    userId: response.userId,
    name: response.name,
    email: response.email,
  });
}

export const authApi = {
  register: async (email: string, password: string, name: string) => {
    const res = await apiFetch<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    await persist(res);
    return res;
  },

  login: async (email: string, password: string) => {
    const res = await apiFetch<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await persist(res);
    return res;
  },

  logout: () => tokenService.clear(),
};