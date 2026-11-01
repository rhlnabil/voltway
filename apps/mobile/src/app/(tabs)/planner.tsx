import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { geocode } from '../../services/geocoding';
import { getRoute, Route } from '../../services/routing';
import { tripsApi } from '../../services/trips';
import { vehiclesApi } from '../../services/vehicles';

const { width, height } = Dimensions.get('window');

let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
if (Platform.OS !== 'web') {
  const RNMaps = require('react-native-maps');
  MapView = RNMaps.default;
  Marker = RNMaps.Marker;
  Polyline = RNMaps.Polyline;
}

type Point = { latitude: number; longitude: number; label: string };

export default function Planner() {
  const [startQuery, setStartQuery] = useState('');
  const [endQuery, setEndQuery] = useState('');
  const [start, setStart] = useState<Point | null>(null);
  const [end, setEnd] = useState<Point | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [focused, setFocused] = useState<'start' | 'end' | null>(null);
  const [vehicleAutonomy, setVehicleAutonomy] = useState<number>(0);
  const [vehicleLoaded, setVehicleLoaded] = useState(false);

  const auroraShift = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  // Animations globales
  useState(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(auroraShift, {
          toValue: 1,
          duration: 14000,
          useNativeDriver: true,
        }),
        Animated.timing(auroraShift, {
          toValue: 0,
          duration: 14000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 2500,
        useNativeDriver: true,
      })
    ).start();
  });

  // ⭐ Recharge l'autonomie du véhicule à chaque focus (retour depuis Profil)
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const vs = await vehiclesApi.list();
          if (!cancelled) {
            if (vs.length && vs[0].autonomyKm) {
              setVehicleAutonomy(vs[0].autonomyKm);
            } else {
              setVehicleAutonomy(0);
            }
            setVehicleLoaded(true);
          }
        } catch (e) {
          console.warn('[planner] vehicle load', e);
          if (!cancelled) setVehicleLoaded(true);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  async function useMyLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission refusée');
    const pos = await Location.getCurrentPositionAsync({});
    const p = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      label: '📍 Ma position',
    };
    setStart(p);
    setStartQuery(p.label);
  }

  async function pick(which: 'start' | 'end') {
    const q = which === 'start' ? startQuery : endQuery;
    if (q.trim().length < 3) return;
    const results = await geocode(q);
    if (!results.length) return Alert.alert('Aucun résultat');
    const r = results[0];
    const p = {
      latitude: r.latitude,
      longitude: r.longitude,
      label: r.displayName,
    };
    if (which === 'start') {
      setStart(p);
      setStartQuery(r.displayName.split(',').slice(0, 2).join(', '));
    } else {
      setEnd(p);
      setEndQuery(r.displayName.split(',').slice(0, 2).join(', '));
    }
  }

  async function calculate() {
    if (!start || !end) return Alert.alert('Choisis un départ et une arrivée');
    if (vehicleAutonomy <= 0) {
      return Alert.alert(
        'Véhicule non configuré',
        'Configure ton véhicule dans le Profil pour calculer l\'autonomie.',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Aller au profil',
            onPress: () => router.push('/(tabs)/profile'),
          },
        ]
      );
    }
    setLoading(true);
    setAccepted(false);
    try {
      const r = await getRoute(start, end);
      if (!r) return Alert.alert('Aucun itinéraire');
      setRoute(r);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function acceptTrip() {
    if (!start || !end || !route) return;
    setSaving(true);
    try {
      const distanceKm = route.distanceMeters / 1000;
      const stopsNeeded = Math.max(0, Math.ceil(distanceKm / 280) - 1);

      await tripsApi.create({
        startLabel: start.label,
        startLat: start.latitude,
        startLon: start.longitude,
        endLabel: end.label,
        endLat: end.latitude,
        endLon: end.longitude,
        distanceKm,
        durationS: route.durationSeconds,
        stopsNeeded,
        stations: [],
      });

      const remaining = Math.max(0, vehicleAutonomy - distanceKm);
      setAccepted(true);
      Alert.alert(
        '✅ Trajet accepté !',
        `Il te restera environ ${remaining.toFixed(0)} km d'autonomie.\n\nTon trajet a été ajouté à ton profil.`,
        [
          { text: 'Rester ici', style: 'cancel' },
          {
            text: 'Voir le profil',
            onPress: () => router.push('/(tabs)/profile'),
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setSaving(false);
    }
  }

  const auroraX = auroraShift.interpolate({
    inputRange: [0, 1],
    outputRange: [-width * 0.2, width * 0.2],
  });
  const auroraXNeg = auroraShift.interpolate({
    inputRange: [0, 1],
    outputRange: [width * 0.2, -width * 0.2],
  });
  const shimmerX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-250, 400],
  });

  // === Calculs d'autonomie basés sur le PROFIL ===
  const tripKm = route ? route.distanceMeters / 1000 : 0;
  const remainingAfter = vehicleAutonomy - tripKm;
  const remainingPercent =
    vehicleAutonomy > 0
      ? Math.max(0, Math.min(100, (remainingAfter / vehicleAutonomy) * 100))
      : 0;
  const canComplete = remainingAfter >= 0;
  const willBeTight = remainingAfter >= 0 && remainingAfter < 15;

  const autonomyColor = !canComplete
    ? '#ef4444'
    : willBeTight
    ? '#f59e0b'
    : '#22c55e';
  const autonomyGradient: [string, string] = !canComplete
    ? ['#ef4444', '#b91c1c']
    : willBeTight
    ? ['#f59e0b', '#d97706']
    : ['#22c55e', '#16a34a'];

  function renderWebRoute(startPt: Point, endPt: Point, r: Route) {
    const coords = r.coordinates;
    const lats = coords.map((c) => c.latitude);
    const lons = coords.map((c) => c.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const latRange = maxLat - minLat || 1;
    const lonRange = maxLon - minLon || 1;
    const padding = 0.1;
    const norm = (v: number, min: number, range: number) =>
      ((v - min) / range) * (1 - 2 * padding) + padding;

    return (
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={['#0a1e14', '#050a08']}
          style={StyleSheet.absoluteFill}
        />
        {[...Array(6)].map((_, i) => (
          <View
            key={`h${i}`}
            style={[
              styles.gridLine,
              { top: `${(i + 1) * 14}%`, left: 0, right: 0, height: 1 },
            ]}
          />
        ))}
        {[...Array(5)].map((_, i) => (
          <View
            key={`v${i}`}
            style={[
              styles.gridLine,
              { left: `${(i + 1) * 17}%`, top: 0, bottom: 0, width: 1 },
            ]}
          />
        ))}
        {coords.slice(0, -1).map((c, i) => {
          const next = coords[i + 1];
          const x1 = norm(c.longitude, minLon, lonRange) * 100;
          const y1 = (1 - norm(c.latitude, minLat, latRange)) * 100;
          const x2 = norm(next.longitude, minLon, lonRange) * 100;
          const y2 = (1 - norm(next.latitude, minLat, latRange)) * 100;
          const dx = x2 - x1;
          const dy = y2 - y1;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          if (i % 8 !== 0) return null;
          return (
            <View
              key={i}
              style={[
                styles.routeLine,
                {
                  left: `${x1}%`,
                  top: `${y1}%`,
                  width: `${length}%`,
                  transform: [{ rotate: `${angle}deg` }],
                },
              ]}
            />
          );
        })}
        <View
          style={[
            styles.point,
            styles.pointStart,
            {
              left: `${norm(startPt.longitude, minLon, lonRange) * 100}%`,
              top: `${(1 - norm(startPt.latitude, minLat, latRange)) * 100}%`,
            },
          ]}
        >
          <View style={styles.pointInner} />
        </View>
        <View
          style={[
            styles.point,
            styles.pointEnd,
            {
              left: `${norm(endPt.longitude, minLon, lonRange) * 100}%`,
              top: `${(1 - norm(endPt.latitude, minLat, latRange)) * 100}%`,
            },
          ]}
        >
          <View style={styles.pointInner} />
        </View>
        <View style={styles.webMapBadge}>
          <Text style={styles.webMapBadgeText}>
            🗺️ Itinéraire · Carte interactive sur mobile
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Animated.View
        style={[styles.auroraLayer, { transform: [{ translateX: auroraX }] }]}
      >
        <LinearGradient
          colors={['#052e16', '#0d2818', '#050a08']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fill}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.auroraBlob,
          styles.blob1,
          { transform: [{ translateX: auroraX }] },
        ]}
      >
        <LinearGradient colors={['#166534', 'transparent']} style={styles.fill} />
      </Animated.View>

      <Animated.View
        style={[
          styles.auroraBlob,
          styles.blob2,
          { transform: [{ translateX: auroraXNeg }] },
        ]}
      >
        <LinearGradient colors={['#14532d', 'transparent']} style={styles.fill} />
      </Animated.View>

      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>🗺️ Planifier</Text>
            <Text style={styles.subtitle}>
              {vehicleLoaded && vehicleAutonomy > 0
                ? `Autonomie du véhicule : ${vehicleAutonomy} km (depuis Profil)`
                : vehicleLoaded
                ? 'Aucun véhicule configuré — va dans Profil'
                : 'Chargement…'}
            </Text>
          </View>

          {/* Avertissement si pas de véhicule */}
          {vehicleLoaded && vehicleAutonomy === 0 && (
            <Pressable
              style={styles.warningCard}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Text style={styles.warningEmoji}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.warningTitle}>
                  Configure ton véhicule
                </Text>
                <Text style={styles.warningText}>
                  Va dans Profil pour renseigner l'autonomie de ta voiture.
                </Text>
              </View>
              <Text style={styles.warningArrow}>→</Text>
            </Pressable>
          )}

          <View style={styles.card}>
            <Text style={styles.label}>Départ</Text>
            <View style={styles.row}>
              <TextInput
                style={[
                  styles.input,
                  focused === 'start' && styles.inputFocused,
                ]}
                value={startQuery}
                onChangeText={setStartQuery}
                onBlur={() => pick('start')}
                onFocus={() => setFocused('start')}
                placeholder="Adresse de départ"
                placeholderTextColor="#475569"
              />
              <Pressable style={styles.locBtn} onPress={useMyLocation}>
                <Text style={{ fontSize: 18 }}>📍</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Arrivée</Text>
            <TextInput
              style={[styles.input, focused === 'end' && styles.inputFocused]}
              value={endQuery}
              onChangeText={setEndQuery}
              onBlur={() => pick('end')}
              onFocus={() => setFocused('end')}
              placeholder="Adresse d'arrivée"
              placeholderTextColor="#475569"
            />
          </View>

          <View style={styles.calcBtnWrapper}>
            <View style={styles.calcBtn}>
              <LinearGradient
                colors={['#22c55e', '#16a34a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.fill}
              />
              <Animated.View
                style={[
                  styles.shimmerBar,
                  { transform: [{ translateX: shimmerX }] },
                ]}
              >
                <LinearGradient
                  colors={[
                    'transparent',
                    'rgba(255,255,255,0.4)',
                    'transparent',
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.fill}
                />
              </Animated.View>
              <Pressable
                onPress={calculate}
                disabled={loading}
                style={styles.calcBtnInner}
              >
                {loading ? (
                  <ActivityIndicator color="#050a08" />
                ) : (
                  <Text style={styles.calcText}>⚡ Calculer l'itinéraire</Text>
                )}
              </Pressable>
            </View>
          </View>

          {route && start && end && (
            <>
              <View style={styles.mapWrap}>
                {MapView ? (
                  <MapView
                    style={{ flex: 1 }}
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
                    <Marker coordinate={start} title="Départ" pinColor="green" />
                    <Marker coordinate={end} title="Arrivée" pinColor="red" />
                  </MapView>
                ) : (
                  renderWebRoute(start, end, route)
                )}
              </View>

              <View style={styles.resultCard}>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Distance</Text>
                  <Text style={styles.resultValue}>
                    {(route.distanceMeters / 1000).toFixed(1)} km
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Durée estimée</Text>
                  <Text style={styles.resultValue}>
                    {Math.floor(route.durationSeconds / 60)} min
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Arrêts recommandés</Text>
                  <Text style={styles.resultValue}>
                    {Math.max(0, Math.ceil(route.distanceMeters / 1000 / 280) - 1)}
                  </Text>
                </View>
              </View>

              {/* ===== AUTONOMIE RESTANTE (basée sur Profil) ===== */}
              <View style={styles.autonomyCard}>
                <LinearGradient
                  colors={autonomyGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.autonomyHeaderGradient}
                >
                  <Text style={styles.autonomyHeaderEmoji}>
                    {canComplete ? (willBeTight ? '⚠️' : '🔋') : '❌'}
                  </Text>
                  <Text style={styles.autonomyHeaderText}>
                    {!canComplete
                      ? 'Recharge nécessaire'
                      : willBeTight
                      ? 'Autonomie juste'
                      : 'Trajet réalisable'}
                  </Text>
                </LinearGradient>

                <View style={styles.autonomyBody}>
                  <View style={styles.autonomyStats}>
                    <View style={styles.autonomyStatItem}>
                      <Text style={styles.autonomyStatLabel}>
                        Autonomie véhicule
                      </Text>
                      <Text style={styles.autonomyStatValue}>
                        {vehicleAutonomy} km
                      </Text>
                    </View>
                    <View style={styles.autonomyStatDivider} />
                    <View style={styles.autonomyStatItem}>
                      <Text style={styles.autonomyStatLabel}>Consommé</Text>
                      <Text
                        style={[styles.autonomyStatValue, { color: '#f87171' }]}
                      >
                        −{tripKm.toFixed(0)} km
                      </Text>
                    </View>
                  </View>

                  <View style={styles.autonomyMainBlock}>
                    <Text style={styles.autonomyMainLabel}>Il te restera</Text>
                    <Text
                      style={[
                        styles.autonomyMainValue,
                        { color: autonomyColor },
                      ]}
                    >
                      {Math.max(0, remainingAfter).toFixed(0)} km
                    </Text>
                  </View>

                  <View style={styles.autonomyBarBg}>
                    <View
                      style={[
                        styles.autonomyBarFill,
                        {
                          width: `${remainingPercent}%`,
                          backgroundColor: autonomyColor,
                        },
                      ]}
                    />
                  </View>

                  <Text style={styles.autonomyHint}>
                    {!canComplete
                      ? `Prévois une recharge sur le chemin (${Math.ceil(
                          Math.abs(remainingAfter)
                        )} km manquants)`
                      : `≈ ${remainingPercent.toFixed(
                          0
                        )}% de batterie restante`}
                  </Text>
                </View>
              </View>

              {!accepted ? (
                <View style={styles.acceptBtnWrapper}>
                  <View style={styles.acceptBtn}>
                    <LinearGradient
                      colors={['#22c55e', '#16a34a']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.fill}
                    />
                    <Pressable
                      onPress={acceptTrip}
                      disabled={saving}
                      style={styles.acceptBtnInner}
                    >
                      {saving ? (
                        <ActivityIndicator color="#050a08" />
                      ) : (
                        <Text style={styles.acceptText}>
                          ✓ Accepter ce voyage
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={styles.acceptedCard}>
                  <Text style={styles.acceptedTitle}>
                    ✅ Trajet ajouté à ton profil
                  </Text>
                  <Pressable
                    onPress={() => router.push('/(tabs)/profile')}
                    style={styles.seeProfileBtn}
                  >
                    <Text style={styles.seeProfileText}>Voir le profil →</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}

          <Text style={styles.footer}>v2.0 · Électrise ta route ⚡</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050a08' },
  safe: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  auroraLayer: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: width * 1.5,
    height: height * 1.5,
  },
  auroraBlob: {
    position: 'absolute',
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: width * 0.45,
    overflow: 'hidden',
  },
  blob1: { top: -100, left: -150 },
  blob2: { bottom: -150, right: -150 },

  header: { paddingTop: 12, paddingBottom: 20 },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f0fdf4',
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 13,
    color: '#86efac',
    marginTop: 4,
    letterSpacing: 0.3,
    opacity: 0.85,
  },

  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.4)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  warningEmoji: { fontSize: 22 },
  warningTitle: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  warningText: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 15,
  },
  warningArrow: {
    color: '#fbbf24',
    fontSize: 20,
    fontWeight: '800',
  },

  card: {
    backgroundColor: 'rgba(15,23,20,0.85)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#86efac',
    marginBottom: 6,
    marginTop: 8,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  row: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: '#0a1410',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  inputFocused: { borderColor: '#22c55e' },
  locBtn: {
    backgroundColor: '#0a1410',
    width: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },

  calcBtnWrapper: {
    marginBottom: 12,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#22c55e',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  calcBtn: { overflow: 'hidden' },
  calcBtnInner: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shimmerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 150,
    height: '100%',
  },
  calcText: {
    color: '#050a08',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  mapWrap: {
    height: 280,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },

  resultCard: {
    backgroundColor: 'rgba(15,23,20,0.85)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  resultLabel: { fontSize: 13, color: '#94a3b8' },
  resultValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f0fdf4',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(34,197,94,0.15)',
    marginVertical: 6,
  },

  autonomyCard: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
    backgroundColor: 'rgba(15,23,20,0.95)',
  },
  autonomyHeaderGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  autonomyHeaderEmoji: { fontSize: 18 },
  autonomyHeaderText: {
    color: '#050a08',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  autonomyBody: { padding: 18 },
  autonomyStats: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  autonomyStatItem: { flex: 1, alignItems: 'center' },
  autonomyStatDivider: {
    width: 1,
    backgroundColor: 'rgba(34,197,94,0.2)',
    marginVertical: 4,
  },
  autonomyStatLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  autonomyStatValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f0fdf4',
  },
  autonomyMainBlock: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  autonomyMainLabel: {
    fontSize: 11,
    color: '#86efac',
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  autonomyMainValue: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1.2,
  },
  autonomyBarBg: {
    height: 10,
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 8,
  },
  autonomyBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  autonomyHint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#64748b',
    marginTop: 12,
    fontStyle: 'italic',
  },

  acceptBtnWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#22c55e',
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  acceptBtn: { overflow: 'hidden' },
  acceptBtnInner: {
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: {
    color: '#050a08',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  acceptedCard: {
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.4)',
    alignItems: 'center',
  },
  acceptedTitle: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  seeProfileBtn: { paddingVertical: 4 },
  seeProfileText: {
    color: '#22c55e',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(34,197,94,0.08)',
  },
  routeLine: {
    position: 'absolute',
    height: 4,
    backgroundColor: '#22c55e',
    borderRadius: 2,
  },
  point: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: -10,
    marginTop: -10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointStart: { backgroundColor: 'rgba(34,197,94,0.3)' },
  pointEnd: { backgroundColor: 'rgba(239,68,68,0.3)' },
  pointInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f0fdf4',
  },
  webMapBadge: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(34,197,94,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  webMapBadgeText: {
    color: '#4ade80',
    fontSize: 11,
    fontWeight: '700',
  },
  footer: {
    textAlign: 'center',
    color: '#334155',
    fontSize: 11,
    marginTop: 24,
    letterSpacing: 1,
  },
});