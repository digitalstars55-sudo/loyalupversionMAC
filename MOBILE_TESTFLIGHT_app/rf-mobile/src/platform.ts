import { Platform, Alert, Linking } from 'react-native';

// ════════════════════════════════════════════════════════════════════
// PLATFORM HELPERS — haptics + Android ripple
// ════════════════════════════════════════════════════════════════════

// expo-haptics — необязательная; обёрнут в haptic() с try/catch.
let Haptics: any = null;
try { Haptics = require('expo-haptics'); } catch {}

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export const haptic = (style: HapticStyle = 'light') => {
  if (Platform.OS === 'web' || !Haptics) return;
  try {
    if (style === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (style === 'warning') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    else if (style === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    else {
      const m: Record<string, any> = {
        light: Haptics.ImpactFeedbackStyle.Light,
        medium: Haptics.ImpactFeedbackStyle.Medium,
        heavy: Haptics.ImpactFeedbackStyle.Heavy,
      };
      Haptics.impactAsync(m[style]);
    }
  } catch {}
};

export const ripple = (color = 'rgba(168, 85, 247, 0.12)', borderless = false) =>
  Platform.OS === 'android'
    ? { android_ripple: { color, borderless } }
    : {};

// ── Форматирование/звонок ───────────────────────────
// Из E.164 (+79912345678) → красивая запись (+7 991 234-56-78)
export const formatPhone = (phone: string): string =>
  phone.replace(/^(\+\d)(\d{3})(\d{3})(\d{2})(\d{2})$/, '$1 $2 $3-$4-$5');

// Живая маска ввода РФ-номера: что бы ни ввели → «+7 (999) 123-45-67».
export const maskRuPhoneInput = (input: string): string => {
  let d = input.replace(/\D/g, '');
  if (d.startsWith('8')) d = '7' + d.slice(1);
  if (d && !d.startsWith('7')) d = '7' + d;
  d = d.slice(0, 11);
  const a = d.slice(1); // до 10 цифр после кода
  if (!a) return d ? '+7' : '';
  let out = '+7 (' + a.slice(0, 3);
  if (a.length >= 3) out += ')';
  if (a.length > 3) out += ' ' + a.slice(3, 6);
  if (a.length > 6) out += '-' + a.slice(6, 8);
  if (a.length > 8) out += '-' + a.slice(8, 10);
  return out;
};

// Нормализация маски → E.164 (+7XXXXXXXXXX) или '' если неполный.
export const ruPhoneToE164 = (masked: string): string => {
  const d = masked.replace(/\D/g, '');
  return d.length === 11 ? '+' + d : '';
};

// Открывает нативный набор номера. Сначала Alert-подтверждение.
export const callPhone = (params: { phone: string; name?: string; workHours?: string }) => {
  const { phone, name, workHours } = params;
  haptic('medium');
  const pretty = formatPhone(phone);
  const hours = workHours ? `\n\nРабочие часы: ${workHours}` : '';
  const title = name ? `Позвонить ${name}?` : 'Позвонить?';

  Alert.alert(title, `${pretty}${hours}`, [
    { text: 'Отмена', style: 'cancel' },
    {
      text: 'Позвонить',
      style: 'default',
      onPress: async () => {
        const url = `tel:${phone}`;
        try {
          const supported = await Linking.canOpenURL(url);
          if (!supported) {
            Alert.alert(
              'Звонок недоступен',
              `На этом устройстве не получается открыть набор номера. Номер: ${pretty}`,
            );
            return;
          }
          await Linking.openURL(url);
        } catch (e: any) {
          Alert.alert('Ошибка', e?.message ?? 'Не удалось открыть набор');
        }
      },
    },
  ]);
};
