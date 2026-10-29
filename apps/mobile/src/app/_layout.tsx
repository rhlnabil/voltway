import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { tokenService } from '../services/tokenService';
import SplashAnimation from '../components/SplashAnimation';

SplashScreen.preventAutoHideAsync().catch(() => {});

type Phase = 'loading' | 'splash' | 'ready';

export default function RootLayout() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();
  const segments = useSegments();

  // === 1. Vérification initiale (une seule fois) ===
  useEffect(() => {
    (async () => {
      try {
        const token = await tokenService.getToken();
        console.log('[RootLayout] 🔍 Token initial:', token ? '✅' : '❌');
        setIsAuthenticated(!!token);
      } catch (e) {
        console.warn('[RootLayout] token error:', e);
        setIsAuthenticated(false);
      } finally {
        await SplashScreen.hideAsync();
        setPhase('splash');
      }
    })();
  }, []);

  // === 2. Filet de sécurité pour le splash (6.5s max) ===
  useEffect(() => {
    if (phase !== 'splash') return;
    const timer = setTimeout(() => {
      console.log('[RootLayout] 🛡️ Timeout splash → ready');
      setPhase('ready');
    }, 6500);
    return () => clearTimeout(timer);
  }, [phase]);

  // === 3. ⚡ RE-VÉRIFIE LE TOKEN À CHAQUE CHANGEMENT DE ROUTE ===
  useEffect(() => {
    if (phase !== 'ready') return;

    (async () => {
      const token = await tokenService.getToken();
      const authenticated = !!token;

      console.log(
        '[RootLayout] 🔄 Check →',
        'segments:', segments.join('/') || '(root)',
        '| token:', authenticated ? '✅' : '❌'
      );

      // Met à jour l'état (sans le mettre dans les deps pour éviter les boucles)
      setIsAuthenticated(authenticated);

      const inAuthGroup = segments[0] === 'auth';

      if (!authenticated && !inAuthGroup) {
        console.log('[RootLayout] → 🚪 Redirige vers /auth/login');
        router.replace('/auth/login');
      } else if (authenticated && inAuthGroup) {
        console.log('[RootLayout] → 🗺️ Redirige vers /(tabs)');
        router.replace('/(tabs)');
      } else {
        console.log('[RootLayout] ✅ Reste sur la route actuelle');
      }
    })();
  }, [phase, segments]); // ← segments en dep, PAS isAuthenticated

  // === 4. Render ===
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

      {phase === 'splash' && (
        <SplashAnimation
          onFinish={() => {
            console.log('[RootLayout] 🎬 Splash terminé → ready');
            setPhase('ready');
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});