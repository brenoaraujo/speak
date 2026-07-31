import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CATEGORY_LABELS, type PracticeItem } from '@/lib/types';

// A flashcard: show the prompt, reveal the answer, then self-grade.
export function FlashcardView({
  item,
  onGrade,
}: {
  item: PracticeItem;
  onGrade: (correct: boolean) => void;
}) {
  const theme = useTheme();
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={styles.container}>
      <ChipRow item={item} />

      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText style={styles.front}>{item.front}</ThemedText>

        {revealed && (
          <View style={styles.answerBlock}>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <ThemedText style={[styles.answer, { color: theme.success }]}>{item.back}</ThemedText>
            <ThemedText style={{ color: theme.textSecondary }}>{item.explanation}</ThemedText>
            <ReinforcesLine item={item} />
          </View>
        )}
      </View>

      {!revealed ? (
        <Pressable
          style={[styles.primary, { backgroundColor: theme.tint }]}
          onPress={() => setRevealed(true)}>
          <ThemedText style={styles.primaryText}>Show answer</ThemedText>
        </Pressable>
      ) : (
        <View style={styles.gradeRow}>
          <Pressable
            style={[styles.gradeBtn, { borderColor: theme.major }]}
            onPress={() => onGrade(false)}>
            <ThemedText style={{ color: theme.major, fontWeight: '700' }}>Review again</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.gradeBtn, { backgroundColor: theme.success, borderColor: theme.success }]}
            onPress={() => onGrade(true)}>
            <ThemedText style={{ color: '#fff', fontWeight: '700' }}>Got it</ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export function CategoryChip({ category }: { category: PracticeItem['category'] }) {
  const theme = useTheme();
  return (
    <View style={[chip.chip, { backgroundColor: theme.backgroundSelected }]}>
      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        {CATEGORY_LABELS[category]}
      </ThemedText>
    </View>
  );
}

// The category, plus the everyday situation this item is set in. Together they
// make the "same lesson, new context" idea visible at a glance.
export function ChipRow({ item }: { item: PracticeItem }) {
  const theme = useTheme();
  return (
    <View style={chip.row}>
      <CategoryChip category={item.category} />
      {item.context ? (
        <View style={[chip.chip, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="small" style={{ color: theme.tint }}>
            {item.context}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

// Names the underlying mistake this item reinforces, so repeated patterns click.
export function ReinforcesLine({ item }: { item: PracticeItem }) {
  const theme = useTheme();
  if (!item.based_on) return null;
  return (
    <ThemedText type="small" style={{ color: theme.textSecondary }}>
      Reinforces: {item.based_on}
    </ThemedText>
  );
}

const chip = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 999,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});

const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.three,
    minHeight: 180,
    justifyContent: 'center',
  },
  front: { fontSize: 22, lineHeight: 30, fontWeight: '600' },
  answerBlock: { gap: Spacing.two },
  divider: { height: 1, width: '100%' },
  answer: { fontSize: 20, lineHeight: 28, fontWeight: '700' },
  primary: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  gradeRow: { flexDirection: 'row', gap: Spacing.two },
  gradeBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
});
