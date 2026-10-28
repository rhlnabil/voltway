export type RouteResult = {
  distanceMeters: number;
  durationSeconds: number;
  coordinates: { latitude: number; longitude: number }[];
};

const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

/**
 * Calcule un itinéraire routier entre 2 points (OSRM, gratuit).
 */
export async function getRoute(
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number }
): Promise<RouteResult | null> {
  const coords = `${start.longitude},${start.latitude};${end.longitude},${end.latitude}`;
  const url = `${OSRM_URL}/${coords}?overview=full&geometries=geojson`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OSRM error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.routes || data.routes.length === 0) return null;

  const route = data.routes[0];
  return {
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    coordinates: route.geometry.coordinates.map(([lon, lat]: [number, number]) => ({
      latitude: lat,
      longitude: lon,
    })),
  };
}