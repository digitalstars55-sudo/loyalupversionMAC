/**
 * NAV BRIDGE — мост навигации для плавающих компонентов вне Root.
 *
 * LoyalchikAssistant смонтирован соседом Root (в AuthGate), а состояние
 * навигации (tab/sub-screen) живёт внутри Root. Чтобы ассистент мог открыть
 * нужный раздел по кнопке-действию, Root регистрирует обработчик, а ассистент
 * зовёт runAssistantAction(). Без react-navigation (навигация осознанно на state).
 */

export type AssistantActionScreen =
  | 'home'
  | 'analytics'
  | 'reviews'
  | 'chat'
  | 'campaigns'
  | 'daily-codes'
  | 'staff'
  | 'guests'
  | 'quests'
  | 'promotions'
  | 'catalog'
  | 'rf-thresholds'
  | 'auto-reply';

export type AssistantAction = {
  label: string;
  screen: AssistantActionScreen;
  params?: { reviewId?: number };
};

type Handler = (a: AssistantAction) => void;

let _handler: Handler | null = null;

/** Root вызывает это в useEffect; возвращает функцию для отписки. */
export function registerAssistantNav(fn: Handler): () => void {
  _handler = fn;
  return () => { if (_handler === fn) _handler = null; };
}

/** Возвращает true, если действие удалось передать в навигацию. */
export function runAssistantAction(a: AssistantAction): boolean {
  if (!_handler) return false;
  try { _handler(a); return true; } catch { return false; }
}
