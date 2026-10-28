import { create } from 'zustand';

export type Vehicle = {
  modelName: string;
  autonomyKm: number;
  batteryKWh: number;
  consumptionKWh100: number;
};

type VehicleStore = {
  vehicle: Vehicle;
  setVehicle: (v: Partial<Vehicle>) => void;
};

const DEFAULT_VEHICLE: Vehicle = {
  modelName: 'Ma voiture',
  autonomyKm: 350,
  batteryKWh: 60,
  consumptionKWh100: 17,
};

export const useVehicleStore = create<VehicleStore>((set) => ({
  vehicle: DEFAULT_VEHICLE,
  setVehicle: (v) => set((s) => ({ vehicle: { ...s.vehicle, ...v } })),
}));

/**
 * Calcule les arrêts de recharge recommandés pour un trajet.
 * (Sans estimation de coût)
 */
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

  // 20% → 80% = 60% batterie, à 100 kW moyen
  const energyPerStopKWh = vehicle.batteryKWh * 0.6;
  const chargeTimePerStopMin = (energyPerStopKWh / 100) * 60;

  return {
    stopsNeeded,
    chargeTimeMin: Math.round(stopsNeeded * chargeTimePerStopMin),
    usableKm: Math.round(usableKm),
  };
}