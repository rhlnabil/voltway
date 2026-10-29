import { useEffect, useMemo } from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const SMOKE_WISPS = 7; // nombre de volutes

type Props = {
  onFinish: () => void;
};

export default function SplashAnimation({ onFinish }: Props) {
  // Overlay fade final
  const overlayOpacity = useSharedValue(1);

  // Halo derrière le logo (respiration)
  const glowScale = useSharedValue(0.5);
  const glowOpacity = useSharedValue(0);

  // Logo
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.7);

  // Barre de progression
  const progressWidth = useSharedValue(0);
  const progressGlow = useSharedValue(0.3);

  useEffect(() => {
    // === 0.2s : halo derrière le logo, respiration infinie ===
    glowOpacity.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(0.7, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.3, { duration: 1400, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
    glowScale.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(1.2, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );

    // === 0.5s → 1.3s : logo apparaît avec rebond ===
    logoOpacity.value = withDelay(500, withTiming(1, { duration: 800 }));
    logoScale.value = withDelay(
      500,
      withSequence(
        withTiming(1.08, { duration: 800, easing: Easing.out(Easing.back(2)) }),
        withSpring(1, { damping: 7, stiffness: 120 })
      )
    );

    // === 2.0s → 4.5s : barre de progression ===
    progressWidth.value = withDelay(
      2000,
      withTiming(100, { duration: 2500, easing: Easing.inOut(Easing.quad) })
    );
    progressGlow.value = withDelay(
      2000,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.4, { duration: 400 })
        ),
        -1,
        true
      )
    );

    // === 4.7s → 5.2s : fondu sortie ===
    overlayOpacity.value = withDelay(
      4700,
      withTiming(0, { duration: 500 }, (finished) => {
        if (finished) runOnJS(onFinish)();
      })
    );
  }, []);

  // === Styles animés ===
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
    shadowOpacity: progressGlow.value,
  }));

  // === Volutes de fumée ===
  const wisps = useMemo(
    () =>
      Array.from({ length: SMOKE_WISPS }, (_, i) => ({
        id: i,
        startX: (width / SMOKE_WISPS) * i + Math.random() * 60 - 30,
        startY: height * 0.4 + Math.random() * height * 0.5,
        size: 160 + Math.random() * 180,
        driftX: (Math.random() - 0.5) * 200,
        driftY: -height * (0.6 + Math.random() * 0.6),
        rotate: (Math.random() - 0.5) * 180,
        delay: i * 180 + Math.random() * 400,
        duration: 4000 + Math.random() * 2500,
        isBright: i % 2 === 0,
      })),
    []
  );

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      {/* 🌫️ Volutes de fumée verte */}
      {wisps.map((w) => (
        <SmokeWisp key={w.id} {...w} />
      ))}

      {/* Contenu central */}
      <View style={styles.content}>
        {/* Halo respirant */}
        <Animated.View style={[styles.glow, glowStyle]} />

        {/* Logo */}
        <Animated.View style={[styles.logoWrap, logoStyle]}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Barre de progression */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressBar, progressStyle]} />
        </View>
      </View>
    </Animated.View>
  );
}

// ============================================
// SmokeWisp — volute de fumée individuelle
// ============================================
function SmokeWisp({
  startX,
  startY,
  size,
  driftX,
  driftY,
  rotate,
  delay,
  duration,
  isBright,
}: {
  startX: number;
  startY: number;
  size: number;
  driftX: number;
  driftY: number;
  rotate: number;
  delay: number;
  duration: number;
  isBright: boolean;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Fade in → maintien → fade out
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(isBright ? 0.4 : 0.25, {
          duration: duration * 0.35,
          easing: Easing.out(Easing.quad),
        }),
        withTiming(isBright ? 0.25 : 0.15, { duration: duration * 0.4 }),
        withTiming(0, { duration: duration * 0.25 })
      )
    );

    // Dérive diagonale
    translateX.value = withDelay(
      delay,
      withTiming(driftX, { duration, easing: Easing.inOut(Easing.sin) })
    );
    translateY.value = withDelay(
      delay,
      withTiming(driftY, { duration, easing: Easing.out(Easing.quad) })
    );

    // Rotation lente (effet organique)
    rotation.value = withDelay(
      delay,
      withTiming(rotate, { duration, easing: Easing.inOut(Easing.sin) })
    );

    // Grossit en montant (diffusion)
    scale.value = withDelay(
      delay,
      withTiming(2, { duration, easing: Easing.out(Easing.quad) })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));

  // Forme ovale allongée (plus organique qu'un cercle)
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: startX,
          top: startY,
          width: size,
          height: size * 1.4, // ovale vertical
          borderRadius: size,
          backgroundColor: isBright
            ? 'rgba(74, 222, 128, 0.35)'
            : 'rgba(34, 197, 94, 0.28)',
          shadowColor: '#22c55e',
          shadowOpacity: 0.9,
          shadowRadius: size * 0.45,
          shadowOffset: { width: 0, height: 0 },
        },
        style,
      ]}
    />
  );
}

// ============================================
// Styles
// ============================================
const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width,
    height,
    zIndex: 9999,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowOpacity: 1,
    shadowRadius: 110,
    shadowOffset: { width: 0, height: 0 },
    opacity: 0.5,
    elevation: 20,
  },
  logoWrap: {
    marginBottom: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 160,
    height: 160,
  },
  progressTrack: {
    position: 'absolute',
    bottom: 80,
    width: 180,
    height: 3,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 2,
    shadowColor: '#22c55e',
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
});