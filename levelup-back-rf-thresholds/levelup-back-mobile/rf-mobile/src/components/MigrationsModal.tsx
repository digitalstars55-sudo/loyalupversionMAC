import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, Pressable, FlatList } from 'react-native';
import { X, ArrowRight } from 'lucide-react-native';

import { C } from '../theme';
import { ripple } from '../platform';
import { fetchFullMigrations } from '../api';
import { Skeleton } from './Skeleton';
import type { RFMigration, Mode } from '../types';
import type { S } from '../styles';

// ════════════════════════════════════════════════════════════════════
// MIGRATIONS MODAL — полная история миграций сегментов
// ════════════════════════════════════════════════════════════════════
type Filter = 'all' | 'gain' | 'loss';

export const MigrationsModal: React.FC<{
  visible: boolean;
  mode: Mode;
  periodDays: number;
  s: S;
  onClose: () => void;
}> = ({ visible, mode, periodDays, s, onClose }) => {
  const [items, setItems] = useState<RFMigration[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    fetchFullMigrations({ mode, period_days: periodDays })
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible, mode, periodDays]);

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    if (filter === 'gain') return items.filter(m => m.count > 0);
    return items.filter(m => m.count < 0);
  }, [items, filter]);

  const counts = useMemo(() => ({
    all: items.length,
    gain: items.filter(m => m.count > 0).length,
    loss: items.filter(m => m.count < 0).length,
  }), [items]);

  const totalGain = items.filter(m => m.count > 0).reduce((sum, m) => sum + m.count, 0);
  const totalLoss = items.filter(m => m.count < 0).reduce((sum, m) => sum + m.count, 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.modalRoot}>
        <Pressable style={s.modalBackdrop} onPress={onClose} />
        <View style={[s.modalSheet, s.modalSheetTall]}>
          <View style={s.modalHandle} />
          <View style={s.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.modalSuper}>За {periodDays} дней</Text>
              <Text style={s.modalTitle}>Все миграции</Text>
            </View>
            <Pressable style={s.modalClose} {...ripple()} onPress={onClose}>
              <X size={16} color={C.ink} strokeWidth={2} />
            </Pressable>
          </View>

          {/* Summary row */}
          {!loading && items.length > 0 && (
            <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingTop: 12, gap: 10 }}>
              <View style={[s.snapItem, { flex: 1, paddingHorizontal: 12, paddingVertical: 10 }]}>
                <Text style={[s.snapItemLabel, { color: C.good }]}>Прирост</Text>
                <Text style={[s.snapItemVal, { fontSize: 22, color: C.good }]}>+{totalGain}</Text>
              </View>
              <View style={[s.snapItem, { flex: 1, paddingHorizontal: 12, paddingVertical: 10 }]}>
                <Text style={[s.snapItemLabel, { color: C.warn }]}>Отток</Text>
                <Text style={[s.snapItemVal, { fontSize: 22, color: C.warn }]}>{totalLoss}</Text>
              </View>
            </View>
          )}

          {/* Filter chips */}
          <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
            <View style={[s.rvFiltersRow, { paddingHorizontal: 0 }]}>
              {([
                { key: 'all',  label: 'Все',     count: counts.all },
                { key: 'gain', label: 'Прирост', count: counts.gain },
                { key: 'loss', label: 'Отток',   count: counts.loss },
              ] as const).map(fc => {
                const active = filter === fc.key;
                return (
                  <Pressable
                    key={fc.key}
                    style={[s.filterChip, active && s.filterChipActive]}
                    {...ripple()}
                    onPress={() => setFilter(fc.key)}
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

          {loading ? (
            <View style={{ paddingHorizontal: 20, paddingTop: 14, gap: 10 }}>
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} w="100%" h={48} radius={12} />)}
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(_, i) => String(i)}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 }}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: C.lineSoft }} />}
              renderItem={({ item }) => (
                <View style={[s.migRow, { paddingHorizontal: 0 }]}>
                  <Text style={s.migFrom} numberOfLines={1} ellipsizeMode="tail">{item.from}</Text>
                  <ArrowRight size={14} color={C.ink4} strokeWidth={2.2} />
                  <Text
                    style={[s.migTo, item.count < 0 && { color: C.warn }]}
                    numberOfLines={1} ellipsizeMode="tail"
                  >
                    {item.to}
                  </Text>
                  <View style={[s.migCount, item.count < 0 ? s.migCountNeg : s.migCountPos]}>
                    <Text style={[s.migCountText, item.count < 0 ? s.migCountTextNeg : s.migCountTextPos]}>
                      {item.count > 0 ? `+${item.count}` : `${item.count}`}
                    </Text>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};
