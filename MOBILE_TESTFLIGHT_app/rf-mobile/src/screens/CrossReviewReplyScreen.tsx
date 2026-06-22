import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Send } from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple } from '../platform';
import { relativeTime } from '../helpers';
import { fetchReviewMessages, appendReviewMessage } from '../api';
import { makeStyles } from '../styles';
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
// CROSS-REVIEW REPLY SCREEN — провалиться в отзыв любого клиента и ответить.
// Полноэкранный (проваливаемся, как в обычный отзыв). Запросы идут на домен
// тенанта отзыва (base override), БЕЗ смены глобального apiBase. Суперадмин.
// ════════════════════════════════════════════════════════════════════
export const CrossReviewReplyScreen: React.FC<{
  target: CrossReviewTarget;
  onBack: () => void;
  onReplied?: (conversation_id: number) => void;
}> = ({ target, onBack, onReplied }) => {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);

  const [messages, setMessages] = useState<TestimonialMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchReviewMessages({ review_id: target.conversation_id, base: target.domain })
      .then(setMessages)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [target.conversation_id, target.domain]);

  const onSend = async () => {
    if (!replyText.trim()) return;
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

  const color = SENT_COLOR[target.sentiment_class] || '#6b7280';

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="dark" />

      <View style={s.backHeader}>
        <Pressable style={s.backBtn} {...ripple()} onPress={onBack}>
          <ChevronLeft size={20} color={C.ink} strokeWidth={2.2} />
        </Pressable>
        <View style={s.screenTitleBlock}>
          <Text style={s.screenTitleSuper} numberOfLines={1}>{target.client}</Text>
          <Text style={s.screenTitleMain}>Отзыв гостя</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        style={{ flex: 1 }}
      >
        {/* Метаданные отзыва */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: r.pad, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.line }}>
          <View style={{ backgroundColor: color, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{target.sentiment_label}</Text>
          </View>
          {target.rating ? <Text style={{ fontSize: 12, color: C.ink3, fontWeight: '700' }}>★ {target.rating}</Text> : null}
          <Text style={{ fontSize: 12, color: C.ink4 }}>{relativeTime(target.created_at)}</Text>
        </View>

        {/* Тред */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: r.pad, gap: 8 }} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={{ paddingVertical: 30, alignItems: 'center' }}><ActivityIndicator color={C.purple} /></View>
          ) : messages.length === 0 ? (
            <Bubble admin={false} text={target.text} time={target.created_at} />
          ) : (
            messages.map((m, i) => (
              <Bubble key={`${m.id}_${i}`} admin={m.source === 'ADMIN_REPLY'} text={m.text} time={m.created_at} who={m.admin_name} />
            ))
          )}
        </ScrollView>

        {/* Поле ответа */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 8 : 12, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.paper }}>
          <TextInput
            value={replyText}
            onChangeText={setReplyText}
            placeholder="Ответить гостю…"
            placeholderTextColor={C.ink4}
            multiline
            style={{ flex: 1, maxHeight: 120, minHeight: 44, backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, paddingTop: 11, paddingBottom: 11, fontSize: 14, color: C.ink }}
          />
          <Pressable
            onPress={onSend}
            disabled={sending || !replyText.trim()}
            style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: (sending || !replyText.trim()) ? C.line : C.purple, alignItems: 'center', justifyContent: 'center' }}
            {...ripple('rgba(255,255,255,0.25)')}
          >
            {sending ? <ActivityIndicator color="#fff" size="small" /> : <Send size={18} color="#fff" strokeWidth={2.2} />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const Bubble: React.FC<{ admin: boolean; text: string; time?: string; who?: string }> = ({ admin, text, time, who }) => (
  <View style={{ alignSelf: admin ? 'flex-end' : 'flex-start', maxWidth: '88%' }}>
    <View style={{ backgroundColor: admin ? C.purple : C.surface, borderWidth: admin ? 0 : 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 }}>
      <Text style={{ fontSize: 14, lineHeight: 19, color: admin ? '#fff' : C.ink2 }}>{text}</Text>
    </View>
    <Text style={{ fontSize: 10, color: C.ink4, marginTop: 3, alignSelf: admin ? 'flex-end' : 'flex-start' }}>
      {admin ? (who ? `${who} · ` : 'Вы · ') : ''}{time ? relativeTime(time) : ''}
    </Text>
  </View>
);
