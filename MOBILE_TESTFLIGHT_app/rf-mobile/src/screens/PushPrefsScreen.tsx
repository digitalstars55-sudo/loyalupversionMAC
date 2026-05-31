import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Bell, BellOff } from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple } from '../platform';
import { makeStyles } from '../styles';
import {
  fetchPushPrefs, updatePushPrefs,
  type PushPrefs, type PushTenant, type PushTypeInfo,
} from '../api';

// ════════════════════════════════════════════════════════════════════
// PUSH PREFERENCES — выбор тенантов и типов уведомлений
//
// Логика дефолтов (бэк, см. is_push_allowed):
//   - Если ключа нет в prefs → True (включено)
//   - "*" в tenants — fallback для тенантов не указанных явно
// Здесь нормализуем undefined → true для UI, чтобы тоглеры показывали
// реальное состояние "по умолчанию всё включено".
// ════════════════════════════════════════════════════════════════════
export const PushPrefsScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<PushPrefs | null>(null);

  useEffect(() => {
    fetchPushPrefs()
      .then(setPrefs)
      .catch(e => Alert.alert('Ошибка', e?.message ?? 'Не удалось загрузить настройки'))
      .finally(() => setLoading(false));
  }, []);

  // Хелпер: значение тогла с учётом дефолта (отсутствует → True)
  const tenantOn = useCallback((schema: string): boolean => {
    if (!prefs) return true;
    if (schema in prefs.tenants) return !!prefs.tenants[schema];
    if ('*' in prefs.tenants) return !!prefs.tenants['*'];
    return true;
  }, [prefs]);

  const typeOn = useCallback((code: string): boolean => {
    if (!prefs) return true;
    return code in prefs.types ? !!prefs.types[code] : true;
  }, [prefs]);

  // Master-тогл «все тенанты»: применяет * + явно проставляет всем
  const allTenantsOn = useMemo((): boolean => {
    if (!prefs || prefs.available_tenants.length === 0) return true;
    return prefs.available_tenants.every(t => tenantOn(t.schema_name));
  }, [prefs, tenantOn]);

  const saveTenants = useCallback(async (next: Record<string, boolean>) => {
    if (!prefs) return;
    haptic('light');
    setSaving(true);
    try {
      const updated = await updatePushPrefs({ tenants: next });
      setPrefs(updated);
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message ?? 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  }, [prefs]);

  const saveTypes = useCallback(async (next: Record<string, boolean>) => {
    if (!prefs) return;
    haptic('light');
    setSaving(true);
    try {
      const updated = await updatePushPrefs({ types: next });
      setPrefs(updated);
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message ?? 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  }, [prefs]);

  const onToggleTenant = (schema: string, value: boolean) => {
    if (!prefs) return;
    const next = { ...prefs.tenants, [schema]: value };
    saveTenants(next);
  };

  const onToggleAllTenants = (value: boolean) => {
    if (!prefs) return;
    // Ставим '*' + явно прокидываем во все известные тенанты, чтобы UI
    // и поведение совпадали (новые тенанты добавятся через '*').
    const next: Record<string, boolean> = { '*': value };
    for (const t of prefs.available_tenants) next[t.schema_name] = value;
    saveTenants(next);
  };

  const onToggleType = (code: string, value: boolean) => {
    if (!prefs) return;
    const next = { ...prefs.types, [code]: value };
    saveTypes(next);
  };

  if (loading) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <StatusBar style="dark" />
        <Header onBack={onBack} s={s} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={C.purple} />
        </View>
      </SafeAreaView>
    );
  }

  if (!prefs) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <StatusBar style="dark" />
        <Header onBack={onBack} s={s} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: C.ink2, textAlign: 'center' }}>Не удалось загрузить настройки уведомлений.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="dark" />
      <Header onBack={onBack} s={s} />

      <ScrollView contentContainerStyle={{ paddingBottom: 60, paddingHorizontal: r.pad }} showsVerticalScrollIndicator={false}>
        {/* ── Источники (тенанты) ─────────────────────────────────── */}
        <Section title="Источники уведомлений" subtitle="С каких сетей получать пуши">
          {prefs.available_tenants.length > 1 && (
            <Row
              icon={<Bell size={18} color={C.purpleDeep} strokeWidth={2} />}
              title="Все источники"
              sub="Главный выключатель для всех тенантов"
              value={allTenantsOn}
              onChange={onToggleAllTenants}
              s={s}
              disabled={saving}
              accent
            />
          )}
          {prefs.available_tenants.map((t, i) => (
            <Row
              key={t.schema_name}
              icon={
                tenantOn(t.schema_name)
                  ? <Bell size={18} color={C.ink2} strokeWidth={2} />
                  : <BellOff size={18} color={C.ink4} strokeWidth={2} />
              }
              title={t.name}
              sub={t.schema_name}
              value={tenantOn(t.schema_name)}
              onChange={(v) => onToggleTenant(t.schema_name, v)}
              s={s}
              disabled={saving}
              last={i === prefs.available_tenants.length - 1}
            />
          ))}
        </Section>

        {/* ── Типы пушей ──────────────────────────────────────────── */}
        <Section title="Типы уведомлений" subtitle="Какие события присылать">
          {prefs.available_types.map((t, i) => (
            <Row
              key={t.code}
              icon={
                typeOn(t.code)
                  ? <Bell size={18} color={C.ink2} strokeWidth={2} />
                  : <BellOff size={18} color={C.ink4} strokeWidth={2} />
              }
              title={t.label}
              sub={t.description}
              value={typeOn(t.code)}
              onChange={(v) => onToggleType(t.code, v)}
              s={s}
              disabled={saving}
              last={i === prefs.available_types.length - 1}
            />
          ))}
        </Section>

        <View style={{ paddingHorizontal: 4, paddingVertical: 16 }}>
          <Text style={{ fontSize: 12, color: C.ink4, lineHeight: 18 }}>
            Изменения применяются мгновенно. Push приходит только если оба тогла включены — и источник, и тип.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Helper components ───────────────────────────────────────────────

