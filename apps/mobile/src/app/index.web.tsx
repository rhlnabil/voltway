import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Pressable,
  Linking,
} from 'react-native';
import * as Location from 'expo-location';
import { fetchNearbyStations, ChargeStation } from '../services/chargeStations';

const FALLBACK = { latitude: 48.8566, longitude: 2.3522 };

export default function MapScreenWeb() {
  const [location, setLocation] = useState(FALLBACK);
  const [stations, setStations] = useState<ChargeStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Démarrage...');

  useEffect(() => {
    (async () => {
      try {
        setStatus('Demande de permission géoloc...');
        try {
          const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
          if (permStatus === 'granted') {
            setStatus('Recherche de ta position...');
            const current = await Promise.race([
              Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
              new Promise<null>((r) => setTimeout(() => r(null), 8000)),
            ]);
            if (current) {
              setLocation({
                latitude: current.coords.latitude,
                longitude: current.coords.longitude,
              });
            }
          }
        } catch (e) {
          console.warn('[VoltWay web] geoloc failed:', e);
        }

        setStatus('Chargement des bornes...');
        try {
          const found = await fetchNearbyStations(
            location.latitude,
            location.longitude,
            15
          );
          setStations(found);
          setStatus(`${found.length} borne(s) trouvée(s)`);
        } catch (e: any) {
          console.error('[VoltWay web] API:', e);
          setStatus(`API erreur: ${e?.message ?? 'inconnue'}`);
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bbox = `${location.longitude - 0.1},${location.latitude - 0.08},${
    location.longitude + 0.1
  },${location.latitude + 0.08}`;
  const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${location.latitude},${location.longitude}`;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>⚡ VoltWay — Web</Text>
      <Text style={styles.status}>{loading ? status : `✅ ${status}`}</Text>
      {loading && <ActivityIndicator size="large" color="#22c55e" />}

      {/* Carte OSM en iframe */}
      <View style={styles.mapWrap}>
        {/* @ts-ignore — iframe HTML valide sur web */}
        <iframe
          src={osmUrl}
          style={{ border: 0, width: '100%', height: 400, borderRadius: 12 }}
          title="Carte VoltWay"
        />
      </View>

      <Text style={styles.sectionTitle}>
        Bornes à proximité ({stations.length})
      </Text>

      {stations.length === 0 && !loading && (
        <Text style={styles.empty}>
          Aucune borne reçue. Vérifie ta clé API Open Charge Map dans
          `src/services/chargeStations.ts`.
        </Text>
      )}

      {stations.slice(0, 30).map((s) => (
        <View key={s.id} style={styles.card}>
          <Text style={styles.cardTitle}>{s.name}</Text>
          <Text style={styles.cardInfo}>
            {s.powerKW ? `${s.powerKW} kW` : 'Puissance inconnue'}
            {s.connectors?.length ? ` — ${s.connectors.join(', ')}` : ''}
          </Text>
          <Pressable
            onPress={() =>
              Linking.openURL(
                `https://www.openstreetmap.org/?mlat=${s.latitude}&mlon=${s.longitude}#map=17/${s.latitude}/${s.longitude}`
              )
            }
          >
            <Text style={styles.link}>Ouvrir sur OSM →</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#16a34a', marginBottom: 6 },
  status: { fontSize: 13, color: '#475569', marginBottom: 12 },
  mapWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  empty: { color: '#64748b', fontStyle: 'italic', marginBottom: 12 },
  card: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  cardInfo: { fontSize: 12, color: '#64748b', marginTop: 4 },
  link: { color: '#2563eb', marginTop: 8, fontWeight: '600' },
});