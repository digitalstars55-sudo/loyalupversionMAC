import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, FadeIn, FadeInDown, FadeOut,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F } from '../theme';
import { haptic } from '../platform';
import { getTourTarget, type Rect } from '../tourTargets';

const IDLE = require('../assets/loyalchik/loyalchik_idle.json');
const SPRING = { damping: 20, stiffness: 200, mass: 0.7 } as const;

type Step = { key: string; title: string; text: string; target: string | null; pad?: number };

const STEPS: Step[] = [
  { key: 'welcome',   title: 'Привет! Я Лояльчик 🚀', text: 'За минуту покажу, что где в приложении. Поехали!', target: null },
  { key: 'home',      title: 'Главная',            text: 'Задачи дня и быстрая сводка по всей сети.', target: 'tab:0', pad: 4 },
  { key: 'analytics', title: 'Аналитика',          text: 'RF-сегменты гостей, выручка и отчёты в PDF.', target: 'tab:1', pad: 4 },
  { key: 'reviews',   title: 'Отзывы',             text: 'Отвечай гостям — AI подготовит черновик ответа.', target: 'tab:2', pad: 4 },
  { key: 'chat',      title: 'Чат с поддержкой',   text: 'Поддержка ЛоялUP всегда на связи здесь.', target: 'tab:3', pad: 4 },
  { key: 'more',      title: 'Ещё',                text: 'Сотрудники, рассылки, каталог, акции и настройки.', target: 'tab:4', pad: 4 },
  { key: 'loyalchik', title: 'Я всегда рядом',     text: 'Спроси меня о чём угодно по системе — помогу и подскажу.', target: 'loyalchik', pad: 10 },
];

class Boundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, { f: boolean }> {
  state = { f: false };
  static getDerivedStateFromError() { return { f: true }; }
  componentDidCatch() {}
  render() { return this.state.f ? this.props.fallback : this.props.children; }
}

function resolveRect(target: string | null, pad: number): Rect | null {
  if (!target) return null;
  if (target.startsWith('tab:')) {
    const i = parseInt(target.slice(4), 10);
    const tb = getTourTarget('tabbar');
    if (!tb) return null;
    const w = tb.width / 5;
    return { x: tb.x + w * i + pad, y: tb.y + pad, width: w - pad * 2, height: tb.height - pad * 2 };
  }
  const r = getTourTarget(target);
  if (!r) return null;
  return { x: r.x - pad, y: r.y - pad, width: r.width + pad * 2, height: r.height + pad * 2 };
}