const Header: React.FC<{ onBack: () => void; s: any }> = ({ onBack, s }) => (
  <View style={s.screenHeader}>
    <Pressable
      style={s.backBtn}
      {...ripple()}
      onPress={() => { haptic('light'); onBack(); }}
      hitSlop={10}
    >
      <ChevronLeft size={20} color={C.ink} strokeWidth={2.4} />
    </Pressable>
    <View style={s.screenTitleBlock}>
      <Text style={s.screenTitleSuper}>Настройки</Text>
      <Text style={s.screenTitleMain}>Уведомления</Text>
    </View>
  </View>
);

const Section: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <View style={{ marginTop: 20 }}>
    <Text style={{ fontFamily: 'Manrope_800ExtraBold', fontSize: 12, color: C.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
      {title}
    </Text>
    {subtitle && (
      <Text style={{ fontSize: 12, color: C.ink4, marginBottom: 10 }}>{subtitle}</Text>
    )}
    <View style={{ backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.line, overflow: 'hidden' }}>
      {children}
    </View>
  </View>
);

const Row: React.FC<{
  icon: React.ReactNode;
  title: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  s: any;
  disabled?: boolean;
  last?: boolean;
  accent?: boolean;
}> = ({ icon, title, sub, value, onChange, disabled, last, accent }) => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: last ? 0 : 1,
      borderBottomColor: C.line,
      backgroundColor: accent ? C.purpleSoft : 'transparent',
      gap: 12,
    }}
  >
    <View
      style={{
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: accent ? C.surface : C.bgSoft,
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      {icon}
    </View>
    <View style={{ flex: 1 }}>
      <Text style={{ fontFamily: 'Manrope_800ExtraBold', fontSize: 14, color: C.ink, letterSpacing: -0.2 }} numberOfLines={1}>
        {title}
      </Text>
      {sub && (
        <Text style={{ fontSize: 11, color: C.ink3, marginTop: 2 }} numberOfLines={2}>
          {sub}
        </Text>
      )}
    </View>
    <Switch
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      trackColor={{ false: C.line, true: C.purple }}
      thumbColor="#fff"
    />
  </View>
);
