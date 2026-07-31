import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScoreRing } from '@/components/score-ring';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchEntries } from '@/lib/api';
import type { Entry } from '@/lib/types';

export default function HistoryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setEntries(await fetchEntries());
    } catch {
      // Keep whatever we had; a pull-to-refresh will retry.
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload every time the tab gains focus so new entries show up.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.flex}>
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          ListHeaderComponent={
            <ThemedText type="title" style={styles.title}>
              History
            </ThemedText>
          }
          ListEmptyComponent={
            !loading ? (
              <ThemedText style={{ color: theme.textSecondary }}>
                Nothing yet. Check a message on the Coach tab and it will show up here.
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
      </SafeAreaView>
    </ThemedView>
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
  title: { fontSize: 40, lineHeight: 44, marginBottom: Spacing.two },
  row: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowMain: { flex: 1, gap: Spacing.two },
  rowText: { fontSize: 16, lineHeight: 22 },
});
