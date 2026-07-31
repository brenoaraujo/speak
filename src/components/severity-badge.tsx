import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Severity } from '@/lib/types';

const LABELS: Record<Severity, string> = {
  minor: 'Minor',
  moderate: 'Moderate',
  major: 'Major',
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const theme = useTheme();
  const color = theme[severity]; // minor | moderate | major colors from theme
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <ThemedText type="small" style={{ color, fontWeight: '700' }}>
        {LABELS[severity]}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 999,
    borderWidth: 1,
  },
});
