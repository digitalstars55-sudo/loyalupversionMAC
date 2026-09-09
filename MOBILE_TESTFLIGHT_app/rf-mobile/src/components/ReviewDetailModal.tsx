import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, ScrollView,
  TextInput, Alert, ActivityIndicator, FlatList, Dimensions, Image, Linking,
} from 'react-native';
import { SheetModal } from './SheetModal';

const SCREEN_H = Dimensions.get('window').height;
import {
  X as XIcon, Send, Sparkles, Check, RefreshCw, Archive, AlertTriangle,
  Phone as PhoneIcon, Hash, Eye, Bot, Clock,
} from 'lucide-react-native';
import { C } from '../theme';
import { haptic, ripple } from '../platform';
import {
  sentimentMeta, sourceLabel, avatarColor, initials, relativeTime,
  chatTime, dayKey, dayLabel, inferredPointLabel,
} from '../helpers';
import { fetchReviewMessages, appendReviewMessage, markReviewResolved, regenerateDraft, rejectDraft, cancelAutoSend } from '../api';
import type { Review, TestimonialMessage, AutoSendStatus } from '../types';
import type { Resp } from '../responsive';
import type { S } from '../styles';

// ── Автоотправка ИИ: человекочитаемые причины «почему не отправлено» ──
const AUTO_SEND_REASONS: Record<string, string> = {
  manual_reply:      'вы ответили сами',
  rejected_draft:    'черновик отклонён',
  needs_human:       'в отзыве есть вопрос — нужен человек',
  numeric_only:      'оценка без текста',
  no_vk_sender:      'гость не из ВК',
  daily_limit:       'исчерпан лимит на сегодня',
  branch_disabled:   'для точки выключено',
  config_off:        'автоотправка выключена',
  draft_changed:     'черновик изменился',
  cancelled_by_user: 'отменено вручную',
  guest_wrote_again: 'гость написал ещё — черновик обновляется',
  superseded:        'заменено новым планом',
};

export const autoSendReasonText = (code?: string): string => {
  if (!code) return 'причина не указана';
  if (code.startsWith('vk_error')) {
    const tail = code.slice('vk_error'.length).replace(/^[:\s]+/, '');
    return tail ? `ошибка ВК: ${tail}` : 'ошибка ВК';
  }
  return AUTO_SEND_REASONS[code] ?? code;
};

const _p2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const _sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// «в 14:35» / «завтра в 14:35» / «12.09 в 14:35» — для запланированной отправки
export const autoSendWhen = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const hhmm = `${_p2(d.getHours())}:${_p2(d.getMinutes())}`;
  const now = new Date();
  if (_sameDay(d, now)) return `в ${hhmm}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (_sameDay(d, tomorrow)) return `завтра в ${hhmm}`;
  return `${_p2(d.getDate())}.${_p2(d.getMonth() + 1)} в ${hhmm}`;
};

// «12.09 14:35» — для факта отправки
export const autoSendStamp = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${_p2(d.getDate())}.${_p2(d.getMonth() + 1)} ${_p2(d.getHours())}:${_p2(d.getMinutes())}`;
};

