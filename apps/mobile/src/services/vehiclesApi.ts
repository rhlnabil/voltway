import { apiFetch } from './apiClient';
import { TEMP_USER_ID } from '../config';

export type Vehicle = {
  id: number;
  userId: number;
  modelName: string;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  imageUrl?: string | null;
  autonomyKm: number;
  batteryKwh: number;
  isDefault: boolean;
};

export const vehiclesApi = {
  list: () => apiFetch<Vehicle[]>(`/api/vehicles?userId=${TEMP_USER_ID}`),

  create: (payload: {
    modelName: string;
    brand?: string;
    model?: string;
    year?: number;
    imageUrl?: string;
    autonomyKm: number;
    batteryKwh: number;
  }) =>
    apiFetch<Vehicle>('/api/vehicles', {
      method: 'POST',
      body: JSON.stringify({ userId: TEMP_USER_ID, ...payload }),
    }),

  delete: (id: number) =>
    apiFetch<void>(`/api/vehicles/${id}`, { method: 'DELETE' }),
};