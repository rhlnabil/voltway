import { useEffect, useRef, useState } from 'react';
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
import * as Location from 'expo-location';
import { geocodeAddress, GeocodingResult } from '../services/geocoding';
import { getRoute, RouteResult } from '../services/routing';
import { useVehicleStore } from '../stores/vehicleStore';

type Point = { latitude: number; longitude: number; label: string };

type Verdict = {
  status: 'ok' | 'tight' | 'no';
  message: string;
  remainingAtArrivalKm: number;
  batteryAtArrival: number;
};

const BATTERY_PRESETS = [25, 50, 75, 100];

export default function AutonomyScreen() {
  const vehicle = useVehicleStore((s) => s.vehicle);

  const [batteryPercent, setBatteryPercent] = useState('80');
  const [destinationQuery, setDestinationQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [destination, setDestination] = useState<Point | null>(null);
  const [start, setStart] = useState<Point | null>(null);

  const [loadingLocation, setLoadingLocation] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Charge la position au démarrage
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Permission GPS refusée — impossible de calculer depuis ta position.');
          setLoadingLocation(false);
          return;
        }
        const pos = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<null>((r) => setTimeout(() => r(null), 10000)),
        ]);
        if (pos) {
          setStart({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            label: '📍 Ma position',
          });
        } else {
          setError("Impossible d'obtenir ta position.");
        }
      } catch (e) {
        setError('Erreur de localisation.');
      } finally {
        setLoadingLocation(false);
      }
    })();
  }, []);

  // Recherche destination avec debounce + biais géographique
  async function onDestinationChange(text: string) {
    setDestinationQuery(text);
    setDestination(null);
    setRoute(null);

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (text.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    searchTimerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        // 🔑 Biais : priorise les résultats près de ta position
        const results = await geocodeAddress(
          text,
          start?.latitude,
          start?.longitude
        );
        setSuggestions(results);
      } catch (e) {
        console.warn('[autonomy] geocode:', e);
      } finally {
        setSearching(false);
      }
    }, 400);
  }

  function pickDestination(s: GeocodingResult) {
    setDestination({
      latitude: s.latitude,
      longitude: s.longitude,
      label: s.displayName,
    });
    setDestinationQuery(s.displayName);
    setSuggestions([]);
    setRoute(null);
  }

  async function calculate() {
    if (!start || !destination) {
      setError('Choisis une destination');
      return;
    }
    setError(null);
    setRoute(null);
    setCalculating(true);
    try {
      const result = await getRoute(start, destination);
      if (!result) {
        setError('Aucun itinéraire trouvé');
        return;
      }
      setRoute(result);
    } catch (e: any) {
      setError(e?.message ?? 'Erreur');
    } finally {
      setCalculating(false);
    }
  }

  // Recalcul auto quand destination sélectionnée
  useEffect(() => {
    if (start && destination) {
      calculate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, destination]);

  function computeVerdict(): Verdict | null {
    if (!route) return null;

    const battery = Math.max(0, Math.min(100, Number(batteryPercent) || 0));
    const usableAutonomyKm = vehicle.autonomyKm * 0.8;
    const distanceKm = route.distanceMeters / 1000;
    const batteryUsed = (distanceKm / usableAutonomyKm) * 100;
    const batteryAtArrival = battery - batteryUsed;
    const remainingAtArrivalKm = Math.max(
      0,
      usableAutonomyKm * (batteryAtArrival / 100)
    );

    if (batteryAtArrival < 0) {
      return {
        status: 'no',
        message: `❌ Impossible sans recharger — il te manque environ ${Math.abs(
          batteryAtArrival
        ).toFixed(0)}% de batterie.`,
        remainingAtArrivalKm: 0,
        batteryAtArrival,
      };
    }

    if (batteryAtArrival < 15) {
      return {
        status: 'tight',
        message: `⚠️ C'est juste — tu arriveras avec ${batteryAtArrival.toFixed(
          0
        )}% (${remainingAtArrivalKm.toFixed(
          0
        )} km). Prévois une recharge.`,
        remainingAtArrivalKm,
        batteryAtArrival,
      };
    }

    return {
      status: 'ok',
      message: `✅ Tu peux y aller ! Tu arriveras avec ${batteryAtArrival.toFixed(
        0
      )}% (${remainingAtArrivalKm.toFixed(0)} km d'autonomie).`,
      remainingAtArrivalKm,
      batteryAtArrival,
    };
  }

  const verdict = computeVerdict();
  const batteryNum = Math.max(0, Math.min(100, Number(batteryPercent) || 0));

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
          <Text style={styles.title}>⚡ Autonomie</Text>
          <Text style={styles.subtitle}>
            {vehicle.modelName} · {vehicle.autonomyKm} km max
          </Text>

          {/* Batterie */}
          <Text style={styles.label}>Batterie actuelle</Text>
          <View style={styles.batteryRow}>
            <TextInput
              style={styles.batteryInput}
              value={batteryPercent}
              onChangeText={setBatteryPercent}
              keyboardType="numeric"
              maxLength={3}
            />
            <Text style={styles.batteryPercentSign}>%</Text>
          </View>

          <View style={styles.presets}>
            {BATTERY_PRESETS.map((p) => {
              const active = batteryNum === p;
              return (
                <Pressable
                  key={p}
                  style={[styles.presetBtn, active && styles.presetBtnActive]}
                  onPress={() => setBatteryPercent(String(p))}
                >
                  <Text
                    style={[styles.presetText, active && styles.presetTextActive]}
                  >
                    {p}%
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.batteryBar}>
            <View
              style={[
                styles.batteryFill,
                {
                  width: `${batteryNum}%`,
                  backgroundColor:
                    batteryNum > 50
                      ? '#22c55e'
                      : batteryNum > 20
                      ? '#f59e0b'
                      : '#ef4444',
                },
              ]}
            />
          </View>
          <Text style={styles.batteryHint}>
            Autonomie utile (marge 20%) :{' '}
            {Math.round((vehicle.autonomyKm * 0.8 * batteryNum) / 100)} km
          </Text>

          {/* Destination */}
          <Text style={styles.label}>Destination exacte</Text>
          <TextInput
            style={styles.input}
            placeholder="ex: Avenue Hassan II, Casablanca"
            value={destinationQuery}
            onChangeText={onDestinationChange}
          />
          {start && (
            <Text style={styles.hint}>
              🎯 Résultats prioritaires autour de ta position
            </Text>
          )}

          {searching && (
            <View style={styles.searchingRow}>
              <ActivityIndicator color="#16a34a" size="small" />
              <Text style={styles.searchingText}>Recherche…</Text>
            </View>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <View style={styles.suggestionsBox}>
              {suggestions.map((s, i) => {
                const parts = s.displayName.split(', ');
                const title = parts.slice(0, 2).join(', ');
                const subtitle = parts.slice(2).join(', ');
                return (
                  <Pressable
                    key={`d-${i}`}
                    style={styles.sugg}
                    onPress={() => pickDestination(s)}
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
              })}
            </View>
          )}

          {loadingLocation && (
            <View style={styles.center}>
              <ActivityIndicator color="#22c55e" />
              <Text style={styles.loadingText}>Recherche de ta position…</Text>
            </View>
          )}
          {calculating && (
            <View style={styles.center}>
              <ActivityIndicator color="#22c55e" />
              <Text style={styles.loadingText}>Calcul en cours…</Text>
            </View>
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Résultat */}
          {route && verdict && destination && (
            <>
              <View
                style={[
                  styles.verdictCard,
                  verdict.status === 'ok' && styles.verdictOk,
                  verdict.status === 'tight' && styles.verdictTight,
                  verdict.status === 'no' && styles.verdictNo,
                ]}
              >
                <Text style={styles.verdictText}>{verdict.message}</Text>
              </View>

              <View style={styles.detailsBox}>
                <Row
                  label="Distance"
                  value={`${(route.distanceMeters / 1000).toFixed(0)} km`}
                />
                <Row
                  label="Durée"
                  value={`${Math.floor(route.durationSeconds / 3600)}h${String(
                    Math.floor((route.durationSeconds % 3600) / 60)
                  ).padStart(2, '0')}`}
                />
                <View style={styles.divider} />
                <Row label="Batterie départ" value={`${batteryNum}%`} />
                <Row
                  label="Batterie à l'arrivée"
                  value={`${verdict.batteryAtArrival.toFixed(0)}%`}
                />
                <Row
                  label="Autonomie restante"
                  value={`${verdict.remainingAtArrivalKm.toFixed(0)} km`}
                />
                <Row
                  label="Destination"
                  value={destination.label.split(',')[0]}
                />
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ecfdf5' },
  scroll: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#16a34a', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#15803d', marginBottom: 20 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 14,
    marginBottom: 6,
  },
  hint: { fontSize: 11, color: '#64748b', marginTop: 6, fontStyle: 'italic' },
  batteryRow: { flexDirection: 'row', alignItems: 'center' },
  batteryInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    textAlign: 'center',
  },
  batteryPercentSign: {
    fontSize: 24,
    fontWeight: '700',
    color: '#16a34a',
    marginLeft: 10,
  },
  presets: { flexDirection: 'row', gap: 8, marginTop: 10 },
  presetBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  presetBtnActive: { backgroundColor: '#22c55e', borderColor: '#16a34a' },
  presetText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  presetTextActive: { color: '#fff' },
  batteryBar: {
    height: 14,
    backgroundColor: '#e2e8f0',
    borderRadius: 7,
    overflow: 'hidden',
    marginTop: 16,
  },
  batteryFill: { height: '100%', borderRadius: 7 },
  batteryHint: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingLeft: 4,
  },
  searchingText: { marginLeft: 8, fontSize: 12, color: '#16a34a' },
  suggestionsBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginTop: 8,
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
  center: { padding: 16, alignItems: 'center' },
  loadingText: { marginTop: 8, color: '#16a34a', fontSize: 13 },
  error: { color: '#ef4444', marginTop: 12, textAlign: 'center' },
  verdictCard: { marginTop: 20, borderRadius: 14, padding: 16 },
  verdictOk: { backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#86efac' },
  verdictTight: { backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fde68a' },
  verdictNo: { backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fca5a5' },
  verdictText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  detailsBox: {
    marginTop: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { fontSize: 13, color: '#64748b' },
  rowValue: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 6 },
});