// ════════════════════════════════════════════════════════════════════
// REVIEW DETAIL MODAL — открытый отзыв = переписка с гостем
// Сообщения от гостя слева, ответы админа справа. Ввод снизу.
// ════════════════════════════════════════════════════════════════════
export const ReviewDetailModal: React.FC<{
  visible: boolean;
  review: Review | null;
  onClose: () => void;
  onUpdate: (review: Review) => void;
  s: S;
  r: Resp;
}> = ({ visible, review, onClose, onUpdate, s, r }) => {
  const [messages, setMessages] = useState<TestimonialMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [draftRejected, setDraftRejected] = useState(false);
  // Локальный статус автоотправки — чтобы баннер обновлялся сразу после отмены
  const [autoStatus, setAutoStatus] = useState<AutoSendStatus>('');
  const [cancellingAuto, setCancellingAuto] = useState(false);
  const listRef = useRef<FlatList<TestimonialMessage>>(null);

  // Загружаем thread при открытии
  useEffect(() => {
    if (!visible || !review) return;
    setLoading(true);
    setMessages([]);
    setReplyText(review.has_draft && !draftRejected ? (review.draft_text ?? '') : '');
    setDraftRejected(false);
    setAutoStatus(review.auto_send_status ?? '');
    fetchReviewMessages({ review_id: review.id })
      .then(setMessages)
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, review?.id]);

  // Автоскролл к последнему сообщению
  useEffect(() => {
    if (messages.length === 0) return;
    const t = setTimeout(() => {
      try { listRef.current?.scrollToEnd({ animated: true }); } catch {}
    }, 80);
    return () => clearTimeout(t);
  }, [messages.length]);

  if (!review) return null;

  const meta = sentimentMeta(review.sentiment);
  // Подсказка «предполагаемая точка» — только для тредов без точки (ВК)
  const inferredPoint = inferredPointLabel(review);
  const sources = review.sources ?? [review.source];
  const isVk = sources.includes('VK_MESSAGE');
  // Ответить можно ЛЮБОМУ гостю с vk_sender_id — и тому, кто писал в группу,
  // и тому, кто писал из миниаппа (бэк отправит через сообщество ВК → если
  // гость не подписан, fallback на локальное сохранение + warning в UI).
  const canReply = !!review.vk_sender_id;

  // Когда показывать AI-черновик-баннер: если черновик есть и админ ещё не ответил
  const hasAnyAdminMsg = messages.some(m => m.source === 'ADMIN_REPLY');
  const showDraftBanner = canReply && !!review.has_draft && !draftRejected && !hasAnyAdminMsg;

  const doSend = async () => {
    if (!replyText.trim()) return;
    haptic('medium');
    setSending(true);
    try {
      const sent = await appendReviewMessage({ review_id: review.id, text: replyText.trim() });
      haptic('success');
      // Добавляем в локальный thread
      setMessages(prev => [...prev, sent]);
      // Обновляем родительский Review (стало replied=true, draft очистился)
      // Ручной ответ отменяет запланированный автоответ (бэк делает то же самое)
      const autoAfter: AutoSendStatus = autoStatus === 'scheduled' ? 'cancelled' : autoStatus;
      if (autoStatus === 'scheduled') setAutoStatus('cancelled');
      onUpdate({
        ...review,
        is_replied: true, has_unread: false,
        has_draft: false, draft_text: undefined,
        last_message_at: sent.created_at,
        messages: [...(review.messages ?? messages), sent],
        auto_send_status: autoAfter,
        ...(autoStatus === 'scheduled' ? { auto_send_reason: 'manual_reply' } : {}),
      });
      setReplyText('');
      // Если VK reply не прошёл (гость заблокировал группу или не подписан) —
      // ответ сохранён локально, но гость не получит push в ВК. Показываем warn,
      // чтобы менеджер понимал что надо найти альтернативный канал связи.
      if (sent.delivered_to_vk === false) {
        Alert.alert(
          'Ответ сохранён, но не доставлен в ВК',
          'Гость не получит уведомление в ВКонтакте (заблокировал сообщения от группы или закрытый профиль). Ответ виден в карточке отзыва, но придётся связаться с ним другим способом.',
        );
      }
    } catch (e: any) {
      haptic('error');
      Alert.alert('Ошибка', e?.message ?? 'Не удалось отправить ответ');
    } finally {
      setSending(false);
    }
  };

  // Если ИИ уже запланировал автоответ — спрашиваем, отправлять ли свой вместо него.
  // Бэк сам снимет запланированную отправку при ручном ответе.
  const onSend = () => {
    if (!replyText.trim()) return;
    if (autoStatus === 'scheduled') {
      Alert.alert(
        'Запланирован автоответ ИИ',
        'Отправить ваш ответ вместо него?',
        [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Да', onPress: () => { doSend(); } },
        ],
      );
      return;
    }
    doSend();
  };

  const onCancelAutoSend = async () => {
    haptic('warning');
    setCancellingAuto(true);
    try {
      await cancelAutoSend(review.id);
      haptic('success');
      setAutoStatus('cancelled');
      onUpdate({ ...review, auto_send_status: 'cancelled', auto_send_reason: 'cancelled_by_user' });
    } catch (e: any) {
      haptic('error');
      if (e?.status === 409) {
        // ИИ успел ответить, пока открыт экран — синхронизируем статус
        setAutoStatus('sent');
        onUpdate({ ...review, auto_send_status: 'sent' });
      }
      Alert.alert('Не удалось отменить', e?.message ?? 'Попробуйте ещё раз');
    } finally {
      setCancellingAuto(false);
    }
  };

  const onRegenerate = async () => {
    if (!canReply) return;
    haptic('light');
    setRegenerating(true);
    try {
      const { draft_text } = await regenerateDraft({ review_id: review.id });
      setReplyText(draft_text);
      onUpdate({ ...review, has_draft: true, draft_text, draft_created_at: new Date().toISOString() });
      setDraftRejected(false);
      haptic('success');
    } catch (e: any) {
      haptic('error');
      Alert.alert('Ошибка', e?.message ?? 'Не удалось перегенерировать');
    } finally { setRegenerating(false); }
  };

  // Кнопка «Вставить ссылки» — только для позитивных отзывов, если у точки заданы обе ссылки.
  const hasReviewLinks =
    review.sentiment === 'POSITIVE' && !!review.review_link_yandex && !!review.review_link_2gis;
  const onInsertLinks = () => {
    const ya = review.review_link_yandex || '';
    const gis = review.review_link_2gis || '';
    if (ya && replyText.includes(ya)) return; // уже вставлено
    haptic('light');
    const block =
      '\n\nБудем очень рады, если вы также оставите отзыв о нас на Яндекс Картах и в 2ГИС — это помогает другим гостям выбрать нас:\n' +
      'Яндекс Карты: ' + ya + '\n2ГИС: ' + gis;
    setReplyText((prev) => prev.replace(/\s+$/, '') + block);
  };

  const onRejectDraft = () => {
    haptic('warning');
    Alert.alert(
      'Отклонить черновик?',
      'Поле очистится — напишете ответ сами. Напоминания об этом отзыве больше не будут приходить.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Отклонить', style: 'destructive', onPress: async () => {
            try {
              await rejectDraft({ review_id: review.id });
              setReplyText('');
              setDraftRejected(true);
              onUpdate({ ...review, has_draft: false, draft_text: undefined });
            } catch (e: any) {
              haptic('error');
              Alert.alert('Ошибка', e?.message ?? 'Не удалось');
            }
          },
        },
      ],
    );
  };

  // Закрытие диалога без ответа: только если уже отвечено или это APP-отзыв
  const isNegative = review.sentiment === 'NEGATIVE' || review.sentiment === 'PARTIALLY_NEGATIVE';
  const closeMode: 'archive' | 'closeNoReply' | 'forbidden' =
    review.is_replied || review.source === 'APP'
      ? 'archive'
      : isNegative ? 'forbidden' : 'closeNoReply';
  const showResolveButton = closeMode !== 'forbidden';
  const showRequireReplyHint = closeMode === 'forbidden' && !hasAnyAdminMsg;

  const onResolve = () => {
    haptic('light');
    const cfg = closeMode === 'archive'
      ? { title: 'Отметить решённым?', body: 'Отзыв уйдёт в архив. Найти его потом — в фильтре «Отвечено».', confirm: 'Решено' }
      : { title: 'Закрыть без ответа?', body: 'Гость не получит сообщения. Используйте если связались с ним вне приложения (звонок, лично).', confirm: 'Закрыть' };
    Alert.alert(cfg.title, cfg.body, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: cfg.confirm, onPress: async () => {
          setResolving(true);
          try {
            await markReviewResolved({ review_id: review.id });
            haptic('success');
            onUpdate({ ...review, is_replied: true, has_unread: false });
            onClose();
          } catch (e: any) {
            haptic('error');
            Alert.alert('Ошибка', e?.message ?? 'Не удалось');
          } finally { setResolving(false); }
        },
      },
    ]);
  };

  const renderItem = ({ item, index }: { item: TestimonialMessage; index: number }) => {
    const prev = messages[index - 1];
    const showDay = !prev || dayKey(prev.created_at) !== dayKey(item.created_at);
    return (
      <View>
        {showDay && (
          <View style={s.rvThreadDay}>
            <View style={s.rvThreadDayPill}>
              <Text style={s.rvThreadDayText}>{dayLabel(item.created_at)}</Text>
            </View>
          </View>
        )}
        <ThreadBubble msg={item} s={s} />
      </View>
    );
  };

  return (
    <SheetModal visible={visible} onClose={onClose} maxHeightPct={0.94} fullHeight>
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={s.rvDetailHeader}>
            <View style={[s.rvDetailAvatar, { backgroundColor: avatarColor(review.customer_name) }]}>
              <Text style={s.rvDetailAvatarText}>{initials(review.customer_name)}</Text>
            </View>
            <View style={s.rvDetailHeadText}>
              <Text style={s.rvDetailName} numberOfLines={1} ellipsizeMode="tail">{review.customer_name}</Text>
              <Text
                style={[s.rvDetailMeta, inferredPoint ? { color: C.hintInk } : null]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {inferredPoint || review.branch_name} · {sourceLabel(review.source)}
              </Text>
            </View>
            <Pressable style={s.modalClose} {...ripple()} onPress={onClose}>
              <XIcon size={18} color={C.ink} strokeWidth={2.2} />
            </Pressable>
          </View>

          {/* Presence — кто-то из коллег сейчас работает с этим отзывом */}
          {review.presence && review.presence.length > 0 && (
            <View style={[s.presenceBanner, { marginTop: 10 }]}>
              <View style={s.presenceBannerIcon}>
                <Eye size={14} color={C.surface} strokeWidth={2.4} />
              </View>
              <Text style={s.presenceBannerText} numberOfLines={2}>
                {review.presence[0].staff_name}{' '}
                {review.presence[0].state === 'typing'
                  ? 'сейчас печатает ответ. Подождите чтобы не отправить дубликат.'
                  : 'сейчас смотрит этот отзыв.'}
              </Text>
            </View>
          )}

          {/* Sentiment + AI */}
          <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
            <View style={s.rvDetailBadgeRow}>
              <View style={[s.rvCardSentiment, { backgroundColor: meta.bg }]}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: meta.color }} />
                <Text style={[s.rvCardSentimentText, { color: meta.color }]}>{meta.label}</Text>
              </View>
              {review.is_replied && (
                <View style={[s.rvCardSentiment, { backgroundColor: C.goodSoft }]}>
                  <Check size={11} color={C.good} strokeWidth={2.5} />
                  <Text style={[s.rvCardSentimentText, { color: C.good }]}>Отвечено</Text>
                </View>
              )}
            </View>

            {review.ai_comment && (
              <View style={[s.rvDetailAi, { marginBottom: 6 }]}>
                <View style={s.rvDetailAiHead}>
                  <Sparkles size={11} color={C.hintInk} strokeWidth={2.5} />
                  <Text style={s.rvDetailAiTitle}>AI-АНАЛИЗ</Text>
                </View>
                <Text style={s.rvDetailAiText}>{review.ai_comment}</Text>
              </View>
            )}
          </View>

          {/* Messages thread */}
          <View style={{ flex: 1, backgroundColor: C.bg }}>
            {loading ? (
              <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={C.purple} />
                <Text style={[s.loadingText, { marginTop: 8 }]}>Загружаем переписку…</Text>
              </View>
            ) : (
              <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(it) => String(it.id)}
                renderItem={renderItem}
                contentContainerStyle={s.rvThreadList}
                showsVerticalScrollIndicator={false}
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={() => { try { listRef.current?.scrollToEnd({ animated: false }); } catch {} }}
              />
            )}
          </View>

          {/* Reply input + actions */}
          <View style={[s.rvDetailFooter, r.isTiny && { gap: 8 }]}>
            {/* Автоотправка ИИ — статус над полем ответа */}
            {autoStatus === 'scheduled' && (
              <View style={s.rvDetailDraftBanner}>
                <View style={s.rvDetailDraftIcon}>
                  <Clock size={13} color={C.purpleDeep} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.rvDetailDraftSub, { color: C.purpleDeep, fontSize: 12.5, marginTop: 0 }]}>
                    🤖 {review.auto_send_kind === 'ack'
                      ? `ИИ напишет гостю «спасибо, разберёмся» ${autoSendWhen(review.auto_send_at)} — ответьте сами, чтобы отменить`
                      : `ИИ ответит автоматически ${autoSendWhen(review.auto_send_at)}${review.auto_send_with_links ? ' · с кнопками Яндекс/2ГИС' : ''}`}
                  </Text>
                </View>
                <Pressable
                  style={{
                    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                    backgroundColor: C.surface, borderWidth: 1, borderColor: C.purpleLine,
                    opacity: cancellingAuto ? 0.5 : 1,
                  }}
                  {...ripple()}
                  onPress={onCancelAutoSend}
                  disabled={cancellingAuto}
                >
                  {cancellingAuto
                    ? <ActivityIndicator size="small" color={C.purpleDeep} />
                    : <Text style={{ fontSize: 11.5, fontWeight: '700', color: C.purpleDeep }}>Отменить автоответ</Text>
                  }
                </Pressable>
              </View>
            )}

            {autoStatus === 'cancelled' && (
              <View style={[s.rvDetailDraftBanner, { backgroundColor: C.paper, borderColor: C.line }]}>
                <View style={s.rvDetailDraftIcon}>
                  <Bot size={13} color={C.ink3} strokeWidth={2.2} />
                </View>
                <Text style={[s.rvDetailDraftSub, { flex: 1, fontSize: 12.5, marginTop: 0 }]}>
                  Автоответ отменён — ответьте вручную
                </Text>
              </View>
            )}

            {autoStatus === 'sent' && (
              <View style={[s.rvDetailDraftBanner, { backgroundColor: C.goodSoft, borderColor: C.goodSoft }]}>
                <View style={s.rvDetailDraftIcon}>
                  <Bot size={13} color={C.good} strokeWidth={2.2} />
                </View>
                <Text style={[s.rvDetailDraftSub, { flex: 1, fontSize: 12.5, marginTop: 0, color: C.good }]}>
                  🤖 {review.auto_send_kind === 'ack'
                    ? `ИИ подтвердил получение · ${autoSendStamp(review.auto_send_at)} — ответьте гостю по существу`
                    : `Ответил ИИ · ${autoSendStamp(review.auto_send_at)}`}
                </Text>
              </View>
            )}

            {(autoStatus === 'skipped' || autoStatus === 'failed') && (
              <Text style={[s.rvDetailDraftSub, { marginBottom: 6 }]}>
                Автоответ не отправлен: {autoSendReasonText(review.auto_send_reason)}
              </Text>
            )}

            {showDraftBanner && (
              <View style={s.rvDetailDraftBanner}>
                <View style={s.rvDetailDraftIcon}>
                  <Sparkles size={13} color={C.purpleDeep} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rvDetailDraftTitle}>AI-ЧЕРНОВИК ГОТОВ</Text>
                  <Text style={s.rvDetailDraftSub}>Отредактируйте и отправьте — или отклоните, чтобы написать самому</Text>
                </View>
              </View>
            )}

            {canReply && (
              <View style={s.rvDetailReplyWrap}>
                <TextInput
                  style={s.rvDetailReplyInput}
                  multiline
                  placeholder={hasAnyAdminMsg ? 'Написать ещё одно сообщение…' : 'Напишите ответ гостю…'}
                  placeholderTextColor={C.ink4}
                  value={replyText}
                  onChangeText={setReplyText}
                  textAlignVertical="top"
                />
              </View>
            )}

            {showDraftBanner && (
              <Pressable {...ripple()} onPress={onRejectDraft}>
                <Text style={s.rvDetailRejectLink}>Отклонить черновик и написать вручную</Text>
              </Pressable>
            )}

            {showRequireReplyHint && (
              <View style={s.requireReplyHint}>
                <AlertTriangle size={13} color={C.warn} strokeWidth={2.2} />
                <Text style={s.requireReplyHintText}>
                  Негативный отзыв нельзя закрыть без ответа. Напишите гостю — даже короткое «связались по телефону» лучше тишины.
                </Text>
              </View>
            )}

            {canReply && (
              <View style={[s.actions, r.isTiny && s.actionsStack, { marginTop: 0 }]}>
                <Pressable
                  style={[s.btn, s.btnAi, (sending || regenerating) && { opacity: 0.5 }]}
                  {...ripple()}
                  onPress={onRegenerate}
                  disabled={sending || regenerating}
                >
                  {regenerating
                    ? <ActivityIndicator size="small" color={C.purpleDeep} />
                    : showDraftBanner
                      ? <RefreshCw size={14} color={C.purpleDeep} strokeWidth={2} />
                      : <Sparkles size={14} color={C.purpleDeep} strokeWidth={2} />
                  }
                  <Text style={s.btnAiText}>{showDraftBanner ? 'Перегенерировать' : 'AI-ответ'}</Text>
                </Pressable>
                {hasReviewLinks && (
                  <Pressable
                    style={[s.btn, s.btnAi, sending && { opacity: 0.5 }]}
                    {...ripple()}
                    onPress={onInsertLinks}
                    disabled={sending}
                  >
                    <Text style={s.btnAiText}>🔗 Ссылки</Text>
                  </Pressable>
                )}
                <Pressable
                  style={[s.btn, s.btnPrimary, (sending || !replyText.trim()) && { opacity: 0.5 }]}
                  {...ripple('rgba(255,255,255,0.22)')}
                  onPress={onSend}
                  disabled={sending || !replyText.trim()}
                >
                  {sending
                    ? <ActivityIndicator size="small" color={C.surface} />
                    : <Send size={14} color={C.surface} strokeWidth={2} />
                  }
                  <Text style={s.btnPrimaryText}>Отправить</Text>
                </Pressable>
              </View>
            )}

            {showResolveButton && (() => {
              const label = closeMode === 'archive' ? 'В архив' : 'Закрыть без ответа';
              const Icon = closeMode === 'archive' ? Check : Archive;
              return (
                <Pressable
                  style={[s.btn, s.btnSecondary, resolving && { opacity: 0.5 }]}
                  {...ripple()}
                  onPress={onResolve}
                  disabled={resolving}
                >
                  {resolving
                    ? <ActivityIndicator size="small" color={C.ink} />
                    : <Icon size={14} color={C.ink} strokeWidth={2} />
                  }
                  <Text style={s.btnSecondaryText}>{label}</Text>
                </Pressable>
              );
            })()}
          </View>
        </View>
    </SheetModal>
  );
};

