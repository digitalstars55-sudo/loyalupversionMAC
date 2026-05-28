import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, FlatList, RefreshControl, TextInput, ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Search, X, Users, ChevronRight, AlertTriangle, RefreshCw, ArrowUpDown } from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple } from '../platform';
import { fmtNum, avatarColor, initials } from '../helpers';
import { fetchGuestList } from '../api';
import { makeStyles } from '../styles';
import { SkeletonCard } from '../components/Skeleton';
import { GuestDetailScreen } from './GuestDetailScreen';
import type { Guest } from '../types';
import type { S } from '../styles';

// ════════════════════════════════════════════════════════════════════
// GUESTS SCREEN — полная база гостей с поиском и фильтрами
// ════════════════════════════════════════════════════════════════════
type RFilter = 'all' | 'fresh' | 'warm' | 'cold' | 'lost';
type SortKey = 'last_visit' | 'name' | 'frequency' | 'registered';

export const GuestsScreen: React.FC<{ onBack: () => void; initialGuestVkId?: string | null }> = ({ onBack, initialGuestVkId }) => {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);

  const [items, setItems] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [rFilter, setRFilter] = useState<RFilter>('all');
  const [activeVkId, setActiveVkId] = useState<string | null>(initialGuestVkId ?? null);

  const [loadError, setLoadError] = useState(false);
  const [totalVisits, setTotalVisits] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('registered');
  const [sortOpen, setSortOpen] = useState(false);

  const load = async () => {
    setLoadError(false);
    try {
      const res = await fetchGuestList({ limit: 10000 });
      setItems(res.guests);
      setTotalVisits(res.total_visits ?? 0);
    } catch { setItems([]); setLoadError(true); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = () => { haptic('light'); setRefreshing(true); load(); };

  // Фильтрация — recency_days > 0 у реальных посетителей; 0 = нет визитов (новые/без данных)
  const passFilter = (g: Guest) => {
    if (rFilter === 'all')   return true;
    if (rFilter === 'fresh') return g.recency_days > 0 && g.recency_days <= 14;
    if (rFilter === 'warm')  return g.recency_days > 14 && g.recency_days <= 30;
    if (rFilter === 'cold')  return g.recency_days > 30 && g.recency_days <= 60;
    if (rFilter === 'lost')  return g.recency_days > 60;
    return true;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = items.filter(g => {
      const fullname = `${g.first_name} ${g.last_name}`.toLowerCase();
      if (q && !fullname.includes(q) && !g.vk_id.includes(q)) return false;
      return passFilter(g);
    });
    // Сортировка
    if (sortKey === 'last_visit') {
      // Гости с визитами — по возрастанию recency (недавние первые); без визитов — в конец
      list = [...list].sort((a, b) => {
        if (a.recency_days === 0 && b.recency_days === 0) return 0;
        if (a.recency_days === 0) return 1;
        if (b.recency_days === 0) return -1;
        return a.recency_days - b.recency_days;
      });
    } else if (sortKey === 'frequency') {
      list = [...list].sort((a, b) => b.frequency - a.frequency);
    } else if (sortKey === 'name') {
      list = [...list].sort((a, b) =>
        `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, 'ru')
      );
    }
    // 'registered' — оставляем серверный порядок (по last_name, first_name)
    return list;
  }, [items, search, rFilter, sortKey]);

  const counts = useMemo(() => ({
    all:   items.length,
    fresh: items.filter(g => g.recency_days > 0 && g.recency_days <= 14).length,
    warm:  items.filter(g => g.recency_days > 14 && g.recency_days <= 30).length,
    cold:  items.filter(g => g.recency_days > 30 && g.recency_days <= 60).length,
    lost:  items.filter(g => g.recency_days > 60).length,
  }), [items]);

  // Sub-screen — карточка гостя
  if (activeVkId) {
    return (
      <GuestDetailScreen
        vkId={activeVkId}
        onBack={() => setActiveVkId(null)}
      />
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="dark" />

      <View style={s.backHeader}>
        <Pressable style={s.backBtn} {...ripple()} onPress={onBack}>
          <ChevronLeft size={20} color={C.ink} strokeWidth={2.2} />
        </Pressable>
        <View style={s.screenTitleBlock}>
          <Text style={s.screenTitleSuper}>База ЛоялUP</Text>
          <Text style={s.screenTitleMain}>Гости</Text>
        </View>
        <Pressable
          style={[s.backBtn, sortKey !== 'last_visit' && { backgroundColor: C.purpleSoft, borderColor: C.purpleLine }]}
          {...ripple()} onPress={() => setSortOpen(o => !o)}
        >
          <ArrowUpDown size={18} color={sortKey !== 'last_visit' ? C.purpleDeep : C.ink} strokeWidth={2.2} />
        </Pressable>
      </View>

      {/* Шторка сортировки */}
      {sortOpen && (
        <View style={{ backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 8 }}>
          {([
            { key: 'registered', label: '🆕 Новые гости первыми' },
            { key: 'last_visit', label: '🕐 По последнему визиту' },
            { key: 'frequency',  label: '📊 По числу визитов' },
            { key: 'name',       label: '🔤 По алфавиту' },
          ] as const).map(opt => (
            <Pressable
              key={opt.key}
              style={{ paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}
              {...ripple()} onPress={() => { haptic('light'); setSortKey(opt.key); setSortOpen(false); }}
            >
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: sortKey === opt.key ? C.purple : 'transparent' }} />
              <Text style={{ fontFamily: sortKey === opt.key ? 'Manrope_700Bold' : 'Manrope_400Regular', fontSize: 14, color: sortKey === opt.key ? C.purple : C.ink }}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={s.searchWrap}>
        <Search size={16} color={C.ink4} strokeWidth={2} />
        <TextInput
          style={s.searchInput}
          placeholder="Имя или VK ID"
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

      <FlatList
        data={filtered}
        keyExtractor={(g) => g.vk_id}
        contentContainerStyle={{ paddingHorizontal: r.pad, paddingBottom: 130 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple} />}
        ListHeaderComponent={
          <View>
            {!loading && totalVisits > 0 && (
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <View style={{ flex: 1, backgroundColor: C.purpleSoft, borderRadius: 12, padding: 12, alignItems: 'center' }}>
                  <Text style={{ fontFamily: 'Manrope_800ExtraBold', fontSize: 22, color: C.purpleDeep }}>{items.length}</Text>
                  <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 11, color: C.ink3, marginTop: 2 }}>ГОСТЕЙ</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: C.limeSoft, borderRadius: 12, padding: 12, alignItems: 'center' }}>
                  <Text style={{ fontFamily: 'Manrope_800ExtraBold', fontSize: 22, color: C.limeDeep }}>{totalVisits}</Text>
                  <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 11, color: C.ink3, marginTop: 2 }}>ВИЗИТОВ</Text>
                </View>
              </View>
            )}
            <View style={[s.rvFilters, { marginHorizontal: -r.pad, marginBottom: 10 }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[s.rvFiltersRow, { paddingHorizontal: r.pad }]}
                contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingRight: r.pad + 4 }}>
                {([
                  { key: 'all',   label: 'Все',         count: counts.all },
                  { key: 'fresh', label: '🌱 Свежие',   count: counts.fresh },
                  { key: 'warm',  label: '🌤 Тёплые',   count: counts.warm },
                  { key: 'cold',  label: '🌫 Остывают', count: counts.cold },
                  { key: 'lost',  label: '❄️ Потеряны',  count: counts.lost },
                ] as const).map(fc => {
                  const active = rFilter === fc.key;
                  return (
                    <Pressable
                      key={fc.key}
                      style={[s.filterChip, active && s.filterChipActive]}
                      {...ripple()}
                      onPress={() => { haptic('light'); setRFilter(fc.key); }}
                    >
                      <Text style={[s.filterChipText, active && s.filterChipTextActive]}>{fc.label}</Text>
                      <View style={[s.filterChipBadge, active && s.filterChipBadgeActive]}>
                        <Text style={[s.filterChipBadgeText, active && s.filterChipBadgeTextActive]}>{fc.count}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {loading && (
              <View style={{ gap: 10 }}>
                <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          loading ? null : loadError ? (
            <View style={s.emptyState}>
              <AlertTriangle size={36} color={C.warn} strokeWidth={1.5} />
              <Text style={s.emptyStateTitle}>Ошибка загрузки</Text>
              <Text style={s.emptyStateSub}>Не удалось загрузить гостей. Проверьте соединение.</Text>
              <Pressable style={[s.btn, s.btnSecondary, { alignSelf: 'center', marginTop: 12 }]} {...ripple()} onPress={() => { setLoading(true); load(); }}>
                <RefreshCw size={14} color={C.ink} strokeWidth={2} />
                <Text style={s.btnSecondaryText}>Повторить</Text>
              </Pressable>
            </View>
          ) : (
            <View style={s.emptyState}>
              <Users size={36} color={C.ink4} strokeWidth={1.5} />
              <Text style={s.emptyStateTitle}>Никого не нашли</Text>
              <Text style={s.emptyStateSub}>
                {search ? 'Попробуйте другой запрос или сбросьте фильтр.' : 'В этой категории пока пусто.'}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <GuestRow
            g={item} s={s}
            onPress={() => { haptic('light'); setActiveVkId(item.vk_id); }}
          />
        )}
      />
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────
const GuestRow: React.FC<{ g: Guest; s: S; onPress: () => void }> = ({ g, s, onPress }) => {
  const fullname = `${g.first_name} ${g.last_name}`;
  return (
    <Pressable style={s.listCard} {...ripple()} onPress={onPress}>
      <View style={[s.rvAvatar, { backgroundColor: avatarColor(fullname) }]}>
        <Text style={s.rvAvatarText}>{initials(fullname)}</Text>
      </View>
      <View style={s.listBody}>
        <View style={s.listHeadRow}>
          <Text style={s.listTitle} numberOfLines={1} ellipsizeMode="tail">{fullname}</Text>
          <Text style={s.listTime}>{g.recency_days} дн</Text>
        </View>
        <View style={s.listMetaRow}>
          <View style={s.listMetaPill}>
            <Text style={s.listMetaText}>{g.frequency} визитов</Text>
          </View>
          <View style={s.listMetaPill}>
            <Text style={s.listMetaText}>посл. {g.last_visit}</Text>
          </View>
          <View style={[s.listMetaPill, { backgroundColor: C.purpleSoft, borderColor: C.purpleLine }]}>
            <Text style={[s.listMetaText, { color: C.purpleDeep }]}>{fmtNum(g.coins)} монет</Text>
          </View>
        </View>
      </View>
      <ChevronRight size={16} color={C.ink4} strokeWidth={2} />
    </Pressable>
  );
};
