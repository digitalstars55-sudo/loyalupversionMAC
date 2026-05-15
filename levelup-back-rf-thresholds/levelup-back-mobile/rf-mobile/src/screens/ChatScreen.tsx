import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, TextInput, FlatList, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Image, RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, Paperclip, Phone, X } from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple, callPhone } from '../platform';
import { initials, dayKey, dayLabel, relativeTime } from '../helpers';
import { fetchChatManager, fetchChatMessages, sendChatMessage, mockManagerReply, USE_MOCK } from '../api';
import { QUICK_REPLIES } from '../mocks';
import { makeStyles } from '../styles';
import type { ChatManager, ChatMessage, ChatAttachment } from '../types';
import type { S } from '../styles';
import { ChatBubble } from '../components/ChatBubble';
import { subscribe, mockManagerReplyFlow, notifyUserTyping } from '../realtime';

// expo-image-picker — обёрнут в try/catch, чтобы web/без модуля не падал
let ImagePicker: any = null;
try { ImagePicker = require('expo-image-picker'); } catch {}

// ════════════════════════════════════════════════════════════════════
// CHAT SCREEN — чат с менеджером ЛоялUP (с pull-to-refresh + attachments)
// ════════════════════════════════════════════════════════════════════
export const ChatScreen: React.FC<{
  messages: ChatMessage[];
  setMessages: (m: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
}> = ({ messages, setMessages }) => {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);

  const [manager, setManager] = useState<ChatManager | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [managerTyping, setManagerTyping] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);

  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    fetchChatManager().then(setManager).catch(() => {});
    if (messages.length === 0) {
      fetchChatMessages().then(setMessages).catch(() => {});
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    setMessages(prev =>
      prev.some(m => m.sender === 'manager' && m.status !== 'read')
        ? prev.map(m => m.sender === 'manager' ? { ...m, status: 'read' } : m)
        : prev
    );
  }, []); // eslint-disable-line

  // ── Realtime: только UI-эффекты (typing-индикатор + presence в шапке).
  // Глобальные мутации messages идут через App.tsx, чтобы badge работал
  // даже когда пользователь вне таба «Чат».
  useEffect(() => {
    const unsub = subscribe((e) => {
      if (e.topic === 'chat:typing') {
        setManagerTyping(e.typing);
      } else if (e.topic === 'chat:presence') {
        setManager(prev => prev ? {
          ...prev,
          online: e.online,
          last_seen: e.last_seen ?? prev.last_seen,
        } : prev);
      }
    });
    return unsub;
  }, []);

  // Когда пользователь на экране и приходит новое сообщение от менеджера —
  // мгновенно помечаем его как прочитанное (App.tsx уже добавил его в state).
  useEffect(() => {
    const unread = messages.some(m => m.sender === 'manager' && m.status !== 'read');
    if (!unread) return;
    setMessages(prev => prev.map(m =>
      m.sender === 'manager' && m.status !== 'read' ? { ...m, status: 'read' } : m
    ));
  }, [messages, setMessages]);

  // Хронологический порядок: старые сверху, новые снизу — обычный лист, не inverted.
  // На react-native-web inverted-FlatList глючит (CSS transform), поэтому делаем по-простому
  // и сами скроллим к концу при новых сообщениях.
  const ordered = messages;

  // Автоскролл к последнему сообщению при изменении списка
  useEffect(() => {
    if (ordered.length === 0) return;
    const t = setTimeout(() => {
      try { listRef.current?.scrollToEnd({ animated: true }); } catch {}
    }, 50);
    return () => clearTimeout(t);
  }, [ordered.length, managerTyping]);

  const onRefresh = async () => {
    haptic('light');
    setRefreshing(true);
    try {
      const fresh = await fetchChatMessages();
      // Простая стратегия: если на бэке больше сообщений — заменяем целиком,
      // иначе оставляем локальные (включая optimistic-добавления, которых ещё нет на бэке).
      if (fresh.length >= messages.length) setMessages(fresh);
    } catch {} finally { setRefreshing(false); }
  };

  const onPickImage = useCallback(async () => {
    haptic('light');

    // Web — нативный input[type=file]
    if (Platform.OS === 'web') {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e: any) => {
          const file: File | undefined = e.target?.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            setPendingAttachments(prev => [...prev, {
              type: 'image',
              uri: reader.result as string,
              name: file.name,
              size: file.size,
              mime: file.type,
            }]);
          };
          reader.readAsDataURL(file);
        };
        input.click();
      } catch (e: any) {
        Alert.alert('Ошибка', e?.message ?? 'Не удалось выбрать файл');
      }
      return;
    }

    // Native — expo-image-picker
    if (!ImagePicker) {
      Alert.alert('Недоступно', 'Модуль выбора изображения не подключён в этой сборке.');
      return;
    }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm?.granted) {
        Alert.alert('Доступ к галерее', 'Разрешите доступ в настройках, чтобы прикреплять фото.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? 'Images',
        quality: 0.85,
        allowsEditing: false,
      });
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (!asset?.uri) return;
      setPendingAttachments(prev => [...prev, {
        type: 'image',
        uri: asset.uri,
        name: asset.fileName ?? 'photo.jpg',
        size: asset.fileSize,
        mime: asset.mimeType,
      }]);
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message ?? 'Не удалось выбрать фото');
    }
  }, []);

  const removeAttachment = (idx: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const onSend = useCallback(async () => {
    const trimmed = text.trim();
    if ((!trimmed && pendingAttachments.length === 0) || sending) return;
    haptic('light');
    setSending(true);

    const attachments = pendingAttachments;

    const tempId = -Date.now();
    const optimistic: ChatMessage = {
      id: tempId,
      sender: 'user',
      text: trimmed,
      created_at: new Date().toISOString(),
      status: 'sending',
      attachments: attachments.length ? attachments : undefined,
    };
    setMessages(prev => [...prev, optimistic]);
    setText('');
    setPendingAttachments([]);

    try {
      const sent = await sendChatMessage({ text: trimmed });
      // Сохраняем локальные attachments в финальном сообщении (бэк примет через FormData в проде)
      setMessages(prev => prev.map(m =>
        m.id === tempId ? { ...sent, attachments: attachments.length ? attachments : undefined } : m
      ));

      if (USE_MOCK) {
        // Realtime-flow: события (typing/read/message) приходят через bus,
        // подписка выше сама обновит UI.
        mockManagerReplyFlow(sent.id, () =>
          mockManagerReply(trimmed || (attachments.length ? '[фото]' : '')),
        );
      }
    } catch (e: any) {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' as const } : m));
      haptic('error');
      Alert.alert('Не отправлено', e?.message ?? 'Попробуйте позже');
    } finally {
      setSending(false);
    }
  }, [text, pendingAttachments, sending, setMessages]);

  const onQuickReply = (q: string) => () => {
    haptic('light');
    setText(q);
  };

  const onCall = useCallback(() => {
    if (!manager?.phone) return;
    callPhone({ phone: manager.phone, name: manager.name, workHours: manager.work_hours });
  }, [manager]);

  const renderItem = useCallback(
    ({ item, index }: { item: ChatMessage; index: number }) => {
      // Нормальный порядок: проверяем предыдущий по индексу (= визуально выше = более старое)
      const prevItem = ordered[index - 1];
      const showDay = !prevItem || dayKey(prevItem.created_at) !== dayKey(item.created_at);
      return (
        <View>
          {showDay && <DaySep label={dayLabel(item.created_at)} s={s} />}
          <ChatBubble msg={item} s={s} />
        </View>
      );
    },
    [ordered, s]
  );

  const canSend = !!text.trim() || pendingAttachments.length > 0;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: C.bg }]} edges={['top']}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, marginBottom: 78 }}
      >
        {/* Header */}
        <View style={s.chatHeader}>
          <View style={s.chatHeaderAvatarWrap}>
            <View style={s.chatHeaderAvatar}>
              <Text style={s.chatHeaderAvatarText}>
                {manager ? initials(manager.name) : '·'}
              </Text>
            </View>
            {manager?.online && <View style={s.chatHeaderOnlineDot} />}
          </View>
          <View style={s.chatHeaderText}>
            <Text style={s.chatHeaderName} numberOfLines={1} ellipsizeMode="tail">
              {manager?.name ?? 'Менеджер'}
            </Text>
            {manager && (
              manager.online
                ? <Text style={s.chatHeaderStatusOn}>● онлайн</Text>
                : <Text style={s.chatHeaderStatusOff}>был {relativeTime(manager.last_seen)}</Text>
            )}
            {manager && <Text style={s.chatHeaderRole}>{manager.role}</Text>}
          </View>
          {manager?.phone && (
            <Pressable
              style={s.chatHeaderCallBtn}
              {...ripple('rgba(126,34,206,0.18)', true)}
              onPress={onCall}
              accessibilityLabel="Позвонить менеджеру"
            >
              <Phone size={18} color={C.purpleDeep} strokeWidth={2.2} />
            </Pressable>
          )}
        </View>

        {/* Messages — нормальный (не inverted) список: старые сверху, новые снизу */}
        <FlatList
          ref={listRef}
          style={s.chatList}
          contentContainerStyle={s.chatListContent}
          data={ordered}
          keyExtractor={(it) => String(it.id)}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          // Typing indicator — внизу под последним сообщением
          ListFooterComponent={managerTyping ? <TypingIndicator s={s} /> : null}
          onContentSizeChange={() => { try { listRef.current?.scrollToEnd({ animated: false }); } catch {} }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.purple}
            />
          }
        />

        {/* Quick replies — только если поле пустое и нет вложений */}
        {!text && pendingAttachments.length === 0 && (
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.qrRow}
            style={s.qrScroll}
          >
            {QUICK_REPLIES.map(q => (
              <Pressable key={q} style={s.qrChip} {...ripple()} onPress={onQuickReply(q)}>
                <Text style={s.qrChipText}>{q}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Attachment previews */}
        {pendingAttachments.length > 0 && (
          <View style={s.chatAttachPreviewRow}>
            {pendingAttachments.map((att, i) => (
              <View key={i} style={s.chatAttachPreviewItem}>
                {att.type === 'image' ? (
                  <Image source={{ uri: att.uri }} style={s.chatAttachPreviewImg} resizeMode="cover" />
                ) : (
                  <View style={[s.chatAttachPreviewImg, { alignItems: 'center', justifyContent: 'center' }]}>
                    <Paperclip size={20} color={C.ink3} strokeWidth={2.2} />
                  </View>
                )}
                <Pressable style={s.chatAttachPreviewClose} onPress={() => removeAttachment(i)}>
                  <X size={11} color={C.surface} strokeWidth={2.6} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Input bar */}
        <View style={s.chatInputBar}>
          <Pressable
            style={s.chatInputAttach}
            {...ripple()}
            onPress={onPickImage}
            accessibilityLabel="Прикрепить фото"
          >
            <Paperclip size={18} color={C.ink3} strokeWidth={2} />
          </Pressable>
          <View style={s.chatInputWrap}>
            <TextInput
              style={s.chatInput}
              placeholder="Сообщение…"
              placeholderTextColor={C.ink4}
              value={text}
              onChangeText={(v) => { setText(v); if (v.length > 0) notifyUserTyping(true); }}
              onBlur={() => notifyUserTyping(false)}
              multiline
              maxLength={2000}
              textAlignVertical="center"
            />
          </View>
          <Pressable
            style={[s.chatSendBtn, (!canSend || sending) && s.chatSendBtnDisabled]}
            {...ripple('rgba(255,255,255,0.22)')}
            onPress={onSend}
            disabled={!canSend || sending}
          >
            {sending
              ? <ActivityIndicator size="small" color={C.surface} />
              : <Send size={17} color={C.surface} strokeWidth={2.2} />
            }
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────
const DaySep: React.FC<{ label: string; s: S }> = ({ label, s }) => (
  <View style={s.daySep}>
    <View style={s.daySepPill}>
      <Text style={s.daySepText}>{label}</Text>
    </View>
  </View>
);

const TypingIndicator: React.FC<{ s: S }> = ({ s }) => (
  <View style={s.typingRow}>
    <Text style={[s.bubbleTextMgr, { color: C.ink3 }]}>печатает</Text>
    <Text style={{ marginLeft: 4, color: C.ink3, fontFamily: 'Manrope_700Bold', fontSize: 14 }}>…</Text>
  </View>
);
