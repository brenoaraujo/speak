import { StyleSheet, View } from 'react-native';

import { MistakeCard } from '@/components/mistake-card';
import { ScoreRing } from '@/components/score-ring';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Mistake } from '@/lib/types';

type Props = {
  originalText?: string;
  correctedText: string | null;
  alternativeText: string | null;
  mistakes: Mistake[];
  score?: number | null;
  assessment?: string | null;
};

// Shared results panel, used on the Coach screen right after analysis and on
// the History detail screen.
export function ResultView({
  originalText,
  correctedText,
  alternativeText,
  mistakes,
  score,
  assessment,
}: Props) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {score != null && (
        <View style={[styles.scoreCard, { backgroundColor: theme.backgroundElement }]}>
          <ScoreRing score={score} size={72} showLabel />
          {assessment ? (
            <ThemedText style={styles.assessment}>{assessment}</ThemedText>
          ) : null}
        </View>
      )}

      {originalText ? (
        <Section title="You said">
          <ThemedText style={{ color: theme.textSecondary }}>{originalText}</ThemedText>
        </Section>
      ) : null}

      <Section title="Natural version">
        <ThemedText style={styles.body}>{correctedText}</ThemedText>
      </Section>

      <Section title="Another way to say it">
        <ThemedText style={styles.body}>{alternativeText}</ThemedText>
      </Section>

      <Section title={mistakes.length ? `Mistakes (${mistakes.length})` : 'Mistakes'}>
        {mistakes.length === 0 ? (
          <ThemedText style={{ color: theme.success }}>
            Nothing to fix here. This already sounds natural.
          </ThemedText>
        ) : (
          <View style={{ gap: Spacing.two }}>
            {mistakes.map((m, i) => (
              <MistakeCard key={m.id ?? i} mistake={m} />
            ))}
          </View>
        )}
      </Section>
    </View>
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
  body: { fontSize: 18, lineHeight: 26 },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  assessment: { flex: 1, fontSize: 15, lineHeight: 21 },
});
