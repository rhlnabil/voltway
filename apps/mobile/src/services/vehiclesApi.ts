import { apiFetch } from './apiClient';
import { TEMP_USER_ID } from '../config';

export type Vehicle = {
  id: number;
  userId: number;
  modelName: string;
  autonomyKm: number;
  batteryKwh: number;
  isDefault: boolean;
};

export const vehiclesApi = {
  list: () =>
    apiFetch<Vehicle[]>(`/api/vehicles?userId=${TEMP_USER_ID}`),

  create: (payload: {
    modelName: string;
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