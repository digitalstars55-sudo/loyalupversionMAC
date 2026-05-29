import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { X, RotateCcw, Check, ArrowDownUp } from 'lucide-react-native';

import { C } from '../theme';
import { ripple, haptic } from '../platform';
import { SheetModal } from './SheetModal';
import type { Sentiment, ReviewSource } from '../types';
import type { S } from '../styles';

// ════════════════════════════════════════════════════════════════════
// REVIEWS FILTER SHEET — мульти-измерения: тональность × статус × источник × сортировка
// ════════════════════════════════════════════════════════════════════

export type ReviewStatusKey = 'any' | 'unanswered' | 'replied' | 'draft' | 'unread';
export type ReviewSourceKey = 'any' | 'APP' | 'VK_MESSAGE';
export type ReviewSortKey   = 'time_desc' | 'time_asc' | 'severity' | 'rating_desc' | 'rating_asc';

export interface ReviewsFilters {
  sentiments: Sentiment[];   // пусто = все
  status: ReviewStatusKey;
  source: ReviewSourceKey;
  sort: ReviewSortKey;
}

export const DEFAULT_FILTERS: ReviewsFilters = {
  sentiments: [],
  status: 'any',
  source: 'any',
  sort: 'time_desc',
};

const SENTIMENTS: { key: Sentiment; label: string; emoji: string; color: string }[] = [
  { key: 'NEGATIVE',           label: 'Негатив',          emoji: '🔴', color: '#dc2626' },
  { key: 'PARTIALLY_NEGATIVE', label: 'Частично негатив', emoji: '🟠', color: '#f59e0b' },
  { key: 'NEUTRAL',            label: 'Нейтральные',      emoji: '⚪', color: '#6b7280' },
  { key: 'POSITIVE',           label: 'Позитив',          emoji: '🟢', color: '#16a34a' },
  { key: 'SPAM',               label: 'Спам',             emoji: '⚫', color: '#9ca3af' },
  { key: 'PENDING',            label: 'Ожидают анализа',  emoji: '🔵', color: '#3b82f6' },
];

const STATUSES: { key: ReviewStatusKey; label: string }[] = [
  { key: 'any',        label: 'Все'             },
  { key: 'unanswered', label: 'Не отвечено'     },
  { key: 'replied',    label: 'Отвечено'        },
  { key: 'draft',      label: 'AI-черновик'     },
  { key: 'unread',     label: 'Не прочитано'    },
];

const SOURCES: { key: ReviewSourceKey; label: string }[] = [
  { key: 'any',        label: 'Любой'           },
  { key: 'APP',        label: 'Приложение'      },
  { key: 'VK_MESSAGE', label: 'ВКонтакте'       },
];

const SORTS: { key: ReviewSortKey; label: string }[] = [
  { key: 'time_desc',   label: 'Сначала новые'    },
  { key: 'time_asc',    label: 'Сначала старые'   },
  { key: 'severity',    label: 'Сначала важные'   },
  { key: 'rating_desc', label: 'Высокие оценки'   },
  { key: 'rating_asc',  label: 'Низкие оценки'    },
];

export function activeFilterCount(f: ReviewsFilters): number {
  let n = 0;
  if (f.sentiments.length > 0) n++;
  if (f.status !== 'any') n++;
  if (f.source !== 'any') n++;
  if (f.sort !== 'time_desc') n++;
  return n;
}

