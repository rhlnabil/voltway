import { create } from 'zustand';
import { tokenService } from '../services/token';

type AuthState = {
  isAuthenticated: boolean | null;
  userName: string;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: null,
  userName: '',
  checkAuth: async () => {
    const token = await tokenService.getToken();
    const user = await tokenService.getUser();
    set({ isAuthenticated: !!token, userName: user?.name ?? '' });
  },
  logout: async () => {
    await tokenService.clear();
    set({ isAuthenticated: false, userName: '' });
  },
}));