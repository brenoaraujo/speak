import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ChipRow, ReinforcesLine } from '@/components/flashcard-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PracticeItem } from '@/lib/types';

// A multiple-choice exercise: pick an option, get immediate feedback, then next.
export function McqView({
  item,
  onGrade,
}: {
  item: PracticeItem;
  onGrade: (correct: boolean) => void;
}) {
  const theme = useTheme();
  const [selected, setSelected] = useState<string | null>(null);
  const answered = selected != null;
  const wasCorrect = selected === item.back;

  const optionStyle = (opt: string) => {
    if (!answered) return { borderColor: theme.border, backgroundColor: theme.backgroundElement };
    if (opt === item.back) return { borderColor: theme.success, backgroundColor: theme.backgroundElement };
    if (opt === selected) return { borderColor: theme.major, backgroundColor: theme.backgroundElement };
    return { borderColor: theme.border, backgroundColor: theme.backgroundElement };
  };

  return (
    <View style={styles.container}>
      <ChipRow item={item} />
      <ThemedText style={styles.question}>{item.front}</ThemedText>

      <View style={{ gap: Spacing.two }}>
        {item.options.map((opt) => {
          const s = optionStyle(opt);
          const isCorrect = answered && opt === item.back;
          const isWrongPick = answered && opt === selected && !wasCorrect;
          return (
            <Pressable
              key={opt}
              disabled={answered}
              onPress={() => setSelected(opt)}
              style={[styles.option, s]}>
              <ThemedText style={styles.optionText}>{opt}</ThemedText>
              {isCorrect && (
                <ThemedText style={{ color: theme.success, fontWeight: '700' }}>✓</ThemedText>
              )}
              {isWrongPick && (
                <ThemedText style={{ color: theme.major, fontWeight: '700' }}>✗</ThemedText>
              )}
            </Pressable>
          );
        })}
      </View>

      {answered && (
        <View style={[styles.feedback, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText style={{ color: wasCorrect ? theme.success : theme.major, fontWeight: '700' }}>
            {wasCorrect ? 'Correct' : 'Not quite'}
          </ThemedText>
          <ThemedText style={{ color: theme.textSecondary }}>{item.explanation}</ThemedText>
          <ReinforcesLine item={item} />
        </View>
      )}

      {answered && (
        <Pressable
          style={[styles.next, { backgroundColor: theme.tint }]}
          onPress={() => onGrade(wasCorrect)}>
          <ThemedText style={styles.nextText}>Next</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  question: { fontSize: 22, lineHeight: 30, fontWeight: '600' },
  option: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  optionText: { fontSize: 16, lineHeight: 22, flex: 1 },
  feedback: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.one },
  next: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  nextText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
