import React from 'react';
import { StyleSheet, Animated } from 'react-native';
import LottieView from 'lottie-react-native';

// Lottie-заставка «Старт ракеты». Тайминг из README (60 fps):
//   intro 0–132 (2.2с) → idle-loop 132–252 (бесшовный).
const SPLASH = require('../../assets/splash.json');
const INTRO_START = 0;
const INTRO_END = 132;
const IDLE_START = 132;
const IDLE_END = 252;
const BG = '#1A0B2E'; // совпадает с нативным splash → бесшовный переход

// На старом билде без нативного lottie рендерим просто фон (не краш).
class Boundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() {}
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export const SplashGate: React.FC<{
  onReady?: () => void;   // оверлей на экране → можно прятать нативный splash
  onDone?: () => void;    // после fade-out → размонтировать
  minVisibleMs?: number;
}> = ({ onReady, onDone, minVisibleMs = 2300 }) => {
  const ref = React.useRef<LottieView>(null);
  const started = React.useRef(false);
  const opacity = React.useRef(new Animated.Value(1)).current;
  const [gone, setGone] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 450, useNativeDriver: true })
        .start(() => { setGone(true); onDone?.(); });
    }, minVisibleMs);
    return () => clearTimeout(t);
  }, []);

  if (gone) return null;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, { opacity }]}
      onLayout={() => onReady?.()}
    >
      <Boundary fallback={null}>
        <LottieView
          ref={ref}
          source={SPLASH}
          autoPlay={false}
          loop={false}
          resizeMode="cover"
          style={styles.lottie}
          onLayout={() => {
            if (!started.current) { started.current = true; ref.current?.play(INTRO_START, INTRO_END); }
          }}
          onAnimationFinish={() => { ref.current?.play(IDLE_START, IDLE_END); }}
        />
      </Boundary>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: { backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
  lottie: { width: '100%', height: '100%' },
});
