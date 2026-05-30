import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, TextInput, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { X, Plus, Minus, Save } from 'lucide-react-native';

import { C } from '../theme';
import { ripple, haptic } from '../platform';
import { fmtNum } from '../helpers';
import { adjustGuestCoins } from '../api';
import type { GuestCoinTxn } from '../types';
import { SheetModal } from './SheetModal';
import type { S } from '../styles';

// ════════════════════════════════════════════════════════════════════
// COIN ADJUST MODAL — ручная корректировка баланса гостя админом
// ════════════════════════════════════════════════════════════════════
const QUICK_AMOUNTS = [50, 100, 200, 500, 1000];

const PRESET_REASONS_ADD = [
  'Компенсация за неудачный заказ',
  'Подарок за лояльность',
  'Возмещение баллов после ошибки',
  'Бонус от менеджера',
];
const PRESET_REASONS_SUB = [
  'Списание за нарушение условий',
  'Возврат после отмены акции',
  'Корректировка дубля',
];

export const CoinAdjustModal: React.FC<{
  visible: boolean;
  vkId: string;
  guestName: string;
  currentBalance: number;
  onClose: () => void;
  onApplied: (txn: GuestCoinTxn, newBalance: number) => void;
  s: S;
}> = ({ visible, vkId, guestName, currentBalance, onClose, onApplied, s }) => {
  const [direction, setDirection] = useState<'add' | 'sub'>('add');
  const [amountStr, setAmountStr] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setDirection('add');
      setAmountStr('');
      setReason('');
    }
  }, [visible]);

  const amount = parseInt(amountStr.replace(/\D/g, ''), 10) || 0;
  const signed = direction === 'add' ? amount : -amount;
  const newBalance = currentBalance + signed;
  const presets = direction === 'add' ? PRESET_REASONS_ADD : PRESET_REASONS_SUB;

  const valid = amount > 0 && reason.trim().length >= 3 && newBalance >= 0;
  const balanceWillGoNegative = newBalance < 0;

  const onSubmit = async () => {
    if (!valid) {
      if (newBalance < 0) {
        Alert.alert('Недостаточно баллов', `У гостя на балансе ${fmtNum(currentBalance)} ★. Нельзя списать больше.`);
        return;
      }
      Alert.alert('Заполните поля', 'Сумма должна быть больше 0, причина — минимум 3 символа.');
      return;
    }
    haptic('medium');
    Alert.alert(
      direction === 'add' ? 'Начислить?' : 'Списать?',
      `${guestName}: ${signed > 0 ? '+' : ''}${fmtNum(signed)} ★\nПричина: «${reason.trim()}»\n\nНовый баланс: ${fmtNum(newBalance)} ★`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: direction === 'add' ? 'Начислить' : 'Списать',
          style: direction === 'add' ? 'default' : 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              const txn = await adjustGuestCoins({ vk_id: vkId, amount: signed, reason: reason.trim() });
              haptic('success');
              onApplied(txn, newBalance);
              onClose();
            } catch (e: any) {
              haptic('error');
              Alert.alert('Ошибка', e?.message ?? 'Не удалось применить');
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SheetModal visible={visible} onClose={onClose}>
          <View style={s.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.modalSuper}>Изменить баланс</Text>
              <Text style={s.modalTitle} numberOfLines={1}>{guestName}</Text>
            </View>
            <Pressable style={s.modalClose} {...ripple()} onPress={onClose}>
              <X size={16} color={C.ink} strokeWidth={2} />
            </Pressable>
          </View>

          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 }}>
            {/* Текущий баланс */}
            <View style={[s.modalHint, { marginBottom: 14 }]}>
              <Text style={s.modalHintText}>
                Текущий баланс: <Text style={{ fontFamily: 'Manrope_800ExtraBold', color: C.ink }}>{fmtNum(currentBalance)} ★</Text>
              </Text>
            </View>

            {/* Toggle add/sub */}
            <View style={s.adjustToggle}>
              <Pressable
                style={[s.adjustToggleBtn, direction === 'add' && s.adjustToggleBtnActiveAdd]}
                {...ripple('rgba(255,255,255,0.22)')}
                onPress={() => { haptic('light'); setDirection('add'); }}
              >
                <Plus size={15} color={direction === 'add' ? C.surface : C.ink3} strokeWidth={2.4} />
                <Text style={[s.adjustToggleText, direction === 'add' && s.adjustToggleTextActive]}>
                  НАЧИСЛИТЬ
                </Text>
              </Pressable>
              <Pressable
                style={[s.adjustToggleBtn, direction === 'sub' && s.adjustToggleBtnActiveSub]}
                {...ripple('rgba(255,255,255,0.22)')}
                onPress={() => { haptic('light'); setDirection('sub'); }}
              >
                <Minus size={15} color={direction === 'sub' ? C.surface : C.ink3} strokeWidth={2.4} />
                <Text style={[s.adjustToggleText, direction === 'sub' && s.adjustToggleTextActive]}>
                  СПИСАТЬ
                </Text>
              </Pressable>
            </View>

            {/* Amount */}
            <View style={[s.adjustAmountWrap, { borderColor: direction === 'add' ? C.good : C.warn }]}>
              <Text style={[s.adjustAmount, { color: direction === 'add' ? C.good : C.warn }]}>
                {direction === 'add' ? '+' : '−'}
              </Text>
              <TextInput
                style={[s.adjustAmount, { color: direction === 'add' ? C.good : C.warn }]}
                value={amountStr}
                onChangeText={(t) => setAmountStr(t.replace(/[^\d]/g, '').slice(0, 7))}
                placeholder="0"
                placeholderTextColor={C.ink4}
                keyboardType="number-pad"
                autoFocus
              />
              <Text style={s.adjustCurrency}>★</Text>
            </View>

            {/* Quick amounts */}
            <View style={s.adjustQuickRow}>
              {QUICK_AMOUNTS.map(q => (
                <Pressable
                  key={q}
                  style={s.adjustQuickPill}
                  {...ripple()}
                  onPress={() => { haptic('light'); setAmountStr(String(q)); }}
                >
                  <Text style={s.adjustQuickText}>{direction === 'add' ? '+' : '−'}{q}</Text>
                </Pressable>
              ))}
            </View>

            {/* Прогноз баланса */}
            {amount > 0 && (
              <Text style={[s.modalHintText, {
                paddingHorizontal: 8, marginBottom: 10, textAlign: 'center',
                color: balanceWillGoNegative ? C.warn : C.ink2,
                fontFamily: 'Manrope_700Bold', fontSize: 13,
              }]}>
                Новый баланс: <Text style={{ fontFamily: 'Manrope_800ExtraBold', color: balanceWillGoNegative ? C.warn : C.ink }}>{fmtNum(newBalance)} ★</Text>
                {balanceWillGoNegative && '  ·  недостаточно баллов'}
              </Text>
            )}

            {/* Reason */}
            <Text style={[s.formLabel, { paddingHorizontal: 0 }]}>Причина (обязательно)</Text>
            <View style={s.formInputWrap}>
              <TextInput
                style={s.formInputMulti}
                value={reason}
                onChangeText={setReason}
                placeholder="Например: компенсация за долгое ожидание заказа"
                placeholderTextColor={C.ink4}
                multiline
                maxLength={200}
              />
            </View>

            {/* Preset reasons */}
            <Text style={[s.formLabel, { paddingHorizontal: 0, marginTop: 10 }]}>Быстрые шаблоны</Text>
            <View style={s.adjustQuickRow}>
              {presets.map(pr => (
                <Pressable
                  key={pr}
                  style={s.adjustQuickPill}
                  {...ripple()}
                  onPress={() => { haptic('light'); setReason(pr); }}
                >
                  <Text style={s.adjustQuickText} numberOfLines={1}>{pr}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View style={s.modalFooter}>
            <Pressable style={[s.btn, s.btnSecondary]} {...ripple()} onPress={onClose}>
              <Text style={s.btnSecondaryText}>Отмена</Text>
            </Pressable>
            <Pressable
              style={[
                s.btn,
                direction === 'add' ? { backgroundColor: C.good, borderColor: C.good } : { backgroundColor: C.warn, borderColor: C.warn },
                !valid && { opacity: 0.5 },
              ]}
              {...ripple('rgba(255,255,255,0.22)')}
              onPress={onSubmit}
              disabled={!valid || saving}
            >
              {saving
                ? <ActivityIndicator size="small" color={C.surface} />
                : <Save size={14} color={C.surface} strokeWidth={2.2} />
              }
              <Text style={[s.btnPrimaryText]}>
                {saving ? 'Применяем…' : direction === 'add' ? 'Начислить' : 'Списать'}
              </Text>
            </Pressable>
          </View>
    </SheetModal>
  );
};
