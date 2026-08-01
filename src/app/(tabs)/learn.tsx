import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FlashcardView } from '@/components/flashcard-view';
import { McqView } from '@/components/mcq-view';
import { ProductionPractice } from '@/components/production-practice';
import { ReviewSession } from '@/components/review-session';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  countDueReviewCards,
  fetchDueReviewCards,
  fetchPracticeItems,
  generatePractice,
  recordPracticeResult,
} from '@/lib/api';
import type { PracticeItem, ReviewCard } from '@/lib/types';

type Mode = 'overview' | 'review' | 'produce' | 'session' | 'summary';

const SESSION_SIZE = 10;

export default function LearnScreen() {
  const theme = useTheme();
  const [items, setItems] = useState<PracticeItem[]>([]);
  const [dueCount, setDueCount] = useState(0);
  const [mode, setMode] = useState<Mode>('overview');
  const [generating, setGenerating] = useState(false);
  const [loadingReview, setLoadingReview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Review session state
  const [reviewCards, setReviewCards] = useState<ReviewCard[]>([]);

  // Practice-set session state
  const [queue, setQueue] = useState<PracticeItem[]>([]);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);

  const load = useCallback(async () => {
    try {
      const [practice, due] = await Promise.all([
        fetchPracticeItems(),
        countDueReviewCards().catch(() => 0),
      ]);
      setItems(practice);
      setDueCount(due);
    } catch {
      // ignore; retry on next focus
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (mode === 'overview') load();
    }, [load, mode]),
  );

  const backToOverview = () => {
    setMode('overview');
    load();
  };

  // ---------- REVIEW (spaced repetition) ----------
  const startReview = async () => {
    setError(null);
    setLoadingReview(true);
    try {
      const cards = await fetchDueReviewCards(SESSION_SIZE + 5);
      if (cards.length === 0) {
        setDueCount(0);
        return;
      }
      setReviewCards(cards);
      setMode('review');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your review. Try again.');
    } finally {
      setLoadingReview(false);
    }
  };

  if (mode === 'review') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.flex}>
          <ReviewSession cards={reviewCards} onExit={backToOverview} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (mode === 'produce') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.flex}>
          <ProductionPractice onExit={backToOverview} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  // ---------- PRACTICE SETS ----------
  const counts = {
    total: items.length,
    mastered: items.filter((i) => i.status === 'mastered').length,
    toReview: items.filter((i) => i.status !== 'mastered').length,
  };

  const generate = async () => {
    setError(null);
    setGenerating(true);
    try {
      await generatePractice(12);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate practice. Try again.');
    } finally {
      setGenerating(false);
    }
  };

  const startSession = () => {
    const pool = items.filter((i) => i.status !== 'mastered');
    const clusters = new Map<string, PracticeItem[]>();
    for (const item of pool) {
      const key = item.based_on ?? item.id;
      const bucket = clusters.get(key);
      if (bucket) bucket.push(item);
      else clusters.set(key, [item]);
    }
    const ordered = [...clusters.values()]
      .sort(() => Math.random() - 0.5)
      .flat()
      .slice(0, SESSION_SIZE);
    if (ordered.length === 0) return;
    setQueue(ordered);
    setIndex(0);
    setCorrect(0);
    setMode('session');
  };

  const onGrade = (wasCorrect: boolean) => {
    const current = queue[index];
    recordPracticeResult(current, wasCorrect).catch(() => {});
    if (wasCorrect) setCorrect((c) => c + 1);
    if (index + 1 >= queue.length) setMode('summary');
    else setIndex((i) => i + 1);
  };

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

  // ---------- OVERVIEW (hub) ----------
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <ThemedText type="title" style={styles.title}>
            Learn
          </ThemedText>

          {error && <ThemedText style={{ color: theme.major }}>{error}</ThemedText>}

          {/* Spaced repetition review */}
          <View style={[styles.hero, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.heroTop}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.heroTitle}>Review</ThemedText>
                <ThemedText style={{ color: theme.textSecondary }}>
                  Revisit past mistakes right before you would forget them.
                </ThemedText>
              </View>
              {dueCount > 0 ? (
                <View style={[styles.badge, { backgroundColor: theme.tint }]}>
                  <ThemedText style={styles.badgeText}>{dueCount}</ThemedText>
                </View>
              ) : null}
            </View>
            <Pressable
              style={[
                styles.primary,
                { backgroundColor: dueCount > 0 ? theme.tint : theme.backgroundSelected },
              ]}
              disabled={dueCount === 0 || loadingReview}
              onPress={startReview}>
              {loadingReview ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.primaryText}>
                  {dueCount > 0 ? `Start review (${dueCount} due today)` : 'Nothing due right now'}
                </ThemedText>
              )}
            </Pressable>
          </View>

          {/* Production practice */}
          <View style={[styles.hero, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={styles.heroTitle}>Production practice</ThemedText>
            <ThemedText style={{ color: theme.textSecondary }}>
              Get a real-life scenario and respond cold, speaking or typing, the way you would in the
              moment.
            </ThemedText>
            <Pressable
              style={[styles.primary, { backgroundColor: theme.tint }]}
              onPress={() => setMode('produce')}>
              <ThemedText style={styles.primaryText}>New scenario</ThemedText>
            </Pressable>
          </View>

          {/* AI practice sets (clusters) */}
          <ThemedText type="small" style={{ color: theme.textSecondary, textTransform: 'uppercase' }}>
            Practice sets
          </ThemedText>
          <View style={styles.statsRow}>
            <Stat label="Cards" value={counts.total} />
            <Stat label="To review" value={counts.toReview} />
            <Stat label="Mastered" value={counts.mastered} />
          </View>

          {counts.total === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText style={{ fontSize: 16 }}>
                No cards yet. Generate a practice set and I will turn your recent mistakes into small
                clusters, each drilling one pattern across different everyday situations.
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
                {counts.toReview
                  ? `Start practice (${Math.min(counts.toReview, SESSION_SIZE)})`
                  : 'All caught up'}
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
              Building clusters from your weak spots, same lesson in new contexts. This takes a few
              seconds.
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
  hero: { borderRadius: Spacing.four, padding: Spacing.four, gap: Spacing.three },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  heroTitle: { fontSize: 22, fontWeight: '700', lineHeight: 28 },
  badge: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontWeight: '800', fontSize: 16 },
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
