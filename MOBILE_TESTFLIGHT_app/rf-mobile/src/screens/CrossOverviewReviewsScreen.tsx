import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Star } from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple } from '../platform';
import { relativeTime } from '../helpers';
import { fetchCrossOverviewReviews } from '../api';
import { makeStyles } from '../styles';
import { Skeleton } from '../components/Skeleton';
import { Chip } from '../components/Common';
import { CrossReviewReplyScreen, type CrossReviewTarget } from './CrossReviewReplyScreen';
import type { DateRange } from '../components/DateRangeModal';
import type { CrossOverviewReview } from '../types';

const SENT_COLOR: Record<string, string> = { pos: C.good, neg: C.warn, neu: '#6b7280' };

const SENT_FILTERS: { code: string; label: string }[] = [
  { code: 'all',      label: 'Все' },
  { code: 'positive', label: 'Позитивные' },
  { code: 'neutral',  label: 'Нейтральные' },
  { code: 'negative', label: 'Негативные' },
];

// ════════════════════════════════════════════════════════════════════
// CROSS-OVERVIEW REVIEWS — «Все отзывы» по всем клиентам (superadmin)
// Зеркало /admin/overview/reviews/: фильтр по тональности + пагинация.
// ════════════════════════════════════════════════════════════════════
export const CrossOverviewReviewsScreen: React.FC<{
  onBack: () => void;
  period: string;
  customRange: DateRange | null;
}> = ({ onBack, period, customRange }) => {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);

  const [sentiment, setSentiment] = useState('all');
  const [items, setItems] = useState<CrossOverviewReview[]>([]);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [target, setTarget] = useState<CrossReviewTarget | null>(null);

  const periodArgs = customRange
    ? { start_date: customRange.start_date, end_date: customRange.end_date }
    : { period };

  const load = async (pageNum: number, replace: boolean) => {
    try {
      const res = await fetchCrossOverviewReviews({ ...periodArgs, sentiment, page: pageNum });
      setItems(prev => (replace ? res.results : [...prev, ...res.results]));
      setPage(res.page);
      setNumPages(res.num_pages);
      setTotal(res.total);
    } catch {} finally { setLoading(false); setLoadingMore(false); setRefreshing(false); }
  };

  // Смена фильтра/периода → грузим с 1-й страницы
  useEffect(() => { setLoading(true); load(1, true); /* eslint-disable-next-line */ }, [sentiment, period, customRange?.start_date, customRange?.end_date]);

  const onRefresh = () => { haptic('light'); setRefreshing(true); load(1, true); };
  const loadMore = () => { if (page < numPages && !loadingMore) { haptic('light'); setLoadingMore(true); load(page + 1, false); } };

  if (target) {
    return <CrossReviewReplyScreen target={target} onBack={() => setTarget(null)} />;
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="dark" />

      <View style={s.backHeader}>
        <Pressable style={s.backBtn} {...ripple()} onPress={onBack}>
          <ChevronLeft size={20} color={C.ink} strokeWidth={2.2} />
        </Pressable>
        <View style={s.screenTitleBlock}>
          <Text style={s.screenTitleSuper}>Платформа</Text>
          <Text style={s.screenTitleMain}>Все отзывы</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple} />}
      >
        {/* Sentiment filter */}
        <View style={s.filterBlock}>
          <Text style={s.filterLabel}>Тональность{customRange ? ` · ${customRange.display}` : ''}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
            {SENT_FILTERS.map(f => (
              <Chip key={f.code} active={sentiment === f.code} onPress={() => { haptic('light'); setSentiment(f.code); }} s={s}>
                {f.label}
              </Chip>
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <View style={{ paddingHorizontal: r.pad, gap: 8 }}>
            {[...Array(5)].map((_, i) => (
              <View key={i} style={{ backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.line, padding: 12 }}>
                <Skeleton w="40%" h={12} /><View style={{ height: 8 }} /><Skeleton w="90%" h={32} />
              </View>
            ))}
          </View>
        ) : items.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ color: C.ink3, fontSize: 14 }}>Отзывов за период нет</Text>
          </View>
        ) : (
          <>
            <Text style={{ fontSize: 12, color: C.ink3, paddingHorizontal: r.pad, marginBottom: 8 }}>Всего: {total}</Text>
            <View style={{ paddingHorizontal: r.pad, gap: 8 }}>
              {items.map((f, i) => (
                <ReviewRow key={`${f.conversation_id}_${i}`} f={f} onPress={() => { haptic('light'); setTarget(toTarget(f)); }} />
              ))}
            </View>

            {page < numPages && (
              <Pressable
                onPress={loadMore}
                style={{ marginHorizontal: r.pad, marginTop: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, alignItems: 'center' }}
                {...ripple()}
              >
                {loadingMore
                  ? <ActivityIndicator color={C.purple} />
                  : <Text style={{ color: C.purpleDeep, fontWeight: '700', fontSize: 14 }}>Показать ещё ({page}/{numPages})</Text>}
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const toTarget = (f: CrossOverviewReview): CrossReviewTarget => ({
  conversation_id: f.conversation_id, client: f.client, domain: f.domain,
  text: f.text, created_at: f.created_at,
  sentiment_label: f.sentiment_label, sentiment_class: f.sentiment_class, rating: f.rating,
  review_link_yandex: f.review_link_yandex, review_link_2gis: f.review_link_2gis,
});

const ReviewRow: React.FC<{ f: CrossOverviewReview; onPress: () => void }> = ({ f, onPress }) => {
  const color = SENT_COLOR[f.sentiment_class] || '#6b7280';
  return (
    <Pressable onPress={onPress} style={{ backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.line, padding: 12 }} {...ripple()}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: C.ink, flex: 1 }} numberOfLines={1}>{f.client}</Text>
        {f.rating ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginRight: 8 }}>
            <Star size={11} color={C.watch} fill={C.watch} strokeWidth={0} />
            <Text style={{ fontSize: 11, color: C.ink3, fontWeight: '700' }}>{f.rating}</Text>
          </View>
        ) : null}
        <View style={{ backgroundColor: color, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
          <Text style={{ color: '#fff', fontSize: 9.5, fontWeight: '700' }}>{f.sentiment_label}</Text>
        </View>
      </View>
      <Text style={{ fontSize: 13, color: C.ink2, lineHeight: 18 }}>{f.text}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 }}>
        <Text style={{ fontSize: 11, color: C.ink4 }}>{relativeTime(f.created_at)}</Text>
        <Text style={{ fontSize: 11, color: C.purpleDeep, fontWeight: '700' }}>Ответить →</Text>
      </View>
    </Pressable>
  );
};
