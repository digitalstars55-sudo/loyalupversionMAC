import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple } from '../platform';
import { fmtNum, relativeTime } from '../helpers';
import { fetchCrossOverview } from '../api';
import { makeStyles } from '../styles';
import { Skeleton } from '../components/Skeleton';
import { Chip } from '../components/Common';
import { DateRangeModal, type DateRange } from '../components/DateRangeModal';
import type { CrossOverview, CrossOverviewFeedItem } from '../types';
import type { S } from '../styles';

// Цвет бейджа тональности отзыва (как на вебе /admin/overview/)
const SENT_COLOR: Record<string, string> = {
  positive: C.good, negative: C.warn, partial: C.watch, neutral: '#6b7280',
};

// ════════════════════════════════════════════════════════════════════
// CROSS-TENANT OVERVIEW — сводная по всем клиентам (только superadmin)
// Зеркало /admin/overview/ в вебе. Данные с публичного домена.
// ════════════════════════════════════════════════════════════════════

const OV_PERIODS: { code: string; label: string }[] = [
  { code: 'yesterday', label: 'Вчера' },
  { code: 'today',     label: 'Сегодня' },
  { code: '7d',        label: '7 дней' },
  { code: '30d',       label: '30 дней' },
];

const OvTotal: React.FC<{ accent: string; emoji: string; label: string; val: number }> =
  ({ accent, emoji, label, val }) => (
    <View style={{
      width: '48%', flexGrow: 1, minHeight: 92,
      backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.line,
      paddingHorizontal: 14, paddingTop: 14, paddingBottom: 12, overflow: 'hidden',
    }}>
      <View style={{ position: 'absolute', top: 0, left: 14, width: 28, height: 3, backgroundColor: accent, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 }} />
      <Text style={{ fontSize: 11, color: C.ink3, lineHeight: 15, marginBottom: 6 }} numberOfLines={2}>{emoji} {label}</Text>
      <Text style={{ fontSize: 26, fontWeight: '800', color: C.ink, letterSpacing: -0.8 }} numberOfLines={1}>{fmtNum(val)}</Text>
    </View>
  );

