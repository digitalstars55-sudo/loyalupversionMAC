import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, Modal, ScrollView, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform, Animated, Easing,
} from 'react-native';
import { X, Send } from 'lucide-react-native';

import { C, F } from '../theme';
import { haptic, ripple } from '../platform';
import { askAssistant } from '../api';

type Msg = { role: 'user' | 'assistant'; content: string };

const GREETING = 'Привет! Я Лояльчик 🚀 Помогу разобраться с приложением и программой лояльности. Спроси что угодно — например «как ответить на отзыв?» или «что такое RF-сегменты?».';

// ════════════════════════════════════════════════════════════════════
// AI ЛОЯЛЬЧИК — плавающая кнопка-маскот + чат по системе.
// МАСКОТ: сейчас плейсхолдер (эмодзи 🚀 c анимацией парения). Когда придёт
// Lottie-анимация персонажа — заменить содержимое <View style={mascot}> на
// <LottieView source={...} autoPlay loop /> (idle), и проигрывать greeting/thinking.
// ════════════════════════════════════════════════════════════════════
export const LoyalchikAssistant: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'assistant', content: GREETING }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Анимация парения плейсхолдер-маскота (заменится Lottie idle)
  const floatY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -6, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [floatY]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    haptic('light');
    const history = msgs.filter(m => m.content !== GREETING).slice(-10);
    setMsgs(prev => [...prev, { role: 'user', content: q }]);
    setInput('');
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    try {
      const answer = await askAssistant({ question: q, history });
      setMsgs(prev => [...prev, { role: 'assistant', content: answer || '…' }]);
    } catch (e: any) {
      setMsgs(prev => [...prev, { role: 'assistant', content: 'Ой, Лояльчик засмотрелся на звёзды 🌌 Попробуй ещё раз.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  return (
    <>
      {/* Плавающая кнопка-маскот */}
      <Pressable
        style={st.fab}
        {...ripple('rgba(255,255,255,0.25)')}
        onPress={() => { haptic('medium'); setOpen(true); }}
        accessibilityLabel="Открыть AI-ассистента Лояльчика"
      >
        <Animated.View style={[st.mascot, { transform: [{ translateY: floatY }] }]}>
          {/* TODO: заменить на <LottieView> когда придёт анимация персонажа */}
          <Text style={st.mascotEmoji}>🚀</Text>
        </Animated.View>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={st.modalRoot}>
          <Pressable style={st.backdrop} onPress={() => setOpen(false)} />
          <View style={st.sheet}>
            <View style={st.header}>
              <View style={st.headerMascot}><Text style={{ fontSize: 18 }}>🚀</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={st.title}>AI Лояльчик</Text>
                <Text style={st.subtitle}>Помощник по системе</Text>
              </View>
              <Pressable style={st.close} {...ripple()} onPress={() => setOpen(false)}>
                <X size={16} color={C.ink} strokeWidth={2} />
              </Pressable>
            </View>

            <ScrollView ref={scrollRef} style={st.chat} contentContainerStyle={{ padding: 14, gap: 10 }}>
              {msgs.map((m, i) => (
                <View key={i} style={m.role === 'user' ? st.rowUser : st.rowBot}>
                  <View style={[st.bubble, m.role === 'user' ? st.bubbleUser : st.bubbleBot]}>
                    <Text style={[st.bubbleText, m.role === 'user' && { color: C.surface }]}>{m.content}</Text>
                  </View>
                </View>
              ))}
              {loading && (
                <View style={st.rowBot}>
                  <View style={[st.bubble, st.bubbleBot, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                    <ActivityIndicator size="small" color={C.purple} />
                    <Text style={st.bubbleText}>Лояльчик думает…</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={st.inputRow}>
              <TextInput
                style={st.input}
                value={input}
                onChangeText={setInput}
                placeholder="Спроси Лояльчика…"
                placeholderTextColor={C.ink4}
                multiline
                maxLength={1000}
                onSubmitEditing={send}
              />
              <Pressable
                style={[st.sendBtn, (!input.trim() || loading) && { opacity: 0.4 }]}
                {...ripple('rgba(255,255,255,0.25)')}
                onPress={send}
                disabled={!input.trim() || loading}
              >
                <Send size={18} color={C.surface} strokeWidth={2.4} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const st = {
  fab: {
    position: 'absolute' as const,
    right: 16,
    bottom: 150,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.purple,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: C.purple,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    zIndex: 50,
  },
  mascot: { alignItems: 'center' as const, justifyContent: 'center' as const },
  mascotEmoji: { fontSize: 28 },

  modalRoot: { flex: 1, justifyContent: 'flex-end' as const },
  backdrop: { ...{ position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 }, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    height: '82%' as const,
    overflow: 'hidden' as const,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    backgroundColor: C.surface,
  },
  headerMascot: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: C.purpleSoft,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  title: { fontFamily: F.extrabold, fontSize: 16, color: C.ink },
  subtitle: { fontFamily: F.medium, fontSize: 12, color: C.ink3, marginTop: 1 },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: C.bg },

  chat: { flex: 1 },
  rowUser: { alignItems: 'flex-end' as const },
  rowBot: { alignItems: 'flex-start' as const },
  bubble: { maxWidth: '85%' as const, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14 },
  bubbleUser: { backgroundColor: C.purple, borderBottomRightRadius: 4 },
  bubbleBot: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderBottomLeftRadius: 4 },
  bubbleText: { fontFamily: F.medium, fontSize: 14, color: C.ink, lineHeight: 19 },

  inputRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    gap: 8,
    padding: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: C.line,
    backgroundColor: C.surface,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 14,
    backgroundColor: C.bg,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontFamily: F.medium,
    fontSize: 14,
    color: C.ink,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: C.purple,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
};
