import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Send, X as XIcon } from 'lucide-react-native';

import { SheetModal } from './SheetModal';
import { C } from '../theme';
import { haptic, ripple } from '../platform';
import { relativeTime } from '../helpers';
import { fetchReviewMessages, appendReviewMessage } from '../api';
import type { TestimonialMessage } from '../types';

const SENT_COLOR: Record<string, string> = { pos: C.good, neg: C.warn, neu: '#6b7280' };

export interface CrossReviewTarget {
  conversation_id: number;
  client: string;
  domain: string;            // поддомен тенанта — куда слать ответ
  text: string;
  created_at: string;
  sentiment_label: string;
  sentiment_class: string;
  rating?: number | null;
}

// ════════════════════════════════════════════════════════════════════
// CROSS-REVIEW REPLY MODAL — открыть отзыв любого клиента и ответить сразу.
// Запросы идут на домен тенанта отзыва (base override), БЕЗ смены глобального
// apiBase — текущий контекст приложения не трогаем. Доступно суперадмину.
// ════════════════════════════════════════════════════════════════════
export const CrossReviewReplyModal: React.FC<{
  visible: boolean;
  target: CrossReviewTarget | null;
  onClose: () => void;
  onReplied?: (conversation_id: number) => void;
}> = ({ visible, target, onClose, onReplied }) => {
  const [messages, setMessages] = useState<TestimonialMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!visible || !target) return;
    setMessages([]); setReplyText('');
    setLoading(true);
    fetchReviewMessages({ review_id: target.conversation_id, base: target.domain })
      .then(setMessages)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible, target?.conversation_id, target?.domain]);

  const onSend = async () => {
    if (!replyText.trim() || !target) return;
    haptic('medium'); setSending(true);
    try {
      const sent = await appendReviewMessage({ review_id: target.conversation_id, text: replyText.trim(), base: target.domain });
      haptic('success');
      setMessages(prev => [...prev, sent]);
      setReplyText('');
      onReplied?.(target.conversation_id);
      if (sent.delivered_to_vk === false) {
        Alert.alert(
          'Ответ сохранён, но не доставлен в ВК',
          'Гость не получит уведомление в ВКонтакте (закрытый профиль или заблокировал сообщения группы). Ответ виден в карточке, но связаться придётся другим способом.',
        );
      }
    } catch (e: any) {
      haptic('error');
      Alert.alert('Не удалось отправить', e?.message ?? 'Попробуйте ещё раз.');
    } finally { setSending(false); }
  };

  const color = target ? (SENT_COLOR[target.sentiment_class] || '#6b7280') : '#6b7280';

  return (
    <SheetModal visible={visible} onClose={onClose} maxHeightPct={0.9}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.line }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: C.ink }} numberOfLines={1}>{target?.client}</Text>
            {target && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <View style={{ backgroundColor: color, borderRadius: 7, paddingHorizontal: 6, paddingVertical: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 9.5, fontWeight: '700' }}>{target.sentiment_label}</Text>
                </View>
                {target.rating ? <Text style={{ fontSize: 11, color: C.ink3 }}>★ {target.rating}</Text> : null}
                <Text style={{ fontSize: 11, color: C.ink4 }}>{relativeTime(target.created_at)}</Text>
              </View>
            )}
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={{ padding: 4 }} {...ripple()}>
            <XIcon size={20} color={C.ink3} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Thread */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 8 }} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={{ paddingVertical: 30, alignItems: 'center' }}><ActivityIndicator color={C.purple} /></View>
          ) : messages.length === 0 ? (
            // Если тред пуст — показываем хотя бы текст отзыва из сводной
            <Bubble admin={false} text={target?.text || ''} time={target?.created_at} />
          ) : (
            messages.map((m, i) => (
              <Bubble key={`${m.id}_${i}`} admin={m.source === 'ADMIN_REPLY'} text={m.text} time={m.created_at} who={m.admin_name} />
            ))
          )}
        </ScrollView>

        {/* Reply box */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12, borderTopWidth: 1, borderTopColor: C.line }}>
          <TextInput
            value={replyText}
            onChangeText={setReplyText}
            placeholder="Ответить гостю…"
            placeholderTextColor={C.ink4}
            multiline
            style={{ flex: 1, maxHeight: 120, minHeight: 42, backgroundColor: C.paper, borderRadius: 12, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10, fontSize: 14, color: C.ink }}
          />
          <Pressable
            onPress={onSend}
            disabled={sending || !replyText.trim()}
            style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: (sending || !replyText.trim()) ? C.line : C.purple, alignItems: 'center', justifyContent: 'center' }}
            {...ripple('rgba(255,255,255,0.25)')}
          >
            {sending ? <ActivityIndicator color="#fff" size="small" /> : <Send size={18} color="#fff" strokeWidth={2.2} />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SheetModal>
  );
};

const Bubble: React.FC<{ admin: boolean; text: string; time?: string; who?: string }> = ({ admin, text, time, who }) => (
  <View style={{ alignSelf: admin ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
    <View style={{ backgroundColor: admin ? C.purple : C.surface, borderWidth: admin ? 0 : 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 }}>
      <Text style={{ fontSize: 14, lineHeight: 19, color: admin ? '#fff' : C.ink2 }}>{text}</Text>
    </View>
    <Text style={{ fontSize: 10, color: C.ink4, marginTop: 3, alignSelf: admin ? 'flex-end' : 'flex-start' }}>
      {admin ? (who ? `${who} · ` : 'Вы · ') : ''}{time ? relativeTime(time) : ''}
    </Text>
  </View>
);
