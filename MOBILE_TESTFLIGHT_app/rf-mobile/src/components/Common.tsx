import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ArrowUp, ArrowDown } from 'lucide-react-native';
import { C } from '../theme';
import { ripple } from '../platform';
import type { S } from '../styles';

// ════════════════════════════════════════════════════════════════════
// COMMON — переиспользуемые мелкие компоненты
// ════════════════════════════════════════════════════════════════════

export const Chip: React.FC<{ active?: boolean; onPress: () => void; children?: React.ReactNode; s: S }> = ({ active, onPress, children, s }) => (
  <Pressable style={[s.chip, active && s.chipActive]} {...ripple('rgba(255,255,255,0.2)')} onPress={onPress}>
    <Text style={[s.chipText, active && s.chipTextActive]}>{children}</Text>
  </Pressable>
);

export const SegBtn: React.FC<{ active: boolean; onPress: () => void; icon: React.ReactNode; label: string; s: S }> = ({ active, onPress, icon, label, s }) => (
  <Pressable style={[s.seg, active && s.segActive]} {...ripple('rgba(255,255,255,0.2)')} onPress={onPress}>
    {icon}
    <Text style={[s.segText, active && s.segTextActive]}>{label}</Text>
  </Pressable>
);

export type KPITone = 'ink' | 'purple' | 'watch' | 'muted';
export const KPI: React.FC<{ tone: KPITone; label: string; value: string; sub: string; delta: number; s: S }> = ({ tone, label, value, sub, delta, s }) => {
  const accent = tone === 'ink' ? C.ink : tone === 'purple' ? C.purple : tone === 'watch' ? C.watch : C.ink3;
  const valueColor = tone === 'purple' ? C.purpleDeep : tone === 'watch' ? C.watch : C.ink;
  const up = delta >= 0;
  return (
    <View style={s.kpi}>
      <View style={[s.kpiAccent, { backgroundColor: accent }]} />
      <View style={[s.kpiTrend, up ? s.kpiTrendUp : s.kpiTrendDown]}>
        {up ? <ArrowUp size={10} color={C.good} strokeWidth={2.5} /> : <ArrowDown size={10} color={C.warn} strokeWidth={2.5} />}
        <Text style={[s.kpiTrendText, { color: up ? C.good : C.warn }]}>{Math.abs(delta)}%</Text>
      </View>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={[s.kpiVal, { color: valueColor }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={s.kpiSub}>{sub}</Text>
    </View>
  );
};

export const Tab: React.FC<{ icon: React.ReactNode; label: string; active?: boolean; badge?: string; onPress?: () => void; s: S }> = ({ icon, label, active, badge, onPress, s }) => (
  <Pressable style={[s.tab, active && s.tabActive]} {...ripple()} onPress={onPress}>
    {icon}
    <Text style={[s.tabLabel, active && s.tabLabelActive]}>{label}</Text>
    {badge && <View style={s.tabBadge}><Text style={s.tabBadgeText}>{badge}</Text></View>}
  </Pressable>
);
