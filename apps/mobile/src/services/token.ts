import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'voltway_token';
const USER_KEY = 'voltway_user';

export type StoredUser = { userId: number; name: string; email: string };

export const tokenService = {
  saveToken: (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token),
  getToken: () => SecureStore.getItemAsync(TOKEN_KEY),
  saveUser: (user: StoredUser) => SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
  getUser: async (): Promise<StoredUser | null> => {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  clear: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  },
};