export const CrossOverviewScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);

  const [data, setData] = useState<CrossOverview | null>(null);
  const [period, setPeriod] = useState('30d');
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      setData(await fetchCrossOverview(
        customRange
          ? { start_date: customRange.start_date, end_date: customRange.end_date }
          : { period }
      ));
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [period, customRange]);
  const onRefresh = () => { haptic('light'); setRefreshing(true); load(); };

  const t = data?.totals;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="dark" />

      <View style={s.backHeader}>
        <Pressable style={s.backBtn} {...ripple()} onPress={onBack}>
          <ChevronLeft size={20} color={C.ink} strokeWidth={2.2} />
        </Pressable>
        <View style={s.screenTitleBlock}>
          <Text style={s.screenTitleSuper}>Платформа</Text>
          <Text style={s.screenTitleMain}>Сводная по клиентам</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple} />}
      >
        {/* Period */}
        <View style={s.filterBlock}>
          <Text style={s.filterLabel}>Период</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
            {OV_PERIODS.map(p => (
              <Chip key={p.code} active={!customRange && period === p.code} onPress={() => { haptic('light'); setCustomRange(null); setPeriod(p.code); }} s={s}>
                {p.label}
              </Chip>
            ))}
            <Chip active={!!customRange} onPress={() => { haptic('light'); setDatePickerOpen(true); }} s={s}>
              {customRange ? customRange.display : '📅 Произвольно'}
            </Chip>
          </ScrollView>
        </View>

        {loading || !t ? (
          <View style={s.metricsGrid}>
            {[...Array(5)].map((_, i) => (
              <View key={i} style={s.metricCard}>
                <Skeleton w="60%" h={12} /><View style={{ height: 8 }} /><Skeleton w="40%" h={26} />
              </View>
            ))}
          </View>
        ) : (
          <>
            {/* Totals по всем клиентам — своя раскладка (равные карточки, крупное число) */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: r.pad, marginBottom: 18 }}>
              <OvTotal accent={C.good}     emoji="📲" label="Сканирования QR"     val={t.total_scans} />
              <OvTotal accent={C.purple}   emoji="👥" label="Подписки в группу VK" val={t.new_community} />
              <OvTotal accent={C.purple}   emoji="✉️" label="Подписки в рассылку"  val={t.new_newsletter} />
              <OvTotal accent={C.limeDeep} emoji="📸" label="Сделали stories"      val={t.stories} />
              <OvTotal accent={C.watch}    emoji="⭐" label="Новые отзывы"         val={t.reviews} />
            </View>

            {/* Список клиентов */}
            <View style={s.filterBlock}>
              <Text style={s.filterLabel}>Клиенты и показатели · {data!.client_count}</Text>
            </View>
            <View style={{ paddingHorizontal: r.pad, gap: 10 }}>
              {data!.rows.map(row => (
                <View key={row.schema} style={s.ovRow}>
                  <View style={s.ovRowHead}>
                    <View style={s.ovAvatar}><Text style={s.ovAvatarTxt}>{(row.name[0] || '?').toUpperCase()}</Text></View>
                    <Text style={s.ovRowName} numberOfLines={1}>{row.name}</Text>
                    {row.pos_guests ? (
                      <View style={s.ovIdx}><Text style={s.ovIdxTxt}>{row.scan_index.toFixed(1)}%</Text></View>
                    ) : <Text style={s.ovIdxDash}>—</Text>}
                  </View>
                  <View style={s.ovRowStats}>
                    <OvStat s={s} label="Сканы"   val={row.total_scans} />
                    <OvStat s={s} label="Группа"  val={row.new_community} />
                    <OvStat s={s} label="Рассылка" val={row.new_newsletter} />
                    <OvStat s={s} label="Stories" val={row.stories} />
                    <OvStat s={s} label="Отзывы"  val={row.reviews} />
                  </View>
                </View>
              ))}
            </View>

            {/* Лента отзывов по всем клиентам (топ-20) */}
            {data!.feed && data!.feed.length > 0 && (
              <>
                <View style={[s.filterBlock, { marginTop: 20 }]}>
                  <Text style={s.filterLabel}>Последние отзывы · все клиенты</Text>
                </View>
                <View style={{ paddingHorizontal: r.pad, gap: 8 }}>
                  {data!.feed.map((f, i) => <FeedRow key={`${f.conversation_id}_${i}`} f={f} />)}
                </View>
              </>
            )}

            <View style={[s.modalHint, { marginHorizontal: r.pad, marginTop: 12, marginBottom: 8 }]}>
              <Text style={s.modalHintText}>
                Сводка по всем подключённым клиентам за период. Сканирования = кафе + доставка. Индекс — где есть данные кассы (POS).
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      <DateRangeModal
        visible={datePickerOpen}
        initial={customRange ? { start_date: customRange.start_date, end_date: customRange.end_date } : undefined}
        onClose={() => setDatePickerOpen(false)}
        onApply={(range) => { haptic('light'); setCustomRange(range); setDatePickerOpen(false); }}
        s={s}
      />
    </SafeAreaView>
  );
};

const FeedRow: React.FC<{ f: CrossOverviewFeedItem }> = ({ f }) => {
  const color = SENT_COLOR[f.sentiment_class] || '#6b7280';
  return (
    <View style={{ backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.line, padding: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: C.ink, flex: 1 }} numberOfLines={1}>{f.client}</Text>
        <View style={{ backgroundColor: color, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, marginLeft: 8 }}>
          <Text style={{ color: '#fff', fontSize: 9.5, fontWeight: '700' }}>{f.sentiment_label}</Text>
        </View>
      </View>
      <Text style={{ fontSize: 13, color: C.ink2, lineHeight: 18 }} numberOfLines={4}>{f.text}</Text>
      <Text style={{ fontSize: 11, color: C.ink4, marginTop: 5 }}>{relativeTime(f.created_at)}</Text>
    </View>
  );
};

const OvStat: React.FC<{ s: S; label: string; val: number }> = ({ s, label, val }) => (
  <View style={s.ovStat}>
    <Text style={s.ovStatVal}>{fmtNum(val)}</Text>
    <Text style={s.ovStatLabel}>{label}</Text>
  </View>
);
