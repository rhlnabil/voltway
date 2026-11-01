import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { vehiclesApi, Vehicle } from '../../services/vehicles';
import { tripsApi, Trip } from '../../services/trips';
import { useAuthStore } from '../../stores/authStore';
import { tokenService } from '../../services/token';

const { width, height } = Dimensions.get('window');

export default function Profile() {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [autonomyKm, setAutonomyKm] = useState('');
  const [batteryKwh, setBatteryKwh] = useState('');
  const [userName, setUserName] = useState('');
  const [focused, setFocused] = useState<string | null>(null);

  const logout = useAuthStore((s) => s.logout);

  const auroraShift = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const haloPulse = useRef(new Animated.Value(0)).current;

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

    Animated.loop(
      Animated.sequence([
        Animated.timing(haloPulse, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(haloPulse, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  });

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setLoading(true);
        try {
          const stored = await tokenService.getUser();
          if (stored && !cancelled) setUserName(stored.name);

          const list = await vehiclesApi.list();
          if (!cancelled && list.length) {
            const v = list[0];
            setVehicle(v);
            setBrand(v.brand ?? '');
            setModel(v.model ?? '');
            setYear(v.year ? String(v.year) : '');
            setAutonomyKm(String(v.autonomyKm));
            setBatteryKwh(String(v.batteryKwh));
          }

          const t = await tripsApi.list();
          if (!cancelled) setTrips(t);
        } catch (e) {
          console.warn(e);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  async function save() {
    if (!brand || !model) return Alert.alert('Marque et modèle requis');
    setSaving(true);
    try {
      const modelName = `${brand} ${model}`.trim();
      if (vehicle) await vehiclesApi.delete(vehicle.id);
      const created = await vehiclesApi.create({
        modelName,
        brand,
        model,
        year: year ? Number(year) : undefined,
        autonomyKm: Number(autonomyKm) || 350,
        batteryKwh: Number(batteryKwh) || 60,
      });
      setVehicle(created);
      Alert.alert('✅ Enregistré');
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    Alert.alert('Déconnexion', 'Veux-tu vraiment te déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/auth/login');
        },
      },
    ]);
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
  const haloScale = haloPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.4],
  });
  const haloOpacity = haloPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0],
  });

  const initial = (userName || 'V').charAt(0).toUpperCase();
  const totalKm = trips.reduce((sum, t) => sum + t.distanceKm, 0);
  const displayAutonomy = vehicle?.autonomyKm ?? 0;

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Chargement…</Text>
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
          <Animated.View style={{ opacity: fadeIn }}>
            {/* HEADER */}
            <View style={styles.header}>
              <View style={styles.avatarWrap}>
                <Animated.View
                  style={[
                    styles.avatarHalo,
                    { opacity: haloOpacity, transform: [{ scale: haloScale }] },
                  ]}
                />
                <LinearGradient
                  colors={['#22c55e', '#16a34a']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatar}
                >
                  <Text style={styles.avatarText}>{initial}</Text>
                </LinearGradient>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.greeting}>Bonjour,</Text>
                <Text style={styles.userName} numberOfLines={1}>
                  {userName || 'Conducteur'}
                </Text>
              </View>
            </View>

            {/* STATS : KM CUMULÉS · TRAJETS · AUTONOMIE */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statEmoji}>🛣️</Text>
                <Text style={styles.statValue}>{totalKm.toFixed(0)}</Text>
                <Text style={styles.statLabel}>KM CUMULÉS</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statEmoji}>🧭</Text>
                <Text style={styles.statValue}>{trips.length}</Text>
                <Text style={styles.statLabel}>TRAJETS</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statEmoji}>⚡</Text>
                <Text style={styles.statValue}>
                  {displayAutonomy > 0 ? displayAutonomy : '—'}
                </Text>
                <Text style={styles.statLabel}>KM AUTONOMIE</Text>
              </View>
            </View>

            {/* VÉHICULE */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🚗 Mon véhicule</Text>
              {vehicle && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>⚡ Électrique</Text>
                </View>
              )}
            </View>

            <View style={styles.card}>
              {vehicle && (
                <View style={styles.vehiclePreview}>
                  <Text style={styles.vehiclePreviewName}>
                    {vehicle.brand} {vehicle.model}
                  </Text>
                  {vehicle.year && (
                    <Text style={styles.vehiclePreviewYear}>
                      {vehicle.year}
                    </Text>
                  )}
                </View>
              )}

              <Text style={styles.label}>Marque</Text>
              <TextInput
                style={[
                  styles.input,
                  focused === 'brand' && styles.inputFocused,
                ]}
                value={brand}
                onChangeText={setBrand}
                placeholder="Tesla"
                placeholderTextColor="#475569"
                onFocus={() => setFocused('brand')}
                onBlur={() => setFocused(null)}
              />

              <Text style={styles.label}>Modèle</Text>
              <TextInput
                style={[
                  styles.input,
                  focused === 'model' && styles.inputFocused,
                ]}
                value={model}
                onChangeText={setModel}
                placeholder="Model 3"
                placeholderTextColor="#475569"
                onFocus={() => setFocused('model')}
                onBlur={() => setFocused(null)}
              />

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Année</Text>
                  <TextInput
                    style={[
                      styles.input,
                      focused === 'year' && styles.inputFocused,
                    ]}
                    value={year}
                    onChangeText={setYear}
                    keyboardType="numeric"
                    placeholder="2024"
                    placeholderTextColor="#475569"
                    onFocus={() => setFocused('year')}
                    onBlur={() => setFocused(null)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Batterie (kWh)</Text>
                  <TextInput
                    style={[
                      styles.input,
                      focused === 'battery' && styles.inputFocused,
                    ]}
                    value={batteryKwh}
                    onChangeText={setBatteryKwh}
                    keyboardType="numeric"
                    placeholder="60"
                    placeholderTextColor="#475569"
                    onFocus={() => setFocused('battery')}
                    onBlur={() => setFocused(null)}
                  />
                </View>
              </View>

              <Text style={styles.label}>Autonomie (km)</Text>
              <TextInput
                style={[
                  styles.input,
                  focused === 'autonomy' && styles.inputFocused,
                ]}
                value={autonomyKm}
                onChangeText={setAutonomyKm}
                keyboardType="numeric"
                placeholder="350"
                placeholderTextColor="#475569"
                onFocus={() => setFocused('autonomy')}
                onBlur={() => setFocused(null)}
              />

              <View style={styles.saveBtnWrapper}>
                <View style={styles.saveBtn}>
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
                    onPress={save}
                    disabled={saving}
                    style={styles.saveBtnInner}
                  >
                    {saving ? (
                      <ActivityIndicator color="#050a08" />
                    ) : (
                      <Text style={styles.saveText}>💾 Enregistrer</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>

            {/* TRAJETS */}
            <Text style={styles.sectionTitle}>
              🧭 Mes trajets ({trips.length})
            </Text>

            {trips.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>🗺️</Text>
                <Text style={styles.emptyText}>
                  Aucun trajet sauvegardé.{'\n'}
                  Lance-toi depuis l'onglet Planifier !
                </Text>
              </View>
            ) : (
              trips.map((t) => (
                <View key={t.id} style={styles.tripCard}>
                  <View style={styles.tripDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tripTitle} numberOfLines={1}>
                      {t.startLabel.split(',')[0]} → {t.endLabel.split(',')[0]}
                    </Text>
                    <Text style={styles.tripMeta}>
                      {t.distanceKm.toFixed(0)} km ·{' '}
                      {Math.floor(t.durationS / 60)} min
                    </Text>
                  </View>
                  <Text style={styles.tripArrow}>›</Text>
                </View>
              ))
            )}

            {/* DÉCONNEXION */}
            <Pressable
              style={({ pressed }) => [
                styles.logoutBtn,
                pressed && { opacity: 0.85 },
              ]}
              onPress={handleLogout}
            >
              <Text style={styles.logoutIcon}>⏻</Text>
              <Text style={styles.logoutText}>Déconnexion</Text>
            </Pressable>

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
  loadingRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#050a08',
  },
  loadingText: { color: '#86efac', marginTop: 12, fontSize: 13 },

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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 20,
    gap: 14,
  },
  avatarWrap: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHalo: {
    position: 'absolute',
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#22c55e',
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#050a08',
    fontSize: 26,
    fontWeight: '800',
  },
  greeting: {
    color: '#86efac',
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  userName: {
    color: '#f0fdf4',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  // STATS (3 cartes)
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(15,23,20,0.85)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
  },
  statEmoji: { fontSize: 20, marginBottom: 6 },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#22c55e',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#86efac',
    letterSpacing: 0.8,
    marginTop: 4,
    opacity: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#86efac',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 24,
    marginBottom: 12,
  },
  badge: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  badgeText: {
    color: '#4ade80',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },

  card: {
    backgroundColor: 'rgba(15,23,20,0.85)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  vehiclePreview: {
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(34,197,94,0.15)',
  },
  vehiclePreviewName: {
    color: '#f0fdf4',
    fontSize: 20,
    fontWeight: '800',
  },
  vehiclePreviewYear: {
    color: '#86efac',
    fontSize: 12,
    marginTop: 2,
    opacity: 0.8,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#86efac',
    marginBottom: 6,
    marginTop: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#0a1410',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  inputFocused: { borderColor: '#22c55e' },
  row: { flexDirection: 'row', gap: 12 },

  saveBtnWrapper: {
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#22c55e',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  saveBtn: { overflow: 'hidden' },
  saveBtnInner: {
    paddingVertical: 15,
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
  saveText: {
    color: '#050a08',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  emptyCard: {
    backgroundColor: 'rgba(15,23,20,0.6)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(34,197,94,0.2)',
  },
  emptyEmoji: { fontSize: 36, marginBottom: 8, opacity: 0.7 },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  tripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,20,0.75)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.12)',
  },
  tripDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    marginRight: 12,
    shadowColor: '#22c55e',
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  tripTitle: { color: '#f0fdf4', fontSize: 14, fontWeight: '700' },
  tripMeta: { color: '#64748b', fontSize: 12, marginTop: 3 },
  tripArrow: { color: '#22c55e', fontSize: 22, opacity: 0.5 },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 32,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
  },
  logoutIcon: { color: '#ef4444', fontSize: 18, fontWeight: '800' },
  logoutText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  footer: {
    textAlign: 'center',
    color: '#334155',
    fontSize: 11,
    marginTop: 24,
    letterSpacing: 1,
  },
});