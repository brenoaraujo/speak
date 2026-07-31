import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

type Props = {
  // Scores in chronological order (oldest first).
  data: number[];
  height?: number;
};

// A small line chart of scores over time, drawn on a fixed 0..100 scale so the
// slope reflects real improvement rather than auto-scaling to the data.
// Measures its own width so it fits any screen.
export function Sparkline({ data, height = 64 }: Props) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const pad = 6;
  const w = width - pad * 2;
  const h = height - pad * 2;

  let svg = null;
  if (width > 0 && data.length > 0) {
    const stepX = data.length > 1 ? w / (data.length - 1) : 0;
    const points = data.map((score, i) => {
      const x = pad + i * stepX;
      const y = pad + (1 - Math.max(0, Math.min(100, score)) / 100) * h;
      return { x, y };
    });
    const polyPoints = points.map((p) => `${p.x},${p.y}`).join(' ');
    const last = points[points.length - 1];
    svg = (
      <Svg width={width} height={height}>
        <Polyline
          points={polyPoints}
          fill="none"
          stroke={theme.tint}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx={last.x} cy={last.y} r={4} fill={theme.tint} />
      </Svg>
    );
  }

  return (
    <View onLayout={onLayout} style={{ width: '100%', height }}>
      {svg}
    </View>
  );
}
