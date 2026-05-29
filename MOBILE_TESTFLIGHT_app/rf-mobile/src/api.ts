import type {
  Mode, RFMatrixResponse, Guest, Review, AutoReplySettings,
  ChatMessage, ChatManager, Campaign, RFMigration, RFThresholds, RFBranch,
  Profile, Staff, SubscriptionStatus,
  TestimonialMessage, GuestDetail, GeneralStats, LoyaltyReport,
  Product, ProductCategory, Quest, Promotion, DailyCode, CoinAdjustment,
  GuestCoinTxn, LoginCredentials, LoginResponse, AuditLogEntry, AuditActionType,
  SearchResults, SearchHit, GuestBirthday, GenderFilter,
  GiftAnalytic, QuestAnalytic, EngagementSummary,
} from './types';
import {
  MOCK, MOCK_DELIVERY, MOCK_GUESTS, MOCK_REVIEWS, DEFAULT_AUTO_REPLY_SETTINGS,
  MOCK_MANAGER, MOCK_MESSAGES, MOCK_CAMPAIGNS, MOCK_FULL_MIGRATIONS,
  MOCK_PROFILE, MOCK_STAFF, MOCK_SUBSCRIPTION,
  MOCK_GUEST_DETAILS, MOCK_GENERAL_STATS, MOCK_LOYALTY_REPORT,
  buildGuestDetailFromGuest,
  MOCK_CATEGORIES, MOCK_PRODUCTS, MOCK_QUESTS, MOCK_PROMOTIONS, MOCK_DAILY_CODES,
  nextProductId, nextCategoryId, nextQuestId, nextPromoId, nextDailyId,
  MOCK_AUDIT_LOG, MOCK_BIRTHDAYS,
  MOCK_GIFTS_ANALYTICS, MOCK_QUESTS_ANALYTICS, MOCK_ENGAGEMENT_SUMMARY,
} from './mocks';
import { cacheSet, withCache } from './storage';
import { isForceOffline, markOffline, markOnline } from './network';
import type { AssistantAction } from './navBridge';

// ════════════════════════════════════════════════════════════════════
// API — клиент под /api/v1/...
// ════════════════════════════════════════════════════════════════════
//
// USE_MOCK и API_BASE можно перебить через env-переменные Expo
// (они доступны в коде если префикс EXPO_PUBLIC_):
//   EXPO_PUBLIC_USE_MOCK=false     — выключить мок-данные
//   EXPO_PUBLIC_API_BASE=https://demo.levone.ru — реальный бэкенд
//
// Если переменных нет, остаются дефолты — мок включён, плейсхолдер-домен.
// Это нужно чтобы `npm run web` без .env не падал, а демо продолжало работать.

function _envBool(key: string, fallback: boolean): boolean {
  const raw = (process.env as any)[key];
  if (raw == null) return fallback;
  return String(raw).toLowerCase() === 'true' || raw === '1';
}

// Мок-режим разрешён ТОЛЬКО в dev-сборке (локальное demo). В релизе/OTA
// (__DEV__ === false) USE_MOCK всегда false — это боевое приложение владельцев,
// мок-данные не должны протекать к реальным пользователям.
export const USE_MOCK =
  (typeof __DEV__ !== 'undefined' && __DEV__) && _envBool('EXPO_PUBLIC_USE_MOCK', false);

// Префикс фейкового токена, который выдаёт мок-логин. Используется в bootstrap
// чтобы выбросить залежавшуюся мок-сессию после переключения на реальный режим.
export const MOCK_TOKEN_PREFIX = 'mock_jwt_';

// API_BASE — изначально читается из env. После логина мобайл может его
// переключить на tenant_domain через setApiBase(); тогда все последующие
// запросы (ревью, гости, аналитика) идут на конкретного тенанта.
//
// Запросы /auth/login/, /leads/* идут на исходный (public) домен, потому
// что эти эндпоинты живут в shared-схеме. После успешного логина мобайл
// зовёт setApiBase(profile.tenant_domain) — и все остальные fetch уже идут
// на поддомен тенанта.
const _DEFAULT_API_BASE: string =
  (process.env as any).EXPO_PUBLIC_API_BASE || 'https://levelupapp.ru';

let _apiBase: string = _DEFAULT_API_BASE;

export function getApiBase(): string {
  return _apiBase;
}

export function setApiBase(base: string | null | undefined): void {
  if (!base) {
    _apiBase = _DEFAULT_API_BASE;
    return;
  }
  // Нормализация: добавляем https:// если нет схемы, убираем trailing slash
  let normalized = String(base).trim();
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = 'https://' + normalized;
  }
  normalized = normalized.replace(/\/+$/, '');
  _apiBase = normalized;
}

// Для обратной совместимости — старый импорт `API_BASE` продолжает работать,
// но он *не реактивен*: показывает значение на момент импорта. Все новые
// fetch'и должны использовать getApiBase().
export const API_BASE: string = _DEFAULT_API_BASE;

let _authToken: string | null = null;
export const setAuthToken = (t: string | null) => { _authToken = t; };
export const getAuthToken = () => _authToken;

const authHeaders = (): Record<string, string> =>
  _authToken ? { Authorization: `Bearer ${_authToken}` } : {};

/**
 * Универсальный fetch с детектом сетевых ошибок и обновлением network-флага.
 * Сетевую ошибку (TypeError/Failed to fetch) переводим в markOffline(),
 * успешный ответ — в markOnline(). Также честно бросает при offline-mode.
 */
async function netFetch(input: string, init?: RequestInit): Promise<Response> {
  if (isForceOffline()) throw new Error('OFFLINE_FORCED');
  try {
    const res = await fetch(input, init);
    markOnline();
    return res;
  } catch (e) {
    markOffline();
    throw e;
  }
}

// ════════════════════════════════════════════════════════════════════
// AUTH — login / logout
// ════════════════════════════════════════════════════════════════════
export async function login(p: LoginCredentials): Promise<LoginResponse> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 700));
    // В моке: любой логин с паролем длиной >= 4 проходит. Для демо.
    if (!p.login.trim() || p.password.length < 4) {
      throw new Error('Неверный логин или пароль');
    }
    const fakeToken = 'mock_jwt_' + Math.random().toString(36).slice(2, 20);
    setAuthToken(fakeToken);
    return {
      token: fakeToken,
      profile: MOCK_PROFILE,
      expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    };
  }
  const res = await fetch(new URL('/api/v1/auth/login/', getApiBase()).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(p),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? body.detail ?? 'Не удалось войти');
  }
  const data: LoginResponse = await res.json();
  setAuthToken(data.token);
  return data;
}

export async function logout(): Promise<void> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 200));
    setAuthToken(null);
    return;
  }
  await fetch(new URL('/api/v1/auth/logout/', getApiBase()).toString(), {
    method: 'POST',
    headers: { ...authHeaders() },
  }).catch(() => {});
  setAuthToken(null);
}

// ════════════════════════════════════════════════════════════════════
// LEAD API — онбординг новых клиентов через мобайл
// ════════════════════════════════════════════════════════════════════
// Используется ДО логина — авторизация по session_token, который сервер
// возвращает при создании лида.

export interface LeadDraftPayload {
  cafe_name?: string;
  cafe_count?: number;
  traffic_estimate?: string;
  package_suggested?: string;
  full_name?: string;
  email?: string;
  vk_token?: string;
  domain_slug?: string;
}

export interface LeadResponse {
  id: number;
  session_token: string;
  status: 'draft' | 'submitted' | 'confirmed' | 'rejected';
}

/**
 * Создать пустой Lead, получить session_token. Используется при открытии
 * чата — все последующие /chat/ и /submit/ идут по этому токену.
 */
export async function createLead(): Promise<LeadResponse> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 200));
    return {
      id: Math.floor(Math.random() * 100000),
      session_token: 'mock_' + Math.random().toString(36).slice(2, 18),
      status: 'draft',
    };
  }
  const res = await netFetch(new URL('/api/v1/leads/', getApiBase()).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`Не удалось создать заявку: ${res.status}`);
  return await res.json();
}

export interface LeadChatResponse {
  assistant_message: string;
  lead_state: LeadDraftPayload & { id: number; status: string; is_complete?: boolean };
  is_complete: boolean;
  updated_fields: string[];
}

/**
 * Один turn AI-чата. Если бэк отвечает 503 (AI недоступен) — бросает
 * специальное исключение `AIFallbackError`, чтобы мобайл переключился
 * на локальный скрипт.
 */
export class AIFallbackError extends Error {
  constructor(message: string) { super(message); this.name = 'AIFallbackError'; }
}

