import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, RefreshControl, Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft, Star, TrendingUp, TrendingDown, Sparkles, AlertTriangle, ChevronRight,
} from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple } from '../platform';
import { fmtNum, computeBranchRatingsDetailed } from '../helpers';
import type { BranchRatingDetail } from '../helpers';
import { fetchBranches } from '../api';
import { makeStyles } from '../styles';
import { Skeleton } from '../components/Skeleton';
import type { Review } from '../types';
import type { S } from '../styles';

// ════════════════════════════════════════════════════════════════════
// BRANCH RATINGS — подробный рейтинг по точкам с рекомендациями
// ════════════════════════════════════════════════════════════════════
export const BranchRatingsScreen: React.FC<{
  reviews: Review[];
  onBack: () => void;
  onOpenReviews?: (sentiment?: 'NEGATIVE' | 'PARTIALLY_NEGATIVE') => void;
}> = ({ reviews, onBack, onOpenReviews }) => {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [details, setDetails] = useState<BranchRatingDetail[]>([]);

  const load = async () => {
    try {
      const br = await fetchBranches();
      setDetails(computeBranchRatingsDetailed(reviews, br));
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [reviews]);
  const onRefresh = () => { haptic('light'); setRefreshing(true); load(); };

  const overallAvg = details.length
    ? details.reduce((sum, d) => sum + d.avg_rating * d.reviews_count, 0) /
      details.reduce((sum, d) => sum + d.reviews_count, 0)
    : 0;
  const totalReviews = details.reduce((sum, d) => sum + d.reviews_count, 0);

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="dark" />

      <View style={s.backHeader}>
        <Pressable style={s.backBtn} {...ripple()} onPress={onBack}>
          <ChevronLeft size={20} color={C.ink} strokeWidth={2.2} />
        </Pressable>
        <View style={s.screenTitleBlock}>
          <Text style={s.screenTitleSuper}>Аналитика</Text>
          <Text style={s.screenTitleMain}>Рейтинг точек</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple} />}
      >
        {/* Hero — общая средняя */}
        {loading ? (
          <View style={[s.profileHero, { paddingVertical: 30 }]}>
            <Skeleton w={120} h={36} radius={6} />
            <View style={{ height: 8 }} />
            <Skeleton w={180} h={14} />
          </View>
        ) : details.length > 0 && (
          <View style={s.profileHero}>
            <Text style={[s.profileName, { fontSize: 56, lineHeight: 60, color: C.ink }]}>
              {overallAvg.toFixed(1)}
            </Text>
            <View style={{ flexDirection: 'row', gap: 3, marginBottom: 6 }}>
              {[1, 2, 3, 4, 5].map(i => (
                <Text
                  key={i}
                  style={{ fontSize: 22, color: i <= Math.round(overallAvg) ? '#F59E0B' : C.line }}
                >★</Text>
              ))}
            </View>
            <Text style={s.modalHintText}>
              Средняя оценка по сети · {fmtNum(totalReviews)} {plural(totalReviews, ['отзыв', 'отзыва', 'отзывов'])} из приложения
            </Text>
          </View>
        )}

        {/* Branches details */}
        {loading ? (
          <View style={{ paddingHorizontal: r.pad, gap: 12 }}>
            {[1, 2, 3].map(i => <Skeleton key={i} w="100%" h={180} radius={16} />)}
          </View>
        ) : details.length === 0 ? (
          <View style={s.emptyState}>
            <Star size={36} color={C.ink4} strokeWidth={1.5} />
            <Text style={s.emptyStateTitle}>Пока нет оценок</Text>
            <Text style={s.emptyStateSub}>Когда гости начнут оставлять оценки в приложении — здесь появится подробная разбивка по точкам.</Text>
          </View>
        ) : (
          details.map((d, idx) => (
            <BranchCard
              key={d.branch_id}
              detail={d}
              rank={idx + 1}
              total={details.length}
              s={s}
              onOpenNegatives={() => onOpenReviews?.('NEGATIVE')}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────
const BranchCard: React.FC<{
  detail: BranchRatingDetail;
  rank: number;
  total: number;
  s: S;
  onOpenNegatives: () => void;
}> = ({ detail, rank, total, s, onOpenNegatives }) => {
  const isWinner = rank === 1 && total > 1;
  const isLoser  = rank === total && total > 1 && detail.avg_rating < 4;

  const maxStarCount = Math.max(
    detail.stars_distribution[1], detail.stars_distribution[2],
    detail.stars_distribution[3], detail.stars_distribution[4],
    detail.stars_distribution[5],
  );
  const accentColor =
    detail.avg_rating >= 4.5 ? C.good :
    detail.avg_rating >= 4.0 ? C.limeDeep :
    detail.avg_rating >= 3.5 ? C.watch :
    C.warn;

  return (
    <View style={[s.tasksCard, { marginHorizontal: 20, marginBottom: 14 }]}>
      {/* Header */}
      <View style={[s.tasksHeadRow, { paddingBottom: 8 }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.tasksTitle} numberOfLines={1}>
            {isWinner && '🥇 '}
            {isLoser && '⚠️ '}
            {detail.branch_name}
          </Text>
          {detail.branch_address && (
            <Text style={[s.tasksCount, { textTransform: 'none', letterSpacing: 0, marginTop: 2 }]}>
              {detail.branch_address}
            </Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[s.gdAvatarText, { color: accentColor, fontSize: 32, lineHeight: 36 }]}>
            {detail.avg_rating.toFixed(1)}
          </Text>
          <Text style={[s.tasksCount, { fontSize: 10 }]}>
            {detail.reviews_count} оценок
          </Text>
        </View>
      </View>

      {/* Динамика */}
      <View style={[s.feedRow, { borderBottomWidth: 1, borderBottomColor: C.lineSoft, paddingHorizontal: 0 }]}>
        <View style={[s.feedIcon, { backgroundColor: detail.delta_avg_rating >= 0 ? C.goodSoft : C.warnSoft }]}>
          {detail.delta_avg_rating >= 0
            ? <TrendingUp size={14} color={C.good} strokeWidth={2.4} />
            : <TrendingDown size={14} color={C.warn} strokeWidth={2.4} />
          }
        </View>
        <View style={s.feedText}>
          <Text style={s.feedTitle}>
            {detail.delta_avg_rating >= 0 ? '+' : ''}{detail.delta_avg_rating.toFixed(1)} к прошлому периоду
          </Text>
          <Text style={s.feedSub}>
            {detail.delta_avg_rating >= 0.2 ? 'Уверенный рост' :
             detail.delta_avg_rating >= 0   ? 'Стабильно' :
             detail.delta_avg_rating >= -0.2 ? 'Незначительное снижение' : 'Падение — нужны действия'}
          </Text>
        </View>
      </View>

      {/* Распределение по звёздам */}
      <View style={{ paddingTop: 12 }}>
        <Text style={[s.formLabel, { paddingHorizontal: 0, marginBottom: 8 }]}>Распределение оценок</Text>
        {[5, 4, 3, 2, 1].map(stars => {
          const count = detail.stars_distribution[stars as 1 | 2 | 3 | 4 | 5];
          const pct = maxStarCount > 0 ? (count / maxStarCount) * 100 : 0;
          const totalPct = detail.reviews_count > 0 ? Math.round((count / detail.reviews_count) * 100) : 0;
          const barColor = stars >= 4 ? C.good : stars === 3 ? C.watch : C.warn;
          return (
            <View key={stars} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 12, color: C.ink2, width: 28 }}>
                {stars}★
              </Text>
              <View style={{ flex: 1, height: 8, backgroundColor: C.lineSoft, borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ width: `${pct}%`, height: '100%', backgroundColor: barColor }} />
              </View>
              <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 11, color: C.ink3, width: 50, textAlign: 'right' }}>
                {count} ({totalPct}%)
              </Text>
            </View>
          );
        })}
      </View>

      {/* Тональности */}
      <View style={{ paddingTop: 14 }}>
        <Text style={[s.formLabel, { paddingHorizontal: 0, marginBottom: 8 }]}>По тональностям (включая ВК)</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {detail.sentiment_breakdown.positive > 0 && (
            <SentChip color={C.good} label={`✓ ${detail.sentiment_breakdown.positive} позитивных`} s={s} />
          )}
          {detail.sentiment_breakdown.neutral > 0 && (
            <SentChip color={C.ink3} label={`${detail.sentiment_breakdown.neutral} нейтральных`} s={s} />
          )}
          {detail.sentiment_breakdown.partial > 0 && (
            <SentChip color={C.watch} label={`${detail.sentiment_breakdown.partial} частично`} s={s} />
          )}
          {detail.sentiment_breakdown.negative > 0 && (
            <SentChip color={C.warn} label={`${detail.sentiment_breakdown.negative} негативных`} s={s} />
          )}
        </View>
      </View>

      {/* Reply rate */}
      {(detail.sentiment_breakdown.negative + detail.sentiment_breakdown.partial) > 0 && (
        <View style={{ paddingTop: 14 }}>
          <Text style={[s.formLabel, { paddingHorizontal: 0, marginBottom: 6 }]}>Ответы на негатив</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1, height: 8, backgroundColor: C.warnSoft, borderRadius: 4, overflow: 'hidden' }}>
              <View style={{
                width: `${Math.round(detail.reply_rate * 100)}%`, height: '100%',
                backgroundColor: detail.reply_rate >= 0.8 ? C.good : detail.reply_rate >= 0.5 ? C.watch : C.warn,
              }} />
            </View>
            <Text style={{
              fontFamily: 'Manrope_800ExtraBold', fontSize: 13,
              color: detail.reply_rate >= 0.8 ? C.good : detail.reply_rate >= 0.5 ? C.watch : C.warn,
            }}>
              {Math.round(detail.reply_rate * 100)}%
            </Text>
          </View>
        </View>
      )}

      {/* Топ негативных */}
      {detail.top_negatives.length > 0 && (
        <View style={{ paddingTop: 14 }}>
          <Text style={[s.formLabel, { paddingHorizontal: 0, marginBottom: 8 }]}>Топ жалоб</Text>
          {detail.top_negatives.map((n, i) => (
            <View key={n.id} style={[s.feedRow, { borderBottomWidth: 0, paddingHorizontal: 0, paddingVertical: 6 }]}>
              <View style={[s.feedIcon, { backgroundColor: C.warnSoft }]}>
                <AlertTriangle size={12} color={C.warn} strokeWidth={2.4} />
              </View>
              <View style={s.feedText}>
                <Text style={s.feedSub} numberOfLines={3}>{n.ai_comment}</Text>
              </View>
              {n.rating != null && (
                <Text style={{ fontFamily: 'Manrope_800ExtraBold', fontSize: 12, color: C.warn }}>
                  {n.rating}★
                </Text>
              )}
            </View>
          ))}
          <Pressable
            style={{ paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}
            {...ripple()}
            onPress={onOpenNegatives}
          >
            <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 12, color: C.purpleDeep }}>
              Все негативные →
            </Text>
          </Pressable>
        </View>
      )}

      {/* AI Recommendation */}
      <View style={[s.modalHint, { marginHorizontal: 0, marginTop: 14, marginBottom: 4 }]}>
        <View style={s.modalHintHeader}>
          <Sparkles size={11} color={C.hintInk} strokeWidth={2.4} />
          <Text style={s.modalHintTitle}>Рекомендация</Text>
        </View>
        <Text style={s.modalHintText}>{detail.ai_recommendation}</Text>
      </View>
    </View>
  );
};

const SentChip: React.FC<{ color: string; label: string; s: S }> = ({ color, label, s }) => (
  <View style={[s.listMetaPill, { backgroundColor: color + '20', borderColor: color + '40' }]}>
    <Text style={[s.listMetaText, { color }]}>{label}</Text>
  </View>
);

function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}
