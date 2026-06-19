import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft, FileText,
} from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple } from '../platform';
import { fmtNum } from '../helpers';
import { fetchGeneralStats, fetchBranches } from '../api';
import { PERIODS } from '../mocks';
import { makeStyles } from '../styles';
import { Skeleton } from '../components/Skeleton';
import { Chip } from '../components/Common';
import type { GeneralStats, RFBranch } from '../types';
import type { S } from '../styles';

// ════════════════════════════════════════════════════════════════════
// GENERAL STATS SCREEN — 16 ключевых метрик (как /analytics/ в вебе)
// ════════════════════════════════════════════════════════════════════
export const GeneralStatsScreen: React.FC<{
  onBack: () => void;
  onOpenReport?: () => void;
}> = ({ onBack, onOpenReport }) => {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);

  const [stats, setStats] = useState<GeneralStats | null>(null);
  const [branches, setBranches] = useState<RFBranch[]>([]);
  const [periodDays, setPeriodDays] = useState(30);
  const [branchId, setBranchId] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [st, br] = await Promise.all([
        fetchGeneralStats({ period_days: periodDays, branch_ids: branchId === 0 ? [] : [branchId] }),
        branches.length > 0 ? Promise.resolve(branches) : fetchBranches(),
      ]);
      setStats(st);
      if (branches.length === 0) setBranches(br);
    } catch {} finally {
      setLoading(false); setRefreshing(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [periodDays, branchId]);

  const onRefresh = () => { haptic('light'); setRefreshing(true); load(); };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="dark" />

      <View style={s.backHeader}>
        <Pressable style={s.backBtn} {...ripple()} onPress={onBack}>
          <ChevronLeft size={20} color={C.ink} strokeWidth={2.2} />
        </Pressable>
        <View style={s.screenTitleBlock}>
          <Text style={s.screenTitleSuper}>Аналитика</Text>
          <Text style={s.screenTitleMain}>Общая статистика</Text>
        </View>
        {onOpenReport && (
          <Pressable
            style={[s.backBtn, { backgroundColor: C.purple, borderColor: C.purple }]}
            {...ripple('rgba(255,255,255,0.22)')}
            onPress={() => { haptic('light'); onOpenReport(); }}
            accessibilityLabel="Отчёт"
          >
            <FileText size={18} color={C.surface} strokeWidth={2.2} />
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple} />}
      >
        {/* Period chips */}
        <View style={s.filterBlock}>
          <Text style={s.filterLabel}>Период</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
            {PERIODS.map(p => (
              <Chip
                key={p.days}
                active={periodDays === p.days}
                onPress={() => { haptic('light'); setPeriodDays(p.days); }}
                s={s}
              >{p.label}</Chip>
            ))}
          </ScrollView>
        </View>

        {/* Branches */}
        {branches.length > 1 && (
          <View style={s.filterBlock}>
            <Text style={s.filterLabel}>Площадка</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
              {branches.map(b => (
                <Chip
                  key={b.id}
                  active={branchId === b.id}
                  onPress={() => { haptic('light'); setBranchId(b.id); }}
                  s={s}
                >{b.name}</Chip>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Metric cards */}
        {loading || !stats ? (
          <View style={s.metricsGrid}>
            {Array.from({ length: 8 }).map((_, i) => (
              <View key={i} style={s.metricCard}>
                <Skeleton w="60%" h={12} />
                <View style={{ height: 8 }} />
                <Skeleton w="40%" h={28} />
                <View style={{ height: 6 }} />
                <Skeleton w="80%" h={11} />
              </View>
            ))}
          </View>
        ) : (
          <View style={s.metricsGrid}>
            <Metric s={s} accent={C.good}     emoji="📱" label="Отсканировали QR-код"      val={stats.total_scans ?? stats.qr_scans} sub="кафе + доставка" />
            <Metric s={s} accent={C.limeDeep} emoji="🎮" label="Начали игру"              val={stats.game_reached ?? 0} sub="воронка после скана" />
            <Metric s={s} accent={C.good}     emoji="🏪" label="Сканы в кафе"             val={stats.cafe_scans ?? 0} />
            <Metric s={s} accent={C.watch}    emoji="🚚" label="Сканы с доставки"         val={stats.delivery_scans ?? 0} />
            <Metric s={s} accent={C.purple}   emoji="📬" label="Гости в базе"             val={stats.total_vk_subscribers} sub="группа + рассылка · всё время" />
            <Metric s={s} accent={C.good}     emoji="🎁" label="Новые в группе + подарок" val={stats.new_group_with_gift} />
            <Metric s={s} accent={C.limeDeep} emoji="🔄" label="Повторно сыграли"         val={stats.repeat_game_players} />
            <Metric s={s} accent={C.purple}   emoji="💰" label="Купили подарки за баллы"  val={stats.coin_purchasers} />
            <Metric s={s} accent={C.purple}   emoji="📬" label="Подписались в VK — всего" val={stats.new_community_subscribers} sub="кафе+доставка+сториз" />
            <Metric s={s} accent={C.purple}   emoji="📨" label="Подписались на рассылку — всего" val={stats.new_newsletter_subscribers} sub="кафе+доставка+сториз" />
            <Metric s={s} accent={C.purple}   emoji="🏪" label="В VK через кафе"          val={stats.community_subs_cafe ?? 0} />
            <Metric s={s} accent={C.watch}    emoji="🚚" label="В VK через доставку"      val={stats.community_subs_delivery ?? 0} />
            <Metric s={s} accent={C.limeDeep} emoji="📖" label="В VK через сториз"        val={stats.community_subs_story ?? 0} />
            <Metric s={s} accent={C.purple}   emoji="🏪" label="Рассылка через кафе"      val={stats.newsletter_subs_cafe ?? 0} />
            <Metric s={s} accent={C.watch}    emoji="🚚" label="Рассылка через доставку"  val={stats.newsletter_subs_delivery ?? 0} />
            <Metric s={s} accent={C.limeDeep} emoji="📖" label="Рассылка через сториз"    val={stats.newsletter_subs_story ?? 0} />
            <Metric s={s} accent={C.good}     emoji="🎁" label="Получили первый подарок"  val={stats.first_gift_receivers} />
            <Metric s={s} accent={C.good}     emoji="✅" label="Активировали подарок"     val={stats.gift_activators} />
            <Metric s={s} accent={C.watch}    emoji="🎂" label="Поздравлений с ДР"        val={stats.birthday_greetings_sent} />
            <Metric s={s} accent={C.watch}    emoji="🎉" label="Пришли на ДР"             val={stats.birthday_celebrants} />
            <Metric
              s={s} accent={C.watch} emoji="📊"
              label="% открываемости рассылок"
              val={stats.message_open_rate != null ? `${stats.message_open_rate.toFixed(1)}%` : '—'}
              sub={`Прочитано ${fmtNum(stats.message_total_read)} из ${fmtNum(stats.message_total_sent)}`}
            />
            <Metric s={s} accent={C.limeDeep} emoji="📖" label="Опубликовали истории"     val={stats.vk_stories_publishers} />
            <Metric s={s} accent={C.limeDeep} emoji="➡️"  label="Перешли из историй"       val={stats.stories_referrals} />
            <Metric s={s} accent={C.good}     emoji="👥" label="Гостей по POS"             val={fmtNum(stats.pos_guests)} sub="IIKO / Dooglys" />
            <Metric
              s={s} accent={C.watch} emoji="🔄"
              label="Индекс сканирования"
              val={`${stats.scan_index.toFixed(1)}%`}
              sub="QR ÷ POS × 100"
            />
          </View>
        )}

        {/* Hint */}
        <View style={[s.modalHint, { marginHorizontal: r.pad, marginBottom: 8 }]}>
          <Text style={s.modalHintText}>
            Это сводка ключевых метрик за выбранный период. Расширенный отчёт со сравнением, графиками и AI-резюме — на странице «Отчёты».
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────
const Metric: React.FC<{
  s: S; accent: string; emoji: string; label: string;
  val: string | number; sub?: string;
}> = ({ s, accent, emoji, label, val, sub }) => (
  <View style={s.metricCard}>
    <View style={[s.metricAccent, { backgroundColor: accent }]} />
    <Text style={s.metricLabel} numberOfLines={2}>{emoji} {label}</Text>
    <Text style={s.metricVal} numberOfLines={1} adjustsFontSizeToFit>
      {typeof val === 'number' ? fmtNum(val) : val}
    </Text>
    {sub && <Text style={s.metricSub} numberOfLines={2}>{sub}</Text>}
  </View>
);
