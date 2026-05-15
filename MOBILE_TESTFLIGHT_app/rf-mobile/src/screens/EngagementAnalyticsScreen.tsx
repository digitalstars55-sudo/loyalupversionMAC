import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft, Gift, Trophy, TrendingUp, TrendingDown, Coins, Clock,
  Target, Sparkles,
} from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple } from '../platform';
import { fmtNum } from '../helpers';
import { fetchEngagementAnalytics } from '../api';
import { makeStyles } from '../styles';
import { SkeletonCard } from '../components/Skeleton';
import type { GiftAnalytic, QuestAnalytic, EngagementSummary } from '../types';

// ════════════════════════════════════════════════════════════════════
// ENGAGEMENT ANALYTICS — аналитика подарков и квестов
// ════════════════════════════════════════════════════════════════════
type Tab = 'gifts' | 'quests';
type Period = 7 | 30 | 90;

export const EngagementAnalyticsScreen: React.FC<{
  onBack: () => void;
}> = ({ onBack }) => {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);

  const [tab, setTab] = useState<Tab>('gifts');
  const [period, setPeriod] = useState<Period>(30);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [summary, setSummary] = useState<EngagementSummary | null>(null);
  const [gifts, setGifts] = useState<GiftAnalytic[]>([]);
  const [quests, setQuests] = useState<QuestAnalytic[]>([]);

  const load = async () => {
    try {
      const data = await fetchEngagementAnalytics({ period_days: period });
      setSummary(data.summary);
      setGifts(data.gifts);
      setQuests(data.quests);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, [period]); // eslint-disable-line

  const onRefresh = () => { haptic('light'); setRefreshing(true); load(); };

  const pad = Math.max(r.pad, 18);

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="dark" />

      <View style={s.backHeader}>
        <Pressable style={s.backBtn} {...ripple()} onPress={() => { haptic('light'); onBack(); }}>
          <ChevronLeft size={20} color={C.ink} strokeWidth={2.2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.screenTitleSuper}>Аналитика</Text>
          <Text style={s.screenTitleMain}>Подарки и квесты</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple} />}
      >
        {/* Period chips */}
        <View style={[styles.periodRow, { paddingHorizontal: pad }]}>
          {([
            { key: 7,  label: '7 дн.' },
            { key: 30, label: '30 дн.' },
            { key: 90, label: '90 дн.' },
          ] as const).map(p => {
            const active = period === p.key;
            return (
              <Pressable
                key={p.key}
                style={[styles.periodChip, active && styles.periodChipActive]}
                {...ripple()}
                onPress={() => { haptic('light'); setPeriod(p.key); }}
              >
                <Text style={[styles.periodChipText, active && styles.periodChipTextActive]}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Tabs: gifts / quests */}
        <View style={[styles.tabsRow, { marginHorizontal: pad }]}>
          <Pressable
            style={[styles.tab, tab === 'gifts' && styles.tabActive]}
            {...ripple()}
            onPress={() => { haptic('light'); setTab('gifts'); }}
          >
            <Gift size={14} color={tab === 'gifts' ? C.surface : C.ink2} strokeWidth={2.2} />
            <Text style={[styles.tabText, tab === 'gifts' && styles.tabTextActive]}>Подарки</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, tab === 'quests' && styles.tabActive]}
            {...ripple()}
            onPress={() => { haptic('light'); setTab('quests'); }}
          >
            <Trophy size={14} color={tab === 'quests' ? C.surface : C.ink2} strokeWidth={2.2} />
            <Text style={[styles.tabText, tab === 'quests' && styles.tabTextActive]}>Квесты</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={{ paddingHorizontal: pad, gap: 10, marginTop: 14 }}>
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </View>
        ) : tab === 'gifts' ? (
          <GiftsTab summary={summary} gifts={gifts} pad={pad} />
        ) : (
          <QuestsTab summary={summary} quests={quests} pad={pad} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ────────────────────────────────────────────────────────────────────
// GIFTS TAB
// ────────────────────────────────────────────────────────────────────
const GiftsTab: React.FC<{
  summary: EngagementSummary | null;
  gifts: GiftAnalytic[];
  pad: number;
}> = ({ summary, gifts, pad }) => {
  const maxRedeemed = Math.max(1, ...gifts.map(g => g.redeemed_count));

  return (
    <View>
      {/* Summary KPIs */}
      {summary && (
        <View style={[styles.kpiGrid, { paddingHorizontal: pad }]}>
          <KpiTile
            icon={<Gift size={14} color="#9333EA" strokeWidth={2.2} />}
            tone="purple"
            value={fmtNum(summary.gifts_redeemed_total)}
            label="получили подарок"
          />
          <KpiTile
            icon={<Sparkles size={14} color="#059669" strokeWidth={2.2} />}
            tone="green"
            value={`${summary.gifts_avg_conversion.toFixed(1)}%`}
            label="активировали"
          />
          <KpiTile
            icon={<Coins size={14} color="#D97706" strokeWidth={2.2} />}
            tone="amber"
            value={fmtNum(summary.gifts_total_coins_spent)}
            label="баллов списано"
          />
        </View>
      )}

      {/* Воронка */}
      {summary && (
        <View style={[styles.funnel, { marginHorizontal: pad }]}>
          <Text style={styles.funnelTitle}>ВОРОНКА</Text>
          <FunnelBar
            label="Получили"
            value={summary.gifts_redeemed_total}
            max={summary.gifts_redeemed_total}
            tone="purple"
          />
          <FunnelBar
            label="Активировали"
            value={summary.gifts_activated_total}
            max={summary.gifts_redeemed_total}
            tone="green"
          />
          <FunnelBar
            label="Сгорело"
            value={summary.gifts_redeemed_total - summary.gifts_activated_total}
            max={summary.gifts_redeemed_total}
            tone="red"
          />
        </View>
      )}

      {/* Sec title */}
      <Text style={[styles.secTitle, { paddingHorizontal: pad }]}>ТОП ПОДАРКОВ</Text>

      {/* List */}
      <View style={{ paddingHorizontal: pad, gap: 10 }}>
        {gifts.map((g, idx) => (
          <GiftRow key={g.product_id} g={g} rank={idx + 1} maxRedeemed={maxRedeemed} />
        ))}
      </View>
    </View>
  );
};

const GiftRow: React.FC<{ g: GiftAnalytic; rank: number; maxRedeemed: number }> = ({ g, rank, maxRedeemed }) => {
  const conversionTone =
    g.conversion_rate >= 85 ? '#059669' :
    g.conversion_rate >= 70 ? '#D97706' :
    '#DC2626';
  const trendUp = g.trend_pct >= 0;
  const fillPct = Math.max(8, (g.redeemed_count / maxRedeemed) * 100);

  return (
    <View style={styles.row}>
      <View style={styles.rowHead}>
        <View style={styles.rowEmoji}>
          <Text style={styles.rowEmojiText}>{g.product_emoji ?? '🎁'}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.rowTitle} numberOfLines={1} ellipsizeMode="tail">
            {rank}. {g.product_name}
          </Text>
          <View style={styles.rowSubRow}>
            {g.category_name && <Text style={styles.rowSub}>{g.category_name}</Text>}
            {g.category_name && <View style={styles.rowSubDot} />}
            <Coins size={10} color={C.ink3} strokeWidth={2.2} />
            <Text style={styles.rowSub}>{g.price_coins}</Text>
          </View>
        </View>
        <View style={styles.trendPill}>
          {trendUp
            ? <TrendingUp size={11} color="#059669" strokeWidth={2.4} />
            : <TrendingDown size={11} color="#DC2626" strokeWidth={2.4} />
          }
          <Text style={[styles.trendText, { color: trendUp ? '#059669' : '#DC2626' }]}>
            {trendUp ? '+' : ''}{g.trend_pct.toFixed(1)}%
          </Text>
        </View>
      </View>

      {/* Bar */}
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${fillPct}%`, backgroundColor: '#9333EA' }]} />
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{fmtNum(g.redeemed_count)}</Text>
          <Text style={styles.statLbl}>получили</Text>
        </View>
        <View style={styles.statSep} />
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: '#059669' }]}>{fmtNum(g.activated_count)}</Text>
          <Text style={styles.statLbl}>активировали</Text>
        </View>
        <View style={styles.statSep} />
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: conversionTone }]}>{g.conversion_rate.toFixed(1)}%</Text>
          <Text style={styles.statLbl}>конверсия</Text>
        </View>
      </View>
    </View>
  );
};

// ────────────────────────────────────────────────────────────────────
// QUESTS TAB
// ────────────────────────────────────────────────────────────────────
const QuestsTab: React.FC<{
  summary: EngagementSummary | null;
  quests: QuestAnalytic[];
  pad: number;
}> = ({ summary, quests, pad }) => {
  const maxStarted = Math.max(1, ...quests.map(q => q.started_count));

  return (
    <View>
      {summary && (
        <View style={[styles.kpiGrid, { paddingHorizontal: pad }]}>
          <KpiTile
            icon={<Target size={14} color="#2563EB" strokeWidth={2.2} />}
            tone="blue"
            value={fmtNum(summary.quests_started_total)}
            label="приняли квест"
          />
          <KpiTile
            icon={<Trophy size={14} color="#059669" strokeWidth={2.2} />}
            tone="green"
            value={`${summary.quests_avg_completion.toFixed(1)}%`}
            label="завершили"
          />
          <KpiTile
            icon={<Clock size={14} color="#7C3AED" strokeWidth={2.2} />}
            tone="purple"
            value={`${(summary.quests_avg_completion_hours / 24).toFixed(1)}д`}
            label="ср. время"
          />
        </View>
      )}

      <Text style={[styles.secTitle, { paddingHorizontal: pad }]}>ТОП КВЕСТОВ</Text>

      <View style={{ paddingHorizontal: pad, gap: 10 }}>
        {quests.map((q, idx) => (
          <QuestRow key={q.quest_id} q={q} rank={idx + 1} maxStarted={maxStarted} />
        ))}
      </View>
    </View>
  );
};

const QuestRow: React.FC<{ q: QuestAnalytic; rank: number; maxStarted: number }> = ({ q, rank, maxStarted }) => {
  const compTone =
    q.completion_rate >= 60 ? '#059669' :
    q.completion_rate >= 40 ? '#D97706' :
    '#DC2626';
  const trendUp = q.trend_pct >= 0;
  const fillPct = Math.max(8, (q.started_count / maxStarted) * 100);
  const completedFillPct = (q.completed_count / Math.max(1, q.started_count)) * fillPct;

  return (
    <View style={styles.row}>
      <View style={styles.rowHead}>
        <View style={[styles.rowEmoji, { backgroundColor: q.is_active ? '#DBEAFE' : C.line }]}>
          <Trophy size={14} color={q.is_active ? '#2563EB' : C.ink3} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.rowTitle} numberOfLines={1} ellipsizeMode="tail">
            {rank}. {q.quest_name}
          </Text>
          <View style={styles.rowSubRow}>
            <Coins size={10} color={C.ink3} strokeWidth={2.2} />
            <Text style={styles.rowSub}>+{q.reward_coins}</Text>
            <View style={styles.rowSubDot} />
            <Clock size={10} color={C.ink3} strokeWidth={2.2} />
            <Text style={styles.rowSub}>~{(q.avg_completion_hours / 24).toFixed(1)}д</Text>
            {!q.is_active && (
              <>
                <View style={styles.rowSubDot} />
                <Text style={[styles.rowSub, { color: C.warn }]}>Выключен</Text>
              </>
            )}
          </View>
        </View>
        <View style={styles.trendPill}>
          {trendUp
            ? <TrendingUp size={11} color="#059669" strokeWidth={2.4} />
            : <TrendingDown size={11} color="#DC2626" strokeWidth={2.4} />
          }
          <Text style={[styles.trendText, { color: trendUp ? '#059669' : '#DC2626' }]}>
            {trendUp ? '+' : ''}{q.trend_pct.toFixed(1)}%
          </Text>
        </View>
      </View>

      {/* Stacked bar: started (blue, faded) + completed (green) */}
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${fillPct}%`, backgroundColor: '#BFDBFE' }]} />
        <View style={[styles.barFillOver, { width: `${completedFillPct}%`, backgroundColor: '#059669' }]} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{fmtNum(q.started_count)}</Text>
          <Text style={styles.statLbl}>приняли</Text>
        </View>
        <View style={styles.statSep} />
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: '#059669' }]}>{fmtNum(q.completed_count)}</Text>
          <Text style={styles.statLbl}>завершили</Text>
        </View>
        <View style={styles.statSep} />
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: compTone }]}>{q.completion_rate.toFixed(1)}%</Text>
          <Text style={styles.statLbl}>конверсия</Text>
        </View>
      </View>
    </View>
  );
};

