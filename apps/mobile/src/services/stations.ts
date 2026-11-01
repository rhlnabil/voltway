import { OCM_API_KEY } from '../config';

export type Station = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  powerKW?: number;
  connectors?: string[];
};

export async function fetchNearbyStations(
  lat: number,
  lon: number,
  distanceKm: number = 30,
  maxResults: number = 150
): Promise<Station[]> {
  const url =
    `https://api.openchargemap.io/v3/poi/?output=json` +
    `&latitude=${lat}&longitude=${lon}` +
    `&distance=${distanceKm}&distanceunit=KM` +
    `&maxresults=${maxResults}&compact=true&verbose=false&key=${OCM_API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`OCM ${res.status}`);
  const data = await res.json();

  return data
    .map((item: any) => ({
      id: item.ID,
      name: item.AddressInfo?.Title ?? 'Borne',
      latitude: item.AddressInfo?.Latitude,
      longitude: item.AddressInfo?.Longitude,
      powerKW: item.Connections?.[0]?.PowerKW,
      connectors: (item.Connections ?? [])
        .map((c: any) => c.ConnectionType?.Title)
        .filter(Boolean),
    }))
    .filter((s: any) => s.latitude && s.longitude);
}