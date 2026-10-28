export type GeocodingResult = {
  displayName: string;
  latitude: number;
  longitude: number;
};

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

/**
 * Recherche une adresse (Nominatim / OSM, gratuit, sans clé).
 */
export async function geocodeAddress(query: string): Promise<GeocodingResult[]> {
  if (!query.trim()) return [];

  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=0`;

  const response = await fetch(url, {
    headers: {
      // Nominatim exige un User-Agent identifiable
      'User-Agent': 'VoltWay/1.0 (contact@voltway.app)',
      'Accept-Language': 'fr',
    },
  });

  if (!response.ok) {
    throw new Error(`Nominatim error: ${response.status}`);
  }

  const data = await response.json();
  return data.map((item: any) => ({
    displayName: item.display_name,
    latitude: parseFloat(item.lat),
    longitude: parseFloat(item.lon),
  }));
}