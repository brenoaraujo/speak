import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = TextInputProps & {
  /** Called when the user taps the clear (x) button. */
  onClear: () => void;
};

// A multiline text input with a floating clear button in the top-right corner,
// shown only when there is text and the field is editable. Lets the user reset
// their answer in one tap instead of selecting and deleting.
export function ClearableInput({ onClear, style, value, editable, ...rest }: Props) {
  const theme = useTheme();
  const hasText = typeof value === 'string' && value.trim().length > 0;
  const showClear = hasText && editable !== false;

  return (
    <View style={styles.wrap}>
      <TextInput value={value} editable={editable} style={style} {...rest} />
      {showClear ? (
        <Pressable
          onPress={onClear}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Clear text"
          style={[styles.clear, { backgroundColor: theme.backgroundSelected }]}>
          <Ionicons name="close" size={16} color={theme.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  clear: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
