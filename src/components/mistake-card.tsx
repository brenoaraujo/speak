import { StyleSheet, View } from 'react-native';

import { SeverityBadge } from '@/components/severity-badge';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CATEGORY_LABELS, type Mistake } from '@/lib/types';

export function MistakeCard({ mistake }: { mistake: Mistake }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.header}>
        <ThemedText type="smallBold">{CATEGORY_LABELS[mistake.category]}</ThemedText>
        <SeverityBadge severity={mistake.severity} />
      </View>

      <View style={styles.correctionRow}>
        <ThemedText style={[styles.strike, { color: theme.major }]}>
          {mistake.original_snippet}
        </ThemedText>
        <ThemedText style={{ color: theme.textSecondary }}>{'  →  '}</ThemedText>
        <ThemedText style={{ color: theme.success, fontWeight: '600' }}>
          {mistake.correction}
        </ThemedText>
      </View>

      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        {mistake.explanation}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  correctionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  strike: {
    textDecorationLine: 'line-through',
  },
});
