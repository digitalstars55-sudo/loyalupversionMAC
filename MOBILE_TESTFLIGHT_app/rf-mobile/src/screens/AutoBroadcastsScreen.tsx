import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, RefreshControl, Switch, TextInput, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Eye, Save } from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple } from '../platform';
import { fetchAutoBroadcasts, updateAutoBroadcast, previewAutoBroadcast } from '../api';
import { makeStyles } from '../styles';
import { Skeleton } from '../components/Skeleton';
import type { AutoBroadcastRule } from '../types';

// ════════════════════════════════════════════════════════════════════
// АВТОРАССЫЛКИ — управление из мобилки.
// Создание новых правил и тонкая настройка условий/аудитории — в вебе.
// Здесь: список, вкл/выкл, правка текста, статистика, предпросмотр «кому уйдёт».
// ════════════════════════════════════════════════════════════════════

const EVENT_EMOJI: Record<string, string> = {
  birthday_7d: '🎂',
  birthday_1d: '🎂',
  birthday: '🎉',
  after_game_3h: '🎮',
  gift_not_claimed: '🎁',
  no_visit_days: '💤',
  subscribed_days: '👋',
};

export const AutoBroadcastsScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);

  const [rules, setRules] = useState<AutoBroadcastRule[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setRules(await fetchAutoBroadcasts());
    } catch {
      setRules([]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onToggle = async (rule: AutoBroadcastRule, value: boolean) => {
    haptic('light');
    // Включение — только после предпросмотра: показываем, скольким уйдёт.
    if (value) {
      try {
        const p = await previewAutoBroadcast(rule.id);
        const who = p.sample_names.length ? `\n\nНапример: ${p.sample_names.join(', ')}` : '';
        Alert.alert(
          'Включить авторассылку?',
          `Сейчас сообщение получили бы ${p.recipients} гостей.${who}\n\n` +
          'Дальше оно будет уходить автоматически при наступлении события.',
          [
            { text: 'Отмена', style: 'cancel' },
            {
              text: 'Включить',
              style: 'default',
              onPress: async () => {
                try {
                  const upd = await updateAutoBroadcast(rule.id, { is_active: true });
                  setRules(prev => (prev ?? []).map(x => (x.id === rule.id ? upd : x)));
                } catch (e: any) {
                  Alert.alert('Не удалось включить', e?.message ?? 'Попробуйте ещё раз');
                }
              },
            },
          ],
        );
      } catch (e: any) {
        Alert.alert('Не удалось проверить', e?.message ?? 'Попробуйте ещё раз');
      }
      return;
    }
    try {
      const upd = await updateAutoBroadcast(rule.id, { is_active: false });
      setRules(prev => (prev ?? []).map(x => (x.id === rule.id ? upd : x)));
    } catch (e: any) {
      Alert.alert('Не удалось выключить', e?.message ?? 'Попробуйте ещё раз');
    }
  };

  const onSaveText = async (rule: AutoBroadcastRule) => {
    if (!draft.trim()) {
      Alert.alert('Пустой текст', 'Напишите сообщение, которое получит гость.');
      return;
    }
    setBusy(true);
    try {
      const upd = await updateAutoBroadcast(rule.id, { message_text: draft.trim() });
      setRules(prev => (prev ?? []).map(x => (x.id === rule.id ? upd : x)));
      setOpenId(null);
      haptic('light');
    } catch (e: any) {
      Alert.alert('Не удалось сохранить', e?.message ?? 'Попробуйте ещё раз');
    } finally {
      setBusy(false);
    }
  };

  const onPreview = async (rule: AutoBroadcastRule) => {
    haptic('light');
    try {
      const p = await previewAutoBroadcast(rule.id);
      const who = p.sample_names.length ? `\n\nНапример: ${p.sample_names.join(', ')}` : '';
      const when = p.due_now
        ? 'Правило активно и сейчас в окне отправки.'
        : `Прямо сейчас не отправляется (${p.reason}).`;
      Alert.alert(
        'Кому уйдёт',
        `${p.recipients} гостей.${who}\n\n${when}\n\nНичего не отправлено — это только проверка.`,
      );
    } catch (e: any) {
      Alert.alert('Не удалось посчитать', e?.message ?? 'Попробуйте ещё раз');
    }
  };

  const when = (rule: AutoBroadcastRule) => {
    const delay = rule.delay_days ? `через ${rule.delay_days} дн` : 'по умолчанию';
    return `${delay} · ${rule.send_hour_start}:00–${rule.send_hour_end}:00`;
  };

  const audience = (rule: AutoBroadcastRule) =>
    rule.branches_count ? `${rule.branches_count} точ.` : 'все точки';

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="dark" />

      <View style={s.backHeader}>
        <Pressable style={s.backBtn} {...ripple()} onPress={onBack}>
          <ChevronLeft size={20} color={C.ink} strokeWidth={2.2} />
        </Pressable>
        <View style={s.screenTitleBlock}>
          <Text style={s.screenTitleSuper}>Рассылки</Text>
          <Text style={s.screenTitleMain}>Авторассылки</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 130, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={C.purple}
          />
        }
      >
        <Text style={{ fontSize: 13, color: C.ink3, lineHeight: 19, marginBottom: 14 }}>
          Сообщения, которые уходят гостям сами при наступлении события. Здесь можно
          поменять текст и включить/выключить. Создать новую или настроить условия и
          аудиторию — в веб-кабинете.
        </Text>

        {rules === null ? (
          Array.from({ length: 3 }).map((_, i) => (
            <View key={i} style={{ marginBottom: 12 }}>
              <Skeleton w="100%" h={92} />
            </View>
          ))
        ) : rules.length === 0 ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>📭</Text>
            <Text style={{ fontSize: 14, color: C.ink3, textAlign: 'center' }}>
              Авторассылок пока нет.{'\n'}Создайте первую в веб-кабинете.
            </Text>
          </View>
        ) : (
          rules.map(rule => {
            const open = openId === rule.id;
            return (
              <View
                key={rule.id}
                style={{
                  backgroundColor: C.surface,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: rule.is_active ? C.purpleSoft : C.line,
                  padding: 14,
                  marginBottom: 12,
                }}
              >
                {/* Заголовок + тумблер */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: 22, marginRight: 10 }}>
                    {EVENT_EMOJI[rule.event] ?? '📨'}
                  </Text>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink }} numberOfLines={2}>
                      {rule.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: C.ink3, marginTop: 3 }} numberOfLines={1}>
                      {rule.event_label}
                    </Text>
                    <Text style={{ fontSize: 12, color: C.ink4, marginTop: 3 }}>
                      {when(rule)} · {audience(rule)}
                    </Text>
                  </View>
                  <Switch
                    value={rule.is_active}
                    onValueChange={v => onToggle(rule, v)}
                    trackColor={{ false: C.line, true: C.purple }}
                    thumbColor={C.surface}
                  />
                </View>

                {/* Статистика */}
                <Text style={{ fontSize: 12, color: C.ink3, marginTop: 10 }}>
                  Отправлено всего: <Text style={{ fontWeight: '700', color: C.ink }}>{rule.sent_total}</Text>
                </Text>

                {/* Текст */}
                {open ? (
                  <View style={{ marginTop: 10 }}>
                    <TextInput
                      value={draft}
                      onChangeText={setDraft}
                      multiline
                      style={{
                        borderWidth: 1, borderColor: C.line, borderRadius: 10,
                        padding: 10, minHeight: 110, fontSize: 14, color: C.ink,
                        textAlignVertical: 'top', backgroundColor: C.bg,
                      }}
                      placeholder="Текст сообщения гостю"
                      placeholderTextColor={C.ink4}
                    />
                    <Text style={{ fontSize: 11, color: C.ink4, marginTop: 6, lineHeight: 16 }}>
                      Переменные: {'{имя}'} · {'{подарок}'} · {'{дней_осталось}'} · {'{адреса}'}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                      <Pressable
                        style={{
                          flex: 1, backgroundColor: C.purple, borderRadius: 10,
                          paddingVertical: 11, flexDirection: 'row',
                          alignItems: 'center', justifyContent: 'center', gap: 6,
                          opacity: busy ? 0.6 : 1,
                        }}
                        disabled={busy}
                        {...ripple('rgba(255,255,255,0.22)')}
                        onPress={() => onSaveText(rule)}
                      >
                        <Save size={16} color={C.surface} strokeWidth={2.2} />
                        <Text style={{ color: C.surface, fontWeight: '700', fontSize: 14 }}>
                          Сохранить
                        </Text>
                      </Pressable>
                      <Pressable
                        style={{
                          paddingHorizontal: 16, borderRadius: 10, paddingVertical: 11,
                          borderWidth: 1, borderColor: C.line, justifyContent: 'center',
                        }}
                        {...ripple()}
                        onPress={() => setOpenId(null)}
                      >
                        <Text style={{ color: C.ink3, fontWeight: '600', fontSize: 14 }}>
                          Отмена
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <>
                    <Text
                      style={{
                        fontSize: 13, color: C.ink2, marginTop: 8, lineHeight: 19,
                        backgroundColor: C.bg, padding: 10, borderRadius: 10,
                      }}
                      numberOfLines={3}
                    >
                      {rule.message_text || '— текст не задан —'}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                      <Pressable
                        style={{
                          flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 10,
                          paddingVertical: 10, alignItems: 'center',
                        }}
                        {...ripple()}
                        onPress={() => { haptic('light'); setDraft(rule.message_text); setOpenId(rule.id); }}
                      >
                        <Text style={{ color: C.ink2, fontWeight: '600', fontSize: 13 }}>
                          Изменить текст
                        </Text>
                      </Pressable>
                      <Pressable
                        style={{
                          flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                          gap: 6, paddingHorizontal: 14, borderRadius: 10, paddingVertical: 10,
                          borderWidth: 1, borderColor: C.purpleSoft, backgroundColor: C.purpleSoft,
                        }}
                        {...ripple()}
                        onPress={() => onPreview(rule)}
                      >
                        <Eye size={15} color={C.purpleDeep} strokeWidth={2.2} />
                        <Text style={{ color: C.purpleDeep, fontWeight: '700', fontSize: 13 }}>
                          Кому уйдёт
                        </Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
