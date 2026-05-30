import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { X as XIcon, Calendar, Check } from 'lucide-react-native';
import { C } from '../theme';
import { haptic, ripple } from '../platform';
import type { S } from '../styles';
import { CalendarPicker, fromYmd, toYmd } from './CalendarPicker';
import { SheetModal } from './SheetModal';

// ════════════════════════════════════════════════════════════════════
// DATE RANGE MODAL — произвольный период с двумя date-input
// Без новых зависимостей: просто текстовые поля с маской DD.MM.YYYY.
// ════════════════════════════════════════════════════════════════════

// Маска: '12.04.2025' — авто-добавляет точки при вводе цифр
const maskDate = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  const a = digits.slice(0, 2);
  const b = digits.slice(2, 4);
  const c = digits.slice(4, 8);
  if (digits.length <= 2) return a;
  if (digits.length <= 4) return `${a}.${b}`;
  return `${a}.${b}.${c}`;
};

// Парсинг DD.MM.YYYY → Date или null
const parseDate = (s: string): Date | null => {
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (
    d.getFullYear() !== Number(yyyy) ||
    d.getMonth() !== Number(mm) - 1 ||
    d.getDate() !== Number(dd)
  ) return null;
  return d;
};

const fmtDate = (d: Date): string => {
  const pad = (n: number) => n < 10 ? `0${n}` : `${n}`;
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
};

const toIsoDate = (d: Date): string => {
  const pad = (n: number) => n < 10 ? `0${n}` : `${n}`;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export interface DateRange {
  start_date: string; // ISO YYYY-MM-DD
  end_date: string;
  display: string;    // «12.04 — 19.04»
}

const PRESETS: { label: string; days: number }[] = [
  { label: '7 дней',  days: 7 },
  { label: '30 дней', days: 30 },
  { label: '90 дней', days: 90 },
];

export const DateRangeModal: React.FC<{
  visible: boolean;
  initial?: { start_date?: string; end_date?: string };
  onClose: () => void;
  onApply: (range: DateRange) => void;
  s: S;
}> = ({ visible, initial, onClose, onApply, s }) => {
  const [start, setStart] = useState<Date | null>(null);
  const [end,   setEnd]   = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      const today = new Date();
      const defStart = new Date(today); defStart.setDate(today.getDate() - 30);
      if (initial?.start_date && initial?.end_date) {
        setStart(fromYmd(initial.start_date));
        setEnd(fromYmd(initial.end_date));
      } else {
        setStart(defStart);
        setEnd(today);
      }
      setError(null);
    }
  }, [visible]); // eslint-disable-line

  const onPreset = (days: number) => () => {
    haptic('light');
    const today = new Date();
    const s2 = new Date(today); s2.setDate(today.getDate() - days);
    setStart(s2); setEnd(today); setError(null);
  };

  const onApplyPress = () => {
    if (!start || !end) {
      setError('Выберите диапазон на календаре');
      haptic('error'); return;
    }
    if (start > end) {
      setError('Начало периода должно быть раньше конца');
      haptic('error'); return;
    }
    haptic('success');
    const fmtShort = (d: Date) => {
      const pad = (n: number) => n < 10 ? `0${n}` : `${n}`;
      return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
    };
    onApply({
      start_date: toYmd(start),
      end_date:   toYmd(end),
      display:    `${fmtShort(start)} — ${fmtShort(end)}`,
    });
  };

  return (
    <SheetModal visible={visible} onClose={onClose} maxHeightPct={0.9}>
          <View style={s.modalHeader}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.purpleSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={16} color={C.purpleDeep} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.modalSuper}>ПЕРИОД</Text>
              <Text style={s.modalTitle}>Произвольный диапазон</Text>
            </View>
            <Pressable style={s.modalClose} {...ripple()} onPress={onClose}>
              <XIcon size={18} color={C.ink} strokeWidth={2.2} />
            </Pressable>
          </View>

          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            {/* Текущий выбор */}
            <View style={{
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
              backgroundColor: C.paper, padding: 12, borderRadius: 12, marginBottom: 12,
            }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Manrope_500Medium', fontSize: 10, color: C.ink4 }}>С</Text>
                <Text style={{ fontFamily: 'Manrope_800ExtraBold', fontSize: 14, color: C.ink, marginTop: 2 }}>
                  {start ? `${pad2(start.getDate())}.${pad2(start.getMonth() + 1)}.${start.getFullYear()}` : '—'}
                </Text>
              </View>
              <Text style={{ color: C.ink3, fontSize: 16, marginHorizontal: 6 }}>—</Text>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Manrope_500Medium', fontSize: 10, color: C.ink4 }}>По</Text>
                <Text style={{ fontFamily: 'Manrope_800ExtraBold', fontSize: 14, color: C.ink, marginTop: 2 }}>
                  {end ? `${pad2(end.getDate())}.${pad2(end.getMonth() + 1)}.${end.getFullYear()}` : '—'}
                </Text>
              </View>
            </View>

            <CalendarPicker
              start={start}
              end={end}
              onChange={(s2, e2) => { setStart(s2); setEnd(e2); setError(null); }}
            />

            {error && (
              <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 12, color: C.warn, marginTop: 8 }}>
                {error}
              </Text>
            )}

            <Text style={[s.dateFieldLabel, { marginBottom: 8, paddingHorizontal: 4, marginTop: 14 }]}>
              БЫСТРЫЙ ВЫБОР
            </Text>
            <View style={s.dateRangePresets}>
              {PRESETS.map(p => (
                <Pressable key={p.days} style={s.pill} {...ripple()} onPress={onPreset(p.days)}>
                  <Text style={s.pillText}>Последние {p.label}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View style={s.modalFooter}>
            <Pressable style={[s.btn, s.btnSecondary]} {...ripple()} onPress={onClose}>
              <Text style={s.btnSecondaryText}>Отмена</Text>
            </Pressable>
            <Pressable style={[s.btn, s.btnPrimary]} {...ripple('rgba(255,255,255,0.22)')} onPress={onApplyPress}>
              <Check size={14} color={C.surface} strokeWidth={2.2} />
              <Text style={s.btnPrimaryText}>Применить</Text>
            </Pressable>
          </View>
    </SheetModal>
  );
};

const pad2 = (n: number) => n < 10 ? `0${n}` : `${n}`;
