import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScoreRing } from '@/components/score-ring';
import { Sparkline } from '@/components/sparkline';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchCategoryStats, fetchEntries } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { CategoryStat, Entry } from '@/lib/types';

// Weight a category so a few "major" mistakes rank above many "minor" ones.
function focusScore(s: CategoryStat): number {
  return s.major * 3 + s.moderate * 2 + s.minor;
}

const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

export default function ProfileScreen() {
  const theme = useTheme();
  const { session, signOut } = useAuth();
  const [stats, setStats] = useState<CategoryStat[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);

  const load = useCallback(async () => {
    try {
      const [s, e] = await Promise.all([fetchCategoryStats(), fetchEntries()]);
      setStats(s);
      setEntries(e);
    } catch {
      // ignore; will retry on next focus
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const totalMistakes = stats.reduce((sum, s) => sum + s.total, 0);
  const focusAreas = [...stats].sort((a, b) => focusScore(b) - focusScore(a)).slice(0, 5);
  const maxTotal = Math.max(1, ...focusAreas.map((s) => s.total));
  const displayName = session?.user.user_metadata?.display_name as string | undefined;

  // Scores oldest -> newest (fetchEntries returns newest first).
  const scores = entries
    .filter((e) => e.score != null)
    .map((e) => e.score as number)
    .reverse();
  const overall = scores.length ? Math.round(mean(scores)) : null;

  // Trend: recent messages vs the ones before them.
  let trendDelta: number | null = null;
  if (scores.length >= 4) {
    const recentN = Math.min(3, Math.floor(scores.length / 2));
    trendDelta = Math.round(mean(scores.slice(-recentN)) - mean(scores.slice(0, -recentN)));
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <ThemedText type="title" style={styles.title}>
            Profile
          </ThemedText>
          {displayName ? (
            <ThemedText style={{ color: theme.textSecondary }}>Hi {displayName}.</ThemedText>
          ) : null}

          {/* Overall score hero */}
          <View style={[styles.hero, { backgroundColor: theme.backgroundElement }]}>
            <ScoreRing score={overall} size={96} strokeWidth={9} />
            <View style={styles.heroText}>
              <ThemedText type="smallBold" style={{ color: theme.textSecondary }}>
                OVERALL SCORE
              </ThemedText>
              {overall == null ? (
                <ThemedText style={{ color: theme.textSecondary }}>
                  Check a few messages and your score shows up here.
                </ThemedText>
              ) : trendDelta == null ? (
                <ThemedText style={{ color: theme.textSecondary }}>
                  Keep going to see your trend over time.
                </ThemedText>
              ) : (
                <ThemedText
                  style={{
                    color:
                      trendDelta > 0 ? theme.success : trendDelta < 0 ? theme.major : theme.textSecondary,
                    fontWeight: '600',
                  }}>
                  {trendDelta > 0 ? '▲' : trendDelta < 0 ? '▼' : '='} {Math.abs(trendDelta)} point
                  {Math.abs(trendDelta) === 1 ? '' : 's'} vs your earlier messages
                </ThemedText>
              )}
            </View>
          </View>

          {/* Score over time */}
          {scores.length >= 2 && (
            <View style={{ gap: Spacing.two }}>
              <ThemedText type="small" style={{ color: theme.textSecondary, textTransform: 'uppercase' }}>
                Scores over time
              </ThemedText>
              <View style={[styles.chartCard, { backgroundColor: theme.backgroundElement }]}>
                <Sparkline data={scores} />
              </View>
            </View>
          )}

          {/* Summary */}
          <View style={styles.summaryRow}>
            <Stat label="Messages" value={entries.length} />
            <Stat label="Mistakes found" value={totalMistakes} />
          </View>

          {/* Focus areas */}
          <View style={{ gap: Spacing.two }}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Areas to study
            </ThemedText>
            {focusAreas.length === 0 ? (
              <ThemedText style={{ color: theme.textSecondary }}>
                Once you check a few messages, your recurring mistakes will show up here with tips
                on what to practice.
              </ThemedText>
            ) : (
              focusAreas.map((s) => (
                <View
                  key={s.category}
                  style={[styles.areaCard, { backgroundColor: theme.backgroundElement }]}>
                  <View style={styles.areaHeader}>
                    <ThemedText type="smallBold">{s.label}</ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      {s.total} {s.total === 1 ? 'time' : 'times'}
                    </ThemedText>
                  </View>
                  <View style={[styles.barTrack, { backgroundColor: theme.backgroundSelected }]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          backgroundColor: theme.tint,
                          width: `${(s.total / maxTotal) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))
            )}
          </View>

          {focusAreas[0] && (
            <View style={[styles.tipCard, { borderColor: theme.border }]}>
              <ThemedText type="smallBold" style={{ color: theme.tint }}>
                Recommendation
              </ThemedText>
              <ThemedText style={{ color: theme.text }}>
                Your most common area is {focusAreas[0].label.toLowerCase()}. Try focusing on it in
                your next few messages and watch this number come down.
              </ThemedText>
            </View>
          )}

          <Pressable
            style={[styles.signOut, { borderColor: theme.border }]}
            onPress={() => signOut()}>
            <ThemedText style={{ color: theme.major, fontWeight: '600' }}>Sign out</ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Stat({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText style={small ? styles.statValueSmall : styles.statValue}>{value}</ThemedText>
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
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  title: { fontSize: 40, lineHeight: 44 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  heroText: { flex: 1, gap: Spacing.one },
  chartCard: { padding: Spacing.three, borderRadius: Spacing.three },
  summaryRow: { flexDirection: 'row', gap: Spacing.two },
  statCard: {
    flex: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  statValue: { fontSize: 28, fontWeight: '700' },
  statValueSmall: { fontSize: 16, fontWeight: '700' },
  sectionTitle: { fontSize: 24, lineHeight: 30 },
  areaCard: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  areaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barTrack: { height: 8, borderRadius: 999, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 999 },
  tipCard: { borderWidth: 1, borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.one },
  signOut: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
});
