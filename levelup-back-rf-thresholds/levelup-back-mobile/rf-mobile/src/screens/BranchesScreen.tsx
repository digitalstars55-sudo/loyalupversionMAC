import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Store, Plus } from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple } from '../platform';
import { computeBranchRatings } from '../helpers';
import { fetchBranches } from '../api';
import { makeStyles } from '../styles';
import { SkeletonCard } from '../components/Skeleton';
import type { RFBranch, Review } from '../types';
import type { S } from '../styles';

// ════════════════════════════════════════════════════════════════════
// BRANCHES SCREEN — список точек с рейтингом и количеством отзывов
// Управление точками (добавление/переименование) — через менеджера ЛоялUP,
// здесь только просмотр.
// ════════════════════════════════════════════════════════════════════
export const BranchesScreen: React.FC<{
  onBack: () => void;
  reviews: Review[];
  onContactManager: () => void;
}> = ({ onBack, reviews, onContactManager }) => {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);

  const [branches, setBranches] = useState<RFBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try { setBranches(await fetchBranches()); }
    catch {} finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);
  const onRefresh = () => { haptic('light'); setRefreshing(true); load(); };

  const ratings = useMemo(() => computeBranchRatings(reviews, branches), [reviews, branches]);
  // Превратим в map для быстрого доступа
  const ratingMap = useMemo(() => {
    const m: Record<number, { avg: number; count: number }> = {};
    ratings.forEach(br => { m[br.branch_id] = { avg: br.avg_rating, count: br.reviews_count }; });
    return m;
  }, [ratings]);

  const visible = branches.filter(b => b.id !== 0);

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="dark" />

      <View style={s.backHeader}>
        <Pressable style={s.backBtn} {...ripple()} onPress={onBack}>
          <ChevronLeft size={20} color={C.ink} strokeWidth={2.2} />
        </Pressable>
        <View style={s.screenTitleBlock}>
          <Text style={s.screenTitleSuper}>Сеть</Text>
          <Text style={s.screenTitleMain}>Точки</Text>
        </View>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(b) => String(b.id)}
        contentContainerStyle={{ paddingHorizontal: r.pad, paddingBottom: 130 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple} />}
        ListHeaderComponent={
          loading ? (
            <View style={{ gap: 10, marginBottom: 10 }}>
              <SkeletonCard /><SkeletonCard /><SkeletonCard />
            </View>
          ) : null
        }
        ListFooterComponent={
          !loading ? (
            <Pressable
              style={[s.listCard, { marginTop: 14, borderStyle: 'dashed', backgroundColor: C.paper }]}
              {...ripple()}
              onPress={() => { haptic('medium'); onContactManager(); }}
            >
              <View style={[s.listIcon, { backgroundColor: C.lineSoft }]}>
                <Plus size={22} color={C.ink2} strokeWidth={2.2} />
              </View>
              <View style={s.listBody}>
                <Text style={s.listTitle}>Подключить точку</Text>
                <Text style={s.listSub}>
                  Новые точки добавляет менеджер ЛоялUP. Напишите название и город — подключим в течение суток.
                </Text>
              </View>
            </Pressable>
          ) : null
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={s.emptyState}>
              <Store size={36} color={C.ink4} strokeWidth={1.5} />
              <Text style={s.emptyStateTitle}>Точек пока нет</Text>
              <Text style={s.emptyStateSub}>Свяжитесь с менеджером — добавим в БД.</Text>
            </View>
          )
        }
        renderItem={({ item }) => <BranchRow b={item} rating={ratingMap[item.id]} s={s} />}
      />
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────
const BranchRow: React.FC<{
  b: RFBranch;
  rating?: { avg: number; count: number };
  s: S;
}> = ({ b, rating, s }) => (
  <View style={s.listCard}>
    <View style={[s.listIcon, { backgroundColor: C.purpleSoft }]}>
      <Store size={20} color={C.purpleDeep} strokeWidth={2.2} />
    </View>
    <View style={s.listBody}>
      <View style={s.listHeadRow}>
        <Text style={s.listTitle} numberOfLines={1} ellipsizeMode="tail">{b.name}</Text>
        <Text style={s.listTime}>#{b.id}</Text>
      </View>
      {b.address && (
        <Text style={s.listSub} numberOfLines={1} ellipsizeMode="tail">
          {b.address}{b.city ? `, ${b.city}` : ''}
        </Text>
      )}
      <View style={s.listMetaRow}>
        {rating ? (
          <>
            <View style={s.listMetaPill}>
              <Text style={s.listMetaText}>★ {rating.avg.toFixed(1)}</Text>
            </View>
            <View style={s.listMetaPill}>
              <Text style={s.listMetaText}>{rating.count} отз.</Text>
            </View>
          </>
        ) : (
          <Text style={[s.listMetaText, { color: C.ink4 }]}>пока нет оценок</Text>
        )}
      </View>
    </View>
  </View>
);
