import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

interface Props {
  sessionDates: Set<string>; // 'YYYY-M-D' keys (local date) for days with at least one logged session
  mode: 'month' | 'year';
  year: number;
  month?: number; // 0-11, only used in 'month' mode
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// Builds explicit rows of exact-count flex:1 cells rather than wrapping
// with width:'${100/7}%' — that loses a column to floating-point rounding
// (see MiniCalendar.tsx / CLAUDE.md).
function MonthGrid({ year, month, sessionDates, compact }: { year: number; month: number; sessionDates: Set<string>; compact: boolean }) {
  const firstDayOffset = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDayOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const rowCount = cells.length / 7;

  return (
    <View>
      {!compact && (
        <View style={styles.weekdayRow}>
          {WEEKDAY_LABELS.map((w, i) => (
            <Text key={i} style={styles.weekdayLabel}>{w}</Text>
          ))}
        </View>
      )}
      {Array.from({ length: rowCount }, (_, rowIdx) => (
        <View key={rowIdx} style={styles.dayRow}>
          {cells.slice(rowIdx * 7, rowIdx * 7 + 7).map((d, i) => {
            const logged = d !== null && sessionDates.has(`${year}-${month}-${d}`);
            return (
              <View key={i} style={styles.dayCell}>
                {d !== null &&
                  (compact ? (
                    <View style={[styles.compactDot, logged && styles.compactDotFilled]} />
                  ) : (
                    <View style={[styles.dayButton, logged && styles.dayButtonFilled]}>
                      <Text style={[styles.dayText, logged && styles.dayTextFilled]}>{d}</Text>
                    </View>
                  ))}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export function SessionCalendar({ sessionDates, mode, year, month = new Date().getMonth() }: Props) {
  if (mode === 'month') {
    return (
      <View>
        <Text style={styles.monthTitle}>
          {MONTH_LABELS[month]} {year}
        </Text>
        <MonthGrid year={year} month={month} sessionDates={sessionDates} compact={false} />
      </View>
    );
  }

  // Explicit rows of exact-count flex:1 cells, not flexWrap + percentage
  // widths — same rounding-loss risk as the 7-column day grid above.
  return (
    <View>
      {[0, 1, 2, 3].map((row) => (
        <View key={row} style={styles.yearRow}>
          {[0, 1, 2].map((col) => {
            const m = row * 3 + col;
            return (
              <View key={m} style={styles.yearMonthCell}>
                <Text style={styles.yearMonthLabel}>{MONTH_LABELS[m]}</Text>
                <MonthGrid year={year} month={m} sessionDates={sessionDates} compact />
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  monthTitle: { fontSize: 15, fontWeight: '600', color: COLORS.ink, marginBottom: 10, textAlign: 'center' },
  weekdayRow: { flexDirection: 'row', marginBottom: 4 },
  weekdayLabel: { flex: 1, textAlign: 'center', fontSize: 13, color: COLORS.sub },
  dayRow: { flexDirection: 'row' },
  dayCell: { flex: 1, alignItems: 'center', justifyContent: 'center', marginVertical: 2 },
  dayButton: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dayButtonFilled: { backgroundColor: COLORS.accent },
  dayText: { fontSize: 14, color: COLORS.ink },
  dayTextFilled: { color: '#FFFFFF', fontWeight: '600' },
  compactDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: COLORS.border },
  compactDotFilled: { backgroundColor: COLORS.accent },
  yearRow: { flexDirection: 'row' },
  yearMonthCell: { flex: 1, paddingHorizontal: 4, marginBottom: 16 },
  yearMonthLabel: { fontSize: 13, fontWeight: '600', color: COLORS.sub, marginBottom: 4, textAlign: 'center' },
});
