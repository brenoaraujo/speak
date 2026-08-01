import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { MicButton } from '@/components/mic-button';
import { ResultView } from '@/components/result-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { pickScenario, produceResponse } from '@/lib/api';
import type { ProduceResponse, Scenario } from '@/lib/types';

const DIFFICULTY_LABEL: Record<Scenario['difficulty'], string> = {
  basic: 'Basic',
  everyday: 'Everyday',
  professional: 'Professional',
};

export function ProductionPractice({ onExit }: { onExit: () => void }) {
  const theme = useTheme();
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [loadingScenario, setLoadingScenario] = useState(true);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProduceResponse | null>(null);

  const loadScenario = useCallback(async () => {
    setLoadingScenario(true);
    setResult(null);
    setText('');
    setError(null);
    try {
      setScenario(await pickScenario());
    } catch {
      setError('Could not load a scenario. Try again.');
    } finally {
      setLoadingScenario(false);
    }
  }, []);

  useEffect(() => {
    loadScenario();
  }, [loadScenario]);

  const submit = async () => {
    if (!text.trim() || !scenario) return;
    setError(null);
    setBusy(true);
    try {
      setResult(await produceResponse(scenario.id, text.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not grade that. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Pressable onPress={onExit}>
          <ThemedText style={{ color: theme.textSecondary }}>Quit</ThemedText>
        </Pressable>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          Production practice
        </ThemedText>
      </View>

      {loadingScenario || !scenario ? (
        <View style={styles.loading}>
          <ActivityIndicator />
        </View>
      ) : (
        <>
          <View style={[styles.scenarioCard, { backgroundColor: theme.tint }]}>
            <ThemedText type="small" style={{ color: '#fff', opacity: 0.9 }}>
              {DIFFICULTY_LABEL[scenario.difficulty]} · respond without looking anything up
            </ThemedText>
            <ThemedText style={styles.scenarioText}>{scenario.prompt_text}</ThemedText>
          </View>

          {!result ? (
            <>
              <MicButton
                onTranscribed={(t) =>
                  setText((prev) => (prev.trim() ? `${prev.trim()} ${t}` : t))
                }
                onError={setError}
                disabled={busy}
              />
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border },
                ]}
                placeholder="Say or type your response"
                placeholderTextColor={theme.textSecondary}
                multiline
                value={text}
                onChangeText={setText}
                editable={!busy}
              />
              {error && <ThemedText style={{ color: theme.major }}>{error}</ThemedText>}
              <View style={styles.actions}>
                <Pressable
                  style={[styles.primary, { backgroundColor: theme.tint }]}
                  onPress={submit}
                  disabled={busy || !text.trim()}>
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.primaryText}>Check my response</ThemedText>
                  )}
                </Pressable>
                <Pressable
                  style={[styles.secondary, { borderColor: theme.border }]}
                  onPress={loadScenario}
                  disabled={busy}>
                  <ThemedText style={{ color: theme.text, fontWeight: '600' }}>New</ThemedText>
                </Pressable>
              </View>
            </>
          ) : (
            <View style={{ gap: Spacing.four }}>
              {result.coverage ? (
                <View style={[styles.coverageCard, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText
                    type="small"
                    style={{ color: theme.textSecondary, textTransform: 'uppercase' }}>
                    Did you cover it?
                  </ThemedText>
                  <ThemedText style={{ fontSize: 15, lineHeight: 22 }}>{result.coverage}</ThemedText>
                </View>
              ) : null}

              <ResultView
                originalText={result.entry.original_text}
                correctedText={result.entry.corrected_text}
                alternativeText={result.entry.alternative_text}
                mistakes={result.mistakes}
                score={result.entry.score}
                assessment={result.entry.assessment}
              />

              <View style={styles.actions}>
                <Pressable
                  style={[styles.primary, { backgroundColor: theme.tint }]}
                  onPress={loadScenario}>
                  <ThemedText style={styles.primaryText}>Another scenario</ThemedText>
                </Pressable>
                <Pressable style={[styles.secondary, { borderColor: theme.border }]} onPress={onExit}>
                  <ThemedText style={{ color: theme.text, fontWeight: '600' }}>Done</ThemedText>
                </Pressable>
              </View>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.four, gap: Spacing.three },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  loading: { paddingVertical: Spacing.six, alignItems: 'center' },
  scenarioCard: { borderRadius: Spacing.four, padding: Spacing.four, gap: Spacing.two },
  scenarioText: { fontSize: 22, lineHeight: 30, fontWeight: '700', color: '#fff' },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    fontSize: 18,
    lineHeight: 26,
    textAlignVertical: 'top',
  },
  coverageCard: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  actions: { flexDirection: 'row', gap: Spacing.two },
  primary: { flex: 1, borderRadius: Spacing.three, paddingVertical: Spacing.three, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondary: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
