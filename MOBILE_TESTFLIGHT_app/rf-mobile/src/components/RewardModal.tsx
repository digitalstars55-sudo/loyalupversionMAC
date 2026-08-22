import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, ScrollView,
  TextInput, Alert, ActivityIndicator, StyleSheet, Platform,
} from 'react-native';
import { SheetModal } from './SheetModal';
import {
  X as XIcon, Gift, Coins, Lightbulb, Check, Send, Copy, ShieldCheck,
} from 'lucide-react-native';
import { C, F } from '../theme';
import { haptic, ripple } from '../platform';
import { fmtNum, fmtRub } from '../helpers';
import { fetchRewardCatalog, createRfmCampaign } from '../api';
import type {
  Mode, RFCell, SegmentInfo, RewardCatalogItem, RfmCampaign, RfmRewardType,
} from '../types';
import type { Resp } from '../responsive';
import type { S } from '../styles';

// expo-clipboard — необязательная зависимость (в package.json её нет).
// Если модуля нет — показываем ссылку в Alert для ручного копирования.
let Clipboard: any = null;
try { Clipboard = require('expo-clipboard'); } catch {}

const DEFAULT_HOLDOUT = 10;
const MAX_HOLDOUT = 50;
const FALLBACK_LIFETIME = 14;

// ════════════════════════════════════════════════════════════════════
// REWARD MODAL — назначение награды ячейке RF-матрицы (RFM-кампания).
// Контекст ячейки (mode / branch_ids / r_score / f_score / expected_count /
// период) собирается РОВНО так же, как в BroadcastModal → sendBroadcast:
// бэкенд отбивает запрос 409-й, если фактическая аудитория разъехалась
// с показанной цифрой.
// ════════════════════════════════════════════════════════════════════
export const RewardModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  cell: RFCell | null;
  info: SegmentInfo | null;
  mode: Mode;
  branchIds: number[];
  dateRange?: { start_date: string; end_date: string } | null;
  // Переход к рассылке по snapshot созданной кампании.
  onGoToBroadcast?: (campaignId: number) => void;
  // Дёргается после успешного создания — чтобы история перечиталась.
  onCreated?: () => void;
  s: S;
  r: Resp;
}> = ({ visible, onClose, cell, info, mode, branchIds, dateRange, onGoToBroadcast, onCreated, s, r }) => {
  const [rewardType, setRewardType] = useState<RfmRewardType>('gift');
  const [catalog, setCatalog] = useState<RewardCatalogItem[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [pickedId, setPickedId] = useState<number | null>(null);

  const [points, setPoints] = useState('');
  const [lifetime, setLifetime] = useState('');
  const [holdout, setHoldout] = useState(String(DEFAULT_HOLDOUT));

  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<RfmCampaign | null>(null);

  // Сброс при каждом открытии + подгрузка каталога.
  useEffect(() => {
    if (!visible) return;
    setRewardType('gift');
    setPickedId(null);
    setPoints('');
    setLifetime('');
    setHoldout(String(DEFAULT_HOLDOUT));
    setName('');
    setNameTouched(false);
    setSubmitting(false);
    setResult(null);
    setCatalog(null);
    setCatalogError(null);

    let alive = true;
    fetchRewardCatalog()
      .then(items => { if (alive) setCatalog(items); })
      .catch((e: any) => {
        if (!alive) return;
        setCatalog([]);
        setCatalogError(e?.message ?? 'Не удалось загрузить каталог наград');
      });
    return () => { alive = false; };
  }, [visible]);

  const picked = useMemo(
    () => (catalog ?? []).find(i => i.id === pickedId) ?? null,
    [catalog, pickedId],
  );

  const pointsNum = parseInt(points, 10);
  const holdoutNum = Number.isFinite(parseInt(holdout, 10)) ? parseInt(holdout, 10) : DEFAULT_HOLDOUT;
  const lifetimeNum = parseInt(lifetime, 10);

  const audience = cell?.count ?? 0;
  const controlCount = Math.round(audience * (clampHoldout(holdoutNum) / 100));
  const receiveCount = Math.max(0, audience - controlCount);
  const potentialCost = rewardType === 'gift' && picked?.cost_price != null
    ? receiveCount * picked.cost_price
    : null;

  // Автогенерация названия: «RFM / <сегмент> / <награда> / <дата>».
  // Пока пользователь не правил поле — держим его в актуальном состоянии.
  const rewardLabel = rewardType === 'points'
    ? (Number.isFinite(pointsNum) && pointsNum > 0 ? `${pointsNum} баллов` : 'баллы')
    : (picked?.name ?? 'подарок');
  const autoName = useMemo(
    () => `RFM / ${info?.name ?? 'сегмент'} / ${rewardLabel} / ${todayLabel()}`,
    [info?.name, rewardLabel],
  );
  useEffect(() => {
    if (!nameTouched) setName(autoName);
  }, [autoName, nameTouched]);

  const catalogEmpty = catalog != null && catalog.length === 0;
  const segId = cell?.segment_id ?? null;

  const submitDisabled = submitting
    || !segId
    || audience <= 0
    || (rewardType === 'gift' && (!picked || catalogEmpty))
    || (rewardType === 'points' && (!Number.isFinite(pointsNum) || pointsNum <= 0));

  const onCopyLink = useCallback(async (url: string) => {
    haptic('light');
    try {
      if (Clipboard?.setStringAsync) {
        await Clipboard.setStringAsync(url);
        haptic('success');
        Alert.alert('Скопировано', 'Ссылка на выдачу в буфере обмена.');
        return;
      }
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any)?.clipboard?.writeText) {
        await (navigator as any).clipboard.writeText(url);
        Alert.alert('Скопировано', 'Ссылка на выдачу в буфере обмена.');
        return;
      }
    } catch {}
    // Буфер недоступен — показываем ссылку, чтобы скопировать руками.
    Alert.alert('Ссылка на выдачу', url);
  }, []);

  const onSubmit = () => {
    if (!cell || !info || !segId || submitDisabled) return;
    haptic('medium');

    const lines = [
      `Сегмент «${info.name}» — ${fmtNum(audience)} гостей`,
      `Награда: ${rewardType === 'points' ? `${pointsNum} баллов` : picked?.name ?? '—'}`,
      `Контроль: ${clampHoldout(holdoutNum)}% (${fmtNum(controlCount)} гостей без награды)`,
      potentialCost != null ? `Потенциальная себестоимость: ${fmtRub(potentialCost)}` : null,
    ].filter(Boolean).join('\n');

    Alert.alert(
      'Назначить награду?',
      lines,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: `Назначить ${fmtNum(receiveCount)} гостям`,
          style: 'default',
          onPress: async () => {
            setSubmitting(true);
            try {
              const res = await createRfmCampaign({
                segment_id: segId,
                mode,
                branch_ids: branchIds,
                r_score: cell.r_score,
                f_score: cell.f_score,
                expected_count: cell.count,
                start: dateRange?.start_date,
                end: dateRange?.end_date,
                reward_type: rewardType,
                catalog_item_id: rewardType === 'gift' ? picked?.id : undefined,
                points_amount: rewardType === 'points' ? pointsNum : undefined,
                lifetime_days: Number.isFinite(lifetimeNum) && lifetimeNum > 0 ? lifetimeNum : undefined,
                holdout_percent: clampHoldout(holdoutNum),
                name: name.trim() || autoName,
              });
              haptic('success');
              onCreated?.();
              if (res.campaign) {
                setResult(res.campaign);
              } else {
                // Бэк подтвердил, но снимка не прислал — не держим форму открытой.
                Alert.alert('Готово', 'Награда назначена, начисление идёт в фоне.');
                onClose();
              }
            } catch (e: any) {
              haptic('error');
              Alert.alert('Не удалось назначить', e?.message ?? 'Попробуйте ещё раз');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  if (!cell || !info) return null;

  // ── Экран результата ────────────────────────────────────────────
  if (result) {
    const links = result.links ?? [];
    const firstLink = links[0]?.url ?? null;
    return (
      <SheetModal visible={visible} onClose={onClose}>
        <View style={s.modalHeader}>
          <Text style={s.detailEmoji}>🎁</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.modalSuper}>КАМПАНИЯ СОЗДАНА</Text>
            <Text style={s.modalTitle} numberOfLines={1} ellipsizeMode="tail">{result.name || info.name}</Text>
          </View>
          <Pressable style={s.modalClose} {...ripple()} onPress={onClose}>
            <XIcon size={18} color={C.ink} strokeWidth={2.2} />
          </Pressable>
        </View>

        <ScrollView
          style={[s.modalBody, { flexShrink: 1 }]}
          contentContainerStyle={s.modalBodyContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={rw.okBox}>
            <View style={rw.okIcon}>
              <Check size={16} color={C.surface} strokeWidth={3} />
            </View>
            <Text style={rw.okText}>
              Начисление идёт в фоне — счётчики появятся в истории кампаний через минуту.
            </Text>
          </View>

          <View style={rw.summaryCard}>
            <SummaryRow label="Аудитория" value={fmtNum(result.audience_total ?? audience)} />
            <SummaryRow label="Контрольная группа" value={fmtNum(result.control_count ?? controlCount)} />
            <SummaryRow label="Назначено" value={fmtNum(result.assigned_count ?? 0)} accent />
            {result.reward_label ? <SummaryRow label="Награда" value={result.reward_label} /> : null}
            {result.status_label ? <SummaryRow label="Статус" value={result.status_label} last /> : null}
          </View>

          {links.length > 0 && (
            <View style={rw.linksBox}>
              <Text style={rw.linksTitle}>ССЫЛКИ НА ВЫДАЧУ</Text>
              {links.map((l, i) => (
                <Text key={`${l.branch}-${i}`} style={rw.linkRow} numberOfLines={2} ellipsizeMode="middle">
                  {l.branch}: {l.url}
                </Text>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={[s.modalFooter, r.isTiny && s.actionsStack]}>
          {!!firstLink && (
            <Pressable style={[s.btn, s.btnSecondary]} {...ripple()} onPress={() => onCopyLink(firstLink)}>
              <Copy size={14} color={C.ink} strokeWidth={2} />
              <Text style={s.btnSecondaryText}>Скопировать ссылку</Text>
            </Pressable>
          )}
          <Pressable
            style={[s.btn, s.btnPrimary]}
            {...ripple('rgba(255,255,255,0.22)')}
            onPress={() => {
              haptic('light');
              if (result.id != null && onGoToBroadcast) onGoToBroadcast(result.id);
              else onClose();
            }}
          >
            <Send size={14} color={C.surface} strokeWidth={2} />
            <Text style={s.btnPrimaryText}>Перейти к рассылке</Text>
          </Pressable>
        </View>
      </SheetModal>
    );
  }

  // ── Форма ───────────────────────────────────────────────────────
  return (
    <SheetModal visible={visible} onClose={onClose}>
      <View style={s.modalHeader}>
        <Text style={s.detailEmoji}>{info.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.modalSuper}>НАГРАДА СЕГМЕНТУ</Text>
          <Text style={s.modalTitle} numberOfLines={1} ellipsizeMode="tail">{info.name}</Text>
        </View>
        <Pressable style={s.modalClose} {...ripple()} onPress={onClose}>
          <XIcon size={18} color={C.ink} strokeWidth={2.2} />
        </Pressable>
      </View>

      <ScrollView
        style={[s.modalBody, { flexShrink: 1 }]}
        contentContainerStyle={s.modalBodyContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.modalSegInfo}>
          <View style={s.modalSegBadge}>
            <View style={s.modalSegDot} />
            <Text style={s.modalSegBadgeText}>{info.code}</Text>
          </View>
          <Text style={s.modalSegCount}>{fmtNum(audience)} гостей</Text>
        </View>

        {/* Тип награды */}
        <Text style={rw.label}>ТИП НАГРАДЫ</Text>
        <View style={rw.typeRow}>
          <TypeBtn
            active={rewardType === 'gift'}
            icon={<Gift size={14} color={rewardType === 'gift' ? C.surface : C.ink2} strokeWidth={2.2} />}
            label="Подарок"
            onPress={() => { haptic('light'); setRewardType('gift'); }}
          />
          <TypeBtn
            active={rewardType === 'points'}
            icon={<Coins size={14} color={rewardType === 'points' ? C.surface : C.ink2} strokeWidth={2.2} />}
            label="Баллы"
            onPress={() => { haptic('light'); setRewardType('points'); }}
          />
        </View>

        {/* Подарок — каталог */}
        {rewardType === 'gift' && (
          <View style={{ marginTop: 14 }}>
            <Text style={rw.label}>ПОЗИЦИЯ КАТАЛОГА</Text>
            {catalog == null ? (
              <View style={rw.loadingBox}>
                <ActivityIndicator size="small" color={C.purple} />
                <Text style={rw.loadingText}>Загружаем каталог…</Text>
              </View>
            ) : catalogEmpty ? (
              <View style={s.modalHint}>
                <View style={s.modalHintHeader}>
                  <Lightbulb size={11} color={C.hintInk} strokeWidth={2.5} />
                  <Text style={s.modalHintTitle}>КАТАЛОГ ПУСТ</Text>
                </View>
                <Text style={s.modalHintText}>
                  {catalogError
                    ? catalogError
                    : 'Каталог наград пуст — заведите позиции в админке'}
                </Text>
              </View>
            ) : (
              <View style={rw.catalogList}>
                {catalog.map(item => {
                  const active = pickedId === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      style={[rw.catalogRow, active && rw.catalogRowActive]}
                      {...ripple()}
                      onPress={() => { haptic('light'); setPickedId(item.id); }}
                    >
                      <View style={[rw.radio, active && rw.radioActive]}>
                        {active && <View style={rw.radioDot} />}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={rw.catalogName} numberOfLines={2} ellipsizeMode="tail">{item.name}</Text>
                        <Text style={rw.catalogMeta} numberOfLines={2}>
                          {catalogMeta(item)}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Баллы */}
        {rewardType === 'points' && (
          <View style={{ marginTop: 14 }}>
            <Text style={rw.label}>СКОЛЬКО БАЛЛОВ</Text>
            <NumField
              value={points}
              onChangeText={setPoints}
              placeholder="например, 300"
              suffix="баллов"
            />
            {points !== '' && (!Number.isFinite(pointsNum) || pointsNum <= 0) && (
              <Text style={rw.err}>Введите число больше нуля</Text>
            )}
          </View>
        )}

        {/* Срок жизни */}
        <View style={{ marginTop: 14 }}>
          <Text style={rw.label}>СРОК ЖИЗНИ НАГРАДЫ</Text>
          <NumField
            value={lifetime}
            onChangeText={setLifetime}
            placeholder={String(picked?.default_lifetime_days ?? FALLBACK_LIFETIME)}
            suffix="дней"
          />
          <Text style={rw.hint}>
            Пусто — возьмём срок из позиции каталога ({picked?.default_lifetime_days ?? FALLBACK_LIFETIME} дн.).
          </Text>
        </View>

        {/* Контрольная группа */}
        <View style={{ marginTop: 14 }}>
          <View style={rw.labelRow}>
            <ShieldCheck size={12} color={C.ink3} strokeWidth={2.2} />
            <Text style={rw.label}>КОНТРОЛЬНАЯ ГРУППА</Text>
            <Text style={rw.labelRight}>{clampHoldout(holdoutNum)}%</Text>
          </View>
          <NumField
            value={holdout}
            onChangeText={setHoldout}
            onBlurNormalize={() => setHoldout(String(clampHoldout(holdoutNum)))}
            placeholder={String(DEFAULT_HOLDOUT)}
            suffix="%"
            maxLength={2}
          />
          <Text style={rw.hint}>
            Часть гостей намеренно остаётся без награды — по ним считаем, насколько
            награда реально подняла возвраты. 0–{MAX_HOLDOUT}%, обычно {DEFAULT_HOLDOUT}%.
          </Text>
        </View>

        {/* Название */}
        <View style={{ marginTop: 14 }}>
          <Text style={rw.label}>НАЗВАНИЕ КАМПАНИИ</Text>
          <View style={s.modalInputWrap}>
            <TextInput
              style={rw.textField}
              value={name}
              onChangeText={(v) => { setNameTouched(true); setName(v); }}
              placeholder={autoName}
              placeholderTextColor={C.ink4}
              maxLength={120}
            />
          </View>
        </View>

        {/* Предпросмотр */}
        <View style={rw.previewCard}>
          <Text style={rw.previewTitle}>ПРЕДПРОСМОТР</Text>
          <SummaryRow label="Аудитория" value={`${fmtNum(audience)} гостей`} />
          <SummaryRow label="≈ Контроль" value={`${fmtNum(controlCount)} гостей`} />
          <SummaryRow label="≈ Получат награду" value={`${fmtNum(receiveCount)} гостей`} accent />
          <SummaryRow
            label="Потенциальная себестоимость"
            value={potentialCost != null ? fmtRub(potentialCost) : '—'}
            last
          />
        </View>

        {audience <= 0 && (
          <Text style={rw.err}>В этом сегменте нет гостей — награду назначать некому.</Text>
        )}
      </ScrollView>

      <View style={[s.modalFooter, r.isTiny && s.actionsStack]}>
        <Pressable style={[s.btn, s.btnSecondary]} {...ripple()} onPress={onClose} disabled={submitting}>
          <Text style={s.btnSecondaryText}>Отмена</Text>
        </Pressable>
        <Pressable
          style={[s.btn, s.btnPrimary, submitDisabled && { opacity: 0.5 }]}
          {...ripple('rgba(255,255,255,0.22)')}
          onPress={onSubmit}
          disabled={submitDisabled}
        >
          {submitting
            ? <ActivityIndicator size="small" color={C.surface} />
            : <Gift size={14} color={C.surface} strokeWidth={2} />
          }
          <Text style={s.btnPrimaryText}>Назначить</Text>
        </Pressable>
      </View>
    </SheetModal>
  );
};

// ─────────────────────────────────────────────
// Мелкие блоки
// ─────────────────────────────────────────────
export const SummaryRow: React.FC<{
  label: string; value: string; accent?: boolean; last?: boolean;
}> = ({ label, value, accent, last }) => (
  <View style={[rw.sumRow, last && rw.sumRowLast]}>
    <Text style={rw.sumLabel} numberOfLines={2}>{label}</Text>
    <Text style={[rw.sumValue, accent && { color: C.purpleDeep }]} numberOfLines={1}>{value}</Text>
  </View>
);

const TypeBtn: React.FC<{
  active: boolean; icon: React.ReactNode; label: string; onPress: () => void;
}> = ({ active, icon, label, onPress }) => (
  <Pressable style={[rw.typeBtn, active && rw.typeBtnActive]} {...ripple()} onPress={onPress}>
    {icon}
    <Text style={[rw.typeBtnText, active && rw.typeBtnTextActive]}>{label}</Text>
  </Pressable>
);

const NumField: React.FC<{
  value: string;
  onChangeText: (v: string) => void;
  onBlurNormalize?: () => void;
  placeholder: string;
  suffix?: string;
  maxLength?: number;
}> = ({ value, onChangeText, onBlurNormalize, placeholder, suffix, maxLength = 6 }) => (
  <View style={rw.numBox}>
    <TextInput
      style={rw.numField}
      value={value}
      onChangeText={(v) => onChangeText(v.replace(/[^0-9]/g, '').slice(0, maxLength))}
      onBlur={onBlurNormalize}
      placeholder={placeholder}
      placeholderTextColor={C.ink4}
      keyboardType="number-pad"
      maxLength={maxLength}
    />
    {!!suffix && <Text style={rw.numSuffix}>{suffix}</Text>}
  </View>
);

// Строка описания позиции: «тир · себестоимость ₽ · срок N дн · остаток».
function catalogMeta(item: RewardCatalogItem): string {
  const parts: string[] = [];
  if (item.tier) parts.push(item.tier);
  if (item.cost_price != null) parts.push(fmtRub(item.cost_price));
  parts.push(`срок ${item.default_lifetime_days ?? FALLBACK_LIFETIME} дн`);
  if (item.min_order_amount != null && item.min_order_amount > 0) parts.push(`от ${fmtRub(item.min_order_amount)}`);
  if (item.remaining_issues != null) parts.push(`остаток ${fmtNum(item.remaining_issues)}`);
  if (item.branch) parts.push(item.branch);
  return parts.join(' · ');
}

function clampHoldout(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_HOLDOUT;
  return Math.max(0, Math.min(MAX_HOLDOUT, Math.round(n)));
}

function todayLabel(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

// ─────────────────────────────────────────────
// Локальные стили модалки награды
// ─────────────────────────────────────────────
const rw = StyleSheet.create({
  label: {
    fontFamily: F.bold, fontSize: 10, letterSpacing: 1.1, color: C.ink3,
    marginBottom: 8,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  labelRight: {
    fontFamily: F.bold, fontSize: 11, color: C.purpleDeep, marginLeft: 'auto', marginBottom: 8,
  },
  hint: {
    fontFamily: F.medium, fontSize: 11, color: C.ink4, lineHeight: 15, marginTop: 6,
  },
  err: {
    fontFamily: F.semibold, fontSize: 12, color: C.warn, marginTop: 6,
  },

  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 11, borderRadius: 12, overflow: 'hidden',
    backgroundColor: C.paper, borderWidth: 1, borderColor: C.line,
  },
  typeBtnActive: { backgroundColor: C.purple, borderColor: C.purple },
  typeBtnText: { fontFamily: F.bold, fontSize: 13, color: C.ink2 },
  typeBtnTextActive: { color: C.surface },

  loadingBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 16, justifyContent: 'center',
  },
  loadingText: { fontFamily: F.semibold, fontSize: 12, color: C.ink3 },

  catalogList: {
    backgroundColor: C.surface, borderRadius: 12,
    borderWidth: 1, borderColor: C.line, overflow: 'hidden',
  },
  catalogRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: C.lineSoft,
  },
  catalogRowActive: { backgroundColor: C.purpleSoft },
  radio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 1.5, borderColor: C.line,
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: C.purple },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.purple },
  catalogName: { fontFamily: F.bold, fontSize: 13, color: C.ink, letterSpacing: -0.2 },
  catalogMeta: { fontFamily: F.medium, fontSize: 11, color: C.ink3, marginTop: 2, lineHeight: 15 },

  numBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.paper, borderWidth: 1, borderColor: C.line,
    borderRadius: 12, paddingHorizontal: 12,
  },
  numField: {
    flex: 1, minWidth: 0,
    fontFamily: F.bold, fontSize: 16, color: C.ink,
    paddingVertical: 11, paddingHorizontal: 0,
  },
  numSuffix: { fontFamily: F.bold, fontSize: 13, color: C.ink3 },

  textField: {
    paddingHorizontal: 12, paddingVertical: 11,
    fontFamily: F.medium, fontSize: 14, color: C.ink,
  },

  previewCard: {
    marginTop: 16,
    backgroundColor: C.paper, borderRadius: 12,
    borderWidth: 1, borderColor: C.line,
    paddingHorizontal: 12, paddingTop: 10, paddingBottom: 2,
  },
  previewTitle: {
    fontFamily: F.extrabold, fontSize: 10, letterSpacing: 1.8,
    color: C.ink3, marginBottom: 4,
  },

  sumRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: C.lineSoft,
  },
  sumRowLast: { borderBottomWidth: 0 },
  sumLabel: { flex: 1, minWidth: 0, fontFamily: F.medium, fontSize: 12, color: C.ink3 },
  sumValue: { fontFamily: F.extrabold, fontSize: 13, color: C.ink, letterSpacing: -0.2 },

  okBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: C.goodSoft, borderWidth: 1, borderColor: '#A7F3C2',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12,
  },
  okIcon: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: C.good,
    alignItems: 'center', justifyContent: 'center',
  },
  okText: { flex: 1, minWidth: 0, fontFamily: F.semibold, fontSize: 13, color: C.ink2, lineHeight: 18 },

  summaryCard: {
    marginTop: 14,
    backgroundColor: C.paper, borderRadius: 12,
    borderWidth: 1, borderColor: C.line,
    paddingHorizontal: 12, paddingVertical: 2,
  },

  linksBox: {
    marginTop: 14,
    backgroundColor: C.surface, borderRadius: 12,
    borderWidth: 1, borderColor: C.line,
    paddingHorizontal: 12, paddingVertical: 10, gap: 4,
  },
  linksTitle: {
    fontFamily: F.extrabold, fontSize: 10, letterSpacing: 1.8, color: C.ink3, marginBottom: 2,
  },
  linkRow: { fontFamily: F.medium, fontSize: 11, color: C.ink3, lineHeight: 15 },
});
