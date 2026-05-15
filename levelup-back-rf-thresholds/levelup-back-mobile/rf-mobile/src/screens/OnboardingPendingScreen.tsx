import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle2, Mail, Clock, ArrowLeft } from 'lucide-react-native';

import { C, F } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple } from '../platform';

// ════════════════════════════════════════════════════════════════════
// ONBOARDING PENDING — экран после отправки заявки.
// «Спасибо, ждите письма с логином и паролем».
// ════════════════════════════════════════════════════════════════════
export const OnboardingPendingScreen: React.FC<{
  email: string;
  cafeName: string;
  onBackToStart: () => void;
}> = ({ email, cafeName, onBackToStart }) => {
  const r = useResponsive();
  const pad = Math.max(r.pad, 22);

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: pad, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ height: 40 }} />

        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroIcon}>
            <CheckCircle2 size={48} color={C.surface} strokeWidth={2.2} />
          </View>
          <Text style={s.heroTitle}>Заявка отправлена!</Text>
          <Text style={s.heroSub}>
            «{cafeName}» — добро пожаловать в ЛоялUP
          </Text>
        </View>

        {/* Steps */}
        <View style={s.steps}>
          <Step
            done
            icon={<CheckCircle2 size={16} color={C.good} strokeWidth={2.4} />}
            title="Заявка получена"
            sub="AI-менеджер записал данные"
          />
          <Step
            icon={<Clock size={16} color={C.purpleDeep} strokeWidth={2.4} />}
            title="Подтверждение от команды"
            sub="Обычно 1–2 рабочих часа в рабочее время"
            tone="purple"
          />
          <Step
            icon={<Mail size={16} color={C.ink3} strokeWidth={2.4} />}
            title={`Письмо на ${email}`}
            sub="Логин, пароль и ссылка на ваш кабинет"
            tone="muted"
          />
        </View>

        {/* Что дальше */}
        <View style={s.infoCard}>
          <Text style={s.infoTitle}>Что дальше?</Text>
          <View style={{ gap: 8, marginTop: 8 }}>
            <Text style={s.infoLine}>• Мы проверим VK-токен и данные</Text>
            <Text style={s.infoLine}>• Создадим личный кабинет на поддомене *.levone.ru</Text>
            <Text style={s.infoLine}>• Пришлём логин и пароль на email</Text>
            <Text style={s.infoLine}>• После входа — короткий тур по приложению</Text>
          </View>
        </View>

        <View style={{ flex: 1 }} />

        <Pressable
          style={s.backBtn}
          {...ripple()}
          onPress={() => { haptic('light'); onBackToStart(); }}
        >
          <ArrowLeft size={16} color={C.ink2} strokeWidth={2.2} />
          <Text style={s.backBtnText}>Вернуться на стартовый экран</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────
const Step: React.FC<{
  icon: React.ReactNode;
  title: string;
  sub: string;
  tone?: 'default' | 'purple' | 'muted';
  done?: boolean;
}> = ({ icon, title, sub, tone, done }) => {
  const bgColor = tone === 'purple' ? C.purpleSoft : tone === 'muted' ? C.lineSoft : C.goodSoft;
  return (
    <View style={[s.stepRow, done && { opacity: 1 }]}>
      <View style={[s.stepIcon, { backgroundColor: bgColor }]}>{icon}</View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.stepTitle}>{title}</Text>
        <Text style={s.stepSub}>{sub}</Text>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  hero: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 28,
  },
  heroIcon: {
    width: 92, height: 92, borderRadius: 28,
    backgroundColor: C.good,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 18,
    shadowColor: C.good,
    shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  heroTitle: {
    fontFamily: F.extrabold,
    fontSize: 26,
    color: C.ink,
    letterSpacing: -0.4,
  },
  heroSub: {
    marginTop: 6,
    fontFamily: F.semibold,
    fontSize: 13,
    color: C.ink3,
    textAlign: 'center',
  },

  steps: { gap: 10, marginBottom: 18 },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: C.line,
  },
  stepIcon: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  stepTitle: {
    fontFamily: F.bold, fontSize: 13, color: C.ink,
  },
  stepSub: {
    fontFamily: F.medium, fontSize: 11, color: C.ink3, marginTop: 1,
  },

  infoCard: {
    backgroundColor: C.purpleSoft,
    borderRadius: 16,
    padding: 14,
    marginTop: 6,
  },
  infoTitle: {
    fontFamily: F.extrabold,
    fontSize: 13,
    color: C.purpleDeep,
    letterSpacing: 0.3,
  },
  infoLine: {
    fontFamily: F.medium,
    fontSize: 12,
    color: C.ink2,
    lineHeight: 17,
  },

  backBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    marginTop: 16,
  },
  backBtnText: {
    fontFamily: F.bold, fontSize: 13, color: C.ink2,
  },
});
