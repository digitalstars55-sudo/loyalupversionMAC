/**
 * NETWORK STATUS
 *
 * Простой детектор онлайн/оффлайн с подпиской. На web слушает
 * navigator.onLine + online/offline события. На native пытается
 * подключить @react-native-community/netinfo (если установлен), иначе
 * считает себя всегда онлайн (до первого fail-fetch — тогда forceOffline).
 *
 * UI использует useNetworkStatus() для рендера баннера.
 */

import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

let NetInfo: any = null;
try { NetInfo = require('@react-native-community/netinfo'); } catch {}

type Listener = (online: boolean) => void;
const listeners = new Set<Listener>();

let _online = true;
let _forceOffline = false;       // ручной режим (debug)

function emit() {
  const effective = _online && !_forceOffline;
  listeners.forEach(fn => { try { fn(effective); } catch {} });
}

export function isOnline(): boolean {
  return _online && !_forceOffline;
}

/**
 * Принудительно отметить, что соединение упало. Вызывается из api.ts при
 * fetch-ошибке (TypeError / NetworkError). Автоматически снимется при
 * следующем успешном запросе.
 */
export function markOffline() {
  if (_online) {
    _online = false;
    emit();
  }
}
export function markOnline() {
  if (!_online) {
    _online = true;
    emit();
  }
}

/**
 * Debug-toggle для ручной симуляции offline в dev/demo.
 */
export function setForceOffline(v: boolean) {
  if (_forceOffline !== v) {
    _forceOffline = v;
    emit();
  }
}
export function isForceOffline(): boolean { return _forceOffline; }

export function subscribeNetwork(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// ────────────────────────────────────────────────────────────────────
// Bootstrap (один раз при импорте)
// ────────────────────────────────────────────────────────────────────
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  _online = !!window.navigator?.onLine;
  window.addEventListener?.('online',  () => markOnline());
  window.addEventListener?.('offline', () => markOffline());
} else if (NetInfo?.addEventListener) {
  NetInfo.addEventListener((state: { isConnected?: boolean }) => {
    if (state.isConnected) markOnline(); else markOffline();
  });
}

// ────────────────────────────────────────────────────────────────────
// React hook
// ────────────────────────────────────────────────────────────────────
export function useNetworkStatus(): { online: boolean; forced: boolean } {
  const [online, setO] = useState<boolean>(isOnline());
  const [forced, setF] = useState<boolean>(_forceOffline);

  useEffect(() => {
    const u1 = subscribeNetwork(setO);
    const t = setInterval(() => setF(_forceOffline), 500); // дешёвая поллинг-синхронизация флага
    return () => { u1(); clearInterval(t); };
  }, []);

  return { online, forced };
}
