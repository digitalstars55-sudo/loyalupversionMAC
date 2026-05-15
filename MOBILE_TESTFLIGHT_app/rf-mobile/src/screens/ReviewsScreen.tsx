import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, FlatList, ScrollView, RefreshControl, Alert, TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Star, Search, X, SlidersHorizontal, CheckSquare, Square, Archive, Check } from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple } from '../platform';
import {
  fmtNum, sentimentMeta, avatarColor, initials, relativeTime,
} from '../helpers';
import { fetchReviews, markReviewResolved } from '../api';
import { makeStyles } from '../styles';
import type { Review, Sentiment } from '../types';
import type { S } from '../styles';
import { ReviewDetailModal } from '../components/ReviewDetailModal';
import { SkeletonCard } from '../components/Skeleton';
import {
  ReviewsFilterSheet, DEFAULT_FILTERS, activeFilterCount,
  type ReviewsFilters,
} from '../components/ReviewsFilterSheet';
import { DateRangeModal, type DateRange } from '../components/DateRangeModal';
import { Calendar } from 'lucide-react-native';

// ════════════════════════════════════════════════════════════════════
// REVIEWS SCREEN — лента отзывов с мульти-фильтрами и сортировкой
// ════════════════════════════════════════════════════════════════════

// Быстрые «pre-set» чипы — частые комбинации фильтров одной кнопкой
type QuickPreset = 'all' | 'urgent' | 'unanswered' | 'replied' | 'drafts' | 'positive';

const QUICK_PRESETS: { key: QuickPreset; label: string; emoji?: string }[] = [
  { key: 'all',         label: 'Все' },
  { key: 'urgent',      label: 'Срочно',     emoji: '🔥' },
  { key: 'unanswered',  label: 'Не отвечено' },
  { key: 'positive',    label: 'Позитив',    emoji: '👍' },
  { key: 'drafts',      label: 'Черновики',  emoji: '🤖' },
  { key: 'replied',     label: 'Отвечено',   emoji: '✅' },
];

function presetFilters(p: QuickPreset): ReviewsFilters {
  if (p === 'urgent')     return { ...DEFAULT_FILTERS, sentiments: ['NEGATIVE', 'PARTIALLY_NEGATIVE'], status: 'unanswered' };
  if (p === 'unanswered') return { ...DEFAULT_FILTERS, status: 'unanswered' };
  if (p === 'replied')    return { ...DEFAULT_FILTERS, status: 'replied' };
  if (p === 'drafts')     return { ...DEFAULT_FILTERS, status: 'draft' };
  if (p === 'positive')   return { ...DEFAULT_FILTERS, sentiments: ['POSITIVE'], status: 'unanswered' };
  return DEFAULT_FILTERS;
}

function presetMatches(p: QuickPreset, f: ReviewsFilters): boolean {
  return JSON.stringify(presetFilters(p)) === JSON.stringify(f);
}

