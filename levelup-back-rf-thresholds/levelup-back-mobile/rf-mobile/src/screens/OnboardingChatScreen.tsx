import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, TextInput, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, Bot, ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react-native';

import { C, F } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple } from '../platform';
import { createLead, chatWithLeadAI, submitLeadByToken, AIFallbackError } from '../api';

// ════════════════════════════════════════════════════════════════════
// ONBOARDING CHAT — диалог с AI-менеджером, который собирает Lead.
//
// Pack F1: моковый сценарий со скриптованными вопросами + локальная
// state machine. В Pack F3 будет подменён на реальный POST к
// /api/v1/leads/{id}/chat/ с Anthropic-ответами и tool-use.
// ════════════════════════════════════════════════════════════════════

export interface LeadDraft {
  cafe_name?: string;
  cafe_count?: number;
  traffic_estimate?: string;     // «100-200/день» и т.п.
  package_suggested?: string;    // подсказанный AI-менеджером пакет
  full_name?: string;
  vk_token?: string;
  email?: string;
  domain_slug?: string;          // авто-предложенный поддомен
}

export interface ChatMsg {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  ts: string;
  // если ассистент задаёт структурированный вопрос — поле меняется через ввод
  awaits?: keyof LeadDraft;
  done?: boolean;
}

// ─────────────────────────────────────────────
// Моковая state-machine: список шагов, каждый — следующий вопрос ИИ
// + правило заполнения draft из текста пользователя.
// ─────────────────────────────────────────────
type Step =
  | 'cafe_name'
  | 'cafe_count'
  | 'traffic'
  | 'package'
  | 'full_name'
  | 'vk_explain'
  | 'vk_token'
  | 'email'
  | 'review'
  | 'done';

const NEXT: Record<Step, Step> = {
  cafe_name: 'cafe_count',
  cafe_count: 'traffic',
  traffic: 'package',
  package: 'full_name',
  full_name: 'vk_explain',
  vk_explain: 'vk_token',
  vk_token: 'email',
  email: 'review',
  review: 'done',
  done: 'done',
};

function makeAssistantMessage(step: Step, draft: LeadDraft): { text: string; awaits?: keyof LeadDraft; done?: boolean } {
  switch (step) {
    case 'cafe_name':
      return {
        text: 'Привет! Я AI-менеджер ЛоялUP. Помогу запустить программу лояльности за 5 минут.\n\nКак называется ваше кафе?',
        awaits: 'cafe_name',
      };
    case 'cafe_count':
      return {
        text: `Отлично, «${draft.cafe_name}»! Сколько у вас точек? (просто число)`,
        awaits: 'cafe_count',
      };
    case 'traffic':
      return {
        text: 'Понял. Какой примерно трафик в одной точке за день? Пример: 80-120 чеков, 200+ гостей, и т.д.',
        awaits: 'traffic_estimate',
      };
    case 'package': {
      const pkg = suggestPackage(draft);
      return {
        text: `Спасибо! Под ваш масштаб (${draft.cafe_count} ${plural(Number(draft.cafe_count) || 0, ['точка', 'точки', 'точек'])}, ${draft.traffic_estimate}) подойдёт пакет **${pkg.name}** — ${pkg.detail}.\n\nКак вас зовут? (ФИО)`,
        awaits: 'full_name',
      };
    }
    case 'vk_explain':
      return {
        text: `Приятно познакомиться, ${(draft.full_name || '').split(' ')[0] || ''}!\n\nДля рассылок нужен access-token из вашей VK-группы. Где взять:\n\n1. Откройте vk.com → Управление сообществом → Настройки → Работа с API\n2. Создайте ключ доступа сообщества\n3. Дайте права: «Сообщения сообщества» + «Управление»\n4. Скопируйте полученный длинный ключ\n\nГотовы? Пришлите его сюда (он будет зашифрован).`,
      };
    case 'vk_token':
      return {
        text: 'Отлично! Вставьте VK API token:',
        awaits: 'vk_token',
      };
    case 'email':
      return {
        text: 'Сохранил. Последнее — на какой email прислать логин и пароль когда мы вас подтвердим?',
        awaits: 'email',
      };
    case 'review':
      return {
        text: `Сверим, всё ли правильно:\n\n• Кафе: ${draft.cafe_name}\n• Точек: ${draft.cafe_count}\n• Трафик: ${draft.traffic_estimate}\n• Пакет: ${draft.package_suggested}\n• ФИО: ${draft.full_name}\n• Email: ${draft.email}\n• VK token: ${draft.vk_token ? '✓ получен' : '—'}\n\nЕсли всё ок — нажмите «Отправить заявку». Мы свяжемся с вами и активируем кабинет.`,
      };
    case 'done':
    default:
      return {
        text: 'Заявка отправлена! Ждите письма с логином и паролем — обычно подтверждаем в течение 1 рабочего дня.',
        done: true,
      };
  }
}

