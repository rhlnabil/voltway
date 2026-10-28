import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFiltersStore } from '../stores/filtersStore';

const POWER_OPTIONS = [0, 22, 50, 100, 150, 250];

type Props = {
  visible: boolean;
  onClose: () => void;
  resultCount: number;
};

export default function FilterPanel({ visible, onClose, resultCount }: Props) {
  const { filters, setMinPower, reset } = useFiltersStore();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Filtres</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Text style={styles.close}>✕</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
              <Text style={styles.section}>⚡ Puissance minimale</Text>
              <View style={styles.row}>
                {POWER_OPTIONS.map((kw) => {
                  const active = filters.minPowerKW === kw;
                  return (
                    <Pressable
                      key={kw}
                      onPress={() => setMinPower(kw)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          active && styles.chipTextActive,
                        ]}
                      >
                        {kw === 0 ? 'Toutes' : `≥ ${kw} kW`}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.resultBox}>
                <Text style={styles.resultText}>
                  ⚡ {resultCount} borne{resultCount > 1 ? 's' : ''}{' '}
                  correspondante{resultCount > 1 ? 's' : ''}
                </Text>
              </View>
            </ScrollView>

            <View style={styles.actions}>
              <Pressable style={styles.resetBtn} onPress={reset}>
                <Text style={styles.resetText}>Réinitialiser</Text>
              </Pressable>
              <Pressable style={styles.applyBtn} onPress={onClose}>
                <Text style={styles.applyText}>Voir les résultats</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  close: { fontSize: 22, color: '#64748b' },
  scroll: { padding: 20 },
  section: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: {
    backgroundColor: '#22c55e',
    borderColor: '#16a34a',
  },
  chipText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  chipTextActive: { color: '#ffffff' },
  resultBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
  },
  resultText: { color: '#166534', fontWeight: '600', fontSize: 13 },
  actions: {
    flexDirection: 'row',
    gap: 10,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  resetText: { color: '#475569', fontWeight: '700' },
  applyBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#22c55e',
    alignItems: 'center',
  },
  applyText: { color: '#ffffff', fontWeight: '700' },
});