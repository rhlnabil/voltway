export type ChargeStation = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  powerKW?: number;
  connectors?: string[];
  address?: string;
};

const OCM_API_KEY = 'ccf0c047-59a5-4169-b4dd-d38682a67862';
const BASE_URL = 'https://api.openchargemap.io/v3/poi/';

export async function fetchNearbyStations(
  latitude: number,
  longitude: number,
  distanceKm: number = 30,
  maxResults: number = 150
): Promise<ChargeStation[]> {
  const url =
    `${BASE_URL}?output=json` +
    `&latitude=${latitude}&longitude=${longitude}` +
    `&distance=${distanceKm}&distanceunit=KM` +
    `&maxresults=${maxResults}` +
    `&compact=true&verbose=false&key=${OCM_API_KEY}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`OCM API error: ${response.status}`);
  const data = await response.json();

  return data
    .map((item: any) => ({
      id: item.ID,
      name: item.AddressInfo?.Title ?? 'Borne sans nom',
      latitude: item.AddressInfo?.Latitude,
      longitude: item.AddressInfo?.Longitude,
      powerKW: item.Connections?.[0]?.PowerKW,
      connectors: (item.Connections ?? [])
        .map((c: any) => c.ConnectionType?.Title)
        .filter(Boolean),
      address: item.AddressInfo?.AddressLine1,
    }))
    .filter((s: any) => s.latitude && s.longitude);
}