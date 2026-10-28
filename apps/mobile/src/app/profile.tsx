import { useEffect, useRef, useState } from 'react';
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
import { vehiclesApi, Vehicle } from '../services/vehiclesApi';
import { carImagesApi } from '../services/carImagesApi';
import { pingBackend } from '../services/apiClient';
import TripHistoryList from '../components/TripHistoryList';

export default function ProfileScreen() {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backendOk, setBackendOk] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // 👤 Nom de personne (sera lié au compte JWT)
  const [personName, setPersonName] = useState('');

  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [autonomyKm, setAutonomyKm] = useState('');
  const [batteryKwh, setBatteryKwh] = useState('');

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  // 🔍 Cache de la dernière combinaison recherchée
  const lastSearchRef = useRef<string>('');
  const skipInitialRef = useRef(true);

  // Chargement initial du véhicule
  useEffect(() => {
    (async () => {
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

          // 🔒 On mémorise la combinaison pour ne pas re-déclencher l'auto-search
          lastSearchRef.current = `${(v.brand ?? '').trim()}|${(v.model ?? '').trim()}|${
            v.year ?? ''
          }`;
        }
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
        skipInitialRef.current = false;
      }
    })();
  }, []);

  // 🔍 Auto-recherche de la photo (debounce 800 ms)
  useEffect(() => {
    if (skipInitialRef.current) return;

    const b = brand.trim();
    const m = model.trim();
    const y = year.trim();

    // Il faut au minimum marque + modèle
    if (!b || !m) return;

    const key = `${b}|${m}|${y}`;
    if (key === lastSearchRef.current) return;

    const timer = setTimeout(async () => {
      lastSearchRef.current = key;
      setImageLoading(true);
      setImageUrl(null);
      try {
        const res = await carImagesApi.find(b, m, y ? Number(y) : undefined);
        if (res.found && res.imageUrl) {
          setImageUrl(res.imageUrl);
        }
      } catch (e) {
        // silencieux — l'utilisateur peut cliquer sur 🔄
      } finally {
        setImageLoading(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [brand, model, year]);

  // Recherche manuelle (bouton 🔄)
  async function refreshImage() {
    if (!brand.trim() || !model.trim()) {
      Alert.alert(
        'Marque et modèle requis',
        'Renseigne au moins la marque et le modèle.'
      );
      return;
    }
    setImageLoading(true);
    setStatusMsg('');
    try {
      const res = await carImagesApi.find(
        brand.trim(),
        model.trim(),
        year ? Number(year) : undefined
      );
      if (res.found && res.imageUrl) {
        setImageUrl(res.imageUrl);
        setStatusMsg('✅ Photo mise à jour');
        lastSearchRef.current = `${brand.trim()}|${model.trim()}|${year.trim()}`;
      } else {
        setImageUrl(null);
        setStatusMsg('❌ Aucune photo trouvée — tu peux enregistrer sans photo.');
      }
    } catch (e: any) {
      setImageUrl(null);
      setStatusMsg(`❌ ${e.message}`);
    } finally {
      setImageLoading(false);
    }
  }

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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#d97706" />
        <Text style={styles.loadingText}>Connexion au backend…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>👤 Mon profil</Text>
        <Text style={styles.subtitle}>
          {backendOk ? '🟢 Backend connecté' : '🔴 Backend injoignable'}
        </Text>

        {/* 👤 Nom de personne (sera lié au compte JWT) */}
        <Text style={styles.label}>Nom de personne</Text>
        <TextInput
          style={styles.input}
          value={personName}
          onChangeText={setPersonName}
          placeholder="ex: Nabil"
        />

        {/* Photo auto */}
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

        <Pressable
          style={[styles.imageBtn, imageLoading && styles.imageBtnDisabled]}
          onPress={refreshImage}
          disabled={imageLoading}
        >
          {imageLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.imageBtnText}>🔄 Rafraîchir la photo</Text>
          )}
        </Pressable>

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

        <TripHistoryList />
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#d97706',
    marginBottom: 4,
  },
  subtitle: { fontSize: 14, color: '#92400e', marginBottom: 20 },
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
  imageBtn: {
    marginTop: 10,
    backgroundColor: '#d97706',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  imageBtnDisabled: { backgroundColor: '#94a3b8' },
  imageBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 14,
    marginBottom: 6,
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
});