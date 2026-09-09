import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Switch, Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Sparkles, Bell, Smile, Send } from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple } from '../platform';
import { sentimentMeta } from '../helpers';
import { updateAutoReplySettings, fetchBranches } from '../api';
import { REMINDER_OPTIONS, TONE_OPTIONS, AUTO_SEND_DELAY_OPTIONS, AUTO_ACK_DELAY_OPTIONS } from '../mocks';
import { makeStyles } from '../styles';
import { MOCK } from '../mocks';
import type {
  AutoReplySettings as Settings, ReminderMinutes, AiTone, Sentiment, RFBranch,
  AutoSendDelayMinutes, AutoAckDelayMinutes,
} from '../types';

// Безопасные дефолты для полей автоотправки: старый бэк их не отдаёт (undefined),
// секция всё равно рисуется и ничего не падает.
const AS_DEFAULTS = {
  enabled: false,
  delay: 15 as AutoSendDelayMinutes,
  links: true,
  linksText: '',
  limit: 50,
};

// ════════════════════════════════════════════════════════════════════
// AUTO-REPLY SETTINGS SCREEN
// ════════════════════════════════════════════════════════════════════
export const AutoReplySettings: React.FC<{
  settings: Settings;
  onChange: (s: Settings) => void;
  onBack: () => void;
}> = ({ settings, onChange, onBack }) => {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);
  const [saving, setSaving] = useState(false);

  // Локальная копия — изменения видны сразу. Сохраняем на backend через debounce.
  const update = async (next: Settings) => {
    onChange(next);
    setSaving(true);
    try {
      await updateAutoReplySettings(next);
    } catch (e: any) {
      Alert.alert('Ошибка сохранения', e?.message ?? 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const setMaster = (enabled: boolean) => {
    haptic('light');
    update({ ...settings, enabled });
  };

  const setSentiment = (key: keyof Settings['sentiment_enabled'], value: boolean) => {
    haptic('light');
    update({ ...settings, sentiment_enabled: { ...settings.sentiment_enabled, [key]: value } });
  };

  const setBranch = (id: number, value: boolean) => {
    haptic('light');
    update({ ...settings, branch_enabled: { ...settings.branch_enabled, [id]: value } });
  };

  const setReminder = (m: ReminderMinutes) => {
    haptic('light');
    update({ ...settings, reminder_minutes: m });
  };

  const setTone = (t: AiTone) => {
    haptic('light');
    update({ ...settings, ai_tone: t });
  };

  // ── Автоотправка позитивных ──────────────────────────────────────
  const asEnabled   = settings.auto_send_enabled ?? AS_DEFAULTS.enabled;
  const asDelay     = settings.auto_send_delay_minutes ?? AS_DEFAULTS.delay;
  const asLinks     = settings.auto_send_attach_links ?? AS_DEFAULTS.links;
  const asLinksText = settings.auto_send_links_text ?? AS_DEFAULTS.linksText;
  const asLimit     = settings.auto_send_daily_limit ?? AS_DEFAULTS.limit;
  const asBranches  = settings.auto_send_branch_enabled ?? {};

  // ── Автоподтверждение на негатив («спасибо, разберёмся») ────────────
  const AA_DEFAULT_TEXT = 'Спасибо большое за обратную связь 🙏 Мы сейчас во всём разберёмся и обязательно вернёмся к вам с ответом.';
  const aaEnabled = settings.auto_ack_enabled ?? false;
  const aaDelay   = (settings.auto_ack_delay_minutes ?? 30) as AutoAckDelayMinutes;
  const aaText    = settings.auto_ack_text ?? AA_DEFAULT_TEXT;
  const [ackTextDraft, setAckTextDraft] = useState(aaText);
  useEffect(() => { setAckTextDraft(settings.auto_ack_text ?? AA_DEFAULT_TEXT); }, [settings.auto_ack_text]);
  const setAutoAck = (v: boolean) => {
    haptic('light');
    update({ ...settings, auto_ack_enabled: v });
  };
  const setAutoAckDelay = (m: AutoAckDelayMinutes) => {
    haptic('light');
    update({ ...settings, auto_ack_delay_minutes: m });
  };
  const commitAckText = () => {
    const next = ackTextDraft.trim().slice(0, 300) || AA_DEFAULT_TEXT;
    setAckTextDraft(next);
    if (next === aaText) return;
    update({ ...settings, auto_ack_text: next });
  };

  // Локальные черновики текстовых полей — PATCH уходит по blur, не на каждый символ
  const [linksTextDraft, setLinksTextDraft] = useState(asLinksText);
  const [limitDraft, setLimitDraft] = useState(String(asLimit));
  useEffect(() => { setLinksTextDraft(settings.auto_send_links_text ?? AS_DEFAULTS.linksText); },
    [settings.auto_send_links_text]);
  useEffect(() => { setLimitDraft(String(settings.auto_send_daily_limit ?? AS_DEFAULTS.limit)); },
    [settings.auto_send_daily_limit]);

  const setAutoSend = (v: boolean) => {
    haptic('light');
    update({ ...settings, auto_send_enabled: v });
  };
  const setAutoSendDelay = (m: AutoSendDelayMinutes) => {
    haptic('light');
    update({ ...settings, auto_send_delay_minutes: m });
  };
  const setAutoSendLinks = (v: boolean) => {
    haptic('light');
    update({ ...settings, auto_send_attach_links: v });
  };
  const commitLinksText = () => {
    const next = linksTextDraft.slice(0, 200);
    if (next === asLinksText) return;
    setLinksTextDraft(next);
    update({ ...settings, auto_send_links_text: next });
  };
  const commitLimit = () => {
    const n = parseInt(limitDraft.replace(/\D/g, ''), 10);
    const next = Number.isFinite(n) ? Math.min(500, Math.max(1, n)) : AS_DEFAULTS.limit;
    setLimitDraft(String(next));
    if (next === asLimit) return;
    update({ ...settings, auto_send_daily_limit: next });
  };
  const setAutoSendBranch = (id: number, v: boolean) => {
    haptic('light');
    update({ ...settings, auto_send_branch_enabled: { ...asBranches, [id]: v } });
  };

  // Реальные точки текущего тенанта (бэк через fetchBranches).
  // Fallback на мок если бэк недоступен.
  const [branches, setBranches] = useState<RFBranch[]>(MOCK.branches.filter(b => b.id !== 0));
  useEffect(() => {
    fetchBranches().then(list => {
      if (list && list.length > 0) setBranches(list.filter(b => b.id !== 0));
    }).catch(() => {});
  }, []);
  const dim = !settings.enabled;

  // Список тональностей с цветами
  const sentimentRows: { key: keyof Settings['sentiment_enabled']; sent: Sentiment }[] = [
    { key: 'POSITIVE',           sent: 'POSITIVE' },
    { key: 'NEUTRAL',            sent: 'NEUTRAL' },
    { key: 'PARTIALLY_NEGATIVE', sent: 'PARTIALLY_NEGATIVE' },
    { key: 'NEGATIVE',           sent: 'NEGATIVE' },
    { key: 'PENDING',            sent: 'PENDING' },
  ];

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="dark" />

      <View style={s.backHeader}>
        <Pressable style={s.backBtn} {...ripple()} onPress={() => { haptic('light'); onBack(); }}>
          <ArrowLeft size={18} color={C.ink} strokeWidth={2.2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.screenTitleSuper}>Настройки</Text>
          <Text style={s.screenTitleMain}>Автоответы</Text>
        </View>
        {saving && <ActivityIndicator size="small" color={C.purple} />}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* Hero — главный toggle + описание */}
        <View style={s.setHero}>
          <View style={s.setHeroRow}>
            <View style={s.setHeroIcon}>
              <Sparkles size={22} color={C.purpleDeep} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.setHeroTitle}>Автоответы AI</Text>
              <Text style={s.setHeroSub}>{settings.enabled ? 'Активны' : 'Выключены'}</Text>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={setMaster}
              trackColor={{ false: C.line, true: C.purple }}
              thumbColor={C.surface}
              ios_backgroundColor={C.line}
            />
          </View>
          <Text style={s.setHeroDesc}>
            При новом отзыве AI готовит черновик и присылает пуш. Без вашего подтверждения ничего не отправляется. Спам игнорируется всегда.
          </Text>
        </View>

        {/* Тональности */}
        <View style={[s.menuSection, dim && s.menuRowDisabled]}>
          <Text style={s.menuSectionTitle}>Тональности</Text>
          <View style={s.menuCard}>
            {sentimentRows.map((row, i) => {
              const meta = sentimentMeta(row.sent);
              const last = i === sentimentRows.length - 1;
              return (
                <View key={row.key} style={[s.setRow, last && s.setRowLast]}>
                  <View style={[s.setRowDot, { backgroundColor: meta.color }]} />
                  <View style={s.setRowText}>
                    <Text style={s.setRowTitle}>{meta.label}</Text>
                  </View>
                  <Switch
                    value={settings.sentiment_enabled[row.key]}
                    onValueChange={(v) => setSentiment(row.key, v)}
                    disabled={!settings.enabled}
                    trackColor={{ false: C.line, true: C.purple }}
                    thumbColor={C.surface}
                    ios_backgroundColor={C.line}
                  />
                </View>
              );
            })}
            <View style={[s.setRow, s.setRowLast, { opacity: 0.5 }]}>
              <View style={[s.setRowDot, { backgroundColor: C.ink4 }]} />
              <View style={s.setRowText}>
                <Text style={s.setRowTitle}>Спам</Text>
                <Text style={s.setRowSub}>Игнорируется всегда — нельзя включить</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Точки */}
        <View style={[s.menuSection, dim && s.menuRowDisabled]}>
          <Text style={s.menuSectionTitle}>Точки</Text>
          <View style={s.menuCard}>
            {branches.map((b, i) => (
              <View key={b.id} style={[s.setRow, i === branches.length - 1 && s.setRowLast]}>
                <View style={s.setRowText}>
                  <Text style={s.setRowTitle}>{b.name}</Text>
                  {b.address && (
                    <Text style={s.setRowSub}>{b.address}{b.city ? `, ${b.city}` : ''}</Text>
                  )}
                </View>
                <Switch
                  value={settings.branch_enabled[b.id] ?? true}
                  onValueChange={(v) => setBranch(b.id, v)}
                  disabled={!settings.enabled}
                  trackColor={{ false: C.line, true: C.purple }}
                  thumbColor={C.surface}
                  ios_backgroundColor={C.line}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Напоминания */}
        <View style={[s.menuSection, dim && s.menuRowDisabled]}>
          <Text style={s.menuSectionTitle}>Напоминания</Text>
          <View style={s.menuCard}>
            <View style={[s.setRow, { borderBottomWidth: 0 }]}>
              <View style={s.setRowText}>
                <Text style={s.setRowTitle}>
                  <Bell size={13} color={C.ink} />  Если не подтвердили — напомнить через
                </Text>
                <Text style={s.setRowSub}>Без вашего ответа черновик никогда не отправляется</Text>
              </View>
            </View>
            <View style={s.pillsRow}>
              {REMINDER_OPTIONS.map(opt => {
                const active = settings.reminder_minutes === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[s.pill, active && s.pillActive]}
                    {...ripple('rgba(255,255,255,0.18)')}
                    onPress={() => setReminder(opt.value)}
                    disabled={!settings.enabled}
                  >
                    <Text style={[s.pillText, active && s.pillTextActive]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* Тон */}
        <View style={[s.menuSection, dim && s.menuRowDisabled]}>
          <Text style={s.menuSectionTitle}>Тон ответов</Text>
          <View style={s.menuCard}>
            <View style={[s.setRow, { borderBottomWidth: 0 }]}>
              <View style={s.setRowText}>
                <Text style={s.setRowTitle}>
                  <Smile size={13} color={C.ink} />  Стиль AI-черновика
                </Text>
              </View>
            </View>
            <View style={s.pillsRow}>
              {TONE_OPTIONS.map(opt => {
                const active = settings.ai_tone === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[s.pill, active && s.pillActive]}
                    {...ripple('rgba(255,255,255,0.18)')}
                    onPress={() => setTone(opt.value)}
                    disabled={!settings.enabled}
                  >
                    <Text style={[s.pillText, active && s.pillTextActive]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* Автоотправка позитивных */}
        <View style={[s.menuSection, dim && s.menuRowDisabled]}>
          <Text style={s.menuSectionTitle}>🤖 Автоотправка позитивных</Text>
          <View style={s.menuCard}>
            <View style={[s.setRow, !asEnabled && s.setRowLast]}>
              <View style={s.setRowText}>
                <Text style={s.setRowTitle}>
                  <Send size={13} color={C.ink} />  ИИ отвечает сам
                </Text>
                <Text style={s.setRowSub}>
                  ИИ сам отвечает на позитивные отзывы через выбранное окно — вы получаете пуш и можете отменить.
                </Text>
                <Text style={s.setRowSub}>
                  Негатив и вопросы всегда идут вам черновиком.
                </Text>
              </View>
              <Switch
                value={asEnabled}
                onValueChange={setAutoSend}
                disabled={!settings.enabled}
                trackColor={{ false: C.line, true: C.purple }}
                thumbColor={C.surface}
                ios_backgroundColor={C.line}
              />
            </View>

            {asEnabled && (
              <>
                {/* Окно отмены */}
                <View style={[s.setRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                  <View style={s.setRowText}>
                    <Text style={s.setRowTitle}>Окно отмены</Text>
                    <Text style={s.setRowSub}>Сколько у вас есть времени, чтобы остановить отправку</Text>
                  </View>
                </View>
                <View style={s.pillsRow}>
                  {AUTO_SEND_DELAY_OPTIONS.map(opt => {
                    const active = asDelay === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        style={[s.pill, active && s.pillActive]}
                        {...ripple('rgba(255,255,255,0.18)')}
                        onPress={() => setAutoSendDelay(opt.value)}
                        disabled={!settings.enabled}
                      >
                        <Text style={[s.pillText, active && s.pillTextActive]}>{opt.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Кнопки площадок */}
                <View style={[s.setRow, { borderTopWidth: 1, borderTopColor: C.lineSoft }]}>
                  <View style={s.setRowText}>
                    <Text style={s.setRowTitle}>Кнопки Яндекс Карты / 2ГИС</Text>
                    <Text style={s.setRowSub}>ИИ прикрепит их к ответу гостю в ВК</Text>
                  </View>
                  <Switch
                    value={asLinks}
                    onValueChange={setAutoSendLinks}
                    disabled={!settings.enabled}
                    trackColor={{ false: C.line, true: C.purple }}
                    thumbColor={C.surface}
                    ios_backgroundColor={C.line}
                  />
                </View>

                {asLinks && (
                  <View style={[s.setRow, { borderBottomWidth: 0 }]}>
                    <View style={s.setRowText}>
                      <Text style={s.setRowSub}>Фраза перед кнопками</Text>
                      <View style={{
                        marginTop: 6,
                        backgroundColor: C.surface,
                        borderWidth: 1, borderColor: C.line, borderRadius: 10,
                        paddingHorizontal: 12,
                      }}>
                        <TextInput
                          value={linksTextDraft}
                          onChangeText={setLinksTextDraft}
                          onBlur={commitLinksText}
                          onEndEditing={commitLinksText}
                          placeholder="Будем рады вашему отзыву на картах:"
                          placeholderTextColor={C.ink4}
                          maxLength={200}
                          editable={settings.enabled}
                          returnKeyType="done"
                          style={[s.fieldInput, { paddingVertical: 10 }]}
                        />
                      </View>
                    </View>
                  </View>
                )}

                {/* Лимит в сутки */}
                <View style={[s.setRow, s.setRowLast, { borderTopWidth: 1, borderTopColor: C.lineSoft }]}>
                  <View style={s.setRowText}>
                    <Text style={s.setRowTitle}>Лимит в сутки</Text>
                    <Text style={s.setRowSub}>Не больше этого числа автоответов за день (1–500)</Text>
                  </View>
                  <View style={{
                    backgroundColor: C.surface,
                    borderWidth: 1, borderColor: C.line, borderRadius: 10,
                    paddingHorizontal: 12, minWidth: 74,
                  }}>
                    <TextInput
                      value={limitDraft}
                      onChangeText={t => setLimitDraft(t.replace(/[^0-9]/g, ''))}
                      onBlur={commitLimit}
                      onEndEditing={commitLimit}
                      keyboardType="number-pad"
                      maxLength={3}
                      editable={settings.enabled}
                      returnKeyType="done"
                      style={[s.fieldInput, { paddingVertical: 10, textAlign: 'center' }]}
                    />
                  </View>
                </View>
              </>
            )}
          </View>

          {asEnabled && (
            <>
              <Text style={[s.menuSectionTitle, { marginTop: 16 }]}>Автоотправка по точкам</Text>
              <View style={s.menuCard}>
                {branches.map((b, i) => (
                  <View key={b.id} style={[s.setRow, i === branches.length - 1 && s.setRowLast]}>
                    <View style={s.setRowText}>
                      <Text style={s.setRowTitle}>{b.name}</Text>
                      {b.address && (
                        <Text style={s.setRowSub}>{b.address}{b.city ? `, ${b.city}` : ''}</Text>
                      )}
                    </View>
                    <Switch
                      value={asBranches[b.id] ?? true}
                      onValueChange={(v) => setAutoSendBranch(b.id, v)}
                      disabled={!settings.enabled}
                      trackColor={{ false: C.line, true: C.purple }}
                      thumbColor={C.surface}
                      ios_backgroundColor={C.line}
                    />
                  </View>
                ))}
              </View>
              <Text style={[s.setRowSub, { paddingHorizontal: 14, marginTop: 8 }]}>
                Отзывы, пришедшие из сообщений сообщества ВК, не привязаны к точке — на них действует общий переключатель.
              </Text>
            </>
          )}
        </View>

        {/* Автоподтверждение на негатив */}
        <View style={[s.menuSection, dim && s.menuRowDisabled]}>
          <Text style={s.menuSectionTitle}>🙏 Подтверждение на негатив</Text>
          <View style={s.menuCard}>
            <View style={[s.setRow, !aaEnabled && s.setRowLast]}>
              <View style={s.setRowText}>
                <Text style={s.setRowTitle}>
                  <Bell size={13} color={C.ink} />  «Спасибо, разберёмся»
                </Text>
                <Text style={s.setRowSub}>
                  Если на негативный отзыв никто не ответил за выбранное окно, ИИ отправит короткое подтверждение. Отзыв остаётся неотвеченным — по существу отвечаете вы.
                </Text>
              </View>
              <Switch
                value={aaEnabled}
                onValueChange={setAutoAck}
                disabled={!settings.enabled}
                trackColor={{ false: C.line, true: C.purple }}
                thumbColor={C.surface}
                ios_backgroundColor={C.line}
              />
            </View>

            {aaEnabled && (
              <>
                <View style={[s.setRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                  <View style={s.setRowText}>
                    <Text style={s.setRowTitle}>Окно без ответа</Text>
                    <Text style={s.setRowSub}>Сколько ждать вашего ответа, прежде чем ИИ напишет гостю</Text>
                  </View>
                </View>
                <View style={s.pillsRow}>
                  {AUTO_ACK_DELAY_OPTIONS.map(opt => {
                    const active = aaDelay === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        style={[s.pill, active && s.pillActive]}
                        {...ripple('rgba(255,255,255,0.18)')}
                        onPress={() => setAutoAckDelay(opt.value)}
                        disabled={!settings.enabled}
                      >
                        <Text style={[s.pillText, active && s.pillTextActive]}>{opt.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={[s.setRow, s.setRowLast, { borderTopWidth: 1, borderTopColor: C.lineSoft, flexDirection: 'column', alignItems: 'stretch' }]}>
                  <View style={s.setRowText}>
                    <Text style={s.setRowTitle}>Текст подтверждения</Text>
                    <Text style={s.setRowSub}>Одна фраза для всех негативных отзывов, без обещаний и скидок (до 300 символов)</Text>
                  </View>
                  <View style={{
                    marginTop: 8,
                    backgroundColor: C.surface,
                    borderWidth: 1, borderColor: C.line, borderRadius: 10,
                    paddingHorizontal: 12,
                  }}>
                    <TextInput
                      value={ackTextDraft}
                      onChangeText={setAckTextDraft}
                      onBlur={commitAckText}
                      onEndEditing={commitAckText}
                      placeholder={AA_DEFAULT_TEXT}
                      placeholderTextColor={C.ink4}
                      maxLength={300}
                      multiline
                      editable={settings.enabled}
                      style={[s.fieldInput, { paddingVertical: 10, minHeight: 64, textAlignVertical: 'top' }]}
                    />
                  </View>
                </View>
              </>
            )}
          </View>
          {aaEnabled && (
            <Text style={[s.setRowSub, { paddingHorizontal: 14, marginTop: 8 }]}>
              Точки и лимит в сутки — общие с автоотправкой позитивных. Перед отправкой придёт пуш «ИИ напишет в HH:MM» — отменить можно из карточки отзыва или просто ответив самому.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
