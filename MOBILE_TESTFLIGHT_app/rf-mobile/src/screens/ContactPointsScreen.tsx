import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple } from '../platform';
import { fmtNum } from '../helpers';
import { fetchContactPoints, fetchBranches } from '../api';
import { PERIODS } from '../mocks';
import { makeStyles } from '../styles';
import { Skeleton } from '../components/Skeleton';
import { Chip } from '../components/Common';
import type { ContactPointsResponse, ContactPointRow, RFBranch } from '../types';
import type { S } from '../styles';

// ════════════════════════════════════════════════════════════════════
// CONTACT POINTS SCREEN — воронка конверсии по каждому отслеживаемому QR
// (как /analytics/contact-points/ в вебе)
// ════════════════════════════════════════════════════════════════════
export const ContactPointsScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);

  const [data, setData] = useState<ContactPointsResponse | null>(null);
  const [branches, setBranches] = useState<RFBranch[]>([]);
  const [periodDays, setPeriodDays] = useState(30);
  const [branchId, setBranchId] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [cp, br] = await Promise.all([
        fetchContactPoints({ period_days: periodDays, branch_ids: branchId === 0 ? [] : [branchId] }),
        branches.length > 0 ? Promise.resolve(branches) : fetchBranches(),
      ]);
      setData(cp);
      if (branches.length === 0) setBranches(br);
    } catch {} finally {
      setLoading(false); setRefreshing(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [periodDays, branchId]);

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
          <Text style={s.screenTitleSuper}>Аналитика</Text>
          <Text style={s.screenTitleMain}>Точки контакта</Text>
        </View>
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
              <Chip key={p.days} active={periodDays === p.days} onPress={() => { haptic('light'); setPeriodDays(p.days); }} s={s}>{p.label}</Chip>
            ))}
          </ScrollView>
        </View>

        {/* Branches */}
        {branches.length > 1 && (
          <View style={s.filterBlock}>
            <Text style={s.filterLabel}>Площадка</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
              {branches.map(b => (
                <Chip key={b.id} active={branchId === b.id} onPress={() => { haptic('light'); setBranchId(b.id); }} s={s}>{b.name}</Chip>
              ))}
            </ScrollView>
          </View>
        )}

        {loading || !data ? (
          <View style={{ paddingHorizontal: r.pad, gap: 12 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <View key={i} style={card(r)}>
                <Skeleton w="60%" h={14} /><View style={{ height: 10 }} /><Skeleton w="90%" h={40} />
              </View>
            ))}
          </View>
        ) : (
          <>
            {/* Totals KPI */}
            {t && (
              <View style={[card(r), { marginHorizontal: r.pad, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }]}>
                <Kpi label="Сканы"        val={t.scans}      color="#4a76a8" />
                <Kpi label="Гости"        val={t.guests}     color={C.ink} />
                <Kpi label="Подписались"  val={t.subscribed} color={C.purple} />
                <Kpi label="Сыграли"      val={t.played}     color={C.limeDeep} />
                <Kpi label="Активировали" val={t.activated}  color={C.good} />
                <Kpi label="Конверсия"    val={`${t.conversion}%`} color={C.good} />
              </View>
            )}

            {/* Per-QR cards */}
            <View style={{ paddingHorizontal: r.pad, marginTop: 12, gap: 12 }}>
              {data.rows.length === 0 ? (
                <View style={[card(r), { alignItems: 'center', paddingVertical: 32 }]}>
                  <Text style={{ color: C.ink3, fontSize: 14 }}>Пока нет ни одной точки контакта.</Text>
                  <Text style={{ color: C.ink4, fontSize: 12, marginTop: 6, textAlign: 'center' }}>
                    Создайте QR в админ-панели (раздел «Точки контакта»).
                  </Text>
                </View>
              ) : data.rows.map(row => <FunnelCard key={row.id} row={row} r={r} />)}
            </View>

            <View style={[s.modalHint, { marginHorizontal: r.pad, marginTop: 12, marginBottom: 8 }]}>
              <Text style={s.modalHintText}>
                «Конверсия» = подписались ÷ уникальные гости. Атрибуция last-touch: событие
                засчитывается QR, который гость сканировал последним перед действием.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────
const card = (r: ReturnType<typeof useResponsive>) => ({
  backgroundColor: C.surface,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: C.line,
  padding: 14,
});

const Kpi: React.FC<{ label: string; val: string | number; color: string }> = ({ label, val, color }) => (
  <View style={{ width: '31%' }}>
    <Text style={{ fontSize: 22, fontWeight: '800', color }} numberOfLines={1} adjustsFontSizeToFit>
      {typeof val === 'number' ? fmtNum(val) : val}
    </Text>
    <Text style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>{label}</Text>
  </View>
);

const Step: React.FC<{ label: string; val: number; pct?: number | null }> = ({ label, val, pct }) => (
  <View style={{ alignItems: 'center', flex: 1 }}>
    <Text style={{ fontSize: 17, fontWeight: '800', color: C.ink }}>{fmtNum(val)}</Text>
    <Text style={{ fontSize: 9.5, color: C.ink3, marginTop: 1 }} numberOfLines={1}>{label}</Text>
  </View>
);

const FunnelCard: React.FC<{ row: ContactPointRow; r: ReturnType<typeof useResponsive> }> = ({ row, r }) => {
  const delivery = row.mode === 'Доставка';
  const convColor = row.conversion >= 30 ? C.good : row.conversion > 0 ? C.watch : C.ink4;
  return (
    <View style={[card(r), !row.is_active && { opacity: 0.55 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: C.ink, flex: 1 }} numberOfLines={1}>
          📍 {row.name}{!row.is_active ? '  (выкл.)' : ''}
        </Text>
        <View style={{ backgroundColor: delivery ? C.good : '#4a76a8', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 }}>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{delivery ? 'Доставка' : 'В кафе'}</Text>
        </View>
      </View>
      <Text style={{ fontSize: 11, color: C.ink3, marginBottom: 10 }}>{row.branch}</Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: C.line }}>
        <Step label="Сканы"      val={row.scans} />
        <Step label="Гости"      val={row.guests} />
        <Step label="Подписки"   val={row.subscribed} />
        <Step label="Сыграли"    val={row.played} />
        <Step label="Активир."   val={row.activated} />
      </View>

      <View style={{ marginTop: 12, alignItems: 'center', backgroundColor: '#f5f7f5', borderRadius: 10, paddingVertical: 8 }}>
        <Text style={{ fontSize: 11, color: C.ink3 }}>Конверсия в подписку</Text>
        <Text style={{ fontSize: 20, fontWeight: '800', color: convColor }}>{row.conversion}%</Text>
      </View>
    </View>
  );
};