export const ReviewsScreen: React.FC<{
  reviews: Review[];
  setReviews: (r: Review[] | ((prev: Review[]) => Review[])) => void;
  autoOpenReviewId?: number | null;
  onAutoOpenConsumed?: () => void;
  presetFilter?: QuickPreset | null;
  onPresetConsumed?: () => void;
}> = ({ reviews, setReviews, autoOpenReviewId, onAutoOpenConsumed, presetFilter, onPresetConsumed }) => {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);

  const [filters, setFilters] = useState<ReviewsFilters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Review | null>(null);
  const [periodDays, setPeriodDays] = useState<number | 'all'>('all');
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [branchId, setBranchId] = useState<number | 'all'>('all');

  // Bulk-режим: выбрали несколько отзывов — массовые операции
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await fetchReviews(periodDays === 'all' ? {} : { period_days: periodDays });
      setReviews(list);
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message ?? 'Не удалось загрузить отзывы');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setReviews, periodDays]);

  // Всегда тянем реальные отзывы при открытии экрана. Раньше guard
  // `if (reviews.length === 0)` блокировал загрузку, т.к. App.tsx сеял
  // MOCK_REVIEWS (непустой) → экран залипал на фейке (тот же баг, что
  // был с чатом). Экран открывается уже после логина → авторизация ОК.
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Перезагрузка при смене периода
  useEffect(() => {
    if (loading) return;
    setLoading(true); load();
  }, [periodDays]); // eslint-disable-line react-hooks/exhaustive-deps

  // Применение пресета из вне (с Home: «негатив», «позитив», «черновики»)
  useEffect(() => {
    if (!presetFilter) return;
    setFilters(presetFilters(presetFilter));
    setSearch('');
    setBranchId('all');
    setCustomRange(null);
    onPresetConsumed?.();
  }, [presetFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Deep-link
  useEffect(() => {
    if (!autoOpenReviewId) return;
    const target = reviews.find(rev => rev.id === autoOpenReviewId);
    if (target) {
      setActive(target);
      if (target.has_unread) {
        setReviews(prev => prev.map(x => x.id === target.id ? { ...x, has_unread: false } : x));
      }
    }
    onAutoOpenConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenReviewId, reviews]);

  const onRefresh = () => { haptic('light'); setRefreshing(true); load(); };

  // Уникальные точки из загруженных отзывов — для чипов
  const branchOptions = useMemo(() => {
    const map = new Map<number, string>();
    reviews.forEach(rev => {
      if (rev.branch_id) map.set(rev.branch_id, rev.branch_name || `Точка #${rev.branch_id}`);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[1].localeCompare(b[1], 'ru'))
      .map(([id, name]) => ({ id, name }));
  }, [reviews]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    // Граничные timestamp'ы для custom range (если задан)
    let rangeStart = 0, rangeEnd = Number.POSITIVE_INFINITY;
    if (customRange) {
      rangeStart = new Date(customRange.start_date + 'T00:00:00').getTime();
      rangeEnd   = new Date(customRange.end_date   + 'T23:59:59').getTime();
    }

    const matches = (rev: Review): boolean => {
      // custom date range
      if (customRange) {
        const ts = new Date(rev.last_message_at).getTime();
        if (ts < rangeStart || ts > rangeEnd) return false;
      }
      // branch (отдельный чипс-фильтр)
      if (branchId !== 'all' && rev.branch_id !== branchId) return false;
      // sentiment (мульти)
      if (filters.sentiments.length > 0 && !filters.sentiments.includes(rev.sentiment)) return false;
      // status
      if (filters.status === 'unanswered' && rev.is_replied) return false;
      if (filters.status === 'replied'    && !rev.is_replied) return false;
      if (filters.status === 'draft'      && (!rev.has_draft || rev.is_replied)) return false;
      if (filters.status === 'unread'     && !rev.has_unread) return false;
      // source
      if (filters.source !== 'any' && rev.source !== filters.source) return false;
      // search
      if (q) {
        return rev.customer_name.toLowerCase().includes(q) ||
               rev.text.toLowerCase().includes(q) ||
               rev.branch_name.toLowerCase().includes(q);
      }
      return true;
    };

    const list = reviews.filter(matches);

    const severity: Record<Sentiment, number> = {
      NEGATIVE: 0, PARTIALLY_NEGATIVE: 1, SPAM: 2, NEUTRAL: 3, PENDING: 4, POSITIVE: 5,
    };
    const t = (iso: string) => new Date(iso).getTime();

    if (filters.sort === 'time_desc') {
      return [...list].sort((a, b) => t(b.last_message_at) - t(a.last_message_at));
    }
    if (filters.sort === 'time_asc') {
      return [...list].sort((a, b) => t(a.last_message_at) - t(b.last_message_at));
    }
    if (filters.sort === 'severity') {
      return [...list].sort((a, b) =>
        (severity[a.sentiment] - severity[b.sentiment]) ||
        (t(b.last_message_at) - t(a.last_message_at))
      );
    }
    if (filters.sort === 'rating_desc' || filters.sort === 'rating_asc') {
      const dir = filters.sort === 'rating_desc' ? -1 : 1;
      return [...list].sort((a, b) => {
        const ra = a.rating ?? -1;
        const rb = b.rating ?? -1;
        if (ra !== rb) return (rb - ra) * dir;
        return t(b.last_message_at) - t(a.last_message_at);
      });
    }
    return list;
  }, [reviews, filters, search, branchId, customRange]);

  // «Ждут ответа» = только негатив без ответа (то что реально требует реакции).
  // Не считаем позитив/нейтрал/спам — на них отвечать не обязательно.
  // Учитываем выбранную точку.
  const pendingCount = useMemo(() => {
    const inBranch = (rev: Review) =>
      branchId === 'all' ? true : rev.branch_id === branchId;
    return reviews.filter(rev =>
      inBranch(rev) &&
      !rev.is_replied &&
      (rev.sentiment === 'NEGATIVE' || rev.sentiment === 'PARTIALLY_NEGATIVE')
    ).length;
  }, [reviews, branchId]);

  const sentimentCounts = useMemo(() => {
    const out: Record<Sentiment, number> = {
      POSITIVE: 0, NEGATIVE: 0, PARTIALLY_NEGATIVE: 0, NEUTRAL: 0, SPAM: 0, PENDING: 0,
    };
    const inBranch = (rev: Review) =>
      branchId === 'all' ? true : rev.branch_id === branchId;
    reviews.filter(inBranch).forEach(rev => { out[rev.sentiment]++; });
    return out;
  }, [reviews, branchId]);

  const totalCount = useMemo(() => {
    return branchId === 'all' ? reviews.length : reviews.filter(r => r.branch_id === branchId).length;
  }, [reviews, branchId]);

  const onCardPress = useCallback((rev: Review) => {
    haptic('light');
    if (selectionMode) {
      // В режиме выбора — тоггл выбора
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(rev.id)) next.delete(rev.id); else next.add(rev.id);
        return next;
      });
      return;
    }
    setActive(rev);
    if (rev.has_unread) {
      setReviews(prev => prev.map(x => x.id === rev.id ? { ...x, has_unread: false } : x));
    }
  }, [setReviews, selectionMode]);

  const onCardLongPress = useCallback((rev: Review) => {
    haptic('medium');
    setSelectionMode(true);
    setSelectedIds(prev => new Set([...prev, rev.id]));
  }, []);

  const exitSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const selectAll = useCallback(() => {
    haptic('light');
    setSelectedIds(new Set(filtered.map(rev => rev.id)));
  }, []); // filtered defined below — bind in closure on every render

  const onBulkResolve = async () => {
    haptic('warning');
    Alert.alert(
      `Закрыть ${selectedIds.size} ${plural(selectedIds.size, ['отзыв', 'отзыва', 'отзывов'])}?`,
      'Будут отмечены как решённые. Гости не получат сообщений (для VK + негатив без ответа закрытие запрещено и они не попадут).',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Закрыть', style: 'default',
          onPress: async () => {
            setBulkProcessing(true);
            const ids = [...selectedIds];
            const failed: number[] = [];
            for (const id of ids) {
              const rev = reviews.find(x => x.id === id);
              if (!rev) continue;
              const isNeg = rev.sentiment === 'NEGATIVE' || rev.sentiment === 'PARTIALLY_NEGATIVE';
              const blocked = rev.source === 'VK_MESSAGE' && !rev.is_replied && isNeg;
              if (blocked) { failed.push(id); continue; }
              try {
                await markReviewResolved({ review_id: id });
                setReviews(prev => prev.map(x => x.id === id ? { ...x, is_replied: true, has_unread: false } : x));
              } catch { failed.push(id); }
            }
            setBulkProcessing(false);
            haptic('success');
            exitSelection();
            if (failed.length > 0) {
              Alert.alert('Готово с предупреждением', `Закрыто ${ids.length - failed.length} из ${ids.length}. ${failed.length} негативных отзывов нельзя закрыть без ответа — обработайте их вручную.`);
            }
          },
        },
      ],
    );
  };

  const onBulkMarkRead = () => {
    haptic('light');
    setReviews(prev => prev.map(x => selectedIds.has(x.id) ? { ...x, has_unread: false } : x));
    haptic('success');
    exitSelection();
  };

  const onUpdateActive = useCallback((updated: Review) => {
    setReviews(prev => prev.map(x => x.id === updated.id ? updated : x));
    setActive(updated);
  }, [setReviews]);

  const filtersBadge = activeFilterCount(filters);

  if (loading) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <StatusBar style="dark" />
        <View style={s.screenHeader}>
          <View style={s.screenTitleBlock}>
            <Text style={s.screenTitleSuper}>Обратная связь</Text>
            <Text style={s.screenTitleMain}>Отзывы</Text>
          </View>
        </View>
        <View style={{ paddingHorizontal: r.pad, gap: 10 }}>
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="dark" />

      <FlatList
        data={filtered}
        keyExtractor={(it) => String(it.id)}
        contentContainerStyle={s.rvList}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple} />}
        ListHeaderComponent={
          <View>
            <View style={s.screenHeader}>
              <View style={s.screenTitleBlock}>
                <Text style={s.screenTitleSuper}>Обратная связь</Text>
                <Text style={s.screenTitleMain}>Отзывы</Text>
              </View>
              <Pressable
                style={[s.backBtn, filtersBadge > 0 && { backgroundColor: C.purple, borderColor: C.purple }]}
                {...ripple()}
                onPress={() => { haptic('light'); setFilterOpen(true); }}
                accessibilityLabel="Фильтры"
              >
                <SlidersHorizontal size={18} color={filtersBadge > 0 ? C.surface : C.ink} strokeWidth={2.2} />
                {filtersBadge > 0 && (
                  <View style={{
                    position: 'absolute', top: -4, right: -4,
                    minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
                    backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center',
                    borderWidth: 2, borderColor: C.surface,
                  }}>
                    <Text style={{ fontFamily: 'Manrope_800ExtraBold', fontSize: 9, color: C.ink }}>
                      {filtersBadge}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>

            <SummaryStrip total={totalCount} pending={pendingCount} counts={sentimentCounts} s={s} />

            <View style={s.searchWrap}>
              <Search size={16} color={C.ink4} strokeWidth={2} />
              <TextInput
                style={s.searchInput}
                placeholder="Поиск по имени, тексту или точке"
                placeholderTextColor={C.ink4}
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {search.length > 0 && (
                <Pressable style={s.searchClear} onPress={() => setSearch('')}>
                  <X size={12} color={C.ink2} strokeWidth={2.4} />
                </Pressable>
              )}
            </View>

            {/* Quick preset chips */}
            <ScrollView
              horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.rvFiltersRow}
              style={s.rvFilters}
            >
              {QUICK_PRESETS.map(qp => {
                const isActive = presetMatches(qp.key, filters);
                return (
                  <Pressable
                    key={qp.key}
                    style={[s.filterChip, isActive && s.filterChipActive]}
                    {...ripple()}
                    onPress={() => { haptic('light'); setFilters(presetFilters(qp.key)); }}
                  >
                    {qp.emoji && <Text style={{ fontSize: 12 }}>{qp.emoji}</Text>}
                    <Text style={[s.filterChipText, isActive && s.filterChipTextActive]}>{qp.label}</Text>
                  </Pressable>
                );
              })}
              <View style={{ position: 'relative' }}>
                <Pressable
                  style={[s.filterChip, { borderColor: C.purpleLine, backgroundColor: C.purpleSoft }]}
                  {...ripple()}
                  onPress={() => { haptic('light'); setFilterOpen(true); }}
                >
                  <SlidersHorizontal size={12} color={C.purpleDeep} strokeWidth={2.4} />
                  <Text style={[s.filterChipText, { color: C.purpleDeep }]}>Ещё фильтры</Text>
                </Pressable>
                {filtersBadge > 0 && (
                  <View style={{
                    position: 'absolute', top: -6, right: -6,
                    minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5,
                    backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center',
                    borderWidth: 2, borderColor: C.surface,
                  }}>
                    <Text style={{ fontFamily: 'Manrope_800ExtraBold', fontSize: 10, color: C.surface }}>
                      {filtersBadge}
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Период */}
            <ScrollView
              horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.rvFiltersRow}
              style={s.rvFilters}
            >
              {[
                { key: 7   as const, label: '7 дн.'  },
                { key: 30  as const, label: '30 дн.' },
                { key: 90  as const, label: '90 дн.' },
                { key: 'all' as const, label: 'Всё'  },
              ].map(opt => {
                const isActive = !customRange && periodDays === opt.key;
                return (
                  <Pressable
                    key={String(opt.key)}
                    style={[s.filterChip, isActive && s.filterChipActive]}
                    {...ripple()}
                    onPress={() => {
                      haptic('light');
                      setCustomRange(null);
                      setPeriodDays(opt.key);
                    }}
                  >
                    <Text style={[s.filterChipText, isActive && s.filterChipTextActive]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
              <Pressable
                style={[s.filterChip, customRange && s.filterChipActive]}
                {...ripple()}
                onPress={() => { haptic('light'); setDateRangeOpen(true); }}
              >
                <Calendar size={12} color={customRange ? C.surface : C.ink2} strokeWidth={2.4} />
                <Text style={[s.filterChipText, customRange && s.filterChipTextActive]}>
                  {customRange ? customRange.display : 'Свой период'}
                </Text>
                {customRange && (
                  <Pressable
                    onPress={(e) => { e.stopPropagation(); setCustomRange(null); }}
                    hitSlop={8}
                    style={{ marginLeft: 4 }}
                  >
                    <X size={12} color={C.surface} strokeWidth={2.6} />
                  </Pressable>
                )}
              </Pressable>
            </ScrollView>

            {/* Точки */}
            {branchOptions.length > 1 && (
              <ScrollView
                horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.rvFiltersRow}
                style={s.rvFilters}
              >
                <Pressable
                  style={[s.filterChip, branchId === 'all' && s.filterChipActive]}
                  {...ripple()}
                  onPress={() => { haptic('light'); setBranchId('all'); }}
                >
                  <Text style={[s.filterChipText, branchId === 'all' && s.filterChipTextActive]}>
                    Все точки
                  </Text>
                </Pressable>
                {branchOptions.map(b => {
                  const isActive = branchId === b.id;
                  return (
                    <Pressable
                      key={b.id}
                      style={[s.filterChip, isActive && s.filterChipActive]}
                      {...ripple()}
                      onPress={() => { haptic('light'); setBranchId(b.id); }}
                    >
                      <Text style={[s.filterChipText, isActive && s.filterChipTextActive]} numberOfLines={1}>
                        {b.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {/* Текущая сортировка — компактная подпись над списком */}
            {filtered.length > 0 && (
              <Text style={[s.sortBarLabel, { paddingHorizontal: r.pad, marginBottom: 8 }]}>
                {filtered.length} {plural(filtered.length, ['отзыв', 'отзыва', 'отзывов'])} · {sortLabel(filters.sort)}
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={s.emptyState}>
            <Star size={36} color={C.ink4} strokeWidth={1.5} />
            <Text style={s.emptyStateTitle}>
              {search || filtersBadge > 0 ? 'Ничего не найдено' : 'Пока нет отзывов'}
            </Text>
            {(search || filtersBadge > 0) && (
              <>
                <Text style={s.emptyStateSub}>Попробуйте другой запрос или сбросьте фильтры.</Text>
                <Pressable
                  style={[s.btn, s.btnSecondary, { paddingHorizontal: 18, marginTop: 8 }]}
                  {...ripple()}
                  onPress={() => { setSearch(''); setFilters(DEFAULT_FILTERS); }}
                >
                  <Text style={s.btnSecondaryText}>Сбросить всё</Text>
                </Pressable>
              </>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <ReviewCard
            rev={item}
            onPress={() => onCardPress(item)}
            onLongPress={() => onCardLongPress(item)}
            selectionMode={selectionMode}
            selected={selectedIds.has(item.id)}
            s={s}
          />
        )}
      />

      {/* Bulk action bar — снизу когда выбрано хотя бы одно */}
      {selectionMode && (
        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.line,
          paddingHorizontal: r.pad, paddingTop: 12, paddingBottom: 24,
          flexDirection: 'row', alignItems: 'center', gap: 8,
          zIndex: 50,
        }}>
          <Pressable
            style={[s.btn, s.btnSecondary, { flex: 0, paddingHorizontal: 14 }]}
            {...ripple()}
            onPress={() => { haptic('light'); exitSelection(); }}
          >
            <X size={14} color={C.ink} strokeWidth={2.4} />
          </Pressable>
          <Text style={{
            flex: 1, fontFamily: 'Manrope_800ExtraBold', fontSize: 14,
            color: C.ink, letterSpacing: -0.2,
          }}>
            Выбрано: {selectedIds.size}
          </Text>
          <Pressable
            style={[s.btn, s.btnSecondary, { flex: 0, paddingHorizontal: 12 }]}
            {...ripple()}
            onPress={selectAll}
          >
            <Text style={[s.btnSecondaryText, { fontSize: 12 }]}>Все</Text>
          </Pressable>
          <Pressable
            style={[s.btn, s.btnSecondary, { flex: 0, paddingHorizontal: 12 }, selectedIds.size === 0 && { opacity: 0.4 }]}
            {...ripple()}
            onPress={onBulkMarkRead}
            disabled={selectedIds.size === 0 || bulkProcessing}
          >
            <Check size={14} color={C.ink} strokeWidth={2.4} />
            <Text style={[s.btnSecondaryText, { fontSize: 12 }]}>Прочитать</Text>
          </Pressable>
          <Pressable
            style={[s.btn, s.btnPrimary, { flex: 0, paddingHorizontal: 12 }, selectedIds.size === 0 && { opacity: 0.4 }]}
            {...ripple('rgba(255,255,255,0.22)')}
            onPress={onBulkResolve}
            disabled={selectedIds.size === 0 || bulkProcessing}
          >
            <Archive size={14} color={C.surface} strokeWidth={2.4} />
            <Text style={[s.btnPrimaryText, { fontSize: 12 }]}>Закрыть</Text>
          </Pressable>
        </View>
      )}

      <ReviewDetailModal
        visible={active !== null}
        review={active}
        onClose={() => setActive(null)}
        onUpdate={onUpdateActive}
        s={s} r={r}
      />

      <ReviewsFilterSheet
        visible={filterOpen}
        filters={filters}
        onClose={() => setFilterOpen(false)}
        onApply={(f) => { setFilters(f); setFilterOpen(false); }}
        s={s}
      />

      <DateRangeModal
        visible={dateRangeOpen}
        initial={customRange ? { start_date: customRange.start_date, end_date: customRange.end_date } : undefined}
        onClose={() => setDateRangeOpen(false)}
        onApply={(range) => {
          setCustomRange(range);
          setDateRangeOpen(false);
        }}
        s={s}
      />
    </SafeAreaView>
  );
};

function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

function sortLabel(s: ReviewsFilters['sort']): string {
  switch (s) {
    case 'time_desc':   return 'сначала новые';
    case 'time_asc':    return 'сначала старые';
    case 'severity':    return 'сначала важные';
    case 'rating_desc': return 'высокие оценки сверху';
    case 'rating_asc':  return 'низкие оценки сверху';
  }
}

// ════════════════════════════════════════════════════════════════════
// Summary strip — крупная цифра + полоска тональностей
// ════════════════════════════════════════════════════════════════════
const SummaryStrip: React.FC<{
  total: number;
  pending: number;
  counts: Record<Sentiment, number>;
  s: S;
}> = ({ total, pending, counts, s }) => {
  type SegRow = { key: Sentiment; label: string; color: string; count: number };
  const segments: SegRow[] = ([
    { key: 'POSITIVE',           label: 'Позитив',  color: C.good,   count: counts.POSITIVE },
    { key: 'NEUTRAL',            label: 'Нейтрал',  color: C.ink3,   count: counts.NEUTRAL },
    { key: 'PARTIALLY_NEGATIVE', label: 'Частично', color: C.watch,  count: counts.PARTIALLY_NEGATIVE },
    { key: 'NEGATIVE',           label: 'Негатив',  color: C.warn,   count: counts.NEGATIVE },
    { key: 'PENDING',            label: 'В работе', color: C.purple, count: counts.PENDING },
  ] as SegRow[]).filter(seg => seg.count > 0);

  return (
    <View style={s.rvSummary}>
      <View style={s.rvSummaryHeadRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.rvSummaryNum} numberOfLines={1} adjustsFontSizeToFit>{fmtNum(pending)}</Text>
          <Text style={s.rvSummaryMeta}>{pending === 1 ? 'негативный отзыв без ответа' : 'негативных отзывов без ответа'}</Text>
        </View>
        <Text style={s.rvSummaryLbl}>{`Всего\n${fmtNum(total)}`}</Text>
      </View>

      <View style={s.rvSummaryBarWrap}>
        {segments.map(seg => (
          <View
            key={seg.key}
            style={[s.rvSummaryBar, { flex: seg.count, backgroundColor: seg.color }]}
          />
        ))}
      </View>

      <View style={s.rvSummaryLegend}>
        {segments.map(seg => (
          <View key={seg.key} style={s.rvSummaryLegendItem}>
            <View style={[s.rvSummaryLegendDot, { backgroundColor: seg.color }]} />
            <Text style={s.rvSummaryLegendText}>{seg.label}</Text>
            <Text style={s.rvSummaryLegendCount}>{seg.count}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// ════════════════════════════════════════════════════════════════════
// Review card
// ════════════════════════════════════════════════════════════════════
const ReviewCard: React.FC<{
  rev: Review;
  onPress: () => void;
  onLongPress?: () => void;
  selectionMode?: boolean;
  selected?: boolean;
  s: S;
}> = ({ rev, onPress, onLongPress, selectionMode, selected, s }) => {
  const meta = sentimentMeta(rev.sentiment);
  const unread = rev.has_unread && !rev.is_replied;

  return (
    <Pressable
      style={[
        s.rvCard,
        unread && s.rvCardUnread,
        selected && { borderColor: C.purple, borderWidth: 2, backgroundColor: C.purpleSoft },
      ]}
      {...ripple()}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
    >
      {/* Чекбокс в режиме выбора */}
      {selectionMode && (
        <View style={{
          width: 24, height: 24, borderRadius: 7,
          borderWidth: 2, borderColor: selected ? C.purple : C.line,
          backgroundColor: selected ? C.purple : 'transparent',
          alignItems: 'center', justifyContent: 'center', marginRight: 4,
        }}>
          {selected && (
            <Text style={{ color: C.surface, fontFamily: 'Manrope_800ExtraBold', fontSize: 14 }}>✓</Text>
          )}
        </View>
      )}
      <View style={[s.rvAvatar, { backgroundColor: avatarColor(rev.customer_name) }]}>
        <Text style={s.rvAvatarText}>{initials(rev.customer_name)}</Text>
      </View>
      <View style={s.rvCardBody}>
        <View style={s.rvCardHead}>
          <Text style={s.rvCardName} numberOfLines={1} ellipsizeMode="tail">{rev.customer_name}</Text>
          <Text style={s.rvCardTime}>{relativeTime(rev.last_message_at)}</Text>
        </View>

        <View style={s.rvCardMetaRow}>
          <View style={[s.rvCardSentiment, { backgroundColor: meta.bg }]}>
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: meta.color }} />
            <Text style={[s.rvCardSentimentText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <Text style={s.rvCardBranch}>{rev.branch_name}</Text>
          {rev.source === 'APP' && rev.rating != null && (
            <View style={s.rvCardStarsRow}>
              {[1, 2, 3, 4, 5].map(i => (
                <Text key={i} style={[s.rvCardStar, { color: i <= (rev.rating ?? 0) ? '#F59E0B' : C.line }]}>★</Text>
              ))}
            </View>
          )}
        </View>

        <Text style={s.rvCardText} numberOfLines={2}>{rev.text}</Text>
        {rev.has_draft && !rev.is_replied ? (
          <View style={s.rvCardDraft}>
            <Text style={{ fontSize: 11 }}>🤖</Text>
            <Text style={s.rvCardDraftText}>AI-черновик готов</Text>
          </View>
        ) : rev.ai_comment ? (
          <Text style={s.rvCardAi} numberOfLines={1} ellipsizeMode="tail">🤖 {rev.ai_comment}</Text>
        ) : null}

        {/* Presence — другой сотрудник сейчас работает с отзывом */}
        {rev.presence && rev.presence.length > 0 && (
          <View style={s.presencePill}>
            <View style={s.presenceDot} />
            <Text style={s.presencePillText} numberOfLines={1}>
              {rev.presence[0].staff_name.split(' ')[0]} {rev.presence[0].state === 'typing' ? 'печатает ответ…' : 'смотрит'}
            </Text>
          </View>
        )}

        {rev.is_replied && <Text style={s.rvCardStatusOk}>✓ ОТВЕЧЕНО</Text>}
      </View>
    </Pressable>
  );
};
