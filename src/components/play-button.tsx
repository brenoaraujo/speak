import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { usePlayback } from '@/hooks/use-playback';
import { useTheme } from '@/hooks/use-theme';
import { synthesizeSpeech } from '@/lib/api';

// A small "listen" control that reads a sentence aloud via text to speech.
// Renders nothing where playback is unsupported. Each instance is independent.
export function PlayButton({ text, label = 'Listen' }: { text: string | null; label?: string }) {
  const theme = useTheme();
  const { state, isSupported, toggle } = usePlayback();

  if (!isSupported || !text?.trim()) return null;

  const icon = state === 'playing' ? 'stop' : 'volume-high-outline';

  return (
    <Pressable
      onPress={() => toggle(() => synthesizeSpeech(text))}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.button}>
      {state === 'loading' ? (
        <ActivityIndicator size="small" color={theme.textSecondary} />
      ) : (
        <Ionicons name={icon} size={16} color={theme.textSecondary} />
      )}
      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        {state === 'playing' ? 'Stop' : label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    alignSelf: 'flex-start',
  },
});
