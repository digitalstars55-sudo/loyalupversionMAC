import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, RotateCcw, Save, Info } from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple } from '../platform';
import { fetchRFMatrix, updateRFThresholds } from '../api';
import { makeStyles } from '../styles';
import { Skeleton } from '../components/Skeleton';
import type { RFThresholds } from '../types';
import type { S } from '../styles';

// ════════════════════════════════════════════════════════════════════
// RF THRESHOLDS SCREEN — настройка порогов R/F
// ════════════════════════════════════════════════════════════════════
const DEFAULTS: RFThresholds = {
  r_fresh_max: 14,
  r_warm_max: 30,
  r_cooling_max: 60,
  f_rare_max: 3,
  f_moderate_max: 5,
};

export const RFThresholdsScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);

  const [th, setTh] = useState<RFThresholds>(DEFAULTS);
  const [original, setOriginal] = useState<RFThresholds>(DEFAULTS);
  const [scope, setScope] = useState<string>('Все точки');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRFMatrix({ mode: 'restaurant', trend_days: 30 })
      .then(data => {
        setTh(data.thresholds);
        setOriginal(data.thresholds);
        setScope(data.thresholds_scope_label);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const dirty = useMemo(
    () => JSON.stringify(th) !== JSON.stringify(original),
    [th, original]
  );

  const onChange = (key: keyof RFThresholds, delta: number) => () => {
    haptic('light');
    setTh(prev => {
      const next = Math.max(1, prev[key] + delta);
      return { ...prev, [key]: next };
    });
  };

  const onReset = () => {
    haptic('warning');
    Alert.alert(
      'Сбросить пороги?',
      'Значения вернутся к глобальным дефолтам ЛоялUP.',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Сбросить', style: 'destructive', onPress: () => setTh(DEFAULTS) },
      ]
    );
  };

  const onSave = async () => {
    if (!(th.r_fresh_max < th.r_warm_max && th.r_warm_max < th.r_cooling_max)) {
      haptic('error');
      Alert.alert('Ошибка', 'R-границы должны идти строго возрастающе: R3 < R2 < R1 (Свежие < Тёплые < Остывают)');
      return;
    }
    if (!(th.f_rare_max < th.f_moderate_max)) {
      haptic('error');
      Alert.alert('Ошибка', 'F-границы должны идти строго возрастающе: F1 < F2 (Редкие < Средние)');
      return;
    }
    haptic('medium');
    setSaving(true);
    try {
      await updateRFThresholds(th);
      setOriginal(th);
      haptic('success');
      Alert.alert('Сохранено', 'Пороги обновлены. RF будет пересчитан при следующем запуске задачи.');
    } catch (e: any) {
      haptic('error');
      Alert.alert('Ошибка', e?.message ?? 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="dark" />

      <View style={s.backHeader}>
        <Pressable style={s.backBtn} {...ripple()} onPress={onBack}>
          <ChevronLeft size={20} color={C.ink} strokeWidth={2.2} />
        </Pressable>
        <View style={s.screenTitleBlock}>
          <Text style={s.screenTitleSuper}>Сегментация</Text>
          <Text style={s.screenTitleMain}>Пороги RF</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* Scope info */}
        <View style={[s.modalHint, { marginHorizontal: r.pad, marginBottom: 14 }]}>
          <View style={s.modalHintHeader}>
            <Info size={12} color={C.hintInk} strokeWidth={2.4} />
            <Text style={s.modalHintTitle}>Применяется к</Text>
          </View>
          <Text style={s.modalHintText}>
            {scope}. Значения определяют как гости распределяются по уровням свежести (R) и частоты (F).
          </Text>
        </View>

        {loading ? (
          <View style={[s.thrCard, { gap: 12 }]}>
            <Skeleton w="100%" h={50} radius={12} />
            <Skeleton w="100%" h={50} radius={12} />
            <Skeleton w="100%" h={50} radius={12} />
          </View>
        ) : (
          <>
            {/* Recency */}
            <Text style={[s.menuSectionTitle, { marginTop: 4 }]}>Свежесть (R)</Text>
            <View style={s.thrCard}>
              <ThrRow
                title="R3 — Свежие"
                sub="Последний визит ≤"
                value={th.r_fresh_max} unit="дн"
                onMinus={onChange('r_fresh_max', -1)}
                onPlus={onChange('r_fresh_max', 1)}
                s={s}
              />
              <ThrRow
                title="R2 — Тёплые"
                sub="Последний визит ≤"
                value={th.r_warm_max} unit="дн"
                onMinus={onChange('r_warm_max', -1)}
                onPlus={onChange('r_warm_max', 1)}
                s={s}
              />
              <ThrRow
                title="R1 — Остывают"
                sub="Последний визит ≤"
                value={th.r_cooling_max} unit="дн"
                onMinus={onChange('r_cooling_max', -1)}
                onPlus={onChange('r_cooling_max', 1)}
                s={s}
              />
              <ThrInfoRow
                title="R0 — Холодные"
                sub={`Последний визит > ${th.r_cooling_max} дн`}
                last s={s}
              />
            </View>

            {/* Frequency */}
            <Text style={[s.menuSectionTitle, { marginTop: 4 }]}>Частота (F)</Text>
            <View style={s.thrCard}>
              <ThrRow
                title="F1 — Редкие"
                sub="Визитов ≤"
                value={th.f_rare_max} unit="виз."
                onMinus={onChange('f_rare_max', -1)}
                onPlus={onChange('f_rare_max', 1)}
                s={s}
              />
              <ThrRow
                title="F2 — Средние"
                sub="Визитов ≤"
                value={th.f_moderate_max} unit="виз."
                onMinus={onChange('f_moderate_max', -1)}
                onPlus={onChange('f_moderate_max', 1)}
                s={s}
              />
              <ThrInfoRow
                title="F3 — Лояльные"
                sub={`Визитов > ${th.f_moderate_max}`}
                last s={s}
              />
            </View>

            {/* Actions */}
            <View style={[s.contactActions, { marginTop: 6 }]}>
              <Pressable
                style={[s.btn, s.btnPrimary, !dirty && { opacity: 0.5 }]}
                {...ripple('rgba(255,255,255,0.22)')}
                onPress={onSave}
                disabled={!dirty || saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color={C.surface} />
                  : <Save size={15} color={C.surface} strokeWidth={2.2} />
                }
                <Text style={s.btnPrimaryText}>
                  {saving ? 'Сохраняем…' : dirty ? 'Сохранить' : 'Без изменений'}
                </Text>
              </Pressable>
              <Pressable
                style={[s.btn, s.btnSecondary]}
                {...ripple()}
                onPress={onReset}
                disabled={saving}
              >
                <RotateCcw size={14} color={C.ink2} strokeWidth={2.2} />
                <Text style={s.btnSecondaryText}>Сбросить</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────
// Read-only строка для R0/F3 (автоматически вычисляется из соседних порогов)
const ThrInfoRow: React.FC<{
  title: string;
  sub: string;
  last?: boolean;
  s: S;
}> = ({ title, sub, last, s }) => (
  <View style={[s.thrRow, last && s.thrRowLast, { opacity: 0.6 }]}>
    <View style={s.thrLabel}>
      <Text style={s.thrLabelTitle}>{title}</Text>
      <Text style={s.thrLabelSub}>{sub}</Text>
    </View>
    <Text style={[s.thrLabelSub, { fontSize: 11, color: C.ink4, marginRight: 4 }]}>авто</Text>
  </View>
);

// ─────────────────────────────────────────────
const ThrRow: React.FC<{
  title: string;
  sub: string;
  value: number;
  unit: string;
  onMinus: () => void;
  onPlus: () => void;
  last?: boolean;
  s: S;
}> = ({ title, sub, value, unit, onMinus, onPlus, last, s }) => (
  <View style={[s.thrRow, last && s.thrRowLast]}>
    <View style={s.thrLabel}>
      <Text style={s.thrLabelTitle}>{title}</Text>
      <Text style={s.thrLabelSub}>{sub} {value} {unit}</Text>
    </View>
    <View style={s.thrStepper}>
      <Pressable style={s.thrStepBtn} {...ripple(undefined, true)} onPress={onMinus}>
        <Text style={s.thrStepBtnText}>−</Text>
      </Pressable>
      <Text style={s.thrStepValue}>{value}</Text>
      <Pressable style={s.thrStepBtn} {...ripple(undefined, true)} onPress={onPlus}>
        <Text style={s.thrStepBtnText}>+</Text>
      </Pressable>
    </View>
  </View>
);
