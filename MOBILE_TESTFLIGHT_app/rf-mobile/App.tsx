/**
 * ЛоялUP · RF — мобильный экран RF-аналитики
 *
 * v4 — добавлена навигация по табам + Reviews.
 *      App.tsx управляет активным табом и держит общий state отзывов.
 *
 * УСТАНОВКА:
 *   npx create-expo-app rf-mobile -t blank-typescript
 *   cd rf-mobile
 *   npx expo install @expo-google-fonts/manrope expo-font expo-splash-screen \
 *     react-native-safe-area-context react-native-svg lucide-react-native \
 *     expo-haptics expo-image-picker
 *   # для web-превью:
 *   npx expo install react-native-web react-dom @expo/metro-runtime
 *   npx expo start --web
 *
 * ПОДКЛЮЧЕНИЕ К РЕАЛЬНОМУ БЭКЕНДУ:
 *   1) src/api.ts — поправь API_BASE
 *   2) src/api.ts — USE_MOCK = false
 *   3) после логина: setAuthToken(jwt) из src/api.ts
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import {
  useFonts,
  Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold,
  Manrope_700Bold, Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';

import { C } from './src/theme';
import { useResponsive } from './src/responsive';
import { makeStyles } from './src/styles';
import { MOCK_REVIEWS, DEFAULT_AUTO_REPLY_SETTINGS, MOCK_MESSAGES } from './src/mocks';
import type { Review, TabKey, AutoReplySettings, ChatMessage, Profile, TenantCompany } from './src/types';
import {
  setupPushHandlers, registerForPushNotifications, addPushResponseListener,
  addPushReceivedListener, sendPushTokenToBackend,
  type PushPayload,
} from './src/push';
import { NotificationsScreen, type NotificationItem, PUSH_TYPE_LABELS } from './src/screens/NotificationsScreen';
import { setAuthToken, logout as apiLogout, submitLead, setApiBase, fetchReviews, fetchAutoReplySettings, fetchNotifications, markNotificationsRead, USE_MOCK, MOCK_TOKEN_PREFIX } from './src/api';
import { storage, STORAGE_KEYS } from './src/storage';
import { subscribe as subscribeRealtime, startMockRealtime } from './src/realtime';
import { registerAssistantNav } from './src/navBridge';
import { OfflineBanner } from './src/components/OfflineBanner';

import { AuthScreen } from './src/screens/AuthScreen';
import { ChoiceScreen } from './src/screens/ChoiceScreen';
import { TenantSelectScreen } from './src/screens/TenantSelectScreen';
import { OnboardingSlideshow } from './src/screens/OnboardingSlideshow';
import { OnboardingChatScreen, type LeadDraft } from './src/screens/OnboardingChatScreen';
import { OnboardingPendingScreen } from './src/screens/OnboardingPendingScreen';
import { AnalyticsScreen } from './src/screens/AnalyticsScreen';
import { ReviewsScreen } from './src/screens/ReviewsScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { MoreScreen } from './src/screens/MoreScreen';
import { BranchRatingsScreen } from './src/screens/BranchRatingsScreen';
import { ReportsScreen } from './src/screens/ReportsScreen';
import { RFThresholdsScreen } from './src/screens/RFThresholdsScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { BirthdaysScreen } from './src/screens/BirthdaysScreen';
import { EngagementAnalyticsScreen } from './src/screens/EngagementAnalyticsScreen';
import { TabBar } from './src/components/TabBar';
import { LoyalchikAssistant } from './src/components/LoyalchikAssistant';
import { SplashGate } from './src/components/SplashGate';

export { setAuthToken } from './src/api';

SplashScreen.preventAutoHideAsync().catch(() => {});

async function checkAndApplyUpdate() {
  if (__DEV__) return;
  try {
    const result = await Updates.checkForUpdateAsync();
    if (result.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    }
  } catch {}
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold,
    Manrope_700Bold, Manrope_800ExtraBold,
  });

  useEffect(() => { checkAndApplyUpdate(); }, []);

  const [splashGone, setSplashGone] = useState(false);

  // Нативный splash прячем не сразу, а когда Lottie-оверлей уже на экране —
  // иначе между нативной заставкой и анимацией мелькнёт пустой кадр.
  const hideNativeSplash = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: C.paper }}>
        <OfflineBanner />
        <AuthGate />
      </View>
      {!splashGone && (
        <SplashGate onReady={hideNativeSplash} onDone={() => setSplashGone(true)} />
      )}
    </SafeAreaProvider>
  );
}

// ── Состояние для незалогиненного потока: choice → slideshow → chat → pending → auth
type AuthFlow = 'choice' | 'slideshow' | 'chat' | 'pending' | 'auth';

// ── Auth gate: либо онбординг/AuthScreen, либо Root ────────────────
function AuthGate() {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  // Выбранная сеть при мультитенантности (null = ещё не выбрана → показать выбор)
  const [activeTenant, setActiveTenant] = useState<TenantCompany | null>(null);

  // Маршрут для незалогиненной части: на старте — choice
  const [flow, setFlow] = useState<AuthFlow>('choice');

  // Данные последней успешной заявки (для pending-экрана)
  const [submittedLead, setSubmittedLead] = useState<LeadDraft | null>(null);

  // При запуске пробуем восстановить токен из storage
  useEffect(() => {
    (async () => {
      try {
        const saved = await storage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        // Выбрасываем залежавшуюся мок-сессию (фейковый токен из прежней
        // demo-сборки с USE_MOCK=true): иначе профиль/данные выглядят «мок»,
        // а реальные запросы уходят с невалидным токеном → 401. Пользователь
        // попадёт на экран логина и войдёт реальными кредами.
        if (saved && saved.startsWith(MOCK_TOKEN_PREFIX)) {
          await storage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
          await storage.removeItem(STORAGE_KEYS.PROFILE);
          await storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
          return;
        }
        const savedProfile = await storage.getItem(STORAGE_KEYS.PROFILE);
        if (saved) {
          setAuthToken(saved);
          setToken(saved);
          if (savedProfile) {
            try {
              const parsedProfile: Profile = JSON.parse(savedProfile);
              setProfile(parsedProfile);
              // Восстанавливаем ранее выбранную сеть (мультитенант) или primary-домен.
              let savedTenant: TenantCompany | null = null;
              try {
                const rawAt = await storage.getItem(STORAGE_KEYS.ACTIVE_TENANT);
                if (rawAt) savedTenant = JSON.parse(rawAt);
              } catch {}
              if (savedTenant?.domain) {
                setActiveTenant(savedTenant);
                setApiBase(savedTenant.domain);
              } else if (parsedProfile.tenant_domain) {
                setApiBase(parsedProfile.tenant_domain);
              }
            } catch {}
          }
        }
      } finally { setBootstrapping(false); }
    })();
  }, []);

  const onAuthorized = useCallback((newToken: string, newProfile: Profile, refresh?: string) => {
    setAuthToken(newToken);
    setToken(newToken);
    setProfile(newProfile);
    // Если backend отдал tenant_domain — переключаем API_BASE
    // на поддомен тенанта для всех последующих запросов (дефолт/primary).
    if (newProfile.tenant_domain) {
      setApiBase(newProfile.tenant_domain);
    }
    // Свежий вход: сбрасываем выбранную сеть. Если сетей >1 — покажем выбор.
    setActiveTenant(null);
    storage.removeItem(STORAGE_KEYS.ACTIVE_TENANT).catch(() => {});
    storage.setItem(STORAGE_KEYS.AUTH_TOKEN, newToken).catch(() => {});
    storage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(newProfile)).catch(() => {});
    if (refresh) {
      storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh).catch(() => {});
    }
  }, []);

  const onLogout = useCallback(async () => {
    try { await apiLogout(); } catch {}
    setAuthToken(null);
    setToken(null);
    setProfile(null);
    setApiBase(null);                       // вернуть API_BASE к default'у
    setActiveTenant(null);
    setFlow('choice');
    await storage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    await storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    await storage.removeItem(STORAGE_KEYS.PROFILE);
    await storage.removeItem(STORAGE_KEYS.ACTIVE_TENANT);
  }, []);

  // Отправка заявки на бэкенд. В USE_MOCK режиме идёт на мок,
  // на проде — реальный POST /api/v1/leads/ + PATCH + /submit/.
  const onSubmitLead = useCallback(async (draft: LeadDraft) => {
    await submitLead({
      cafe_name: draft.cafe_name,
      cafe_count: draft.cafe_count,
      traffic_estimate: draft.traffic_estimate,
      package_suggested: draft.package_suggested,
      full_name: draft.full_name,
      email: draft.email,
      vk_token: draft.vk_token,
      domain_slug: draft.domain_slug,
    });
    setSubmittedLead(draft);
    setFlow('pending');
  }, []);

  // Выбор / переключение сети (только при доступе к нескольким сетям)
  const companies = profile?.companies ?? [];
  const multiTenant = companies.length > 1;

  const handleSelectTenant = useCallback((c: TenantCompany) => {
    setApiBase(c.domain);
    setActiveTenant(c);
    storage.setItem(STORAGE_KEYS.ACTIVE_TENANT, JSON.stringify(c)).catch(() => {});
  }, []);

  const handleSwitchTenant = useCallback(() => {
    // Сбрасываем выбор → снова покажется экран выбора сети
    setActiveTenant(null);
    storage.removeItem(STORAGE_KEYS.ACTIVE_TENANT).catch(() => {});
  }, []);

  if (bootstrapping) return null;
  if (token) {
    if (multiTenant && !activeTenant) {
      return (
        <TenantSelectScreen
          companies={companies}
          currentDomain={activeTenant?.domain ?? null}
          onSelect={handleSelectTenant}
          onLogout={onLogout}
        />
      );
    }
    return (
      <>
        <Root
          key={activeTenant?.domain || profile?.tenant_domain || 'default'}
          onLogout={onLogout}
          onSwitchTenant={multiTenant ? handleSwitchTenant : undefined}
          currentTenantName={activeTenant?.name || profile?.tenant_name || undefined}
        />
        {/* AI Лояльчик — плавает над всеми экранами после входа */}
        <LoyalchikAssistant />
      </>
    );
  }

  // ─── Незалогинены: онбординг или login ───
  switch (flow) {
    case 'auth':
      return (
        <AuthScreen
          onAuthorized={onAuthorized}
          onBack={() => setFlow('choice')}
        />
      );
    case 'slideshow':
      return (
        <OnboardingSlideshow
          onClose={() => setFlow('choice')}
          onFinish={() => setFlow('chat')}
        />
      );
    case 'chat':
      return (
        <OnboardingChatScreen
          onBack={() => setFlow('slideshow')}
          onSubmit={onSubmitLead}
        />
      );
    case 'pending':
      return (
        <OnboardingPendingScreen
          email={submittedLead?.email ?? ''}
          cafeName={submittedLead?.cafe_name ?? ''}
          onBackToStart={() => { setSubmittedLead(null); setFlow('choice'); }}
        />
      );
    case 'choice':
    default:
      return (
        <ChoiceScreen
          onLogin={() => setFlow('auth')}
          onStartOnboarding={() => setFlow('slideshow')}
        />
      );
  }
}

