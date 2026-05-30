import React, { useState } from 'react';
import {
  View, Text, Pressable, ScrollView, ActivityIndicator, Alert, Linking, Platform,
} from 'react-native';
import { SheetModal } from './SheetModal';
import { X, CreditCard, Check } from 'lucide-react-native';

import { C } from '../theme';
import { ripple, haptic } from '../platform';
import { fmtNum } from '../helpers';
import { startPayment } from '../api';
import type { SubscriptionStatus } from '../types';
import type { S } from '../styles';

// ════════════════════════════════════════════════════════════════════
// PAYMENT MODAL — выбор банка + редирект на онлайн-оплату
// ════════════════════════════════════════════════════════════════════
const BANKS: { key: string; name: string; bg: string }[] = [
  { key: 'sberbank',   name: 'Сбербанк',    bg: '#21A038' },
  { key: 'tinkoff',    name: 'Т-Банк',      bg: '#FFDD2D' },
  { key: 'alfabank',   name: 'Альфа-Банк',  bg: '#EF3124' },
  { key: 'vtb',        name: 'ВТБ',         bg: '#0A2973' },
  { key: 'sbp',        name: 'СБП',         bg: '#5B57D1' },
  { key: 'card',       name: 'Картой',      bg: '#27272A' },
];

export const PaymentModal: React.FC<{
  visible: boolean;
  subscription: SubscriptionStatus;
  s: S;
  onClose: () => void;
  onPaid?: () => void;
}> = ({ visible, subscription, s, onClose, onPaid }) => {
  const [paying, setPaying] = useState<string | null>(null);

  const onPay = (bankKey: string, bankName: string) => async () => {
    haptic('medium');
    setPaying(bankKey);
    try {
      const { payment_url, status, message } = await startPayment({ plan: subscription.plan, bank: bankKey });
      // Онлайн-эквайринг пока не подключён: бэк отдаёт status='manager_request'
      // и пустой payment_url — заявка ушла менеджеру через support-чат.
      if (status === 'manager_request' || !payment_url) {
        haptic('success');
        Alert.alert(
          'Заявка отправлена',
          message || `Заявка на оплату ${fmtNum(subscription.price_rub)} ₽ принята. Менеджер LoyalUP свяжется с вами в чате для выставления счёта.`,
          [{ text: 'OK', onPress: () => { onClose(); } }],
        );
        return;
      }
      // На реальном бэке вернёт URL платёжной формы. На моке — фейковый URL.
      if (Platform.OS === 'web') {
        window.open(payment_url, '_blank');
      } else {
        const ok = await Linking.canOpenURL(payment_url).catch(() => false);
        if (ok) await Linking.openURL(payment_url);
      }
      haptic('success');
      Alert.alert(
        'Открыли оплату',
        `Платёж на ${fmtNum(subscription.price_rub)} ₽ через ${bankName} запущен. После завершения оплаты статус обновится автоматически.`,
        [{ text: 'OK', onPress: () => { onPaid?.(); onClose(); } }],
      );
    } catch (e: any) {
      haptic('error');
      Alert.alert('Ошибка', e?.message ?? 'Не удалось открыть оплату');
    } finally {
      setPaying(null);
    }
  };

  return (
    <SheetModal visible={visible} onClose={onClose}>
          <View style={s.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.modalSuper}>Тариф «{subscription.plan_label}»</Text>
              <Text style={s.modalTitle}>Оплата {fmtNum(subscription.price_rub)} ₽</Text>
            </View>
            <Pressable style={s.modalClose} {...ripple()} onPress={onClose}>
              <X size={16} color={C.ink} strokeWidth={2} />
            </Pressable>
          </View>

          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20 }}>
            <View style={[s.modalHint, { marginBottom: 14 }]}>
              <Text style={s.modalHintText}>
                Выберите удобный способ оплаты — мы передадим заявку менеджеру LoyalUP, он выставит счёт и подтвердит продление в чате.
              </Text>
            </View>

            {BANKS.map(b => (
              <Pressable
                key={b.key}
                style={s.bankRow}
                {...ripple()}
                onPress={onPay(b.key, b.name)}
                disabled={paying !== null}
              >
                <View style={[s.bankLogo, { backgroundColor: b.bg }]}>
                  {b.key === 'card'
                    ? <CreditCard size={18} color={C.surface} strokeWidth={2.4} />
                    : <Text style={[s.bankLogoText, b.key === 'tinkoff' && { color: C.ink }]}>
                        {b.name.charAt(0)}
                      </Text>
                  }
                </View>
                <Text style={s.bankName}>{b.name}</Text>
                {paying === b.key
                  ? <ActivityIndicator size="small" color={C.purple} />
                  : <Check size={18} color={C.ink4} strokeWidth={2.2} />
                }
              </Pressable>
            ))}
          </ScrollView>
    </SheetModal>
  );
};
