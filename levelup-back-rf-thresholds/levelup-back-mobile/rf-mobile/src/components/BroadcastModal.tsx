import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, Modal, ScrollView, KeyboardAvoidingView, Platform,
  TextInput, Alert, ActivityIndicator, Image, StyleSheet,
} from 'react-native';
import {
  X as XIcon, Image as ImageIcon, Sparkles, Lightbulb, Send, Download,
  TestTube2, Users as UsersIcon,
} from 'lucide-react-native';
import { C } from '../theme';
import { haptic, ripple } from '../platform';
import { fmtNum } from '../helpers';
import { generateBroadcastText, sendBroadcast } from '../api';
import type { Mode, RFCell, SegmentInfo, GenderFilter } from '../types';
import type { Resp } from '../responsive';
import type { S } from '../styles';

// expo-image-picker — необязательная зависимость; на web используем нативный input.
let ImagePicker: any = null;
try { ImagePicker = require('expo-image-picker'); } catch {}

// ════════════════════════════════════════════════════════════════════
// BROADCAST MODAL — модалка рассылки сегменту
// ════════════════════════════════════════════════════════════════════
export const BroadcastModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  cell: RFCell | null;
  info: SegmentInfo | null;
  mode: Mode;
  branchIds: number[];
  s: S;
  r: Resp;
}> = ({ visible, onClose, cell, info, mode, branchIds, s, r }) => {
  const [text, setText] = useState('');
  const [textB, setTextB] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLoadingB, setAiLoadingB] = useState(false);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ msg: string; type: 'success' | 'error' | 'loading' } | null>(null);

  // A/B + расширенные настройки
  const [abMode, setAbMode] = useState(false);
  const [splitA, setSplitA] = useState(50); // процент варианту A: 50/70/80/90
  const [gender, setGender] = useState<GenderFilter>('all');

  useEffect(() => {
    if (visible) {
      setText('');
      setTextB('');
      setImageUri(null);
      setStatus(null);
      setAiLoading(false);
      setAiLoadingB(false);
      setSending(false);
      setAbMode(false);
      setSplitA(50);
      setGender('all');
    }
  }, [visible]);

  if (!cell || !info) return null;

  const segId = cell.segment_id;
  const overChars = text.length > 4096;
  const overCharsB = textB.length > 4096;
  const sendDisabled = sending || aiLoading || aiLoadingB
    || !text.trim() || overChars
    || (abMode && (!textB.trim() || overCharsB))
    || !segId;

  // Прогноз размера сегмента после применения фильтра по полу.
  // На моке считаем 55% женщин / 45% мужчин (типичная аудитория VK кофеен).
  const filteredCount = gender === 'all'
    ? cell.count
    : gender === 'female' ? Math.round(cell.count * 0.55)
    : Math.round(cell.count * 0.45);

  const onAi = async (forVariant: 'A' | 'B' = 'A') => {
    if (!segId) return;
    haptic('light');
    if (forVariant === 'A') setAiLoading(true); else setAiLoadingB(true);
    setStatus({ msg: forVariant === 'A' ? 'AI генерирует текст A…' : 'AI генерирует текст B…', type: 'loading' });
    try {
      const t = await generateBroadcastText({ segment_id: segId });
      if (forVariant === 'A') setText(t); else setTextB(t);
      setStatus({ msg: '✓ Текст готов — проверьте и отправьте', type: 'success' });
    } catch (e: any) {
      haptic('error');
      setStatus({ msg: e?.message ?? 'Не удалось сгенерировать', type: 'error' });
    } finally {
      if (forVariant === 'A') setAiLoading(false); else setAiLoadingB(false);
    }
  };

  const onPickImage = async () => {
    haptic('light');
    if (Platform.OS === 'web') {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/jpeg,image/png,image/webp';
        input.onchange = (e: any) => {
          const file = e.target?.files?.[0];
          if (!file) return;
          if (file.size > 5 * 1024 * 1024) {
            Alert.alert('Файл слишком большой', 'Максимум 5 МБ.');
            return;
          }
          const url = URL.createObjectURL(file);
          setImageUri(url);
        };
        input.click();
      } catch (e: any) {
        Alert.alert('Ошибка', 'Не удалось открыть выбор файла');
      }
      return;
    }
    if (!ImagePicker) {
      Alert.alert(
        'Нужна установка',
        'Для выбора картинки выполните:\n\nnpx expo install expo-image-picker\n\nи перезапустите приложение.',
      );
      return;
    }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Доступ запрещён', 'Разрешите доступ к фото в настройках.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? 'images',
        allowsEditing: false,
        quality: 0.85,
      });
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (!asset?.uri) return;
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        Alert.alert('Файл слишком большой', 'Максимум 5 МБ.');
        return;
      }
      setImageUri(asset.uri);
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message ?? 'Не удалось выбрать файл');
    }
  };

  const onSenler = () => {
    haptic('light');
    Alert.alert('Senler', `Скачать TXT с VK ID для сегмента «${info.name}»?`, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Скачать', onPress: () => Alert.alert('Готово', 'Файл будет загружен (мок).') },
    ]);
  };

  const onSend = async () => {
    if (!segId || sendDisabled) return;
    haptic('medium');
    const genderLabel = gender === 'all' ? 'все' : gender === 'female' ? 'только женщины' : 'только мужчины';
    const summary = abMode
      ? `Сегмент «${info.name}» — ${fmtNum(filteredCount)} гостей\nA/B: ${splitA}% / ${100 - splitA}%, ${genderLabel}`
      : `Сегмент «${info.name}» — ${fmtNum(filteredCount)} гостей${gender !== 'all' ? `\nФильтр: ${genderLabel}` : ''}`;

    Alert.alert(
      'Отправить рассылку?',
      summary,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Отправить', style: 'default',
          onPress: async () => {
            setSending(true);
            setStatus({ msg: 'Рассылка отправляется, подождите…', type: 'loading' });
            try {
              const res = await sendBroadcast({
                segment_id: segId,
                message_text: text.trim(),
                mode, branch_ids: branchIds, image_uri: imageUri,
                gender_filter: gender,
                variants: abMode ? [
                  { label: 'A', text: text.trim(), percent: splitA },
                  { label: 'B', text: textB.trim(), percent: 100 - splitA },
                ] : undefined,
              });
              haptic('success');
              const recap = abMode && res.variants
                ? `✅ Отправлено ${res.total_sent} (A: ${res.variants[0].sent_count}, B: ${res.variants[1].sent_count})`
                : `✅ Отправлено ${res.total_sent} сообщений`;
              setStatus({ msg: recap, type: 'success' });
              setTimeout(onClose, 2200);
            } catch (e: any) {
              haptic('error');
              setStatus({ msg: e?.message ?? 'Ошибка отправки', type: 'error' });
            } finally {
              setSending(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.modalRoot}
      >
        <Pressable style={s.modalBackdrop} onPress={onClose} />
        <View style={s.modalSheet}>
          <View style={s.modalHandle} />

          <View style={s.modalHeader}>
            <Text style={s.detailEmoji}>{info.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.modalSuper}>РАССЫЛКА</Text>
              <Text style={s.modalTitle} numberOfLines={1} ellipsizeMode="tail">{info.name}</Text>
            </View>
            <Pressable style={s.modalClose} {...ripple()} onPress={onClose}>
              <XIcon size={18} color={C.ink} strokeWidth={2.2} />
            </Pressable>
          </View>

          <ScrollView
            style={s.modalBody}
            contentContainerStyle={s.modalBodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={s.modalSegInfo}>
              <View style={s.modalSegBadge}>
                <View style={s.modalSegDot} />
                <Text style={s.modalSegBadgeText}>{info.code}</Text>
              </View>
              <Text style={s.modalSegCount}>{fmtNum(cell.count)} гостей</Text>
            </View>

            {info.hint && (
              <View style={s.modalHint}>
                <View style={s.modalHintHeader}>
                  <Lightbulb size={11} color={C.hintInk} strokeWidth={2.5} />
                  <Text style={s.modalHintTitle}>ПОДСКАЗКА</Text>
                </View>
                <Text style={s.modalHintText}>{info.hint}</Text>
              </View>
            )}

            {/* Фильтр по полу */}
            <View style={abExtraStyles.filterBlock}>
              <View style={abExtraStyles.filterLabelRow}>
                <UsersIcon size={12} color={C.ink3} strokeWidth={2.2} />
                <Text style={abExtraStyles.filterLabel}>ПОЛ ПОЛУЧАТЕЛЕЙ</Text>
                {gender !== 'all' && (
                  <Text style={abExtraStyles.filterCount}>
                    ≈ {fmtNum(filteredCount)} из {fmtNum(cell.count)}
                  </Text>
                )}
              </View>
              <View style={abExtraStyles.chipRow}>
                {([
                  { key: 'all', label: 'Все' },
                  { key: 'female', label: 'Женщины' },
                  { key: 'male', label: 'Мужчины' },
                ] as const).map(g => {
                  const active = gender === g.key;
                  return (
                    <Pressable
                      key={g.key}
                      style={[abExtraStyles.chip, active && abExtraStyles.chipActive]}
                      {...ripple()}
                      onPress={() => { haptic('light'); setGender(g.key); }}
                    >
                      <Text style={[abExtraStyles.chipText, active && abExtraStyles.chipTextActive]}>
                        {g.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* A/B toggle */}
            <Pressable
              style={[abExtraStyles.abToggle, abMode && abExtraStyles.abToggleActive]}
              {...ripple()}
              onPress={() => { haptic('light'); setAbMode(v => !v); }}
            >
              <View style={[abExtraStyles.abIcon, abMode && abExtraStyles.abIconActive]}>
                <TestTube2 size={13} color={abMode ? C.surface : C.purpleDeep} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={abExtraStyles.abToggleTitle}>A/B-тест</Text>
                <Text style={abExtraStyles.abToggleSub} numberOfLines={2}>
                  {abMode
                    ? 'Два варианта текста — сегмент делится по выбранной пропорции'
                    : 'Включить, чтобы сравнить два варианта текста'}
                </Text>
              </View>
              <View style={[abExtraStyles.abSwitch, abMode && abExtraStyles.abSwitchOn]}>
                <View style={[abExtraStyles.abSwitchKnob, abMode && abExtraStyles.abSwitchKnobOn]} />
              </View>
            </Pressable>

            {/* Variant A label (визуальная подсказка только в A/B-режиме) */}
            {abMode && (
              <View style={abExtraStyles.variantHeadRow}>
                <View style={[abExtraStyles.variantBadge, { backgroundColor: '#EEF2FF' }]}>
                  <Text style={[abExtraStyles.variantBadgeText, { color: '#4338CA' }]}>A · {splitA}%</Text>
                </View>
                <Text style={abExtraStyles.variantHeadHint}>{fmtNum(Math.round(filteredCount * splitA / 100))} получателей</Text>
              </View>
            )}

            <View style={s.modalInputWrap}>
              <TextInput
                style={s.modalTextarea}
                multiline
                placeholder={abMode ? 'Текст варианта A…' : 'Введите текст рассылки или нажмите «AI текст»…'}
                placeholderTextColor={C.ink4}
                value={text}
                onChangeText={setText}
                textAlignVertical="top"
                maxLength={5000}
              />
            </View>
            <Text style={[s.modalCharCount, overChars && s.modalCharCountOver]}>
              {text.length} / 4096
            </Text>

            {/* Variant B (только когда A/B включён) */}
            {abMode && (
              <>
                <View style={[abExtraStyles.variantHeadRow, { marginTop: 14 }]}>
                  <View style={[abExtraStyles.variantBadge, { backgroundColor: '#FCE7F3' }]}>
                    <Text style={[abExtraStyles.variantBadgeText, { color: '#BE185D' }]}>B · {100 - splitA}%</Text>
                  </View>
                  <Text style={abExtraStyles.variantHeadHint}>{fmtNum(Math.round(filteredCount * (100 - splitA) / 100))} получателей</Text>
                  <Pressable
                    style={abExtraStyles.aiSmall}
                    {...ripple()}
                    onPress={() => onAi('B')}
                    disabled={aiLoadingB || sending || !segId}
                  >
                    {aiLoadingB
                      ? <ActivityIndicator size="small" color={C.purpleDeep} />
                      : <Sparkles size={11} color={C.purpleDeep} strokeWidth={2.2} />
                    }
                    <Text style={abExtraStyles.aiSmallText}>AI</Text>
                  </Pressable>
                </View>
                <View style={s.modalInputWrap}>
                  <TextInput
                    style={s.modalTextarea}
                    multiline
                    placeholder="Текст варианта B…"
                    placeholderTextColor={C.ink4}
                    value={textB}
                    onChangeText={setTextB}
                    textAlignVertical="top"
                    maxLength={5000}
                  />
                </View>
                <Text style={[s.modalCharCount, overCharsB && s.modalCharCountOver]}>
                  {textB.length} / 4096
                </Text>

                {/* Split: пропорция A / B */}
                <View style={[abExtraStyles.filterBlock, { marginTop: 6 }]}>
                  <View style={abExtraStyles.filterLabelRow}>
                    <Text style={abExtraStyles.filterLabel}>СПЛИТ A / B</Text>
                    <Text style={abExtraStyles.filterCount}>{splitA}% / {100 - splitA}%</Text>
                  </View>

                  {/* Визуальная пропорциональная полоска */}
                  <View style={abExtraStyles.splitBar}>
                    <View style={[abExtraStyles.splitBarA, { flex: splitA }]}>
                      <Text style={abExtraStyles.splitBarText}>A · {splitA}%</Text>
                    </View>
                    <View style={[abExtraStyles.splitBarB, { flex: 100 - splitA }]}>
                      <Text style={abExtraStyles.splitBarText}>B · {100 - splitA}%</Text>
                    </View>
                  </View>

                  {/* Пары полей: A и B, при правке одного второе меняется автоматически */}
                  <View style={abExtraStyles.splitInputsRow}>
                    <SplitInput
                      label="A"
                      tone="indigo"
                      value={splitA}
                      onChangeNum={(n) => setSplitA(clampSplit(n))}
                    />
                    <Text style={abExtraStyles.splitDash}>—</Text>
                    <SplitInput
                      label="B"
                      tone="pink"
                      value={100 - splitA}
                      onChangeNum={(n) => setSplitA(clampSplit(100 - n))}
                    />
                  </View>

                  {/* Чипы — быстрые пресеты */}
                  <View style={[abExtraStyles.chipRow, { marginTop: 8 }]}>
                    {[50, 70, 80, 90].map(v => {
                      const active = splitA === v;
                      return (
                        <Pressable
                          key={v}
                          style={[abExtraStyles.chip, active && abExtraStyles.chipActive]}
                          {...ripple()}
                          onPress={() => { haptic('light'); setSplitA(v); }}
                        >
                          <Text style={[abExtraStyles.chipText, active && abExtraStyles.chipTextActive]}>
                            {v} / {100 - v}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </>
            )}

            {imageUri ? (
              <View style={s.modalImagePreview}>
                <Image source={{ uri: imageUri }} style={s.modalImage} resizeMode="cover" />
                <Pressable style={s.modalImageRemove} {...ripple('rgba(255,255,255,0.2)', true)} onPress={() => { haptic('light'); setImageUri(null); }}>
                  <XIcon size={14} color={C.surface} strokeWidth={2.5} />
                </Pressable>
              </View>
            ) : (
              <Pressable style={s.modalImageDrop} {...ripple()} onPress={onPickImage}>
                <ImageIcon size={22} color={C.ink3} strokeWidth={1.6} />
                <Text style={s.modalImageDropText}>Прикрепить изображение</Text>
                <Text style={s.modalImageDropHint}>JPG, PNG до 5 МБ</Text>
              </Pressable>
            )}

            {status && (
              <View style={[
                s.modalStatus,
                status.type === 'success' && s.modalStatusOk,
                status.type === 'error' && s.modalStatusErr,
                status.type === 'loading' && s.modalStatusLoad,
              ]}>
                <Text style={[
                  s.modalStatusText,
                  status.type === 'success' && { color: C.good },
                  status.type === 'error' && { color: C.warn },
                  status.type === 'loading' && { color: C.ink3 },
                ]}>{status.msg}</Text>
              </View>
            )}

            <Pressable style={s.senlerLink} {...ripple()} onPress={onSenler}>
              <Download size={12} color={C.ink3} strokeWidth={2} />
              <Text style={s.senlerLinkText}>или скачать VK ID для Senler</Text>
            </Pressable>
          </ScrollView>

          <View style={[s.modalFooter, r.isTiny && s.actionsStack]}>
            <Pressable
              style={[s.btn, s.btnAi, (aiLoading || sending) && { opacity: 0.5 }]}
              {...ripple()}
              onPress={() => onAi('A')}
              disabled={aiLoading || sending || !segId}
            >
              {aiLoading
                ? <ActivityIndicator size="small" color={C.purpleDeep} />
                : <Sparkles size={14} color={C.purpleDeep} strokeWidth={2} />
              }
              <Text style={s.btnAiText}>{abMode ? 'AI текст A' : 'AI текст'}</Text>
            </Pressable>
            <Pressable
              style={[s.btn, s.btnPrimary, sendDisabled && { opacity: 0.5 }]}
              {...ripple('rgba(255,255,255,0.22)')}
              onPress={onSend}
              disabled={sendDisabled}
            >
              {sending
                ? <ActivityIndicator size="small" color={C.surface} />
                : <Send size={14} color={C.surface} strokeWidth={2} />
              }
              <Text style={s.btnPrimaryText}>Отправить</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─────────────────────────────────────────────
// SplitInput — числовое поле для процента варианта (A или B).
// При вводе сразу пересчитывает второй вариант через onChangeNum,
// которое родитель свяжет с setSplitA(clampSplit(n)) или setSplitA(100 - n).
// Локальный текстовый state, чтобы можно было стереть всё и набрать заново.
// ─────────────────────────────────────────────
const SplitInput: React.FC<{
  label: 'A' | 'B';
  tone: 'indigo' | 'pink';
  value: number;
  onChangeNum: (n: number) => void;
}> = ({ label, tone, value, onChangeNum }) => {
  const [text, setLocal] = useState(String(value));

  // Когда родитель меняет splitA снаружи (чипы / другое поле) — синхронизируем локалку
  useEffect(() => { setLocal(String(value)); }, [value]);

  const colors = tone === 'indigo'
    ? { bg: '#EEF2FF', ink: '#4338CA' }
    : { bg: '#FCE7F3', ink: '#BE185D' };

  return (
    <View style={[abExtraStyles.splitInputBox, { borderColor: colors.bg, backgroundColor: '#fff' }]}>
      <View style={[abExtraStyles.splitInputBadge, { backgroundColor: colors.bg }]}>
        <Text style={[abExtraStyles.splitInputBadgeText, { color: colors.ink }]}>{label}</Text>
      </View>
      <TextInput
        style={abExtraStyles.splitInputField}
        value={text}
        onChangeText={(v) => {
          // принимаем только цифры; обновляем локально, чтобы можно было стирать
          const clean = v.replace(/[^0-9]/g, '').slice(0, 3);
          setLocal(clean);
          if (clean === '') return;                  // не пушим в parent, ждём ввода
          const n = parseInt(clean, 10);
          if (Number.isFinite(n)) onChangeNum(n);
        }}
        onBlur={() => {
          // на blur нормализуем: если поле пустое или вне диапазона — откатываем к value
          if (text === '' || isNaN(parseInt(text, 10))) {
            setLocal(String(value));
            return;
          }
          const n = clampSplit(parseInt(text, 10));
          setLocal(String(label === 'A' ? n : (100 - clampSplit(100 - n))));
        }}
        keyboardType="number-pad"
        maxLength={3}
        selectTextOnFocus
        textAlign="center"
      />
      <Text style={abExtraStyles.splitInputSuffix}>%</Text>
    </View>
  );
};

// Зажимаем процент в [1, 99] — крайности (0 / 100) убивают смысл A/B-теста.
function clampSplit(n: number): number {
  if (!Number.isFinite(n)) return 50;
  return Math.max(1, Math.min(99, Math.round(n)));
}

// ─────────────────────────────────────────────
// Локальные стили для A/B + gender блоков
// ─────────────────────────────────────────────
const abExtraStyles = StyleSheet.create({
  filterBlock: {
    marginTop: 12,
    marginBottom: 4,
  },
  filterLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  filterLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 1.1,
    color: C.ink3,
  },
  filterCount: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: C.ink3,
    marginLeft: 'auto',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.line,
  },
  chipActive: {
    backgroundColor: C.purple,
    borderColor: C.purple,
  },
  chipText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: C.ink2,
  },
  chipTextActive: {
    color: C.surface,
  },
  abToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.line,
    marginTop: 12,
    marginBottom: 4,
  },
  abToggleActive: {
    backgroundColor: '#F5F3FF',
    borderColor: C.purple,
  },
  abIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: C.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abIconActive: {
    backgroundColor: C.purple,
  },
  abToggleTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: C.ink,
  },
  abToggleSub: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: C.ink3,
    lineHeight: 14,
    marginTop: 2,
  },
  abSwitch: {
    width: 36,
    height: 20,
    borderRadius: 999,
    backgroundColor: C.line,
    padding: 2,
    justifyContent: 'center',
  },
  abSwitchOn: {
    backgroundColor: C.purple,
  },
  abSwitchKnob: {
    width: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: C.surface,
  },
  abSwitchKnobOn: {
    transform: [{ translateX: 16 }],
  },
  variantHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 6,
  },
  variantBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  variantBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 0.4,
  },
  variantHeadHint: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: C.ink3,
    flex: 1,
    minWidth: 0,
  },
  aiSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: C.purpleSoft,
  },
  aiSmallText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: C.purpleDeep,
  },
  // Split A/B — визуальная полоска и поля ввода
  splitBar: {
    flexDirection: 'row',
    height: 26,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  splitBarA: {
    backgroundColor: '#4338CA',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  splitBarB: {
    backgroundColor: '#BE185D',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  splitBarText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: '#fff',
    letterSpacing: 0.3,
  },
  splitInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  splitInputBox: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  splitInputBadge: {
    width: 22,
    height: 22,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitInputBadgeText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
  },
  splitInputField: {
    flex: 1,
    minWidth: 0,
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    color: C.ink,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  splitInputSuffix: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: C.ink3,
  },
  splitDash: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    color: C.ink3,
  },
});
