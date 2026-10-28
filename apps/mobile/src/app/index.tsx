import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  TextInput,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { fetchNearbyStations, ChargeStation } from '../services/chargeStations';
import { geocodeAddress, GeocodingResult } from '../services/geocoding';
import { useFiltersStore, applyFilters } from '../stores/filtersStore';
import FilterPanel from '../components/FilterPanel';

const FALLBACK = { latitude: 48.8566, longitude: 2.3522, label: 'Paris, France' };

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchedRef = useRef<string>('');

  const [center, setCenter] = useState(FALLBACK);
  const [stations, setStations] = useState<ChargeStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Démarrage...');
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);

  const filters = useFiltersStore((s) => s.filters);
  const filteredStations = useMemo(
    () => applyFilters(stations, filters),
    [stations, filters]
  );
 const activeFilterCount = filters.minPowerKW > 0 ? 1 : 0;

  /**
   * Charge les bornes autour d'une région visible.
   * La distance est calculée d'après le zoom (latitudeDelta).
   */
  async function loadForRegion(r: Region, force = false) {
    // Rayon en km basé sur le zoom (≈ moitié de la hauteur visible)
    const radiusKm = Math.min(150, Math.max(5, (r.latitudeDelta * 111) / 2));

    // Clé anti-rechargement inutile (arrondi à 2 décimales ≈ 1 km)
    const key = `${r.latitude.toFixed(2)}|${r.longitude.toFixed(2)}|${radiusKm.toFixed(0)}`;
    if (!force && key === lastFetchedRef.current) return;
    lastFetchedRef.current = key;

    setLoading(true);
    setStatus(`Chargement autour de ${r.latitude.toFixed(2)}, ${r.longitude.toFixed(2)}…`);
    try {
      const found = await fetchNearbyStations(
        r.latitude,
        r.longitude,
        radiusKm,
        200
      );
      setStations(found);
      setStatus(`${found.length} borne(s) — rayon ${radiusKm.toFixed(0)} km`);
    } catch (e: any) {
      console.warn('[VoltWay] OCM:', e);
      setStatus('Erreur API');
    } finally {
      setLoading(false);
    }
  }

  // Première géoloc au lancement
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        let init = FALLBACK;

        if (status === 'granted') {
          try {
            const pos = await Promise.race([
              Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              }),
              new Promise<null>((r) => setTimeout(() => r(null), 10000)),
            ]);
            if (pos) {
              init = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                label: '📍 Ma position',
              };
            }
          } catch {}
        }

        setCenter(init);
        mapRef.current?.animateToRegion(
          {
            latitude: init.latitude,
            longitude: init.longitude,
            latitudeDelta: 0.3,
            longitudeDelta: 0.3,
          },
          600
        );
        await loadForRegion({
          latitude: init.latitude,
          longitude: init.longitude,
          latitudeDelta: 0.3,
          longitudeDelta: 0.3,
        });
      } catch (e) {
        console.error('[VoltWay] init:', e);
        setLoading(false);
      }
    })();
  }, []);

  // Rechargement à chaque déplacement/zoom (debounce 1.5s)
  function onRegionChangeComplete(r: Region) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadForRegion(r);
    }, 1500);
  }

  // Recherche d'adresse
  async function onSearchChange(t: string) {
    setSearchQuery(t);
    if (t.trim().length < 3) return setSuggestions([]);
    try {
      setSuggestions(await geocodeAddress(t));
    } catch {}
  }

  async function selectSuggestion(s: GeocodingResult) {
    setSearchQuery('');
    setSuggestions([]);
    Keyboard.dismiss();
    const region: Region = {
      latitude: s.latitude,
      longitude: s.longitude,
      latitudeDelta: 0.2,
      longitudeDelta: 0.2,
    };
    mapRef.current?.animateToRegion(region, 700);
    setCenter({ ...s, label: s.displayName.split(',').slice(0, 2).join(', ') });
    await loadForRegion(region, true);
  }

  async function goToMyLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return setStatus('Permission refusée');
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const region: Region = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.2,
        longitudeDelta: 0.2,
      };
      mapRef.current?.animateToRegion(region, 600);
      setCenter({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        label: '📍 Ma position',
      });
      setSearchQuery('');
      setSuggestions([]);
      await loadForRegion(region, true);
    } catch {
      setStatus('Erreur de localisation');
    }
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: center.latitude,
          longitude: center.longitude,
          latitudeDelta: 0.3,
          longitudeDelta: 0.3,
        }}
        showsUserLocation
        showsCompass
        onRegionChangeComplete={onRegionChangeComplete}
      >
        {filteredStations.map((s) => (
          <Marker
            key={s.id}
            coordinate={{ latitude: s.latitude, longitude: s.longitude }}
            title={s.name}
            description={
              s.powerKW
                ? `${s.powerKW} kW — ${s.connectors?.join(', ') ?? ''}`
                : 'Borne'
            }
          />
        ))}
      </MapView>

      <SafeAreaView edges={['top']} style={styles.topBar} pointerEvents="box-none">
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Ville, adresse, pays…"
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={onSearchChange}
          />
          <Pressable style={styles.locBtn} onPress={goToMyLocation}>
            <Text style={{ fontSize: 20 }}>📍</Text>
          </Pressable>
        </View>

        {suggestions.length > 0 && (
          <View style={styles.suggestions}>
            {suggestions.map((s, i) => (
              <Pressable
                key={`s-${i}`}
                style={styles.suggestion}
                onPress={() => selectSuggestion(s)}
              >
                <Text style={styles.suggestionText} numberOfLines={2}>
                  {s.displayName}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.badge}>
          <Text style={styles.badgeLabel} numberOfLines={1}>
            📍 {center.label}
          </Text>
          <Text style={styles.badgeCount}>
            ⚡ {filteredStations.length}
            {filteredStations.length !== stations.length
              ? ` / ${stations.length}`
              : ''}
          </Text>
        </View>

        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#22c55e" size="small" />
            <Text style={styles.loadingText}>{status}</Text>
          </View>
        )}
      </SafeAreaView>

      <Pressable style={styles.filterBtn} onPress={() => setShowFilters(true)}>
        <Text style={styles.filterBtnText}>🎛️ Filtres</Text>
        {activeFilterCount > 0 && (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
          </View>
        )}
      </Pressable>

      <FilterPanel
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        resultCount={filteredStations.length}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  locBtn: {
    backgroundColor: '#22c55e',
    width: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestions: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxHeight: 220,
    overflow: 'hidden',
  },
  suggestion: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  suggestionText: { fontSize: 13, color: '#0f172a' },
  badge: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  badgeLabel: { fontSize: 12, fontWeight: '600', color: '#334155', marginBottom: 2 },
  badgeCount: { fontSize: 13, fontWeight: '700', color: '#16a34a' },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    alignSelf: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  loadingText: { marginLeft: 8, fontSize: 12, color: '#475569' },
  filterBtn: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
  },
  filterBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  filterBadge: {
    marginLeft: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  filterBadgeText: { color: '#22c55e', fontWeight: '800', fontSize: 11 },
});