export async function chatWithLeadAI(p: { session_token: string; message: string }): Promise<LeadChatResponse> {
  if (USE_MOCK) {
    // В моке AI-чата нет — сразу триггерим fallback на скрипт
    throw new AIFallbackError('Mock-режим: AI-чат недоступен, fallback на скрипт');
  }
  const res = await netFetch(
    new URL(`/api/v1/leads/${encodeURIComponent(p.session_token)}/chat/`, getApiBase()).toString(),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: p.message }),
    },
  );
  if (res.status === 503) {
    throw new AIFallbackError('AI временно недоступен');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `AI chat failed: ${res.status}`);
  }
  return await res.json();
}

/**
 * Финализирует ранее созданный лид — отправляет на подтверждение.
 */
export async function submitLeadByToken(session_token: string, vk_token?: string): Promise<LeadResponse> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 400));
    return {
      id: 0,
      session_token,
      status: 'submitted',
    };
  }
  // Если есть vk_token — пишем его перед submit (он чувствительный, отдельным PATCH)
  if (vk_token) {
    await netFetch(
      new URL(`/api/v1/leads/${encodeURIComponent(session_token)}/`, getApiBase()).toString(),
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vk_token }),
      },
    ).catch(() => {});
  }
  const res = await netFetch(
    new URL(`/api/v1/leads/${encodeURIComponent(session_token)}/submit/`, getApiBase()).toString(),
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Submit failed: ${res.status}`);
  }
  return await res.json();
}

/**
 * Полный flow в одном вызове: создаёт лид → PATCH с данными → submit.
 * USE_MOCK режим возвращает фейковый ответ через 600мс — мобайл показывает
 * pending-экран без обращения к бэкенду.
 */
export async function submitLead(p: LeadDraftPayload): Promise<LeadResponse> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 600));
    return {
      id: Math.floor(Math.random() * 100000),
      session_token: 'mock_' + Math.random().toString(36).slice(2, 18),
      status: 'submitted',
    };
  }
  // 1) создаём лид с базовыми полями
  const createRes = await netFetch(new URL('/api/v1/leads/', getApiBase()).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      cafe_name: p.cafe_name ?? '',
      cafe_count: p.cafe_count,
      traffic_estimate: p.traffic_estimate ?? '',
      package_suggested: p.package_suggested ?? '',
      full_name: p.full_name ?? '',
      email: p.email ?? '',
      domain_slug: p.domain_slug ?? '',
    }),
  });
  if (!createRes.ok) {
    const body = await createRes.json().catch(() => ({}));
    throw new Error(body.detail ?? `Не удалось создать заявку: ${createRes.status}`);
  }
  const created: LeadResponse = await createRes.json();

  // 2) PATCH с vk_token (передаётся отдельно — он чувствительный)
  if (p.vk_token) {
    await netFetch(
      new URL(`/api/v1/leads/${created.session_token}/`, getApiBase()).toString(),
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vk_token: p.vk_token }),
      },
    ).catch(() => {});
  }

  // 3) submit
  const submitRes = await netFetch(
    new URL(`/api/v1/leads/${created.session_token}/submit/`, getApiBase()).toString(),
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
  );
  if (!submitRes.ok) {
    const body = await submitRes.json().catch(() => ({}));
    throw new Error(body.detail ?? `Не удалось отправить: ${submitRes.status}`);
  }
  return await submitRes.json();
}

// ════════════════════════════════════════════════════════════════════
// GLOBAL SEARCH — поиск по гостям/отзывам/подаркам/квестам/акциям
// ════════════════════════════════════════════════════════════════════
function snippet(haystack: string, needle: string, ctxLen = 60): string {
  const idx = haystack.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) return haystack.slice(0, ctxLen);
  const start = Math.max(0, idx - Math.floor(ctxLen / 3));
  const end = Math.min(haystack.length, start + ctxLen);
  return (start > 0 ? '…' : '') + haystack.slice(start, end) + (end < haystack.length ? '…' : '');
}

export async function globalSearch(q: string): Promise<SearchResults> {
  const query = q.trim().toLowerCase();
  const empty: SearchResults = { q, total: 0, guests: [], reviews: [], products: [], quests: [], promotions: [] };
  if (query.length < 2) return empty;

  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 200));

    // Гости
    const guests: SearchHit[] = MOCK_GUESTS
      .filter(g => {
        const full = `${g.first_name} ${g.last_name}`.toLowerCase();
        return full.includes(query) || g.vk_id.includes(query);
      })
      .map(g => ({
        type: 'guest' as const,
        id: g.vk_id,
        title: `${g.first_name} ${g.last_name}`,
        subtitle: `VK ${g.vk_id} · ${g.frequency} визитов · ${g.coins} ★`,
        raw: g,
      }));

    // Отзывы
    const reviews: SearchHit[] = MOCK_REVIEWS
      .filter(rev => {
        return rev.customer_name.toLowerCase().includes(query) ||
               rev.text.toLowerCase().includes(query) ||
               rev.branch_name.toLowerCase().includes(query);
      })
      .map(rev => ({
        type: 'review' as const,
        id: rev.id,
        title: rev.customer_name,
        subtitle: `${rev.branch_name} · ${rev.sentiment === 'NEGATIVE' ? '🔴 негатив' : rev.sentiment === 'POSITIVE' ? '🟢 позитив' : ''}`,
        match: snippet(rev.text, query),
        raw: rev,
      }));

    // Подарки
    const products: SearchHit[] = MOCK_PRODUCTS
      .filter(p => p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query))
      .map(p => ({
        type: 'product' as const,
        id: p.id,
        title: p.name,
        subtitle: `${p.price === 0 ? 'Бесплатно' : `${p.price} ★`}${p.is_super_prize ? ' · 👑 суперприз' : ''}${p.is_birthday_prize ? ' · 🎂 ДР' : ''}`,
        match: p.description ? snippet(p.description, query) : undefined,
        raw: p,
      }));

    // Квесты
    const quests: SearchHit[] = MOCK_QUESTS
      .filter(qst => qst.name.toLowerCase().includes(query) || qst.description.toLowerCase().includes(query))
      .map(qst => ({
        type: 'quest' as const,
        id: qst.id,
        title: qst.name,
        subtitle: `+${qst.reward} ★${qst.is_active ? '' : ' · выключен'}`,
        match: qst.description ? snippet(qst.description, query) : undefined,
        raw: qst,
      }));

    // Акции
    const promotions: SearchHit[] = MOCK_PROMOTIONS
      .filter(pr => pr.title.toLowerCase().includes(query) || pr.discount.toLowerCase().includes(query))
      .map(pr => ({
        type: 'promotion' as const,
        id: pr.id,
        title: pr.title,
        subtitle: pr.dates,
        match: snippet(pr.discount, query),
        raw: pr,
      }));

    const total = guests.length + reviews.length + products.length + quests.length + promotions.length;
    return { q, total, guests, reviews, products, quests, promotions };
  }

  const url = new URL('/api/v1/search/', getApiBase());
  url.searchParams.set('q', q);
  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json', ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  return await res.json();
}

// ════════════════════════════════════════════════════════════════════
// BIRTHDAYS — гости с ближайшими ДР
// ════════════════════════════════════════════════════════════════════
export async function fetchUpcomingBirthdays(p: {
  days_ahead?: number;       // по умолчанию 30
  include_past?: boolean;    // включать ли уже прошедшие (по умолчанию да, для отдельной вкладки)
} = {}): Promise<GuestBirthday[]> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 200));
    let list = [...MOCK_BIRTHDAYS];
    const ahead = p.days_ahead ?? 30;
    if (p.include_past === false) list = list.filter(b => b.days_until >= 0);
    list = list.filter(b => b.days_until <= ahead);
    return list.sort((a, b) => a.days_until - b.days_until);
  }
  const url = new URL('/api/v1/guests/birthdays/', getApiBase());
  if (p.days_ahead != null)   url.searchParams.set('days_ahead', String(p.days_ahead));
  if (p.include_past != null) url.searchParams.set('include_past', p.include_past ? '1' : '0');
  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json', ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Birthdays fetch failed: ${res.status}`);
  const data = await res.json();
  return data.birthdays ?? [];
}

