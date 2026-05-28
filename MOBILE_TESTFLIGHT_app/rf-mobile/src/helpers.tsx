import React from 'react';
import { Text } from 'react-native';
import { C } from './theme';
import type { RFCell, Sentiment, ReviewSource, Review, RFBranch } from './types';

// ════════════════════════════════════════════════════════════════════
// HELPERS — форматирование, цвета, утилиты
// ════════════════════════════════════════════════════════════════════

export const fmtNum = (n: number) => n.toLocaleString('ru-RU').replace(/,/g, ' ');

export const cellEdgeColor = (r: number, f: number): string => {
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

// Приоритет сегмента для сортировки в Bento
export const segmentPriority = (cell: RFCell): number => {
  const { r_score: r, f_score: f, count } = cell;
  if (r === 1 && f === 3) return 1000 + count;
  if (r === 0 && f === 3) return 900 + count;
  if (r === 3 && f === 3) return 800 + count;
  if (r === 1 && f === 2) return 700 + count;
  if (r === 3 && f === 2) return 600 + count;
  if (r === 2 && f === 2) return 550 + count;
  return 100 + count;
};

// ── Sentiment meta ─────────────────────────────────────
export const sentimentMeta = (s: Sentiment): { label: string; color: string; bg: string } => {
  switch (s) {
    case 'POSITIVE':            return { label: 'Позитивный',     color: C.good,   bg: C.goodSoft };
    case 'NEGATIVE':            return { label: 'Негативный',     color: C.warn,   bg: C.warnSoft };
    case 'PARTIALLY_NEGATIVE':  return { label: 'Частично негат.', color: C.watch,  bg: C.watchSoft };
    case 'NEUTRAL':             return { label: 'Нейтральный',    color: C.ink3,   bg: C.lineSoft };
    case 'SPAM':                return { label: 'Спам',           color: C.ink4,   bg: C.lineSoft };
    case 'PENDING':             return { label: 'В обработке',    color: C.purple, bg: C.purpleSoft };
  }
};

export const sourceLabel = (src: ReviewSource): string =>
  src === 'APP' ? 'Приложение' : 'ВКонтакте';

// Цвет аватара по имени — стабильный hash
const AVATAR_COLORS = [C.purple, C.good, C.watch, C.warn, C.limeDeep, C.ink2];
export const avatarColor = (name: string): string => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h << 5) - h + name.charCodeAt(i);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};

export const initials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

// «5 минут назад» / «3 часа назад» / «вчера» / «12 апр»
export const relativeTime = (iso: string): string => {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} мин назад`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ч назад`;
  const days = Math.floor(hr / 24);
  if (days === 1) return 'вчера';
  if (days < 7) return `${days} дн назад`;
  const d = new Date(iso);
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
};

// ── Chat time formatting ────────────────────────────
const _months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const _pad = (n: number) => n < 10 ? `0${n}` : `${n}`;
const _isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// HH:MM — для пузырьков
export const chatTime = (iso: string): string => {
  const d = new Date(iso);
  return `${_pad(d.getHours())}:${_pad(d.getMinutes())}`;
};

// «Сегодня» / «Вчера» / «12 апреля» — для day-separator
export const dayLabel = (iso: string): string => {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date(today);
  yest.setDate(today.getDate() - 1);
  if (_isSameDay(d, today)) return 'Сегодня';
  if (_isSameDay(d, yest)) return 'Вчера';
  return `${d.getDate()} ${_months[d.getMonth()]}`;
};

// Идентификатор дня для группировки
export const dayKey = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

// ── Aggregations: avg-rating per branch (из APP-отзывов) ───────────
export interface BranchRating {
  branch_id: number;
  branch_name: string;
  avg_rating: number; // 0..5
  reviews_count: number;
}

export const computeBranchRatings = (reviews: Review[], branches: RFBranch[]): BranchRating[] => {
  const acc: Record<number, { sum: number; count: number; name: string }> = {};
  reviews.forEach(rev => {
    if (rev.source !== 'APP' || rev.rating == null) return;
    if (!acc[rev.branch_id]) acc[rev.branch_id] = { sum: 0, count: 0, name: rev.branch_name };
    acc[rev.branch_id].sum += rev.rating;
    acc[rev.branch_id].count += 1;
  });
  return branches
    .filter(b => b.id !== 0 && acc[b.id])
    .map(b => ({
      branch_id: b.id,
      branch_name: b.name,
      avg_rating: acc[b.id].sum / acc[b.id].count,
      reviews_count: acc[b.id].count,
    }))
    .sort((a, b) => b.avg_rating - a.avg_rating);
};

// ── Подробная разбивка по точке (для BranchRatingsScreen) ──────────
export interface BranchRatingDetail {
  branch_id: number;
  branch_name: string;
  branch_address?: string;
  avg_rating: number;
  reviews_count: number;
  // Распределение по звёздам (1..5 → count)
  stars_distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  // По тональностям из ВСЕХ отзывов (включая VK)
  sentiment_breakdown: { positive: number; neutral: number; partial: number; negative: number; spam: number };
  // Динамика среднего рейтинга: последние 30 дней vs 30-60 дней назад
  delta_avg_rating: number;
  // Есть ли данные за оба периода (иначе динамику не показываем)
  delta_available: boolean;
  // Свежие негативные комменты (топ-3 ai_comment)
  top_negatives: { id: number; ai_comment: string; rating?: number }[];
  // AI-рекомендация
  ai_recommendation: string;
  // Доля отвеченных (из всех неотвеченных в этой точке)
  reply_rate: number; // 0..1
}

