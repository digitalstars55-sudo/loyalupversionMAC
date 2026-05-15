/**
 * МуД UP · RF — мобильный экран RF-аналитики (drop-in App.tsx)
 *
 * УСТАНОВКА:
 *   npx create-expo-app rf-mobile -t blank-typescript
 *   cd rf-mobile
 *   npx expo install @expo-google-fonts/manrope expo-font expo-splash-screen \
 *     react-native-safe-area-context react-native-svg lucide-react-native
 *   # для выбора картинки в модалке рассылки (опционально):
 *   npx expo install expo-image-picker
 *   # потом: заменить App.tsx на этот файл и запустить:
 *   npx expo start
 *
 * ПОДКЛЮЧЕНИЕ К РЕАЛЬНОМУ БЭКЕНДУ:
 *   1) ниже, в const API_BASE — укажи домен тенанта
 *   2) USE_MOCK = false
 *   3) после логина: setAuthToken(jwt)
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, RefreshControl,
  Alert, ActivityIndicator, Modal, TextInput, useWindowDimensions,
  KeyboardAvoidingView, Platform, FlatList, Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold,
  Manrope_700Bold, Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import {
  Menu, Bell, ArrowUp, ArrowDown, RefreshCw, SlidersHorizontal,
  Store, Bike, Send, Download, Home, BarChart3, Users,
  MessageSquare, MoreHorizontal, ChevronRight, X as XIcon,
  Image as ImageIcon, Sparkles, Lightbulb,
} from 'lucide-react-native';

// expo-image-picker — необязательная зависимость; если не установлена, показываем подсказку.
let ImagePicker: any = null;
try { ImagePicker = require('expo-image-picker'); } catch {}

SplashScreen.preventAutoHideAsync().catch(() => {});

// ════════════════════════════════════════════════════════════════════
// THEME — бренд МуД UP + нейтрали
// ════════════════════════════════════════════════════════════════════
const C = {
  purple: '#A855F7',
  purpleDeep: '#7E22CE',
  purpleSoft: '#F5EBFE',
  purpleLine: '#E2CFF8',
  lime: '#C5E62D',
  limeDeep: '#9DBA1F',
  limeSoft: '#F4FAD9',
  limeLine: '#E2EFA8',

  bg: '#F5F2EC',
  paper: '#FBFAF6',
  surface: '#FFFFFF',
  ink: '#18181B',
  ink2: '#3F3F46',
  ink3: '#71717A',
  ink4: '#A1A1AA',
  line: '#E5E2D8',
  lineSoft: '#EDEAE0',

  good: '#16A34A',
  goodSoft: '#DCFCE7',
  warn: '#DC2626',
  warnSoft: '#FEE2E2',
  watch: '#EA580C',
  hintBg: '#FFFBEB',
  hintLine: '#FDE68A',
  hintInk: '#92400E',
};

const F = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
};

const SHADOW_CARD = {
  shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 }, elevation: 1,
};
const SHADOW_FAB = {
  shadowColor: C.purple, shadowOpacity: 0.4, shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 }, elevation: 6,
};
const SHADOW_MODAL = {
  shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24,
  shadowOffset: { width: 0, height: -4 }, elevation: 16,
};

// ════════════════════════════════════════════════════════════════════
// RESPONSIVE — масштабирование под iPhone SE … iPad
// ════════════════════════════════════════════════════════════════════
type Resp = {
  width: number; height: number;
  isTiny: boolean;     // < 340 (iPhone SE 1g, маленькие Android)
  isSmall: boolean;    // < 380 (iPhone SE 2g/3g, mini)
  isLarge: boolean;    // >= 430 (Pro Max, большие Android)
  isTablet: boolean;   // >= 600
  scale: (n: number) => number;
  pad: number;
  cardRadius: number;
  kpiCols: 1 | 2 | 4;
  fabBottom: number;
};

function useResponsive(): Resp {
  const { width, height } = useWindowDimensions();
  return useMemo(() => {
    const isTiny = width < 340;
    const isSmall = width < 380;
    const isLarge = width >= 430;
    const isTablet = width >= 600;
    const scale = (n: number) => {
      if (isTablet) return Math.round(n * 1.1);
      if (isLarge) return Math.round(n * 1.04);
      if (isTiny) return Math.round(n * 0.82);
      if (isSmall) return Math.round(n * 0.92);
      return n;
    };
    return {
      width, height, isTiny, isSmall, isLarge, isTablet, scale,
      pad: isTiny ? 14 : isSmall ? 16 : isTablet ? 28 : 20,
      cardRadius: isTablet ? 18 : 14,
      kpiCols: isTablet ? 4 : isTiny ? 1 : 2,
      fabBottom: isTablet ? 100 : 92,
    };
  }, [width, height]);
}

// ════════════════════════════════════════════════════════════════════
// API — клиент под /api/v1/analytics/rf/
// ════════════════════════════════════════════════════════════════════
const USE_MOCK = true;
const API_BASE = 'https://your-tenant.levone.ru';

let _authToken: string | null = null;
export const setAuthToken = (t: string | null) => { _authToken = t; };

type Mode = 'restaurant' | 'delivery';

interface RFThresholds {
  r_fresh_max: number; r_warm_max: number; r_cooling_max: number;
  f_rare_max: number; f_moderate_max: number;
}
interface RLevel { r_score: number; label: string; name: string; range: string; }
interface FLevel { f_score: number; label: string; name: string; range: string; }
interface RFCell {
  r_score: number; f_score: number;
  count: number; pct: number; segment_id: number | null;
}
interface RFSummary {
  total: number; active_r3: number; at_risk_r1: number; lost_r0: number;
  total_delta_pct?: number; active_delta_pct?: number;
  at_risk_delta_pct?: number; lost_delta_pct?: number;
}
interface RFMigration { from: string; to: string; count: number; }
interface RFBranch { id: number; name: string; }

interface RFMatrixResponse {
  thresholds: RFThresholds;
  thresholds_source: 'branch' | 'global' | 'default';
  thresholds_scope_label: string;
  matrix: { r_levels: RLevel[]; f_levels: FLevel[]; cells: Record<string, RFCell>; };
  summary: RFSummary;
  migrations: RFMigration[];
  branches: RFBranch[];
  updated_at: string;
}

interface SegmentInfo {
  name: string;
  code: string;
  sub: string;
  strategy: string;
  hint: string;
}

interface Guest {
  vk_id: string; first_name: string; last_name: string;
  last_visit: string; frequency: number; recency_days: number; coins: number;
}

async function fetchRFMatrix(p: { mode: Mode; branch_ids?: number[]; trend_days?: number }): Promise<RFMatrixResponse> {
  if (USE_MOCK) { await new Promise(r => setTimeout(r, 250)); return MOCK; }
  const url = new URL('/api/v1/analytics/rf/', API_BASE);
  url.searchParams.set('mode', p.mode);
  if (p.branch_ids?.length && !p.branch_ids.includes(0)) url.searchParams.set('branch_ids', p.branch_ids.join(','));
  if (p.trend_days) url.searchParams.set('trend_days', String(p.trend_days));
  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json', ...(_authToken ? { Authorization: `Bearer ${_authToken}` } : {}) },
  });
  if (!res.ok) throw new Error(`RF fetch failed: ${res.status}`);
  return await res.json();
}

async function recalculateRF(p: { mode: Mode; branch_ids: number[] }): Promise<void> {
  if (USE_MOCK) { await new Promise(r => setTimeout(r, 600)); return; }
  const res = await fetch(new URL('/api/v1/analytics/rf/recalculate/', API_BASE).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(_authToken ? { Authorization: `Bearer ${_authToken}` } : {}) },
    body: JSON.stringify({ mode: p.mode, branch_ids: p.branch_ids.filter(id => id !== 0).join(',') }),
  });
  if (!res.ok) throw new Error(`Recalculate failed: ${res.status}`);
}

async function fetchGuests(p: { mode: Mode; r_score: number; f_score: number; branch_ids: number[] }): Promise<Guest[]> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 350));
    // Имитируем разные размеры выборки в зависимости от ячейки
    const n = Math.max(4, Math.min(MOCK_GUESTS.length, 6 + ((p.r_score + p.f_score) * 2)));
    return MOCK_GUESTS.slice(0, n);
  }
  const url = new URL('/api/v1/analytics/rf/', API_BASE);
  url.searchParams.set('mode', p.mode);
  url.searchParams.set('r_score', String(p.r_score));
  url.searchParams.set('f_score', String(p.f_score));
  if (p.branch_ids.length) url.searchParams.set('branch_ids', p.branch_ids.join(','));
  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json', ...(_authToken ? { Authorization: `Bearer ${_authToken}` } : {}) },
  });
  if (!res.ok) throw new Error(`Guests fetch failed: ${res.status}`);
  const data = await res.json();
  return data.guests ?? [];
}

async function generateBroadcastText(p: { segment_id: number }): Promise<string> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 900));
    const drafts = [
      'Привет! Мы по вам соскучились — заглядывайте за чашечкой. На этой неделе для вас наш фирменный десерт в подарок к любому напитку 🍰',
      'Скучаем! Ваш любимый стол ждёт. Покажите это сообщение официанту — и получите комплимент от шефа 🍽',
      'Эй, давно не виделись 👋 Возвращайтесь — у нас обновилось меню, и есть пара блюд именно под ваш вкус.',
    ];
    return drafts[Math.floor(Math.random() * drafts.length)];
  }
  const res = await fetch(new URL('/api/v1/analytics/rf/generate-broadcast-text/', API_BASE).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(_authToken ? { Authorization: `Bearer ${_authToken}` } : {}) },
    body: JSON.stringify({ segment_id: p.segment_id }),
  });
  if (!res.ok) throw new Error(`AI text failed: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.text ?? '';
}

async function sendBroadcast(p: {
  segment_id: number; message_text: string; mode: Mode;
  branch_ids: number[]; image_uri?: string | null;
}): Promise<{ total_sent: number }> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 1200));
    return { total_sent: Math.floor(Math.random() * 200) + 50 };
  }
  const fd = new FormData();
  fd.append('segment_id', String(p.segment_id));
  fd.append('message_text', p.message_text);
  fd.append('mode', p.mode);
  fd.append('branch_ids', p.branch_ids.join(','));
  if (p.image_uri) {
    const filename = p.image_uri.split('/').pop() ?? 'image.jpg';
    const ext = (filename.split('.').pop() ?? 'jpg').toLowerCase();
    fd.append('image', { uri: p.image_uri, name: filename, type: `image/${ext === 'jpg' ? 'jpeg' : ext}` } as any);
  }
  const res = await fetch(new URL('/api/v1/analytics/rf/send-broadcast/', API_BASE).toString(), {
    method: 'POST',
    headers: { ...(_authToken ? { Authorization: `Bearer ${_authToken}` } : {}) },
    body: fd,
  });
  if (!res.ok) throw new Error(`Send failed: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return { total_sent: data.total_sent ?? 0 };
}

// ════════════════════════════════════════════════════════════════════
// MOCK DATA + сегментная мета (имена, стратегии, hint для рассылки)
// ════════════════════════════════════════════════════════════════════
const SEG: Record<string, SegmentInfo> = {
  '3_1': { name: 'Новички', code: 'R3 · F1 — стартовый сегмент',
    sub: 'Недавно пришли и редко возвращались. **Цель — второй визит.**',
    strategy: 'Welcome-серия, обучение программе лояльности. Бонус за первое приглашение друга. Внимание в первые две недели — критично.',
    hint: 'Welcome-серия в первые 3 дня. Не более 1 сообщения в неделю.' },
  '3_2': { name: 'Лояльные', code: 'R3 · F2 — стабильные',
    sub: 'Регулярно посещают, недавний визит. **Поддерживать интерес.**',
    strategy: 'Новинки меню, персональные предложения, события и сезонные блюда. Не пережимайте — гости и так с вами.',
    hint: '1–2 рассылки в месяц. Тон полезный, без агрессивных промо.' },
  '3_3': { name: 'Чемпионы', code: 'R3 · F3 — топ-приоритет',
    sub: 'Лучший сегмент: высокая частота визитов и недавнее посещение. **Удерживать любой ценой.**',
    strategy: 'Награждайте лояльность: эксклюзивные предложения, ранний доступ к новинкам, персональные приглашения. Просите рекомендации и отзывы.',
    hint: 'Не больше 1 рассылки в неделю. Только эксклюзив — скидки убивают ценность.' },
  '2_1': { name: 'Потенциал', code: 'R2 · F1 — растущие',
    sub: 'Гость ещё «тёплый», но уже не активный. **Окно возврата открыто.**',
    strategy: 'Купон с дедлайном, бонус за визит на этой неделе. Без агрессии — гость пока не отвернулся.',
    hint: 'Купон с дедлайном 7 дней. Чёткий триггер для возврата.' },
  '2_2': { name: 'Растущие', code: 'R2 · F2 — переходный',
    sub: 'На пути в R3 F2. **Один шаг до лояльности.**',
    strategy: 'Подарок за 4-й визит, реферальная механика. Вовлеките в накопительную программу.',
    hint: 'Реферальная механика и геймификация. 1 рассылка в 2 недели.' },
  '2_3': { name: 'Постоянные', code: 'R2 · F3 — частые, но не недавно',
    sub: 'Часто ходят, но в последний месяц редко. **Лёгкое напоминание.**',
    strategy: 'Тонкое касание о новинке или акции. Не пережимайте — слишком частые письма раздражают именно эту аудиторию.',
    hint: 'Тонкое касание о новинке. Не чаще 2 раз в месяц.' },
  '1_1': { name: 'Угасают', code: 'R1 · F1 — на грани',
    sub: 'Редкие визиты, давно не были. **Реактивация — последний шанс.**',
    strategy: 'Персональный бонус «давно вас ждём». Если за две недели не сработало — переводим в R0.',
    hint: 'Персональный бонус «давно вас ждём». Дедлайн 14 дней.' },
  '1_2': { name: 'Спящие', code: 'R1 · F2 — пауза',
    sub: 'Ходили нормально — пропали. **Узнайте почему.**',
    strategy: 'Сильный оффер: −20% или подарок к заказу. Короткий опрос в боте — почему перестали приходить.',
    hint: 'Сильный оффер: −20% или подарок. Один раз — без напоминаний.' },
  '1_3': { name: 'VIP риск', code: 'R1 · F3 — критично',
    sub: 'Были частыми гостями. **Высший приоритет на возврат.**',
    strategy: 'Звонок менеджера или персональный бонус от шеф-повара. Эти гости стоили дорого — нельзя терять.',
    hint: 'Звонок менеджера в первую очередь. Письмо — вторым шагом.' },
  '0_1': { name: 'Потерянные', code: 'R0 · F1 — холодный архив',
    sub: 'Давно не были, визитов было мало. **Минимум усилий.**',
    strategy: 'Общая сезонная рассылка раз в квартал. Не тратьте бюджет на индивидуальные кампании.',
    hint: 'Сезонная рассылка раз в квартал. Бюджет на персонализацию не тратьте.' },
  '0_2': { name: 'Уходят', code: 'R0 · F2 — последний шанс',
    sub: 'Были постоянными — ушли надолго. **Финальная попытка.**',
    strategy: 'Сильный оффер + опрос «почему ушли». Дальше — в архив на полгода.',
    hint: 'Финальная попытка: оффер + опрос. Дальше в архив на полгода.' },
  '0_3': { name: 'Не теряем', code: 'R0 · F3 — экс-чемпионы',
    sub: 'Это были чемпионы. **Срочно — личный контакт.**',
    strategy: 'Звонок управляющего, персональное приглашение шефом, индивидуальный комплимент. Только живое касание.',
    hint: 'Только живой контакт: звонок управляющего, личное приглашение.' },
};

const MOCK: RFMatrixResponse = {
  thresholds: { r_fresh_max: 14, r_warm_max: 30, r_cooling_max: 60, f_rare_max: 3, f_moderate_max: 5 },
  thresholds_source: 'global',
  thresholds_scope_label: 'Все точки',
  matrix: {
    r_levels: [
      { r_score: 3, label: 'R3', name: 'Свежие', range: '0–14 дн' },
      { r_score: 2, label: 'R2', name: 'Тёплые', range: '15–30 дн' },
      { r_score: 1, label: 'R1', name: 'Остывают', range: '31–60 дн' },
      { r_score: 0, label: 'R0', name: 'Потеряны', range: '> 60 дн' },
    ],
    f_levels: [
      { f_score: 1, label: 'F1', name: 'Редкие', range: '≤ 3 виз.' },
      { f_score: 2, label: 'F2', name: 'Средние', range: '4–5 виз.' },
      { f_score: 3, label: 'F3', name: 'Частые', range: '6+ виз.' },
    ],
    cells: {
      '3_1': { r_score: 3, f_score: 1, count: 186, pct: 6.5, segment_id: 31 },
      '3_2': { r_score: 3, f_score: 2, count: 214, pct: 7.5, segment_id: 32 },
      '3_3': { r_score: 3, f_score: 3, count: 312, pct: 11.0, segment_id: 33 },
      '2_1': { r_score: 2, f_score: 1, count: 241, pct: 8.5, segment_id: 21 },
      '2_2': { r_score: 2, f_score: 2, count: 198, pct: 7.0, segment_id: 22 },
      '2_3': { r_score: 2, f_score: 3, count: 163, pct: 5.7, segment_id: 23 },
      '1_1': { r_score: 1, f_score: 1, count: 152, pct: 5.3, segment_id: 11 },
      '1_2': { r_score: 1, f_score: 2, count: 128, pct: 4.5, segment_id: 12 },
      '1_3': { r_score: 1, f_score: 3, count: 145, pct: 5.1, segment_id: 13 },
      '0_1': { r_score: 0, f_score: 1, count: 198, pct: 7.0, segment_id: 1 },
      '0_2': { r_score: 0, f_score: 2, count: 94, pct: 3.3, segment_id: 2 },
      '0_3': { r_score: 0, f_score: 3, count: 76, pct: 2.7, segment_id: 3 },
    },
  },
  summary: {
    total: 2847, active_r3: 712, at_risk_r1: 425, lost_r0: 198,
    total_delta_pct: 12.4, active_delta_pct: 4, at_risk_delta_pct: -7, lost_delta_pct: 3,
  },
  migrations: [
    { from: 'Лояльные', to: 'Чемпионы', count: 47 },
    { from: 'Растущие', to: 'Лояльные', count: 28 },
    { from: 'VIP риск', to: 'Постоянные', count: 19 },
    { from: 'Спящие', to: 'Потерянные', count: -34 },
  ],
  branches: [
    { id: 0, name: 'Все точки' },
    { id: 1, name: 'Набережная' },
    { id: 2, name: 'Ленина' },
    { id: 3, name: 'Кофейня' },
    { id: 4, name: 'Шавуха' },
    { id: 5, name: 'Шавуха №2' },
  ],
  updated_at: new Date().toISOString(),
};

const MOCK_GUESTS: Guest[] = [
  { vk_id: '128493022', first_name: 'Анна',     last_name: 'Иванова',    last_visit: '12 апр',  frequency: 8,  recency_days: 22, coins: 340 },
  { vk_id: '203845611', first_name: 'Дмитрий',  last_name: 'Соколов',    last_visit: '08 апр',  frequency: 12, recency_days: 26, coins: 540 },
  { vk_id: '187234509', first_name: 'Екатерина',last_name: 'Морозова',   last_visit: '02 апр',  frequency: 6,  recency_days: 32, coins: 220 },
  { vk_id: '129003721', first_name: 'Игорь',    last_name: 'Никитин',    last_visit: '28 мар',  frequency: 15, recency_days: 37, coins: 690 },
  { vk_id: '210394577', first_name: 'Ольга',    last_name: 'Васильева',  last_visit: '21 мар',  frequency: 4,  recency_days: 44, coins: 160 },
  { vk_id: '155002384', first_name: 'Михаил',   last_name: 'Петров',     last_visit: '18 мар',  frequency: 9,  recency_days: 47, coins: 410 },
  { vk_id: '301488721', first_name: 'Светлана', last_name: 'Кузнецова',  last_visit: '15 мар',  frequency: 7,  recency_days: 50, coins: 280 },
  { vk_id: '274300912', first_name: 'Алексей',  last_name: 'Лебедев',    last_visit: '11 мар',  frequency: 11, recency_days: 54, coins: 460 },
  { vk_id: '199003841', first_name: 'Татьяна',  last_name: 'Новикова',   last_visit: '07 мар',  frequency: 5,  recency_days: 58, coins: 190 },
  { vk_id: '266501823', first_name: 'Кирилл',   last_name: 'Орлов',      last_visit: '03 мар',  frequency: 13, recency_days: 62, coins: 580 },
  { vk_id: '345782901', first_name: 'Юлия',     last_name: 'Смирнова',   last_visit: '27 фев',  frequency: 3,  recency_days: 66, coins: 110 },
  { vk_id: '198772341', first_name: 'Артём',    last_name: 'Романов',    last_visit: '22 фев',  frequency: 10, recency_days: 71, coins: 430 },
  { vk_id: '204477332', first_name: 'Мария',    last_name: 'Громова',    last_visit: '17 фев',  frequency: 6,  recency_days: 76, coins: 240 },
  { vk_id: '301029488', first_name: 'Никита',   last_name: 'Жуков',      last_visit: '12 фев',  frequency: 14, recency_days: 81, coins: 620 },
  { vk_id: '278443210', first_name: 'Алина',    last_name: 'Беляева',    last_visit: '08 фев',  frequency: 4,  recency_days: 85, coins: 170 },
];

const PERIODS = [
  { label: '7 дней', days: 7 },
  { label: '30 дней', days: 30 },
  { label: '90 дней', days: 90 },
  { label: '180 дней', days: 180 },
  { label: 'Год', days: 365 },
];

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════
const fmtNum = (n: number) => n.toLocaleString('ru-RU').replace(/,/g, ' ');

const cellEdgeColor = (r: number, f: number): string => {
  if (r === 3 && f === 3) return C.limeDeep;
  if (r === 3 && f === 2) return C.good;
  if (r === 3 && f === 1) return C.purple;
  if (r === 2 && f === 3) return C.good;
  if (r === 2 && f === 2) return C.limeDeep;
  if (r === 2 && f === 1) return C.purple;
  if (r === 1 && f === 3) return C.watch;
  if (r === 1 && f === 2) return C.ink3;
  if (r === 1 && f === 1) return C.watch;
  if (r === 0 && f === 3) return C.warn;
  if (r === 0 && f === 2) return C.warn;
  return C.ink4;
};

const MdText: React.FC<{ text: string; style?: any; boldStyle?: any }> = ({ text, style, boldStyle }) => {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <Text style={style}>
      {parts.map((p, i) =>
        i % 2 === 1 ? <Text key={i} style={[style, boldStyle]}>{p}</Text> : p
      )}
    </Text>
  );
};

// ════════════════════════════════════════════════════════════════════
// SCREEN
// ════════════════════════════════════════════════════════════════════
function RFScreen() {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);

  const [mode, setMode] = useState<Mode>('restaurant');
  const [periodDays, setPeriodDays] = useState(30);
  const [branchId, setBranchId] = useState(0);
  const [data, setData] = useState<RFMatrixResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [selectedKey, setSelectedKey] = useState('3_3');

  // Модалки
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [guestsLoading, setGuestsLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchRFMatrix({
        mode, branch_ids: branchId === 0 ? [] : [branchId], trend_days: periodDays,
      });
      setData(res);
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message ?? 'Не удалось загрузить аналитику');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mode, branchId, periodDays]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const onRecalculate = () => {
    Alert.alert(
      'Пересчитать RF?',
      'Будут пересчитаны баллы R/F и сегменты для всех гостей. Может занять до минуты.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Пересчитать', style: 'default',
          onPress: async () => {
            setRecalculating(true);
            try {
              await recalculateRF({ mode, branch_ids: branchId === 0 ? [] : [branchId] });
              await load();
              Alert.alert('Готово', 'RF-сегменты обновлены');
            } catch (e: any) {
              Alert.alert('Ошибка', e?.message ?? 'Не удалось пересчитать');
            } finally {
              setRecalculating(false);
            }
          },
        },
      ],
    );
  };

  const selected = useMemo(() => {
    if (!data) return null;
    const cell = data.matrix.cells[selectedKey];
    const info = SEG[selectedKey];
    if (!cell || !info) return null;
    return { cell, info };
  }, [data, selectedKey]);

  const onShowGuests = useCallback(async () => {
    if (!selected) return;
    setGuestsOpen(true);
    setGuestsLoading(true);
    setGuests([]);
    try {
      const list = await fetchGuests({
        mode,
        r_score: selected.cell.r_score,
        f_score: selected.cell.f_score,
        branch_ids: branchId === 0 ? [] : [branchId],
      });
      setGuests(list);
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message ?? 'Не удалось загрузить гостей');
    } finally {
      setGuestsLoading(false);
    }
  }, [selected, mode, branchId]);

  if (loading || !data) {
    return (
      <SafeAreaView style={[s.root, s.center]} edges={['top']}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={C.purple} />
        <Text style={s.loadingText}>Загружаем аналитику…</Text>
      </SafeAreaView>
    );
  }

  const { thresholds: th, summary, migrations, branches, matrix, thresholds_scope_label } = data;
  const periodLabel = PERIODS.find(p => p.days === periodDays)?.label ?? `${periodDays} дн.`;
  const updatedMin = Math.max(1, Math.round((Date.now() - new Date(data.updated_at).getTime()) / 60000));

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="dark" />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple} />}
      >
        {/* Header */}
        <View style={s.header}>
          <Pressable style={s.iconBtn}><Menu size={18} color={C.ink} strokeWidth={2} /></Pressable>
          <View style={s.titleBlock}>
            <Text style={s.titleSuper}>Аналитика</Text>
            <Text style={s.titleMain}>Сегментация RF</Text>
          </View>
          <Pressable style={s.iconBtn}><Bell size={18} color={C.ink} strokeWidth={2} /></Pressable>
        </View>

        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroAccent} />
          <View style={s.heroRow}>
            <Text style={s.heroLabel} numberOfLines={1}>
              {`${thresholds_scope_label.toUpperCase()} · ${periodLabel.toUpperCase()}`}
            </Text>
            <Text style={s.heroPeriod}>обновлено <Text style={s.heroPeriodB}>{updatedMin} мин</Text></Text>
          </View>
          <View style={s.heroStat}>
            <Text style={s.heroNum} numberOfLines={1} adjustsFontSizeToFit>{fmtNum(summary.total)}</Text>
            <Text style={s.heroLbl}>АКТИВНЫХ{'\n'}ГОСТЕЙ</Text>
          </View>
          <View style={s.heroTrend}>
            <View style={s.heroPill}>
              <ArrowUp size={11} color={C.ink} strokeWidth={2.5} />
              <Text style={s.heroPillText}>+{summary.total_delta_pct?.toFixed(1) ?? '0.0'}%</Text>
            </View>
            <Text style={s.heroTrendText}>к прошлому периоду</Text>
          </View>
        </View>

        {/* Period + mode */}
        <View style={s.filterBlock}>
          <Text style={s.filterLabel}>Период</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
            {PERIODS.map(p => (
              <Chip key={p.days} active={periodDays === p.days} onPress={() => setPeriodDays(p.days)} s={s}>
                {p.label}
              </Chip>
            ))}
          </ScrollView>

          <View style={s.segmented}>
            <SegBtn
              active={mode === 'restaurant'}
              onPress={() => setMode('restaurant')}
              icon={<Store size={14} color={mode === 'restaurant' ? C.surface : C.ink3} strokeWidth={2} />}
              label="Ресторан"
              s={s}
            />
            <SegBtn
              active={mode === 'delivery'}
              onPress={() => setMode('delivery')}
              icon={<Bike size={14} color={mode === 'delivery' ? C.surface : C.ink3} strokeWidth={2} />}
              label="Доставка"
              s={s}
            />
          </View>
        </View>

        {/* Branches */}
        <View style={s.filterBlock}>
          <Text style={s.filterLabel}>Площадка</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
            {branches.map(b => (
              <Chip key={b.id} active={branchId === b.id} onPress={() => setBranchId(b.id)} s={s}>
                {b.name}
              </Chip>
            ))}
          </ScrollView>
        </View>

        {/* Thresholds */}
        <Pressable style={s.thresholds} onPress={() => Alert.alert('Пороги', 'Открыть редактирование RFSettings')}>
          <View style={s.thIcon}><SlidersHorizontal size={16} color={C.ink} strokeWidth={2} /></View>
          <View style={s.thText}>
            <Text style={s.thTitle}>АКТИВНЫЕ ПОРОГИ</Text>
            <View style={s.thValRow}>
              <Text style={s.thVal}>R3 </Text><Text style={s.thCode}>≤ {th.r_fresh_max} дн</Text>
              <Text style={s.thVal}> · R2 </Text><Text style={s.thCode}>≤ {th.r_warm_max} дн</Text>
              <Text style={s.thVal}> · R1 </Text><Text style={s.thCode}>≤ {th.r_cooling_max} дн</Text>
            </View>
            <View style={s.thValRow}>
              <Text style={s.thVal}>F1 </Text><Text style={s.thCode}>≤ {th.f_rare_max}</Text>
              <Text style={s.thVal}> · F2 </Text><Text style={s.thCode}>≤ {th.f_moderate_max}</Text>
            </View>
          </View>
          <ChevronRight size={20} color={C.ink3} strokeWidth={2} />
        </Pressable>

        {/* KPI grid */}
        <View style={s.kpiGrid}>
          <KPI tone="ink" label="Всего" value={fmtNum(summary.total)}
               sub="активных гостей" delta={summary.total_delta_pct ?? 0} s={s} />
          <KPI tone="purple" label="Активные · R3" value={fmtNum(summary.active_r3)}
               sub={`${Math.round((summary.active_r3 / summary.total) * 100)}% от базы`}
               delta={summary.active_delta_pct ?? 0} s={s} />
          <KPI tone="watch" label="В зоне риска" value={fmtNum(summary.at_risk_r1)}
               sub="R1 — нужна реактивация" delta={summary.at_risk_delta_pct ?? 0} s={s} />
          <KPI tone="muted" label="Потерянные" value={fmtNum(summary.lost_r0)}
               sub="R0 · > 60 дн." delta={summary.lost_delta_pct ?? 0} s={s} />
        </View>

        {/* Matrix */}
        <View style={s.secHead}>
          <Text style={s.secTitle}>Матрица сегментов</Text>
          <Text style={s.secMeta}>3 × 4 · 12</Text>
        </View>
        <View style={s.matrixCard}>
          <View style={s.matrixRow}>
            <View style={s.axisCorner}><Text style={s.axisCornerText}>R/F</Text></View>
            {matrix.f_levels.map(fl => (
              <View key={fl.f_score} style={s.fHeader}>
                <Text style={s.mhLbl}>{fl.label}</Text>
                <Text style={s.mhNm}>{fl.name}</Text>
                <Text style={s.mhRng}>{fl.range}</Text>
              </View>
            ))}
          </View>
          {matrix.r_levels.map(rl => (
            <View key={rl.r_score} style={s.matrixRow}>
              <View style={s.rHeader}>
                <Text style={s.mhLbl}>{rl.label}</Text>
                <Text style={s.mhRng}>{rl.range}</Text>
              </View>
              {matrix.f_levels.map(fl => {
                const key = `${rl.r_score}_${fl.f_score}`;
                const cell = matrix.cells[key];
                const info = SEG[key];
                if (!cell || !info) return <View key={key} style={s.cell} />;
                return (
                  <Cell
                    key={key} cell={cell} name={info.name}
                    selected={selectedKey === key}
                    edgeColor={cellEdgeColor(rl.r_score, fl.f_score)}
                    onPress={() => setSelectedKey(key)}
                    s={s}
                  />
                );
              })}
            </View>
          ))}
        </View>

        {/* Detail */}
        {selected && (
          <DetailCard
            cell={selected.cell}
            info={selected.info}
            onBroadcast={() => setBroadcastOpen(true)}
            onSenler={() => Alert.alert('Senler', `Скачать TXT с VK ID для сегмента "${selected.info.name}"`)}
            onShowGuests={onShowGuests}
            s={s}
            r={r}
          />
        )}

        {/* Migrations */}
        <View style={s.secHead}>
          <Text style={s.secTitle}>Миграции</Text>
          <Text style={s.secMeta}>за {periodDays} дней</Text>
        </View>
        <View style={s.migrations}>
          {migrations.map((m, i) => (
            <View key={i} style={[s.migRow, i === migrations.length - 1 && s.migRowLast]}>
              <Text style={s.migFrom} numberOfLines={1}>{m.from}</Text>
              <Text style={s.migArrow}>→</Text>
              <Text style={[s.migTo, m.count < 0 && { color: C.warn }]} numberOfLines={1}>{m.to}</Text>
              <View style={[s.migCount, m.count < 0 ? s.migCountNeg : s.migCountPos]}>
                <Text style={[s.migCountText, m.count < 0 ? s.migCountTextNeg : s.migCountTextPos]}>
                  {m.count > 0 ? `+${m.count}` : `${m.count}`}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* FAB */}
      <Pressable style={s.fab} onPress={onRecalculate} disabled={recalculating}>
        {recalculating
          ? <ActivityIndicator color={C.surface} size="small" />
          : <RefreshCw size={20} color={C.surface} strokeWidth={2} />
        }
      </Pressable>

      {/* Tab bar */}
      <View style={s.tabbar}>
        <Tab icon={<Home size={20} color={C.ink4} strokeWidth={2} />} label="Главная" s={s} />
        <Tab icon={<BarChart3 size={20} color={C.purple} strokeWidth={2} />} label="Аналитика" active s={s} />
        <Tab icon={<Users size={20} color={C.ink4} strokeWidth={2} />} label="Гости" s={s} />
        <Tab icon={<MessageSquare size={20} color={C.ink4} strokeWidth={2} />} label="Кампании" badge="3" s={s} />
        <Tab icon={<MoreHorizontal size={20} color={C.ink4} strokeWidth={2} />} label="Ещё" s={s} />
      </View>

      {/* Broadcast Modal */}
      <BroadcastModal
        visible={broadcastOpen}
        onClose={() => setBroadcastOpen(false)}
        cell={selected?.cell ?? null}
        info={selected?.info ?? null}
        mode={mode}
        branchIds={branchId === 0 ? [] : [branchId]}
        s={s}
        r={r}
      />

      {/* Guest List Modal */}
      <GuestListModal
        visible={guestsOpen}
        onClose={() => setGuestsOpen(false)}
        info={selected?.info ?? null}
        cell={selected?.cell ?? null}
        guests={guests}
        loading={guestsLoading}
        s={s}
        r={r}
      />
    </SafeAreaView>
  );
}