// ════════════════════════════════════════════════════════════════════
// AUDIT LOG — журнал действий сотрудников
// ════════════════════════════════════════════════════════════════════
export async function fetchAuditLog(p: {
  staff_id?: number;
  action_type?: AuditActionType;
  limit?: number;
} = {}): Promise<AuditLogEntry[]> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 250));
    let list = [...MOCK_AUDIT_LOG];
    if (p.staff_id != null)   list = list.filter(e => e.staff_id === p.staff_id);
    if (p.action_type)        list = list.filter(e => e.action_type === p.action_type);
    return list.slice(0, p.limit ?? 100);
  }
  const url = new URL('/api/v1/audit-log/', getApiBase());
  if (p.staff_id != null)   url.searchParams.set('staff_id', String(p.staff_id));
  if (p.action_type)        url.searchParams.set('action_type', p.action_type);
  if (p.limit)              url.searchParams.set('limit', String(p.limit));
  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json', ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Audit log fetch failed: ${res.status}`);
  const data = await res.json();
  return data.entries ?? [];
}

export async function fetchRFMatrix(p: {
  mode: Mode; branch_ids?: number[];
  trend_days?: number;
  start_date?: string;  // ISO date YYYY-MM-DD (произвольный период)
  end_date?: string;
}): Promise<RFMatrixResponse> {
  const cacheKey = `rf:${p.mode}:${(p.branch_ids ?? []).join(',')}:${p.trend_days ?? ''}:${p.start_date ?? ''}-${p.end_date ?? ''}`;
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 250));
    const data = p.mode === 'delivery' ? MOCK_DELIVERY : MOCK;
    cacheSet(cacheKey, data).catch(() => {});
    return data;
  }
  const url = new URL('/api/v1/analytics/rf/', getApiBase());
  url.searchParams.set('mode', p.mode);
  if (p.branch_ids?.length && !p.branch_ids.includes(0)) url.searchParams.set('branch_ids', p.branch_ids.join(','));
  if (p.start_date && p.end_date) {
    url.searchParams.set('start', p.start_date);
    url.searchParams.set('end', p.end_date);
  } else if (p.trend_days) {
    url.searchParams.set('trend_days', String(p.trend_days));
  }
  const result = await withCache<RFMatrixResponse>(cacheKey, async () => {
    const res = await netFetch(url.toString(), { headers: { Accept: 'application/json', ...authHeaders() } });
    if (!res.ok) throw new Error(`RF fetch failed: ${res.status}`);
    const raw = await res.json();
    return _normalizeRFResponse(raw);
  });
  return result.data;
}

// Бэк отдаёт RF в формате веб-версии: {matrix, trend, migrations, thresholds, thresholds_source}.
// Мобайл ждёт ещё: summary, branches, updated_at, thresholds_scope_label.
// Также r_score у бэка в шкале 1..4 (1=R0, 4=R3), у мобайла 0..3. Перемапируем.
function _remapBackendRScore(r: number): number {
  return Math.max(0, (r ?? 0) - 1);
}

function _normalizeRFResponse(raw: any): RFMatrixResponse {
  const rawCells = (raw?.matrix?.cells ?? {}) as Record<string, any>;

  // Перемапируем ключи и r_score у клеток: backend "4_3" → mobile "3_3"
  const cells: Record<string, any> = {};
  for (const k of Object.keys(rawCells)) {
    const c = rawCells[k] || {};
    const newR = _remapBackendRScore(c.r_score);
    const f = c.f_score ?? 0;
    cells[`${newR}_${f}`] = { ...c, r_score: newR };
  }

  const rLevels = (raw?.matrix?.r_levels ?? []).map((l: any) => ({
    ...l,
    r_score: _remapBackendRScore(l?.r_score),
  }));

  // Считаем summary из перемапированных cells (mobile-нумерация)
  const total = (raw?.matrix?.total ?? 0) as number;
  let active_r3 = 0, at_risk_r1 = 0, lost_r0 = 0;
  for (const k of Object.keys(cells)) {
    const c = cells[k];
    const cnt = c?.count ?? 0;
    if (c?.r_score === 3) active_r3 += cnt;
    else if (c?.r_score === 1) at_risk_r1 += cnt;
    else if (c?.r_score === 0) lost_r0 += cnt;
  }

  return {
    thresholds:             raw?.thresholds ?? raw?.matrix?.thresholds ?? {},
    thresholds_source:      raw?.thresholds_source ?? raw?.matrix?.thresholds_source ?? 'default',
    thresholds_scope_label: raw?.thresholds_scope_label ?? 'Все точки',
    matrix: {
      r_levels: rLevels,
      f_levels: raw?.matrix?.f_levels ?? [],
      cells,
    },
    // Бэк отдаёт summary с ключами {vip_f3, at_risk}, а мобайл ждёт
    // {active_r3, at_risk_r1}. Считаем из перемапированных cells сами.
    summary: { total, active_r3, at_risk_r1, lost_r0 },
    // Бэк отдаёт {from_name, to_name, from_emoji, to_emoji, count} — нормализуем
    // под мобильный RFMigration {from, to, count, ...emoji}.
    migrations: (raw?.migrations ?? []).map((m: any) => ({
      from:       m.from ?? m.from_name ?? '—',
      to:         m.to ?? m.to_name ?? '—',
      count:      m.count ?? 0,
      from_emoji: m.from_emoji ?? '',
      to_emoji:   m.to_emoji ?? '',
    })),
    branches:   raw?.branches ?? [],
    updated_at: raw?.updated_at ?? new Date().toISOString(),
  };
}

export async function recalculateRF(p: { mode: Mode; branch_ids: number[] }): Promise<void> {
  if (USE_MOCK) { await new Promise(r => setTimeout(r, 600)); return; }
  const res = await fetch(new URL('/api/v1/analytics/rf/recalculate/', getApiBase()).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ mode: p.mode, branch_ids: p.branch_ids.filter(id => id !== 0).join(',') }),
  });
  if (!res.ok) throw new Error(`Recalculate failed: ${res.status}`);
}

export async function fetchGuests(p: { mode: Mode; r_score: number; f_score: number; branch_ids: number[] }): Promise<Guest[]> {
  const cacheKey = `guests:${p.mode}:${p.r_score}_${p.f_score}:${p.branch_ids.join(',')}`;
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 350));
    const n = Math.max(4, Math.min(MOCK_GUESTS.length, 6 + ((p.r_score + p.f_score) * 2)));
    const data = MOCK_GUESTS.slice(0, n);
    cacheSet(cacheKey, data).catch(() => {});
    return data;
  }
  const url = new URL('/api/v1/analytics/rf/', getApiBase());
  url.searchParams.set('mode', p.mode);
  url.searchParams.set('r_score', String(p.r_score));
  url.searchParams.set('f_score', String(p.f_score));
  if (p.branch_ids.length) url.searchParams.set('branch_ids', p.branch_ids.join(','));
  const result = await withCache<Guest[]>(cacheKey, async () => {
    const res = await netFetch(url.toString(), { headers: { Accept: 'application/json', ...authHeaders() } });
    if (!res.ok) throw new Error(`Guests fetch failed: ${res.status}`);
    const data = await res.json();
    return data.guests ?? [];
  });
  return result.data;
}

export async function fetchGuestList(p?: { search?: string; limit?: number; offset?: number }): Promise<{ guests: Guest[]; total: number; total_visits: number }> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 300));
    const q = p?.search?.toLowerCase() ?? '';
    const all = q ? MOCK_GUESTS.filter(g => `${g.first_name} ${g.last_name}`.toLowerCase().includes(q)) : MOCK_GUESTS;
    return { guests: all, total: all.length, total_visits: all.reduce((s, g) => s + g.frequency, 0) };
  }
  const url = new URL('/api/v1/guests/', getApiBase());
  if (p?.search) url.searchParams.set('search', p.search);
  if (p?.limit) url.searchParams.set('limit', String(p.limit));
  if (p?.offset) url.searchParams.set('offset', String(p.offset));
  const res = await netFetch(url.toString(), { headers: { Accept: 'application/json', ...authHeaders() } });
  if (!res.ok) throw new Error(`Guests list failed: ${res.status}`);
  return await res.json();
}

export interface ApiNotification {
  id: number;
  type: string;
  title: string;
  body: string;
  data: Record<string, any>;
  read: boolean;
  created_at: string;
}

export async function fetchNotifications(limit = 50): Promise<{ notifications: ApiNotification[]; unread: number }> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 200));
    return { notifications: [], unread: 0 };
  }
  const url = new URL('/api/v1/notifications/', getApiBase());
  url.searchParams.set('limit', String(limit));
  const res = await fetch(url.toString(), { headers: { Accept: 'application/json', ...authHeaders() } });
  if (!res.ok) throw new Error(`Notifications fetch failed: ${res.status}`);
  return await res.json();
}

