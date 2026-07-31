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

import { MicButton } from '@/components/mic-button';
import { PhraseResultView } from '@/components/phrase-result-view';
import { ResultView } from '@/components/result-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { analyzeText, sayPhrase } from '@/lib/api';
import type { AnalyzeResponse, Phrase } from '@/lib/types';

type Mode = 'fix' | 'say';

const COPY: Record<Mode, { intro: string; placeholder: string; action: string }> = {
  fix: {
    intro: 'Speak or type something you want to say. I will fix it and show a natural version.',
    placeholder: 'For example: Yesterday I go to the party and I very tired.',
    action: 'Check it',
  },
  say: {
    intro: 'Speak or type what you want to say. I will give you the best way to say it, plus tips.',
    placeholder:
      "For example: how can I ask my son's friend's mother if they can have a playdate tomorrow?",
    action: 'Say it',
  },
};

export default function CoachScreen() {
  const theme = useTheme();
  const [mode, setMode] = useState<Mode>('fix');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [phrase, setPhrase] = useState<Phrase | null>(null);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setResult(null);
    setPhrase(null);
    setError(null);
  };

  const submit = async () => {
    if (!text.trim()) return;
    setError(null);
    setBusy(true);
    try {
      if (mode === 'fix') {
        setResult(await analyzeText(text.trim()));
      } else {
        setPhrase(await sayPhrase(text.trim()));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setResult(null);
    setPhrase(null);
    setText('');
    setError(null);
  };

  const copy = COPY[mode];
  const hasResult = mode === 'fix' ? result != null : phrase != null;

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

            <View style={[styles.toggle, { backgroundColor: theme.backgroundElement }]}>
              <SegItem label="Fix it" active={mode === 'fix'} onPress={() => switchMode('fix')} />
              <SegItem label="Say it" active={mode === 'say'} onPress={() => switchMode('say')} />
            </View>

            <ThemedText style={{ color: theme.textSecondary }}>{copy.intro}</ThemedText>

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
                {
                  backgroundColor: theme.backgroundElement,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder={copy.placeholder}
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
                  <ThemedText style={styles.buttonText}>{copy.action}</ThemedText>
                )}
              </Pressable>
              {hasResult && (
                <Pressable
                  style={[styles.secondaryButton, { borderColor: theme.border }]}
                  onPress={reset}>
                  <ThemedText style={{ color: theme.text, fontWeight: '600' }}>New</ThemedText>
                </Pressable>
              )}
            </View>

            {mode === 'fix' && result && (
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

            {mode === 'say' && phrase && (
              <View style={styles.result}>
                <PhraseResultView phrase={phrase} />
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

function SegItem({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.segItem, active && { backgroundColor: theme.background }]}>
      <ThemedText
        style={{
          fontWeight: '600',
          color: active ? theme.text : theme.textSecondary,
        }}>
        {label}
      </ThemedText>
    </Pressable>
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
  toggle: {
    flexDirection: 'row',
    borderRadius: Spacing.three,
    padding: Spacing.half,
  },
  segItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three - Spacing.half,
  },
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
