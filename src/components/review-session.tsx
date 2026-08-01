import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ClearableInput } from '@/components/clearable-input';
import { CategoryChip } from '@/components/flashcard-view';
import { MicButton } from '@/components/mic-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { applyReviewResult, gradeReview } from '@/lib/api';
import type { GradeResult, ReviewCard, ReviewRating } from '@/lib/types';

type Phase = 'answering' | 'graded';

// Shows the original sentence with the mistake highlighted, then splits into the
// wrong part and the rest so the learner can see exactly what to fix.
function HighlightedSentence({ text, snippet }: { text: string; snippet: string }) {
  const theme = useTheme();
  const at = snippet ? text.toLowerCase().indexOf(snippet.toLowerCase()) : -1;
  if (at < 0) {
    return (
      <View style={{ gap: Spacing.two }}>
        <ThemedText style={styles.sentence}>{text}</ThemedText>
        {snippet ? (
          <ThemedText style={{ color: theme.textSecondary }}>
            Focus on: <ThemedText style={{ color: theme.major }}>{snippet}</ThemedText>
          </ThemedText>
        ) : null}
      </View>
    );
  }
  return (
    <ThemedText style={styles.sentence}>
      {text.slice(0, at)}
      <ThemedText style={{ color: theme.major, fontWeight: '800' }}>
        {text.slice(at, at + snippet.length)}
      </ThemedText>
      {text.slice(at + snippet.length)}
    </ThemedText>
  );
}

export function ReviewSession({
  cards,
  onExit,
}: {
  cards: ReviewCard[];
  onExit: () => void;
}) {
  const theme = useTheme();
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [phase, setPhase] = useState<Phase>('answering');
  const [grading, setGrading] = useState(false);
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const card = cards[index];

  const check = async () => {
    if (!answer.trim() || !card) return;
    setError(null);
    setGrading(true);
    try {
      const result = await gradeReview(card, answer.trim());
      setGrade(result);
      setPhase('graded');
      if (result.correct) setCorrectCount((c) => c + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not grade that. Try again.');
    } finally {
      setGrading(false);
    }
  };

  const rate = async (rating: ReviewRating) => {
    if (!card) return;
    applyReviewResult(card, rating).catch(() => {});
    setReviewed((n) => n + 1);
    // Move on.
    setAnswer('');
    setGrade(null);
    setPhase('answering');
    setIndex((i) => i + 1);
  };

  if (!card) {
    // Session complete (or nothing was due).
    return (
      <View style={styles.center}>
        <ThemedText type="title" style={{ textAlign: 'center' }}>
          {reviewed > 0 ? `${correctCount}/${reviewed}` : 'All caught up'}
        </ThemedText>
        <ThemedText style={{ color: theme.textSecondary, textAlign: 'center' }}>
          {reviewed > 0
            ? 'Nice work. These are rescheduled based on how you did.'
            : 'Nothing is due right now. Come back later.'}
        </ThemedText>
        <Pressable style={[styles.primary, { backgroundColor: theme.tint }]} onPress={onExit}>
          <ThemedText style={styles.primaryText}>Done</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Pressable onPress={onExit}>
          <ThemedText style={{ color: theme.textSecondary }}>Quit</ThemedText>
        </Pressable>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {index + 1} of {cards.length}
        </ThemedText>
      </View>

      <CategoryChip category={card.category} />
      <ThemedText type="small" style={{ color: theme.textSecondary, textTransform: 'uppercase' }}>
        Fix the highlighted part
      </ThemedText>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        <HighlightedSentence text={card.original_text} snippet={card.original_snippet} />
      </View>

      {phase === 'answering' ? (
        <>
          <MicButton
            onTranscribed={(t) => setAnswer((prev) => (prev.trim() ? `${prev.trim()} ${t}` : t))}
            onError={setError}
            disabled={grading}
          />
          <ClearableInput
            style={[
              styles.input,
              { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border },
            ]}
            placeholder="Say or type the corrected version"
            placeholderTextColor={theme.textSecondary}
            multiline
            value={answer}
            onChangeText={setAnswer}
            editable={!grading}
            onClear={() => setAnswer('')}
          />
          {error && <ThemedText style={{ color: theme.major }}>{error}</ThemedText>}
          <Pressable
            style={[styles.primary, { backgroundColor: theme.tint }]}
            onPress={check}
            disabled={grading || !answer.trim()}>
            {grading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.primaryText}>Check</ThemedText>
            )}
          </Pressable>
        </>
      ) : (
        <View style={{ gap: Spacing.three }}>
          <View
            style={[
              styles.resultCard,
              { backgroundColor: theme.backgroundElement, borderColor: grade?.correct ? theme.success : theme.major },
            ]}>
            <ThemedText style={{ color: grade?.correct ? theme.success : theme.major, fontWeight: '700' }}>
              {grade?.correct ? 'Correct' : 'Not quite'}
            </ThemedText>
            <ThemedText style={{ color: theme.textSecondary }}>{grade?.feedback}</ThemedText>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              A correct version
            </ThemedText>
            <ThemedText style={[styles.answer, { color: theme.success }]}>{card.correction}</ThemedText>
          </View>

          {grade?.correct ? (
            <View style={styles.rateRow}>
              <Pressable
                style={[styles.rateBtn, { borderColor: theme.moderate }]}
                onPress={() => rate('hard')}>
                <ThemedText style={{ color: theme.moderate, fontWeight: '700' }}>Hard</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  I hesitated
                </ThemedText>
              </Pressable>
              <Pressable
                style={[styles.rateBtn, { backgroundColor: theme.success, borderColor: theme.success }]}
                onPress={() => rate('easy')}>
                <ThemedText style={{ color: '#fff', fontWeight: '700' }}>Easy</ThemedText>
                <ThemedText type="small" style={{ color: '#fff' }}>
                  Confident
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[styles.primary, { backgroundColor: theme.tint }]}
              onPress={() => rate('failed')}>
              <ThemedText style={styles.primaryText}>Review this again soon</ThemedText>
            </Pressable>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.four, gap: Spacing.three },
  center: { flex: 1, justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  card: { borderRadius: Spacing.four, padding: Spacing.four, minHeight: 120, justifyContent: 'center' },
  sentence: { fontSize: 22, lineHeight: 32, fontWeight: '600' },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    fontSize: 18,
    lineHeight: 26,
    textAlignVertical: 'top',
  },
  resultCard: { borderRadius: Spacing.three, borderWidth: 1, padding: Spacing.three, gap: Spacing.two },
  divider: { height: 1, width: '100%', marginVertical: Spacing.one },
  answer: { fontSize: 18, lineHeight: 26, fontWeight: '700' },
  primary: { borderRadius: Spacing.three, paddingVertical: Spacing.three, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  rateRow: { flexDirection: 'row', gap: Spacing.two },
  rateBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    gap: Spacing.half,
  },
});
