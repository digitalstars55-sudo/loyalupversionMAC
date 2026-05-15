import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogIn, Sparkles, ArrowRight } from 'lucide-react-native';

import { C, F } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple } from '../platform';

// ════════════════════════════════════════════════════════════════════
// CHOICE SCREEN — самый первый экран приложения.
// Два пути: «Войти в кабинет» (для существующих) или «Стать клиентом»
// (онбординг для новых).
// ════════════════════════════════════════════════════════════════════
export const ChoiceScreen: React.FC<{
  onLogin: () => void;
  onStartOnboarding: () => void;
}> = ({ onLogin, onStartOnboarding }) => {
  const r = useResponsive();
  const pad = Math.max(r.pad, 22);

  return (
    <SafeAreaView style={[s.root]} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: pad, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.logoMark}>
            <Text style={s.logoMarkText}>Л</Text>
          </View>
          <Text style={s.brand}>ЛоялUP</Text>
          <Text style={s.tagline}>
            Программа лояльности на автопилоте — для кафе, баров, кофеен
          </Text>
        </View>

        <View style={{ flex: 1 }} />

        {/* Primary CTA — стать клиентом */}
        <Pressable
          style={({ pressed }) => [s.primaryCard, pressed && { opacity: 0.92 }]}
          {...ripple('rgba(255,255,255,0.2)')}
          onPress={() => { haptic('medium'); onStartOnboarding(); }}
          accessibilityLabel="Стать клиентом ЛоялUP"
        >
          <View style={s.primaryIcon}>
            <Sparkles size={20} color={C.surface} strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.primaryTitle}>Я хочу стать клиентом</Text>
            <Text style={s.primarySub}>5 минут с AI-менеджером — и всё готово к работе</Text>
          </View>
          <ArrowRight size={18} color={C.surface} strokeWidth={2.4} />
        </Pressable>

        {/* Secondary CTA — войти в кабинет */}
        <Pressable
          style={({ pressed }) => [s.secondaryCard, pressed && { opacity: 0.92 }]}
          {...ripple()}
          onPress={() => { haptic('light'); onLogin(); }}
          accessibilityLabel="Войти в личный кабинет"
        >
          <View style={s.secondaryIcon}>
            <LogIn size={18} color={C.purpleDeep} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.secondaryTitle}>У меня уже есть аккаунт</Text>
            <Text style={s.secondarySub}>Вход по логину и паролю</Text>
          </View>
          <ArrowRight size={16} color={C.ink2} strokeWidth={2.2} />
        </Pressable>

        <Text style={s.legal}>
          Нажимая «Я хочу стать клиентом», вы соглашаетесь с{'\n'}
          политикой конфиденциальности и условиями использования.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: C.purple,
    shadowOpacity: 0.32,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  logoMarkText: {
    fontFamily: F.extrabold,
    fontSize: 38,
    color: C.surface,
    lineHeight: 44,
  },
  brand: {
    fontFamily: F.extrabold,
    fontSize: 32,
    color: C.ink,
    letterSpacing: -0.5,
  },
  tagline: {
    marginTop: 10,
    fontFamily: F.medium,
    fontSize: 14,
    color: C.ink3,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 320,
  },

  primaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.purple,
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    shadowColor: C.purple,
    shadowOpacity: 0.36,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  primaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryTitle: {
    fontFamily: F.extrabold,
    fontSize: 16,
    color: C.surface,
    letterSpacing: -0.2,
  },
  primarySub: {
    fontFamily: F.medium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },

  secondaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: C.line,
  },
  secondaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: C.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryTitle: {
    fontFamily: F.bold,
    fontSize: 14,
    color: C.ink,
  },
  secondarySub: {
    fontFamily: F.medium,
    fontSize: 12,
    color: C.ink3,
    marginTop: 1,
  },

  legal: {
    marginTop: 16,
    fontFamily: F.medium,
    fontSize: 11,
    color: C.ink4,
    textAlign: 'center',
    lineHeight: 15,
  },
});
