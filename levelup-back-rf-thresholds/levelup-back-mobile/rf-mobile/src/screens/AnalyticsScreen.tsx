import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, Alert, ActivityIndicator,
  Animated, Easing,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Menu, Bell, ArrowUp, RefreshCw, SlidersHorizontal,
  Store, Bike, ChevronRight,
  BookOpen, LayoutGrid, LayoutList,
} from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple } from '../platform';
import { fmtNum, segmentPriority, cellEdgeColor, computeBranchRatings } from '../helpers';
import { fetchRFMatrix, recalculateRF, fetchGuests } from '../api';
import { SEG, FILTER_CHIPS, PERIODS, inFilter, MOCK_REVIEWS } from '../mocks';
import { makeStyles } from '../styles';
import type { Mode, RFMatrixResponse, Guest, FilterChipKey } from '../types';

import { Chip, SegBtn, KPI } from '../components/Common';
import { Cell } from '../components/Cell';
import { BentoSection } from '../components/Bento';
import { DetailCard } from '../components/DetailCard';
import { LegendSheet } from '../components/LegendSheet';
import { BroadcastModal } from '../components/BroadcastModal';
import { GuestListModal } from '../components/GuestListModal';
import { DateRangeModal, type DateRange } from '../components/DateRangeModal';
import { MigrationsModal } from '../components/MigrationsModal';
import { Skeleton, SkeletonCard } from '../components/Skeleton';

