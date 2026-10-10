import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import { COLORS } from '../constants/theme';

interface Point {
  label: string;
  value: number; // index into the grade scale
}

interface Props {
  points: Point[];
  gradeLabels: readonly string[];
  height?: number;
}

const CHART_WIDTH = 300;
const Y_AXIS_WIDTH = 38; // room for grade labels like "5.11a" on the left

export function LineChart({ points, gradeLabels, height = 160 }: Props) {
  if (points.length === 0) return null;

  const maxIdx = gradeLabels.length - 1;
  const padding = 20;
  const plotLeft = padding + Y_AXIS_WIDTH;
  const plotWidth = CHART_WIDTH - plotLeft - padding;
  const plotHeight = height - padding * 2;

  const yFor = (value: number) => padding + plotHeight - (value / maxIdx) * plotHeight;

  const xStep = points.length > 1 ? plotWidth / (points.length - 1) : 0;
  const coords = points.map((p, i) => ({
    x: plotLeft + i * xStep,
    y: yFor(p.value),
  }));

  const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(' ');

  // Y-axis ticks span the grades actually sent in this period (not the
  // whole grade scale) so the top tick always reads as "your top grade".
  const values = points.map((p) => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const tickValues = Array.from(new Set(maxVal === minVal ? [maxVal] : [maxVal, Math.round((minVal + maxVal) / 2), minVal]));

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${CHART_WIDTH} ${height}`}>
        {tickValues.map((v) => (
          <SvgText key={v} x={plotLeft - 8} y={yFor(v) + 4} fontSize={11} fill={COLORS.sub} textAnchor="end">
            {gradeLabels[v]}
          </SvgText>
        ))}
        <Line x1={plotLeft} y1={padding} x2={plotLeft} y2={height - padding} stroke={COLORS.border} strokeWidth={1} />
        <Line x1={plotLeft} y1={height - padding} x2={CHART_WIDTH - padding} y2={height - padding} stroke={COLORS.border} strokeWidth={1} />
        <Polyline points={polylinePoints} fill="none" stroke={COLORS.accent} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {coords.map((c, i) => (
          <Circle key={i} cx={c.x} cy={c.y} r={3.5} fill={COLORS.accent} />
        ))}
      </Svg>
      <View style={[styles.labelRow, { paddingLeft: plotLeft, paddingRight: padding }]}>
        {points.map((p, i) => (
          <Text key={i} style={styles.xLabel} numberOfLines={1}>{p.label}</Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  xLabel: { fontSize: 12, color: COLORS.sub },
});
