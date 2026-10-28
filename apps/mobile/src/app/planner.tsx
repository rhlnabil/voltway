import { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { geocodeAddress, GeocodingResult } from '../services/geocoding';
import { getRoute, RouteResult } from '../services/routing';
import { fetchStationsAlongRoute, RouteStation } from '../services/routeStations';
import { useVehicleStore, computeChargingStops } from '../stores/vehicleStore';
import { tripsApi } from '../services/tripsApi';

type Point = { latitude: number; longitude: number; label: string };

export default function PlannerScreen() {
  const vehicle = useVehicleStore((s) => s.vehicle);

  const [startQuery, setStartQuery] = useState('');
  const [endQuery, setEndQuery] = useState('');
  const [startSugg, setStartSugg] = useState<GeocodingResult[]>([]);
  const [endSugg, setEndSugg] = useState<GeocodingResult[]>([]);
  const [startSearching, setStartSearching] = useState(false);
  const [endSearching, setEndSearching] = useState(false);
  const [start, setStart] = useState<Point | null>(null);
  const [end, setEnd] = useState<Point | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeStations, setRouteStations] = useState<RouteStation[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [savedTripId, setSavedTripId] = useState<number | null>(null);

  const searchTimerStart = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimerEnd = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 🔍 Recherche avec debounce 400ms + biais géographique
  async function search(query: string, which: 'start' | 'end') {
    const timerRef = which === 'start' ? searchTimerStart : searchTimerEnd;
    if (timerRef.current) clearTimeout(timerRef.current);

    if (query.trim().length < 3) {
      if (which === 'start') setStartSugg([]);
      else setEndSugg([]);
      return;
    }

    timerRef.current = setTimeout(async () => {
      if (which === 'start') setStartSearching(true);
      else setEndSearching(true);

      try {
        // Biais vers la position de départ si connue
        const results = await geocodeAddress(
          query,
          start?.latitude,
          start?.longitude
        );
        if (which === 'start') setStartSugg(results);
        else setEndSugg(results);
      } catch (e) {
        console.warn('[VoltWay] geocode', e);
      } finally {
        if (which === 'start') setStartSearching(false);
        else setEndSearching(false);
      }
    }, 400);
  }

  async function useMyLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return setError('Permission refusée');
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const p: Point = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        label: '📍 Ma position',
      };
      setStart(p);
      setStartQuery('📍 Ma position');
      setStartSugg([]);
    } catch {
      setError('Position introuvable');
    }
  }

  function pick(s: GeocodingResult, which: 'start' | 'end') {
    const p: Point = {
      latitude: s.latitude,
      longitude: s.longitude,
      label: s.displayName,
    };
    if (which === 'start') {
      setStart(p);
      setStartQuery(s.displayName);
      setStartSugg([]);
    } else {
      setEnd(p);
      setEndQuery(s.displayName);
      setEndSugg([]);
    }
  }

  async function calculate() {
    if (!start || !end) return setError('Choisis un départ et une arrivée');
    setError(null);
    setRoute(null);
    setRouteStations([]);
    setSavedTripId(null);
    setLoading(true);

    try {
      // 1. Calcul de l'itinéraire (OSRM)
      setLoadingMsg('Calcul de l’itinéraire…');
      const result = await getRoute(start, end);
      if (!result) {
        setError('Aucun itinéraire trouvé');
        return;
      }
      setRoute(result);

      // 2. Recherche des bornes le long du trajet (OCM)
      setLoadingMsg('Recherche des bornes le long du trajet…');
      const stations = await fetchStationsAlongRoute(result.coordinates, 15, 40);
      setRouteStations(stations);

      // 3. Persiste le trajet en BDD
      setLoadingMsg('Sauvegarde du trajet…');
      const stopsCalc = computeChargingStops(
        result.distanceMeters / 1000,
        vehicle
      );

      try {
        const trip = await tripsApi.create({
          startLabel: start.label,
          startLat: start.latitude,
          startLon: start.longitude,
          endLabel: end.label,
          endLat: end.latitude,
          endLon: end.longitude,
          distanceKm: result.distanceMeters / 1000,
          durationS: result.durationSeconds,
          stopsNeeded: stopsCalc.stopsNeeded,
          stations: stations.slice(0, 50).map((s, idx) => ({
            ocmStationId: s.id,
            stationName: s.name,
            latitude: s.latitude,
            longitude: s.longitude,
            powerKw: s.powerKW,
            distanceFromStartKm: s.distanceFromStartKm,
            orderIndex: idx,
          })),
        });
        setSavedTripId(trip.id);
        console.log('[VoltWay] Trajet sauvegardé en BDD id=', trip.id);
      } catch (saveErr) {
        console.warn('[VoltWay] Sauvegarde trajet échouée:', saveErr);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Erreur');
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  }

  function reset() {
    setStart(null);
    setEnd(null);
    setStartQuery('');
    setEndQuery('');
    setStartSugg([]);
    setEndSugg([]);
    setRoute(null);
    setRouteStations([]);
    setError(null);
    setSavedTripId(null);
  }

  const stops = route
    ? computeChargingStops(route.distanceMeters / 1000, vehicle)
    : null;

  // 🎨 Rendu d'une suggestion (titre + sous-titre)
  function renderSuggestion(s: GeocodingResult, idx: number, which: 'start' | 'end') {
    const parts = s.displayName.split(', ');
    const title = parts.slice(0, 2).join(', ');
    const subtitle = parts.slice(2).join(', ');

    return (
      <Pressable
        key={`${which}-${idx}`}
        style={styles.sugg}
        onPress={() => pick(s, which)}
      >
        <Text style={styles.suggTitle} numberOfLines={1}>
          📍 {title}
        </Text>
        {subtitle ? (
          <Text style={styles.suggSub} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>🗺️ Planifier</Text>
          <Text style={styles.subtitle}>
            {vehicle.modelName} · {vehicle.autonomyKm} km
          </Text>

          {/* Départ */}
          <Text style={styles.label}>Départ</Text>
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              placeholder="Adresse de départ"
              value={startQuery}
              onChangeText={(t) => {
                setStartQuery(t);
                setStart(null);
                search(t, 'start');
              }}
            />
            <Pressable style={styles.locBtn} onPress={useMyLocation}>
              <Text style={{ fontSize: 20 }}>📍</Text>
            </Pressable>
          </View>
          {startSearching && (
            <View style={styles.searchingRow}>
              <ActivityIndicator color="#22c55e" size="small" />
              <Text style={styles.searchingText}>Recherche…</Text>
            </View>
          )}
          {startSugg.length > 0 && (
            <View style={styles.suggestionsBox}>
              {startSugg.map((s, i) => renderSuggestion(s, i, 'start'))}
            </View>
          )}

          {/* Arrivée */}
          <Text style={styles.label}>Arrivée</Text>
          <TextInput
            style={styles.input}
            placeholder="Adresse d'arrivée"
            value={endQuery}
            onChangeText={(t) => {
              setEndQuery(t);
              setEnd(null);
              search(t, 'end');
            }}
          />
          {endSearching && (
            <View style={styles.searchingRow}>
              <ActivityIndicator color="#22c55e" size="small" />
              <Text style={styles.searchingText}>Recherche…</Text>
            </View>
          )}
          {endSugg.length > 0 && (
            <View style={styles.suggestionsBox}>
              {endSugg.map((s, i) => renderSuggestion(s, i, 'end'))}
            </View>
          )}

          <View style={styles.actions}>
            <Pressable style={styles.resetBtn} onPress={reset}>
              <Text style={styles.resetText}>Réinitialiser</Text>
            </Pressable>
            <Pressable
              style={[
                styles.calcBtn,
                (!start || !end || loading) && styles.calcBtnDisabled,
              ]}
              onPress={calculate}
              disabled={!start || !end || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.calcText}>Calculer</Text>
              )}
            </Pressable>
          </View>

          {loading && loadingMsg ? (
            <Text style={styles.loadingMsg}>{loadingMsg}</Text>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Carte du trajet avec les bornes */}
          {route && start && end && (
            <View style={styles.mapWrap}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: (start.latitude + end.latitude) / 2,
                  longitude: (start.longitude + end.longitude) / 2,
                  latitudeDelta:
                    Math.abs(start.latitude - end.latitude) * 1.6 + 0.1,
                  longitudeDelta:
                    Math.abs(start.longitude - end.longitude) * 1.6 + 0.1,
                }}
              >
                <Polyline
                  coordinates={route.coordinates}
                  strokeColor="#22c55e"
                  strokeWidth={4}
                />
                <Marker coordinate={start} title="Départ" pinColor="#22c55e" />
                <Marker coordinate={end} title="Arrivée" pinColor="#ef4444" />
                {routeStations.map((s) => (
                  <Marker
                    key={s.id}
                    coordinate={{ latitude: s.latitude, longitude: s.longitude }}
                    title={s.name}
                    description={
                      s.powerKW
                        ? `${s.powerKW} kW · ${s.connectors?.join(', ') ?? ''}`
                        : 'Borne'
                    }
                    pinColor="#2563eb"
                  />
                ))}
              </MapView>
            </View>
          )}

          {/* Résumé */}
          {route && stops && (
            <View style={styles.result}>
              <Text style={styles.resultTitle}>📊 Résumé</Text>
              <Row
                label="Distance"
                value={`${(route.distanceMeters / 1000).toFixed(1)} km`}
              />
              <Row
                label="Durée conduite"
                value={`${Math.floor(route.durationSeconds / 3600)}h${String(
                  Math.floor((route.durationSeconds % 3600) / 60)
                ).padStart(2, '0')}`}
              />
              <View style={styles.divider} />
              <Row
                label="Bornes sur le trajet"
                value={`${routeStations.length}`}
              />
              <Row label="Arrêts recommandés" value={`${stops.stopsNeeded}`} />
              <Row label="Temps recharge" value={`${stops.chargeTimeMin} min`} />
              {savedTripId !== null && (
                <Text style={styles.savedBadge}>
                  💾 Trajet sauvegardé en BDD (id #{savedTripId})
                </Text>
              )}
            </View>
          )}

          {/* Liste des bornes du trajet */}
          {routeStations.length > 0 && (
            <View style={styles.stationsBlock}>
              <Text style={styles.resultTitle}>
                🔌 Bornes le long du trajet ({routeStations.length})
              </Text>
              {routeStations.map((s, idx) => (
                <View key={s.id} style={styles.stationCard}>
                  <Text style={styles.stationIdx}>#{idx + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stationName} numberOfLines={2}>
                      {s.name}
                    </Text>
                    <Text style={styles.stationInfo}>
                      {s.powerKW ? `${s.powerKW} kW` : 'Puissance inconnue'}
                      {s.connectors?.length
                        ? ` · ${s.connectors.join(', ')}`
                        : ''}
                    </Text>
                    <Text style={styles.stationDist}>
                      📍 à {s.distanceFromStartKm.toFixed(0)} km du départ
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.resultRow}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={styles.resultValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eff6ff' },
  scroll: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#2563eb', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#1e40af', marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
    marginBottom: 6,
  },
  row: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  locBtn: {
    backgroundColor: '#ffffff',
    width: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingLeft: 4,
  },
  searchingText: { marginLeft: 8, fontSize: 12, color: '#2563eb' },
  suggestionsBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  sugg: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  suggTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  suggSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  resetBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
  },
  resetText: { color: '#475569', fontWeight: '700' },
  calcBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#22c55e',
    alignItems: 'center',
  },
  calcBtnDisabled: { backgroundColor: '#94a3b8' },
  calcText: { color: '#fff', fontWeight: '700' },
  loadingMsg: { marginTop: 12, color: '#2563eb', textAlign: 'center' },
  error: { marginTop: 12, color: '#ef4444', textAlign: 'center' },
  mapWrap: { marginTop: 20, height: 280, borderRadius: 12, overflow: 'hidden' },
  map: { flex: 1 },
  result: {
    marginTop: 20,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  resultLabel: { fontSize: 13, color: '#64748b' },
  resultValue: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 8 },
  savedBadge: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
    color: '#16a34a',
    textAlign: 'center',
  },
  stationsBlock: {
    marginTop: 20,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stationCard: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 10,
  },
  stationIdx: {
    fontWeight: '800',
    color: '#22c55e',
    fontSize: 13,
    minWidth: 28,
  },
  stationName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  stationInfo: { fontSize: 12, color: '#475569', marginTop: 2 },
  stationDist: {
    fontSize: 11,
    color: '#2563eb',
    marginTop: 2,
    fontWeight: '600',
  },
});