import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, StyleSheet, ViewStyle } from 'react-native';
import { C } from '../theme';

// ════════════════════════════════════════════════════════════════════
// SKELETON — анимированный shimmer-плейсхолдер
// Использование: <Skeleton w={120} h={14} radius={6} />
// ════════════════════════════════════════════════════════════════════
export const Skeleton: React.FC<{
  w?: number | `${number}%` | 'auto';
  h?: number;
  radius?: number;
  style?: ViewStyle | ViewStyle[];
}> = ({ w = '100%', h = 14, radius = 6, style }) => {
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.55, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.base,
        { width: w as any, height: h, borderRadius: radius, opacity },
        style,
      ]}
    />
  );
};

// Готовые композиции для типовых экранов
export const SkeletonCard: React.FC<{ height?: number; style?: ViewStyle }> = ({ height = 90, style }) => (
  <View style={[styles.card, { minHeight: height }, style]}>
    <Skeleton w={42} h={42} radius={21} style={{ marginRight: 12 }} />
    <View style={{ flex: 1, gap: 8 }}>
      <Skeleton w="60%" h={14} />
      <Skeleton w="40%" h={11} />
      <Skeleton w="90%" h={11} />
    </View>
  </View>
);

export const SkeletonRow: React.FC = () => (
  <View style={styles.row}>
    <Skeleton w={34} h={34} radius={10} style={{ marginRight: 12 }} />
    <View style={{ flex: 1, gap: 6 }}>
      <Skeleton w="55%" h={13} />
      <Skeleton w="35%" h={10} />
    </View>
  </View>
);

export const SkeletonList: React.FC<{ count?: number; pad?: number }> = ({ count = 4, pad = 20 }) => (
  <View style={{ paddingHorizontal: pad, gap: 10 }}>
    {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
  </View>
);

const styles = StyleSheet.create({
  base: {
    backgroundColor: C.lineSoft,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.lineSoft,
  },
});
