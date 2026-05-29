/**
 * TOUR TARGETS — реестр экранных координат элементов для онбординг-тура.
 * Компоненты (TabBar, кнопка Лояльчика) измеряют себя через measureInWindow
 * и кладут прямоугольник сюда. Онбординг читает их для подсветки (spotlight).
 * Плюс — глобальный запуск тура из любого места (кнопка «Ещё»).
 */

export type Rect = { x: number; y: number; width: number; height: number };

const targets: Record<string, Rect> = {};

export function setTourTarget(key: string, r: Rect): void {
  targets[key] = r;
}

export function getTourTarget(key: string): Rect | undefined {
  return targets[key];
}

// Запуск тура из любого места приложения (напр. «Пройти обучение заново» в «Ещё»).
let starter: (() => void) | null = null;

export function registerTourStarter(fn: () => void): () => void {
  starter = fn;
  return () => { if (starter === fn) starter = null; };
}

export function startTour(): void {
  starter?.();
}
