import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, RefreshControl, Alert, ActivityIndicator,
  Linking, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft, Download, Sparkles,
} from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple } from '../platform';
import { fmtNum } from '../helpers';
import { fetchLoyaltyReport, fetchBranches, getLoyaltyReportPdfUrl } from '../api';
import { PERIODS } from '../mocks';
import { makeStyles } from '../styles';
import { Skeleton } from '../components/Skeleton';
import { Chip } from '../components/Common';
import type { LoyaltyReport, RFBranch } from '../types';
import type { S } from '../styles';

// ════════════════════════════════════════════════════════════════════
// REPORTS SCREEN — расширенный отчёт по программе лояльности (PDF-выгрузка)
// Аналог /analytics/report/ в вебе.
// ════════════════════════════════════════════════════════════════════
// Разделы PDF-отчёта (1:1 с бэком, LU-11). По умолчанию включены все.
const REPORT_SECTIONS: [number, string][] = [
  [1,  'Ключевые метрики'],
  [2,  'Рост клиентской базы'],
  [3,  'Индекс оцифровки'],
  [4,  'Источники подключения'],
  [5,  'Вовлечение гостей'],
  [6,  'Коммуникации с гостями'],
  [7,  'Отзывы гостей'],
  [8,  'RF-матрица'],
  [9,  'Миграция сегментов'],
  [10, 'Итоговые выводы'],
  [11, 'Рекомендации'],
];

