import { apiFetch } from './api';

export type TripStation = {
  ocmStationId: number;
  stationName: string;
  latitude: number;
  longitude: number;
  powerKw?: number;
  distanceFromStartKm: number;
  orderIndex: number;
};

export type Trip = {
  id: number;
  startLabel: string;
  endLabel: string;
  distanceKm: number;
  durationS: number;
  stopsNeeded: number;
  createdAt: string;
  stations?: TripStation[];
};

export const tripsApi = {
  list: () => apiFetch<Trip[]>('/api/trips'),
  get: (id: number) => apiFetch<Trip>(`/api/trips/${id}`),
  delete: (id: number) =>
    apiFetch<void>(`/api/trips/${id}`, { method: 'DELETE' }),
  create: (payload: {
    startLabel: string;
    startLat: number;
    startLon: number;
    endLabel: string;
    endLat: number;
    endLon: number;
    distanceKm: number;
    durationS: number;
    stopsNeeded: number;
    stations: TripStation[];
  }) =>
    apiFetch<Trip>('/api/trips', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};