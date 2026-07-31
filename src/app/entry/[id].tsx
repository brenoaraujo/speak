import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { ResultView } from '@/components/result-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchEntryWithMistakes } from '@/lib/api';
import type { Entry, Mistake } from '@/lib/types';

export default function EntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const [data, setData] = useState<{ entry: Entry; mistakes: Mistake[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchEntryWithMistakes(id)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load this entry.'));
  }, [id]);

  if (error) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText style={{ color: theme.major }}>{error}</ThemedText>
      </ThemedView>
    );
  }

  if (!data) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {new Date(data.entry.created_at).toLocaleString()}
          </ThemedText>
        </View>
        <ResultView
          originalText={data.entry.original_text}
          correctedText={data.entry.corrected_text}
          alternativeText={data.entry.alternative_text}
          mistakes={data.mistakes}
          score={data.entry.score}
          assessment={data.entry.assessment}
        />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: {
    padding: Spacing.four,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
});