export const ReportsScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);

  const [report, setReport] = useState<LoyaltyReport | null>(null);
  const [branches, setBranches] = useState<RFBranch[]>([]);
  const [periodDays, setPeriodDays] = useState(30);
  const [branchId, setBranchId] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  // Какие разделы НЕ включать в PDF (номера секций). Пусто = все включены.
  const [hiddenSections, setHiddenSections] = useState<number[]>([]);
  const toggleSection = (n: number) => {
    haptic('light');
    setHiddenSections(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]);
  };

  const load = async () => {
    try {
      const [rep, br] = await Promise.all([
        // period_days обязателен: раньше выбор периода менял только чипсы,
        // а отчёт всегда приходил за дефолтное окно бэка.
        fetchLoyaltyReport({ branch_ids: branchId === 0 ? [] : [branchId], period_days: periodDays }),
        branches.length > 0 ? Promise.resolve(branches) : fetchBranches(),
      ]);
      setReport(rep);
      if (branches.length === 0) setBranches(br);
    } catch {} finally {
      setLoading(false); setRefreshing(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [periodDays, branchId]);
  const onRefresh = () => { haptic('light'); setRefreshing(true); load(); };

  const onExportPdf = async () => {
    haptic('medium');
    setExporting(true);
    try {
      const url = await getLoyaltyReportPdfUrl({ branch_ids: branchId === 0 ? [] : [branchId], period_days: periodDays, hide: hiddenSections });
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        const ok = await Linking.canOpenURL(url).catch(() => false);
        if (ok) await Linking.openURL(url);
        else Alert.alert('Не удалось открыть', `URL: ${url}`);
      }
      haptic('success');
    } catch (e: any) {
      haptic('error');
      Alert.alert('Ошибка', e?.message ?? 'Не удалось сгенерировать PDF');
    } finally {
      setExporting(false);
    }
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="dark" />

      <View style={s.backHeader}>
        <Pressable style={s.backBtn} {...ripple()} onPress={onBack}>
          <ChevronLeft size={20} color={C.ink} strokeWidth={2.2} />
        </Pressable>
        <View style={s.screenTitleBlock}>
          <Text style={s.screenTitleSuper}>ЛоялUP</Text>
          <Text style={s.screenTitleMain}>Отчёт</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple} />}
      >
        {/* Period + branch */}
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
        {branches.length > 1 && (
          <View style={s.filterBlock}>
            <Text style={s.filterLabel}>Площадка</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
              {branches.map(b => (
                <Chip
                  key={b.id} active={branchId === b.id}
                  onPress={() => { haptic('light'); setBranchId(b.id); }} s={s}
                >{b.name}</Chip>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Разделы в PDF — какие включить в выгрузку (как в вебе, LU-11) */}
        <View style={s.filterBlock}>
          <Text style={s.filterLabel}>Разделы в PDF</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: r.pad }}>
            {REPORT_SECTIONS.map(([n, label]) => (
              <Chip
                key={n}
                active={!hiddenSections.includes(n)}
                onPress={() => toggleSection(n)}
                s={s}
              >{label}</Chip>
            ))}
          </View>
        </View>

        {loading || !report ? (
          <View style={{ paddingHorizontal: r.pad, gap: 10 }}>
            <Skeleton w="100%" h={120} radius={18} />
            <Skeleton w="100%" h={120} radius={18} />
            <Skeleton w="100%" h={120} radius={18} />
          </View>
        ) : (
          <>
            {/* AI Summary */}
            {report.ai_summary && (
              <View style={[s.modalHint, { marginHorizontal: Math.max(r.pad, 18), marginBottom: 14 }]}>
                <View style={s.modalHintHeader}>
                  <Sparkles size={12} color={C.hintInk} strokeWidth={2.4} />
                  <Text style={s.modalHintTitle}>AI-РЕЗЮМЕ ОТЧЁТА</Text>
                </View>
                <Text style={s.modalHintText}>{report.ai_summary}</Text>
              </View>
            )}

            {/* Engagement summary */}
            <SecTitle pad={Math.max(r.pad, 18)}>Вовлечённость</SecTitle>
            <Grid pad={r.pad}>
              <Snap s={s} bg={C.purpleSoft}  ic="📱" label="Отсканировали QR"   val={fmtNum(report.stats.total_scans ?? report.stats.qr_scans)} sub="кафе + доставка" />
              <Snap s={s} bg={C.goodSoft}    ic="🎮" label="Начали игру"       val={fmtNum(report.stats.game_reached ?? 0)} sub="после скана" />
              <Snap s={s} bg={C.goodSoft}    ic="🔄" label="Повторные визиты"  val={fmtNum(report.stats.repeat_game_players)} sub="игр в разные дни" />
              <Snap s={s} bg={C.purpleSoft}  ic="📬" label="Открываемость"     val={`${(report.stats.message_open_rate ?? 0).toFixed(1)}%`} sub={`${fmtNum(report.stats.message_total_read)} из ${fmtNum(report.stats.message_total_sent)}`} />
              <Snap s={s} bg={C.warnSoft}    ic="🎯" label="Индекс QR ÷ POS"   val={`${report.stats.scan_index.toFixed(1)}%`} sub={`POS: ${fmtNum(report.stats.pos_guests)}`} />
            </Grid>

            {/* Reviews */}
            <SecTitle>Отзывы</SecTitle>
            <ListCard pad={r.pad}>
              <DotRow color={C.good}  label="Позитивные"          val={fmtNum(report.reviews.positive)} />
              <DotRow color={C.ink3}  label="Нейтральные"         val={fmtNum(report.reviews.neutral)} />
              <DotRow color={C.watch} label="Частично негативные" val={fmtNum(report.reviews.partial)} />
              <DotRow color={C.warn}  label="Негативные"          val={fmtNum(report.reviews.negative)} />
              <DotRow color={C.ink4}  label="Спам"                val={fmtNum(report.reviews.spam)} last />
            </ListCard>

            {/* RF summary */}
            <SecTitle>RF-сегменты</SecTitle>
            <Grid pad={r.pad}>
              <Snap s={s} bg={C.purpleSoft} ic="👥" label="Активная база"   val={fmtNum(report.rf_summary.total)} />
              <Snap s={s} bg={C.limeSoft}   ic="🏆" label="Чемпионы R3"     val={fmtNum(report.rf_summary.active_r3)} sub={`${Math.round((report.rf_summary.active_r3 / report.rf_summary.total) * 100)}% от базы`} />
              <Snap s={s} bg={C.warnSoft}   ic="🚨" label="VIP риск"        val={fmtNum(report.rf_summary.at_risk_r1)} sub="нужна реактивация" />
              <Snap s={s} bg={C.lineSoft}   ic="❄️"  label="Потеряны"        val={fmtNum(report.rf_summary.lost_r0)} sub=">60 дн" />
            </Grid>

            {/* Migration */}
            <SecTitle>Миграции</SecTitle>
            <ListCard pad={r.pad}>
              <IconRow ic="📈" bg={C.goodSoft}   label="Поднялись в активные"    val={`+${report.migration.promoted}`}   valColor={C.good} />
              <IconRow ic="📉" bg={C.warnSoft}   label="Упали в менее активные"  val={`−${report.migration.demoted}`}    valColor={C.warn} />
              <IconRow ic="🆕" bg={C.purpleSoft} label="Новые гости"             val={`+${report.migration.new_users}`}  valColor={C.purpleDeep} />
              <IconRow ic="❄️"  bg={C.lineSoft}   label="Потеряны"                val={`−${report.migration.lost_users}`} valColor={C.ink3} last />
            </ListCard>

            {/* Sources */}
            <SecTitle>Источники</SecTitle>
            <Grid pad={r.pad}>
              <Snap s={s} bg={C.purpleSoft} ic="🏪" label="Из кафе"     val={fmtNum(report.sources.from_cafe)} sub="QR в заведении" />
              <Snap s={s} bg={C.limeSoft}   ic="📖" label="Из историй" val={fmtNum(report.sources.from_delivery)} sub="рефералы в ВК" />
            </Grid>

            {/* Подписки с сайта */}
            <SecTitle>Подписки с сайта</SecTitle>
            <Grid pad={r.pad}>
              <Snap s={s} bg={C.limeSoft} ic="🌐" label="В VK с сайта"     val={fmtNum(report.stats.community_subs_website ?? 0)} sub="QR на сайте" />
              <Snap s={s} bg={C.limeSoft} ic="🌐" label="Рассылка с сайта" val={fmtNum(report.stats.newsletter_subs_website ?? 0)} sub="QR на сайте" />
            </Grid>

            {/* Точки контакта */}
            {report.contact_points && report.contact_points.length > 0 && (
              <>
                <SecTitle>Точки контакта</SecTitle>
                <ListCard pad={r.pad}>
                  {report.contact_points.map((cp, i, arr) => (
                    <IconRow
                      key={cp.id}
                      ic="📌" bg={C.purpleSoft}
                      label={`${cp.name} · ${cp.branch}`}
                      val={`${fmtNum(cp.subscribed)} подп.`}
                      valColor={C.purpleDeep}
                      last={i === arr.length - 1}
                    />
                  ))}
                </ListCard>
              </>
            )}

            {/* Segments breakdown */}
            <SecTitle>По сегментам</SecTitle>
            <ListCard pad={r.pad}>
              {Object.entries(report.segment_counts).sort((a, b) => b[1] - a[1]).map(([name, count], i, arr) => (
                <IconRow
                  key={name}
                  ic="⭐" bg={C.purpleSoft}
                  label={name} val={fmtNum(count)} valColor={C.ink}
                  last={i === arr.length - 1}
                />
              ))}
            </ListCard>
          </>
        )}
      </ScrollView>

      {/* Sticky FAB */}
      {!loading && report && (
        <Pressable
          style={s.fabAdd}
          {...ripple('rgba(255,255,255,0.22)')}
          onPress={onExportPdf}
          disabled={exporting}
        >
          {exporting
            ? <ActivityIndicator size="small" color={C.surface} />
            : <Download size={16} color={C.surface} strokeWidth={2.4} />
          }
          <Text style={s.fabAddText}>{exporting ? 'Готовим…' : 'Скачать PDF'}</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────
const Snap: React.FC<{
  s: S; bg: string; ic: string; label: string; val: string; sub?: string;
}> = ({ s, bg, ic, label, val, sub }) => (
  <View style={s.snapItem}>
    <View style={s.snapItemHead}>
      <View style={[s.snapItemIcon, { backgroundColor: bg }]}>
        <Text style={{ fontSize: 12 }}>{ic}</Text>
      </View>
      <Text style={[s.snapItemLabel, { flex: 1, minWidth: 0 }]} numberOfLines={2} ellipsizeMode="tail">{label}</Text>
    </View>
    <Text style={s.snapItemVal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{val}</Text>
    {sub && <Text style={s.snapItemSub} numberOfLines={2} ellipsizeMode="tail">{sub}</Text>}
  </View>
);

// ── Самодостаточные компоненты для списочных секций отчёта ─────────
// Без зависимостей от shared-стилей. Гарантированный padding + minWidth:0.

const SecTitle: React.FC<{ children: React.ReactNode; pad?: number }> = ({ children, pad = 18 }) => (
  <Text style={{
    paddingHorizontal: pad, marginBottom: 8, marginTop: 6,
    fontFamily: 'Manrope_800ExtraBold', fontSize: 15, color: C.ink,
    letterSpacing: -0.3,
  }}>
    {children}
  </Text>
);

const ListCard: React.FC<{ pad: number; children: React.ReactNode }> = ({ pad, children }) => (
  <View style={{
    // Гарантируем минимум 18px от края экрана, даже на iPhone SE
    marginHorizontal: Math.max(pad, 18),
    marginBottom: 18,
    backgroundColor: C.surface,
    borderRadius: 14, borderWidth: 1, borderColor: C.line,
    overflow: 'hidden',
  }}>
    {children}
  </View>
);

// Сетка 2×N для Snap-карточек, с гарантированным отступом и расстоянием
const Grid: React.FC<{ pad: number; children: React.ReactNode }> = ({ pad, children }) => (
  <View style={{
    paddingHorizontal: Math.max(pad, 18),
    marginBottom: 18,
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  }}>
    {children}
  </View>
);

// Строка с цветной точкой (для отзывов)
const DotRow: React.FC<{ color: string; label: string; val: string; last?: boolean }> = ({
  color, label, val, last,
}) => (
  <View style={{
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: last ? 0 : 1, borderBottomColor: C.lineSoft,
  }}>
    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, marginRight: 12 }} />
    <Text
      style={{
        flex: 1, minWidth: 0,
        fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: C.ink,
      }}
      numberOfLines={1} ellipsizeMode="tail"
    >
      {label}
    </Text>
    <Text style={{ fontFamily: 'Manrope_800ExtraBold', fontSize: 16, color, marginLeft: 8 }}>
      {val}
    </Text>
  </View>
);

// Строка с emoji-иконкой в цветном квадрате (для миграций и сегментов)
const IconRow: React.FC<{
  ic: string; bg: string; label: string; val: string; valColor: string; last?: boolean;
}> = ({ ic, bg, label, val, valColor, last }) => (
  <View style={{
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: last ? 0 : 1, borderBottomColor: C.lineSoft,
  }}>
    <View style={{
      width: 32, height: 32, borderRadius: 9,
      backgroundColor: bg,
      alignItems: 'center', justifyContent: 'center', marginRight: 12,
    }}>
      <Text style={{ fontSize: 15 }}>{ic}</Text>
    </View>
    <Text
      style={{
        flex: 1, minWidth: 0,
        fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: C.ink,
      }}
      numberOfLines={2} ellipsizeMode="tail"
    >
      {label}
    </Text>
    <Text style={{
      fontFamily: 'Manrope_800ExtraBold', fontSize: 16,
      color: valColor, marginLeft: 8, letterSpacing: -0.2,
    }}>
      {val}
    </Text>
  </View>
);
