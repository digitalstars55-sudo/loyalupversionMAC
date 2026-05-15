import React, { useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Dimensions,
  NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft, ChevronRight, Sparkles, BarChart3, MessageSquare, Megaphone,
  Gift, X,
} from 'lucide-react-native';

import { C, F } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple } from '../platform';

// ════════════════════════════════════════════════════════════════════
// ONBOARDING SLIDESHOW — 5 слайдов «зачем нужен ЛоялUP»
// Перед тем как клиент попадёт в чат с AI-менеджером.
// ════════════════════════════════════════════════════════════════════

const SLIDES: Slide[] = [
  {
    icon: Sparkles,
    tone: 'purple',
    title: 'Программа лояльности на автопилоте',
    body: 'Гости возвращаются сами — а вы занимаетесь кофе, кухней и атмосферой. ЛоялUP берёт на себя удержание, рассылки и анализ оттока.',
    bullets: [
      'Гости видят свои бонусы в VK-приложении',
      'Подарки и квесты прямо в чате',
      'Каждое посещение в одной системе',
    ],
  },
  {
    icon: BarChart3,
    tone: 'lime',
    title: 'RF-аналитика: знайте, кто уходит',
    body: 'Матрица 4×3 разделит гостей на 12 сегментов: чемпионы, спящие, в риске. Видно сразу — кому слать, кого не трогать, кого пора возвращать.',
    bullets: [
      '12 сегментов от «Новичков» до «Чемпионов»',
      'Миграции: кто перешёл в риск за неделю',
      'Рейтинг по точкам с AI-рекомендациями',
    ],
  },
  {
    icon: Megaphone,
    tone: 'purple',
    title: 'Умные рассылки в 1 тап',
    body: 'AI пишет персональный текст под сегмент. A/B-тест с разделением по полу и проценту — вы сравниваете два варианта и видите победителя.',
    bullets: [
      'AI-черновик за 3 секунды',
      'Фильтр пол / процент сплита',
      'Победитель A/B виден после рассылки',
    ],
  },
  {
    icon: MessageSquare,
    tone: 'lime',
    title: 'Отзывы под контролем',
    body: 'AI ловит каждый отзыв из VK и приложения, фильтрует негатив и готовит ответ. Вы только подтверждаете — без рутины и пропущенных сообщений.',
    bullets: [
      'Тональность определяется автоматически',
      'AI-черновик ответа на негатив',
      'Push сразу в телефон — не пропустите',
    ],
  },
  {
    icon: Gift,
    tone: 'purple',
    title: 'Подарки и квесты',
    body: 'Гости играют — возвращаются чаще. Каталог подарков, дневные коды, реферальные квесты, ДР-призы. Всё в едином кабинете.',
    bullets: [
      'Каталог подарков с per-точкой настройкой',
      'Квесты «приведи друга», «3 визита» и др.',
      'Поздравление с ДР по всему телефону',
    ],
  },
];

type Slide = {
  icon: any;
  tone: 'purple' | 'lime';
  title: string;
  body: string;
  bullets: string[];
};

