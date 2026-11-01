import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { geocode } from '../../services/geocoding';
import { getRoute } from '../../services/routing';
import { vehiclesApi } from '../../services/vehicles';
import { fetchWeather, WeatherInfo } from '../../services/weather';

const { width, height } = Dimensions.get('window');

type Point = { latitude: number; longitude: number; label: string };

export default function Autonomy() {
  const [battery, setBattery] = useState('80');
  const [query, setQuery] = useState('');
  const [start, setStart] = useState<Point | null>(null);
  const [dest, setDest] = useState<Point | null>(null);
  const [autonomyKm, setAutonomyKm] = useState(350);
  const [baseAutonomy, setBaseAutonomy] = useState(350);
  const [distance, setDistance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [focused, setFocused] = useState<'battery' | 'query' | null>(null);
  const [vehicleLoaded, setVehicleLoaded] = useState(false);

  const auroraShift = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const batteryAnim = useRef(new Animated.Value(0)).current;

  // Animations globales (une seule fois)
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

    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideUp, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  });

  // ⭐ Recharge les données à CHAQUE fois que l'écran reprend le focus
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        // 1. Récupérer le véhicule (autonomie réelle)
        let vehicleAutonomy = 350;
        try {
          const vs = await vehiclesApi.list();
          if (vs.length && vs[0].autonomyKm) {
            vehicleAutonomy = vs[0].autonomyKm;
          }
        } catch (e) {
          console.warn('[autonomy] vehicle load failed', e);
        }

        if (cancelled) return;

        // 2. Utiliser directement vehicleAutonomy (pas baseAutonomy qui n'est pas encore à jour)
        setBaseAutonomy(vehicleAutonomy);

        // 3. Récupérer la position
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;

        if (status === 'granted') {
          try {
            const pos = await Location.getCurrentPositionAsync({});
            const p = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            };
            setStart({
              latitude: p.latitude,
              longitude: p.longitude,
              label: '📍 Ma position',
            });

            // 4. Récupérer la météo
            const w = await fetchWeather(p.latitude, p.longitude);
            if (cancelled) return;

            if (w) {
              setWeather(w);
              // ✅ CORRECTION : utilise vehicleAutonomy, pas baseAutonomy
              const adjusted = Math.round(
                vehicleAutonomy * (1 - w.autonomyPenalty / 100)
              );
              setAutonomyKm(adjusted);
            } else {
              setAutonomyKm(vehicleAutonomy);
            }
          } catch (e) {
            console.warn('[autonomy] location/weather failed', e);
            setAutonomyKm(vehicleAutonomy);
          }
        } else {
          setAutonomyKm(vehicleAutonomy);
        }

        if (!cancelled) setVehicleLoaded(true);
      })();

      return () => {
        cancelled = true;
      };
    }, [])
  );

  // Animation de la jauge batterie
  useState(() => {
    // initialisation silencieuse
  });

  useFocusEffect(
    useCallback(() => {
      const batt = Math.min(100, Math.max(0, Number(battery) || 0));
      Animated.timing(batteryAnim, {
        toValue: batt / 100,
        duration: 600,
        useNativeDriver: false,
      }).start();
    }, [battery])
  );

  async function calc() {
    if (!start || !query.trim()) return;
    setLoading(true);
    try {
      const results = await geocode(query, {
        lat: start.latitude,
        lon: start.longitude,
      });
      if (!results.length) return;
      const r = results[0];
      const d = {
        latitude: r.latitude,
        longitude: r.longitude,
        label: r.displayName,
      };
      setDest(d);
      const route = await getRoute(start, d);
      if (route) setDistance(route.distanceMeters / 1000);
    } finally {
      setLoading(false);
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
  const battWidth = batteryAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const batt = Math.min(100, Math.max(0, Number(battery) || 0));
  const usable = autonomyKm * 0.8;
  const battUsed = distance ? (distance / usable) * 100 : 0;
  const battAtArrival = batt - battUsed;

  const statusColor =
    battAtArrival < 0 ? '#ef4444' : battAtArrival < 15 ? '#f59e0b' : '#22c55e';
  const statusLabel =
    battAtArrival < 0 ? '❌ Impossible' : battAtArrival < 15 ? '⚠️ Juste' : '✅ OK';
  const statusGradient: [string, string] =
    battAtArrival < 0
      ? ['#ef4444', '#b91c1c']
      : battAtArrival < 15
      ? ['#f59e0b', '#d97706']
      : ['#22c55e', '#16a34a'];
  const batteryGradient: [string, string] =
    batt < 15
      ? ['#ef4444', '#b91c1c']
      : batt < 40
      ? ['#f59e0b', '#d97706']
      : ['#22c55e', '#16a34a'];

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
          <Animated.View
            style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}
          >
            <View style={styles.header}>
              <Text style={styles.title}>⚡ Autonomie</Text>
              <Text style={styles.subtitle}>
                {vehicleLoaded
                  ? `Véhicule : ${autonomyKm} km${
                      weather && weather.autonomyPenalty > 0
                        ? ` (−${weather.autonomyPenalty}% météo)`
                        : ''
                    }`
                  : 'Chargement du véhicule…'}
              </Text>
            </View>

            {weather && (
              <View style={styles.weatherCard}>
                <LinearGradient
                  colors={['rgba(34,197,94,0.12)', 'rgba(34,197,94,0.02)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.fill}
                />
                <Text style={styles.weatherIcon}>{weather.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.weatherTemp}>{weather.temperature}°C</Text>
                  <Text style={styles.weatherDesc}>{weather.description}</Text>
                </View>
                <View
                  style={[
                    styles.weatherBadge,
                    weather.autonomyPenalty > 0 && styles.weatherBadgeWarn,
                  ]}
                >
                  <Text
                    style={[
                      styles.weatherBadgeText,
                      weather.autonomyPenalty > 0 && styles.weatherBadgeTextWarn,
                    ]}
                  >
                    {weather.autonomyPenalty > 0
                      ? `−${weather.autonomyPenalty}%`
                      : '✓ Optimal'}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.card}>
              <View style={styles.batteryHeader}>
                <Text style={styles.label}>Batterie actuelle</Text>
                <Text style={styles.batteryValue}>{batt}%</Text>
              </View>

              <View style={styles.batteryBarBg}>
                <Animated.View
                  style={[styles.batteryBarFill, { width: battWidth }]}
                >
                  <LinearGradient
                    colors={batteryGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.fill}
                  />
                </Animated.View>
              </View>

              <TextInput
                style={[
                  styles.input,
                  { marginTop: 12 },
                  focused === 'battery' && styles.inputFocused,
                ]}
                value={battery}
                onChangeText={setBattery}
                keyboardType="numeric"
                placeholder="80"
                placeholderTextColor="#475569"
                onFocus={() => setFocused('battery')}
                onBlur={() => setFocused(null)}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Destination</Text>
              <TextInput
                style={[styles.input, focused === 'query' && styles.inputFocused]}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={calc}
                returnKeyType="search"
                placeholder="ex: Casablanca"
                placeholderTextColor="#475569"
                onFocus={() => setFocused('query')}
                onBlur={() => setFocused(null)}
              />

              <View style={styles.startInfo}>
                <Text style={styles.startInfoEmoji}>📍</Text>
                <Text style={styles.startInfoText} numberOfLines={1}>
                  {start
                    ? 'Position actuelle détectée'
                    : 'Localisation en cours…'}
                </Text>
              </View>
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
                  onPress={calc}
                  disabled={loading}
                  style={styles.calcBtnInner}
                >
                  {loading ? (
                    <ActivityIndicator color="#050a08" />
                  ) : (
                    <Text style={styles.calcText}>⚡ Calculer l'autonomie</Text>
                  )}
                </Pressable>
              </View>
            </View>

            {distance !== null && dest && (
              <View style={styles.resultCard}>
                <LinearGradient
                  colors={statusGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.resultHeaderGradient}
                >
                  <Text style={styles.resultStatus}>{statusLabel}</Text>
                </LinearGradient>

                <View style={styles.resultBody}>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Destination</Text>
                    <Text style={styles.resultValue} numberOfLines={1}>
                      {dest.label.split(',')[0]}
                    </Text>
                  </View>

                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Distance</Text>
                    <Text style={styles.resultValue}>
                      {distance.toFixed(0)} km
                    </Text>
                  </View>

                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Batterie utilisée</Text>
                    <Text style={styles.resultValue}>
                      {battUsed.toFixed(0)}%
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>
                      Batterie à l'arrivée
                    </Text>
                    <Text style={[styles.resultValue, { color: statusColor }]}>
                      {battAtArrival.toFixed(0)}%
                    </Text>
                  </View>

                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Autonomie restante</Text>
                    <Text style={[styles.resultValue, { color: statusColor }]}>
                      {Math.max(0, usable * (battAtArrival / 100)).toFixed(0)} km
                    </Text>
                  </View>

                  <View style={styles.arrivalBarBg}>
                    <View
                      style={[
                        styles.arrivalBarFill,
                        {
                          width: `${Math.max(
                            0,
                            Math.min(100, battAtArrival)
                          )}%`,
                          backgroundColor: statusColor,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            )}

            <Text style={styles.footer}>v2.0 · Électrise ta route ⚡</Text>
          </Animated.View>
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
    letterSpacing: 0.5,
    opacity: 0.85,
  },
  weatherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,20,0.85)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
    gap: 12,
    overflow: 'hidden',
  },
  weatherIcon: { fontSize: 36 },
  weatherTemp: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f0fdf4',
    letterSpacing: -0.5,
  },
  weatherDesc: {
    fontSize: 12,
    color: '#86efac',
    marginTop: 2,
    opacity: 0.8,
  },
  weatherBadge: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.4)',
  },
  weatherBadgeWarn: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderColor: 'rgba(245,158,11,0.4)',
  },
  weatherBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4ade80',
    letterSpacing: 0.5,
  },
  weatherBadgeTextWarn: { color: '#fbbf24' },
  card: {
    backgroundColor: 'rgba(15,23,20,0.85)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  batteryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  batteryValue: { fontSize: 22, fontWeight: '800', color: '#22c55e' },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#86efac',
    marginBottom: 6,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  batteryBarBg: {
    height: 12,
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  batteryBarFill: {
    height: '100%',
    borderRadius: 6,
    overflow: 'hidden',
  },
  input: {
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
  startInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  startInfoEmoji: { fontSize: 14 },
  startInfoText: { fontSize: 12, color: '#64748b', fontStyle: 'italic' },
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
  resultCard: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
    backgroundColor: 'rgba(15,23,20,0.9)',
  },
  resultHeaderGradient: { padding: 14, alignItems: 'center' },
  resultStatus: {
    color: '#050a08',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  resultBody: { padding: 16 },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  resultLabel: { fontSize: 13, color: '#94a3b8' },
  resultValue: { fontSize: 14, fontWeight: '700', color: '#f0fdf4' },
  divider: {
    height: 1,
    backgroundColor: 'rgba(34,197,94,0.15)',
    marginVertical: 8,
  },
  arrivalBarBg: {
    marginTop: 12,
    height: 8,
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  arrivalBarFill: { height: '100%', borderRadius: 4 },
  footer: {
    textAlign: 'center',
    color: '#334155',
    fontSize: 11,
    marginTop: 24,
    letterSpacing: 1,
  },
});