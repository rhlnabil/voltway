import { apiFetch } from './apiClient';
import { TEMP_USER_ID } from '../config';

export type TripStationDto = {
  ocmStationId: number;
  stationName: string;
  latitude: number;
  longitude: number;
  powerKw?: number;
  distanceFromStartKm: number;
  orderIndex: number;
};

export type TripDto = {
  id: number;
  startLabel: string;
  endLabel: string;
  distanceKm: number;
  durationS: number;
  stopsNeeded: number;
  createdAt: string;
  stations?: TripStationDto[];
};

export const tripsApi = {
  list: () => apiFetch<TripDto[]>(`/api/trips?userId=${TEMP_USER_ID}`),

  get: (id: number) => apiFetch<TripDto>(`/api/trips/${id}`),

  create: (payload: {
    vehicleId?: number;
    startLabel: string;
    startLat: number;
    startLon: number;
    endLabel: string;
    endLat: number;
    endLon: number;
    distanceKm: number;
    durationS: number;
    stopsNeeded: number;
    stations: TripStationDto[];
  }) =>
    apiFetch<TripDto>('/api/trips', {
      method: 'POST',
      body: JSON.stringify({ userId: TEMP_USER_ID, ...payload }),
    }),

  delete: (id: number) =>
    apiFetch<void>(`/api/trips/${id}`, { method: 'DELETE' }),
};