// ─────────────────────────────────────────────
const ThreadBubble: React.FC<{ msg: TestimonialMessage; s: S }> = ({ msg, s }) => {
  const isAdmin = msg.source === 'ADMIN_REPLY';
  // Ответ, который ИИ отправил сам (автоотправка позитивных) — помечаем отдельно.
  const isAi = isAdmin && !!msg.is_ai_generated;
  // Эмодзи + текстовая метка источника. Делает быстрый scan треда легче:
  // 📱 = гость из миниаппа, 💬 = гость из ВК-сообщества, 💼 = ответ менеджера, 🤖 = ответ ИИ.
  const sourceIcon = isAi ? '🤖' : msg.source === 'APP' ? '📱' : msg.source === 'VK_MESSAGE' ? '💬' : '💼';
  const sourceLbl  = isAi ? 'ИИ' : msg.source === 'APP' ? 'из приложения' : msg.source === 'VK_MESSAGE' ? 'из ВК' : 'администратор';

  return (
    <View style={isAdmin ? s.rvBubbleRowAdmin : s.rvBubbleRowGuest}>
      <View style={[s.rvBubble, isAdmin ? s.rvBubbleAdmin : s.rvBubbleGuest]}>
        {isAdmin && (isAi || !!msg.admin_name) && (
          <Text style={s.rvBubbleAdminName}>{isAi ? '🤖 ИИ' : msg.admin_name}</Text>
        )}
        {/* LU-40: контекст «на что ответил гость» — цитата над текстом.
            Обычно это авто-опрос «Понравилось?», который сам по себе в треде
            не показывается (рассылка), но без него ответ гостя висит без смысла. */}
        {!!msg.reply_to_text && (
          <View style={{
            borderLeftWidth: 2,
            borderLeftColor: isAdmin ? 'rgba(255,255,255,0.4)' : C.purpleLine,
            paddingLeft: 8,
            marginBottom: 6,
            opacity: 0.75,
          }}>
            <Text style={{
              fontSize: 11,
              fontStyle: 'italic',
              color: isAdmin ? 'rgba(255,255,255,0.85)' : C.ink3,
            }} numberOfLines={3}>
              ↳ {msg.reply_to_text}
            </Text>
          </View>
        )}
        {!!msg.text && (
          <Text style={[s.rvBubbleText, isAdmin ? s.rvBubbleTextAdmin : s.rvBubbleTextGuest]}>
            {msg.text}
          </Text>
        )}

        {(msg.attachments ?? []).map((a, i) => {
          if (a.purged) {
            return (
              <Text key={i} style={[s.rvBubbleSource, { fontStyle: 'italic', marginTop: 4 }]}>
                🖼 фото удалено по сроку хранения
              </Text>
            );
          }
          if (!a.url) return null;
          const url = a.url;
          return (
            <Pressable key={i} onPress={() => Linking.openURL(url)} style={{ marginTop: 6 }}>
              <Image
                source={{ uri: url }}
                style={{ width: 180, height: 180, borderRadius: 10, backgroundColor: C.line }}
                resizeMode="cover"
              />
            </Pressable>
          );
        })}

        {msg.rating != null && (
          <View style={s.rvBubbleStarsRow}>
            {[1, 2, 3, 4, 5].map(i => (
              <Text
                key={i}
                style={[s.rvBubbleStar, { color: i <= (msg.rating ?? 0) ? '#F59E0B' : C.line }]}
              >★</Text>
            ))}
          </View>
        )}

        {!!msg.phone && (
          <View style={s.rvBubbleExtra}>
            <PhoneIcon size={10} color={C.ink3} strokeWidth={2.4} />
            <Text style={s.rvBubbleExtraText}>{msg.phone}</Text>
          </View>
        )}
        {msg.table_number != null && (
          <View style={s.rvBubbleExtra}>
            <Hash size={10} color={C.ink3} strokeWidth={2.4} />
            <Text style={s.rvBubbleExtraText}>Стол {msg.table_number}</Text>
          </View>
        )}

        <View style={s.rvBubbleMeta}>
          <Text style={[s.rvBubbleSource, isAdmin ? s.rvBubbleSourceAdmin : s.rvBubbleSourceGuest]}>
            {sourceIcon} {sourceLbl}
          </Text>
          <Text style={[s.rvBubbleSource, isAdmin ? s.rvBubbleSourceAdmin : s.rvBubbleSourceGuest]}>
            · {chatTime(msg.created_at)}
          </Text>
        </View>
      </View>
    </View>
  );
};
