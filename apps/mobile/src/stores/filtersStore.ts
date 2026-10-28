import { create } from 'zustand';

export type Filters = {
  minPowerKW: number; // 0 = pas de filtre
};

type FiltersStore = {
  filters: Filters;
  setMinPower: (kw: number) => void;
  reset: () => void;
};

const INITIAL: Filters = {
  minPowerKW: 0,
};

export const useFiltersStore = create<FiltersStore>((set) => ({
  filters: INITIAL,
  setMinPower: (kw) => set({ filters: { minPowerKW: kw } }),
  reset: () => set({ filters: INITIAL }),
}));

/**
 * Applique le filtre de puissance à une liste de bornes.
 */
export function applyFilters<T extends { powerKW?: number }>(
  stations: T[],
  filters: Filters
): T[] {
  return stations.filter((s) => {
    if (filters.minPowerKW > 0) {
      if (!s.powerKW || s.powerKW < filters.minPowerKW) return false;
    }
    return true;
  });
}