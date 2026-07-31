import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FlashcardView } from '@/components/flashcard-view';
import { McqView } from '@/components/mcq-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchPracticeItems, generatePractice, recordPracticeResult } from '@/lib/api';
import type { PracticeItem } from '@/lib/types';

type Mode = 'overview' | 'session' | 'summary';

const SESSION_SIZE = 10;

export default function LearnScreen() {
  const theme = useTheme();
  const [items, setItems] = useState<PracticeItem[]>([]);
  const [mode, setMode] = useState<Mode>('overview');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Session state
  const [queue, setQueue] = useState<PracticeItem[]>([]);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);

  const load = useCallback(async () => {
    try {
      setItems(await fetchPracticeItems());
    } catch {
      // ignore; retry on next focus
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (mode === 'overview') load();
    }, [load, mode]),
  );

  const counts = {
    total: items.length,
    mastered: items.filter((i) => i.status === 'mastered').length,
    toReview: items.filter((i) => i.status !== 'mastered').length,
  };

  const generate = async () => {
    setError(null);
    setGenerating(true);
    try {
      await generatePractice(8);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate practice. Try again.');
    } finally {
      setGenerating(false);
    }
  };

  const startSession = () => {
    const pool = items.filter((i) => i.status !== 'mastered');
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, SESSION_SIZE);
    if (shuffled.length === 0) return;
    setQueue(shuffled);
    setIndex(0);
    setCorrect(0);
    setMode('session');
  };

  const onGrade = (wasCorrect: boolean) => {
    const current = queue[index];
    // Persist progress; local state is enough to drive the UI immediately.
    recordPracticeResult(current, wasCorrect).catch(() => {});
    if (wasCorrect) setCorrect((c) => c + 1);
    if (index + 1 >= queue.length) {
      setMode('summary');
    } else {
      setIndex((i) => i + 1);
    }
  };

  // ---------- SESSION ----------
  if (mode === 'session') {
    const current = queue[index];
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.sessionHeader}>
              <Pressable onPress={() => setMode('overview')}>
                <ThemedText style={{ color: theme.textSecondary }}>Quit</ThemedText>
              </Pressable>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {index + 1} of {queue.length}
              </ThemedText>
            </View>

            {current.kind === 'flashcard' ? (
              <FlashcardView key={current.id} item={current} onGrade={onGrade} />
            ) : (
              <McqView key={current.id} item={current} onGrade={onGrade} />
            )}
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // ---------- SUMMARY ----------
  if (mode === 'summary') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.flex}>
          <View style={styles.summary}>
            <ThemedText type="title" style={{ textAlign: 'center' }}>
              {correct}/{queue.length}
            </ThemedText>
            <ThemedText style={{ color: theme.textSecondary, textAlign: 'center' }}>
              {correct === queue.length
                ? 'Perfect round. Nicely done.'
                : 'Good work. Keep practicing the ones you missed.'}
            </ThemedText>
            <Pressable
              style={[styles.primary, { backgroundColor: theme.tint }]}
              onPress={() => setMode('overview')}>
              <ThemedText style={styles.primaryText}>Back to Learn</ThemedText>
            </Pressable>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // ---------- OVERVIEW ----------
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <ThemedText type="title" style={styles.title}>
            Learn
          </ThemedText>
          <ThemedText style={{ color: theme.textSecondary }}>
            Practice built from the mistakes you actually make.
          </ThemedText>

          {/* Deck status */}
          <View style={styles.statsRow}>
            <Stat label="Cards" value={counts.total} />
            <Stat label="To review" value={counts.toReview} />
            <Stat label="Mastered" value={counts.mastered} />
          </View>

          {error && <ThemedText style={{ color: theme.major }}>{error}</ThemedText>}

          {counts.total === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText style={{ fontSize: 16 }}>
                No cards yet. Generate a practice set based on your recent mistakes to get started.
              </ThemedText>
            </View>
          ) : (
            <Pressable
              style={[
                styles.primary,
                { backgroundColor: counts.toReview ? theme.tint : theme.backgroundSelected },
              ]}
              disabled={counts.toReview === 0}
              onPress={startSession}>
              <ThemedText style={styles.primaryText}>
                {counts.toReview ? `Start practice (${Math.min(counts.toReview, SESSION_SIZE)})` : 'All caught up'}
              </ThemedText>
            </Pressable>
          )}

          <Pressable
            style={[styles.secondary, { borderColor: theme.border }]}
            onPress={generate}
            disabled={generating}>
            {generating ? (
              <ActivityIndicator />
            ) : (
              <ThemedText style={{ color: theme.text, fontWeight: '600' }}>
                {counts.total === 0 ? 'Generate practice' : 'Generate more'}
              </ThemedText>
            )}
          </Pressable>

          {generating && (
            <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: 'center' }}>
              Building cards from your weak spots. This takes a few seconds.
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  const theme = useTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        {label}
      </ThemedText>
    </View>
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
  statsRow: { flexDirection: 'row', gap: Spacing.two },
  statCard: { flex: 1, borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.one },
  statValue: { fontSize: 28, fontWeight: '700' },
  emptyCard: { borderRadius: Spacing.three, padding: Spacing.four },
  primary: { borderRadius: Spacing.three, paddingVertical: Spacing.three, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondary: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  summary: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
});
