import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PlayButton } from '@/components/play-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Phrase } from '@/lib/types';

type Props = {
  phrase: Phrase;
  showIntent?: boolean;
};

// Shared results panel for the "How can I say" feature. Used on the Coach
// screen right after a suggestion and on the phrase detail screen.
export function PhraseResultView({ phrase, showIntent }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {showIntent ? (
        <Section title="You wanted to say">
          <ThemedText style={{ color: theme.textSecondary }}>{phrase.intent}</ThemedText>
        </Section>
      ) : null}

      <Section title="Say this">
        <View style={[styles.bestCard, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText style={styles.best}>{phrase.best}</ThemedText>
          <View style={styles.actionRow}>
            <PlayButton text={phrase.best} />
            <CopyButton text={phrase.best} />
          </View>
        </View>
        {phrase.note ? (
          <ThemedText style={[styles.note, { color: theme.textSecondary }]}>
            {phrase.note}
          </ThemedText>
        ) : null}
      </Section>

      {phrase.alternatives.length > 0 ? (
        <Section title="Other ways">
          <View style={{ gap: Spacing.two }}>
            {phrase.alternatives.map((alt, i) => (
              <View key={i} style={[styles.altCard, { borderColor: theme.border }]}>
                <View style={styles.altHeader}>
                  <ThemedText type="small" style={{ color: theme.tint, fontWeight: '700' }}>
                    {alt.tone}
                  </ThemedText>
                  <View style={styles.actionRow}>
                    <PlayButton text={alt.text} />
                    <CopyButton text={alt.text} />
                  </View>
                </View>
                <ThemedText style={styles.altText}>{alt.text}</ThemedText>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      {phrase.tips.length > 0 ? (
        <Section title="Tips">
          <View style={{ gap: Spacing.two }}>
            {phrase.tips.map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <ThemedText style={{ color: theme.tint }}>•</ThemedText>
                <ThemedText style={styles.tipText}>{tip}</ThemedText>
              </View>
            ))}
          </View>
        </Section>
      ) : null}
    </View>
  );
}

// Copies text and briefly flips to a "Copied" checkmark for confirmation.
function CopyButton({ text }: { text: string }) {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = async () => {
    await Clipboard.setStringAsync(text);
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Pressable
      onPress={copy}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={copied ? 'Copied' : 'Copy'}
      style={styles.copyButton}>
      <Ionicons
        name={copied ? 'checkmark' : 'copy-outline'}
        size={16}
        color={copied ? theme.success : theme.textSecondary}
      />
      <ThemedText type="small" style={{ color: copied ? theme.success : theme.textSecondary }}>
        {copied ? 'Copied' : 'Copy'}
      </ThemedText>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: Spacing.two }}>
      <ThemedText type="small" style={{ color: theme.textSecondary, textTransform: 'uppercase' }}>
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.four },
  bestCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  best: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  note: { fontSize: 15, lineHeight: 21 },
  altCard: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  altHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  altText: { fontSize: 17, lineHeight: 24 },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    alignSelf: 'flex-start',
  },
  tipRow: { flexDirection: 'row', gap: Spacing.two },
  tipText: { flex: 1, fontSize: 15, lineHeight: 22 },
});
