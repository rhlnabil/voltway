import { create } from 'zustand';

export type Filters = {
  minPowerKW: number;          // 0 = pas de filtre
  connectorTypes: string[];    // [] = tous les connecteurs
};

type FiltersStore = {
  filters: Filters;
  setMinPower: (kw: number) => void;
  toggleConnector: (type: string) => void;
  reset: () => void;
};

const INITIAL: Filters = {
  minPowerKW: 0,
  connectorTypes: [],
};

export const useFiltersStore = create<FiltersStore>((set) => ({
  filters: INITIAL,
  setMinPower: (kw) =>
    set((s) => ({ filters: { ...s.filters, minPowerKW: kw } })),
  toggleConnector: (type) =>
    set((s) => {
      const has = s.filters.connectorTypes.includes(type);
      return {
        filters: {
          ...s.filters,
          connectorTypes: has
            ? s.filters.connectorTypes.filter((t) => t !== type)
            : [...s.filters.connectorTypes, type],
        },
      };
    }),
  reset: () => set({ filters: INITIAL }),
}));

/**
 * Applique les filtres à une liste de bornes.
 */
export function applyFilters<T extends {
  powerKW?: number;
  connectors?: string[];
}>(stations: T[], filters: Filters): T[] {
  return stations.filter((s) => {
    // Filtre puissance
    if (filters.minPowerKW > 0) {
      if (!s.powerKW || s.powerKW < filters.minPowerKW) return false;
    }
    // Filtre connecteurs
    if (filters.connectorTypes.length > 0) {
      const stationTypes = (s.connectors ?? []).map((c) => c.toLowerCase());
      const hasOne = filters.connectorTypes.some((t) =>
        stationTypes.some((st) => st.includes(t.toLowerCase()))
      );
      if (!hasOne) return false;
    }
    return true;
  });
}