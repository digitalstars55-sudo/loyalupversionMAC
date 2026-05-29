import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const AP = Animated.createAnimatedComponent(Pressable);
const IN = { damping: 18, stiffness: 340, mass: 0.6 } as const;
const OUT = { damping: 13, stiffness: 260, mass: 0.6 } as const;

// Pressable с пружинным «вдавливанием» при нажатии (telegram-стиль тапа).
// Drop-in замена Pressable для случаев с array/object style.
export const ScalePressable: React.FC<PressableProps & { scaleTo?: number; style?: StyleProp<ViewStyle> }> = ({
  scaleTo = 0.95, style, onPressIn, onPressOut, children, ...rest
}) => {
  const sc = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: sc.value }] }));
  return (
    <AP
      {...rest}
      onPressIn={(e) => { sc.value = withSpring(scaleTo, IN); onPressIn?.(e); }}
      onPressOut={(e) => { sc.value = withSpring(1, OUT); onPressOut?.(e); }}
      style={[style as any, a]}
    >
      {children as any}
    </AP>
  );
};
