import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScoreRing } from '@/components/score-ring';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchEntries, fetchPhrases } from '@/lib/api';
import type { Entry, Phrase } from '@/lib/types';

type Tab = 'corrections' | 'phrases';

export default function HistoryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('corrections');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [e, p] = await Promise.all([fetchEntries(), fetchPhrases()]);
      setEntries(e);
      setPhrases(p);
    } catch {
      // Keep whatever we had; a pull-to-refresh will retry.
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload every time the tab gains focus so new items show up.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const header = (
    <View style={styles.headerBlock}>
      <ThemedText type="title" style={styles.title}>
        History
      </ThemedText>
      <View style={[styles.toggle, { backgroundColor: theme.backgroundElement }]}>
        <SegItem
          label="Corrections"
          active={tab === 'corrections'}
          onPress={() => setTab('corrections')}
        />
        <SegItem label="Phrases" active={tab === 'phrases'} onPress={() => setTab('phrases')} />
      </View>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.flex}>
        {tab === 'corrections' ? (
          <FlatList
            data={entries}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
            ListHeaderComponent={header}
            ListEmptyComponent={
              !loading ? (
                <ThemedText style={{ color: theme.textSecondary }}>
                  Nothing yet. Use Fix it on the Coach tab and it will show up here.
                </ThemedText>
              ) : null
            }
            renderItem={({ item }) => (
              <Pressable
                style={[styles.row, { backgroundColor: theme.backgroundElement }]}
                onPress={() => router.push(`/entry/${item.id}`)}>
                <View style={styles.rowMain}>
                  <ThemedText numberOfLines={2} style={styles.rowText}>
                    {item.original_text}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </ThemedText>
                </View>
                <ScoreRing score={item.score} size={44} strokeWidth={5} />
              </Pressable>
            )}
          />
        ) : (
          <FlatList
            data={phrases}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
            ListHeaderComponent={header}
            ListEmptyComponent={
              !loading ? (
                <ThemedText style={{ color: theme.textSecondary }}>
                  Nothing yet. Use Say it on the Coach tab and it will show up here.
                </ThemedText>
              ) : null
            }
            renderItem={({ item }) => (
              <Pressable
                style={[styles.phraseRow, { backgroundColor: theme.backgroundElement }]}
                onPress={() => router.push(`/phrase/${item.id}`)}>
                <ThemedText numberOfLines={1} type="small" style={{ color: theme.textSecondary }}>
                  {item.intent}
                </ThemedText>
                <ThemedText numberOfLines={2} style={styles.phraseBest}>
                  {item.best}
                </ThemedText>
              </Pressable>
            )}
          />
        )}
      </SafeAreaView>
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
        style={{ fontWeight: '600', color: active ? theme.text : theme.textSecondary }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  list: {
    padding: Spacing.four,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  headerBlock: { gap: Spacing.three, marginBottom: Spacing.three },
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
  row: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowMain: { flex: 1, gap: Spacing.two },
  rowText: { fontSize: 16, lineHeight: 22 },
  phraseRow: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  phraseBest: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
});