function suggestPackage(draft: LeadDraft): { name: string; detail: string } {
  const n = Number(draft.cafe_count) || 1;
  if (n >= 5) return { name: 'Network', detail: 'для сети с 5+ точками — все фичи + персональный менеджер' };
  if (n >= 2) return { name: 'Business', detail: 'для 2–4 точек — RF, рассылки, отзывы, квесты' };
  return { name: 'Start', detail: 'для одной точки — базовая аналитика и рассылки' };
}

function plural(n: number, forms: [string, string, string]): string {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return forms[0];
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1];
  return forms[2];
}

/**
 * Если AI отвалился посередине, нам нужно понять с какого вопроса
 * продолжить локальный скрипт. Идём по порядку и смотрим, какое
 * поле draft ещё не заполнено.
 */
function inferFirstEmptyStep(draft: LeadDraft): Step {
  if (!draft.cafe_name) return 'cafe_name';
  if (!draft.cafe_count) return 'cafe_count';
  if (!draft.traffic_estimate) return 'traffic';
  if (!draft.full_name) return 'full_name';
  if (!draft.vk_token) return 'vk_explain';
  if (!draft.email) return 'email';
  return 'review';
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
type Mode = 'loading' | 'ai' | 'script';

export const OnboardingChatScreen: React.FC<{
  onBack: () => void;
  onSubmit: (draft: LeadDraft) => Promise<void>;
}> = ({ onBack, onSubmit }) => {
  const r = useResponsive();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('loading');
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [draft, setDraft] = useState<LeadDraft>({});
  const [step, setStep] = useState<Step>('cafe_name');         // используется только в script-режиме
  const [aiComplete, setAiComplete] = useState(false);          // используется только в ai-режиме
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const idSeq = useRef(0);
  const listRef = useRef<FlatList<ChatMsg>>(null);

  const nextId = () => ++idSeq.current;

  // ── Bootstrap: пытаемся поднять AI-режим. При любой ошибке → script ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setAiTyping(true);
      try {
        const lead = await createLead();
        if (cancelled) return;
        setSessionToken(lead.session_token);
        // Просим у AI приветственное сообщение
        const reply = await chatWithLeadAI({ session_token: lead.session_token, message: '' });
        if (cancelled) return;
        setMode('ai');
        setMessages([{
          id: nextId(),
          role: 'assistant',
          text: reply.assistant_message,
          ts: new Date().toISOString(),
        }]);
        if (reply.lead_state) syncDraftFromLead(reply.lead_state);
        if (reply.is_complete) setAiComplete(true);
      } catch (e: any) {
        if (cancelled) return;
        // Fallback: запускаем локальный скрипт как раньше
        setMode('script');
        askNext('cafe_name', {});
      } finally {
        if (!cancelled) setAiTyping(false);
      }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line

  const syncDraftFromLead = useCallback((leadState: any) => {
    setDraft(prev => ({
      ...prev,
      cafe_name: leadState.cafe_name ?? prev.cafe_name,
      cafe_count: leadState.cafe_count ?? prev.cafe_count,
      traffic_estimate: leadState.traffic_estimate ?? prev.traffic_estimate,
      package_suggested: leadState.package_suggested ?? prev.package_suggested,
      full_name: leadState.full_name ?? prev.full_name,
      email: leadState.email ?? prev.email,
      domain_slug: leadState.domain_slug ?? prev.domain_slug,
    }));
  }, []);

  const askNext = useCallback((s: Step, d: LeadDraft) => {
    setAiTyping(true);
    const delay = 700 + Math.random() * 800;
    setTimeout(() => {
      const msg = makeAssistantMessage(s, d);
      setMessages(prev => [...prev, {
        id: nextId(),
        role: 'assistant',
        text: msg.text,
        ts: new Date().toISOString(),
        awaits: msg.awaits,
        done: msg.done,
      }]);
      setAiTyping(false);
      // Если на этом шаге AI ничего не ждёт от юзера (vk_explain) —
      // автоматически переходим к следующему шагу
      if (!msg.awaits && !msg.done) {
        setStep(NEXT[s]);
        askNext(NEXT[s], d);
      }
    }, delay);
  }, []);

  // ── AI режим: ходим в бэк, при ошибке — переключаемся на скрипт ──
  const sendAiTurn = useCallback(async (userText: string) => {
    if (!sessionToken) return;
    setAiTyping(true);
    try {
      const reply = await chatWithLeadAI({ session_token: sessionToken, message: userText });
      setMessages(prev => [...prev, {
        id: nextId(),
        role: 'assistant',
        text: reply.assistant_message,
        ts: new Date().toISOString(),
      }]);
      if (reply.lead_state) syncDraftFromLead(reply.lead_state);
      // vk_token не возвращается в lead_state (поле скрыто). Если AI его попросил —
      // мы бы хотели его подхватить локально. Пока сохраняем последнюю user-реплику
      // как vk_token, если AI до этого попросил его. Делаем это эвристикой:
      // если в последнем ассистент-сообщении упомянули «токен» — следующая
      // юзер-реплика, длиной > 30 символов и без пробелов в начале/конце —
      // вероятно, это токен.
      // Для надёжности: если AI отметил vk_token как updated_field, мы его вписали.
      if ((reply.updated_fields ?? []).includes('vk_token')) {
        setDraft(prev => ({ ...prev, vk_token: userText }));
      }
      if (reply.is_complete) setAiComplete(true);
    } catch (e: any) {
      if (e instanceof AIFallbackError) {
        // AI стало недоступно посередине разговора — вставляем мост-сообщение
        // и переключаемся на скрипт с того шага, который соответствует пустоте.
        setMessages(prev => [...prev, {
          id: nextId(),
          role: 'assistant',
          text: 'AI-помощник временно недоступен. Продолжим без него — задам вопросы напрямую.',
          ts: new Date().toISOString(),
        }]);
        setMode('script');
        // Определяем стартовый step по уже заполненным полям
        const firstEmpty = inferFirstEmptyStep(draft);
        setStep(firstEmpty);
        askNext(firstEmpty, draft);
      } else {
        Alert.alert('Ошибка', e?.message ?? 'Попробуйте ещё раз');
      }
    } finally {
      setAiTyping(false);
    }
  }, [sessionToken, draft, syncDraftFromLead]); // eslint-disable-line

  const onSendText = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || aiTyping) return;

    haptic('light');
    setSending(true);
    setMessages(prev => [...prev, {
      id: nextId(),
      role: 'user',
      text: trimmed,
      ts: new Date().toISOString(),
    }]);
    setText('');

    // ── AI-режим: отправляем реплику в бэк, всё остальное он сам ──
    if (mode === 'ai') {
      setSending(false);
      sendAiTurn(trimmed);
      return;
    }

    // ── Script-режим: текущая локальная логика ──
    // обновляем draft по текущему awaits
    let nextDraft = { ...draft };
    switch (step) {
      case 'cafe_name':
        nextDraft.cafe_name = trimmed;
        nextDraft.domain_slug = slugify(trimmed);
        break;
      case 'cafe_count': {
        const n = parseInt(trimmed.replace(/\D/g, ''), 10);
        if (!Number.isFinite(n) || n < 1 || n > 999) {
          // Невалидно — попросим повторить
          setSending(false);
          setMessages(prev => [...prev, {
            id: nextId(),
            role: 'assistant',
            text: 'Не могу разобрать число. Напишите цифрой, например: 1, 3, 12.',
            ts: new Date().toISOString(),
            awaits: 'cafe_count',
          }]);
          return;
        }
        nextDraft.cafe_count = n;
        break;
      }
      case 'traffic':
        nextDraft.traffic_estimate = trimmed;
        break;
      case 'full_name':
        nextDraft.full_name = trimmed;
        nextDraft.package_suggested = suggestPackage(nextDraft).name;
        break;
      case 'vk_token':
        nextDraft.vk_token = trimmed;
        break;
      case 'email': {
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
          setSending(false);
          setMessages(prev => [...prev, {
            id: nextId(),
            role: 'assistant',
            text: 'Кажется, email с опечаткой. Попробуйте ещё раз — формат name@domain.ru',
            ts: new Date().toISOString(),
            awaits: 'email',
          }]);
          return;
        }
        nextDraft.email = trimmed;
        break;
      }
    }

    setDraft(nextDraft);
    setSending(false);
    const newStep = NEXT[step];
    setStep(newStep);
    askNext(newStep, nextDraft);
  }, [text, sending, aiTyping, step, draft, askNext]);

  const onSubmitFinal = useCallback(async () => {
    if (sending) return;
    haptic('medium');
    setSending(true);
    try {
      if (mode === 'ai' && sessionToken) {
        // AI уже создал лид и наполнил поля. Просто submitим по token.
        // VK token PATCH'ится отдельно (он чувствительный — не возвращается в lead_state).
        await submitLeadByToken(sessionToken, draft.vk_token);
        // Сообщаем родителю — он переключит экран на pending.
        await onSubmit(draft);
      } else {
        // Script-режим: создаём лид + submit одной операцией (старый flow).
        await onSubmit(draft);
      }
      haptic('success');
    } catch (e: any) {
      haptic('error');
      Alert.alert('Не удалось отправить', e?.message ?? 'Попробуйте позже');
    } finally {
      setSending(false);
    }
  }, [mode, sessionToken, draft, sending, onSubmit]);

  // автоскролл при новых сообщениях
  useEffect(() => {
    const t = setTimeout(() => {
      try { listRef.current?.scrollToEnd({ animated: true }); } catch {}
    }, 50);
    return () => clearTimeout(t);
  }, [messages.length, aiTyping]);

  const isReview = mode === 'ai' ? aiComplete : step === 'review';
  const isDone = step === 'done';
  const canSubmit = isReview
    && !!draft.cafe_name
    && !!draft.email
    && !!draft.vk_token;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={s.header}>
          <Pressable
            style={s.backBtn}
            {...ripple()}
            onPress={() => { haptic('light'); onBack(); }}
          >
            <ArrowLeft size={18} color={C.ink2} strokeWidth={2.2} />
          </Pressable>
          <View style={s.headerAvatar}>
            <Bot size={18} color={C.surface} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.headerTitle}>AI-менеджер</Text>
            <Text style={s.headerSub}>
              {mode === 'loading'
                ? 'Подключаемся…'
                : mode === 'ai'
                  ? 'На связи с AI · быстро и точно'
                  : 'Скриптовый режим · AI временно офф'}
            </Text>
          </View>
          {mode === 'ai' && (
            <View style={s.aiBadge}>
              <Sparkles size={11} color={C.purpleDeep} strokeWidth={2.4} />
              <Text style={s.aiBadgeText}>AI</Text>
            </View>
          )}
        </View>

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(it) => String(it.id)}
          renderItem={({ item }) => <Bubble msg={item} />}
          contentContainerStyle={s.list}
          ListFooterComponent={aiTyping ? <TypingDots /> : null}
          showsVerticalScrollIndicator={false}
        />

        {/* Input bar или Submit-кнопка */}
        {isDone ? (
          <View style={[s.doneBar, { paddingBottom: insets.bottom + 10 }]}>
            <CheckCircle2 size={18} color={C.good} strokeWidth={2.4} />
            <Text style={s.doneText}>Заявка отправлена</Text>
          </View>
        ) : isReview ? (
          <View style={[s.reviewBar, { paddingBottom: insets.bottom + 10 }]}>
            <Pressable
              style={[s.submitBtn, !canSubmit && { opacity: 0.5 }]}
              disabled={!canSubmit || sending}
              {...ripple('rgba(255,255,255,0.22)')}
              onPress={onSubmitFinal}
            >
              {sending
                ? <ActivityIndicator size="small" color={C.surface} />
                : <Send size={16} color={C.surface} strokeWidth={2.2} />}
              <Text style={s.submitBtnText}>Отправить заявку</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[s.inputBar, { paddingBottom: insets.bottom + 10 }]}>
            <View style={s.inputWrap}>
              <TextInput
                style={s.input}
                placeholder="Напишите ответ…"
                placeholderTextColor={C.ink4}
                value={text}
                onChangeText={setText}
                multiline
                maxLength={1000}
                editable={!sending && !aiTyping}
              />
            </View>
            <Pressable
              style={[s.sendBtn, (!text.trim() || aiTyping) && { opacity: 0.5 }]}
              disabled={!text.trim() || aiTyping || sending}
              {...ripple('rgba(255,255,255,0.22)')}
              onPress={onSendText}
            >
              <Send size={16} color={C.surface} strokeWidth={2.2} />
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────
const Bubble: React.FC<{ msg: ChatMsg }> = ({ msg }) => {
  const isUser = msg.role === 'user';
  return (
    <View style={[s.bubbleRow, isUser ? s.bubbleRowUser : s.bubbleRowAi]}>
      {!isUser && (
        <View style={s.bubbleAvatar}>
          <Bot size={13} color={C.surface} strokeWidth={2.2} />
        </View>
      )}
      <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAi]}>
        <Text style={[s.bubbleText, isUser ? s.bubbleTextUser : s.bubbleTextAi]}>
          {msg.text}
        </Text>
      </View>
    </View>
  );
};

