export type Route = {
  distanceMeters: number;
  durationSeconds: number;
  coordinates: { latitude: number; longitude: number }[];
};

export async function getRoute(
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number }
): Promise<Route | null> {
  const coords = `${start.longitude},${start.latitude};${end.longitude},${end.latitude}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const data = await res.json();
  if (!data.routes?.length) return null;

  const r = data.routes[0];
  return {
    distanceMeters: r.distance,
    durationSeconds: r.duration,
    coordinates: r.geometry.coordinates.map(
      ([lon, lat]: [number, number]) => ({ latitude: lat, longitude: lon })
    ),
  };
}