// ════════════════════════════════════════════════════════════════════
// ANALYTICS SCREEN — главный экран RF-аналитики
// ════════════════════════════════════════════════════════════════════
export function AnalyticsScreen({
  onOpenBranchRatings,
  onOpenThresholds,
  onOpenMenu,
  onOpenNotifications,
}: {
  onOpenBranchRatings?: () => void;
  onOpenThresholds?: () => void;
  onOpenMenu?: () => void;
  onOpenNotifications?: () => void;
} = {}) {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);

  const [mode, setMode] = useState<Mode>('restaurant');
  const [periodDays, setPeriodDays] = useState<number>(30);
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [branchId, setBranchId] = useState(0);
  const [data, setData] = useState<RFMatrixResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [selectedKey, setSelectedKey] = useState('3_3');

  // Spin animation для FAB во время recalculating
  const spinAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (recalculating) {
      spinAnim.setValue(0);
      const loop = Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })
      );
      loop.start();
      return () => { loop.stop(); };
    }
  }, [recalculating, spinAnim]);
  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const [viewMode, setViewMode] = useState<'bento' | 'matrix'>('bento');
  const [filterChip, setFilterChip] = useState<FilterChipKey>('all');

  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [migrationsOpen, setMigrationsOpen] = useState(false);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [guestsLoading, setGuestsLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchRFMatrix({
        mode,
        branch_ids: branchId === 0 ? [] : [branchId],
        ...(customRange
          ? { start_date: customRange.start_date, end_date: customRange.end_date }
          : { trend_days: periodDays }),
      });
      setData(res);
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message ?? 'Не удалось загрузить аналитику');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mode, branchId, periodDays, customRange]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { haptic('light'); setRefreshing(true); load(); };

  const onRecalculate = () => {
    haptic('medium');
    Alert.alert(
      'Пересчитать RF?',
      'Будут пересчитаны баллы R/F и сегменты для всех гостей. Может занять до минуты.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Пересчитать', style: 'default',
          onPress: async () => {
            setRecalculating(true);
            try {
              await recalculateRF({ mode, branch_ids: branchId === 0 ? [] : [branchId] });
              await load();
              haptic('success');
              Alert.alert('Готово', 'RF-сегменты обновлены');
            } catch (e: any) {
              haptic('error');
              Alert.alert('Ошибка', e?.message ?? 'Не удалось пересчитать');
            } finally {
              setRecalculating(false);
            }
          },
        },
      ],
    );
  };

  const filteredCells = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.matrix.cells)
      .filter(([_k, c]) => inFilter(c.r_score, c.f_score, filterChip))
      .sort(([_a, a], [_b, b]) => segmentPriority(b) - segmentPriority(a));
  }, [data, filterChip]);

  const selected = useMemo(() => {
    if (!data) return null;
    const cell = data.matrix.cells[selectedKey];
    const info = SEG[selectedKey];
    if (!cell || !info) return null;
    return { cell, info };
  }, [data, selectedKey]);

  const onSelectKey = useCallback((key: string) => {
    haptic('light');
    setSelectedKey(key);
  }, []);

  const onShowGuests = useCallback(async () => {
    if (!selected) return;
    haptic('light');
    setGuestsOpen(true);
    setGuestsLoading(true);
    setGuests([]);
    try {
      const list = await fetchGuests({
        mode,
        r_score: selected.cell.r_score,
        f_score: selected.cell.f_score,
        branch_ids: branchId === 0 ? [] : [branchId],
      });
      setGuests(list);
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message ?? 'Не удалось загрузить гостей');
    } finally {
      setGuestsLoading(false);
    }
  }, [selected, mode, branchId]);

  if (loading || !data) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <StatusBar style="dark" />
        <View style={s.header}>
          <View style={s.iconBtn}><Menu size={18} color={C.ink} strokeWidth={2} /></View>
          <View style={s.titleBlock}>
            <Text style={s.titleSuper}>Аналитика</Text>
            <Text style={s.titleMain}>Сегментация RF</Text>
          </View>
          <View style={s.iconBtn} />
        </View>
        <View style={{ paddingHorizontal: r.pad, gap: 10 }}>
          <Skeleton w="100%" h={140} radius={20} />
          <View style={{ height: 8 }} />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </SafeAreaView>
    );
  }

  const { thresholds: th, summary, migrations, branches, matrix, thresholds_scope_label } = data;
  const periodLabel = customRange
    ? customRange.display
    : (PERIODS.find(p => p.days === periodDays)?.label ?? `${periodDays} дн.`);
  const updatedMin = Math.max(1, Math.round((Date.now() - new Date(data.updated_at).getTime()) / 60000));

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="dark" />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple} />}
      >
        {/* Header */}
        <View style={s.header}>
          <Pressable
            style={s.iconBtn}
            {...ripple()}
            onPress={() => { haptic('light'); onOpenMenu?.(); }}
            accessibilityLabel="Меню"
          ><Menu size={18} color={C.ink} strokeWidth={2} /></Pressable>
          <View style={s.titleBlock}>
            <Text style={s.titleSuper}>Аналитика</Text>
            <Text style={s.titleMain}>Сегментация RF</Text>
          </View>
          <Pressable
            style={s.iconBtn}
            {...ripple()}
            onPress={() => { haptic('light'); onOpenNotifications?.(); }}
            accessibilityLabel="Уведомления"
          ><Bell size={18} color={C.ink} strokeWidth={2} /></Pressable>
        </View>

        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroAccent} />
          <View style={s.heroRow}>
            <Text style={s.heroLabel} numberOfLines={1}>
              {`${thresholds_scope_label.toUpperCase()} · ${periodLabel.toUpperCase()}`}
            </Text>
            <Text style={s.heroPeriod}>обновлено <Text style={s.heroPeriodB}>{updatedMin} мин</Text></Text>
          </View>
          <View style={s.heroStat}>
            <Text style={s.heroNum} numberOfLines={1} adjustsFontSizeToFit>{fmtNum(summary.total)}</Text>
            <Text style={s.heroLbl}>АКТИВНЫХ{'\n'}ГОСТЕЙ</Text>
          </View>
          <View style={s.heroTrend}>
            <View style={s.heroPill}>
              <ArrowUp size={11} color={C.ink} strokeWidth={2.5} />
              <Text style={s.heroPillText}>+{summary.total_delta_pct?.toFixed(1) ?? '0.0'}%</Text>
            </View>
            <Text style={s.heroTrendText}>к прошлому периоду</Text>
          </View>
        </View>

        {/* Period + mode */}
        <View style={s.filterBlock}>
          <Text style={s.filterLabel}>Период</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
            {PERIODS.map(p => (
              <Chip
                key={p.days}
                active={!customRange && periodDays === p.days}
                onPress={() => { haptic('light'); setCustomRange(null); setPeriodDays(p.days); }}
                s={s}
              >
                {p.label}
              </Chip>
            ))}
            <Chip
              active={!!customRange}
              onPress={() => { haptic('light'); setDatePickerOpen(true); }}
              s={s}
            >
              {customRange ? customRange.display : '📅 Произвольно'}
            </Chip>
          </ScrollView>

          <View style={s.segmented}>
            <SegBtn
              active={mode === 'restaurant'}
              onPress={() => { haptic('light'); setMode('restaurant'); }}
              icon={<Store size={14} color={mode === 'restaurant' ? C.surface : C.ink3} strokeWidth={2} />}
              label="Ресторан" s={s}
            />
            <SegBtn
              active={mode === 'delivery'}
              onPress={() => { haptic('light'); setMode('delivery'); }}
              icon={<Bike size={14} color={mode === 'delivery' ? C.surface : C.ink3} strokeWidth={2} />}
              label="Доставка" s={s}
            />
          </View>
        </View>

        {/* Branches */}
        <View style={s.filterBlock}>
          <Text style={s.filterLabel}>Площадка</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
            {branches.map(b => (
              <Chip key={b.id} active={branchId === b.id} onPress={() => { haptic('light'); setBranchId(b.id); }} s={s}>
                {b.name}
              </Chip>
            ))}
          </ScrollView>
        </View>

        {/* Thresholds — полная формула как в вебе */}
        <Pressable
          style={s.thresholds}
          {...ripple()}
          onPress={() => {
            haptic('light');
            if (onOpenThresholds) onOpenThresholds();
            else Alert.alert('Пороги', 'Откройте «Ещё → Пороги RF» для редактирования.');
          }}
        >
          <View style={s.thIcon}><SlidersHorizontal size={16} color={C.ink} strokeWidth={2} /></View>
          <View style={s.thText}>
            <Text style={s.thTitle}>⚙ АКТИВНЫЕ ПОРОГИ · {thresholds_scope_label.toUpperCase()}</Text>
            <View style={s.thValRow}>
              <Text style={s.thVal}>R3 </Text><Text style={s.thCode}>0–{th.r_fresh_max} дн</Text>
              <Text style={s.thVal}> · R2 </Text><Text style={s.thCode}>до {th.r_warm_max}</Text>
              <Text style={s.thVal}> · R1 </Text><Text style={s.thCode}>до {th.r_cooling_max}</Text>
              <Text style={s.thVal}> · R0 </Text><Text style={s.thCode}>{`>${th.r_cooling_max}`}</Text>
            </View>
            <View style={s.thValRow}>
              <Text style={s.thVal}>F1 </Text><Text style={s.thCode}>до {th.f_rare_max} виз</Text>
              <Text style={s.thVal}> · F2 </Text><Text style={s.thCode}>до {th.f_moderate_max}</Text>
              <Text style={s.thVal}> · F3 </Text><Text style={s.thCode}>{`${th.f_moderate_max + 1}+`}</Text>
            </View>
            <Text style={[s.thVal, { fontSize: 11, color: C.ink4, marginTop: 4 }]}>
              {onOpenThresholds ? 'Тап — изменить →' : 'Открыть «Ещё → Пороги RF»'}
            </Text>
          </View>
          <ChevronRight size={20} color={C.ink3} strokeWidth={2} />
        </Pressable>

        {/* Подсказка над матрицей/Bento */}
        <Text style={[s.modalHintText, {
          paddingHorizontal: r.pad, marginBottom: 6, marginTop: -8,
          fontSize: 12, color: C.ink3, fontFamily: 'Manrope_500Medium', textAlign: 'center',
        }]}>
          👉 Нажмите на ячейку чтобы увидеть детали и список гостей сегмента
        </Text>

        {/* KPI grid */}
        <View style={s.kpiGrid}>
          <KPI tone="ink" label="Всего" value={fmtNum(summary.total)}
               sub="активных гостей" delta={summary.total_delta_pct ?? 0} s={s} />
          <KPI tone="purple" label="Активные · R3" value={fmtNum(summary.active_r3)}
               sub={`${Math.round((summary.active_r3 / summary.total) * 100)}% от базы`}
               delta={summary.active_delta_pct ?? 0} s={s} />
          <KPI tone="watch" label="В зоне риска" value={fmtNum(summary.at_risk_r1)}
               sub="R1 — нужна реактивация" delta={summary.at_risk_delta_pct ?? 0} s={s} />
          <KPI tone="muted" label="Потерянные" value={fmtNum(summary.lost_r0)}
               sub="R0 · > 60 дн." delta={summary.lost_delta_pct ?? 0} s={s} />
        </View>

        {/* Section header: filter + view toggle + legend */}
        <View style={s.bentoHead}>
          <View style={s.bentoHeadTitle}>
            <Text style={s.secTitle}>Сегменты</Text>
            <Text style={s.secMeta}>· {filteredCells.length}</Text>
          </View>
          <View style={s.bentoHeadActions}>
            <Pressable
              style={s.headIconBtn}
              {...ripple()}
              onPress={() => { haptic('light'); setLegendOpen(true); }}
              accessibilityLabel="Карта сегментов"
            >
              <BookOpen size={16} color={C.ink2} strokeWidth={2} />
            </Pressable>
            <Pressable
              style={s.headIconBtn}
              {...ripple()}
              onPress={() => { haptic('light'); setViewMode(v => v === 'bento' ? 'matrix' : 'bento'); }}
              accessibilityLabel={viewMode === 'bento' ? 'Переключить на матрицу' : 'Переключить на карточки'}
            >
              {viewMode === 'bento'
                ? <LayoutGrid size={16} color={C.ink2} strokeWidth={2} />
                : <LayoutList size={16} color={C.ink2} strokeWidth={2} />
              }
            </Pressable>
          </View>
        </View>

        {/* Filter chips (только в bento-режиме) */}
        {viewMode === 'bento' && (
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filterChipsRow}
            style={s.filterChipsScroll}
          >
            {FILTER_CHIPS.map(fc => {
              const Icon = fc.icon;
              const active = filterChip === fc.key;
              const count = Object.values(data.matrix.cells).filter(c => inFilter(c.r_score, c.f_score, fc.key)).length;
              return (
                <Pressable
                  key={fc.key}
                  style={[s.filterChip, active && s.filterChipActive]}
                  {...ripple('rgba(255,255,255,0.18)')}
                  onPress={() => { haptic('light'); setFilterChip(fc.key); }}
                >
                  <Icon size={13} color={active ? C.surface : C.ink2} strokeWidth={2.2} />
                  <Text style={[s.filterChipText, active && s.filterChipTextActive]}>{fc.label}</Text>
                  <View style={[s.filterChipBadge, active && s.filterChipBadgeActive]}>
                    <Text style={[s.filterChipBadgeText, active && s.filterChipBadgeTextActive]}>{count}</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* BENTO VIEW */}
        {viewMode === 'bento' && (
          <BentoSection
            cells={filteredCells}
            selectedKey={selectedKey}
            onSelect={onSelectKey}
            onBroadcast={(key) => { onSelectKey(key); setBroadcastOpen(true); }}
            s={s}
          />
        )}

        {/* MATRIX VIEW */}
        {viewMode === 'matrix' && (
          <View style={s.matrixCard}>
            <View style={s.matrixRow}>
              <View style={s.axisCorner}><Text style={s.axisCornerText}>R/F</Text></View>
              {matrix.f_levels.map(fl => (
                <View key={fl.f_score} style={s.fHeader}>
                  <Text style={s.mhLbl}>{fl.label}</Text>
                  <Text style={s.mhNm}>{fl.name}</Text>
                  <Text style={s.mhRng}>{fl.range}</Text>
                </View>
              ))}
            </View>
            {matrix.r_levels.map(rl => (
              <View key={rl.r_score} style={s.matrixRow}>
                <View style={s.rHeader}>
                  <Text style={s.mhLbl}>{rl.label}</Text>
                  <Text style={s.mhRng}>{rl.range}</Text>
                </View>
                {matrix.f_levels.map(fl => {
                  const key = `${rl.r_score}_${fl.f_score}`;
                  const cell = matrix.cells[key];
                  const info = SEG[key];
                  if (!cell || !info) return <View key={key} style={s.cell} />;
                  return (
                    <Cell
                      key={key} cell={cell} emoji={info.emoji}
                      selected={selectedKey === key}
                      edgeColor={cellEdgeColor(rl.r_score, fl.f_score)}
                      onPress={() => onSelectKey(key)}
                      s={s}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        )}

        {/* Detail */}
        {selected && (
          <DetailCard
            cell={selected.cell}
            info={selected.info}
            onBroadcast={() => { haptic('medium'); setBroadcastOpen(true); }}
            onShowGuests={onShowGuests}
            s={s} r={r}
          />
        )}

        {/* Branch ratings — рейтинг по точкам из APP-отзывов */}
        <Pressable
          style={s.secHead}
          {...ripple()}
          onPress={() => { haptic('light'); onOpenBranchRatings?.(); }}
        >
          <Text style={s.secTitle}>Рейтинг точек</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[s.secMeta, { color: C.purple }]}>подробнее</Text>
            <ChevronRight size={14} color={C.purple} strokeWidth={2.4} />
          </View>
        </Pressable>
        {(() => {
          const ratings = computeBranchRatings(MOCK_REVIEWS, branches);
          if (ratings.length === 0) {
            return (
              <View style={[s.brList, { marginBottom: 24 }]}>
                <View style={s.brEmpty}>
                  <Text style={s.brEmptyText}>Пока нет оценок из приложения</Text>
                </View>
              </View>
            );
          }
          return (
            <View style={s.brList}>
              {ratings.map((br, i) => (
                <View key={br.branch_id} style={[s.brRow, i === ratings.length - 1 && s.brRowLast]}>
                  <Text style={s.brName} numberOfLines={1} ellipsizeMode="tail">{br.branch_name}</Text>
                  <View style={s.brStarsRow}>
                    {[1, 2, 3, 4, 5].map(idx => (
                      <Text
                        key={idx}
                        style={[
                          s.brStar,
                          { color: idx <= Math.round(br.avg_rating) ? '#F59E0B' : C.line },
                        ]}
                      >★</Text>
                    ))}
                  </View>
                  <Text style={s.brAvg}>{br.avg_rating.toFixed(1)}</Text>
                  <Text style={s.brCount}>{br.reviews_count} отз.</Text>
                </View>
              ))}
            </View>
          );
        })()}

        {/* Кнопка перехода на подробный рейтинг */}
        <Pressable
          style={[s.btn, s.btnPrimary, { marginHorizontal: r.pad, marginBottom: 22 }]}
          {...ripple('rgba(255,255,255,0.22)')}
          onPress={() => { haptic('light'); onOpenBranchRatings?.(); }}
        >
          <BookOpen size={14} color={C.surface} strokeWidth={2.2} />
          <Text style={s.btnPrimaryText}>Подробный рейтинг с рекомендациями</Text>
        </Pressable>

        {/* Migrations */}
        <View style={s.secHead}>
          <Text style={s.secTitle}>Миграции</Text>
          <Text style={s.secMeta}>за {periodDays} дней</Text>
        </View>
        <View style={s.migrations}>
          {migrations.map((m, i) => (
            <View key={i} style={[s.migRow, i === migrations.length - 1 && s.migRowLast]}>
              <Text style={s.migFrom} numberOfLines={1} ellipsizeMode="tail">{m.from}</Text>
              <Text style={s.migArrow}>→</Text>
              <Text style={[s.migTo, m.count < 0 && { color: C.warn }]} numberOfLines={1} ellipsizeMode="tail">{m.to}</Text>
              <View style={[s.migCount, m.count < 0 ? s.migCountNeg : s.migCountPos]}>
                <Text style={[s.migCountText, m.count < 0 ? s.migCountTextNeg : s.migCountTextPos]}>
                  {m.count > 0 ? `+${m.count}` : `${m.count}`}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Pressable
          style={[s.btn, s.btnSecondary, { marginHorizontal: r.pad, marginBottom: 24 }]}
          {...ripple()}
          onPress={() => { haptic('light'); setMigrationsOpen(true); }}
        >
          <Text style={s.btnSecondaryText}>Показать все миграции</Text>
          <ChevronRight size={14} color={C.ink} strokeWidth={2.2} />
        </Pressable>
      </ScrollView>

      {/* FAB — обновление с неоновым glow и вращением во время recalculating */}
      <Pressable style={s.fab} onPress={onRecalculate} disabled={recalculating} {...ripple('rgba(255,255,255,0.22)', true)}>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <RefreshCw size={22} color={C.surface} strokeWidth={2.4} />
        </Animated.View>
      </Pressable>

      {/* Modals */}
      <BroadcastModal
        visible={broadcastOpen}
        onClose={() => setBroadcastOpen(false)}
        cell={selected?.cell ?? null}
        info={selected?.info ?? null}
        mode={mode}
        branchIds={branchId === 0 ? [] : [branchId]}
        s={s} r={r}
      />

      <GuestListModal
        visible={guestsOpen}
        onClose={() => setGuestsOpen(false)}
        info={selected?.info ?? null}
        cell={selected?.cell ?? null}
        guests={guests}
        loading={guestsLoading}
        s={s}
      />

      <LegendSheet
        visible={legendOpen}
        onClose={() => setLegendOpen(false)}
        cells={data?.matrix.cells ?? {}}
        onPickSegment={(key) => { onSelectKey(key); setLegendOpen(false); }}
        s={s}
      />

      <DateRangeModal
        visible={datePickerOpen}
        initial={customRange ? { start_date: customRange.start_date, end_date: customRange.end_date } : undefined}
        onClose={() => setDatePickerOpen(false)}
        onApply={(range) => {
          setCustomRange(range);
          setDatePickerOpen(false);
          setLoading(true);
        }}
        s={s}
      />

      <MigrationsModal
        visible={migrationsOpen}
        mode={mode}
        periodDays={periodDays}
        onClose={() => setMigrationsOpen(false)}
        s={s}
      />
    </SafeAreaView>
  );
}
