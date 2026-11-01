import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { fetchNearbyStations, Station } from '../../services/stations';
import { geocode, GeocodingResult } from '../../services/geocoding';

let MapView: any = null;
let Marker: any = null;
if (Platform.OS !== 'web') {
  const RNMaps = require('react-native-maps');
  MapView = RNMaps.default;
  Marker = RNMaps.Marker;
}

export default function MapScreen() {
  const mapRef = useRef<any>(null);
  const [center, setCenter] = useState({ latitude: 48.8566, longitude: 2.3522 });
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);

  // Pour éviter de spammer l'API OCM quand on bouge la carte
  const lastLoadedCenter = useRef<{ latitude: number; longitude: number } | null>(null);
  const lastLoadedDelta = useRef<number>(0.3);
  const loadTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load(lat: number, lon: number, radiusKm: number = 20) {
    setLoading(true);
    try {
      const found = await fetchNearbyStations(lat, lon, radiusKm, 100);
      setStations(found);
      lastLoadedCenter.current = { latitude: lat, longitude: lon };
    } catch (e) {
      console.warn('[stations]', e);
    } finally {
      setLoading(false);
    }
  }

  async function loadLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      load(center.latitude, center.longitude);
      return;
    }
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const p = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    setCenter(p);
    mapRef.current?.animateToRegion(
      { ...p, latitudeDelta: 0.2, longitudeDelta: 0.2 },
      600
    );
    load(p.latitude, p.longitude);
  }

  useEffect(() => {
    loadLocation();
  }, []);

  async function search() {
    if (query.trim().length < 3) return;
    const results = await geocode(query, {
      lat: center.latitude,
      lon: center.longitude,
    });
    setSuggestions(results);
  }

  function pick(s: GeocodingResult) {
    setQuery('');
    setSuggestions([]);
    const p = { latitude: s.latitude, longitude: s.longitude };
    setCenter(p);
    mapRef.current?.animateToRegion(
      { ...p, latitudeDelta: 0.15, longitudeDelta: 0.15 },
      600
    );
    load(p.latitude, p.longitude);
  }

  // ⭐ NOUVEAU : recharger les bornes quand la carte se déplace
  function handleRegionChangeComplete(region: any) {
    const newCenter = {
      latitude: region.latitude,
      longitude: region.longitude,
    };
    const delta = region.latitudeDelta;

    // Calcule le rayon de recherche en km selon le zoom (approximation)
    // 1° de latitude ≈ 111 km
    const radiusKm = Math.max(5, Math.min(50, (delta * 111) / 2));

    // Vérifie si on a bougé ou zoomé de manière significative
    const last = lastLoadedCenter.current;
    const lastDelta = lastLoadedDelta.current;

    if (last) {
      const latDiff = Math.abs(newCenter.latitude - last.latitude);
      const lonDiff = Math.abs(newCenter.longitude - last.longitude);
      const deltaRatio = Math.abs(delta - lastDelta) / lastDelta;

      // Seuil : ~1 km de déplacement OU 30% de changement de zoom
      const movedEnough = latDiff > 0.01 || lonDiff > 0.01;
      const zoomedEnough = deltaRatio > 0.3;

      if (!movedEnough && !zoomedEnough) {
        return; // rien à recharger
      }
    }

    // Debounce : on attend 600 ms que l'utilisateur arrête de bouger
    if (loadTimeout.current) clearTimeout(loadTimeout.current);
    loadTimeout.current = setTimeout(() => {
      lastLoadedDelta.current = delta;
      setCenter(newCenter);
      load(newCenter.latitude, newCenter.longitude, radiusKm);
    }, 600);
  }

  function renderWebMap() {
    const lats = stations.map((s) => s.latitude);
    const lons = stations.map((s) => s.longitude);
    const minLat = lats.length ? Math.min(...lats) : 0;
    const maxLat = lats.length ? Math.max(...lats) : 1;
    const minLon = lons.length ? Math.min(...lons) : 0;
    const maxLon = lons.length ? Math.max(...lons) : 1;
    const latRange = maxLat - minLat || 1;
    const lonRange = maxLon - minLon || 1;

    return (
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={['#052e16', '#0a2818', '#050a08']}
          style={StyleSheet.absoluteFill}
        />

        {[...Array(8)].map((_, i) => (
          <View
            key={`h${i}`}
            style={[
              styles.gridLine,
              { top: `${(i + 1) * 11}%`, left: 0, right: 0, height: 1 },
            ]}
          />
        ))}
        {[...Array(6)].map((_, i) => (
          <View
            key={`v${i}`}
            style={[
              styles.gridLine,
              { left: `${(i + 1) * 14}%`, top: 0, bottom: 0, width: 1 },
            ]}
          />
        ))}

        {stations.map((s) => {
          const left = ((s.longitude - minLon) / lonRange) * 100;
          const top = ((maxLat - s.latitude) / latRange) * 100;
          return (
            <View
              key={s.id}
              style={[styles.stationDot, { left: `${left}%`, top: `${top}%` }]}
            />
          );
        })}

        <View style={styles.webMapBadge}>
          <Text style={styles.webMapBadgeText}>
            🗺️ {stations.length} bornes affichées · Carte interactive sur mobile
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {MapView ? (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={{ ...center, latitudeDelta: 0.3, longitudeDelta: 0.3 }}
          showsUserLocation
          onRegionChangeComplete={handleRegionChangeComplete}
        >
          {stations.map((s) => (
            <Marker
              key={s.id}
              coordinate={{ latitude: s.latitude, longitude: s.longitude }}
              title={s.name}
              description={s.powerKW ? `${s.powerKW} kW` : 'Borne'}
            />
          ))}
        </MapView>
      ) : (
        renderWebMap()
      )}

      <SafeAreaView edges={['top']} style={styles.topBar} pointerEvents="box-none">
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Ville, adresse…"
            placeholderTextColor="#94a3b8"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={search}
            returnKeyType="search"
          />
          <Pressable style={styles.locBtn} onPress={loadLocation}>
            <Text style={{ fontSize: 18 }}>📍</Text>
          </Pressable>
        </View>

        {suggestions.length > 0 && (
          <View style={styles.suggestions}>
            {suggestions.map((s, i) => (
              <Pressable key={i} style={styles.sugItem} onPress={() => pick(s)}>
                <Text numberOfLines={1} style={{ fontSize: 13 }}>
                  {s.displayName}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.badge}>
          {loading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator color="#22c55e" size="small" />
              <Text style={{ marginLeft: 8, fontSize: 12 }}>Chargement…</Text>
            </View>
          ) : (
            <Text style={{ fontWeight: '600', fontSize: 13 }}>
              ⚡ {stations.length} bornes
            </Text>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, padding: 12 },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  locBtn: {
    backgroundColor: '#22c55e',
    width: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestions: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginTop: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sugItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  badge: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(34,197,94,0.08)',
  },
  stationDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    marginLeft: -6,
    marginTop: -6,
    shadowColor: '#22c55e',
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    borderWidth: 1,
    borderColor: '#4ade80',
  },
  webMapBadge: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(34,197,94,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  webMapBadgeText: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});