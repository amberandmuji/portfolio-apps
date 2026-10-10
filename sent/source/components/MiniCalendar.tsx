import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { COLORS } from '../constants/theme';

interface Props {
  selectedDate: string; // YYYY-MM-DD
  onSelect: (date: string) => void;
}

function toDateInputValue(d: Date) {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function MiniCalendar({ selectedDate, onSelect }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const initial = new Date(`${selectedDate}T00:00:00`);
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const isCurrentMonthView = viewYear === today.getFullYear() && viewMonth === today.getMonth();
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const firstDayOffset = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const rawCells: (number | null)[] = [...Array(firstDayOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const trailingBlanks = (7 - (rawCells.length % 7)) % 7;
  const cells: (number | null)[] = [...rawCells, ...Array(trailingBlanks).fill(null)];

  function changeMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    if (y > today.getFullYear() || (y === today.getFullYear() && m > today.getMonth())) return;
    setViewMonth(m);
    setViewYear(y);
  }

  return (
    <View>
      <View style={styles.header}>
        <Pressable onPress={() => changeMonth(-1)} hitSlop={11}>
          <ChevronLeft size={16} color={COLORS.sub} />
        </Pressable>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <Pressable onPress={() => changeMonth(1)} disabled={isCurrentMonthView} hitSlop={11}>
          <ChevronRight size={16} color={isCurrentMonthView ? COLORS.calendarInactive : COLORS.sub} />
        </Pressable>
      </View>
      <View style={styles.weekRow}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <Text key={i} style={styles.weekLabel}>{d}</Text>
        ))}
      </View>
      <View style={styles.grid}>
        {Array.from({ length: Math.ceil(cells.length / 7) }, (_, weekIdx) => (
          <View key={weekIdx} style={styles.weekGridRow}>
            {cells.slice(weekIdx * 7, weekIdx * 7 + 7).map((d, i) => {
              if (!d) return <View key={i} style={styles.cell} />;
              const cellDate = new Date(viewYear, viewMonth, d);
              const isFuture = cellDate > today;
              const isSelected = toDateInputValue(cellDate) === selectedDate;
              const isToday = cellDate.getTime() === today.getTime();
              return (
                <View key={i} style={styles.cell}>
                  <Pressable
                    disabled={isFuture}
                    onPress={() => onSelect(toDateInputValue(cellDate))}
                    style={[styles.dayButton, isSelected && { backgroundColor: COLORS.accent }]}
                  >
                    <Text style={[styles.dayText, isFuture && { color: COLORS.calendarInactive }, isSelected && { color: '#FFFFFF' }, isToday && !isSelected && { color: COLORS.accentDark, fontWeight: '600' }]}>
                      {d}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  monthLabel: { fontSize: 16, fontWeight: '600', color: COLORS.ink },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: 14, color: COLORS.sub },
  grid: { flexDirection: 'column' },
  weekGridRow: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', marginVertical: 2 },
  dayButton: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 14, color: COLORS.ink },
});
