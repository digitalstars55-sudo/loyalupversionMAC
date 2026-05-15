import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertCircle, Bot, MessageSquare, ChevronRight, TrendingUp, Star, Users,
  Sparkles, Send, BarChart3, Megaphone, ArrowDown, CreditCard, FileText, Search as SearchIcon,
  Cake, Gift,
} from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple } from '../platform';
import { makeStyles } from '../styles';
import { fmtNum, computeBranchRatings, relativeTime } from '../helpers';
import { fetchRFMatrix, fetchSubscription } from '../api';
import { Skeleton } from '../components/Skeleton';
import { PaymentModal } from '../components/PaymentModal';
import type { Review, ChatMessage, RFMatrixResponse, TabKey, SubscriptionStatus } from '../types';
import type { S } from '../styles';

// ════════════════════════════════════════════════════════════════════
// HOME SCREEN — дашборд: задачи дня + KPI + лента активности
// ════════════════════════════════════════════════════════════════════
export const HomeScreen: React.FC<{
  reviews: Review[];
  messages: ChatMessage[];
  onNavigate: (tab: TabKey) => void;
  onOpenReview?: (id: number) => void;
  onOpenReviewsFiltered?: (preset: 'urgent' | 'unanswered' | 'replied' | 'drafts' | 'positive') => void;
  onOpenBranchRatings?: () => void;
  onOpenReports?: () => void;
  onOpenSearch?: () => void;
  onOpenBirthdays?: () => void;
  onOpenEngagement?: () => void;
}> = ({ reviews, messages, onNavigate, onOpenReview, onOpenReviewsFiltered, onOpenBranchRatings, onOpenReports, onOpenSearch, onOpenBirthdays, onOpenEngagement }) => {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);
  const insets = useSafeAreaInsets();

  const [data, setData] = useState<RFMatrixResponse | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const load = async () => {
    try {
      const [res, sub] = await Promise.all([
        fetchRFMatrix({ mode: 'restaurant', trend_days: 30 }),
        fetchSubscription().catch(() => null),
      ]);
      setData(res);
      if (sub) setSubscription(sub);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Платёжное напоминание показываем за 7 дней до даты платежа
  const daysToPayment = subscription
    ? Math.ceil((new Date(subscription.next_payment_at).getTime() - Date.now()) / 86_400_000)
    : null;
  const showPaymentReminder = subscription && !subscription.auto_pay_enabled &&
    daysToPayment !== null && daysToPayment <= 7 && daysToPayment >= 0;
  const isOverdue = daysToPayment !== null && daysToPayment < 0;

  const onRefresh = () => { haptic('light'); setRefreshing(true); load(); };

  // ── Считаем задачи дня ──
  const negPending = useMemo(
    () => reviews.filter(rev =>
      (rev.sentiment === 'NEGATIVE' || rev.sentiment === 'PARTIALLY_NEGATIVE') &&
      !rev.is_replied
    ),
    [reviews]
  );
  const draftsReady = useMemo(
    () => reviews.filter(rev => rev.has_draft && !rev.is_replied),
    [reviews]
  );
  const unreadMgr = useMemo(
    () => messages.filter(m => m.sender === 'manager' && m.status !== 'read').length,
    [messages]
  );
  const pendingPositive = useMemo(
    () => reviews.filter(rev =>
      rev.sentiment === 'POSITIVE' && !rev.is_replied && rev.has_unread
    ).length,
    [reviews]
  );

  const tasksTotal = negPending.length + draftsReady.length + unreadMgr + pendingPositive;

  // Hot segment — VIP риск (R1·F3)
  const hotSeg = data?.matrix.cells['1_3'];
  const branchRatings = data
    ? computeBranchRatings(reviews, data.branches).slice(0, 3)
    : [];

  const greet = greeting();

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="dark" />

      {/* Маленький бейдж в верхнем правом углу — на случай если юзер скроллил вниз */}
      {(showPaymentReminder || isOverdue) && subscription && (
        <Pressable
          style={[s.payCorner, { top: insets.top + 8 }]}
          {...ripple()}
          onPress={() => { haptic('medium'); setPaymentOpen(true); }}
          accessibilityLabel="Оплатить тариф"
        >
          <CreditCard size={12} color={C.warn} strokeWidth={2.4} />
          <Text style={s.payCornerText}>
            {isOverdue ? 'Тариф просрочен' : `Оплата · ${daysToPayment} дн`}
          </Text>
        </Pressable>
      )}

      {/* Иконка поиска — слева сверху (если pay-бейджа нет) или внутри payCorner альтернативой.
          Кладём отдельно слева. */}
      {onOpenSearch && (
        <Pressable
          style={{
            position: 'absolute', top: insets.top + 8, left: r.pad, zIndex: 10,
            width: 40, height: 40, borderRadius: 20, overflow: 'hidden',
            backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
            alignItems: 'center', justifyContent: 'center',
          }}
          {...ripple()}
          onPress={() => { haptic('light'); onOpenSearch(); }}
          accessibilityLabel="Поиск"
        >
          <SearchIcon size={18} color={C.ink} strokeWidth={2.2} />
        </Pressable>
      )}

      <ScrollView
        contentContainerStyle={{
          paddingBottom: 130,
          paddingTop: ((showPaymentReminder || isOverdue) || onOpenSearch) ? 48 : 0,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple} />}
      >
        {/* Greeting */}
        <View style={s.homeGreet}>
          <Text style={s.homeGreetSuper}>{greet.label}</Text>
          <Text style={s.homeGreetMain}>{greet.title}</Text>
          <Text style={s.homeGreetSub}>
            {tasksTotal === 0
              ? 'На сейчас всё под контролем — можно посмотреть аналитику или подготовить рассылку.'
              : `Сегодня нужно разобрать ${tasksTotal} ${plural(tasksTotal, ['задачу', 'задачи', 'задач'])}. Ниже — что важнее всего.`}
          </Text>
        </View>

        {/* Платёжное напоминание */}
        {(showPaymentReminder || isOverdue) && subscription && (
          <View style={s.payReminder}>
            <View style={s.payReminderIcon}>
              <CreditCard size={18} color={C.surface} strokeWidth={2.4} />
            </View>
            <View style={s.payReminderBody}>
              <Text style={s.payReminderTitle}>
                {isOverdue
                  ? 'Тариф просрочен'
                  : `Оплата тарифа через ${daysToPayment} ${plural(daysToPayment ?? 0, ['день', 'дня', 'дней'])}`}
              </Text>
              <Text style={s.payReminderSub} numberOfLines={2}>
                «{subscription.plan_label}» · {fmtNum(subscription.price_rub)} ₽ · продление до {fmtRuDate(addMonth(subscription.paid_until))}
              </Text>
            </View>
            <Pressable
              style={s.payReminderBtn}
              {...ripple('rgba(255,255,255,0.22)')}
              onPress={() => { haptic('medium'); setPaymentOpen(true); }}
            >
              <Text style={s.payReminderBtnText}>ОПЛАТИТЬ</Text>
            </Pressable>
          </View>
        )}

        {/* Tasks card */}
        <View style={s.tasksCard}>
          <View style={s.tasksHeadRow}>
            <Text style={s.tasksTitle}>Задачи дня</Text>
            <Text style={s.tasksCount}>{tasksTotal === 0 ? 'всё закрыто' : `${tasksTotal} шт.`}</Text>
          </View>

          {negPending.length > 0 && (
            <TaskRow
              s={s}
              icon={<AlertCircle size={18} color={C.warn} strokeWidth={2.2} />}
              iconBg={C.warnSoft}
              title="Ответить на негатив"
              sub={`${negPending.length} ${plural(negPending.length, ['отзыв ждёт', 'отзыва ждут', 'отзывов ждут'])}`}
              badge={String(negPending.length)} badgeBg={C.warn} badgeColor={C.surface}
              onPress={() => {
                haptic('medium');
                if (onOpenReviewsFiltered) onOpenReviewsFiltered('urgent');
                else onNavigate('reviews');
              }}
            />
          )}

          {draftsReady.length > 0 && (
            <TaskRow
              s={s}
              icon={<Bot size={18} color={C.purpleDeep} strokeWidth={2.2} />}
              iconBg={C.purpleSoft}
              title="Подтвердить AI-черновики"
              sub={`${draftsReady.length} ${plural(draftsReady.length, ['черновик готов', 'черновика готовы', 'черновиков готовы'])}`}
              badge={String(draftsReady.length)} badgeBg={C.purple} badgeColor={C.surface}
              onPress={() => {
                haptic('medium');
                if (onOpenReviewsFiltered) onOpenReviewsFiltered('drafts');
                else onNavigate('reviews');
              }}
            />
          )}

          {unreadMgr > 0 && (
            <TaskRow
              s={s}
              icon={<MessageSquare size={18} color={C.purpleDeep} strokeWidth={2.2} />}
              iconBg={C.purpleSoft}
              title="Сообщение от менеджера"
              sub={`${unreadMgr} ${plural(unreadMgr, ['непрочитанное', 'непрочитанных', 'непрочитанных'])}`}
              badge={String(unreadMgr)} badgeBg={C.purple} badgeColor={C.surface}
              onPress={() => { haptic('medium'); onNavigate('chat'); }}
            />
          )}

          {pendingPositive > 0 && (
            <TaskRow
              s={s}
              icon={<Sparkles size={18} color={C.limeDeep} strokeWidth={2.2} />}
              iconBg={C.limeSoft}
              title="Поблагодарить гостей"
              sub={`${pendingPositive} ${plural(pendingPositive, ['позитивный отзыв', 'позитивных отзыва', 'позитивных отзывов'])} без ответа`}
              badge={String(pendingPositive)} badgeBg={C.limeDeep} badgeColor={C.ink}
              onPress={() => {
                haptic('light');
                if (onOpenReviewsFiltered) onOpenReviewsFiltered('positive');
                else onNavigate('reviews');
              }}
            />
          )}

          {tasksTotal === 0 && (
            <View style={s.tasksEmpty}>
              <Text style={s.tasksEmptyEmoji}>✨</Text>
              <Text style={s.tasksEmptyText}>Все задачи закрыты — отличная работа!</Text>
            </View>
          )}
        </View>

        {/* KPI snapshot */}
        <Text style={[s.menuSectionTitle, { marginBottom: 8 }]}>Снимок дня</Text>
        <View style={s.snapGrid}>
          {loading ? (
            <>
              <View style={s.snapItem}><Skeleton w="60%" h={11} /><View style={{ height: 8 }} /><Skeleton w="40%" h={26} /></View>
              <View style={s.snapItem}><Skeleton w="60%" h={11} /><View style={{ height: 8 }} /><Skeleton w="40%" h={26} /></View>
              <View style={s.snapItem}><Skeleton w="60%" h={11} /><View style={{ height: 8 }} /><Skeleton w="40%" h={26} /></View>
              <View style={s.snapItem}><Skeleton w="60%" h={11} /><View style={{ height: 8 }} /><Skeleton w="40%" h={26} /></View>
            </>
          ) : data && (
            <>
              <Pressable style={s.snapItem} {...ripple()} onPress={() => onNavigate('analytics')}>
                <View style={s.snapItemHead}>
                  <View style={[s.snapItemIcon, { backgroundColor: C.purpleSoft }]}>
                    <Users size={14} color={C.purpleDeep} strokeWidth={2.2} />
                  </View>
                  <Text style={s.snapItemLabel}>Активная база</Text>
                </View>
                <Text style={s.snapItemVal}>{fmtNum(data.summary.total)}</Text>
                <Text style={s.snapItemSub}>+{(data.summary.total_delta_pct ?? 0).toFixed(1)}% к прошлому</Text>
              </Pressable>

              <Pressable style={s.snapItem} {...ripple()} onPress={() => onNavigate('analytics')}>
                <View style={s.snapItemHead}>
                  <View style={[s.snapItemIcon, { backgroundColor: C.warnSoft }]}>
                    <ArrowDown size={14} color={C.warn} strokeWidth={2.2} />
                  </View>
                  <Text style={s.snapItemLabel}>В зоне риска</Text>
                </View>
                <Text style={s.snapItemVal}>{fmtNum(data.summary.at_risk_r1)}</Text>
                <Text style={s.snapItemSub}>R1 — нужна реактивация</Text>
              </Pressable>

              <Pressable style={s.snapItem} {...ripple()} onPress={() => onNavigate('reviews')}>
                <View style={s.snapItemHead}>
                  <View style={[s.snapItemIcon, { backgroundColor: C.warnSoft }]}>
                    <Star size={14} color={C.warn} strokeWidth={2.2} />
                  </View>
                  <Text style={s.snapItemLabel}>Негатив 7 дн</Text>
                </View>
                <Text style={s.snapItemVal}>
                  {reviews.filter(rev =>
                    (rev.sentiment === 'NEGATIVE' || rev.sentiment === 'PARTIALLY_NEGATIVE') &&
                    !rev.is_replied &&
                    Date.now() - new Date(rev.last_message_at).getTime() < 7 * 86_400_000
                  ).length}
                </Text>
                <Text style={s.snapItemSub}>без ответа</Text>
              </Pressable>

              <Pressable style={s.snapItem} {...ripple()} onPress={() => onNavigate('analytics')}>
                <View style={s.snapItemHead}>
                  <View style={[s.snapItemIcon, { backgroundColor: C.limeSoft }]}>
                    <TrendingUp size={14} color={C.limeDeep} strokeWidth={2.2} />
                  </View>
                  <Text style={s.snapItemLabel}>Чемпионы R3·F3</Text>
                </View>
                <Text style={s.snapItemVal}>{fmtNum(data.summary.active_r3)}</Text>
                <Text style={s.snapItemSub}>{Math.round((data.summary.active_r3 / data.summary.total) * 100)}% от базы</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Hot segment focus */}
        {hotSeg && hotSeg.count > 0 && (
          <View style={[s.tasksCard, { backgroundColor: C.warnSoft, borderColor: '#FCA5A5' }]}>
            <View style={s.tasksHeadRow}>
              <Text style={[s.tasksTitle, { color: C.warn }]}>🚨 Фокус — VIP риск</Text>
              <Text style={s.tasksCount}>R1 · F3</Text>
            </View>
            <Text style={[s.feedSub, { fontSize: 13, marginBottom: 10, lineHeight: 18 }]}>
              {hotSeg.count} {plural(hotSeg.count, ['постоянный гость пропал', 'постоянных гостя пропали', 'постоянных гостей пропали'])} больше чем на 30 дней. Это самый дорогой сегмент — потерять их хуже чем не получить новых.
            </Text>
            <Pressable
              style={[s.btn, s.btnPrimary, { marginTop: 4, marginBottom: 10 }]}
              {...ripple('rgba(255,255,255,0.22)')}
              onPress={() => { haptic('medium'); onNavigate('analytics'); }}
            >
              <Megaphone size={15} color={C.surface} strokeWidth={2.2} />
              <Text style={s.btnPrimaryText}>Открыть в аналитике</Text>
            </Pressable>
          </View>
        )}

        {/* Branch ratings preview */}
        {branchRatings.length > 0 && (
          <>
            <Pressable
              style={s.secHead}
              {...ripple()}
              onPress={() => { haptic('light'); onOpenBranchRatings?.(); }}
            >
              <Text style={s.secTitle}>Топ точек</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={s.secMeta}>подробнее</Text>
                <ChevronRight size={14} color={C.purple} strokeWidth={2.4} />
              </View>
            </Pressable>
            <View style={s.brList}>
              {branchRatings.map((br, i) => (
                <View key={br.branch_id} style={[s.brRow, i === branchRatings.length - 1 && s.brRowLast]}>
                  <Text style={s.brName} numberOfLines={1} ellipsizeMode="tail">{br.branch_name}</Text>
                  <View style={s.brStarsRow}>
                    {[1, 2, 3, 4, 5].map(idx => (
                      <Text
                        key={idx}
                        style={[s.brStar, { color: idx <= Math.round(br.avg_rating) ? '#F59E0B' : C.line }]}
                      >★</Text>
                    ))}
                  </View>
                  <Text style={s.brAvg}>{br.avg_rating.toFixed(1)}</Text>
                  <Text style={s.brCount}>{br.reviews_count} отз.</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Recent activity */}
        <View style={s.secHead}>
          <Text style={s.secTitle}>Последнее</Text>
          <Text style={s.secMeta}>лента событий</Text>
        </View>
        <View style={s.feedCard}>
          {buildActivityFeed(reviews, messages).map((item, i, arr) => (
            <Pressable
              key={item.id}
              style={[s.feedRow, i === arr.length - 1 && s.feedRowLast]}
              {...ripple()}
              onPress={item.onPress}
            >
              <View style={[s.feedIcon, { backgroundColor: item.iconBg }]}>{item.icon}</View>
              <View style={s.feedText}>
                <Text style={s.feedTitle} numberOfLines={1} ellipsizeMode="tail">{item.title}</Text>
                <Text style={s.feedSub} numberOfLines={1} ellipsizeMode="tail">{item.sub}</Text>
              </View>
              <Text style={s.feedTime}>{item.time}</Text>
            </Pressable>
          ))}
        </View>

        {/* Quick actions */}
        <View style={[s.quickActions, { paddingTop: 0 }]}>
          <Pressable style={s.quickAction} {...ripple()} onPress={() => { haptic('light'); onNavigate('analytics'); }}>
            <BarChart3 size={14} color={C.ink} strokeWidth={2.2} />
            <Text style={s.quickActionText}>RF-аналитика</Text>
          </Pressable>
          <Pressable style={s.quickAction} {...ripple()} onPress={() => { haptic('light'); onNavigate('reviews'); }}>
            <Star size={14} color={C.ink} strokeWidth={2.2} />
            <Text style={s.quickActionText}>Все отзывы</Text>
          </Pressable>
          <Pressable style={s.quickAction} {...ripple()} onPress={() => { haptic('light'); onNavigate('chat'); }}>
            <Send size={14} color={C.ink} strokeWidth={2.2} />
            <Text style={s.quickActionText}>Менеджер</Text>
          </Pressable>
          {onOpenReports && (
            <Pressable
              style={[s.quickAction, { backgroundColor: C.purple, borderColor: C.purple }]}
              {...ripple('rgba(255,255,255,0.22)')}
              onPress={() => { haptic('light'); onOpenReports(); }}
            >
              <FileText size={14} color={C.surface} strokeWidth={2.2} />
              <Text style={[s.quickActionText, { color: C.surface }]}>Отчёт PDF</Text>
            </Pressable>
          )}
          {onOpenBirthdays && (
            <Pressable
              style={[s.quickAction, { backgroundColor: C.lime, borderColor: C.lime }]}
              {...ripple()}
              onPress={() => { haptic('light'); onOpenBirthdays(); }}
            >
              <Cake size={14} color={C.ink} strokeWidth={2.2} />
              <Text style={s.quickActionText}>Дни рождения</Text>
            </Pressable>
          )}
          {onOpenEngagement && (
            <Pressable style={s.quickAction} {...ripple()} onPress={() => { haptic('light'); onOpenEngagement(); }}>
              <Gift size={14} color={C.ink} strokeWidth={2.2} />
              <Text style={s.quickActionText}>Подарки и квесты</Text>
            </Pressable>
          )}
          <Pressable style={s.quickAction} {...ripple()} onPress={() => { haptic('light'); onNavigate('more'); }}>
            <ChevronRight size={14} color={C.ink} strokeWidth={2.2} />
            <Text style={s.quickActionText}>Все разделы</Text>
          </Pressable>
        </View>
      </ScrollView>

      {subscription && (
        <PaymentModal
          visible={paymentOpen}
          subscription={subscription}
          s={s}
          onClose={() => setPaymentOpen(false)}
        />
      )}
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────
const TaskRow: React.FC<{
  s: S;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  sub: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
  onPress: () => void;
}> = ({ s, icon, iconBg, title, sub, badge, badgeBg, badgeColor, onPress }) => (
  <Pressable style={s.taskRow} {...ripple()} onPress={onPress}>
    <View style={[s.taskIconWrap, { backgroundColor: iconBg }]}>{icon}</View>
    <View style={s.taskTextWrap}>
      <Text style={s.taskTitle} numberOfLines={1} ellipsizeMode="tail">{title}</Text>
      <Text style={s.taskSub} numberOfLines={1} ellipsizeMode="tail">{sub}</Text>
    </View>
    <View style={[s.taskBadge, { backgroundColor: badgeBg }]}>
      <Text style={[s.taskBadgeText, { color: badgeColor }]}>{badge}</Text>
    </View>
    <ChevronRight size={16} color={C.ink4} strokeWidth={2} />
  </Pressable>
);

// ─────────────────────────────────────────────
function greeting(): { label: string; title: string } {
  const h = new Date().getHours();
  if (h < 6) return { label: 'Ночная смена', title: 'Доброй ночи!' };
  if (h < 12) return { label: 'Доброе утро', title: 'С добрым утром!' };
  if (h < 18) return { label: 'День в разгаре', title: 'Добрый день!' };
  return { label: 'Вечер', title: 'Добрый вечер!' };
}

function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

function fmtRuDate(iso: string): string {
  const d = new Date(iso);
  const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function addMonth(iso: string): string {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

interface FeedItem {
  id: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  sub: string;
  time: string;
  onPress: () => void;
}

function buildActivityFeed(reviews: Review[], messages: ChatMessage[]): FeedItem[] {
  const items: { ts: number; item: FeedItem }[] = [];

  reviews.slice(0, 6).forEach(rev => {
    items.push({
      ts: new Date(rev.last_message_at).getTime(),
      item: {
        id: `rev-${rev.id}`,
        icon: <Star size={14} color={rev.sentiment === 'NEGATIVE' || rev.sentiment === 'PARTIALLY_NEGATIVE' ? C.warn : C.good} strokeWidth={2.2} />,
        iconBg: rev.sentiment === 'NEGATIVE' || rev.sentiment === 'PARTIALLY_NEGATIVE' ? C.warnSoft : C.goodSoft,
        title: rev.customer_name,
        sub: rev.text,
        time: relativeTime(rev.last_message_at),
        onPress: () => {},
      },
    });
  });

  messages.slice(-3).forEach(m => {
    if (m.sender !== 'manager') return;
    items.push({
      ts: new Date(m.created_at).getTime(),
      item: {
        id: `msg-${m.id}`,
        icon: <MessageSquare size={14} color={C.purpleDeep} strokeWidth={2.2} />,
        iconBg: C.purpleSoft,
        title: 'Менеджер',
        sub: m.text,
        time: relativeTime(m.created_at),
        onPress: () => {},
      },
    });
  });

  return items
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 6)
    .map(i => i.item);
}