export const ReviewsFilterSheet: React.FC<{
  visible: boolean;
  filters: ReviewsFilters;
  onApply: (f: ReviewsFilters) => void;
  onClose: () => void;
  s: S;
}> = ({ visible, filters, onApply, onClose, s }) => {
  const [draft, setDraft] = useState<ReviewsFilters>(filters);

  useEffect(() => { if (visible) setDraft(filters); }, [visible, filters]);

  const toggleSent = (sent: Sentiment) => () => {
    haptic('light');
    setDraft(prev => ({
      ...prev,
      sentiments: prev.sentiments.includes(sent)
        ? prev.sentiments.filter(s => s !== sent)
        : [...prev.sentiments, sent],
    }));
  };

  const setStatus = (key: ReviewStatusKey) => () => { haptic('light'); setDraft(prev => ({ ...prev, status: key })); };
  const setSource = (key: ReviewSourceKey) => () => { haptic('light'); setDraft(prev => ({ ...prev, source: key })); };
  const setSort   = (key: ReviewSortKey)   => () => { haptic('light'); setDraft(prev => ({ ...prev, sort: key })); };

  const onReset = () => { haptic('warning'); setDraft(DEFAULT_FILTERS); };

  const totalActive = useMemo(() => activeFilterCount(draft), [draft]);

  return (
    <SheetModal visible={visible} onClose={onClose} maxHeightPct={0.9}>
          <View style={s.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.modalSuper}>Отзывы</Text>
              <Text style={s.modalTitle}>Фильтры и сортировка</Text>
            </View>
            <Pressable style={s.modalClose} {...ripple()} onPress={onClose}>
              <X size={16} color={C.ink} strokeWidth={2} />
            </Pressable>
          </View>

          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 }}>
            {/* Sentiment — мульти-выбор */}
            <Text style={[s.menuSectionTitle, { paddingHorizontal: 0 }]}>Тональность</Text>
            <View style={[s.pillsRow, { paddingHorizontal: 0 }]}>
              {SENTIMENTS.map(it => {
                const active = draft.sentiments.includes(it.key);
                return (
                  <Pressable
                    key={it.key}
                    style={[s.pill, active && s.pillActive]}
                    {...ripple()}
                    onPress={toggleSent(it.key)}
                  >
                    <Text style={{ fontSize: 11, marginRight: 4 }}>{it.emoji}</Text>
                    <Text style={[s.pillText, active && s.pillTextActive]}>{it.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[s.modalHintText, { paddingHorizontal: 8, marginTop: -2, marginBottom: 6 }]}>
              Можно выбрать несколько. Если ничего не выбрано — показываются все.
            </Text>

            {/* Status — single */}
            <Text style={[s.menuSectionTitle, { paddingHorizontal: 0, marginTop: 4 }]}>Статус ответа</Text>
            <View style={[s.pillsRow, { paddingHorizontal: 0 }]}>
              {STATUSES.map(st => {
                const active = draft.status === st.key;
                return (
                  <Pressable
                    key={st.key}
                    style={[s.pill, active && s.pillActive]}
                    {...ripple()}
                    onPress={setStatus(st.key)}
                  >
                    <Text style={[s.pillText, active && s.pillTextActive]}>{st.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Source */}
            <Text style={[s.menuSectionTitle, { paddingHorizontal: 0, marginTop: 4 }]}>Источник</Text>
            <View style={[s.pillsRow, { paddingHorizontal: 0 }]}>
              {SOURCES.map(sr => {
                const active = draft.source === sr.key;
                return (
                  <Pressable
                    key={sr.key}
                    style={[s.pill, active && s.pillActive]}
                    {...ripple()}
                    onPress={setSource(sr.key)}
                  >
                    <Text style={[s.pillText, active && s.pillTextActive]}>{sr.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Sort */}
            <Text style={[s.menuSectionTitle, { paddingHorizontal: 0, marginTop: 4 }]}>Сортировка</Text>
            <View style={[s.pillsRow, { paddingHorizontal: 0 }]}>
              {SORTS.map(so => {
                const active = draft.sort === so.key;
                return (
                  <Pressable
                    key={so.key}
                    style={[s.pill, active && s.pillActive]}
                    {...ripple()}
                    onPress={setSort(so.key)}
                  >
                    <ArrowDownUp size={11} color={active ? C.surface : C.ink2} strokeWidth={2.4} style={{ marginRight: 4 }} />
                    <Text style={[s.pillText, active && s.pillTextActive]}>{so.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={s.modalFooter}>
            <Pressable style={[s.btn, s.btnSecondary]} {...ripple()} onPress={onReset}>
              <RotateCcw size={14} color={C.ink2} strokeWidth={2.2} />
              <Text style={s.btnSecondaryText}>Сбросить</Text>
            </Pressable>
            <Pressable
              style={[s.btn, s.btnPrimary]}
              {...ripple('rgba(255,255,255,0.22)')}
              onPress={() => { haptic('medium'); onApply(draft); }}
            >
              <Check size={14} color={C.surface} strokeWidth={2.2} />
              <Text style={s.btnPrimaryText}>
                Применить{totalActive > 0 ? ` (${totalActive})` : ''}
              </Text>
            </Pressable>
          </View>
    </SheetModal>
  );
};
