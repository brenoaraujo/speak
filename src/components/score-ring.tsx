import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

// Color band for a score: green (strong), amber (okay), red (needs work).
export function scoreColor(score: number, theme: ReturnType<typeof useTheme>): string {
  if (score >= 80) return theme.success;
  if (score >= 60) return theme.moderate;
  return theme.major;
}

type Props = {
  score: number | null;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean; // show "score" caption under the number
};

export function ScoreRing({ score, size = 72, strokeWidth = 7, showLabel }: Props) {
  const theme = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const value = score ?? 0;
  const color = score == null ? theme.textSecondary : scoreColor(value, theme);
  const dash = (value / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {/* track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.backgroundSelected}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* progress */}
        {score != null && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            // start at 12 o'clock
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>
      <ThemedText style={{ fontSize: size * 0.3, fontWeight: '800', color }}>
        {score == null ? '—' : value}
      </ThemedText>
      {showLabel && (
        <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: -2 }}>
          score
        </ThemedText>
      )}
    </View>
  );
}
