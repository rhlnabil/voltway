import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { vehiclesApi, Vehicle } from '../services/vehiclesApi';
import { pingBackend } from '../services/apiClient';

export default function ProfileScreen() {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backendOk, setBackendOk] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const [modelName, setModelName] = useState('');
  const [autonomyKm, setAutonomyKm] = useState('');
  const [batteryKwh, setBatteryKwh] = useState('');

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
          setModelName(v.modelName);
          setAutonomyKm(String(v.autonomyKm));
          setBatteryKwh(String(v.batteryKwh));
        }
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    if (!backendOk) return;
    setSaving(true);
    setStatusMsg('');
    try {
      if (vehicle) await vehiclesApi.delete(vehicle.id);
      const created = await vehiclesApi.create({
        modelName: modelName || 'Ma voiture',
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
        <Text style={styles.title}>👤 Mon véhicule</Text>
        <Text style={styles.subtitle}>
          {backendOk ? '🟢 Backend connecté' : '🔴 Backend injoignable'}
        </Text>

        <Text style={styles.label}>Nom du véhicule</Text>
        <TextInput
          style={styles.input}
          value={modelName}
          onChangeText={setModelName}
          placeholder="ex: Dacia Spring"
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
            <Text style={styles.infoText}>ID: {vehicle.id}</Text>
            <Text style={styles.infoText}>
              {vehicle.modelName} · {vehicle.autonomyKm} km ·{' '}
              {vehicle.batteryKwh} kWh
            </Text>
            <Text style={styles.infoText}>
              Autonomie utile (marge 20%) :{' '}
              {Math.round(vehicle.autonomyKm * 0.8)} km
            </Text>
          </View>
        )}
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