// ────────────────────────────────────────────────────────────────────
// Common pieces
// ────────────────────────────────────────────────────────────────────
const KpiTile: React.FC<{
  icon: React.ReactNode;
  tone: 'purple' | 'green' | 'amber' | 'blue';
  value: string;
  label: string;
}> = ({ icon, tone, value, label }) => {
  const bg =
    tone === 'purple' ? '#F3E8FF' :
    tone === 'green'  ? '#D1FAE5' :
    tone === 'amber'  ? '#FEF3C7' :
                        '#DBEAFE';
  return (
    <View style={[styles.kpi, { backgroundColor: bg }]}>
      <View style={styles.kpiIcon}>{icon}</View>
      <Text style={styles.kpiValue} numberOfLines={1} ellipsizeMode="tail">{value}</Text>
      <Text style={styles.kpiLabel} numberOfLines={2}>{label}</Text>
    </View>
  );
};

const FunnelBar: React.FC<{
  label: string;
  value: number;
  max: number;
  tone: 'purple' | 'green' | 'red';
}> = ({ label, value, max, tone }) => {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  const color =
    tone === 'purple' ? '#9333EA' :
    tone === 'green'  ? '#059669' :
                        '#DC2626';
  return (
    <View style={styles.funnelRow}>
      <Text style={styles.funnelLbl}>{label}</Text>
      <View style={styles.funnelTrack}>
        <View style={[styles.funnelFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.funnelVal}>{fmtNum(value)}</Text>
    </View>
  );
};

// ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  periodRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    marginBottom: 4,
  },
  periodChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.line,
  },
  periodChipActive: {
    backgroundColor: C.ink,
    borderColor: C.ink,
  },
  periodChipText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: C.ink2,
  },
  periodChipTextActive: {
    color: C.surface,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    marginBottom: 14,
    backgroundColor: C.paper,
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: C.purple,
  },
  tabText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: C.ink2,
  },
  tabTextActive: {
    color: C.surface,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  kpi: {
    flex: 1,
    minWidth: 0,
    borderRadius: 14,
    padding: 11,
    gap: 4,
  },
  kpiIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
    color: C.ink,
  },
  kpiLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 10,
    color: C.ink2,
    lineHeight: 12,
  },
  funnel: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  funnelTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 1.1,
    color: C.ink3,
    marginBottom: 4,
  },
  funnelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  funnelLbl: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: C.ink2,
    width: 92,
  },
  funnelTrack: {
    flex: 1,
    minWidth: 0,
    height: 18,
    backgroundColor: C.paper,
    borderRadius: 999,
    overflow: 'hidden',
  },
  funnelFill: {
    height: '100%',
    borderRadius: 999,
  },
  funnelVal: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: C.ink,
    width: 46,
    textAlign: 'right',
  },
  secTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 1.2,
    color: C.ink3,
    marginTop: 4,
    marginBottom: 10,
  },
  row: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 14,
    padding: 12,
    gap: 9,
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowEmoji: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowEmojiText: {
    fontSize: 17,
  },
  rowTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: C.ink,
  },
  rowSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  rowSub: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: C.ink3,
  },
  rowSubDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: C.ink4,
    marginHorizontal: 2,
  },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: C.paper,
  },
  trendText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 0.2,
  },
  barTrack: {
    height: 6,
    backgroundColor: C.paper,
    borderRadius: 999,
    overflow: 'hidden',
    position: 'relative',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
  barFillOver: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: 999,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stat: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  statNum: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: C.ink,
  },
  statLbl: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 10,
    color: C.ink3,
    marginTop: 1,
  },
  statSep: {
    width: 1,
    height: 22,
    backgroundColor: C.line,
  },
});
