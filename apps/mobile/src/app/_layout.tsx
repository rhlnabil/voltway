import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { requireOptionalNativeModule } from 'expo';
import { useAuthStore } from '../stores/authStore';
import Splash from '../components/Splash';

// =============================================================
// Masque le bouton flottant des outils de développement d'Expo Go
// À exécuter une seule fois, avant tout rendu.
// =============================================================
const DevMenuPreferences = requireOptionalNativeModule('DevMenuPreferences');
DevMenuPreferences?.setPreferencesAsync({
  showFloatingActionButton: false,
}).catch(() => {
  // Silencieux si le module n'est pas disponible (ex: production build)
});

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [phase, setPhase] = useState<'loading' | 'splash' | 'ready'>('loading');
  const { isAuthenticated, checkAuth } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    (async () => {
      await checkAuth();
      await SplashScreen.hideAsync();
      setPhase('splash');
    })();
  }, []);

  useEffect(() => {
    if (phase !== 'ready' || isAuthenticated === null) return;

    const inAuth = segments[0] === 'auth';
    if (!isAuthenticated && !inAuth) router.replace('/auth/login');
    else if (isAuthenticated && inAuth) router.replace('/(tabs)');
  }, [phase, segments, isAuthenticated]);

  if (phase === 'loading' || isAuthenticated === null) {
    return (
      <View style={styles.fallback}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/register" />
      </Stack>
      {phase === 'splash' && <Splash onFinish={() => setPhase('ready')} />}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});