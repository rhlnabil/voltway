import { create } from 'zustand';
import { vehiclesApi } from '../services/vehiclesApi';

export type Vehicle = {
  modelName: string;
  autonomyKm: number;
  batteryKWh: number;
  consumptionKWh100: number;
};

type VehicleStore = {
  vehicle: Vehicle;
  loading: boolean;
  loaded: boolean;
  setVehicle: (v: Partial<Vehicle>) => void;
  loadFromBackend: () => Promise<void>;
};

const DEFAULT_VEHICLE: Vehicle = {
  modelName: 'Ma voiture',
  autonomyKm: 350,
  batteryKWh: 60,
  consumptionKWh100: 17,
};

export const useVehicleStore = create<VehicleStore>((set, get) => ({
  vehicle: DEFAULT_VEHICLE,
  loading: false,
  loaded: false,

  setVehicle: (v) => set((s) => ({ vehicle: { ...s.vehicle, ...v } })),

  loadFromBackend: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const list = await vehiclesApi.list();
      if (list.length > 0) {
        const v = list[0];
        console.log('[vehicleStore] Véhicule chargé depuis BDD:', v.brand, v.model);
        set({
          vehicle: {
            modelName: v.modelName || 'Ma voiture',
            autonomyKm: v.autonomyKm || 350,
            batteryKWh: v.batteryKwh || 60,
            consumptionKWh100: 17,
          },
          loaded: true,
        });
      } else {
        console.log('[vehicleStore] Aucun véhicule en BDD, on garde le défaut');
      }
    } catch (e) {
      console.warn('[vehicleStore] loadFromBackend error:', e);
    } finally {
      set({ loading: false });
    }
  },
}));

export function computeChargingStops(
  distanceKm: number,
  vehicle: Vehicle
): {
  stopsNeeded: number;
  chargeTimeMin: number;
  usableKm: number;
} {
  const usableKm = vehicle.autonomyKm * 0.8;
  const stopsNeeded =
    distanceKm <= usableKm ? 0 : Math.ceil(distanceKm / usableKm) - 1;

  const energyPerStopKWh = vehicle.batteryKWh * 0.6;
  const chargeTimePerStopMin = (energyPerStopKWh / 100) * 60;

  return {
    stopsNeeded,
    chargeTimeMin: Math.round(stopsNeeded * chargeTimePerStopMin),
    usableKm: Math.round(usableKm),
  };
}