import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../theme';

const SPRING = { damping: 24, stiffness: 240, mass: 0.7 } as const;

// Telegram-стиль bottom-sheet: пружинный выезд снизу, затемнение, свайп-вниз
// для закрытия. Drop-in замена для RN <Modal> у нижних модалок.
export const SheetModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeightPct?: number;        // доля высоты экрана (0..1)
  closeThreshold?: number;      // px свайпа вниз для закрытия
}> = ({ visible, onClose, children, maxHeightPct = 0.92, closeThreshold = 110 }) => {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [render, setRender] = React.useState(visible);
  const translateY = useSharedValue(height);
  const progress = useSharedValue(0); // 0 закрыто, 1 открыто (для backdrop)

  const animateOut = React.useCallback(() => {
    progress.value = withTiming(0, { duration: 200 });
    translateY.value = withTiming(height, { duration: 230 }, (fin) => {
      if (fin) runOnJS(setRender)(false);
    });
  }, [height]);

  // visible → монтируем; visible=false → анимация ухода, затем размонтаж.
  useEffect(() => {
    if (visible) setRender(true);
    else if (render) animateOut();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // После монтирования — пружинный въезд.
  useEffect(() => {
    if (render && visible) {
      translateY.value = height;
      progress.value = withTiming(1, { duration: 220 });
      translateY.value = withSpring(0, SPRING);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [render]);

  const requestClose = React.useCallback(() => onClose(), [onClose]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      'worklet';
      if (e.translationY > 0) translateY.value = e.translationY;
    })
    .onEnd((e) => {
      'worklet';
      if (e.translationY > closeThreshold || e.velocityY > 800) {
        runOnJS(requestClose)();
      } else {
        translateY.value = withSpring(0, SPRING);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  if (!render) return null;

  return (
    <Modal transparent visible={render} animationType="none" onRequestClose={requestClose} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={requestClose} />
        </Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.sheet, { maxHeight: height * maxHeightPct, paddingBottom: Math.max(insets.bottom, 12) }, sheetStyle]}>
            <View style={styles.handle} />
            {children}
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(15,10,30,0.5)' },
  sheet: {
    backgroundColor: C.surface ?? '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.18)',
    marginBottom: 6,
  },
});