export async function markNotificationsRead(p?: { ids?: number[]; all?: boolean }): Promise<void> {
  if (USE_MOCK) return;
  const res = await fetch(new URL('/api/v1/notifications/', getApiBase()).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...authHeaders() },
    body: JSON.stringify(p?.all ? { all: true } : { ids: p?.ids ?? [] }),
  });
  if (!res.ok) throw new Error(`Mark read failed: ${res.status}`);
}

export interface RFSegment { id: number; code: string; name: string; emoji: string; count: number; }

export async function fetchSegments(): Promise<RFSegment[]> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 200));
    return [
      { id: 1, code: 'R3F3', name: 'Чемпионы', emoji: '🏆', count: 42 },
      { id: 2, code: 'R2F3', name: 'Лояльные', emoji: '💎', count: 68 },
      { id: 3, code: 'R1F3', name: 'Под угрозой', emoji: '⚠️', count: 23 },
      { id: 4, code: 'R3F1', name: 'Новые', emoji: '🌱', count: 31 },
    ];
  }
  const res = await fetch(new URL('/api/v1/analytics/segments/', getApiBase()).toString(), {
    headers: { Accept: 'application/json', ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Segments fetch failed: ${res.status}`);
  const data = await res.json();
  return data.segments ?? [];
}

export async function generateBroadcastText(p: { segment_id?: number; draft?: string }): Promise<string> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 900));
    const drafts = [
      'Привет! Мы по вам соскучились — заглядывайте за чашечкой. На этой неделе для вас наш фирменный десерт в подарок к любому напитку 🍰',
      'Скучаем! Ваш любимый стол ждёт. Покажите это сообщение официанту — и получите комплимент от шефа 🍽',
      'Эй, давно не виделись 👋 Возвращайтесь — у нас обновилось меню, и есть пара блюд именно под ваш вкус.',
    ];
    return drafts[Math.floor(Math.random() * drafts.length)];
  }
  const res = await fetch(new URL('/api/v1/analytics/rf/generate-broadcast-text/', getApiBase()).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ ...(p.segment_id ? { segment_id: p.segment_id } : {}), ...(p.draft ? { draft: p.draft } : {}) }),
  });
  if (!res.ok) throw new Error(`AI text failed: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.text ?? '';
}

export async function sendBroadcast(p: {
  segment_id?: number;
  message_text: string;
  mode: Mode;
  branch_ids: number[];
  image_uri?: string | null;
  // A/B тест (опционально): если variants заданы — message_text игнорируется.
  variants?: { label: 'A' | 'B'; text: string; percent: number }[];
  gender_filter?: GenderFilter;
}): Promise<{ total_sent: number; variants?: { label: 'A' | 'B'; sent_count: number }[] }> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 1200));
    if (p.variants && p.variants.length === 2) {
      // Имитируем сплит. Базу делим примерно пропорционально, добавляя шум.
      const base = Math.floor(Math.random() * 200) + 80;
      const a = Math.round(base * (p.variants[0].percent / 100));
      const b = base - a;
      return { total_sent: a + b, variants: [
        { label: 'A', sent_count: a },
        { label: 'B', sent_count: b },
      ] };
    }
    return { total_sent: Math.floor(Math.random() * 200) + 50 };
  }
  const fd = new FormData();
  if (p.segment_id) fd.append('segment_id', String(p.segment_id));
  fd.append('message_text', p.message_text);
  fd.append('mode', p.mode);
  fd.append('branch_ids', p.branch_ids.join(','));
  if (p.gender_filter && p.gender_filter !== 'all') fd.append('gender_filter', p.gender_filter);
  if (p.variants && p.variants.length === 2) {
    fd.append('variants', JSON.stringify(p.variants));
  }
  if (p.image_uri) {
    const filename = p.image_uri.split('/').pop() ?? 'image.jpg';
    const ext = (filename.split('.').pop() ?? 'jpg').toLowerCase();
    fd.append('image', { uri: p.image_uri, name: filename, type: `image/${ext === 'jpg' ? 'jpeg' : ext}` } as any);
  }
  const res = await fetch(new URL('/api/v1/analytics/rf/send-broadcast/', getApiBase()).toString(), {
    method: 'POST',
    headers: { ...authHeaders() },
    body: fd,
  });
  if (!res.ok) throw new Error(`Send failed: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return { total_sent: data.total_sent ?? 0, variants: data.variants };
}

// ════════════════════════════════════════════════════════════════════
// REVIEWS API
// ════════════════════════════════════════════════════════════════════
export async function fetchReviews(p: { branch_ids?: number[]; period_days?: number }): Promise<Review[]> {
  const cacheKey = `reviews:${(p.branch_ids ?? []).join(',')}:${p.period_days ?? ''}`;
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 300));
    cacheSet(cacheKey, MOCK_REVIEWS).catch(() => {});
    return MOCK_REVIEWS;
  }
  // Real-путь: бэкенд endpoint — apps/tenant/mobile/api/views.py → MobileReviewListAPIView
  const url = new URL('/api/v1/mobile/reviews/', getApiBase());
  if (p.branch_ids?.length) url.searchParams.set('branch_ids', p.branch_ids.join(','));
  if (p.period_days) url.searchParams.set('period', String(p.period_days));
  const result = await withCache<Review[]>(cacheKey, async () => {
    const res = await netFetch(url.toString(), { headers: { Accept: 'application/json', ...authHeaders() } });
    if (!res.ok) throw new Error(`Reviews fetch failed: ${res.status}`);
    const data = await res.json();
    const list: any[] = data.reviews ?? [];
    // Бэк может вернуть branch_id=null для VK-сообщений вне точки
    // и customer_name="VK 123456789" если имя гостя не известно.
    const VK_ID_NAME_RE = /^VK\s+\d+$/i;
    return list.map(r => {
      const rawName = String(r.customer_name ?? '').trim();
      const name = (!rawName || VK_ID_NAME_RE.test(rawName))
        ? 'Гость ВК'
        : rawName;
      return {
        ...r,
        branch_id:     r.branch_id ?? 0,
        branch_name:   r.branch_name ?? '',
        customer_name: name,
        text:          r.text ?? '',
        ai_comment:    r.ai_comment ?? '',
        sentiment:     r.sentiment ?? 'NEUTRAL',
      };
    });
  });
  return result.data;
}

export async function replyToReview(p: { review_id: number; text: string }): Promise<void> {
  if (USE_MOCK) { await new Promise(r => setTimeout(r, 700)); return; }
  const res = await fetch(new URL(`/api/v1/mobile/reviews/${p.review_id}/reply/`, getApiBase()).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ text: p.text }),
  });
  if (!res.ok) throw new Error(`Reply failed: ${res.status}`);
}

export async function markReviewResolved(p: { review_id: number }): Promise<void> {
  if (USE_MOCK) { await new Promise(r => setTimeout(r, 400)); return; }
  const res = await fetch(new URL(`/api/v1/mobile/reviews/${p.review_id}/resolve/`, getApiBase()).toString(), {
    method: 'POST',
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Resolve failed: ${res.status}`);
}