// ════════════════════════════════════════════════════════════════════
// SUBCOMPONENTS
// ════════════════════════════════════════════════════════════════════
type S = ReturnType<typeof makeStyles>;

const Chip: React.FC<{ active?: boolean; onPress: () => void; children?: React.ReactNode; s: S }> = ({ active, onPress, children, s }) => (
  <Pressable style={[s.chip, active && s.chipActive]} onPress={onPress}>
    <Text style={[s.chipText, active && s.chipTextActive]}>{children}</Text>
  </Pressable>
);

const SegBtn: React.FC<{ active: boolean; onPress: () => void; icon: React.ReactNode; label: string; s: S }> = ({ active, onPress, icon, label, s }) => (
  <Pressable style={[s.seg, active && s.segActive]} onPress={onPress}>
    {icon}
    <Text style={[s.segText, active && s.segTextActive]}>{label}</Text>
  </Pressable>
);

type KPITone = 'ink' | 'purple' | 'watch' | 'muted';
const KPI: React.FC<{ tone: KPITone; label: string; value: string; sub: string; delta: number; s: S }> = ({ tone, label, value, sub, delta, s }) => {
  const accent = tone === 'ink' ? C.ink : tone === 'purple' ? C.purple : tone === 'watch' ? C.watch : C.ink3;
  const valueColor = tone === 'purple' ? C.purpleDeep : tone === 'watch' ? C.watch : C.ink;
  const up = delta >= 0;
  return (
    <View style={s.kpi}>
      <View style={[s.kpiAccent, { backgroundColor: accent }]} />
      <View style={[s.kpiTrend, up ? s.kpiTrendUp : s.kpiTrendDown]}>
        {up ? <ArrowUp size={10} color={C.good} strokeWidth={2.5} /> : <ArrowDown size={10} color={C.warn} strokeWidth={2.5} />}
        <Text style={[s.kpiTrendText, { color: up ? C.good : C.warn }]}>{Math.abs(delta)}%</Text>
      </View>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={[s.kpiVal, { color: valueColor }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={s.kpiSub}>{sub}</Text>
    </View>
  );
};

const Cell: React.FC<{ cell: RFCell; name: string; selected: boolean; edgeColor: string; onPress: () => void; s: S }> = ({ cell, name, selected, edgeColor, onPress, s }) => (
  <Pressable style={[s.cell, selected && s.cellSelected]} onPress={onPress}>
    <View style={[s.cellEdge, { backgroundColor: edgeColor }]} />
    <Text style={s.cellEm} numberOfLines={1} adjustsFontSizeToFit>{name.toUpperCase()}</Text>
    <Text style={s.cellNm}>R{cell.r_score} F{cell.f_score}</Text>
    <Text style={[s.cellCt, selected && { color: C.purpleDeep }]} numberOfLines={1} adjustsFontSizeToFit>{fmtNum(cell.count)}</Text>
    <Text style={s.cellPc}>{cell.pct.toFixed(1)}%</Text>
  </Pressable>
);

const DetailCard: React.FC<{
  cell: RFCell;
  info: SegmentInfo;
  onBroadcast: () => void;
  onSenler: () => void;
  onShowGuests: () => void;
  s: S;
  r: Resp;
}> = ({ cell, info, onBroadcast, onSenler, onShowGuests, s, r }) => (
  <View style={s.detail}>
    <View style={s.detailEyebrow}>
      <View style={s.detailEyebrowDot} />
      <Text style={s.detailEyebrowText}>{info.code}</Text>
    </View>
    <Text style={s.detailName}>{info.name}</Text>
    <MdText text={info.sub} style={s.detailSub} boldStyle={{ color: C.ink, fontFamily: F.bold }} />

    <View style={s.detailStats}>
      <View style={[s.ds, s.dsLeft]}>
        <Text style={s.dsVal} numberOfLines={1} adjustsFontSizeToFit>{fmtNum(cell.count)}</Text>
        <Text style={s.dsLbl}>гостей</Text>
      </View>
      <View style={[s.ds, s.dsRight]}>
        <Text style={s.dsVal} numberOfLines={1} adjustsFontSizeToFit>{cell.pct.toFixed(1)}%</Text>
        <Text style={s.dsLbl}>от базы</Text>
      </View>
    </View>

    {/* Hint — подсказка по рассылке (как в вебе) */}
    {info.hint && (
      <View style={s.hint}>
        <View style={s.hintHeader}>
          <Lightbulb size={11} color={C.hintInk} strokeWidth={2.5} />
          <Text style={s.hintTitle}>ПОДСКАЗКА ПО РАССЫЛКЕ</Text>
        </View>
        <Text style={s.hintText}>{info.hint}</Text>
      </View>
    )}

    {/* Strategy */}
    <View style={s.strategy}>
      <View style={s.strategyTitle}>
        <View style={s.strategyDot} />
        <Text style={s.strategyTitleText}>СТРАТЕГИЯ</Text>
      </View>
      <Text style={s.strategyText}>{info.strategy}</Text>
    </View>

    {/* Show guests button */}
    {cell.count > 0 && (
      <Pressable style={s.showGuestsBtn} onPress={onShowGuests}>
        <Users size={14} color={C.ink} strokeWidth={2} />
        <Text style={s.showGuestsText}>Показать гостей</Text>
        <View style={s.showGuestsBadge}>
          <Text style={s.showGuestsBadgeText}>{fmtNum(cell.count)}</Text>
        </View>
      </Pressable>
    )}

    {/* Actions: на узком — стек, на нормальном — рядом */}
    <View style={[s.actions, r.isTiny && s.actionsStack]}>
      <Pressable style={[s.btn, s.btnPrimary]} onPress={onBroadcast}>
        <Send size={14} color={C.surface} strokeWidth={2} />
        <Text style={s.btnPrimaryText}>Рассылка</Text>
      </Pressable>
      <Pressable style={[s.btn, s.btnSecondary]} onPress={onSenler}>
        <Download size={14} color={C.ink} strokeWidth={2} />
        <Text style={s.btnSecondaryText}>Senler</Text>
      </Pressable>
    </View>
  </View>
);

const Tab: React.FC<{ icon: React.ReactNode; label: string; active?: boolean; badge?: string; s: S }> = ({ icon, label, active, badge, s }) => (
  <Pressable style={s.tab}>
    {active && <View style={s.tabIndicator} />}
    {icon}
    <Text style={[s.tabLabel, active && s.tabLabelActive]}>{label}</Text>
    {badge && <View style={s.tabBadge}><Text style={s.tabBadgeText}>{badge}</Text></View>}
  </Pressable>
);

// ════════════════════════════════════════════════════════════════════
// BROADCAST MODAL
// ════════════════════════════════════════════════════════════════════
const BroadcastModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  cell: RFCell | null;
  info: SegmentInfo | null;
  mode: Mode;
  branchIds: number[];
  s: S;
  r: Resp;
}> = ({ visible, onClose, cell, info, mode, branchIds, s, r }) => {
  const [text, setText] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ msg: string; type: 'success' | 'error' | 'loading' } | null>(null);

  useEffect(() => {
    if (visible) {
      setText('');
      setImageUri(null);
      setStatus(null);
      setAiLoading(false);
      setSending(false);
    }
  }, [visible]);

  if (!cell || !info) return null;

  const segId = cell.segment_id;
  const overChars = text.length > 4096;
  const sendDisabled = sending || aiLoading || !text.trim() || overChars || !segId;

  const onAi = async () => {
    if (!segId) return;
    setAiLoading(true);
    setStatus({ msg: 'AI генерирует текст рассылки…', type: 'loading' });
    try {
      const t = await generateBroadcastText({ segment_id: segId });
      setText(t);
      setStatus({ msg: '✓ Текст готов — проверьте и отправьте', type: 'success' });
    } catch (e: any) {
      setStatus({ msg: e?.message ?? 'Не удалось сгенерировать', type: 'error' });
    } finally {
      setAiLoading(false);
    }
  };

  const onPickImage = async () => {
    if (!ImagePicker) {
      Alert.alert(
        'Нужна установка',
        'Для выбора картинки выполните:\n\nnpx expo install expo-image-picker\n\nи перезапустите приложение.',
      );
      return;
    }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Доступ запрещён', 'Разрешите доступ к фото в настройках.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? 'images',
        allowsEditing: false,
        quality: 0.85,
      });
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (!asset?.uri) return;
      // Лимит 5МБ
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        Alert.alert('Файл слишком большой', 'Максимум 5 МБ.');
        return;
      }
      setImageUri(asset.uri);
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message ?? 'Не удалось выбрать файл');
    }
  };

  const onSend = async () => {
    if (!segId || sendDisabled) return;
    Alert.alert(
      'Отправить рассылку?',
      `Сегмент «${info.name}» — ${fmtNum(cell.count)} гостей`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Отправить', style: 'default',
          onPress: async () => {
            setSending(true);
            setStatus({ msg: 'Рассылка отправляется, подождите…', type: 'loading' });
            try {
              const res = await sendBroadcast({
                segment_id: segId, message_text: text.trim(),
                mode, branch_ids: branchIds, image_uri: imageUri,
              });
              setStatus({ msg: `✅ Отправлено ${res.total_sent} сообщений`, type: 'success' });
              setTimeout(onClose, 1800);
            } catch (e: any) {
              setStatus({ msg: e?.message ?? 'Ошибка отправки', type: 'error' });
            } finally {
              setSending(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.modalRoot}
      >
        <Pressable style={s.modalBackdrop} onPress={onClose} />
        <View style={s.modalSheet}>
          {/* Drag handle */}
          <View style={s.modalHandle} />

          <View style={s.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.modalSuper}>РАССЫЛКА</Text>
              <Text style={s.modalTitle} numberOfLines={1}>{info.name}</Text>
            </View>
            <Pressable style={s.modalClose} onPress={onClose}>
              <XIcon size={18} color={C.ink} strokeWidth={2.2} />
            </Pressable>
          </View>

          <ScrollView
            style={s.modalBody}
            contentContainerStyle={s.modalBodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Segment info row */}
            <View style={s.modalSegInfo}>
              <View style={s.modalSegBadge}>
                <View style={s.modalSegDot} />
                <Text style={s.modalSegBadgeText}>{info.code}</Text>
              </View>
              <Text style={s.modalSegCount}>{fmtNum(cell.count)} гостей</Text>
            </View>

            {/* Hint */}
            {info.hint && (
              <View style={s.modalHint}>
                <View style={s.modalHintHeader}>
                  <Lightbulb size={11} color={C.hintInk} strokeWidth={2.5} />
                  <Text style={s.modalHintTitle}>ПОДСКАЗКА</Text>
                </View>
                <Text style={s.modalHintText}>{info.hint}</Text>
              </View>
            )}

            {/* Textarea */}
            <View style={s.modalInputWrap}>
              <TextInput
                style={s.modalTextarea}
                multiline
                placeholder="Введите текст рассылки или нажмите «AI текст»…"
                placeholderTextColor={C.ink4}
                value={text}
                onChangeText={setText}
                textAlignVertical="top"
                maxLength={5000}
              />
            </View>
            <Text style={[s.modalCharCount, overChars && s.modalCharCountOver]}>
              {text.length} / 4096
            </Text>

            {/* Image picker / preview */}
            {imageUri ? (
              <View style={s.modalImagePreview}>
                <Image source={{ uri: imageUri }} style={s.modalImage} resizeMode="cover" />
                <Pressable style={s.modalImageRemove} onPress={() => setImageUri(null)}>
                  <XIcon size={14} color={C.surface} strokeWidth={2.5} />
                </Pressable>
              </View>
            ) : (
              <Pressable style={s.modalImageDrop} onPress={onPickImage}>
                <ImageIcon size={22} color={C.ink3} strokeWidth={1.6} />
                <Text style={s.modalImageDropText}>Прикрепить изображение</Text>
                <Text style={s.modalImageDropHint}>JPG, PNG до 5 МБ</Text>
              </Pressable>
            )}

            {/* Status */}
            {status && (
              <View style={[
                s.modalStatus,
                status.type === 'success' && s.modalStatusOk,
                status.type === 'error' && s.modalStatusErr,
                status.type === 'loading' && s.modalStatusLoad,
              ]}>
                <Text style={[
                  s.modalStatusText,
                  status.type === 'success' && { color: C.good },
                  status.type === 'error' && { color: C.warn },
                  status.type === 'loading' && { color: C.ink3 },
                ]}>{status.msg}</Text>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={[s.modalFooter, r.isTiny && s.actionsStack]}>
            <Pressable
              style={[s.btn, s.btnAi, (aiLoading || sending) && { opacity: 0.5 }]}
              onPress={onAi}
              disabled={aiLoading || sending || !segId}
            >
              {aiLoading
                ? <ActivityIndicator size="small" color={C.purpleDeep} />
                : <Sparkles size={14} color={C.purpleDeep} strokeWidth={2} />
              }
              <Text style={s.btnAiText}>AI текст</Text>
            </Pressable>
            <Pressable
              style={[s.btn, s.btnPrimary, sendDisabled && { opacity: 0.5 }]}
              onPress={onSend}
              disabled={sendDisabled}
            >
              {sending
                ? <ActivityIndicator size="small" color={C.surface} />
                : <Send size={14} color={C.surface} strokeWidth={2} />
              }
              <Text style={s.btnPrimaryText}>Отправить</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ════════════════════════════════════════════════════════════════════
// GUEST LIST MODAL
// ════════════════════════════════════════════════════════════════════
const GuestListModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  info: SegmentInfo | null;
  cell: RFCell | null;
  guests: Guest[];
  loading: boolean;
  s: S;
  r: Resp;
}> = ({ visible, onClose, info, cell, guests, loading, s, r }) => {
  if (!info || !cell) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.modalRoot}>
        <Pressable style={s.modalBackdrop} onPress={onClose} />
        <View style={[s.modalSheet, s.modalSheetTall]}>
          <View style={s.modalHandle} />

          <View style={s.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.modalSuper}>{info.code}</Text>
              <Text style={s.modalTitle} numberOfLines={1}>{info.name}</Text>
            </View>
            <View style={s.guestCountChip}>
              <Text style={s.guestCountChipText}>
                {loading ? '…' : `${fmtNum(guests.length)} / ${fmtNum(cell.count)}`}
              </Text>
            </View>
            <Pressable style={s.modalClose} onPress={onClose}>
              <XIcon size={18} color={C.ink} strokeWidth={2.2} />
            </Pressable>
          </View>

          {loading ? (
            <View style={s.guestsEmpty}>
              <ActivityIndicator color={C.purple} />
              <Text style={s.guestsEmptyText}>Загружаем гостей…</Text>
            </View>
          ) : guests.length === 0 ? (
            <View style={s.guestsEmpty}>
              <Users size={36} color={C.ink4} strokeWidth={1.5} />
              <Text style={s.guestsEmptyText}>В этом сегменте пока нет гостей</Text>
            </View>
          ) : (
            <FlatList
              data={guests}
              keyExtractor={(g) => g.vk_id}
              contentContainerStyle={s.guestsListContent}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <View style={s.guestCard}>
                  <View style={s.guestCardHead}>
                    <Text style={s.guestIdx}>#{index + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.guestName} numberOfLines={1}>
                        {item.first_name} {item.last_name}
                      </Text>
                      <Text style={s.guestVk}>VK ID: {item.vk_id}</Text>
                    </View>
                    <View style={s.guestCoins}>
                      <Text style={s.guestCoinsVal}>{fmtNum(item.coins)}</Text>
                      <Text style={s.guestCoinsLbl}>коинов</Text>
                    </View>
                  </View>
                  <View style={s.guestStats}>
                    <View style={s.guestStat}>
                      <Text style={s.guestStatVal}>{item.frequency}</Text>
                      <Text style={s.guestStatLbl}>визитов</Text>
                    </View>
                    <View style={[s.guestStat, s.guestStatMid]}>
                      <Text style={s.guestStatVal}>{item.recency_days}</Text>
                      <Text style={s.guestStatLbl}>дн. назад</Text>
                    </View>
                    <View style={s.guestStat}>
                      <Text style={s.guestStatVal}>{item.last_visit}</Text>
                      <Text style={s.guestStatLbl}>посл. визит</Text>
                    </View>
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

// ════════════════════════════════════════════════════════════════════
// APP ENTRY — загрузка шрифтов
// ════════════════════════════════════════════════════════════════════
export default function App() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold,
    Manrope_700Bold, Manrope_800ExtraBold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) await SplashScreen.hideAsync();
  }, [fontsLoaded]);

  useEffect(() => { onLayoutRootView(); }, [onLayoutRootView]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: C.paper }} onLayout={onLayoutRootView}>
        <RFScreen />
      </View>
    </SafeAreaProvider>
  );
}

// ════════════════════════════════════════════════════════════════════
// STYLES (responsive — пересоздаются при ресайзе)
// ════════════════════════════════════════════════════════════════════
function makeStyles(r: Resp) {
  const { pad, scale, isTiny, isSmall, isTablet } = r;

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.paper },
    center: { justifyContent: 'center', alignItems: 'center' },
    loadingText: { fontFamily: F.semibold, color: C.ink3, marginTop: 12, fontSize: 13 },

    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 110 },

    // ── Header ──────────────────────────────────────
    header: {
      paddingHorizontal: pad, paddingTop: 8, paddingBottom: 18,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    },
    iconBtn: {
      width: 40, height: 40, borderRadius: 11,
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
      alignItems: 'center', justifyContent: 'center',
    },
    titleBlock: { flex: 1, alignItems: 'center' },
    titleSuper: {
      fontFamily: F.bold, fontSize: 10, letterSpacing: 2.5,
      color: C.purple, textTransform: 'uppercase', marginBottom: 3,
    },
    titleMain: { fontFamily: F.extrabold, fontSize: scale(17), color: C.ink, letterSpacing: -0.4 },

    // ── Hero ────────────────────────────────────────
    hero: {
      marginHorizontal: pad, marginBottom: 22, padding: isTiny ? 18 : 22,
      backgroundColor: C.surface, borderRadius: 20,
      borderWidth: 1, borderColor: C.line,
      position: 'relative', overflow: 'hidden', ...SHADOW_CARD,
    },
    heroAccent: {
      position: 'absolute', top: 0, left: isTiny ? 18 : 22, width: 42, height: 3,
      backgroundColor: C.purple,
      borderBottomLeftRadius: 3, borderBottomRightRadius: 3,
    },
    heroRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginTop: 4, marginBottom: 12, gap: 10,
    },
    heroLabel: { fontFamily: F.bold, fontSize: 10, letterSpacing: 2.4, color: C.ink3, flexShrink: 1 },
    heroPeriod: { fontFamily: F.semibold, fontSize: 11, color: C.ink3 },
    heroPeriodB: { fontFamily: F.bold, color: C.ink2 },
    heroStat: { flexDirection: 'row', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' },
    heroNum: {
      fontFamily: F.extrabold,
      fontSize: scale(54),
      lineHeight: scale(54),
      color: C.ink, letterSpacing: -2,
    },
    heroLbl: {
      fontFamily: F.bold, fontSize: 11, color: C.ink3,
      paddingBottom: 8, lineHeight: 16, letterSpacing: 1.6,
      textTransform: 'uppercase', maxWidth: 110,
    },
    heroTrend: {
      marginTop: 14, paddingTop: 14,
      borderTopWidth: 1, borderTopColor: C.lineSoft,
      flexDirection: 'row', alignItems: 'center', gap: 10,
    },
    heroPill: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 10, paddingVertical: 4,
      borderRadius: 50, backgroundColor: C.lime,
    },
    heroPillText: { fontFamily: F.extrabold, fontSize: 11, color: C.ink },
    heroTrendText: { fontFamily: F.semibold, fontSize: 12, color: C.ink3 },

    // ── Filters ─────────────────────────────────────
    filterBlock: { paddingHorizontal: pad, marginBottom: 18 },
    filterLabel: {
      fontFamily: F.bold, fontSize: 10, letterSpacing: 2.8,
      color: C.ink3, textTransform: 'uppercase',
      marginBottom: 10, paddingHorizontal: 2,
    },
    chipsRow: { flexDirection: 'row', gap: 7, paddingRight: pad },
    chip: {
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50,
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
    },
    chipActive: { backgroundColor: C.purple, borderColor: C.purple },
    chipText: { fontFamily: F.semibold, fontSize: 13, color: C.ink2 },
    chipTextActive: { fontFamily: F.bold, color: C.surface },

    segmented: {
      marginTop: 12, backgroundColor: C.surface,
      borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 3,
      flexDirection: 'row',
    },
    seg: {
      flex: 1, paddingVertical: 10,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
      borderRadius: 9,
    },
    segActive: { backgroundColor: C.purple },
    segText: { fontFamily: F.bold, fontSize: 13, color: C.ink3 },
    segTextActive: { color: C.surface },

    // ── Thresholds ──────────────────────────────────
    thresholds: {
      marginHorizontal: pad, marginBottom: 22,
      paddingVertical: 14, paddingHorizontal: 16,
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 14,
      flexDirection: 'row', alignItems: 'center', gap: 14, ...SHADOW_CARD,
    },
    thIcon: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: C.lime,
      alignItems: 'center', justifyContent: 'center',
    },
    thText: { flex: 1 },
    thTitle: {
      fontFamily: F.bold, fontSize: 10, color: C.ink3,
      letterSpacing: 2.2, textTransform: 'uppercase', marginBottom: 5,
    },
    thValRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 2 },
    thVal: { fontFamily: F.semibold, fontSize: 13, color: C.ink, lineHeight: 20 },
    thCode: {
      fontFamily: F.bold, fontSize: 12.5,
      color: C.purpleDeep, backgroundColor: C.purpleSoft,
      paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5, overflow: 'hidden',
    },

    // ── KPI ─────────────────────────────────────────
    kpiGrid: { paddingHorizontal: pad, marginBottom: 22, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    kpi: {
      // 1 кол на крошечных, 2 на стандартных, 4 на планшете
      width: r.kpiCols === 1 ? '100%' : r.kpiCols === 4 ? '23.5%' : '48%',
      flexGrow: 1,
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 14,
      paddingHorizontal: 14, paddingTop: 16, paddingBottom: 14,
      position: 'relative', overflow: 'hidden', ...SHADOW_CARD,
    },
    kpiAccent: {
      position: 'absolute', top: 0, left: 14, width: 24, height: 3,
      borderBottomLeftRadius: 3, borderBottomRightRadius: 3,
    },
    kpiTrend: {
      position: 'absolute', top: 14, right: 14,
      flexDirection: 'row', alignItems: 'center', gap: 3,
      paddingHorizontal: 7, paddingVertical: 2, borderRadius: 50,
    },
    kpiTrendUp: { backgroundColor: C.goodSoft },
    kpiTrendDown: { backgroundColor: C.warnSoft },
    kpiTrendText: { fontFamily: F.bold, fontSize: 11 },
    kpiLabel: {
      fontFamily: F.bold, fontSize: 10, color: C.ink3,
      letterSpacing: 2, textTransform: 'uppercase', marginTop: 6,
    },
    kpiVal: { fontFamily: F.extrabold, fontSize: scale(32), lineHeight: scale(32), marginTop: 8, letterSpacing: -1 },
    kpiSub: { fontFamily: F.medium, fontSize: 11, color: C.ink3, marginTop: 5, lineHeight: 15 },

    // ── Section heads ───────────────────────────────
    secHead: {
      paddingHorizontal: pad, marginBottom: 12,
      flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    },
    secTitle: { fontFamily: F.extrabold, fontSize: scale(17), color: C.ink, letterSpacing: -0.3 },
    secMeta: {
      fontFamily: F.bold, fontSize: 10, color: C.ink3,
      letterSpacing: 2.2, textTransform: 'uppercase',
    },

    // ── Matrix ──────────────────────────────────────
    matrixCard: {
      marginHorizontal: pad, marginBottom: 24,
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 16,
      paddingHorizontal: isTiny ? 8 : 12, paddingTop: 14, paddingBottom: 12, ...SHADOW_CARD,
    },
    matrixRow: { flexDirection: 'row', gap: isTiny ? 4 : 5, marginBottom: isTiny ? 4 : 5 },
    axisCorner: { width: isTiny ? 24 : 28, alignItems: 'center', justifyContent: 'center', paddingVertical: 4, paddingBottom: 8 },
    axisCornerText: { fontFamily: F.bold, fontSize: 10, color: C.ink4, letterSpacing: 0.5 },
    fHeader: { flex: 1, alignItems: 'center', paddingTop: 4, paddingBottom: 8, paddingHorizontal: 2 },
    rHeader: { width: isTiny ? 24 : 28, alignItems: 'center', justifyContent: 'center', gap: 4 },
    mhLbl: { fontFamily: F.extrabold, fontSize: scale(14), color: C.ink, letterSpacing: -0.2 },
    mhNm: {
      fontFamily: F.bold, fontSize: 9, color: C.ink3,
      marginTop: 2, letterSpacing: 1.4, textTransform: 'uppercase',
    },
    mhRng: { fontFamily: F.semibold, fontSize: 9, color: C.ink3, marginTop: 1 },

    cell: {
      flex: 1, minHeight: isTiny ? 70 : isSmall ? 78 : isTablet ? 100 : 84,
      borderRadius: 11,
      paddingHorizontal: 4, paddingVertical: 8,
      borderWidth: 1, borderColor: C.line,
      backgroundColor: C.surface,
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    },
    cellSelected: {
      borderColor: C.purple, borderWidth: 1.5, backgroundColor: C.purpleSoft,
    },
    cellEdge: { position: 'absolute', left: 0, top: 18, bottom: 18, width: 2 },
    cellEm: {
      fontFamily: F.bold, fontSize: scale(9), color: C.ink2,
      letterSpacing: 0.9, textTransform: 'uppercase',
      textAlign: 'center', marginBottom: 4,
    },
    cellNm: { fontFamily: F.semibold, fontSize: 8.5, color: C.ink3, letterSpacing: 0.4 },
    cellCt: {
      fontFamily: F.extrabold, fontSize: scale(22), color: C.ink,
      marginTop: 5, letterSpacing: -0.6, lineHeight: scale(22),
    },
    cellPc: { fontFamily: F.bold, fontSize: 10, color: C.ink3, marginTop: 2 },

    // ── Detail ──────────────────────────────────────
    detail: {
      marginHorizontal: pad, marginBottom: 22,
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 16,
      padding: isTiny ? 16 : 20, ...SHADOW_CARD,
    },
    detailEyebrow: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      alignSelf: 'flex-start',
      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 50,
      backgroundColor: C.purpleSoft, marginBottom: 12,
    },
    detailEyebrowDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.purple },
    detailEyebrowText: {
      fontFamily: F.extrabold, fontSize: 10,
      color: C.purpleDeep, letterSpacing: 1.8, textTransform: 'uppercase',
    },
    detailName: {
      fontFamily: F.extrabold, fontSize: scale(26), color: C.ink,
      lineHeight: scale(30), letterSpacing: -0.7,
    },
    detailSub: { marginTop: 8, fontFamily: F.medium, fontSize: 13, color: C.ink2, lineHeight: 19 },

    detailStats: {
      flexDirection: 'row', marginTop: 18,
      borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.lineSoft,
    },
    ds: { flex: 1, paddingVertical: 14, paddingHorizontal: 4 },
    dsLeft: { borderRightWidth: 1, borderColor: C.lineSoft, paddingRight: 14 },
    dsRight: { paddingLeft: 14 },
    dsVal: {
      fontFamily: F.extrabold, fontSize: scale(30), color: C.ink,
      lineHeight: scale(30), letterSpacing: -0.8,
    },
    dsLbl: {
      fontFamily: F.bold, fontSize: 10, color: C.ink3, marginTop: 6,
      letterSpacing: 2.2, textTransform: 'uppercase',
    },

    // ── Hint (под рассылку) ─────────────────────────
    hint: {
      marginTop: 14,
      backgroundColor: C.hintBg,
      borderWidth: 1, borderColor: C.hintLine, borderRadius: 12,
      paddingHorizontal: 14, paddingVertical: 12,
    },
    hintHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
    hintTitle: {
      fontFamily: F.extrabold, fontSize: 10, color: C.hintInk,
      letterSpacing: 2.2, textTransform: 'uppercase',
    },
    hintText: { fontFamily: F.medium, fontSize: 13, color: C.ink2, lineHeight: 19 },

    // ── Strategy ────────────────────────────────────
    strategy: {
      marginTop: 12, paddingHorizontal: 16, paddingVertical: 14,
      backgroundColor: C.limeSoft, borderWidth: 1, borderColor: C.limeLine, borderRadius: 12,
    },
    strategyTitle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    strategyDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.limeDeep },
    strategyTitleText: {
      fontFamily: F.extrabold, fontSize: 10, color: C.limeDeep,
      letterSpacing: 2.2, textTransform: 'uppercase',
    },
    strategyText: { fontFamily: F.medium, fontSize: 13.5, color: C.ink, lineHeight: 21 },

    // ── Show guests button ──────────────────────────
    showGuestsBtn: {
      marginTop: 14, paddingVertical: 12, paddingHorizontal: 14,
      borderRadius: 12, borderWidth: 1, borderColor: C.line,
      backgroundColor: C.paper,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    showGuestsText: { fontFamily: F.bold, fontSize: 13, color: C.ink },
    showGuestsBadge: {
      backgroundColor: C.ink, paddingHorizontal: 8, paddingVertical: 2,
      borderRadius: 10, marginLeft: 4,
    },
    showGuestsBadgeText: { fontFamily: F.extrabold, fontSize: 11, color: C.surface },

    // ── Action buttons ──────────────────────────────
    actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
    actionsStack: { flexDirection: 'column' },
    btn: {
      flex: 1, paddingVertical: 13, paddingHorizontal: 12,
      borderRadius: 12, borderWidth: 1,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    },
    btnPrimary: { backgroundColor: C.purple, borderColor: C.purple },
    btnPrimaryText: { fontFamily: F.bold, fontSize: 13, color: C.surface },
    btnSecondary: { backgroundColor: C.surface, borderColor: C.line },
    btnSecondaryText: { fontFamily: F.bold, fontSize: 13, color: C.ink },
    btnAi: { backgroundColor: C.purpleSoft, borderColor: C.purpleLine },
    btnAiText: { fontFamily: F.bold, fontSize: 13, color: C.purpleDeep },

    // ── Migrations ──────────────────────────────────
    migrations: {
      marginHorizontal: pad, marginBottom: 24,
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 14,
      paddingHorizontal: 14, ...SHADOW_CARD,
    },
    migRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingVertical: 13,
      borderBottomWidth: 1, borderBottomColor: C.lineSoft,
    },
    migRowLast: { borderBottomWidth: 0 },
    migFrom: { fontFamily: F.semibold, fontSize: 13, color: C.ink3, flexShrink: 1 },
    migArrow: { fontFamily: F.bold, fontSize: 14, color: C.ink4 },
    migTo: { fontFamily: F.bold, fontSize: 13, color: C.ink, flexShrink: 1 },
    migCount: { marginLeft: 'auto', paddingHorizontal: 9, paddingVertical: 2, borderRadius: 50 },
    migCountPos: { backgroundColor: C.goodSoft },
    migCountNeg: { backgroundColor: C.warnSoft },
    migCountText: { fontFamily: F.extrabold, fontSize: 13 },
    migCountTextPos: { color: C.good },
    migCountTextNeg: { color: C.warn },

    // ── FAB ─────────────────────────────────────────
    fab: {
      position: 'absolute', right: pad, bottom: r.fabBottom,
      width: 54, height: 54, borderRadius: 27,
      backgroundColor: C.purple,
      alignItems: 'center', justifyContent: 'center', ...SHADOW_FAB, zIndex: 40,
    },

    // ── Tabbar ──────────────────────────────────────
    tabbar: {
      position: 'absolute', left: 0, right: 0, bottom: 0,
      paddingTop: 8, paddingBottom: 22,
      backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.line,
      flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', zIndex: 30,
    },
    tab: {
      flex: 1, paddingTop: 6,
      alignItems: 'center', justifyContent: 'center', gap: 4, position: 'relative',
    },
    tabIndicator: {
      position: 'absolute', top: -5, alignSelf: 'center',
      width: 28, height: 3, borderBottomLeftRadius: 3, borderBottomRightRadius: 3,
      backgroundColor: C.purple,
    },
    tabLabel: { fontFamily: F.bold, fontSize: 10, color: C.ink4, letterSpacing: 0.4 },
    tabLabelActive: { color: C.purple },
    tabBadge: {
      position: 'absolute', top: 0, right: '25%',
      backgroundColor: C.lime,
      minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 8,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 2, borderColor: C.surface,
    },
    tabBadgeText: { fontFamily: F.extrabold, fontSize: 9, color: C.ink },

    // ════════════════════════════════════════════════════════════════
    // MODAL — общие стили (Broadcast + Guest List)
    // ════════════════════════════════════════════════════════════════
    modalRoot: { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(24,24,27,0.5)' },
    modalSheet: {
      backgroundColor: C.surface,
      borderTopLeftRadius: 22, borderTopRightRadius: 22,
      maxHeight: '90%',
      paddingBottom: 20,
      ...SHADOW_MODAL,
    },
    modalSheetTall: { minHeight: '60%' },
    modalHandle: {
      alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
      backgroundColor: C.line, marginTop: 8, marginBottom: 4,
    },
    modalHeader: {
      paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14,
      flexDirection: 'row', alignItems: 'center', gap: 10,
      borderBottomWidth: 1, borderBottomColor: C.lineSoft,
    },
    modalSuper: {
      fontFamily: F.bold, fontSize: 10, color: C.purple,
      letterSpacing: 2.2, textTransform: 'uppercase', marginBottom: 2,
    },
    modalTitle: { fontFamily: F.extrabold, fontSize: scale(18), color: C.ink, letterSpacing: -0.4 },
    modalClose: {
      width: 34, height: 34, borderRadius: 10,
      backgroundColor: C.paper, borderWidth: 1, borderColor: C.line,
      alignItems: 'center', justifyContent: 'center',
    },

    modalBody: { flexGrow: 0 },
    modalBodyContent: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 },

    modalSegInfo: {
      flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12,
      paddingHorizontal: 12, paddingVertical: 10,
      backgroundColor: C.paper, borderRadius: 10,
      borderWidth: 1, borderColor: C.lineSoft,
    },
    modalSegBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50,
      backgroundColor: C.purpleSoft,
    },
    modalSegDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.purple },
    modalSegBadgeText: {
      fontFamily: F.extrabold, fontSize: 10, color: C.purpleDeep,
      letterSpacing: 1.4, textTransform: 'uppercase',
    },
    modalSegCount: { fontFamily: F.bold, fontSize: 12, color: C.ink3, marginLeft: 'auto' },

    modalHint: {
      marginBottom: 14,
      backgroundColor: C.hintBg,
      borderWidth: 1, borderColor: C.hintLine, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 10,
    },
    modalHintHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    modalHintTitle: {
      fontFamily: F.extrabold, fontSize: 10, color: C.hintInk,
      letterSpacing: 1.8, textTransform: 'uppercase',
    },
    modalHintText: { fontFamily: F.medium, fontSize: 13, color: C.ink2, lineHeight: 18 },

    modalInputWrap: {
      backgroundColor: C.paper,
      borderWidth: 1, borderColor: C.line, borderRadius: 12,
      padding: 4,
    },
    modalTextarea: {
      minHeight: 110, maxHeight: 220,
      paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10,
      fontFamily: F.regular, fontSize: 14, color: C.ink, lineHeight: 20,
    },
    modalCharCount: {
      alignSelf: 'flex-end', marginTop: 6, marginBottom: 12,
      fontFamily: F.semibold, fontSize: 11, color: C.ink4,
    },
    modalCharCountOver: { color: C.warn, fontFamily: F.bold },

    modalImageDrop: {
      borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.line, borderRadius: 12,
      paddingVertical: 18, paddingHorizontal: 14,
      alignItems: 'center', justifyContent: 'center', gap: 4,
      backgroundColor: C.paper,
    },
    modalImageDropText: { fontFamily: F.bold, fontSize: 13, color: C.ink2, marginTop: 4 },
    modalImageDropHint: { fontFamily: F.medium, fontSize: 11, color: C.ink4 },
    modalImagePreview: { position: 'relative', borderRadius: 12, overflow: 'hidden' },
    modalImage: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12, backgroundColor: C.line },
    modalImageRemove: {
      position: 'absolute', top: 8, right: 8,
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: 'rgba(24,24,27,0.7)',
      alignItems: 'center', justifyContent: 'center',
    },

    modalStatus: {
      marginTop: 12, paddingHorizontal: 12, paddingVertical: 10,
      borderRadius: 10, borderWidth: 1,
    },
    modalStatusOk:  { backgroundColor: C.goodSoft, borderColor: '#A7F3C2' },
    modalStatusErr: { backgroundColor: C.warnSoft, borderColor: '#FCA5A5' },
    modalStatusLoad:{ backgroundColor: C.paper,    borderColor: C.line },
    modalStatusText: { fontFamily: F.semibold, fontSize: 13, lineHeight: 18 },

    modalFooter: {
      paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
      borderTopWidth: 1, borderTopColor: C.lineSoft,
      flexDirection: 'row', gap: 10,
    },

    // ── Guest list ──────────────────────────────────
    guestCountChip: {
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50,
      backgroundColor: C.purpleSoft,
    },
    guestCountChipText: {
      fontFamily: F.extrabold, fontSize: 11, color: C.purpleDeep,
      letterSpacing: 0.4,
    },
    guestsEmpty: {
      paddingVertical: 50, alignItems: 'center', justifyContent: 'center', gap: 12,
    },
    guestsEmptyText: { fontFamily: F.semibold, fontSize: 13, color: C.ink3 },
    guestsListContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 20 },
    guestCard: {
      backgroundColor: C.paper, borderRadius: 12,
      borderWidth: 1, borderColor: C.line,
      padding: 12,
    },
    guestCardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    guestIdx: {
      width: 26, fontFamily: F.bold, fontSize: 11, color: C.ink4,
    },
    guestName: { fontFamily: F.extrabold, fontSize: 14, color: C.ink, letterSpacing: -0.2 },
    guestVk: { fontFamily: F.medium, fontSize: 11, color: C.ink4, marginTop: 1 },
    guestCoins: { alignItems: 'flex-end' },
    guestCoinsVal: { fontFamily: F.extrabold, fontSize: 16, color: C.purpleDeep, letterSpacing: -0.3 },
    guestCoinsLbl: { fontFamily: F.bold, fontSize: 9, color: C.ink4, letterSpacing: 1.4, textTransform: 'uppercase' },

    guestStats: {
      flexDirection: 'row', marginTop: 10, paddingTop: 10,
      borderTopWidth: 1, borderTopColor: C.lineSoft,
    },
    guestStat: { flex: 1, alignItems: 'center' },
    guestStatMid: {
      borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.lineSoft,
    },
    guestStatVal: { fontFamily: F.extrabold, fontSize: 14, color: C.ink },
    guestStatLbl: {
      fontFamily: F.bold, fontSize: 9, color: C.ink4, marginTop: 3,
      letterSpacing: 1.4, textTransform: 'uppercase',
    },
  });
}
