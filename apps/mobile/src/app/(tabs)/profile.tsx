import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { vehiclesApi, Vehicle } from '../../services/vehiclesApi';
import { carImagesApi } from '../../services/carImagesApi';
import { pingBackend } from '../../services/apiClient';
import { authApi } from '../../services/authApi';
import { tokenService } from '../../services/tokenService';
import TripHistoryList from '../../components/TripHistoryList';

export default function ProfileScreen() {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backendOk, setBackendOk] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // 👤 Nom de personne (lié au compte JWT)
  const [personName, setPersonName] = useState('');

  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [autonomyKm, setAutonomyKm] = useState('');
  const [batteryKwh, setBatteryKwh] = useState('');

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      // Charge le nom de l'utilisateur depuis SecureStore
      const stored = await tokenService.getUser();
      if (stored) setPersonName(stored.name ?? '');

      const ok = await pingBackend();
      setBackendOk(ok);
      if (!ok) {
        setLoading(false);
        setStatusMsg("Backend injoignable — vérifie l'IP dans src/config.ts");
        return;
      }
      try {
        const list = await vehiclesApi.list();
        if (list.length > 0) {
          const v = list[0];
          setVehicle(v);
          setBrand(v.brand ?? '');
          setModel(v.model ?? '');
          setYear(v.year ? String(v.year) : '');
          setAutonomyKm(String(v.autonomyKm));
          setBatteryKwh(String(v.batteryKwh));
          setImageUrl(v.imageUrl ?? null);
        }
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 🔍 Auto-recherche d'image (debounce 800ms)
  useEffect(() => {
    if (!brand.trim() || !model.trim()) return;
    if (searchTimer) clearTimeout(searchTimer);

    const timer = setTimeout(async () => {
      setImageLoading(true);
      try {
        const res = await carImagesApi.find(
          brand.trim(),
          model.trim(),
          year ? Number(year) : undefined
        );
        if (res.found && res.imageUrl) setImageUrl(res.imageUrl);
        else setImageUrl(null);
      } catch {
        setImageUrl(null);
      } finally {
        setImageLoading(false);
      }
    }, 800);

    setSearchTimer(timer);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand, model, year]);

  async function save() {
    if (!backendOk) return;
    setSaving(true);
    setStatusMsg('');

    const autoModelName =
      [brand.trim(), model.trim()].filter(Boolean).join(' ') || 'Ma voiture';

    try {
      if (vehicle) await vehiclesApi.delete(vehicle.id);
      const created = await vehiclesApi.create({
        modelName: autoModelName,
        brand: brand || undefined,
        model: model || undefined,
        year: year ? Number(year) : undefined,
        imageUrl: imageUrl ?? undefined,
        autonomyKm: Number(autonomyKm) || 350,
        batteryKwh: Number(batteryKwh) || 60,
      });
      setVehicle(created);
      setStatusMsg('✅ Enregistré en BDD');
    } catch (e: any) {
      setStatusMsg(`❌ ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  // 🚪 Déconnexion
  function handleLogout() {
    Alert.alert(
      'Se déconnecter ?',
      'Vous devrez vous reconnecter pour accéder à VoltWay.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter',
          style: 'destructive',
          onPress: async () => {
            try {
              await authApi.logout();
              console.log('[Profile] ✓ Déconnecté');
              router.replace('/auth/login');
            } catch (e) {
              console.warn('[Profile] logout error:', e);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#d97706" />
        <Text style={styles.loadingText}>Chargement…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>👤 Mon profil</Text>
            <Text style={styles.subtitle}>
              {backendOk ? '🟢 Backend connecté' : '🔴 Backend injoignable'}
            </Text>
          </View>
          <Pressable
            style={styles.logoutBtnTop}
            onPress={handleLogout}
            hitSlop={8}
          >
            <Text style={styles.logoutIcon}>🚪</Text>
          </Pressable>
        </View>

        {/* 👤 Nom de personne */}
        <Text style={styles.label}>Nom de personne</Text>
        <TextInput
          style={styles.input}
          value={personName}
          onChangeText={setPersonName}
          placeholder="ex: Nabil"
          editable={false}
        />
        <Text style={styles.hint}>Modifiable après la prochaine version</Text>

        {/* 🚗 Véhicule */}
        <Text style={styles.sectionTitle}>🚗 Mon véhicule</Text>

        <View style={styles.imageWrap}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imageEmoji}>🚗</Text>
              <Text style={styles.imagePlaceholderLabel}>
                {imageLoading
                  ? 'Recherche…'
                  : brand && model
                  ? 'Aucune photo trouvée'
                  : 'Renseigne marque + modèle'}
              </Text>
            </View>
          )}
          {imageLoading && (
            <View style={styles.imageLoadingOverlay}>
              <ActivityIndicator color="#d97706" size="large" />
            </View>
          )}
        </View>

        <Text style={styles.label}>Marque</Text>
        <TextInput
          style={styles.input}
          value={brand}
          onChangeText={setBrand}
          placeholder="ex: Tesla"
        />

        <Text style={styles.label}>Modèle</Text>
        <TextInput
          style={styles.input}
          value={model}
          onChangeText={setModel}
          placeholder="ex: Model 3"
        />

        <Text style={styles.label}>Année</Text>
        <TextInput
          style={styles.input}
          value={year}
          onChangeText={setYear}
          placeholder="ex: 2023"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Autonomie réelle (km)</Text>
        <TextInput
          style={styles.input}
          value={autonomyKm}
          onChangeText={setAutonomyKm}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Capacité batterie (kWh)</Text>
        <TextInput
          style={styles.input}
          value={batteryKwh}
          onChangeText={setBatteryKwh}
          keyboardType="numeric"
        />

        <Pressable
          style={[
            styles.saveBtn,
            (saving || !backendOk) && styles.saveBtnDisabled,
          ]}
          onPress={save}
          disabled={saving || !backendOk}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveText}>💾 Enregistrer</Text>
          )}
        </Pressable>

        {statusMsg ? <Text style={styles.status}>{statusMsg}</Text> : null}

        {vehicle && (
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Véhicule actuel (BDD)</Text>
            <Text style={styles.infoText}>
              {vehicle.brand ? `${vehicle.brand} ` : ''}
              {vehicle.model ?? vehicle.modelName}
              {vehicle.year ? ` (${vehicle.year})` : ''}
            </Text>
            <Text style={styles.infoText}>
              {vehicle.autonomyKm} km · {vehicle.batteryKwh} kWh
            </Text>
            <Text style={styles.infoText}>
              Autonomie utile (marge 20%) :{' '}
              {Math.round(vehicle.autonomyKm * 0.8)} km
            </Text>
          </View>
        )}

        {/* 🧭 Historique trajets */}
        <TripHistoryList />

        {/* 🚪 Bouton déconnexion (en bas) */}
        <Pressable style={styles.logoutBtnBottom} onPress={handleLogout}>
          <Text style={styles.logoutTextBottom}>🚪 Se déconnecter</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fef3c7' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
  },
  loadingText: { marginTop: 12, color: '#92400e', fontWeight: '600' },
  scroll: { padding: 20, paddingBottom: 60 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#d97706',
    marginBottom: 4,
  },
  subtitle: { fontSize: 14, color: '#92400e' },
  logoutBtnTop: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  logoutIcon: { fontSize: 20 },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#92400e',
    marginTop: 24,
    marginBottom: 12,
  },
  imageWrap: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#fff',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
  },
  imageEmoji: { fontSize: 56, marginBottom: 6 },
  imagePlaceholderLabel: {
    color: '#92400e',
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 14,
    marginBottom: 6,
  },
  hint: {
    fontSize: 11,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginTop: 4,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    color: '#0f172a',
  },
  saveBtn: {
    marginTop: 24,
    backgroundColor: '#d97706',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: '#94a3b8' },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  status: { marginTop: 12, textAlign: 'center', color: '#475569' },
  infoBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  infoText: { fontSize: 13, color: '#475569', marginBottom: 4 },

  logoutBtnBottom: {
    marginTop: 30,
    marginBottom: 20,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  logoutTextBottom: { color: '#dc2626', fontWeight: '700', fontSize: 14 },
});