export const computeBranchRatingsDetailed = (
  reviews: Review[],
  branches: RFBranch[],
): BranchRatingDetail[] => {
  return branches
    .filter(b => b.id !== 0)
    .map(b => {
      const branchReviews = reviews.filter(rv => rv.branch_id === b.id);
      const appReviews = branchReviews.filter(rv => rv.source === 'APP' && rv.rating != null);

      // Распределение по звёздам
      const stars: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let sum = 0;
      appReviews.forEach(rv => {
        const r = rv.rating!;
        if (r >= 1 && r <= 5) {
          stars[r as 1 | 2 | 3 | 4 | 5]++;
          sum += r;
        }
      });
      const avg = appReviews.length ? sum / appReviews.length : 0;

      // Реальная динамика: средний рейтинг за последние 30 дней vs 30-60 дней назад
      const now = Date.now();
      const D30 = 30 * 86_400_000;
      const avgInWindow = (fromAgo: number, toAgo: number): number | null => {
        const slice = appReviews.filter(rv => {
          const ts = new Date(rv.last_message_at).getTime();
          return ts <= now - fromAgo && ts > now - toAgo;
        });
        if (!slice.length) return null;
        return slice.reduce((s, rv) => s + (rv.rating ?? 0), 0) / slice.length;
      };
      const curAvg = avgInWindow(0, D30);
      const prevAvg = avgInWindow(D30, 2 * D30);
      const hasDelta = curAvg != null && prevAvg != null;
      const delta = hasDelta ? Math.round((curAvg! - prevAvg!) * 10) / 10 : 0;

      // Тональности
      const sb = { positive: 0, neutral: 0, partial: 0, negative: 0, spam: 0 };
      branchReviews.forEach(rv => {
        if (rv.sentiment === 'POSITIVE') sb.positive++;
        else if (rv.sentiment === 'NEUTRAL') sb.neutral++;
        else if (rv.sentiment === 'PARTIALLY_NEGATIVE') sb.partial++;
        else if (rv.sentiment === 'NEGATIVE') sb.negative++;
        else if (rv.sentiment === 'SPAM') sb.spam++;
      });

      // Топ негативных
      const negs = branchReviews
        .filter(rv => (rv.sentiment === 'NEGATIVE' || rv.sentiment === 'PARTIALLY_NEGATIVE') && rv.ai_comment)
        .slice(0, 3)
        .map(rv => ({ id: rv.id, ai_comment: rv.ai_comment, rating: rv.rating }));

      // Reply rate
      const needReply = branchReviews.filter(rv =>
        (rv.sentiment === 'NEGATIVE' || rv.sentiment === 'PARTIALLY_NEGATIVE')
      );
      const replied = needReply.filter(rv => rv.is_replied);
      const replyRate = needReply.length ? replied.length / needReply.length : 1;

      // AI-рекомендация по точке
      const ai = generateBranchRecommendation({
        avg, count: appReviews.length, sb, replyRate, branchName: b.name,
      });

      return {
        branch_id: b.id,
        branch_name: b.name,
        branch_address: b.address,
        avg_rating: avg,
        reviews_count: appReviews.length,
        stars_distribution: stars,
        sentiment_breakdown: sb,
        delta_avg_rating: delta,
        delta_available: hasDelta,
        top_negatives: negs,
        ai_recommendation: ai,
        reply_rate: replyRate,
      };
    })
    .filter(b => b.reviews_count > 0)
    .sort((a, b) => b.avg_rating - a.avg_rating);
};

function generateBranchRecommendation(p: {
  avg: number; count: number;
  sb: { positive: number; neutral: number; partial: number; negative: number; spam: number };
  replyRate: number; branchName: string;
}): string {
  const { avg, count, sb, replyRate } = p;
  if (count === 0) return 'Пока нет оценок из приложения. Стимулируйте гостей оставить первый отзыв — например через QR-стенды на столах.';
  if (avg >= 4.5 && sb.negative === 0) return 'Отличный показатель — точка работает стабильно. Поделитесь успехом с командой и отметьте лучших сотрудников.';
  if (avg >= 4.0 && sb.negative <= 1) {
    return `Хорошая средняя ${avg.toFixed(1)}. Чтобы выйти на 4.5+, разберите ${sb.partial} ${plural(sb.partial, ['частично-негативный отзыв', 'частично-негативных отзыва', 'частично-негативных отзывов'])} — обычно там точечные проблемы (один блюдо, один сотрудник).`;
  }
  if (sb.negative >= 3) {
    return `🚨 ${sb.negative} негативных отзывов — выше нормы. Сегодня же провести разбор: что повторяется в жалобах? Часто это: время ожидания, чистота, ошибки в заказе.`;
  }
  if (replyRate < 0.5) {
    return `⚠ Только ${Math.round(replyRate * 100)}% негативных отзывов получили ответ. Гость без ответа = повторный негатив. Установите правило: ответ в течение 4 часов.`;
  }
  if (avg < 3.5) {
    return `⚠ Средняя ${avg.toFixed(1)} — низкая. Рекомендую: 1) выехать на точку и поработать с управляющим, 2) поговорить с 5 случайными гостями лично, 3) ввести daily-разбор отзывов на смене.`;
  }
  return `Стабильная точка. Растите количество отзывов — сейчас только ${count} ${plural(count, ['оценка', 'оценки', 'оценок'])}, для надёжной статистики нужно от 30 в месяц.`;
}

export function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

// MdText — рендерит текст с **bold**-маркапом
export const MdText: React.FC<{
  text: string;
  style?: any;
  boldStyle?: any;
  numberOfLines?: number;
}> = ({ text, style, boldStyle, numberOfLines }) => {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((p, i) =>
        i % 2 === 1 ? <Text key={i} style={[style, boldStyle]}>{p}</Text> : p
      )}
    </Text>
  );
};