export const OnboardingTour: React.FC<{ visible: boolean; onFinish: () => void }> = ({ visible, onFinish }) => {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [step, setStep] = React.useState(0);

  // прямоугольник «дырки» (spotlight). Для welcome — точка в центре (полное затемнение).
  const sx = useSharedValue(W / 2);
  const sy = useSharedValue(H / 2);
  const sw = useSharedValue(0);
  const sh = useSharedValue(0);

  const cur = STEPS[step];
  const rect = resolveRect(cur.target, cur.pad ?? 6);

  React.useEffect(() => {
    if (!visible) return;
    if (rect) {
      sx.value = withSpring(rect.x, SPRING);
      sy.value = withSpring(rect.y, SPRING);
      sw.value = withSpring(rect.width, SPRING);
      sh.value = withSpring(rect.height, SPRING);
    } else {
      sx.value = withTiming(W / 2); sy.value = withTiming(H / 2);
      sw.value = withTiming(0); sh.value = withTiming(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, visible]);

  React.useEffect(() => { if (visible) setStep(0); }, [visible]);

  const DIM = 'rgba(12,8,24,0.82)';
  // 4 полосы затемнения вокруг дырки (хуки — всегда, до раннего return)
  const topS = useAnimatedStyle(() => ({ left: 0, top: 0, width: W, height: Math.max(0, sy.value) }));
  const botS = useAnimatedStyle(() => ({ left: 0, top: sy.value + sh.value, width: W, height: Math.max(0, H - (sy.value + sh.value)) }));
  const leftS = useAnimatedStyle(() => ({ left: 0, top: sy.value, width: Math.max(0, sx.value), height: sh.value }));
  const rightS = useAnimatedStyle(() => ({ left: sx.value + sw.value, top: sy.value, width: Math.max(0, W - (sx.value + sw.value)), height: sh.value }));
  const ring = useAnimatedStyle(() => ({
    left: sx.value - 3, top: sy.value - 3, width: sw.value + 6, height: sh.value + 6,
    opacity: sw.value > 1 ? 1 : 0,
  }));

  if (!visible) return null;

  // позиция карточки: для нижних целей — сверху, для welcome — по центру
  const targetAtBottom = rect ? rect.y > H * 0.5 : false;
  const cardTop = !rect ? H * 0.3 : (targetAtBottom ? insets.top + 40 : rect.y + rect.height + 28);

  const isLast = step === STEPS.length - 1;
  const next = () => { haptic('light'); if (isLast) finish(); else setStep(s => s + 1); };
  const prev = () => { haptic('light'); setStep(s => Math.max(0, s - 1)); };
  const finish = () => { haptic('success'); onFinish(); };

  return (
    <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(180)} style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]} pointerEvents="auto">
      {/* затемнение с «дыркой» */}
      <Animated.View style={[styles.dim, { backgroundColor: DIM }, topS]} />
      <Animated.View style={[styles.dim, { backgroundColor: DIM }, botS]} />
      <Animated.View style={[styles.dim, { backgroundColor: DIM }, leftS]} />
      <Animated.View style={[styles.dim, { backgroundColor: DIM }, rightS]} />
      {/* подсветка-рамка цели */}
      <Animated.View pointerEvents="none" style={[styles.ringBox, ring]} />

      {/* Пропустить */}
      <Pressable style={[styles.skip, { top: insets.top + 8 }]} onPress={finish} hitSlop={10}>
        <Text style={styles.skipText}>Пропустить</Text>
      </Pressable>

      {/* Карточка с Лояльчиком */}
      <Animated.View
        key={step}
        entering={FadeInDown.duration(280).springify().damping(18)}
        style={[styles.card, { top: cardTop }]}
      >
        <View style={styles.mascotWrap}>
          <Boundary fallback={<Text style={{ fontSize: 34 }}>🚀</Text>}>
            <LottieView source={IDLE} autoPlay loop style={{ width: 72, height: 72 }} />
          </Boundary>
        </View>
        <Text style={styles.title}>{cur.title}</Text>
        <Text style={styles.text}>{cur.text}</Text>

        {/* точки прогресса */}
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>

        <View style={styles.row}>
          {step > 0 ? (
            <Pressable style={[styles.btn, styles.btnGhost]} onPress={prev}>
              <Text style={styles.btnGhostText}>Назад</Text>
            </Pressable>
          ) : <View style={{ flex: 1 }} />}
          <Pressable style={[styles.btn, styles.btnPrimary]} onPress={next}>
            <Text style={styles.btnPrimaryText}>{isLast ? 'Понятно!' : 'Далее'}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  dim: { position: 'absolute' },
  ringBox: {
    position: 'absolute', borderRadius: 16, borderWidth: 2.5, borderColor: '#D6DE23',
    backgroundColor: 'transparent',
    shadowColor: '#D6DE23', shadowOpacity: 0.7, shadowRadius: 12, shadowOffset: { width: 0, height: 0 },
  },
  skip: { position: 'absolute', right: 16, paddingVertical: 6, paddingHorizontal: 12, zIndex: 5 },
  skipText: { fontFamily: F.semibold, fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  card: {
    position: 'absolute', left: 18, right: 18,
    backgroundColor: C.surface ?? '#fff', borderRadius: 22, padding: 20, paddingTop: 44,
    alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 16,
  },
  mascotWrap: {
    position: 'absolute', top: -34, alignSelf: 'center',
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: C.surface ?? '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#A855F7', shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 10,
  },
  title: { fontFamily: F.extrabold, fontSize: 19, color: C.ink, textAlign: 'center', marginBottom: 6 },
  text: { fontFamily: F.medium, fontSize: 14.5, color: C.ink2, textAlign: 'center', lineHeight: 20 },
  dots: { flexDirection: 'row', gap: 6, marginTop: 16, marginBottom: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.line },
  dotActive: { width: 18, backgroundColor: C.purple },
  row: { flexDirection: 'row', gap: 10, marginTop: 14, width: '100%' },
  btn: { flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { backgroundColor: C.purpleSoft },
  btnGhostText: { fontFamily: F.bold, fontSize: 15, color: C.purpleDeep },
  btnPrimary: { backgroundColor: C.purple },
  btnPrimaryText: { fontFamily: F.bold, fontSize: 15, color: C.surface },
});
