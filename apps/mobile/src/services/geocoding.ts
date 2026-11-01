import { GEOAPIFY_API_KEY } from '../config';

export type GeocodingResult = {
  displayName: string;
  latitude: number;
  longitude: number;
};

export async function geocode(
  query: string,
  near?: { lat: number; lon: number }
): Promise<GeocodingResult[]> {
  if (!query.trim()) return [];

  try {
    const params = new URLSearchParams({
      text: query,
      apiKey: GEOAPIFY_API_KEY,
      limit: '8',
      lang: 'fr',
    });
    if (near) params.append('bias', `proximity:${near.lon},${near.lat}`);

    const res = await fetch(
      `https://api.geoapify.com/v1/geocode/search?${params}`
    );
    if (!res.ok) throw new Error(`Geoapify ${res.status}`);
    const data = await res.json();

    return (data.features ?? []).map((f: any) => ({
      displayName: f.properties.formatted,
      latitude: f.properties.lat,
      longitude: f.properties.lon,
    }));
  } catch (e) {
    console.warn('[geocode] fallback', e);
    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        limit: '8',
        'accept-language': 'fr',
      });
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        { headers: { 'User-Agent': 'VoltWay/2.0' } }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((i: any) => ({
        displayName: i.display_name,
        latitude: parseFloat(i.lat),
        longitude: parseFloat(i.lon),
      }));
    } catch {
      return [];
    }
  }
}