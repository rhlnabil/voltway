import { useState } from 'react';
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
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { BorderBeam } from 'react-native-beam-border'; // ✅ Le bon package
import { authApi } from '../../services/authApi';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Erreur', 'Remplis tous les champs');
      return;
    }
    setLoading(true);
    try {
      const result = await authApi.login(email.trim(), password);
      console.log('[Login] ✓ userId:', result.userId);
      router.replace('/(tabs)');
    } catch (e: any) {
      console.error('[Login] ✗', e.message);
      Alert.alert('Connexion échouée', e.message ?? 'Vérifie tes identifiants');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 🎯 La carte avec l'effet BorderBeam exact de Magic UI */}
          <BorderBeam
            size="md"
            colorVariant="green" // Le package a des variantes de couleur prédéfinies
            duration={8}
            borderRadius={24}
            style={{ width: 350, alignSelf: 'center' }}
          >
            <View style={styles.card}>
              <Image
                source={require('../../../assets/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.title}>VoltWay</Text>
              <Text style={styles.subtitle}>Connexion</Text>

              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor="#475569"
                editable={!loading}
              />
              <TextInput
                style={styles.input}
                placeholder="Mot de passe"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor="#475569"
                editable={!loading}
                onSubmitEditing={handleLogin}
                returnKeyType="go"
              />

              <Pressable
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Se connecter</Text>
                )}
              </Pressable>

              <Pressable
                onPress={() => router.push('/auth/register')}
                disabled={loading}
                style={styles.linkWrap}
              >
                <Text style={styles.link}>
                  Pas de compte ? <Text style={styles.linkBold}>S'inscrire</Text>
                </Text>
              </Pressable>
            </View>
          </BorderBeam>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 28,
  },
  logoImage: { width: 100, height: 100, alignSelf: 'center', marginBottom: 12 },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#22c55e',
    textAlign: 'center',
    textShadowColor: '#22c55e',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  subtitle: {
    fontSize: 15,
    color: '#4ade80',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#ffffff',
  },
  btn: {
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 8,
  },
  btnDisabled: { backgroundColor: '#166534' },
  btnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  linkWrap: { paddingVertical: 8 },
  link: { textAlign: 'center', color: '#64748b', fontSize: 13 },
  linkBold: { color: '#22c55e', fontWeight: '700' },
});