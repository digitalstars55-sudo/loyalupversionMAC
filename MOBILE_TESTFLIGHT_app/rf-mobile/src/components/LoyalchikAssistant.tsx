import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, Modal, ScrollView, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { X, Send } from 'lucide-react-native';

import { C, F } from '../theme';
import { haptic, ripple } from '../platform';
import { askAssistant, fetchAssistantContext } from '../api';
import { storage } from '../storage';
import { runAssistantAction, type AssistantAction } from '../navBridge';

const HISTORY_KEY = '@loyalup/loyalchik_history';

// Lottie-маскот «Лояльчик» (космонавт-робот). Цвета совпадают с темой приложения.
const IDLE_ANIM = require('../assets/loyalchik/loyalchik_idle.json');
const GREETING_ANIM = require('../assets/loyalchik/loyalchik_greeting.json');
const THINKING_ANIM = require('../assets/loyalchik/loyalchik_thinking.json');

type Msg = { role: 'user' | 'assistant'; content: string; actions?: AssistantAction[] };

// Защита OTA: если на старом билде нет нативного lottie-react-native — рендерим эмодзи,
// а не крашим приложение (Lottie появляется только в билде, где модуль вшит).
class MascotBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() {}
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

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
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const ctxFetched = useRef(false);
  const hydrated = useRef(false);

  // История диалога — сохраняем между запусками.
  useEffect(() => {
    storage.getItem(HISTORY_KEY).then(raw => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved) && saved.length) setMsgs(saved);
      } catch {}
    }).catch(() => {}).finally(() => { hydrated.current = true; });
  }, []);
  useEffect(() => {
    if (!hydrated.current) return; // не затирать сохранённую историю до загрузки
    storage.setItem(HISTORY_KEY, JSON.stringify(msgs.slice(-30))).catch(() => {});
  }, [msgs]);

  // При первом открытии — тянем проактивное приветствие + подсказки по реальным данным.
  useEffect(() => {
    if (!open || ctxFetched.current) return;
    ctxFetched.current = true;
    fetchAssistantContext().then(ctx => {
      setSuggestions(ctx.suggestions);
      setMsgs(prev => {
        const hasUser = prev.some(m => m.role === 'user');
        if (!hasUser) return [{ role: 'assistant', content: ctx.greeting }];
        return prev;
      });
    }).catch(() => {});
  }, [open]);

  // При открытии чата маскот «прилетает» (greeting), потом — idle.
  const [headerGreeting, setHeaderGreeting] = useState(false);
  useEffect(() => {
    if (!open) return;
    setHeaderGreeting(true);
    const t = setTimeout(() => setHeaderGreeting(false), 1500);
    return () => clearTimeout(t);
  }, [open]);

  // Анимация для маскота в шапке: думает → idle/приветствие.
  const headerSource = loading ? THINKING_ANIM : (headerGreeting ? GREETING_ANIM : IDLE_ANIM);
  const headerLoop = !(headerGreeting && !loading); // greeting — один проход

  const send = async (textArg?: string) => {
    const q = (textArg ?? input).trim();
    if (!q || loading) return;
    haptic('light');
    setSuggestions([]); // прячем подсказки после первого вопроса
    const history = msgs.filter(m => m.content !== GREETING).slice(-10);
    setMsgs(prev => [...prev, { role: 'user', content: q }]);
    if (!textArg) setInput('');
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    try {
      const { answer, actions } = await askAssistant({ question: q, history });
      setMsgs(prev => [...prev, { role: 'assistant', content: answer || '…', actions }]);
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
        <MascotBoundary fallback={<Text style={{ fontSize: 30 }}>🚀</Text>}>
          <LottieView source={IDLE_ANIM} autoPlay loop style={{ width: 50, height: 50 }} />
        </MascotBoundary>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={st.modalRoot}>
          <Pressable style={st.backdrop} onPress={() => setOpen(false)} />
          <View style={st.sheet}>
            <View style={st.header}>
              <View style={st.headerMascot}>
                <MascotBoundary fallback={<Text style={{ fontSize: 22 }}>🚀</Text>}>
                  <LottieView source={headerSource} autoPlay loop={headerLoop} style={{ width: 38, height: 38 }} />
                </MascotBoundary>
              </View>
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
                  {m.role === 'assistant' && m.actions && m.actions.length > 0 && (
                    <View style={st.actionsWrap}>
                      {m.actions.map((a, j) => (
                        <Pressable
                          key={j}
                          style={st.actionBtn}
                          {...ripple('rgba(255,255,255,0.25)')}
                          onPress={() => { haptic('medium'); runAssistantAction(a); setOpen(false); }}
                        >
                          <Text style={st.actionBtnText}>{a.label} →</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
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

            {/* Подсказки-вопросы (до первого вопроса) */}
            {suggestions.length > 0 && !loading && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.chipsScroll} contentContainerStyle={st.chipsRow}>
                {suggestions.map((sg, i) => (
                  <Pressable key={i} style={st.chip} {...ripple()} onPress={() => send(sg)}>
                    <Text style={st.chipText}>{sg}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            <View style={st.inputRow}>
              <TextInput
                style={st.input}
                value={input}
                onChangeText={setInput}
                placeholder="Спроси Лояльчика…"
                placeholderTextColor={C.ink4}
                multiline
                maxLength={1000}
                onSubmitEditing={() => send()}
              />
              <Pressable
                style={[st.sendBtn, (!input.trim() || loading) && { opacity: 0.4 }]}
                {...ripple('rgba(255,255,255,0.25)')}
                onPress={() => send()}
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

  chipsScroll: { maxHeight: 44, flexGrow: 0 as const },
  chipsRow: { paddingHorizontal: 12, paddingVertical: 6, gap: 8, alignItems: 'center' as const },
  chip: {
    backgroundColor: C.purpleSoft,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: C.line,
  },
  chipText: { fontFamily: F.semibold, fontSize: 12.5, color: C.purpleDeep },

  actionsWrap: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8, marginTop: 8, maxWidth: '85%' as const },
  actionBtn: { backgroundColor: C.purple, borderRadius: 14, paddingVertical: 9, paddingHorizontal: 14 },
  actionBtnText: { fontFamily: F.semibold, fontSize: 13, color: C.surface },

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
