import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft, Phone, Cake, MapPin, Calendar, Coins, Gift, Star, MessageSquare,
  Check, X, ArrowDownUp, TrendingUp, TrendingDown, Edit3,
} from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple, formatPhone, callPhone } from '../platform';
import { fmtNum, avatarColor, initials, relativeTime } from '../helpers';
import { fetchGuestDetail } from '../api';
import { makeStyles } from '../styles';
import { Skeleton } from '../components/Skeleton';
import { CoinAdjustModal } from '../components/CoinAdjustModal';
import type { GuestDetail, GuestVisit, GuestCoinTxn } from '../types';
import type { S } from '../styles';

// ════════════════════════════════════════════════════════════════════
// GUEST DETAIL SCREEN — расширенная карточка гостя (визиты, монеты, VK)
// ════════════════════════════════════════════════════════════════════
export const GuestDetailScreen: React.FC<{
  vkId: string;
  onBack: () => void;
}> = ({ vkId, onBack }) => {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);

  const [guest, setGuest] = useState<GuestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const load = async () => {
    try { setGuest(await fetchGuestDetail({ vk_id: vkId })); }
    catch {} finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [vkId]);
  const onRefresh = () => { haptic('light'); setRefreshing(true); load(); };

  const onCall = () => {
    if (!guest?.phone) return;
    callPhone({ phone: guest.phone, name: `${guest.first_name} ${guest.last_name}` });
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="dark" />

      <View style={s.backHeader}>
        <Pressable style={s.backBtn} {...ripple()} onPress={onBack}>
          <ChevronLeft size={20} color={C.ink} strokeWidth={2.2} />
        </Pressable>
        <View style={s.screenTitleBlock}>
          <Text style={s.screenTitleSuper}>Гость</Text>
          <Text style={s.screenTitleMain} numberOfLines={1}>
            {guest ? `${guest.first_name} ${guest.last_name}` : '…'}
          </Text>
        </View>
        {guest?.phone && (
          <Pressable
            style={[s.backBtn, { backgroundColor: C.purpleSoft, borderColor: C.purpleLine }]}
            {...ripple()}
            onPress={onCall}
            accessibilityLabel="Позвонить гостю"
          >
            <Phone size={18} color={C.purpleDeep} strokeWidth={2.2} />
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple} />}
      >
        {loading || !guest ? (
          <View style={[s.gdHero, { paddingVertical: 30 }]}>
            <Skeleton w={84} h={84} radius={42} />
            <View style={{ height: 12 }} />
            <Skeleton w="60%" h={20} />
            <View style={{ height: 8 }} />
            <Skeleton w={120} h={22} radius={50} />
          </View>
        ) : (
          <>
            {/* Hero */}
            <View style={s.gdHero}>
              <View style={[s.gdAvatarWrap, { backgroundColor: avatarColor(`${guest.first_name} ${guest.last_name}`) }]}>
                <Text style={s.gdAvatarText}>
                  {initials(`${guest.first_name} ${guest.last_name}`)}
                </Text>
              </View>
              <Text style={s.gdName}>{guest.first_name} {guest.last_name}</Text>
              {guest.segment_emoji && guest.segment_name && (
                <View style={s.gdSegPill}>
                  <Text style={{ fontSize: 12 }}>{guest.segment_emoji}</Text>
                  <Text style={s.gdSegPillText}>{guest.segment_name}</Text>
                </View>
              )}

              <View style={s.gdStatsRow}>
                <View style={s.gdStatCol}>
                  <Text style={s.gdStatVal}>{fmtNum(guest.coins_balance)}</Text>
                  <Text style={s.gdStatLbl}>МОНЕТ</Text>
                </View>
                <View style={[s.gdStatCol, s.gdStatColMid]}>
                  <Text style={s.gdStatVal}>{guest.frequency}</Text>
                  <Text style={s.gdStatLbl}>ВИЗИТОВ</Text>
                </View>
                <View style={s.gdStatCol}>
                  <Text style={s.gdStatVal}>{guest.recency_days}</Text>
                  <Text style={s.gdStatLbl}>ДН НАЗАД</Text>
                </View>
              </View>
            </View>

            {/* Контакты + ДР */}
            <Text style={s.menuSectionTitle}>Контакты</Text>
            <View style={s.fieldCard}>
              <FieldStatic icon={<Phone size={15} color={C.ink2} strokeWidth={2.2} />} label="Телефон" value={guest.phone ? formatPhone(guest.phone) : '—'} s={s} />
              <FieldStatic
                icon={<Cake size={15} color={C.ink2} strokeWidth={2.2} />}
                label="День рождения"
                value={guest.birthday ? fmtBirthday(guest.birthday) : '—'}
                s={s}
              />
              <FieldStatic
                icon={<Calendar size={15} color={C.ink2} strokeWidth={2.2} />}
                label="В программе с"
                value={fmtRu(guest.registered_at)}
                s={s} last
              />
            </View>

            {/* Монеты — детализация */}
            <Text style={s.menuSectionTitle}>Монеты</Text>
            <View style={s.fieldCard}>
              <View style={s.fieldRow}>
                <View style={[s.fieldIcon, { backgroundColor: C.goodSoft }]}>
                  <TrendingUp size={15} color={C.good} strokeWidth={2.4} />
                </View>
                <View style={s.fieldText}>
                  <Text style={s.fieldLabel}>Заработано всего</Text>
                  <Text style={[s.fieldValue, { color: C.good }]}>+{fmtNum(guest.total_earned)}</Text>
                </View>
              </View>
              <View style={s.fieldRow}>
                <View style={[s.fieldIcon, { backgroundColor: C.warnSoft }]}>
                  <TrendingDown size={15} color={C.warn} strokeWidth={2.4} />
                </View>
                <View style={s.fieldText}>
                  <Text style={s.fieldLabel}>Потрачено всего</Text>
                  <Text style={[s.fieldValue, { color: C.warn }]}>−{fmtNum(guest.total_spent)}</Text>
                </View>
              </View>
              <Pressable
                style={[s.fieldRow, s.fieldRowLast]}
                {...ripple()}
                onPress={() => { haptic('medium'); setAdjustOpen(true); }}
              >
                <View style={[s.fieldIcon, { backgroundColor: C.purpleSoft }]}>
                  <Edit3 size={15} color={C.purpleDeep} strokeWidth={2.4} />
                </View>
                <View style={s.fieldText}>
                  <Text style={[s.fieldLabel, { color: C.purpleDeep }]}>Действие администратора</Text>
                  <Text style={[s.fieldValue, { color: C.purpleDeep }]}>Изменить баланс вручную</Text>
                </View>
                <ChevronLeft size={16} color={C.ink4} strokeWidth={2} style={{ transform: [{ rotate: '180deg' }] }} />
              </Pressable>
            </View>

            {/* VK-статус */}
            <Text style={s.menuSectionTitle}>ВКонтакте</Text>
            <View style={[s.menuCard, { paddingHorizontal: 0 }]}>
              <VkRow
                title="Подписан на сообщество"
                sub="Видит ваши новости в ленте ВК"
                on={guest.vk_status.is_subscribed_community} s={s}
              />
              <VkRow
                title="Получает рассылку"
                sub="Можно отправлять сообщения через Senler"
                on={guest.vk_status.is_subscribed_newsletter} s={s}
              />
              <VkRow
                title="Заблокировал бота"
                sub="Если да — рассылки до него не доходят"
                on={guest.vk_status.is_blocked}
                onLabel="Да, заблокирован" offLabel="Нет, доступен"
                inverted
                last s={s}
              />
            </View>

            {/* Призы и отзывы */}
            <Text style={s.menuSectionTitle}>Активность</Text>
            <View style={s.fieldCard}>
              <FieldStatic
                icon={<Gift size={15} color={C.purpleDeep} strokeWidth={2.2} />}
                label="Подарков получено"
                value={`${guest.prizes_received} · активировано ${guest.prizes_activated}`}
                s={s}
              />
              <FieldStatic
                icon={<Star size={15} color="#F59E0B" strokeWidth={2.2} />}
                label="Оставленных отзывов"
                value={String(guest.reviews_count)}
                s={s}
              />
              <FieldStatic
                icon={<MapPin size={15} color={C.purpleDeep} strokeWidth={2.2} />}
                label="Последний визит"
                value={guest.recent_visits[0] ? `${guest.recent_visits[0].branch_name} · ${relativeTime(guest.recent_visits[0].visited_at)}` : '—'}
                s={s} last
              />
            </View>

            {/* Recent visits */}
            {guest.recent_visits.length > 0 && (
              <>
                <Text style={s.menuSectionTitle}>Последние визиты</Text>
                <View style={[s.menuCard, { paddingHorizontal: 0 }]}>
                  {guest.recent_visits.slice(0, 6).map((v, i, arr) => (
                    <VisitRow v={v} last={i === arr.length - 1} s={s} key={v.id} />
                  ))}
                </View>
              </>
            )}

            {/* Recent coin txns */}
            {guest.recent_txns.length > 0 && (
              <>
                <Text style={s.menuSectionTitle}>История монет</Text>
                <View style={[s.menuCard, { paddingHorizontal: 0 }]}>
                  {guest.recent_txns.slice(0, 8).map((t, i, arr) => (
                    <TxnRow t={t} last={i === arr.length - 1} s={s} key={t.id} />
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      {guest && (
        <CoinAdjustModal
          visible={adjustOpen}
          vkId={guest.vk_id}
          guestName={`${guest.first_name} ${guest.last_name}`}
          currentBalance={guest.coins_balance}
          onClose={() => setAdjustOpen(false)}
          onApplied={(txn, newBalance) => {
            setGuest(prev => prev ? {
              ...prev,
              coins_balance: newBalance,
              total_earned: txn.amount > 0 ? prev.total_earned + txn.amount : prev.total_earned,
              total_spent:  txn.amount < 0 ? prev.total_spent + Math.abs(txn.amount) : prev.total_spent,
              recent_txns: [txn, ...prev.recent_txns],
            } : prev);
          }}
          s={s}
        />
      )}
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────
const FieldStatic: React.FC<{
  icon: React.ReactNode; label: string; value: string; s: S; last?: boolean;
}> = ({ icon, label, value, s, last }) => (
  <View style={[s.fieldRow, last && s.fieldRowLast]}>
    <View style={s.fieldIcon}>{icon}</View>
    <View style={s.fieldText}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text style={s.fieldValue}>{value}</Text>
    </View>
  </View>
);

const VkRow: React.FC<{
  title: string; sub?: string; on: boolean; s: S; last?: boolean;
  onLabel?: string; offLabel?: string;
  // Если inverted — то on=true это «плохое» состояние (красное), off=true это «хорошее»
  inverted?: boolean;
}> = ({ title, sub, on, s, last, onLabel = 'Да', offLabel = 'Нет', inverted = false }) => {
  // Цветовая логика: «хорошо» = зелёный, «плохо» = серый/красный
  const isGood = inverted ? !on : on;
  return (
    <View style={[s.vkStatusRow, last && { borderBottomWidth: 0 }]}>
      <View style={[s.vkStatusIcon, isGood ? s.vkStatusOn : s.vkStatusOff]}>
        {isGood
          ? <Check size={14} color={C.good} strokeWidth={2.6} />
          : <X size={14} color={C.ink3} strokeWidth={2.6} />
        }
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.vkStatusText}>{title}</Text>
        {sub && <Text style={[s.vkStatusText, { fontSize: 11, color: C.ink3, fontFamily: 'Manrope_500Medium', marginTop: 1 }]}>{sub}</Text>}
      </View>
      <View style={[s.vkStatusBadge, isGood ? s.vkStatusBadgeOn : s.vkStatusBadgeOff]}>
        <Text style={[s.vkStatusBadgeText, { color: isGood ? C.surface : C.ink3 }]}>
          {on ? onLabel : offLabel}
        </Text>
      </View>
    </View>
  );
};

const VisitRow: React.FC<{ v: GuestVisit; last?: boolean; s: S }> = ({ v, last, s }) => (
  <View style={[s.visitRow, last && s.visitRowLast]}>
    <View style={s.visitIcon}>
      <MapPin size={14} color={C.purpleDeep} strokeWidth={2.2} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={s.visitBranch} numberOfLines={1} ellipsizeMode="tail">{v.branch_name}</Text>
      <Text style={s.visitMeta}>
        {fmtRu(v.visited_at)}{v.table_number ? ` · стол ${v.table_number}` : ''}
      </Text>
    </View>
    <Text style={s.fieldValueMuted}>{relativeTime(v.visited_at)}</Text>
  </View>
);

const TxnRow: React.FC<{ t: GuestCoinTxn; last?: boolean; s: S }> = ({ t, last, s }) => {
  const isEarn = t.amount > 0;
  return (
    <View style={[s.txnRow, last && s.txnRowLast]}>
      <View style={[s.txnIcon, isEarn ? s.txnIconEarn : s.txnIconSpend]}>
        {isEarn
          ? <Coins size={14} color={C.good} strokeWidth={2.4} />
          : <ArrowDownUp size={14} color={C.warn} strokeWidth={2.4} />
        }
      </View>
      <View style={s.txnDesc}>
        <Text style={s.txnDescTitle} numberOfLines={1}>{t.description ?? sourceLabel(t.source)}</Text>
        <Text style={s.txnDescSub}>{relativeTime(t.created_at)} · баланс {fmtNum(t.balance_after)}</Text>
      </View>
      <Text style={[s.txnAmount, isEarn ? s.txnAmountEarn : s.txnAmountSpend]}>
        {isEarn ? '+' : ''}{fmtNum(t.amount)}
      </Text>
    </View>
  );
};

// ─────────────────────────────────────────────
function fmtBirthday(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  return `${parseInt(m[3], 10)} ${months[parseInt(m[2], 10) - 1]} ${m[1]}`;
}

function fmtRu(iso: string): string {
  const d = new Date(iso);
  const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function sourceLabel(src: string): string {
  const map: Record<string, string> = {
    QR_SCAN:  'QR-сканирование',
    PURCHASE: 'Покупка в магазине',
    GAME:     'Игра',
    QUEST:    'Квест',
    BIRTHDAY: 'Поздравление с ДР',
    ADMIN:    'Корректировка администратором',
    STORY:    'Публикация истории',
    REFERRAL: 'Реферальный бонус',
  };
  return map[src] ?? src;
}