// ════════════════════════════════════════════════════════════════════
// AUTO-REPLY API
// ════════════════════════════════════════════════════════════════════
export async function fetchAutoReplySettings(): Promise<AutoReplySettings> {
  if (USE_MOCK) { await new Promise(r => setTimeout(r, 200)); return { ...DEFAULT_AUTO_REPLY_SETTINGS }; }
  const res = await fetch(new URL('/api/v1/analytics/auto-reply/settings/', getApiBase()).toString(), {
    headers: { Accept: 'application/json', ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Settings fetch failed: ${res.status}`);
  return await res.json();
}

export async function updateAutoReplySettings(p: AutoReplySettings): Promise<void> {
  if (USE_MOCK) { await new Promise(r => setTimeout(r, 300)); return; }
  const res = await fetch(new URL('/api/v1/analytics/auto-reply/settings/', getApiBase()).toString(), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(p),
  });
  if (!res.ok) throw new Error(`Settings save failed: ${res.status}`);
}

// Регенерация черновика для конкретного отзыва (если уже был — перезапишется)
export async function regenerateDraft(p: { review_id: number }): Promise<{ draft_text: string }> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 800));
    const variants = [
      'Спасибо, что поделились! Передам команде. Если нужно вернуться к разговору — пишите.',
      'Понял вас, разберёмся. Сегодня свяжусь и предложу решение лично.',
      'Спасибо за обратную связь — это помогает нам становиться лучше! Загляните ещё.',
    ];
    return { draft_text: variants[Math.floor(Math.random() * variants.length)] };
  }
  const res = await fetch(new URL(`/api/v1/analytics/reviews/${p.review_id}/regenerate-draft/`, getApiBase()).toString(), {
    method: 'POST',
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Regenerate failed: ${res.status}`);
  return await res.json();
}

// Отклонить AI-черновик (на бэке: маркируем что admin отклонил, не присылаем напоминания)
export async function rejectDraft(p: { review_id: number }): Promise<void> {
  if (USE_MOCK) { await new Promise(r => setTimeout(r, 300)); return; }
  const res = await fetch(new URL(`/api/v1/analytics/reviews/${p.review_id}/reject-draft/`, getApiBase()).toString(), {
    method: 'POST',
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Reject draft failed: ${res.status}`);
}

// ════════════════════════════════════════════════════════════════════
// CHAT API (с менеджером ЛоялUP)
// ════════════════════════════════════════════════════════════════════
export async function fetchChatManager(): Promise<ChatManager> {
  if (USE_MOCK) { await new Promise(r => setTimeout(r, 200)); return { ...MOCK_MANAGER }; }
  const res = await fetch(new URL('/api/v1/support/chat/manager/', getApiBase()).toString(), {
    headers: { Accept: 'application/json', ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Manager fetch failed: ${res.status}`);
  return await res.json();
}

export async function fetchChatMessages(): Promise<ChatMessage[]> {
  if (USE_MOCK) { await new Promise(r => setTimeout(r, 250)); return MOCK_MESSAGES; }
  const res = await fetch(new URL('/api/v1/support/chat/messages/', getApiBase()).toString(), {
    headers: { Accept: 'application/json', ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Messages fetch failed: ${res.status}`);
  const data = await res.json();
  return data.messages ?? [];
}

export async function sendChatMessage(p: { text: string }): Promise<ChatMessage> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 350));
    return {
      id: Date.now(),
      sender: 'user',
      text: p.text,
      created_at: new Date().toISOString(),
      status: 'delivered',
    };
  }
  const res = await fetch(new URL('/api/v1/support/chat/messages/', getApiBase()).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ text: p.text }),
  });
  if (!res.ok) throw new Error(`Send chat failed: ${res.status}`);
  return await res.json();
}

// ════════════════════════════════════════════════════════════════════
// REVIEW THREAD — fetch / append message
// ════════════════════════════════════════════════════════════════════
export async function fetchReviewMessages(p: { review_id: number }): Promise<TestimonialMessage[]> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 200));
    const rev = MOCK_REVIEWS.find(r => r.id === p.review_id);
    if (rev?.messages) return rev.messages;
    // fallback — синтезируем единственное сообщение из text/rating
    if (!rev) return [];
    return [{
      id: rev.id * 1000,
      source: rev.source === 'APP' ? 'APP' : 'VK_MESSAGE',
      text: rev.text,
      rating: rev.rating,
      created_at: rev.last_message_at,
    }];
  }
  const url = new URL(`/api/v1/mobile/reviews/${p.review_id}/messages/`, getApiBase());
  const res = await fetch(url.toString(), { headers: { Accept: 'application/json', ...authHeaders() } });
  if (!res.ok) throw new Error(`Messages fetch failed: ${res.status}`);
  const data = await res.json();
  return data.messages ?? [];
}

export async function appendReviewMessage(p: { review_id: number; text: string }): Promise<TestimonialMessage> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 500));
    return {
      id: Date.now(),
      source: 'ADMIN_REPLY',
      text: p.text,
      created_at: new Date().toISOString(),
      admin_name: MOCK_PROFILE.full_name,
    };
  }
  const url = new URL(`/api/v1/mobile/reviews/${p.review_id}/reply/`, getApiBase());
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ text: p.text }),
  });
  if (!res.ok) throw new Error(`Reply failed: ${res.status}`);
  return await res.json();
}

// ════════════════════════════════════════════════════════════════════
// AI-АССИСТЕНТ «Лояльчик»
// ════════════════════════════════════════════════════════════════════
export async function askAssistant(p: {
  question: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
}): Promise<{ answer: string; actions: AssistantAction[] }> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 600));
    return { answer: 'Это демо-режим Лояльчика 🚀 На проде я отвечаю на вопросы по системе.', actions: [] };
  }
  const res = await fetch(new URL('/api/v1/assistant/ask/', getApiBase()).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ question: p.question, history: p.history ?? [] }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Assistant failed: ${res.status}`);
  return { answer: data.answer ?? '', actions: Array.isArray(data.actions) ? data.actions : [] };
}

export async function fetchAssistantContext(): Promise<{
  greeting: string;
  suggestions: string[];
  stats?: Record<string, number>;
}> {
  const fallback = {
    greeting: 'Привет! Я Лояльчик 🚀 Помогу разобраться с приложением и программой лояльности. Спроси что угодно!',
    suggestions: ['Как ответить на отзыв?', 'Что такое RF-сегменты?', 'Как запустить рассылку?'],
  };
  if (USE_MOCK) { await new Promise(r => setTimeout(r, 200)); return fallback; }
  try {
    const res = await fetch(new URL('/api/v1/assistant/context/', getApiBase()).toString(), {
      headers: { Accept: 'application/json', ...authHeaders() },
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    return {
      greeting: data.greeting || fallback.greeting,
      suggestions: Array.isArray(data.suggestions) && data.suggestions.length ? data.suggestions : fallback.suggestions,
      stats: data.stats,
    };
  } catch {
    return fallback;
  }
}

// ════════════════════════════════════════════════════════════════════
// GUEST DETAIL
// ════════════════════════════════════════════════════════════════════
export async function fetchGuestDetail(p: { vk_id: string }): Promise<GuestDetail> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 250));
    const cached = MOCK_GUEST_DETAILS[p.vk_id];
    if (cached) return cached;
    const baseGuest = MOCK_GUESTS.find(g => g.vk_id === p.vk_id);
    if (!baseGuest) throw new Error('Гость не найден');
    return buildGuestDetailFromGuest(baseGuest);
  }
  const url = new URL(`/api/v1/guests/${encodeURIComponent(p.vk_id)}/`, getApiBase());
  const res = await fetch(url.toString(), { headers: { Accept: 'application/json', ...authHeaders() } });
  if (!res.ok) throw new Error(`Guest fetch failed: ${res.status}`);
  return await res.json();
}

// ════════════════════════════════════════════════════════════════════
// GENERAL STATS / LOYALTY REPORT
// ════════════════════════════════════════════════════════════════════
export async function fetchGeneralStats(p: {
  branch_ids?: number[];
  period_days?: number;
  start_date?: string;
  end_date?: string;
}): Promise<GeneralStats> {
  if (USE_MOCK) { await new Promise(r => setTimeout(r, 350)); return MOCK_GENERAL_STATS; }
  const url = new URL('/api/v1/analytics/stats/', getApiBase());
  if (p.branch_ids?.length) url.searchParams.set('branch_ids', p.branch_ids.join(','));
  if (p.start_date && p.end_date) {
    url.searchParams.set('start', p.start_date);
    url.searchParams.set('end',   p.end_date);
  } else if (p.period_days) {
    // Бэк ждёт period как enum (today|7d|30d|...) ЛИБО start/end. period_days —
    // произвольное число дней, поэтому передаём диапазон дат (иначе period=30 → 400).
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (p.period_days - 1));
    url.searchParams.set('start', start.toISOString().slice(0, 10));
    url.searchParams.set('end',   end.toISOString().slice(0, 10));
  }
  const res = await fetch(url.toString(), { headers: { Accept: 'application/json', ...authHeaders() } });
  if (!res.ok) throw new Error(`Stats fetch failed: ${res.status}`);
  // Бэк отдаёт { stats, charts, meta }; экранам нужен плоский GeneralStats.
  const j = await res.json();
  return (j && j.stats) ? j.stats : j;
}

export async function fetchLoyaltyReport(p: {
  branch_ids?: number[];
  start_date?: string;
  end_date?: string;
}): Promise<LoyaltyReport> {
  if (USE_MOCK) { await new Promise(r => setTimeout(r, 500)); return MOCK_LOYALTY_REPORT; }
  const url = new URL('/api/v1/analytics/report/', getApiBase());
  if (p.branch_ids?.length) url.searchParams.set('branch_ids', p.branch_ids.join(','));
  if (p.start_date && p.end_date) {
    url.searchParams.set('start', p.start_date);
    url.searchParams.set('end',   p.end_date);
  }
  const res = await fetch(url.toString(), { headers: { Accept: 'application/json', ...authHeaders() } });
  if (!res.ok) throw new Error(`Report fetch failed: ${res.status}`);
  return await res.json();
}

// PDF-выгрузка отчёта. На бэке URL `/analytics/report/?format=pdf` уже умеет рендерить.
// Возвращаем готовый URL — UI откроет/расшарит.
export async function getLoyaltyReportPdfUrl(p: {
  branch_ids?: number[];
  start_date?: string;
  end_date?: string;
  hide?: number[];   // номера секций (1..11), которые НЕ включать в PDF (LU-11)
}): Promise<string> {
  if (USE_MOCK) { await new Promise(r => setTimeout(r, 300)); return 'https://pdf.example.ru/loyalty-report.pdf'; }
  const url = new URL('/analytics/report/', getApiBase());
  url.searchParams.set('format', 'pdf');
  if (p.branch_ids?.length) url.searchParams.set('branch_ids', p.branch_ids.join(','));
  if (p.start_date && p.end_date) {
    url.searchParams.set('start', p.start_date);
    url.searchParams.set('end',   p.end_date);
  }
  if (p.hide?.length) url.searchParams.set('hide', p.hide.join(','));
  // При наличии токена — прокидываем как query (или используем cookies)
  const token = getAuthToken();
  if (token) url.searchParams.set('token', token);
  return url.toString();
}

// ════════════════════════════════════════════════════════════════════
// CAMPAIGNS API
// ════════════════════════════════════════════════════════════════════
export async function fetchCampaigns(): Promise<Campaign[]> {
  if (USE_MOCK) { await new Promise(r => setTimeout(r, 250)); return MOCK_CAMPAIGNS; }
  const res = await fetch(new URL('/api/v1/analytics/campaigns/', getApiBase()).toString(), {
    headers: { Accept: 'application/json', ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Campaigns fetch failed: ${res.status}`);
  const data = await res.json();
  return data.campaigns ?? [];
}

export async function editCampaign(id: number, message_text: string): Promise<{ updated: number; skipped: string[]; errors: string[] }> {
  if (USE_MOCK) { await new Promise(r => setTimeout(r, 400)); return { updated: 5, skipped: [], errors: [] }; }
  const res = await fetch(new URL(`/api/v1/analytics/campaigns/${id}/`, getApiBase()).toString(), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...authHeaders() },
    body: JSON.stringify({ message_text }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `Edit failed: ${res.status}`);
  }
  return await res.json();
}

export async function deleteCampaign(id: number): Promise<void> {
  if (USE_MOCK) { await new Promise(r => setTimeout(r, 200)); return; }
  const res = await fetch(new URL(`/api/v1/analytics/campaigns/${id}/`, getApiBase()).toString(), {
    method: 'DELETE',
    headers: { Accept: 'application/json', ...authHeaders() },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `Delete failed: ${res.status}`);
  }
}

// ════════════════════════════════════════════════════════════════════
// MIGRATIONS — полный список (используется на отдельном экране)
// ════════════════════════════════════════════════════════════════════
export async function fetchFullMigrations(p: { mode: Mode; period_days: number }): Promise<RFMigration[]> {
  if (USE_MOCK) { await new Promise(r => setTimeout(r, 200)); return MOCK_FULL_MIGRATIONS; }
  const url = new URL('/api/v1/analytics/rf/migrations/', getApiBase());
  url.searchParams.set('mode', p.mode);
  url.searchParams.set('trend_days', String(p.period_days));
  const res = await fetch(url.toString(), { headers: { Accept: 'application/json', ...authHeaders() } });
  if (!res.ok) throw new Error(`Migrations fetch failed: ${res.status}`);
  const data = await res.json();
  return (data.migrations ?? []).map((m: any) => ({
    from:       m.from ?? m.from_name ?? '—',
    to:         m.to ?? m.to_name ?? '—',
    count:      m.count ?? 0,
    from_emoji: m.from_emoji ?? '',
    to_emoji:   m.to_emoji ?? '',
  }));
}

// ════════════════════════════════════════════════════════════════════
// RF THRESHOLDS — обновление порогов
// ════════════════════════════════════════════════════════════════════
export async function updateRFThresholds(p: RFThresholds & { branch_id?: number }): Promise<void> {
  if (USE_MOCK) { await new Promise(r => setTimeout(r, 350)); return; }
  const url = new URL('/api/v1/analytics/rf/thresholds/', getApiBase());
  const res = await fetch(url.toString(), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(p),
  });
  if (!res.ok) throw new Error(`Thresholds save failed: ${res.status}`);
}

// ════════════════════════════════════════════════════════════════════
// BRANCHES — список точек (используется на отдельном экране)
// ════════════════════════════════════════════════════════════════════
export async function fetchBranches(): Promise<RFBranch[]> {
  if (USE_MOCK) { await new Promise(r => setTimeout(r, 200)); return MOCK.branches; }
  const res = await fetch(new URL('/api/v1/mobile/branches/', getApiBase()).toString(), {
    headers: { Accept: 'application/json', ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Branches fetch failed: ${res.status}`);
  const data = await res.json();
  // Бэк отдаёт массив напрямую; на всякий случай поддержим {branches: [...]}.
  const list = Array.isArray(data) ? data : (data.branches ?? []);
  return list.map((b: any) => ({
    id:      b.id,
    name:    b.name ?? '',
    address: b.address ?? '',
    city:    b.city,
  }));
}

// ════════════════════════════════════════════════════════════════════
// PROFILE / STAFF / SUBSCRIPTION
// ════════════════════════════════════════════════════════════════════
export async function fetchProfile(): Promise<Profile> {
  if (USE_MOCK) { await new Promise(r => setTimeout(r, 150)); return MOCK_PROFILE; }
  const res = await fetch(new URL('/api/v1/me/', getApiBase()).toString(), {
    headers: { Accept: 'application/json', ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Profile fetch failed: ${res.status}`);
  return await res.json();
}

export async function updateProfile(p: Partial<Profile>): Promise<Profile> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 350));
    return { ...MOCK_PROFILE, ...p };
  }
  const res = await fetch(new URL('/api/v1/me/', getApiBase()).toString(), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(p),
  });
  if (!res.ok) throw new Error(`Profile save failed: ${res.status}`);
  return await res.json();
}

export async function fetchStaff(): Promise<{ staff: Staff[]; manageableRoles: ('manager' | 'viewer')[] }> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 250));
    return { staff: MOCK_STAFF, manageableRoles: ['manager', 'viewer'] };
  }
  const res = await fetch(new URL('/api/v1/staff/', getApiBase()).toString(), {
    headers: { Accept: 'application/json', ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Staff fetch failed: ${res.status}`);
  const data = await res.json();
  // manageable_roles — какие роли актор вправе назначать (RBAC, источник правды — бэк)
  return { staff: data.staff ?? [], manageableRoles: data.manageable_roles ?? [] };
}

export async function updateStaff(p: Partial<Staff> & { id: number }): Promise<void> {
  if (USE_MOCK) { await new Promise(r => setTimeout(r, 200)); return; }
  const res = await fetch(new URL(`/api/v1/staff/${p.id}/`, getApiBase()).toString(), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(p),
  });
  if (!res.ok) throw new Error(`Staff save failed: ${res.status}`);
}

export type InvitedStaff = Staff & { login?: string; temp_password?: string; invitation_token?: string };

export async function inviteStaff(p: {
  full_name: string; email?: string; phone?: string;
  role: 'manager' | 'viewer'; branch_ids: number[];
}): Promise<InvitedStaff> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 400));
    const { DEFAULT_PERMS_BY_ROLE } = await import('./mocks');
    return {
      id: Date.now(),
      full_name: p.full_name,
      role: p.role,
      role_label: p.role === 'manager' ? 'Управляющий' : 'Просмотр',
      email: p.email,
      phone: p.phone,
      active: true,
      permissions: DEFAULT_PERMS_BY_ROLE[p.role],
      branch_ids: p.branch_ids,
      invited_at: new Date().toISOString(),
      login: 'olga.ivanova',
      temp_password: 'demoPass123',
    };
  }
  const res = await fetch(new URL('/api/v1/staff/invite/', getApiBase()).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(p),
  });
  if (!res.ok) throw new Error(`Invite failed: ${res.status}`);
  return await res.json();
}