function Root({ onLogout, onSwitchTenant, currentTenantName }: {
  onLogout: () => void;
  onSwitchTenant?: () => void;
  currentTenantName?: string;
}) {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);

  // Default tab: home — дашборд с задачами дня
  const [tab, setTab] = useState<TabKey>('home');

  // Глобальный state отзывов — чтобы badge на табе был синхронизирован с экраном.
  // В проде (USE_MOCK=false) НЕ сеем фейковые отзывы: иначе guard
  // `reviews.length === 0` в ReviewsScreen никогда не пускает реальную
  // загрузку, и тестеры залипают на MOCK_REVIEWS (тот же класс бага, что
  // был в чате с MOCK_MESSAGES).
  const [reviews, setReviews] = useState<Review[]>(USE_MOCK ? MOCK_REVIEWS : []);

  // Настройки автоответов — в App.tsx, чтобы доступ был из MoreScreen
  const [autoReplySettings, setAutoReplySettings] = useState<AutoReplySettings>(DEFAULT_AUTO_REPLY_SETTINGS);

  // Глобальный state чата — для бейджа на табе.
  // В проде (USE_MOCK=false) НЕ сеем фейковый диалог: ChatScreen тянет
  // реальные сообщения с бэка. Раньше тут безусловно стоял MOCK_MESSAGES
  // (7 шт.) → guard `fresh.length >= prev.length` в ChatScreen никогда не
  // пускал реальные 1-2 сообщения, чат показывал моки/пустоту навсегда.
  const [messages, setMessages] = useState<ChatMessage[]>(USE_MOCK ? MOCK_MESSAGES : []);

  // Идентификатор отзыва, выбранного из push-deep-link (передадим в ReviewsScreen)
  const [pushSelectedReviewId, setPushSelectedReviewId] = useState<number | null>(null);

  // Deep-link к конкретному гостю (из поиска) — передадим в MoreScreen → GuestsScreen
  const [pendingGuestVkId, setPendingGuestVkId] = useState<string | null>(null);

  // Deep-link из push — открыть конкретный под-экран MoreScreen
  const [pendingOpenMoreScreen, setPendingOpenMoreScreen] = useState<string | null>(null);

  // Preset фильтра отзывов — когда переходим из Home по карточке (негатив/позитив/драфты)
  const [reviewsPreset, setReviewsPreset] = useState<'urgent' | 'unanswered' | 'replied' | 'drafts' | 'positive' | null>(null);

  // История уведомлений — источник истины БЭКЕНД (ловит и фоновые пуши).
  // AsyncStorage используется как офлайн-кэш для мгновенного показа.
  const NOTIF_KEY = '@loyalup/push_history';
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Подтягиваем историю с сервера: маппим и кэшируем
  const syncNotifications = useCallback(async () => {
    try {
      const { notifications: api, unread } = await fetchNotifications(50);
      const mapped: NotificationItem[] = api.map(n => ({
        id: String(n.id),
        type: n.type as any,
        title: n.title || PUSH_TYPE_LABELS[n.type as keyof typeof PUSH_TYPE_LABELS] || n.type,
        body: n.body,
        receivedAt: n.created_at,
      }));
      // API отдаёт по убыванию created_at; экран сам реверсит — храним по возрастанию
      const asc = [...mapped].reverse();
      setNotifications(asc);
      setUnreadCount(unread);
      storage.setItem(NOTIF_KEY, JSON.stringify(asc)).catch(() => {});
    } catch {}
  }, []);

  // При монтировании: сначала кэш (мгновенно), потом сервер (актуально)
  useEffect(() => {
    storage.getItem(NOTIF_KEY).then(raw => {
      if (raw) { try { setNotifications(JSON.parse(raw)); } catch {} }
    }).catch(() => {});
    syncNotifications();
  }, [syncNotifications]);

  // Overlay-экраны (открываются поверх любого таба)
  const [overlay, setOverlay] = useState<null | 'branch-ratings' | 'reports' | 'rf-thresholds' | 'search' | 'birthdays' | 'engagement' | 'notifications'>(null);

  // Deep-link действия от Лояльчика (плавающий ассистент вне Root) → навигация.
  useEffect(() => {
    const TAB_SCREENS = new Set(['home', 'analytics', 'reviews', 'chat']);
    return registerAssistantNav((action) => {
      setOverlay(null);
      const { screen, params } = action;
      if (screen === 'reviews') {
        setTab('reviews');
        if (params?.reviewId) setPushSelectedReviewId(params.reviewId);
      } else if (TAB_SCREENS.has(screen)) {
        setTab(screen as TabKey);
      } else {
        setTab('more');
        setPendingOpenMoreScreen(screen);
      }
    });
  }, []);

  // Бейдж = только негативные отзывы без ответа (то что реально требует реакции).
  // Совпадает с pendingCount в ReviewsScreen.
  const reviewsBadge = useMemo(
    () => reviews.filter(rev => rev.sentiment === 'NEGATIVE').length,
    [reviews],
  );
  const chatBadge = useMemo(
    () => messages.filter(m => m.sender === 'manager' && m.status !== 'read').length,
    [messages],
  );

  // ── Realtime: подписка на глобальные события чата (badge, новые сообщения,
  //              read-receipts) + старт mock-цикла presence/typing/read.
  useEffect(() => {
    startMockRealtime();
    const unsub = subscribeRealtime((e) => {
      if (e.topic === 'chat:message') {
        setMessages(prev => prev.some(m => m.id === e.message.id) ? prev : [...prev, e.message]);
      } else if (e.topic === 'chat:read') {
        const ids = new Set(e.message_ids);
        setMessages(prev => prev.map(m =>
          (m.sender === 'user' && ids.has(m.id) && m.status !== 'read')
            ? { ...m, status: 'read' } : m
        ));
      }
    });
    return unsub;
  }, []);

  // ── Загружаем реальные отзывы/настройки один раз при монтировании Root,
  //    чтобы badge на табе показывал реальное число, а не MOCK_REVIEWS.
  // Root монтируется только после готовности авторизации (App рендерит его
  // лишь когда token есть, а setAuthToken+setApiBase уже вызваны в bootstrap/
  // onAuthorized), поэтому к этому моменту API_BASE и токен уже настроены —
  // отдельная проверка bootstrapping/token здесь не нужна (этих переменных
  // нет в скоупе Root).
  useEffect(() => {
    fetchReviews({}).then(list => {
      if (list) setReviews(list);
    }).catch(() => {});
    fetchAutoReplySettings().then(s => {
      if (s) setAutoReplySettings(s);
    }).catch(() => {});
  }, []);

  // ── Push: установка handler'ов + регистрация + слушатель тапа ──
  useEffect(() => {
    setupPushHandlers();
    registerForPushNotifications().then(token => {
      if (token) sendPushTokenToBackend(token);
    });
    // Тап по уведомлению (из фона/трея) → навигация + синк истории с сервера
    const handlePushTap = (payload: PushPayload) => {
      syncNotifications();
      switch (payload.type) {
        case 'chat_message':
          setTab('chat');
          break;
        case 'review_new':
        case 'draft_ready':
          setTab('reviews');
          if (payload.review_id) setPushSelectedReviewId(payload.review_id);
          break;
        case 'payment_due':
          setTab('home');
          break;
        case 'report_ready':
          setOverlay('reports');
          break;
        case 'broadcast_done':
          setTab('more'); setPendingOpenMoreScreen('campaigns');
          break;
        case 'daily_code_missing':
        case 'daily_codes':
          setTab('more'); setPendingOpenMoreScreen('daily-codes');
          break;
        case 'staff_invited':
          setTab('more'); setPendingOpenMoreScreen('staff');
          break;
        case 'guest_birthday':
          setOverlay('birthdays');
          break;
      }
    };

    const sub = addPushResponseListener((payload) => handlePushTap(payload));

    // Foreground пуш — сервер уже залогировал, просто синкаем историю
    const recSub = addPushReceivedListener(() => { syncNotifications(); });

    // Пуш по которому приложение было запущено из killed-state
    (async () => {
      try {
        let Notifications: any = null;
        try { Notifications = require('expo-notifications'); } catch {}
        if (!Notifications) return;
        const resp = await Notifications.getLastNotificationResponseAsync();
        if (resp?.notification?.request?.content?.data) {
          const data = resp.notification.request.content.data as PushPayload;
          if (data.type) handlePushTap(data);
        }
      } catch {}
    })();

    return () => { sub?.remove(); recSub?.remove(); };
  }, [syncNotifications]);

  // Overlay-экраны имеют приоритет над табами (но TabBar остаётся)
  if (overlay === 'branch-ratings') {
    return (
      <View style={{ flex: 1 }}>
        <BranchRatingsScreen
          reviews={reviews}
          onBack={() => setOverlay(null)}
          onOpenReviews={(sentiment) => {
            setOverlay(null);
            if (sentiment === 'NEGATIVE' || sentiment === 'PARTIALLY_NEGATIVE') {
              setReviewsPreset('urgent');
            }
            setTab('reviews');
          }}
        />
        <TabBar active={tab} onChange={(t) => { setOverlay(null); setTab(t); }} reviewsBadge={reviewsBadge} chatBadge={chatBadge} s={s} />
      </View>
    );
  }
  if (overlay === 'reports') {
    return (
      <View style={{ flex: 1 }}>
        <ReportsScreen onBack={() => setOverlay(null)} />
        <TabBar active={tab} onChange={(t) => { setOverlay(null); setTab(t); }} reviewsBadge={reviewsBadge} chatBadge={chatBadge} s={s} />
      </View>
    );
  }
  if (overlay === 'rf-thresholds') {
    return (
      <View style={{ flex: 1 }}>
        <RFThresholdsScreen onBack={() => setOverlay(null)} />
        <TabBar active={tab} onChange={(t) => { setOverlay(null); setTab(t); }} reviewsBadge={reviewsBadge} chatBadge={chatBadge} s={s} />
      </View>
    );
  }
  if (overlay === 'search') {
    return (
      <View style={{ flex: 1 }}>
        <SearchScreen
          onBack={() => setOverlay(null)}
          onOpenReview={(id) => { setOverlay(null); setTab('reviews'); setPushSelectedReviewId(id); }}
          onOpenGuest={(vkId) => { setOverlay(null); setPendingGuestVkId(vkId); setTab('more'); }}
          onOpenCatalog={() => { setOverlay(null); setTab('more'); }}
          onOpenQuests={() => { setOverlay(null); setTab('more'); }}
          onOpenPromotions={() => { setOverlay(null); setTab('more'); }}
        />
        <TabBar active={tab} onChange={(t) => { setOverlay(null); setTab(t); }} reviewsBadge={reviewsBadge} chatBadge={chatBadge} s={s} />
      </View>
    );
  }
  if (overlay === 'birthdays') {
    return (
      <View style={{ flex: 1 }}>
        <BirthdaysScreen
          onBack={() => setOverlay(null)}
          onOpenGuest={(vkId) => { setOverlay(null); setPendingGuestVkId(vkId); setTab('more'); }}
        />
        <TabBar active={tab} onChange={(t) => { setOverlay(null); setTab(t); }} reviewsBadge={reviewsBadge} chatBadge={chatBadge} s={s} />
      </View>
    );
  }
  if (overlay === 'engagement') {
    return (
      <View style={{ flex: 1 }}>
        <EngagementAnalyticsScreen onBack={() => setOverlay(null)} />
        <TabBar active={tab} onChange={(t) => { setOverlay(null); setTab(t); }} reviewsBadge={reviewsBadge} chatBadge={chatBadge} s={s} />
      </View>
    );
  }
  if (overlay === 'notifications') {
    return (
      <View style={{ flex: 1 }}>
        <NotificationsScreen
          notifications={notifications}
          onClose={() => setOverlay(null)}
          onTap={(item) => {
            setOverlay(null);
            switch (item.type) {
              case 'review_new': case 'draft_ready': setTab('reviews'); break;
              case 'chat_message': setTab('chat'); break;
              case 'report_ready': setOverlay('reports'); break;
              case 'broadcast_done': setTab('more'); setPendingOpenMoreScreen('campaigns'); break;
              case 'daily_code_missing': case 'daily_codes': setTab('more'); setPendingOpenMoreScreen('daily-codes'); break;
              case 'staff_invited': setTab('more'); setPendingOpenMoreScreen('staff'); break;
              case 'guest_birthday': setOverlay('birthdays'); break;
              default: setTab('home');
            }
          }}
        />
        <TabBar active={tab} onChange={(t) => { setOverlay(null); setTab(t); }} reviewsBadge={reviewsBadge} chatBadge={chatBadge} s={s} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {tab === 'home'      && (
        <HomeScreen
          reviews={reviews}
          messages={messages}
          onNavigate={setTab}
          onOpenReview={(id) => { setTab('reviews'); setPushSelectedReviewId(id); }}
          onOpenReviewsFiltered={(preset) => { setReviewsPreset(preset); setTab('reviews'); }}
          onOpenBranchRatings={() => setOverlay('branch-ratings')}
          onOpenReports={() => setOverlay('reports')}
          onOpenSearch={() => setOverlay('search')}
          onOpenBirthdays={() => setOverlay('birthdays')}
          onOpenEngagement={() => setOverlay('engagement')}
          onOpenDailyCodes={() => { setTab('more'); setPendingOpenMoreScreen('daily-codes'); }}
        />
      )}
      {tab === 'analytics' && (
        <AnalyticsScreen
          onOpenBranchRatings={() => setOverlay('branch-ratings')}
          onOpenThresholds={() => setOverlay('rf-thresholds')}
          onOpenMenu={() => setTab('more')}
          onOpenNotifications={async () => {
            setOverlay('notifications');
            try { if (unreadCount > 0) await markNotificationsRead({ all: true }); } catch {}
            setUnreadCount(0);
            syncNotifications();
          }}
          notificationsBadge={unreadCount > 0 ? unreadCount : undefined}
        />
      )}
      {tab === 'reviews'   && (
        <ReviewsScreen
          reviews={reviews}
          setReviews={setReviews}
          autoOpenReviewId={pushSelectedReviewId}
          onAutoOpenConsumed={() => setPushSelectedReviewId(null)}
          presetFilter={reviewsPreset}
          onPresetConsumed={() => setReviewsPreset(null)}
        />
      )}
      {tab === 'chat'      && <ChatScreen messages={messages} setMessages={setMessages} />}
      {tab === 'more'      && (
        <MoreScreen
          autoReplySettings={autoReplySettings}
          onAutoReplyChange={setAutoReplySettings}
          onOpenChat={() => setTab('chat')}
          reviews={reviews}
          onLogout={onLogout}
          onSwitchTenant={onSwitchTenant}
          currentTenantName={currentTenantName}
          openGuestVkId={pendingGuestVkId}
          onGuestVkIdConsumed={() => setPendingGuestVkId(null)}
          openSubScreen={pendingOpenMoreScreen}
          onSubScreenConsumed={() => setPendingOpenMoreScreen(null)}
        />
      )}

      <TabBar
        active={tab}
        onChange={setTab}
        reviewsBadge={reviewsBadge}
        chatBadge={chatBadge}
        s={s}
      />
    </View>
  );
}