export const OnboardingSlideshow: React.FC<{
  onClose: () => void;
  onFinish: () => void;
}> = ({ onClose, onFinish }) => {
  const r = useResponsive();
  const w = useMemo(() => Dimensions.get('window').width, []);
  const [idx, setIdx] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIdx = Math.round(e.nativeEvent.contentOffset.x / w);
    if (newIdx !== idx && newIdx >= 0 && newIdx < SLIDES.length) {
      setIdx(newIdx);
    }
  };

  const goTo = (n: number) => {
    haptic('light');
    scrollRef.current?.scrollTo({ x: n * w, animated: true });
    setIdx(n);
  };

  const next = () => {
    if (idx < SLIDES.length - 1) goTo(idx + 1);
    else { haptic('medium'); onFinish(); }
  };

  const prev = () => {
    if (idx > 0) goTo(idx - 1);
  };

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Header: close + skip */}
      <View style={s.header}>
        <Pressable
          style={s.closeBtn}
          {...ripple()}
          onPress={() => { haptic('light'); onClose(); }}
          accessibilityLabel="Закрыть онбординг"
        >
          <X size={18} color={C.ink2} strokeWidth={2.2} />
        </Pressable>
        <Text style={s.progressText}>
          {idx + 1} <Text style={{ color: C.ink4 }}>/ {SLIDES.length}</Text>
        </Text>
        <Pressable
          style={s.skipBtn}
          {...ripple()}
          onPress={() => { haptic('light'); onFinish(); }}
        >
          <Text style={s.skipText}>Пропустить</Text>
        </Pressable>
      </View>

      {/* Pages */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide, i) => (
          <SlideView key={i} slide={slide} width={w} />
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={s.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[s.dot, idx === i && s.dotActive]} />
        ))}
      </View>

      {/* Footer nav */}
      <View style={s.footer}>
        <Pressable
          style={[s.navBtn, idx === 0 && { opacity: 0.3 }]}
          {...ripple()}
          onPress={prev}
          disabled={idx === 0}
        >
          <ChevronLeft size={18} color={C.ink2} strokeWidth={2.2} />
        </Pressable>
        <Pressable
          style={s.primaryBtn}
          {...ripple('rgba(255,255,255,0.22)')}
          onPress={next}
        >
          <Text style={s.primaryBtnText}>
            {idx < SLIDES.length - 1 ? 'Дальше' : 'Поговорить с AI-менеджером'}
          </Text>
          <ChevronRight size={16} color={C.surface} strokeWidth={2.4} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────
const SlideView: React.FC<{ slide: Slide; width: number }> = ({ slide, width }) => {
  const Icon = slide.icon;
  const isPurple = slide.tone === 'purple';
  const heroBg = isPurple ? C.purpleSoft : C.limeSoft;
  const heroIconBg = isPurple ? C.purple : C.lime;
  const heroIconColor = isPurple ? C.surface : C.ink;

  return (
    <ScrollView
      style={{ width }}
      contentContainerStyle={s.slideContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero icon */}
      <View style={[s.slideHero, { backgroundColor: heroBg }]}>
        <View style={[s.slideIconBg, { backgroundColor: heroIconBg }]}>
          <Icon size={42} color={heroIconColor} strokeWidth={2} />
        </View>
      </View>

      <Text style={s.slideTitle}>{slide.title}</Text>
      <Text style={s.slideBody}>{slide.body}</Text>

      {/* Bullets */}
      <View style={s.bulletList}>
        {slide.bullets.map((b, i) => (
          <View key={i} style={s.bulletRow}>
            <View style={[s.bulletDot, { backgroundColor: isPurple ? C.purple : C.limeDeep }]} />
            <Text style={s.bulletText}>{b}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

// ─────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontFamily: F.extrabold,
    fontSize: 14,
    color: C.ink,
  },
  skipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  skipText: {
    fontFamily: F.bold,
    fontSize: 13,
    color: C.ink3,
  },

  // Slide
  slideContent: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 24,
  },
  slideHero: {
    height: 240,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  slideIconBg: {
    width: 110,
    height: 110,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  slideTitle: {
    fontFamily: F.extrabold,
    fontSize: 24,
    color: C.ink,
    lineHeight: 30,
    letterSpacing: -0.4,
    marginBottom: 12,
  },
  slideBody: {
    fontFamily: F.medium,
    fontSize: 14,
    color: C.ink2,
    lineHeight: 20,
    marginBottom: 18,
  },
  bulletList: {
    gap: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    fontFamily: F.semibold,
    fontSize: 13,
    color: C.ink,
    lineHeight: 19,
  },

  // Dots
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: C.line,
  },
  dotActive: {
    backgroundColor: C.purple,
    width: 22,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  navBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: C.purple,
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: C.purple,
    shadowOpacity: 0.32,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  primaryBtnText: {
    fontFamily: F.extrabold,
    fontSize: 14,
    color: C.surface,
    letterSpacing: -0.2,
  },
});