export async function deleteStaff(id: number): Promise<void> {
  if (USE_MOCK) { await new Promise(r => setTimeout(r, 200)); return; }
  const res = await fetch(new URL(`/api/v1/staff/${id}/`, getApiBase()).toString(), {
    method: 'DELETE',
    headers: { Accept: 'application/json', ...authHeaders() },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || `Delete failed: ${res.status}`);
  }
}

export async function fetchSubscription(): Promise<SubscriptionStatus> {
  if (USE_MOCK) { await new Promise(r => setTimeout(r, 150)); return MOCK_SUBSCRIPTION; }
  const res = await fetch(new URL('/api/v1/billing/status/', getApiBase()).toString(), {
    headers: { Accept: 'application/json', ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Subscription fetch failed: ${res.status}`);
  return await res.json();
}

export async function startPayment(
  p: { plan: string; bank: string },
): Promise<{ payment_url: string; status?: string; message?: string }> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 500));
    return { payment_url: `https://pay.example.ru/${p.bank}?plan=${p.plan}` };
  }
  const res = await fetch(new URL('/api/v1/billing/pay/', getApiBase()).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(p),
  });
  if (!res.ok) throw new Error(`Pay init failed: ${res.status}`);
  return await res.json();
}

// MOCK-ONLY: имитация ответа менеджера через 1.5–3 сек
export async function mockManagerReply(userText: string): Promise<ChatMessage> {
  await new Promise(r => setTimeout(r, 1500 + Math.random() * 1500));
  const lc = userText.toLowerCase();
  let reply = 'Понял, разберусь и вернусь с ответом!';
  if (/спасиб|благодар/.test(lc)) reply = 'Всегда пожалуйста 🤝';
  else if (/баг|ошибк|не работает|глюк/.test(lc)) reply = 'Подскажите, на каком экране именно? Если можно — скрин в чат.';
  else if (/тариф|цен|оплат/.test(lc)) reply = 'По тарифу: сейчас вы на «Стандарт». Могу прислать сравнение тарифов — нужно?';
  else if (/автоответ/.test(lc)) reply = 'Автоответы — в «Ещё → Автоответы». Главный тогл сверху. Нужно подсказать что-то конкретное?';
  else if (/точк|филиал|кофейн/.test(lc)) reply = 'Скиньте, пожалуйста, название и город — подключу в течение суток.';
  else if (/прив|здравств|добр/.test(lc)) reply = 'Здравствуйте! Чем могу помочь?';
  return {
    id: Date.now() + 1,
    sender: 'manager',
    text: reply,
    created_at: new Date().toISOString(),
    status: 'delivered',
  };
}

// ════════════════════════════════════════════════════════════════════
// COIN ADJUSTMENT — ручная корректировка баланса гостя админом
// ════════════════════════════════════════════════════════════════════
export async function adjustGuestCoins(p: CoinAdjustment): Promise<GuestCoinTxn> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 350));
    const cached = MOCK_GUEST_DETAILS[p.vk_id];
    const newBalance = (cached?.coins_balance ?? 0) + p.amount;
    if (cached) {
      cached.coins_balance = newBalance;
      if (p.amount > 0) cached.total_earned += p.amount;
      else cached.total_spent += Math.abs(p.amount);
      cached.recent_txns.unshift({
        id: Date.now(), type: 'ADJUST', source: 'ADMIN',
        amount: p.amount, balance_after: newBalance,
        description: p.reason || 'Корректировка администратором',
        created_at: new Date().toISOString(),
      });
    }
    return {
      id: Date.now(), type: 'ADJUST', source: 'ADMIN',
      amount: p.amount, balance_after: newBalance,
      description: p.reason || 'Корректировка администратором',
      created_at: new Date().toISOString(),
    };
  }
  const res = await fetch(new URL(`/api/v1/guests/${encodeURIComponent(p.vk_id)}/adjust-coins/`, getApiBase()).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ amount: p.amount, reason: p.reason }),
  });
  if (!res.ok) throw new Error(`Coin adjust failed: ${res.status}`);
  return await res.json();
}

