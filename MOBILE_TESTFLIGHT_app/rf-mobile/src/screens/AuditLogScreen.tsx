import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, FlatList, RefreshControl, ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft, FileText, Coins, MessageSquare, Megaphone, Gift, Target,
  UserPlus, Settings, Shield, KeyRound, LogIn, LogOut as LogOutIcon, Edit3, Trash2,
} from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple } from '../platform';
import { avatarColor, initials, relativeTime } from '../helpers';
import { fetchAuditLog, fetchStaff } from '../api';
import { makeStyles } from '../styles';
import { Skeleton } from '../components/Skeleton';
import { Chip } from '../components/Common';
import type { AuditLogEntry, AuditActionType, Staff } from '../types';
import type { S } from '../styles';

// ════════════════════════════════════════════════════════════════════
// AUDIT LOG SCREEN — журнал действий сотрудников
// ════════════════════════════════════════════════════════════════════
export const AuditLogScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);

  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [staffFilter, setStaffFilter] = useState<number | null>(null);

  const load = async () => {
    try {
      const [list, st] = await Promise.all([
        fetchAuditLog({ staff_id: staffFilter ?? undefined }),
        staff.length > 0 ? Promise.resolve({ staff }) : fetchStaff(),
      ]);
      setEntries(list);
      if (staff.length === 0) setStaff(st.staff);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [staffFilter]);
  const onRefresh = () => { haptic('light'); setRefreshing(true); load(); };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="dark" />

      <View style={s.backHeader}>
        <Pressable style={s.backBtn} {...ripple()} onPress={onBack}>
          <ChevronLeft size={20} color={C.ink} strokeWidth={2.2} />
        </Pressable>
        <View style={s.screenTitleBlock}>
          <Text style={s.screenTitleSuper}>Команда</Text>
          <Text style={s.screenTitleMain}>Журнал действий</Text>
        </View>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(e) => String(e.id)}
        contentContainerStyle={{ paddingHorizontal: Math.max(r.pad, 18), paddingBottom: 130 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple} />}
        ListHeaderComponent={
          <View style={{ marginBottom: 12 }}>
            <View style={[s.modalHint, { marginHorizontal: 0, marginBottom: 12 }]}>
              <Text style={s.modalHintText}>
                Все действия сотрудников фиксируются и хранятся 12 месяцев. Это защищает от злоупотреблений и помогает разобраться кто-что-когда сделал.
              </Text>
            </View>

            {/* Staff filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.chipsRow, { paddingHorizontal: 0 }]}>
              <Chip active={staffFilter === null} onPress={() => { haptic('light'); setStaffFilter(null); }} s={s}>
                Все сотрудники
              </Chip>
              {staff.map(p => (
                <Chip
                  key={p.id} active={staffFilter === p.id}
                  onPress={() => { haptic('light'); setStaffFilter(p.id); }} s={s}
                >
                  {p.full_name.split(' ')[0]}
                </Chip>
              ))}
            </ScrollView>

            {loading && (
              <View style={{ gap: 8, marginTop: 14 }}>
                {[1, 2, 3, 4].map(i => <Skeleton key={i} w="100%" h={70} radius={12} />)}
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={s.emptyState}>
              <FileText size={36} color={C.ink4} strokeWidth={1.5} />
              <Text style={s.emptyStateTitle}>Пока пусто</Text>
              <Text style={s.emptyStateSub}>
                {staffFilter !== null
                  ? 'У этого сотрудника пока нет действий в журнале.'
                  : 'Действия появятся когда сотрудники начнут работать.'}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => <AuditRow entry={item} s={s} />}
      />
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────
const AuditRow: React.FC<{ entry: AuditLogEntry; s: S }> = ({ entry, s }) => {
  const meta = actionMeta(entry.action_type);
  return (
    <View style={s.auditCard}>
      <View style={[s.auditIcon, { backgroundColor: meta.bg }]}>
        <meta.Icon size={15} color={meta.color} strokeWidth={2.4} />
      </View>
      <View style={s.auditBody}>
        <View style={s.auditHead}>
          <Text style={s.auditStaffName} numberOfLines={1} ellipsizeMode="tail">
            {entry.staff_name}
          </Text>
          <Text style={[s.auditAction, { color: meta.color, backgroundColor: meta.bg }]}>
            {meta.label}
          </Text>
        </View>
        {entry.details && (
          <Text style={s.auditDetails} numberOfLines={3}>
            {entry.target_label
              ? <>
                  {entry.details.replace(entry.target_label, '')}
                  <Text style={s.auditTarget}>{entry.target_label}</Text>
                </>
              : entry.details
            }
          </Text>
        )}
        {/* Если есть delta before/after — показываем компактно */}
        {entry.delta && (
          <Text style={[s.auditDetails, { color: C.ink4, fontSize: 11.5, marginTop: 3 }]}>
            {fmtDelta(entry.delta)}
          </Text>
        )}
        <Text style={s.auditTime}>{relativeTime(entry.created_at)}</Text>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────
function actionMeta(action: AuditActionType): { label: string; Icon: any; color: string; bg: string } {
  switch (action) {
    case 'COIN_ADJUST':
      return { label: 'Баланс', Icon: Coins, color: C.purpleDeep, bg: C.purpleSoft };
    case 'REVIEW_REPLY':
      return { label: 'Ответ', Icon: MessageSquare, color: C.good, bg: C.goodSoft };
    case 'REVIEW_RESOLVE':
      return { label: 'Закрыто', Icon: MessageSquare, color: C.ink2, bg: C.lineSoft };
    case 'BROADCAST_SEND':
      return { label: 'Рассылка', Icon: Megaphone, color: C.purpleDeep, bg: C.purpleSoft };
    case 'PRODUCT_CREATE':
    case 'PRODUCT_UPDATE':
      return { label: 'Подарок', Icon: Gift, color: C.limeDeep, bg: C.limeSoft };
    case 'PRODUCT_DELETE':
      return { label: 'Удалён', Icon: Trash2, color: C.warn, bg: C.warnSoft };
    case 'QUEST_CREATE':
    case 'QUEST_UPDATE':
      return { label: 'Квест', Icon: Target, color: C.limeDeep, bg: C.limeSoft };
    case 'QUEST_DELETE':
      return { label: 'Удалён', Icon: Trash2, color: C.warn, bg: C.warnSoft };
    case 'PROMO_CREATE':
    case 'PROMO_UPDATE':
      return { label: 'Акция', Icon: Megaphone, color: C.limeDeep, bg: C.limeSoft };
    case 'PROMO_DELETE':
      return { label: 'Удалена', Icon: Trash2, color: C.warn, bg: C.warnSoft };
    case 'STAFF_INVITE':
      return { label: 'Приглашение', Icon: UserPlus, color: C.purpleDeep, bg: C.purpleSoft };
    case 'STAFF_TOGGLE':
      return { label: 'Доступ', Icon: Shield, color: C.watch, bg: C.warnSoft };
    case 'STAFF_PERMS':
      return { label: 'Права', Icon: Shield, color: C.purpleDeep, bg: C.purpleSoft };
    case 'THRESHOLDS_SAVE':
      return { label: 'Пороги RF', Icon: Settings, color: C.ink2, bg: C.lineSoft };
    case 'DAILY_CODE_MANUAL':
      return { label: 'Код дня', Icon: KeyRound, color: C.warn, bg: C.warnSoft };
    case 'AUTH_LOGIN':
      return { label: 'Вход', Icon: LogIn, color: C.good, bg: C.goodSoft };
    case 'AUTH_LOGOUT':
      return { label: 'Выход', Icon: LogOutIcon, color: C.ink3, bg: C.lineSoft };
    default:
      return { label: 'Действие', Icon: Edit3, color: C.ink2, bg: C.lineSoft };
  }
}

function fmtDelta(delta: { before?: any; after?: any }): string {
  if (typeof delta.before === 'boolean' && typeof delta.after === 'boolean') {
    return `${delta.before ? 'Включено' : 'Выключено'} → ${delta.after ? 'Включено' : 'Выключено'}`;
  }
  if (typeof delta.before === 'number' && typeof delta.after === 'number') {
    const sign = delta.after >= delta.before ? '+' : '';
    return `${delta.before} → ${delta.after}  (${sign}${delta.after - delta.before})`;
  }
  if (typeof delta.before === 'object' || typeof delta.after === 'object') {
    return `${JSON.stringify(delta.before)} → ${JSON.stringify(delta.after)}`;
  }
  return `${delta.before ?? '∅'} → ${delta.after ?? '∅'}`;
}
