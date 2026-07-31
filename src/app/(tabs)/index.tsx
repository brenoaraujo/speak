import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ResultView } from '@/components/result-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { analyzeText } from '@/lib/api';
import type { AnalyzeResponse } from '@/lib/types';

export default function CoachScreen() {
  const theme = useTheme();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  const submit = async () => {
    if (!text.trim()) return;
    setError(null);
    setBusy(true);
    try {
      const res = await analyzeText(text.trim());
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not analyze that. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setResult(null);
    setText('');
    setError(null);
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <SafeAreaView edges={['top']} style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled">
            <ThemedText type="title" style={styles.title}>
              Coach
            </ThemedText>
            <ThemedText style={{ color: theme.textSecondary }}>
              Type something you want to say. I will fix it and show a natural version.
            </ThemedText>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundElement,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="For example: Yesterday I go to the party and I very tired."
              placeholderTextColor={theme.textSecondary}
              multiline
              value={text}
              onChangeText={setText}
              editable={!busy}
            />

            {error && <ThemedText style={{ color: theme.major }}>{error}</ThemedText>}

            <View style={styles.actions}>
              <Pressable
                style={[styles.button, { backgroundColor: theme.tint }]}
                onPress={submit}
                disabled={busy || !text.trim()}>
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.buttonText}>Check it</ThemedText>
                )}
              </Pressable>
              {result && (
                <Pressable
                  style={[styles.secondaryButton, { borderColor: theme.border }]}
                  onPress={reset}>
                  <ThemedText style={{ color: theme.text, fontWeight: '600' }}>New</ThemedText>
                </Pressable>
              )}
            </View>

            {result && (
              <View style={styles.result}>
                <ResultView
                  correctedText={result.entry.corrected_text}
                  alternativeText={result.entry.alternative_text}
                  mistakes={result.mistakes}
                  score={result.entry.score}
                  assessment={result.entry.assessment}
                />
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    padding: Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  title: { fontSize: 40, lineHeight: 44 },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    fontSize: 18,
    lineHeight: 26,
    textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', gap: Spacing.two },
  button: {
    flex: 1,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  result: { marginTop: Spacing.two },
});
