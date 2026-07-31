import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { PhraseResultView } from '@/components/phrase-result-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchPhrase } from '@/lib/api';
import type { Phrase } from '@/lib/types';

export default function PhraseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const [phrase, setPhrase] = useState<Phrase | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchPhrase(id)
      .then(setPhrase)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load this phrase.'));
  }, [id]);

  if (error) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText style={{ color: theme.major }}>{error}</ThemedText>
      </ThemedView>
    );
  }

  if (!phrase) {
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
            {new Date(phrase.created_at).toLocaleString()}
          </ThemedText>
        </View>
        <PhraseResultView phrase={phrase} showIntent />
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
