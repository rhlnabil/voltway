import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { router } from 'expo-router';
import { authApi } from '../../services/auth';
import { useAuthStore } from '../../stores/authStore';

const { width, height } = Dimensions.get('window');
const MaskedViewAny = MaskedView as any;

// =============================================================
// 1. TEXTE EN DÉGRADÉ (toujours visible, pulsation légère)
// =============================================================
function AnimatedGradientText({ text, style }: { text: string; style?: any }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1],
  });

  return (
    <Animated.View style={{ opacity }}>
      <MaskedViewAny
        maskElement={
          <Text style={[style, { backgroundColor: 'transparent' }]}>
            {text}
          </Text>
        }
      >
        <LinearGradient
          colors={['#22c55e', '#4ade80', '#86efac', '#4ade80', '#22c55e']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: width, height: 60 }}
        />
      </MaskedViewAny>
    </Animated.View>
  );
}

// =============================================================
// 2. PARTICULE ÉLECTRIQUE
// =============================================================
function ElectricParticle({
  startX,
  delay,
  duration,
  size,
}: {
  startX: number;
  delay: number;
  duration: number;
  size: number;
}) {
  const y = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.loop(
        Animated.parallel([
          Animated.timing(y, {
            toValue: -height - 50,
            duration,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.9,
              duration: duration * 0.2,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0.9,
              duration: duration * 0.6,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: duration * 0.2,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: startX,
        bottom: 0,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#4ade80',
        opacity,
        transform: [{ translateY: y }],
        shadowColor: '#4ade80',
        shadowOpacity: 1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 0 },
      }}
    />
  );
}

// =============================================================
// 3. TAGLINE MACHINE À ÉCRIRE
// =============================================================
function TypedTagline({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState('');
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 80);
    return () => clearInterval(interval);
  }, [text]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.taglineRow}>
      <Text style={styles.tagline}>{displayed}</Text>
      <Animated.Text style={[styles.tagline, { opacity: cursorOpacity }]}>
        |
      </Animated.Text>
    </View>
  );
}

// =============================================================
// 4. INDICATEUR DE CHARGE ANIMÉ
// =============================================================
function ChargingIndicator() {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: false,
        }),
        Animated.delay(400),
        Animated.timing(progress, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.chargingRow}>
      <Text style={styles.chargingLabel}>⚡ Charging</Text>
      <View style={styles.chargingBarBg}>
        <Animated.View style={[styles.chargingBarFill, { width }]} />
      </View>
    </View>
  );
}