// ════════════════════════════════════════════════════════════════════
// CATALOG — Categories CRUD
// ════════════════════════════════════════════════════════════════════
export async function fetchCategories(p: { branch_ids?: number[] } = {}): Promise<ProductCategory[]> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 200));
    if (p.branch_ids?.length) return MOCK_CATEGORIES.filter(c => p.branch_ids!.includes(c.branch_id));
    return MOCK_CATEGORIES;
  }
  const url = new URL('/api/v1/catalog/categories/', getApiBase());
  if (p.branch_ids?.length) url.searchParams.set('branch_ids', p.branch_ids.join(','));
  const res = await fetch(url.toString(), { headers: { Accept: 'application/json', ...authHeaders() } });
  if (!res.ok) throw new Error(`Categories fetch failed: ${res.status}`);
  const data = await res.json();
  return data.categories ?? [];
}

export async function saveCategory(p: Partial<ProductCategory> & { name: string; branch_id: number }): Promise<ProductCategory> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 250));
    if (p.id) {
      const existing = MOCK_CATEGORIES.find(c => c.id === p.id);
      if (existing) {
        Object.assign(existing, p);
        return existing;
      }
    }
    const created: ProductCategory = {
      id: nextCategoryId(),
      branch_id: p.branch_id, name: p.name,
      ordering: p.ordering ?? 0,
      products_count: 0,
    };
    MOCK_CATEGORIES.push(created);
    return created;
  }
  const isUpdate = !!p.id;
  const url = isUpdate
    ? new URL(`/api/v1/catalog/categories/${p.id}/`, getApiBase())
    : new URL('/api/v1/catalog/categories/', getApiBase());
  const res = await fetch(url.toString(), {
    method: isUpdate ? 'PATCH' : 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(p),
  });
  if (!res.ok) throw new Error(`Category save failed: ${res.status}`);
  return await res.json();
}

export async function deleteCategory(id: number): Promise<void> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 200));
    const idx = MOCK_CATEGORIES.findIndex(c => c.id === id);
    if (idx >= 0) MOCK_CATEGORIES.splice(idx, 1);
    return;
  }
  const res = await fetch(new URL(`/api/v1/catalog/categories/${id}/`, getApiBase()).toString(), {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Category delete failed: ${res.status}`);
}

// ════════════════════════════════════════════════════════════════════
// CATALOG — Products CRUD
// ════════════════════════════════════════════════════════════════════
export async function fetchProducts(): Promise<Product[]> {
  if (USE_MOCK) { await new Promise(r => setTimeout(r, 250)); return MOCK_PRODUCTS; }
  const res = await fetch(new URL('/api/v1/catalog/products/', getApiBase()).toString(), {
    headers: { Accept: 'application/json', ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Products fetch failed: ${res.status}`);
  const data = await res.json();
  const base = getApiBase();
  return (data.products ?? []).map((p: Product) => ({
    ...p,
    image_url: p.image_url
      ? (p.image_url.startsWith('http') ? p.image_url : `${base}${p.image_url}`)
      : null,
  }));
}

export async function saveProduct(p: Partial<Product> & {
  name: string; price: number;
}): Promise<Product> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 400));
    if (p.id) {
      const existing = MOCK_PRODUCTS.find(x => x.id === p.id);
      if (existing) {
        Object.assign(existing, p, { updated_at: new Date().toISOString() });
        return existing;
      }
    }
    const created: Product = {
      id: nextProductId(),
      name: p.name, description: p.description ?? '',
      image_url: p.image_local_uri ?? p.image_url ?? null,
      price: p.price,
      is_super_prize: p.is_super_prize ?? false,
      is_birthday_prize: p.is_birthday_prize ?? false,
      assignments: p.assignments ?? [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    MOCK_PRODUCTS.push(created);
    return created;
  }
  // Real backend: multipart/form-data чтобы передать фото
  const fd = new FormData();
  fd.append('name', p.name);
  fd.append('description', p.description ?? '');
  fd.append('price', String(p.price));
  fd.append('is_super_prize', p.is_super_prize ? '1' : '0');
  fd.append('is_birthday_prize', p.is_birthday_prize ? '1' : '0');
  if (p.assignments) fd.append('assignments', JSON.stringify(p.assignments));
  if (p.image_local_uri) {
    const filename = p.image_local_uri.split('/').pop() ?? 'image.jpg';
    const ext = (filename.split('.').pop() ?? 'jpg').toLowerCase();
    fd.append('image', { uri: p.image_local_uri, name: filename, type: `image/${ext === 'jpg' ? 'jpeg' : ext}` } as any);
  }
  const isUpdate = !!p.id;
  const url = isUpdate
    ? new URL(`/api/v1/catalog/products/${p.id}/`, getApiBase())
    : new URL('/api/v1/catalog/products/', getApiBase());
  const res = await fetch(url.toString(), {
    method: isUpdate ? 'PATCH' : 'POST',
    headers: { ...authHeaders() },
    body: fd,
  });
  if (!res.ok) throw new Error(`Product save failed: ${res.status}`);
  return await res.json();
}

