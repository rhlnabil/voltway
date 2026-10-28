import { apiFetch } from './apiClient';

export type CarImageResponse = {
  found: boolean;
  imageUrl: string;
};

export const carImagesApi = {
  find: (make: string, model: string, year?: number) => {
    const params = new URLSearchParams();
    params.append('make', make);
    params.append('model', model);
    if (year) params.append('year', String(year));

    return apiFetch<CarImageResponse>(`/api/car-images?${params.toString()}`);
  },
};