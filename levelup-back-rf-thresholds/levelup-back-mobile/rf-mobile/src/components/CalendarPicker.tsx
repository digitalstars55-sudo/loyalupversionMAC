import React, { useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { C } from '../theme';
import { ripple, haptic } from '../platform';

// ════════════════════════════════════════════════════════════════════
// CALENDAR PICKER — pure-JS (без нативных зависимостей, OTA-friendly).
// Двойной выбор: первый тап = start, второй = end. Подсветка диапазона.
// ════════════════════════════════════════════════════════════════════

const MONTHS_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];
const WEEKDAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const ymd = (d: Date): string => {
  const pad = (n: number) => n < 10 ? `0${n}` : `${n}`;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth()    === b.getMonth() &&
  a.getDate()     === b.getDate();

export const CalendarPicker: React.FC<{
  start: Date | null;
  end:   Date | null;
  maxDate?: Date;
  onChange: (start: Date | null, end: Date | null) => void;
}> = ({ start, end, maxDate, onChange }) => {
  const [viewMonth, setViewMonth] = useState<Date>(() => start ?? end ?? new Date());

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const max = maxDate ?? today;

  const grid = useMemo(() => {
    const y = viewMonth.getFullYear();
    const m = viewMonth.getMonth();
    const first = new Date(y, m, 1);
    // 0 = Sun → переводим к Mon-первый
    const firstWeekDay = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstWeekDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewMonth]);

  const onDayPress = (d: Date) => {
    if (d > max) return;
    haptic('light');
    if (!start || (start && end)) {
      onChange(d, null);
      return;
    }
    if (d < start) {
      onChange(d, start);
      return;
    }
    onChange(start, d);
  };

  const isInRange = (d: Date): boolean => {
    if (!start || !end) return false;
    return d.getTime() > start.getTime() && d.getTime() < end.getTime();
  };

  const isStart = (d: Date) => start && sameDay(d, start);
  const isEnd   = (d: Date) => end   && sameDay(d, end);
  const isToday = (d: Date) => sameDay(d, today);

  const prevMonth = () => {
    haptic('light');
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    haptic('light');
    const next = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
    if (next.getFullYear() > max.getFullYear() ||
       (next.getFullYear() === max.getFullYear() && next.getMonth() > max.getMonth())) return;
    setViewMonth(next);
  };

  return (
    <View>
      {/* Header: prev / month-year / next */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 6, marginBottom: 4,
      }}>
        <Pressable
          {...ripple()}
          onPress={prevMonth}
          style={{ padding: 6, borderRadius: 8 }}
        >
          <ChevronLeft size={20} color={C.ink} strokeWidth={2.2} />
        </Pressable>
        <Text style={{
          fontFamily: 'Manrope_800ExtraBold', fontSize: 15, color: C.ink,
          letterSpacing: -0.2,
        }}>
          {MONTHS_RU[viewMonth.getMonth()]} {viewMonth.getFullYear()}
        </Text>
        <Pressable
          {...ripple()}
          onPress={nextMonth}
          style={{ padding: 6, borderRadius: 8 }}
        >
          <ChevronRight size={20} color={C.ink} strokeWidth={2.2} />
        </Pressable>
      </View>

      {/* Weekdays row */}
      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
        {WEEKDAYS_RU.map((w) => (
          <View key={w} style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}>
            <Text style={{
              fontFamily: 'Manrope_700Bold', fontSize: 10, color: C.ink4,
            }}>{w}</Text>
          </View>
        ))}
      </View>

      {/* Days grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {grid.map((d, i) => {
          if (!d) return <View key={i} style={{ width: `${100 / 7}%`, height: 36 }} />;
          const disabled = d > max;
          const inRange = isInRange(d);
          const startCell = isStart(d);
          const endCell = isEnd(d);
          const today_ = isToday(d);

          return (
            <Pressable
              key={i}
              onPress={() => onDayPress(d)}
              disabled={disabled}
              style={{
                width: `${100 / 7}%`,
                height: 36,
                alignItems: 'center', justifyContent: 'center',
                opacity: disabled ? 0.3 : 1,
              }}
            >
              <View style={{
                width: 30, height: 30, borderRadius: 15,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: (startCell || endCell) ? C.purple : (inRange ? C.purpleSoft : 'transparent'),
                borderWidth: today_ && !startCell && !endCell ? 1 : 0,
                borderColor: C.purple,
              }}>
                <Text style={{
                  fontFamily: (startCell || endCell) ? 'Manrope_800ExtraBold' : 'Manrope_600SemiBold',
                  fontSize: 13,
                  color: (startCell || endCell) ? C.surface : (inRange ? C.purpleDeep : C.ink),
                }}>{d.getDate()}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Hint */}
      <Text style={{
        fontFamily: 'Manrope_500Medium', fontSize: 11, color: C.ink4,
        marginTop: 6, paddingHorizontal: 4,
      }}>
        {!start ? 'Нажмите дату начала периода' :
         !end   ? 'Теперь нажмите дату конца' :
                  'Нажмите ещё раз чтобы выбрать новый диапазон'}
      </Text>
    </View>
  );
};

// Утилита для использования из других компонентов
export const fromYmd = (s: string): Date | null => {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [, y, mm, dd] = m;
  return new Date(Number(y), Number(mm) - 1, Number(dd));
};
export const toYmd = ymd;
