import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, FlatList, RefreshControl, ScrollView, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft, Cake, Phone, Check, Info,
} from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple, callPhone } from '../platform';
import { fmtNum, avatarColor, initials } from '../helpers';
import { fetchUpcomingBirthdays } from '../api';
import { makeStyles } from '../styles';
import { SkeletonCard } from '../components/Skeleton';
import type { GuestBirthday } from '../types';
import type { S } from '../styles';

// ════════════════════════════════════════════════════════════════════
// BIRTHDAYS SCREEN — календарь ближайших ДР
// ════════════════════════════════════════════════════════════════════
type RangeKey = '7' | '14' | '30' | 'past';

const RANGES: { key: RangeKey; label: string }[] = [
  { key: '7',    label: '7 дней'   },
  { key: '14',   label: '14 дней'  },
  { key: '30',   label: '30 дней'  },
  { key: 'past', label: 'Прошли'   },
];

export const BirthdaysScreen: React.FC<{
  onBack: () => void;
  onOpenGuest?: (vkId: string) => void;
}> = ({ onBack, onOpenGuest }) => {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);

  const [list, setList] = useState<GuestBirthday[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState<RangeKey>('14');

  const load = async () => {
    try {
      const all = await fetchUpcomingBirthdays({ days_ahead: 30, include_past: true });
      setList(all);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { load(); }, []);
  const onRefresh = () => { haptic('light'); setRefreshing(true); load(); };

  const filtered = useMemo(() => {
    if (range === 'past') return list.filter(b => b.days_until < 0);
    const ahead = parseInt(range, 10);
    return list.filter(b => b.days_until >= 0 && b.days_until <= ahead);
  }, [list, range]);

  const counts = useMemo(() => ({
    '7':    list.filter(b => b.days_until >= 0 && b.days_until <= 7).length,
    '14':   list.filter(b => b.days_until >= 0 && b.days_until <= 14).length,
    '30':   list.filter(b => b.days_until >= 0 && b.days_until <= 30).length,
    'past': list.filter(b => b.days_until < 0).length,
  }), [list]);

  const todayCount = list.filter(b => b.days_until === 0).length;
  const next7Loyal = list.filter(b => b.days_until >= 0 && b.days_until <= 7 && b.is_loyal).length;

  // Раньше здесь была кнопка-пустышка «Рассылка всем»: показывала «запущена»,
  // не делая ни одного запроса. Поздравления на самом деле уходят автоматически
  // (шаблоны birthday_7d / birthday_1d / birthday на бэке) — честно объясняем это.
  const onSendBroadcast = () => {
    haptic('light');
    Alert.alert(
      'Поздравления уходят автоматически',
      `Каждому из ${filtered.length} ${plural(filtered.length, ['гостя', 'гостей', 'гостей'])} система сама отправит поздравление с подарком в день рождения (плюс напоминания за 7 дней и за 1 день — если шаблоны включены).\n\nОтдельная ручная рассылка не нужна — было бы дублирование. Тексты и включение шаблонов: веб-админка → «Шаблоны авторассылок».`,
      [{ text: 'Понятно' }],
    );
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="dark" />

      <View style={s.backHeader}>
        <Pressable style={s.backBtn} {...ripple()} onPress={onBack}>
          <ChevronLeft size={20} color={C.ink} strokeWidth={2.2} />
        </Pressable>
        <View style={s.screenTitleBlock}>
          <Text style={s.screenTitleSuper}>Гости</Text>
          <Text style={s.screenTitleMain}>Дни рождения</Text>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(b) => b.vk_id}
        contentContainerStyle={{ paddingHorizontal: Math.max(r.pad, 18), paddingBottom: 130 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple} />}
        ListHeaderComponent={
          <View>
            {/* Hero — сегодня + лояльные на 7 дней */}
            {!loading && (todayCount > 0 || next7Loyal > 0) && (
              <View style={[s.tasksCard, { marginHorizontal: 0, marginBottom: 14, padding: 16 }]}>
                {todayCount > 0 && (
                  <View style={[s.tasksHeadRow, { paddingBottom: 6 }]}>
                    <Text style={[s.tasksTitle, { color: C.purpleDeep }]}>🎂 Сегодня — {todayCount} {plural(todayCount, ['именинник', 'именинника', 'именинников'])}</Text>
                  </View>
                )}
                {next7Loyal > 0 && (
                  <Text style={[s.feedSub, { fontSize: 13, lineHeight: 18 }]}>
                    На ближайшие 7 дней — {next7Loyal} {plural(next7Loyal, ['постоянный гость', 'постоянных гостя', 'постоянных гостей'])}.
                    Подготовьте подарки заранее: десерт от шефа, бесплатный кофе или фирменный мерч.
                  </Text>
                )}
              </View>
            )}

            {/* Filter chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.rvFiltersRow, { paddingHorizontal: 0, marginBottom: 12 }]}>
              {RANGES.map(rng => {
                const active = range === rng.key;
                return (
                  <Pressable
                    key={rng.key}
                    style={[s.filterChip, active && s.filterChipActive]}
                    {...ripple()}
                    onPress={() => { haptic('light'); setRange(rng.key); }}
                  >
                    <Text style={[s.filterChipText, active && s.filterChipTextActive]}>{rng.label}</Text>
                    <View style={[s.filterChipBadge, active && s.filterChipBadgeActive]}>
                      <Text style={[s.filterChipBadgeText, active && s.filterChipBadgeTextActive]}>
                        {counts[rng.key]}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            {loading && (
              <View style={{ gap: 8 }}>
                <SkeletonCard /><SkeletonCard /><SkeletonCard />
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={s.emptyState}>
              <Cake size={36} color={C.ink4} strokeWidth={1.5} />
              <Text style={s.emptyStateTitle}>
                {range === 'past' ? 'Нет прошедших ДР' : 'Никто не празднует'}
              </Text>
              <Text style={s.emptyStateSub}>
                {range === 'past'
                  ? 'В этой подборке пусто.'
                  : 'В выбранном диапазоне нет именинников. Расширьте период.'}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          !loading && range !== 'past' && filtered.length > 0 ? (
            <Pressable
              style={[s.btn, s.btnPrimary, { marginTop: 16 }]}
              {...ripple('rgba(255,255,255,0.22)')}
              onPress={onSendBroadcast}
            >
              <Info size={14} color={C.surface} strokeWidth={2.2} />
              <Text style={s.btnPrimaryText}>
                Поздравления уходят автоматически
              </Text>
            </Pressable>
          ) : null
        }
        renderItem={({ item }) => (
          <BirthdayCard
            b={item}
            onPress={() => { haptic('light'); onOpenGuest?.(item.vk_id); }}
            onCall={item.phone ? () => callPhone({ phone: item.phone!, name: `${item.first_name} ${item.last_name}` }) : undefined}
            s={s}
          />
        )}
      />
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────
const BirthdayCard: React.FC<{
  b: GuestBirthday;
  onPress: () => void;
  onCall?: () => void;
  s: S;
}> = ({ b, onPress, onCall, s }) => {
  const fullname = `${b.first_name} ${b.last_name}`;
  const dayLabel = fmtBirthdayLabel(b.days_until, b.birthday_this_year);
  const dayColor =
    b.days_until === 0 ? C.warn :
    b.days_until <= 3 ? C.watch :
    b.days_until <= 7 ? C.purpleDeep :
    C.ink3;

  return (
    <Pressable style={s.listCard} {...ripple()} onPress={onPress}>
      <View style={[s.rvAvatar, { backgroundColor: avatarColor(fullname) }]}>
        <Text style={s.rvAvatarText}>{initials(fullname)}</Text>
      </View>
      <View style={s.listBody}>
        <View style={s.listHeadRow}>
          <Text style={s.listTitle} numberOfLines={1} ellipsizeMode="tail">
            {fullname}
            {b.is_loyal && <Text style={{ color: C.limeDeep, fontSize: 12 }}> ⭐</Text>}
          </Text>
          <Text style={[s.listTime, { color: dayColor, fontFamily: 'Manrope_800ExtraBold' }]}>
            {dayLabel}
          </Text>
        </View>
        <Text style={s.listSub} numberOfLines={1}>
          {fmtBirthdayDate(b.birthday)}
          {b.age_turning ? ` · исполняется ${b.age_turning}` : ''}
          {b.branch_name ? ` · ${b.branch_name}` : ''}
        </Text>
        <View style={s.listMetaRow}>
          {b.segment_emoji && b.segment_name && (
            <View style={[s.listMetaPill, { backgroundColor: C.purpleSoft, borderColor: C.purpleLine }]}>
              <Text style={[s.listMetaText, { color: C.purpleDeep }]}>
                {b.segment_emoji} {b.segment_name}
              </Text>
            </View>
          )}
          <View style={s.listMetaPill}>
            <Text style={s.listMetaText}>{fmtNum(b.coins)} ★</Text>
          </View>
          {b.greeting_status === 'planned' && (
            <View style={[s.listMetaPill, { backgroundColor: C.goodSoft, borderColor: '#A7F3C2' }]}>
              <Text style={[s.listMetaText, { color: C.good }]}>✉ запланировано</Text>
            </View>
          )}
          {b.greeting_status === 'sent' && (
            <View style={[s.listMetaPill, { backgroundColor: C.purpleSoft }]}>
              <Text style={[s.listMetaText, { color: C.purpleDeep }]}>отправлено</Text>
            </View>
          )}
          {b.greeting_status === 'came' && (
            <View style={[s.listMetaPill, { backgroundColor: C.goodSoft }]}>
              <Check size={10} color={C.good} strokeWidth={2.6} />
              <Text style={[s.listMetaText, { color: C.good }]}>пришёл отметить</Text>
            </View>
          )}
        </View>
      </View>
      {onCall && (
        <Pressable
          style={{
            width: 36, height: 36, borderRadius: 18, overflow: 'hidden',
            backgroundColor: C.purpleSoft, borderWidth: 1, borderColor: C.purpleLine,
            alignItems: 'center', justifyContent: 'center', marginLeft: 4,
          }}
          {...ripple()}
          onPress={(e: any) => { e.stopPropagation?.(); onCall(); }}
          accessibilityLabel="Позвонить"
        >
          <Phone size={15} color={C.purpleDeep} strokeWidth={2.4} />
        </Pressable>
      )}
    </Pressable>
  );
};

// ─────────────────────────────────────────────
function fmtBirthdayLabel(daysUntil: number, isoThisYear: string): string {
  if (daysUntil === 0) return 'СЕГОДНЯ';
  if (daysUntil === 1) return 'ЗАВТРА';
  if (daysUntil === -1) return 'ВЧЕРА';
  if (daysUntil > 0) return `через ${daysUntil} ${plural(daysUntil, ['день', 'дня', 'дней'])}`;
  return `${Math.abs(daysUntil)} ${plural(Math.abs(daysUntil), ['день', 'дня', 'дней'])} назад`;
}

function fmtBirthdayDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  return `${parseInt(m[3], 10)} ${months[parseInt(m[2], 10) - 1]}`;
}

function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}
