/**
 * REALTIME EVENT BUS
 *
 * Тонкий слой между мобайлом и WebSocket/SSE-каналом бэка. Сейчас работает
 * через mock — таймеры, имитирующие presence/typing/read-receipts. Когда
 * появится реальный WS, он будет публиковать в тот же bus, и UI ничего
 * менять не придётся.
 *
 * Топики:
 *   chat:typing    — менеджер начал/закончил печатать
 *   chat:message   — новое входящее сообщение от менеджера
 *   chat:read      — менеджер прочитал сообщения пользователя (массив id)
 *   chat:presence  — manager.online сменился
 *   chat:user-typing — пользователь печатает (отправляется на бэк, но в моке
 *                     просто логируется — нужен для будущей серверной логики)
 */

import { USE_MOCK } from './api';
import type { ChatMessage } from './types';

// ────────────────────────────────────────────────────────────────────
// Event types
// ────────────────────────────────────────────────────────────────────
export type RealtimeEvent =
  | { topic: 'chat:typing'; typing: boolean }
  | { topic: 'chat:message'; message: ChatMessage }
  | { topic: 'chat:read'; message_ids: number[] }
  | { topic: 'chat:presence'; online: boolean; last_seen?: string }
  | { topic: 'chat:user-typing'; typing: boolean };

type Listener = (e: RealtimeEvent) => void;

// ────────────────────────────────────────────────────────────────────
// Singleton bus
// ────────────────────────────────────────────────────────────────────
const listeners = new Set<Listener>();

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function emit(e: RealtimeEvent) {
  listeners.forEach(fn => { try { fn(e); } catch {} });
}

// ────────────────────────────────────────────────────────────────────
// Outbound (mobile → backend)
// ────────────────────────────────────────────────────────────────────
let userTypingTimer: any = null;
export function notifyUserTyping(typing: boolean) {
  // Локально шлём в bus тоже, чтобы любой компонент мог подсветить состояние,
  // не выходя за пределы клиента. Реальный WS отправит на бэк.
  emit({ topic: 'chat:user-typing', typing });
  if (typing) {
    if (userTypingTimer) clearTimeout(userTypingTimer);
    userTypingTimer = setTimeout(() => {
      emit({ topic: 'chat:user-typing', typing: false });
    }, 3000);
  }
}

// ────────────────────────────────────────────────────────────────────
// Mock layer — имитирует серверные события
// ────────────────────────────────────────────────────────────────────
let mockStarted = false;
let presenceTimer: any = null;
let currentlyOnline = true;

/**
 * Запускается один раз при старте приложения. Если USE_MOCK=false — ничего
 * не делает (реальный WS придёт сюда сам через connectWebSocket()).
 */
export function startMockRealtime() {
  if (mockStarted || !USE_MOCK) return;
  mockStarted = true;

  // Каждые 90–180 сек переключаем статус менеджера online ↔ offline
  const schedulePresenceFlip = () => {
    const delay = (90 + Math.random() * 90) * 1000;
    presenceTimer = setTimeout(() => {
      currentlyOnline = !currentlyOnline;
      emit({
        topic: 'chat:presence',
        online: currentlyOnline,
        last_seen: currentlyOnline ? undefined : new Date().toISOString(),
      });
      schedulePresenceFlip();
    }, delay);
  };
  schedulePresenceFlip();
}

export function stopMockRealtime() {
  mockStarted = false;
  if (presenceTimer) { clearTimeout(presenceTimer); presenceTimer = null; }
}

/**
 * Использует send-to-backend семантику: после того как пользователь отправил
 * сообщение, мок инсценирует ответ — typing → message → read-receipts.
 * Возвращает реплай-payload, чтобы подписчики получили его через bus.
 */
export async function mockManagerReplyFlow(
  userMsgId: number,
  buildReply: () => Promise<ChatMessage>,
) {
  if (!USE_MOCK) return;

  // 1) typing on (через 700 мс)
  setTimeout(() => emit({ topic: 'chat:typing', typing: true }), 700);

  // 2) пока менеджер «печатает» — он успевает прочитать наше сообщение
  setTimeout(() => emit({ topic: 'chat:read', message_ids: [userMsgId] }), 1100);

  try {
    const reply = await buildReply();
    // 3) typing off + message arrives
    emit({ topic: 'chat:typing', typing: false });
    emit({ topic: 'chat:message', message: reply });
  } catch {
    emit({ topic: 'chat:typing', typing: false });
  }
}

/**
 * Когда пользователь сам отправляет сообщение, моментально шлём read-receipt
 * для всех ранее не прочитанных user-сообщений (в реале — это пришлёт сервер
 * как только менеджер откроет диалог). Для упрощения считаем, что менеджер
 * читает входящие через 5 секунд.
 */
export function mockReadReceiptDelayed(messageIds: number[]) {
  if (!USE_MOCK || messageIds.length === 0) return;
  setTimeout(() => emit({ topic: 'chat:read', message_ids: messageIds }), 5000);
}
