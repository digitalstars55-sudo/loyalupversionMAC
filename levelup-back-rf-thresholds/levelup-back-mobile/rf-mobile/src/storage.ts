import { Platform } from 'react-native';

// ════════════════════════════════════════════════════════════════════
// STORAGE — единый интерфейс для хранения токена и настроек
// ════════════════════════════════════════════════════════════════════
// • web      → window.localStorage (нет sandbox'а — это нормально для веба)
// • native   → expo-secure-store если установлен (Keychain на iOS,
//              EncryptedSharedPreferences на Android)
//              иначе AsyncStorage если установлен
//              иначе in-memory (теряется при перезапуске)
//
// Чувствительные ключи (типа AUTH_TOKEN) автоматически уезжают в SecureStore,
// если он установлен. Для не-чувствительных — обычное хранилище.
//
// Под Expo установить:
//   npx expo install expo-secure-store
//   npx expo install @react-native-async-storage/async-storage
// ════════════════════════════════════════════════════════════════════

let AsyncStorage: any = null;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {}

let SecureStore: any = null;
try {
  // expo-secure-store работает только на native; на web — undefined
  if (Platform.OS !== 'web') {
    SecureStore = require('expo-secure-store');
  }
} catch {}

// in-memory fallback
const _mem: Record<string, string> = {};

// Ключи которые мы храним в SecureStore (если он есть). Всё остальное —
// обычное AsyncStorage/localStorage. Сравнение по точному совпадению.
const SECURE_KEYS = new Set<string>(['@loyalup/auth_token', '@loyalup/refresh_token']);

function isSecureKey(key: string): boolean { return SECURE_KEYS.has(key); }

// SecureStore не любит ключи с символами `/`, `@`, ':' в начале. Заменяем
// потенциально-проблемные символы на `_` для secure-операций.
function secureKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try { return window.localStorage.getItem(key); } catch { return null; }
    }
    if (SecureStore && isSecureKey(key)) {
      try {
        const v = await SecureStore.getItemAsync(secureKey(key));
        if (v != null) return v;
      } catch {}
      // fall-through: пробуем AsyncStorage если SecureStore не вернул
    }
    if (AsyncStorage) {
      try { return await AsyncStorage.getItem(key); } catch { return null; }
    }
    return _mem[key] ?? null;
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try { window.localStorage.setItem(key, value); } catch {}
      return;
    }
    if (SecureStore && isSecureKey(key)) {
      try { await SecureStore.setItemAsync(secureKey(key), value); return; } catch {}
    }
    if (AsyncStorage) {
      try { await AsyncStorage.setItem(key, value); } catch {}
      return;
    }
    _mem[key] = value;
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try { window.localStorage.removeItem(key); } catch {}
      return;
    }
    if (SecureStore && isSecureKey(key)) {
      try { await SecureStore.deleteItemAsync(secureKey(key)); } catch {}
    }
    if (AsyncStorage) {
      try { await AsyncStorage.removeItem(key); } catch {}
      return;
    }
    delete _mem[key];
  },
};

// Ключи
export const STORAGE_KEYS = {
  AUTH_TOKEN:    '@loyalup/auth_token',
  REFRESH_TOKEN: '@loyalup/refresh_token',
  PROFILE:       '@loyalup/profile',
} as const;

// ════════════════════════════════════════════════════════════════════
// CACHE LAYER — для offline-режима
// ════════════════════════════════════════════════════════════════════
// Конверт: { data, ts } — где ts = timestamp последнего успешного fetch.
// TTL не задаётся жёстко: stale-while-revalidate решает экранов код, а cache
// просто говорит «это лежало здесь по такой-то ключ X секунд назад».
//
// Префикс ключей кэша — отдельный, чтобы legacy entries не путались
// с auth-storage и чтобы можно было одним вызовом `clearCache()` снести всё.
// ════════════════════════════════════════════════════════════════════
const CACHE_PREFIX = '@loyalup/cache:';

export interface CachedEnvelope<T> {
  data: T;
  ts: number;             // ms since epoch
}

export async function cacheSet<T>(key: string, data: T): Promise<void> {
  const env: CachedEnvelope<T> = { data, ts: Date.now() };
  try { await storage.setItem(CACHE_PREFIX + key, JSON.stringify(env)); } catch {}
}

export async function cacheGet<T>(key: string): Promise<CachedEnvelope<T> | null> {
  const raw = await storage.getItem(CACHE_PREFIX + key);
  if (!raw) return null;
  try { return JSON.parse(raw) as CachedEnvelope<T>; } catch { return null; }
}

export async function cacheRemove(key: string): Promise<void> {
  await storage.removeItem(CACHE_PREFIX + key);
}

/**
 * Выполнить fetcher с автоматическим write-through кэшем. Если fetcher
 * упадёт — попытаемся вернуть последний кэш (stale). Возвращает
 * `{ data, fromCache, cachedAt }` чтобы UI мог показать индикатор.
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<{ data: T; fromCache: boolean; cachedAt?: number }> {
  try {
    const fresh = await fetcher();
    cacheSet(key, fresh).catch(() => {});
    return { data: fresh, fromCache: false };
  } catch (e) {
    const cached = await cacheGet<T>(key);
    if (cached) return { data: cached.data, fromCache: true, cachedAt: cached.ts };
    throw e; // нечего отдать — пробрасываем
  }
}
