import { Platform } from 'react-native';
import { API_BASE, USE_MOCK, getAuthToken } from './api';

// expo-notifications + expo-device — необязательные.
// На web функциональность ограничена; на Expo Go на Android SDK 53+ remote push не работает,
// но локальные уведомления (для симулятора) работают везде.
let Notifications: any = null;
let Device: any = null;
try { Notifications = require('expo-notifications'); } catch {}
try { Device = require('expo-device'); } catch {}

// ════════════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS
// ════════════════════════════════════════════════════════════════════

export type PushType =
  | 'review_new'         // новый отзыв
  | 'draft_ready'        // AI-черновик готов
  | 'chat_message'       // сообщение от менеджера ЛоялUP
  | 'payment_due'        // напоминание об оплате тарифа
  | 'report_ready'       // ежемесячный отчёт готов
  | 'staff_invited'      // приглашённый сотрудник принял
  | 'broadcast_done'     // рассылка отправлена
  | 'daily_code_missing' // код дня не сгенерирован
  | 'guest_birthday';    // у постоянного гостя завтра ДР

export interface PushPayload {
  type: PushType;
  review_id?: number;
  message_id?: number;
  broadcast_id?: number;
  staff_id?: number;
  guest_vk_id?: string;
  branch_id?: number;
  // любые доп. поля для будущего
  [k: string]: any;
}

// Устанавливаем глобальный handler — при foreground-push показываем баннер сразу.
// Вызвать ОДИН РАЗ при старте приложения.
export const setupPushHandlers = (): void => {
  if (!Notifications) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch {}
};

// Запрашиваем разрешение и получаем Expo push token.
// Token отправляется на бэк в sendPushTokenToBackend(token) — там бэк хранит и шлёт на него пуши.
// На web/симуляторе токен может быть null — это OK, местные уведомления всё равно работают.
export const registerForPushNotifications = async (): Promise<string | null> => {
  if (!Notifications || Platform.OS === 'web') return null;

  // На физическом устройстве, не на симуляторе
  if (Device && !Device.isDevice) {
    // На симуляторах iOS push не работает, но можно тестить локальные.
    return null;
  }

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let final = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      final = status;
    }
    if (final !== 'granted') return null;

    // На Android — настройка каналов уведомлений (брендовый цвет + приоритеты по типам)
    if (Platform.OS === 'android') {
      try {
        // Основной — обычная важность
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Основные',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#A855F7',
        });
        // Срочный — для негативных отзывов и пропуска оплаты
        await Notifications.setNotificationChannelAsync('urgent', {
          name: 'Срочное (негатив, оплата)',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#DC2626',
        });
        // Тихий — для информационных (отчёт готов, рассылка отправлена)
        await Notifications.setNotificationChannelAsync('info', {
          name: 'Информационные',
          importance: Notifications.AndroidImportance.DEFAULT,
          lightColor: '#9DBA1F',
        });
      } catch {}
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData?.data ?? null;
  } catch {
    return null;
  }
};

// Подписка на тап по уведомлению (когда юзер тапнул — приложение открылось/восстановилось).
// handler получает payload и сам решает, куда перейти.
export const addPushResponseListener = (
  handler: (payload: PushPayload) => void,
): { remove: () => void } | null => {
  if (!Notifications) return null;
  try {
    const sub = Notifications.addNotificationResponseReceivedListener((res: any) => {
      const data = res?.notification?.request?.content?.data ?? {};
      if (data && typeof data === 'object' && 'type' in data) {
        handler(data as PushPayload);
      }
    });
    return { remove: () => sub.remove() };
  } catch {
    return null;
  }
};

// СИМУЛЯТОР — локальное уведомление для разработки / демо.
// Появится из системы как настоящий пуш + payload как у настоящего.
export const simulateLocalPush = async (payload: PushPayload): Promise<void> => {
  if (!Notifications) return;
  const titles: Record<PushType, string> = {
    review_new:         '⭐ Новый отзыв',
    draft_ready:        '🤖 Готов AI-черновик',
    chat_message:       '💬 Сообщение от менеджера',
    payment_due:        '💳 Скоро оплата тарифа',
    report_ready:       '📄 Отчёт за месяц готов',
    staff_invited:      '👤 Сотрудник принял приглашение',
    broadcast_done:     '📨 Рассылка отправлена',
    daily_code_missing: '⚠️ Нет кода дня',
    guest_birthday:     '🎂 Завтра ДР гостя',
  };
  const bodies: Record<PushType, string> = {
    review_new:         'Дмитрий оставил негативный отзыв в Кафе на Набережной',
    draft_ready:        'Черновик ответа на отзыв ждёт вашего подтверждения',
    chat_message:       'Анна Соколова: «Привет! У меня есть вопрос по тарифу»',
    payment_due:        'Тариф «Стандарт» истекает через 5 дней. 4900 ₽',
    report_ready:       'Откройте отчёт чтобы посмотреть итоги месяца',
    staff_invited:      'Ольга Петрова приняла приглашение и вошла в кабинет',
    broadcast_done:     'Доставлено 138 из 145 гостей сегмента VIP риск',
    daily_code_missing: 'На точке Кофейня нет авто-кода. Откройте «Коды дня»',
    guest_birthday:     'Дмитрий Соколов — постоянный гость, ДР завтра. Подготовьте подарок',
  };
  // Подбираем канал
  const channelId =
    payload.type === 'review_new' || payload.type === 'payment_due' || payload.type === 'daily_code_missing'
      ? 'urgent'
      : payload.type === 'broadcast_done' || payload.type === 'report_ready'
        ? 'info'
        : 'default';
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: titles[payload.type],
        body: bodies[payload.type],
        data: payload as any,
        sound: 'default',
        ...(Platform.OS === 'android' ? { channelId } : {}),
      },
      trigger: null, // сразу
    });
  } catch {}
};

// Регистрация токена на бэке.
// На бэке хранится связка (token, platform, staff_id) → сервер шлёт пуши через Expo Push API.
export const sendPushTokenToBackend = async (token: string): Promise<void> => {
  if (!token) return;
  if (USE_MOCK) {
    // В моке просто логируем — реальной отправки нет
    return;
  }
  try {
    const auth = getAuthToken();
    await fetch(new URL('/api/v1/push/register/', API_BASE).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
      },
      body: JSON.stringify({
        token,
        platform: Platform.OS, // 'ios' | 'android' | 'web'
      }),
    });
  } catch {
    // Тихо проглатываем — не блокируем приложение из-за push-регистрации
  }
};

// Снятие регистрации токена (вызвать при logout).
export const unregisterPushToken = async (token: string): Promise<void> => {
  if (!token || USE_MOCK) return;
  try {
    const auth = getAuthToken();
    await fetch(new URL('/api/v1/push/unregister/', API_BASE).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
      },
      body: JSON.stringify({ token }),
    });
  } catch {}
};
