import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tripsApi, TripDto } from '../services/tripsApi';

export default function TripHistoryList() {
  const [trips, setTrips] = useState<TripDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<TripDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  async function loadTrips() {
    setLoading(true);
    setError(null);
    try {
      const data = await tripsApi.list();
      setTrips(data);
    } catch (e: any) {
      setError(e?.message ?? 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrips();
  }, []);

  async function openDetails(trip: TripDto) {
    setSelectedTrip(trip);
    setDetailLoading(true);
    try {
      const full = await tripsApi.get(trip.id);
      setSelectedTrip(full);
    } catch (e: any) {
      console.warn('[TripHistory] detail:', e);
    } finally {
      setDetailLoading(false);
    }
  }

  async function confirmDelete(trip: TripDto) {
    Alert.alert(
      'Supprimer ce trajet ?',
      `${trip.startLabel.split(',')[0]} → ${trip.endLabel.split(',')[0]}`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await tripsApi.delete(trip.id);
              setTrips((prev) => prev.filter((t) => t.id !== trip.id));
              if (selectedTrip?.id === trip.id) setSelectedTrip(null);
            } catch (e: any) {
              Alert.alert('Erreur', e.message);
            }
          },
        },
      ]
    );
  }

  // 📤 Partage du trajet (avec toutes les bornes si nécessaire)
  async function shareTrip(trip: TripDto) {
    try {
      // Si les bornes ne sont pas chargées (partage depuis la carte),
      // on récupère le trajet complet depuis le backend
      let fullTrip = trip;
      if (trip.stopsNeeded > 0 && (!trip.stations || trip.stations.length === 0)) {
        fullTrip = await tripsApi.get(trip.id);
      }

      // Construit la partie "bornes"
      let stationsText = '';
      if (fullTrip.stopsNeeded > 0 && fullTrip.stations && fullTrip.stations.length > 0) {
        stationsText =
          '\n\n🔌 Bornes le long du trajet :\n' +
          fullTrip.stations
            .map(
              (s, i) =>
                `${i + 1}. ${s.stationName} (${s.powerKw ?? '?'} kW) — à ${s.distanceFromStartKm.toFixed(0)} km`
            )
            .join('\n');
      }

      // Message de recharge : seulement si arrêts nécessaires
      const chargingLine =
        fullTrip.stopsNeeded > 0
          ? `🔋 ${fullTrip.stopsNeeded} arrêt${fullTrip.stopsNeeded > 1 ? 's' : ''} de recharge prévu${fullTrip.stopsNeeded > 1 ? 's' : ''}`
          : `🔋 Aucun arrêt nécessaire (autonomie suffisante)`;

      const message =
        `🚗 Mon trajet VoltWay\n\n` +
        `📍 ${fullTrip.startLabel.split(',')[0]} → ${fullTrip.endLabel.split(',')[0]}\n` +
        `📏 ${fullTrip.distanceKm.toFixed(0)} km · ⏱️ ${formatDuration(fullTrip.durationS)}\n` +
        chargingLine +
        stationsText +
        `\n\n⚡ Planifié avec VoltWay`;

      await Share.share({
        message,
        title: `Trajet ${fullTrip.startLabel.split(',')[0]} → ${fullTrip.endLabel.split(',')[0]}`,
      });
    } catch (e: any) {
      Alert.alert('Erreur de partage', e.message ?? 'Impossible de partager');
    }
  }

  function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatDuration(sec: number): string {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`;
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#16a34a" />
        <Text style={styles.loadingText}>Chargement des trajets…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>❌ {error}</Text>
        <Pressable style={styles.retryBtn} onPress={loadTrips}>
          <Text style={styles.retryText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>🧭 Mes trajets ({trips.length})</Text>
        <Pressable onPress={loadTrips} hitSlop={12}>
          <Text style={styles.refresh}>↻</Text>
        </Pressable>
      </View>

      {trips.length === 0 && (
        <Text style={styles.empty}>
          Aucun trajet sauvegardé. Planifie ton premier trajet dans l'onglet
          Planifier.
        </Text>
      )}

      {trips.map((trip) => (
        <Pressable
          key={trip.id}
          style={styles.card}
          onPress={() => openDetails(trip)}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardRoute} numberOfLines={1}>
              {trip.startLabel.split(',')[0]} → {trip.endLabel.split(',')[0]}
            </Text>
            <Text style={styles.cardDate}>{formatDate(trip.createdAt)}</Text>
          </View>
          <View style={styles.cardStats}>
            <Text style={styles.stat}>{trip.distanceKm.toFixed(0)} km</Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.stat}>{formatDuration(trip.durationS)}</Text>
            {trip.stopsNeeded > 0 && (
              <>
                <Text style={styles.dot}>•</Text>
                <Text style={styles.stat}>
                  {trip.stopsNeeded} arrêt{trip.stopsNeeded > 1 ? 's' : ''}
                </Text>
              </>
            )}
          </View>

          <View style={styles.cardActions}>
            <Pressable
              style={styles.cardShareBtn}
              onPress={(e) => {
                e.stopPropagation();
                shareTrip(trip);
              }}
              hitSlop={8}
            >
              <Text style={styles.cardShareText}>📤 Partager</Text>
            </Pressable>
            <Pressable
              style={styles.cardDeleteBtn}
              onPress={(e) => {
                e.stopPropagation();
                confirmDelete(trip);
              }}
              hitSlop={8}
            >
              <Text style={styles.cardDeleteText}>🗑️</Text>
            </Pressable>
          </View>
        </Pressable>
      ))}

      <Modal
        visible={!!selectedTrip}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedTrip(null)}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <SafeAreaView edges={['bottom']}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Détails du trajet</Text>
                <View style={styles.sheetActions}>
                  {selectedTrip && (
                    <Pressable
                      onPress={() => shareTrip(selectedTrip)}
                      hitSlop={12}
                      style={styles.shareBtnHeader}
                    >
                      <Text style={styles.shareIconHeader}>📤</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => setSelectedTrip(null)} hitSlop={12}>
                    <Text style={styles.close}>✕</Text>
                  </Pressable>
                </View>
              </View>

              {selectedTrip && (
                <ScrollView contentContainerStyle={styles.sheetScroll}>
                  <Text style={styles.sheetRoute}>
                    {selectedTrip.startLabel.split(',')[0]} →{' '}
                    {selectedTrip.endLabel.split(',')[0]}
                  </Text>
                  <Text style={styles.sheetDate}>
                    {formatDate(selectedTrip.createdAt)}
                  </Text>

                  <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                      <Text style={styles.statValue}>
                        {selectedTrip.distanceKm.toFixed(0)}
                      </Text>
                      <Text style={styles.statLabel}>km</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statValue}>
                        {formatDuration(selectedTrip.durationS)}
                      </Text>
                      <Text style={styles.statLabel}>durée</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statValue}>
                        {selectedTrip.stopsNeeded}
                      </Text>
                      <Text style={styles.statLabel}>arrêts</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statValue}>
                        {selectedTrip.stations?.length ?? 0}
                      </Text>
                      <Text style={styles.statLabel}>bornes</Text>
                    </View>
                  </View>

                  {detailLoading && (
                    <ActivityIndicator
                      color="#16a34a"
                      style={{ marginVertical: 20 }}
                    />
                  )}

                  {selectedTrip.stations &&
                    selectedTrip.stations.length > 0 && (
                      <>
                        <Text style={styles.subTitle}>
                          🔌 Bornes le long du trajet
                        </Text>
                        {selectedTrip.stations.map((s, idx) => (
                          <View
                            key={`${s.ocmStationId}-${idx}`}
                            style={styles.stationRow}
                          >
                            <Text style={styles.stationIdx}>#{idx + 1}</Text>
                            <View style={{ flex: 1 }}>
                              <Text
                                style={styles.stationName}
                                numberOfLines={2}
                              >
                                {s.stationName}
                              </Text>
                              <Text style={styles.stationInfo}>
                                {s.powerKw ? `${s.powerKw} kW` : 'Puissance ?'}
                                {' · '}
                                📍 à {s.distanceFromStartKm.toFixed(0)} km
                              </Text>
                            </View>
                          </View>
                        ))}
                      </>
                    )}

                  {!detailLoading &&
                    (!selectedTrip.stations ||
                      selectedTrip.stations.length === 0) && (
                      <Text style={styles.emptyStations}>
                        Aucune borne enregistrée pour ce trajet.
                      </Text>
                    )}

                  <Pressable
                    style={styles.shareBtn}
                    onPress={() => shareTrip(selectedTrip)}
                  >
                    <Text style={styles.shareBtnText}>📤 Partager ce trajet</Text>
                  </Pressable>
                </ScrollView>
              )}
            </SafeAreaView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 24 },
  center: { padding: 20, alignItems: 'center' },
  loadingText: { marginTop: 8, color: '#64748b' },
  errorText: { color: '#ef4444', marginBottom: 10 },
  retryBtn: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: { color: '#fff', fontWeight: '700' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  refresh: { fontSize: 22, color: '#16a34a' },
  empty: {
    color: '#64748b',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardRoute: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  cardDate: { fontSize: 11, color: '#94a3b8', marginLeft: 8 },
  cardStats: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  stat: { fontSize: 12, color: '#475569', fontWeight: '600' },
  dot: { marginHorizontal: 6, color: '#cbd5e1' },

  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cardShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cardShareText: { color: '#2563eb', fontWeight: '700', fontSize: 12 },
  cardDeleteBtn: { padding: 4 },
  cardDeleteText: { fontSize: 16 },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sheetActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  shareBtnHeader: { padding: 4 },
  shareIconHeader: { fontSize: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  close: { fontSize: 22, color: '#64748b' },
  sheetScroll: { padding: 20, paddingBottom: 40 },
  sheetRoute: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  sheetDate: { fontSize: 12, color: '#94a3b8', marginBottom: 16 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  statBox: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#16a34a' },
  statLabel: { fontSize: 11, color: '#475569', marginTop: 2 },
  subTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  stationRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 10,
  },
  stationIdx: {
    fontWeight: '800',
    color: '#22c55e',
    fontSize: 12,
    minWidth: 28,
  },
  stationName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  stationInfo: { fontSize: 11, color: '#475569', marginTop: 2 },
  emptyStations: {
    color: '#64748b',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },

  shareBtn: {
    marginTop: 24,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  shareBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});