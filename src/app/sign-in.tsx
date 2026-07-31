import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';

export default function SignInScreen() {
  const theme = useTheme();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password, displayName.trim());
        setNotice('Account created. If email confirmation is on, check your inbox, then sign in.');
        setMode('signin');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = [
    styles.input,
    { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border },
  ];

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.hero}>
            <ThemedText type="title">Speak</ThemedText>
            <ThemedText style={{ color: theme.textSecondary }}>
              Sound natural in everyday English.
            </ThemedText>
          </View>

          <View style={styles.form}>
            {mode === 'signup' && (
              <TextInput
                style={inputStyle}
                placeholder="Name"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="words"
                value={displayName}
                onChangeText={setDisplayName}
              />
            )}
            <TextInput
              style={inputStyle}
              placeholder="Email"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={inputStyle}
              placeholder="Password"
              placeholderTextColor={theme.textSecondary}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {error && <ThemedText style={{ color: theme.major }}>{error}</ThemedText>}
            {notice && <ThemedText style={{ color: theme.success }}>{notice}</ThemedText>}

            <Pressable
              style={[styles.button, { backgroundColor: theme.tint }]}
              onPress={submit}
              disabled={busy}>
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.buttonText}>
                  {mode === 'signin' ? 'Sign in' : 'Create account'}
                </ThemedText>
              )}
            </Pressable>

            <Pressable onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
              <ThemedText style={{ color: theme.tint, textAlign: 'center' }}>
                {mode === 'signin'
                  ? "New here? Create an account"
                  : 'Already have an account? Sign in'}
              </ThemedText>
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  safe: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.six,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  hero: { gap: Spacing.two },
  form: { gap: Spacing.three },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  button: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