const TypingDots: React.FC = () => (
  <View style={s.bubbleRowAi}>
    <View style={s.bubbleAvatar}>
      <Bot size={13} color={C.surface} strokeWidth={2.2} />
    </View>
    <View style={[s.bubble, s.bubbleAi, { paddingVertical: 10, paddingHorizontal: 14 }]}>
      <Text style={[s.bubbleText, s.bubbleTextAi, { color: C.ink3 }]}>печатает…</Text>
    </View>
  </View>
);

function slugify(s: string): string {
  return s.toLowerCase()
    .replace(/[аеёиоуыэюяАЕЁИОУЫЭЮЯ]/g, m => 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

// ─────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
    shadowColor: '#000',
    shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  headerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.purple,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.purple,
    shadowOpacity: 0.32, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  headerTitle: { fontFamily: F.extrabold, fontSize: 15, color: C.ink },
  headerSub: { fontFamily: F.medium, fontSize: 11, color: C.ink3, marginTop: 1 },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: C.purpleSoft,
  },
  aiBadgeText: {
    fontFamily: F.extrabold,
    fontSize: 10,
    color: C.purpleDeep,
    letterSpacing: 0.4,
  },

  list: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 18,
    gap: 8,
  },

  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginVertical: 3 },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubbleRowAi: { justifyContent: 'flex-start' },
  bubbleAvatar: {
    width: 24, height: 24, borderRadius: 999,
    backgroundColor: C.purpleDeep,
    alignItems: 'center', justifyContent: 'center',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleUser: { backgroundColor: C.purple, borderBottomRightRadius: 4 },
  bubbleAi: { backgroundColor: C.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: C.line },
  bubbleText: { fontFamily: F.medium, fontSize: 13, lineHeight: 19 },
  bubbleTextUser: { color: C.surface },
  bubbleTextAi: { color: C.ink },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.line,
    shadowColor: '#000',
    shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  input: {
    fontFamily: F.medium,
    fontSize: 14,
    color: C.ink,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.purple,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.purple,
    shadowOpacity: 0.32, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },

  reviewBar: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.purple,
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: C.purple,
    shadowOpacity: 0.32, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  submitBtnText: {
    fontFamily: F.extrabold, fontSize: 14, color: C.surface,
  },
  doneBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: C.goodSoft,
  },
  doneText: { fontFamily: F.extrabold, fontSize: 14, color: C.good },
});
