import { ChargeStation, fetchNearbyStations } from './chargeStations';

export type RouteStation = ChargeStation & {
  distanceFromStartKm: number;
};

function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function samplePolyline(
  points: { latitude: number; longitude: number }[],
  stepKm: number
): { latitude: number; longitude: number; distanceKm: number }[] {
  if (points.length === 0) return [];
  const samples = [{ ...points[0], distanceKm: 0 }];
  let cum = 0;
  let lastSampledKm = 0;

  for (let i = 1; i < points.length; i++) {
    cum += haversineKm(points[i - 1], points[i]);
    if (cum - lastSampledKm >= stepKm) {
      samples.push({ ...points[i], distanceKm: cum });
      lastSampledKm = cum;
    }
  }

  const last = points[points.length - 1];
  if (samples[samples.length - 1].distanceKm < cum - 1) {
    samples.push({ ...last, distanceKm: cum });
  }
  return samples;
}

const MAX_PER_SAMPLE = 10; // ⬅️ Réduit de 50 à 10 pour éviter qu'une ville écrase tout

export async function fetchStationsAlongRoute(
  coordinates: { latitude: number; longitude: number }[],
  corridorKm: number = 15,
  stepKm: number = 40
): Promise<RouteStation[]> {
  // Calcul de la distance totale
  let totalKm = 0;
  for (let i = 1; i < coordinates.length; i++) {
    totalKm += haversineKm(coordinates[i - 1], coordinates[i]);
  }

  // Force au moins 6 échantillons (utile pour trajets courts)
  const adjustedStep = Math.min(stepKm, Math.max(5, totalKm / 6));

  const samples = samplePolyline(coordinates, adjustedStep);

  console.log(
    `[routeStations] total=${totalKm.toFixed(1)}km · step=${adjustedStep.toFixed(1)}km · samples=${samples.length}`
  );
  console.log(
    '[routeStations] distances:',
    samples.map((s) => `${s.distanceKm.toFixed(0)}km`).join(' | ')
  );

  const seen = new Map<number, RouteStation>();

  for (const pt of samples) {
    try {
      const stations = await fetchNearbyStations(
        pt.latitude,
        pt.longitude,
        corridorKm,
        MAX_PER_SAMPLE
      );
      console.log(
        `[routeStations] @${pt.distanceKm.toFixed(0)}km → ${stations.length} stations`
      );
      for (const s of stations) {
        if (!seen.has(s.id)) {
          seen.set(s.id, { ...s, distanceFromStartKm: pt.distanceKm });
        }
      }
      await new Promise((r) => setTimeout(r, 250));
    } catch (e) {
      console.warn('[routeStations] sample failed:', e);
    }
  }

  console.log(`[routeStations] Total unique: ${seen.size}`);

  return Array.from(seen.values()).sort(
    (a, b) => a.distanceFromStartKm - b.distanceFromStartKm
  );
}