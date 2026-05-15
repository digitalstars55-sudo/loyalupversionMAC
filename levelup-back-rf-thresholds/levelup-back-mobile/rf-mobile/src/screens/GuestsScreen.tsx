import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, FlatList, RefreshControl, TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Search, X, Users, ChevronRight } from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple } from '../platform';
import { fmtNum, avatarColor, initials } from '../helpers';
import { fetchGuests } from '../api';
import { MOCK_GUESTS } from '../mocks';
import { makeStyles } from '../styles';
import { SkeletonCard } from '../components/Skeleton';
import { GuestDetailScreen } from './GuestDetailScreen';
import type { Guest } from '../types';
import type { S } from '../styles';

// ════════════════════════════════════════════════════════════════════
// GUESTS SCREEN — полная база гостей с поиском и фильтрами
// ════════════════════════════════════════════════════════════════════
type RFilter = 'all' | 'fresh' | 'warm' | 'cold' | 'lost';

export const GuestsScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);

  const [items, setItems] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [rFilter, setRFilter] = useState<RFilter>('all');
  const [activeVkId, setActiveVkId] = useState<string | null>(null);

  const load = async () => {
    try {
      // На бэке — отдельный endpoint /api/v1/guests/. Сейчас mock через fetchGuests с дефолтным сегментом.
      const list = await fetchGuests({ mode: 'restaurant', r_score: 2, f_score: 2, branch_ids: [] });
      // Если mock вернул мало — расширим из MOCK_GUESTS
      setItems(list.length > 4 ? list : MOCK_GUESTS);
    } catch { setItems(MOCK_GUESTS); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = () => { haptic('light'); setRefreshing(true); load(); };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(g => {
      const fullname = `${g.first_name} ${g.last_name}`.toLowerCase();
      const matchSearch = !q ||
        fullname.includes(q) ||
        g.vk_id.includes(q);
      if (!matchSearch) return false;

      if (rFilter === 'all') return true;
      if (rFilter === 'fresh') return g.recency_days <= 14;
      if (rFilter === 'warm')  return g.recency_days > 14 && g.recency_days <= 30;
      if (rFilter === 'cold')  return g.recency_days > 30 && g.recency_days <= 60;
      if (rFilter === 'lost')  return g.recency_days > 60;
      return true;
    });
  }, [items, search, rFilter]);

  const counts = useMemo(() => ({
    all: items.length,
    fresh: items.filter(g => g.recency_days <= 14).length,
    warm: items.filter(g => g.recency_days > 14 && g.recency_days <= 30).length,
    cold: items.filter(g => g.recency_days > 30 && g.recency_days <= 60).length,
    lost: items.filter(g => g.recency_days > 60).length,
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
      </View>

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
            <View style={[s.rvFilters, { marginHorizontal: -r.pad, marginBottom: 10 }]}>
              <View style={[s.rvFiltersRow, { paddingHorizontal: r.pad }]}>
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
              </View>
            </View>

            {loading && (
              <View style={{ gap: 10 }}>
                <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
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