export async function deleteProduct(id: number): Promise<void> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 200));
    const idx = MOCK_PRODUCTS.findIndex(x => x.id === id);
    if (idx >= 0) MOCK_PRODUCTS.splice(idx, 1);
    return;
  }
  const res = await fetch(new URL(`/api/v1/catalog/products/${id}/`, getApiBase()).toString(), {
    method: 'DELETE', headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Product delete failed: ${res.status}`);
}

// ════════════════════════════════════════════════════════════════════
// QUESTS CRUD
// ════════════════════════════════════════════════════════════════════
export async function fetchQuests(): Promise<Quest[]> {
  if (USE_MOCK) { await new Promise(r => setTimeout(r, 200)); return MOCK_QUESTS; }
  const res = await fetch(new URL('/api/v1/quests/', getApiBase()).toString(), {
    headers: { Accept: 'application/json', ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Quests fetch failed: ${res.status}`);
  const data = await res.json();
  return data.quests ?? [];
}

export async function saveQuest(p: Partial<Quest> & {
  name: string; reward: number; branch_id: number;
}): Promise<Quest> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 300));
    if (p.id) {
      const existing = MOCK_QUESTS.find(x => x.id === p.id);
      if (existing) {
        Object.assign(existing, p, { updated_at: new Date().toISOString() });
        return existing;
      }
    }
    const created: Quest = {
      id: nextQuestId(),
      branch_id: p.branch_id, name: p.name,
      description: p.description ?? '',
      reward: p.reward,
      is_active: p.is_active ?? true,
      ordering: p.ordering ?? 0,
      submits_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    MOCK_QUESTS.push(created);
    return created;
  }
  const isUpdate = !!p.id;
  const url = isUpdate
    ? new URL(`/api/v1/quests/${p.id}/`, getApiBase())
    : new URL('/api/v1/quests/', getApiBase());
  const res = await fetch(url.toString(), {
    method: isUpdate ? 'PATCH' : 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(p),
  });
  if (!res.ok) throw new Error(`Quest save failed: ${res.status}`);
  return await res.json();
}

export async function deleteQuest(id: number): Promise<void> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 200));
    const idx = MOCK_QUESTS.findIndex(x => x.id === id);
    if (idx >= 0) MOCK_QUESTS.splice(idx, 1);
    return;
  }
  const res = await fetch(new URL(`/api/v1/quests/${id}/`, getApiBase()).toString(), {
    method: 'DELETE', headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Quest delete failed: ${res.status}`);
}

// ════════════════════════════════════════════════════════════════════
// PROMOTIONS CRUD
// ════════════════════════════════════════════════════════════════════
export async function fetchPromotions(): Promise<Promotion[]> {
  if (USE_MOCK) { await new Promise(r => setTimeout(r, 200)); return MOCK_PROMOTIONS; }
  const res = await fetch(new URL('/api/v1/branch/promotions/', getApiBase()).toString(), {
    headers: { Accept: 'application/json', ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Promotions fetch failed: ${res.status}`);
  const data = await res.json();
  const base = getApiBase();
  return (data.promotions ?? []).map((p: Promotion) => ({
    ...p,
    image_url: p.image_url
      ? (p.image_url.startsWith('http') ? p.image_url : `${base}${p.image_url}`)
      : null,
  }));
}

export async function savePromotion(p: Partial<Promotion> & {
  branch_id: number; title: string; discount: string; dates: string;
}): Promise<Promotion> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 350));
    const branchName = MOCK.branches.find(b => b.id === p.branch_id)?.name;
    if (p.id) {
      const existing = MOCK_PROMOTIONS.find(x => x.id === p.id);
      if (existing) {
        Object.assign(existing, p, {
          branch_name: branchName,
          image_url: p.image_local_uri ?? existing.image_url,
          updated_at: new Date().toISOString(),
        });
        return existing;
      }
    }
    const created: Promotion = {
      id: nextPromoId(),
      branch_id: p.branch_id, branch_name: branchName,
      title: p.title, discount: p.discount, dates: p.dates,
      image_url: p.image_local_uri ?? p.image_url ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    MOCK_PROMOTIONS.push(created);
    return created;
  }
  const fd = new FormData();
  fd.append('branch_id', String(p.branch_id));
  fd.append('title', p.title);
  fd.append('discount', p.discount);
  fd.append('dates', p.dates);
  if (p.image_local_uri) {
    const filename = p.image_local_uri.split('/').pop() ?? 'image.jpg';
    const ext = (filename.split('.').pop() ?? 'jpg').toLowerCase();
    fd.append('image', { uri: p.image_local_uri, name: filename, type: `image/${ext === 'jpg' ? 'jpeg' : ext}` } as any);
  }
  const isUpdate = !!p.id;
  const url = isUpdate
    ? new URL(`/api/v1/branch/promotions/${p.id}/`, getApiBase())
    : new URL('/api/v1/branch/promotions/', getApiBase());
  const res = await fetch(url.toString(), {
    method: isUpdate ? 'PATCH' : 'POST',
    headers: { ...authHeaders() },
    body: fd,
  });
  if (!res.ok) throw new Error(`Promotion save failed: ${res.status}`);
  return await res.json();
}

export async function deletePromotion(id: number): Promise<void> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 200));
    const idx = MOCK_PROMOTIONS.findIndex(x => x.id === id);
    if (idx >= 0) MOCK_PROMOTIONS.splice(idx, 1);
    return;
  }
  const res = await fetch(new URL(`/api/v1/branch/promotions/${id}/`, getApiBase()).toString(), {
    method: 'DELETE', headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Promotion delete failed: ${res.status}`);
}

// ════════════════════════════════════════════════════════════════════
// DAILY CODES — read-only + emergency manual generation
// ════════════════════════════════════════════════════════════════════
export async function fetchDailyCodes(): Promise<DailyCode[]> {
  if (USE_MOCK) { await new Promise(r => setTimeout(r, 200)); return MOCK_DAILY_CODES; }
  const res = await fetch(new URL('/api/v1/branch/daily-codes/', getApiBase()).toString(), {
    headers: { Accept: 'application/json', ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Daily codes fetch failed: ${res.status}`);
  const data = await res.json();
  return data.codes ?? [];
}

// Аварийная генерация кода — только если на сегодня для точки нет кода
export async function generateDailyCode(p: { branch_id: number; purpose?: 'BIRTHDAY' | 'SUPERPRIZE' | 'OTHER' }): Promise<DailyCode> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 600));
    const today = new Date().toISOString().slice(0, 10);
    const branch = MOCK.branches.find(b => b.id === p.branch_id);
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const created: DailyCode = {
      id: nextDailyId(),
      branch_id: p.branch_id, branch_name: branch?.name,
      purpose: p.purpose ?? 'BIRTHDAY',
      code, valid_date: today,
      generated_by: 'MANUAL',
      created_at: new Date().toISOString(),
    };
    MOCK_DAILY_CODES.unshift(created);
    return created;
  }
  const res = await fetch(new URL('/api/v1/branch/daily-codes/generate/', getApiBase()).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ branch_id: p.branch_id, purpose: p.purpose ?? 'BIRTHDAY' }),
  });
  if (!res.ok) throw new Error(`Daily code generation failed: ${res.status}`);
  return await res.json();
}

// ════════════════════════════════════════════════════════════════════
// ENGAGEMENT ANALYTICS — подарки и квесты
// ════════════════════════════════════════════════════════════════════
export async function fetchEngagementAnalytics(p: {
  period_days?: number; branch_id?: number;
} = {}): Promise<{
  summary: EngagementSummary;
  gifts: GiftAnalytic[];
  quests: QuestAnalytic[];
}> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 350));
    return {
      summary: { ...MOCK_ENGAGEMENT_SUMMARY },
      gifts: [...MOCK_GIFTS_ANALYTICS].sort((a, b) => b.redeemed_count - a.redeemed_count),
      quests: [...MOCK_QUESTS_ANALYTICS].sort((a, b) => b.completed_count - a.completed_count),
    };
  }
  const url = new URL('/api/v1/analytics/engagement/', getApiBase());
  if (p.period_days) url.searchParams.set('period_days', String(p.period_days));
  if (p.branch_id) url.searchParams.set('branch_id', String(p.branch_id));
  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json', ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Engagement analytics failed: ${res.status}`);
  return await res.json();
}

