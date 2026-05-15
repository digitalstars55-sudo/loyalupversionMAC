import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { CloudOff, X } from 'lucide-react-native';
import { C } from '../theme';
import { useNetworkStatus, setForceOffline } from '../network';
import { ripple, haptic } from '../platform';

// ════════════════════════════════════════════════════════════════════
// OFFLINE BANNER — тонкая полоска сверху, когда нет сети или включён
// debug-режим offline. Отдаёт пользователю понимание, что данные могут
// быть устаревшими (showed from cache).
// ════════════════════════════════════════════════════════════════════
export const OfflineBanner: React.FC = () => {
  const { online, forced } = useNetworkStatus();
  if (online) return null;

  const reason = forced ? 'Режим оффлайн (debug)' : 'Нет соединения';
  const sub = forced
    ? 'Данные из кэша. Выключи debug в «Ещё → Настройки»'
    : 'Показываем сохранённые данные. Действия выполнятся, когда сеть вернётся.';

  return (
    <View style={s.bar}>
      <CloudOff size={13} color="#FEF3C7" strokeWidth={2.4} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.title} numberOfLines={1}>{reason}</Text>
        <Text style={s.sub} numberOfLines={1}>{sub}</Text>
      </View>
      {forced && (
        <Pressable
          style={s.dismiss}
          {...ripple('rgba(255,255,255,0.18)', true)}
          onPress={() => { haptic('light'); setForceOffline(false); }}
          accessibilityLabel="Выключить debug-оффлайн"
        >
          <X size={11} color="#FEF3C7" strokeWidth={2.6} />
        </Pressable>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#92400E',
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  title: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 0.3,
    color: '#FEF3C7',
  },
  sub: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 10,
    color: 'rgba(254,243,199,0.85)',
    marginTop: 1,
  },
  dismiss: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
