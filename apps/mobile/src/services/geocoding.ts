import { GEOAPIFY_API_KEY, LOCATIONIQ_API_KEY } from '../config';

export type GeocodingResult = {
  displayName: string;
  latitude: number;
  longitude: number;
  type?: string;
  importance?: number;
};

const GEOAPIFY_URL = 'https://api.geoapify.com/v1/geocode/search';
const LOCATIONIQ_URL = 'https://us1.locationiq.com/v1/search';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

/**
 * Recherche d'adresse avec système de fallback :
 * 1. Geoapify (prioritaire, 3000 req/jour gratuites)
 * 2. LocationIQ (fallback, 5000 req/jour gratuites)
 * 3. Nominatim (dernier recours, sans clé)
 */
export async function geocodeAddress(
  query: string,
  nearLat?: number,
  nearLon?: number
): Promise<GeocodingResult[]> {
  if (!query.trim()) return [];

  // 1) Geoapify
  if (GEOAPIFY_API_KEY) {
    try {
      const results = await searchGeoapify(query, nearLat, nearLon);
      if (results.length > 0) return results;
      console.log('[geocoding] Geoapify: 0 résultat, on tente LocationIQ');
    } catch (e) {
      console.warn('[geocoding] Geoapify error:', e);
    }
  }

  // 2) LocationIQ
  if (LOCATIONIQ_API_KEY) {
    try {
      const results = await searchLocationIQ(query, nearLat, nearLon);
      if (results.length > 0) return results;
      console.log('[geocoding] LocationIQ: 0 résultat, on tente Nominatim');
    } catch (e) {
      console.warn('[geocoding] LocationIQ error:', e);
    }
  }

  // 3) Nominatim
  return searchNominatim(query, nearLat, nearLon);
}

// --- Geoapify ---
async function searchGeoapify(
  query: string,
  nearLat?: number,
  nearLon?: number
): Promise<GeocodingResult[]> {
  const params = new URLSearchParams({
    text: query.trim(),
    apiKey: GEOAPIFY_API_KEY,
    limit: '8',
    lang: 'fr',
  });

  // Biais géographique : priorise les résultats autour de la position
  if (nearLat !== undefined && nearLon !== undefined) {
    params.append('bias', `proximity:${nearLon},${nearLat}`);
  }

  const url = `${GEOAPIFY_URL}?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Geoapify error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.features || data.features.length === 0) return [];

  return data.features.map((f: any) => ({
    displayName: f.properties.formatted,
    latitude: f.properties.lat,
    longitude: f.properties.lon,
    type: f.properties.result_type,
    importance: f.properties.rank?.confidence,
  }));
}

// --- LocationIQ ---
async function searchLocationIQ(
  query: string,
  nearLat?: number,
  nearLon?: number
): Promise<GeocodingResult[]> {
  const params = new URLSearchParams({
    key: LOCATIONIQ_API_KEY,
    q: query.trim(),
    format: 'json',
    limit: '8',
    addressdetails: '1',
    'accept-language': 'fr',
  });

  // Biais (viewbox + bounded)
  if (nearLat !== undefined && nearLon !== undefined) {
    const delta = 0.7;
    params.append(
      'viewbox',
      `${nearLon - delta},${nearLat - delta},${nearLon + delta},${nearLat + delta}`
    );
    params.append('bounded', '0');
  }

  const url = `${LOCATIONIQ_URL}?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`LocationIQ error: ${response.status}`);
  }

  const data = await response.json();
  return data.map((item: any) => ({
    displayName: item.display_name,
    latitude: parseFloat(item.lat),
    longitude: parseFloat(item.lon),
    type: item.type,
    importance: item.importance,
  }));
}

// --- Nominatim (dernier recours) ---
async function searchNominatim(
  query: string,
  nearLat?: number,
  nearLon?: number
): Promise<GeocodingResult[]> {
  try {
    const params = new URLSearchParams({
      q: query.trim(),
      format: 'json',
      limit: '8',
      addressdetails: '1',
      'accept-language': 'fr,ar,en',
    });

    if (nearLat !== undefined && nearLon !== undefined) {
      const delta = 0.7;
      params.append(
        'viewbox',
        `${nearLon - delta},${nearLat - delta},${nearLon + delta},${nearLat + delta}`
      );
      params.append('bounded', '0');
    }

    const url = `${NOMINATIM_URL}?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'VoltWay/1.0 (contact@voltway.app)',
      },
    });

    if (!response.ok) return [];

    const data = await response.json();
    return data.map((item: any) => ({
      displayName: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      type: item.type,
      importance: item.importance,
    }));
  } catch (e) {
    console.warn('[geocoding] Nominatim error:', e);
    return [];
  }
}