// =============================================================
// ÉCRAN PRINCIPAL
// =============================================================
export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<'name' | 'email' | 'password' | null>(
    null
  );
  const checkAuth = useAuthStore((s) => s.checkAuth);

  const auroraShift = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const borderRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(auroraShift, {
          toValue: 1,
          duration: 12000,
          useNativeDriver: true,
        }),
        Animated.timing(auroraShift, {
          toValue: 0,
          duration: 12000,
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
      Animated.timing(borderRotate, {
        toValue: 1,
        duration: 5000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password)
      return Alert.alert('Erreur', 'Remplis tous les champs');
    if (password.length < 6)
      return Alert.alert('Erreur', 'Mot de passe : 6 caractères min.');
    setLoading(true);
    try {
      await authApi.register(email.trim(), password, name.trim());
      await checkAuth();
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Inscription échouée', e.message);
    } finally {
      setLoading(false);
    }
  }

  const auroraX = auroraShift.interpolate({
    inputRange: [0, 1],
    outputRange: [-width * 0.3, width * 0.3],
  });
  const auroraXNeg = auroraShift.interpolate({
    inputRange: [0, 1],
    outputRange: [width * 0.3, -width * 0.3],
  });
  const auroraY = auroraShift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -60],
  });
  const shimmerX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 400],
  });
  const borderAngle = borderRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const particles = useRef(
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      startX: Math.random() * width,
      delay: Math.random() * 3000,
      duration: 5000 + Math.random() * 5000,
      size: 2 + Math.random() * 3,
    }))
  ).current;

  return (
    <View style={styles.root}>
      <Animated.View
        style={[
          styles.auroraLayer,
          { transform: [{ translateX: auroraX }, { translateY: auroraY }] },
        ]}
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
          { transform: [{ translateX: auroraX }, { translateY: auroraY }] },
        ]}
      >
        <LinearGradient
          colors={['#166534', 'transparent']}
          style={styles.fill}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.auroraBlob,
          styles.blob2,
          { transform: [{ translateX: auroraXNeg }, { translateY: auroraY }] },
        ]}
      >
        <LinearGradient
          colors={['#14532d', 'transparent']}
          style={styles.fill}
        />
      </Animated.View>

      {particles.map((p) => (
        <ElectricParticle
          key={p.id}
          startX={p.startX}
          delay={p.delay}
          duration={p.duration}
          size={p.size}
        />
      ))}

      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.center}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <AnimatedGradientText text="VoltWay" style={styles.brandText} />
            <TypedTagline text="Rejoignez la révolution." />

            <View style={styles.cardWrapper}>
              <Animated.View
                style={[
                  styles.cardBorderGradient,
                  { transform: [{ rotate: borderAngle }] },
                ]}
              >
                <LinearGradient
                  colors={['#22c55e', '#050a08', '#4ade80', '#050a08']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.flex}
                />
              </Animated.View>

              <View style={styles.card}>
                <ChargingIndicator />

                <Text style={styles.cardTitle}>Créer un compte</Text>

                <View style={styles.field}>
                  <Text style={styles.label}>Nom</Text>
                  <TextInput
                    style={[
                      styles.input,
                      focused === 'name' && styles.inputFocused,
                    ]}
                    placeholder="Ton nom"
                    placeholderTextColor="#475569"
                    value={name}
                    onChangeText={setName}
                    onFocus={() => setFocused('name')}
                    onBlur={() => setFocused(null)}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={[
                      styles.input,
                      focused === 'email' && styles.inputFocused,
                    ]}
                    placeholder="ton@email.com"
                    placeholderTextColor="#475569"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Mot de passe</Text>
                  <TextInput
                    style={[
                      styles.input,
                      focused === 'password' && styles.inputFocused,
                    ]}
                    placeholder="6 caractères minimum"
                    placeholderTextColor="#475569"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                  />
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.btn,
                    pressed && { transform: [{ scale: 0.97 }] },
                    loading && { opacity: 0.6 },
                  ]}
                  onPress={handleRegister}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#22c55e', '#16a34a']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.fill}
                  />
                  <Animated.View
                    style={[
                      styles.shimmer,
                      { transform: [{ translateX: shimmerX }] },
                    ]}
                  >
                    <LinearGradient
                      colors={[
                        'transparent',
                        'rgba(255,255,255,0.5)',
                        'transparent',
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.flex}
                    />
                  </Animated.View>
                  {loading ? (
                    <ActivityIndicator color="#050a08" />
                  ) : (
                    <Text style={styles.btnText}>S'inscrire</Text>
                  )}
                </Pressable>

                <Pressable onPress={() => router.back()}>
                  <Text style={styles.link}>
                    Déjà un compte ?{' '}
                    <Text style={styles.linkBold}>Se connecter</Text>
                  </Text>
                </Pressable>
              </View>
            </View>

            <Text style={styles.footer}>v2.0 · Électrise ta route ⚡</Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050a08' },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  flex: { flex: 1 },
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
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 160,
    marginBottom: 4,
  },
  logo: { width: 140, height: 140 },
  brandText: {
    fontSize: 44,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -1.5,
  },
  taglineRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 24,
  },
  tagline: {
    fontSize: 11,
    color: '#86efac',
    letterSpacing: 4,
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  cardWrapper: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  cardBorderGradient: {
    position: 'absolute',
    top: -200,
    left: -200,
    right: -200,
    bottom: -200,
  },
  card: {
    margin: 2,
    backgroundColor: 'rgba(8, 20, 14, 0.95)',
    borderRadius: 26,
    padding: 24,
  },
  chargingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  chargingLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4ade80',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  chargingBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  chargingBarFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f0fdf4',
    marginBottom: 20,
  },
  field: { marginBottom: 16 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#86efac',
    marginBottom: 8,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#0a1410',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  inputFocused: {
    borderColor: '#22c55e',
  },
  btn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#22c55e',
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 150,
    height: '100%',
  },
  btnText: {
    color: '#050a08',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  link: { textAlign: 'center', color: '#64748b', fontSize: 13 },
  linkBold: { color: '#4ade80', fontWeight: '700' },
  footer: {
    textAlign: 'center',
    color: '#334155',
    fontSize: 11,
    marginTop: 24,
    letterSpacing: 1,
  },
});