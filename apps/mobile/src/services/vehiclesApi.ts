import { apiFetch } from './apiClient';

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
  list: () => apiFetch<Vehicle[]>('/api/vehicles'),

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
      body: JSON.stringify(payload),
    }),

  delete: (id: number) =>
    apiFetch<void>(`/api/vehicles/${id}`, { method: 'DELETE' }),
};