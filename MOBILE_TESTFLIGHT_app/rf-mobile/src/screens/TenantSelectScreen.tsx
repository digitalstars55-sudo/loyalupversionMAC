import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Store, ArrowRight, LogOut, Check } from 'lucide-react-native';

import { C, F } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple } from '../platform';
import type { TenantCompany } from '../types';

// ════════════════════════════════════════════════════════════════════
// TENANT SELECT — выбор сети для пользователей с доступом к нескольким
// сетям (как менеджер/владелец). Показывается после входа, если сетей >1,
// и при ручном переключении из «Ещё». У кого одна сеть — экран не виден.
// ════════════════════════════════════════════════════════════════════
export const TenantSelectScreen: React.FC<{
  companies: TenantCompany[];
  onSelect: (c: TenantCompany) => void;
  onLogout?: () => void;
  currentDomain?: string | null;
}> = ({ companies, onSelect, onLogout, currentDomain }) => {
  const r = useResponsive();
  const pad = Math.max(r.pad, 22);

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: pad, paddingTop: 24, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.title}>Выберите сеть</Text>
        <Text style={s.subtitle}>
          У вас есть доступ к нескольким сетям. Выберите, с какой работать —
          сменить можно в любой момент в разделе «Ещё».
        </Text>

        <View style={{ height: 16 }} />

        {companies.map((c) => {
          const active = currentDomain && c.domain === currentDomain;
          return (
            <Pressable
              key={c.id}
              style={({ pressed }) => [s.card, active && s.cardActive, pressed && { opacity: 0.9 }]}
              {...ripple()}
              onPress={() => { haptic('medium'); onSelect(c); }}
              accessibilityLabel={`Выбрать сеть ${c.name}`}
            >
              <View style={s.icon}>
                <Store size={18} color={C.purpleDeep} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.cardTitle} numberOfLines={1}>{c.name}</Text>
                <Text style={s.cardSub} numberOfLines={1}>{c.domain}</Text>
              </View>
              {active
                ? <Check size={18} color={C.good} strokeWidth={2.6} />
                : <ArrowRight size={16} color={C.ink3} strokeWidth={2.2} />}
            </Pressable>
          );
        })}

        <View style={{ flex: 1, minHeight: 24 }} />

        {onLogout && (
          <Pressable
            style={({ pressed }) => [s.logoutRow, pressed && { opacity: 0.8 }]}
            {...ripple()}
            onPress={() => { haptic('light'); onLogout(); }}
          >
            <LogOut size={16} color={C.warn} strokeWidth={2.2} />
            <Text style={s.logoutText}>Выйти из аккаунта</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  title: {
    fontFamily: F.extrabold,
    fontSize: 26,
    color: C.ink,
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 8,
    fontFamily: F.medium,
    fontSize: 13,
    color: C.ink3,
    lineHeight: 18,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.line,
  },
  cardActive: {
    borderColor: C.good,
    borderWidth: 2,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: F.bold,
    fontSize: 15,
    color: C.ink,
  },
  cardSub: {
    fontFamily: F.medium,
    fontSize: 12,
    color: C.ink3,
    marginTop: 1,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  logoutText: {
    fontFamily: F.semibold,
    fontSize: 14,
    color: C.warn,
  },
});
