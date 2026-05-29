import React from 'react';
import { View } from 'react-native';
import { Home, BarChart3, Star, MessageSquare, MoreHorizontal } from 'lucide-react-native';
import { C } from '../theme';
import { haptic } from '../platform';
import { Tab } from './Common';
import { setTourTarget } from '../tourTargets';
import type { TabKey } from '../types';
import type { S } from '../styles';

// ════════════════════════════════════════════════════════════════════
// TAB BAR — нижняя панель навигации, общая для всех экранов
// ════════════════════════════════════════════════════════════════════
export const TabBar: React.FC<{
  active: TabKey;
  onChange: (k: TabKey) => void;
  reviewsBadge?: number;
  chatBadge?: number;
  s: S;
}> = ({ active, onChange, reviewsBadge, chatBadge, s }) => {
  const pick = (k: TabKey) => () => { haptic('light'); onChange(k); };
  const c = (k: TabKey) => active === k ? C.purple : C.ink4;

  const ref = React.useRef<View>(null);
  const measure = () => {
    ref.current?.measureInWindow((x, y, width, height) => {
      if (width > 0) setTourTarget('tabbar', { x, y, width, height });
    });
  };

  return (
    <View ref={ref} style={s.tabbar} onLayout={measure}>
      <Tab
        icon={<Home size={20} color={c('home')} strokeWidth={2} />}
        label="Главная" active={active === 'home'} onPress={pick('home')} s={s}
      />
      <Tab
        icon={<BarChart3 size={20} color={c('analytics')} strokeWidth={2} />}
        label="Аналитика" active={active === 'analytics'} onPress={pick('analytics')} s={s}
      />
      <Tab
        icon={<Star size={20} color={c('reviews')} strokeWidth={2} />}
        label="Отзывы" active={active === 'reviews'}
        badge={reviewsBadge && reviewsBadge > 0 ? String(reviewsBadge) : undefined}
        onPress={pick('reviews')} s={s}
      />
      <Tab
        icon={<MessageSquare size={20} color={c('chat')} strokeWidth={2} />}
        label="Чат" active={active === 'chat'}
        badge={chatBadge && chatBadge > 0 ? String(chatBadge) : undefined}
        onPress={pick('chat')} s={s}
      />
      <Tab
        icon={<MoreHorizontal size={20} color={c('more')} strokeWidth={2} />}
        label="Ещё" active={active === 'more'} onPress={pick('more')} s={s}
      />
    </View>
  );
};
