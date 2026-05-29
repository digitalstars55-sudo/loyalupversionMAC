import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withRepeat,
  interpolate, FadeIn, FadeInDown, FadeOut,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F } from '../theme';
import { haptic } from '../platform';
import { getTourTarget, type Rect } from '../tourTargets';

const IDLE = require('../assets/loyalchik/loyalchik_idle.json');
const GREETING = require('../assets/loyalchik/loyalchik_greeting.json');
const SPRING = { damping: 20, stiffness: 200, mass: 0.7 } as const;
const RAD = 18; // радиус скругления «дырки» (совпадает с рамкой)

type Step = { key: string; title: string; text: string; target: string | null; pad?: number };

const STEPS: Step[] = [
  { key: 'welcome',   title: 'Привет! Я Лояльчик 🚀', text: 'За минуту проведу по приложению и покажу не только где что лежит, но и зачем оно нужно. Жми «Далее».', target: null },
  { key: 'home',      title: 'Главная',            text: 'Твой центр управления. Здесь задачи дня: неотвеченные отзывы, дни рождения гостей, пропущенные коды дня. Начинай утро отсюда — сразу видно, чем заняться.', target: 'tab:0', pad: 6 },
  { key: 'analytics', title: 'Аналитика',          text: 'Здоровье сети в цифрах. RF-сегменты показывают, кто из гостей активен, кто на грани ухода, а кто уже потерян — и сколько денег они приносят. Отчёт можно выгрузить в PDF.', target: 'tab:1', pad: 6 },
  { key: 'reviews',   title: 'Отзывы',             text: 'Диалог с гостями. На негатив важно отвечать быстро, пока гость не остыл. Нажми на отзыв — я сам подготовлю черновик ответа, тебе останется проверить и отправить.', target: 'tab:2', pad: 6 },
  { key: 'chat',      title: 'Чат с поддержкой',   text: 'Прямая линия с командой ЛоялUP. Любой вопрос по работе системы, оплате или настройке — пиши сюда, ответим живьём.', target: 'tab:3', pad: 6 },
  { key: 'more',      title: 'Ещё',                text: 'Всё остальное: сотрудники и их права, рассылки гостям во ВКонтакте, каталог подарков, акции, коды дня и настройки сети.', target: 'tab:4', pad: 6 },
  { key: 'loyalchik', title: 'А это я 🚀',         text: 'Нажми на меня на любом экране — подскажу твои реальные цифры, объясню любой раздел простыми словами или помогу решить, что делать дальше.', target: 'loyalchik', pad: 12 },
  { key: 'start',     title: 'С чего начать',      text: '1) Ответь на свежие отзывы.  2) Пригласи команду в «Ещё → Сотрудники».  3) Загляни в Аналитику и оцени сегменты гостей. Если что — я всегда рядом. Удачи! 🚀', target: null },
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

  const sx = useSharedValue(W / 2);
  const sy = useSharedValue(H / 2);
  const sw = useSharedValue(0);
  const sh = useSharedValue(0);
  const pulse = useSharedValue(0);

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

  React.useEffect(() => {
    if (visible) { setStep(0); pulse.value = withRepeat(withTiming(1, { duration: 1500 }), -1, false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const DIM = 'rgba(10,6,22,0.86)';
  const topS = useAnimatedStyle(() => ({ left: 0, top: 0, width: W, height: Math.max(0, sy.value) }));
  const botS = useAnimatedStyle(() => ({ left: 0, top: sy.value + sh.value, width: W, height: Math.max(0, H - (sy.value + sh.value)) }));
  const leftS = useAnimatedStyle(() => ({ left: 0, top: sy.value, width: Math.max(0, sx.value), height: sh.value }));
  const rightS = useAnimatedStyle(() => ({ left: sx.value + sw.value, top: sy.value, width: Math.max(0, W - (sx.value + sw.value)), height: sh.value }));
  // 4 скругляющих уголка «дырки»
  const tl = useAnimatedStyle(() => ({ left: sx.value, top: sy.value, opacity: sw.value > 1 ? 1 : 0 }));
  const tr = useAnimatedStyle(() => ({ left: sx.value + sw.value - RAD, top: sy.value, opacity: sw.value > 1 ? 1 : 0 }));
  const bl = useAnimatedStyle(() => ({ left: sx.value, top: sy.value + sh.value - RAD, opacity: sw.value > 1 ? 1 : 0 }));
  const br = useAnimatedStyle(() => ({ left: sx.value + sw.value - RAD, top: sy.value + sh.value - RAD, opacity: sw.value > 1 ? 1 : 0 }));
  const ring = useAnimatedStyle(() => ({
    left: sx.value - 3, top: sy.value - 3, width: sw.value + 6, height: sh.value + 6,
    opacity: sw.value > 1 ? 1 : 0,
  }));
  // пульсирующее свечение вокруг цели
  const glow = useAnimatedStyle(() => ({
    left: sx.value - 8, top: sy.value - 8, width: sw.value + 16, height: sh.value + 16,
    opacity: sw.value > 1 ? interpolate(pulse.value, [0, 1], [0.55, 0]) : 0,
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.12]) }],
  }));

  if (!visible) return null;

  const targetAtBottom = rect ? rect.y > H * 0.5 : false;
  const cardTop = !rect ? H * 0.3 : (targetAtBottom ? insets.top + 44 : rect.y + rect.height + 30);
  const isLast = step === STEPS.length - 1;
  const isWelcome = step === 0;
  const next = () => { haptic('light'); if (isLast) finish(); else setStep(s => s + 1); };
  const prev = () => { haptic('light'); setStep(s => Math.max(0, s - 1)); };
  const finish = () => { haptic('success'); onFinish(); };

  return (
    <Animated.View entering={FadeIn.duration(240)} exiting={FadeOut.duration(200)} style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]}>
      {/* затемнение */}
      <Animated.View style={[styles.dim, { backgroundColor: DIM }, topS]} />
      <Animated.View style={[styles.dim, { backgroundColor: DIM }, botS]} />
      <Animated.View style={[styles.dim, { backgroundColor: DIM }, leftS]} />
      <Animated.View style={[styles.dim, { backgroundColor: DIM }, rightS]} />
      {/* скругление углов дырки */}
      <Animated.View style={[styles.corner, { backgroundColor: DIM, borderBottomRightRadius: RAD }, tl]} />
      <Animated.View style={[styles.corner, { backgroundColor: DIM, borderBottomLeftRadius: RAD }, tr]} />
      <Animated.View style={[styles.corner, { backgroundColor: DIM, borderTopRightRadius: RAD }, bl]} />
      <Animated.View style={[styles.corner, { backgroundColor: DIM, borderTopLeftRadius: RAD }, br]} />
      {/* пульс + рамка */}
      <Animated.View pointerEvents="none" style={[styles.glowBox, glow]} />
      <Animated.View pointerEvents="none" style={[styles.ringBox, ring]} />

      <Pressable style={[styles.skip, { top: insets.top + 8 }]} onPress={finish} hitSlop={10}>
        <Text style={styles.skipText}>Пропустить</Text>
      </Pressable>

      <Animated.View key={step} entering={FadeInDown.duration(300).springify().damping(16)} style={[styles.card, { top: cardTop }]}>
        <View style={styles.mascotWrap}>
          <Boundary fallback={<Text style={{ fontSize: 38 }}>🚀</Text>}>
            <LottieView source={isWelcome ? GREETING : IDLE} autoPlay loop style={{ width: 84, height: 84 }} />
          </Boundary>
        </View>
        <Text style={styles.stepNo}>Шаг {step + 1} из {STEPS.length}</Text>
        <Text style={styles.title}>{cur.title}</Text>
        <Text style={styles.text}>{cur.text}</Text>

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
  corner: { position: 'absolute', width: RAD, height: RAD },
  glowBox: { position: 'absolute', borderRadius: RAD + 6, borderWidth: 6, borderColor: '#D6DE23' },
  ringBox: {
    position: 'absolute', borderRadius: RAD, borderWidth: 2.5, borderColor: '#D6DE23',
    shadowColor: '#D6DE23', shadowOpacity: 0.8, shadowRadius: 14, shadowOffset: { width: 0, height: 0 },
  },
  skip: { position: 'absolute', right: 16, paddingVertical: 6, paddingHorizontal: 12, zIndex: 5 },
  skipText: { fontFamily: F.semibold, fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  card: {
    position: 'absolute', left: 18, right: 18,
    backgroundColor: C.surface ?? '#fff', borderRadius: 24, padding: 20, paddingTop: 52,
    alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.32, shadowRadius: 28, shadowOffset: { width: 0, height: 12 }, elevation: 18,
  },
  mascotWrap: {
    position: 'absolute', top: -40, alignSelf: 'center',
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.surface ?? '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#A855F7', shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 12,
  },
  stepNo: { fontFamily: F.bold, fontSize: 11, letterSpacing: 0.6, color: C.purple, textTransform: 'uppercase', marginBottom: 6 },
  title: { fontFamily: F.extrabold, fontSize: 20, color: C.ink, textAlign: 'center', marginBottom: 6 },
  text: { fontFamily: F.medium, fontSize: 14.5, color: C.ink2, textAlign: 'center', lineHeight: 21 },
  dots: { flexDirection: 'row', gap: 6, marginTop: 18, marginBottom: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.line },
  dotActive: { width: 20, backgroundColor: C.purple },
  row: { flexDirection: 'row', gap: 10, marginTop: 16, width: '100%' },
  btn: { flex: 1, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { backgroundColor: C.purpleSoft },
  btnGhostText: { fontFamily: F.bold, fontSize: 15, color: C.purpleDeep },
  btnPrimary: { backgroundColor: C.purple },
  btnPrimaryText: { fontFamily: F.bold, fontSize: 15, color: C.surface },
});
