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
import type { Review, TabKey, AutoReplySettings, ChatMessage, Profile } from './src/types';
import {
  setupPushHandlers, registerForPushNotifications, addPushResponseListener,
  sendPushTokenToBackend,
} from './src/push';
import { setAuthToken, logout as apiLogout, submitLead, setApiBase, fetchReviews, fetchAutoReplySettings, USE_MOCK } from './src/api';
import { storage, STORAGE_KEYS } from './src/storage';
import { subscribe as subscribeRealtime, startMockRealtime } from './src/realtime';
import { OfflineBanner } from './src/components/OfflineBanner';

import { AuthScreen } from './src/screens/AuthScreen';
import { ChoiceScreen } from './src/screens/ChoiceScreen';
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

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) await SplashScreen.hideAsync();
  }, [fontsLoaded]);

  useEffect(() => { onLayoutRootView(); }, [onLayoutRootView]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: C.paper }} onLayout={onLayoutRootView}>
        <OfflineBanner />
        <AuthGate />
      </View>
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

  // Маршрут для незалогиненной части: на старте — choice
  const [flow, setFlow] = useState<AuthFlow>('choice');

  // Данные последней успешной заявки (для pending-экрана)
  const [submittedLead, setSubmittedLead] = useState<LeadDraft | null>(null);

  // При запуске пробуем восстановить токен из storage
  useEffect(() => {
    (async () => {
      try {
        const saved = await storage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        const savedProfile = await storage.getItem(STORAGE_KEYS.PROFILE);
        if (saved) {
          setAuthToken(saved);
          setToken(saved);
          if (savedProfile) {
            try {
              const parsedProfile: Profile = JSON.parse(savedProfile);
              setProfile(parsedProfile);
              // Восстанавливаем tenant_domain → переключаем API_BASE
              if (parsedProfile.tenant_domain) {
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
    // на поддомен тенанта для всех последующих запросов.
    if (newProfile.tenant_domain) {
      setApiBase(newProfile.tenant_domain);
    }
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
    setFlow('choice');
    await storage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    await storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    await storage.removeItem(STORAGE_KEYS.PROFILE);
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

  if (bootstrapping) return null;
  if (token) return <Root onLogout={onLogout} />;

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

function Root({ onLogout }: { onLogout: () => void }) {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);

  // Default tab: home — дашборд с задачами дня
  const [tab, setTab] = useState<TabKey>('home');

  // Глобальный state отзывов — чтобы badge на табе был синхронизирован с экраном
  const [reviews, setReviews] = useState<Review[]>(MOCK_REVIEWS);

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

  // Preset фильтра отзывов — когда переходим из Home по карточке (негатив/позитив/драфты)
  const [reviewsPreset, setReviewsPreset] = useState<'urgent' | 'unanswered' | 'replied' | 'drafts' | 'positive' | null>(null);

  // Overlay-экраны (открываются поверх любого таба)
  const [overlay, setOverlay] = useState<null | 'branch-ratings' | 'reports' | 'rf-thresholds' | 'search' | 'birthdays' | 'engagement'>(null);

  // Бейдж = только негативные отзывы без ответа (то что реально требует реакции).
  // Совпадает с pendingCount в ReviewsScreen.
  const reviewsBadge = useMemo(
    () => reviews.filter(rev =>
      !rev.is_replied &&
      (rev.sentiment === 'NEGATIVE' || rev.sentiment === 'PARTIALLY_NEGATIVE')
    ).length,
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

  // ── Загружаем реальные отзывы один раз при старте Root, чтобы badge на табе
  //    показывал реальное число, а не значение из MOCK_REVIEWS.
  useEffect(() => {
    fetchReviews({}).then(list => {
      if (list && list.length >= 0) setReviews(list);
    }).catch(() => {});
    // Подтягиваем реальные настройки автоответа с бэка (не дефолты).
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
    const sub = addPushResponseListener((payload) => {
      // Тап по пушу → переход на нужный таб + (опц.) выбор сущности
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
          setTab('home'); // payment reminder висит на Home
          break;
        case 'report_ready':
          setOverlay('reports');
          break;
        case 'broadcast_done':
        case 'staff_invited':
        case 'daily_code_missing':
        case 'guest_birthday':
          setTab('more'); // открываем «Ещё», там пользователь уже разберётся
          break;
      }
    });
    return () => { sub?.remove(); };
  }, []);

  // Overlay-экраны имеют приоритет над табами (но TabBar остаётся)
  if (overlay === 'branch-ratings') {
    return (
      <View style={{ flex: 1 }}>
        <BranchRatingsScreen
          reviews={reviews}
          onBack={() => setOverlay(null)}
          onOpenReviews={() => { setOverlay(null); setTab('reviews'); }}
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
          onOpenGuest={(_vkId) => { setOverlay(null); setTab('more'); /* MoreScreen → Гости откроет нужного */ }}
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
          onOpenGuest={(_vkId) => { setOverlay(null); setTab('more'); }}
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
        />
      )}
      {tab === 'analytics' && (
        <AnalyticsScreen
          onOpenBranchRatings={() => setOverlay('branch-ratings')}
          onOpenThresholds={() => setOverlay('rf-thresholds')}
          onOpenMenu={() => setTab('more')}
          onOpenNotifications={() => Alert.alert('Уведомления', 'Пока нет новых уведомлений.\n\nПуши о критичных событиях (просрочка тарифа, реактивация R0, новые отзывы) появятся здесь.')}
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
