import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, TextInput, ScrollView, ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft, Search as SearchIcon, X, Users, Star, Gift, Target, Megaphone,
} from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple } from '../platform';
import { avatarColor, initials } from '../helpers';
import { globalSearch } from '../api';
import { makeStyles } from '../styles';
import type { SearchResults, SearchHit } from '../types';
import type { S } from '../styles';

// ════════════════════════════════════════════════════════════════════
// SEARCH SCREEN — глобальный поиск по гостям/отзывам/подаркам/квестам/акциям
// ════════════════════════════════════════════════════════════════════
export const SearchScreen: React.FC<{
  onBack: () => void;
  onOpenGuest?: (vkId: string) => void;
  onOpenReview?: (id: number) => void;
  onOpenCatalog?: () => void;
  onOpenQuests?: () => void;
  onOpenPromotions?: () => void;
}> = ({ onBack, onOpenGuest, onOpenReview, onOpenCatalog, onOpenQuests, onOpenPromotions }) => {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);

  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  // Дебаунс поиска
  useEffect(() => {
    if (q.trim().length < 2) {
      setResults(null);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await globalSearch(q);
        setResults(res);
      } finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const onHitPress = (hit: SearchHit) => () => {
    haptic('light');
    if (hit.type === 'guest' && onOpenGuest) onOpenGuest(String(hit.id));
    else if (hit.type === 'review' && onOpenReview) onOpenReview(Number(hit.id));
    else if (hit.type === 'product' && onOpenCatalog) onOpenCatalog();
    else if (hit.type === 'quest' && onOpenQuests) onOpenQuests();
    else if (hit.type === 'promotion' && onOpenPromotions) onOpenPromotions();
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="dark" />

      <View style={s.searchHeader}>
        <Pressable style={s.backBtn} {...ripple()} onPress={onBack}>
          <ChevronLeft size={20} color={C.ink} strokeWidth={2.2} />
        </Pressable>
        <View style={s.searchHeaderInputWrap}>
          <SearchIcon size={18} color={C.ink4} strokeWidth={2.2} />
          <TextInput
            style={s.searchHeaderInput}
            value={q}
            onChangeText={setQ}
            placeholder="Гость, отзыв, подарок, квест…"
            placeholderTextColor={C.ink4}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {q.length > 0 && (
            <Pressable onPress={() => { haptic('light'); setQ(''); }} hitSlop={8}>
              <X size={16} color={C.ink3} strokeWidth={2.4} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 130 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {q.trim().length < 2 ? (
          <View style={s.searchEmpty}>
            <SearchIcon size={42} color={C.ink4} strokeWidth={1.5} />
            <Text style={s.emptyStateTitle}>Что ищем?</Text>
            <Text style={s.emptyStateSub}>
              Введите минимум 2 символа. Ищет по именам гостей, тексту отзывов, названиям подарков, квестов и акций.
            </Text>
          </View>
        ) : loading && !results ? (
          <View style={s.searchEmpty}>
            <ActivityIndicator size="large" color={C.purple} />
            <Text style={s.emptyStateSub}>Ищем…</Text>
          </View>
        ) : results && results.total === 0 ? (
          <View style={s.searchEmpty}>
            <Text style={s.emptyStateTitle}>Ничего не найдено</Text>
            <Text style={s.emptyStateSub}>
              По запросу «{q.trim()}» нет ни гостей, ни отзывов, ни контента. Попробуйте переформулировать.
            </Text>
          </View>
        ) : results && (
          <View>
            {/* Total */}
            <Text style={s.searchSectionTitle}>
              Найдено {results.total} {plural(results.total, ['результат', 'результата', 'результатов'])}
            </Text>

            {/* Guests */}
            {results.guests.length > 0 && (
              <Section title={`👥 Гости · ${results.guests.length}`} s={s}>
                {results.guests.map(hit => (
                  <Pressable key={`g${hit.id}`} style={s.searchHit} {...ripple()} onPress={onHitPress(hit)}>
                    <View style={[s.searchHitIcon, { backgroundColor: avatarColor(hit.title) }]}>
                      <Text style={{ fontFamily: 'Manrope_800ExtraBold', fontSize: 14, color: C.surface }}>
                        {initials(hit.title)}
                      </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.searchHitTitle} numberOfLines={1} ellipsizeMode="tail">{hit.title}</Text>
                      {hit.subtitle && <Text style={s.searchHitSub} numberOfLines={1}>{hit.subtitle}</Text>}
                    </View>
                  </Pressable>
                ))}
              </Section>
            )}

            {/* Reviews */}
            {results.reviews.length > 0 && (
              <Section title={`⭐ Отзывы · ${results.reviews.length}`} s={s}>
                {results.reviews.map(hit => (
                  <Pressable key={`r${hit.id}`} style={s.searchHit} {...ripple()} onPress={onHitPress(hit)}>
                    <View style={[s.searchHitIcon, { backgroundColor: C.warnSoft }]}>
                      <Star size={16} color={C.warn} strokeWidth={2.2} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.searchHitTitle} numberOfLines={1} ellipsizeMode="tail">{hit.title}</Text>
                      {hit.subtitle && <Text style={s.searchHitSub} numberOfLines={1}>{hit.subtitle}</Text>}
                      {hit.match && <Text style={s.searchHitMatch} numberOfLines={2}>«{hit.match}»</Text>}
                    </View>
                  </Pressable>
                ))}
              </Section>
            )}

            {/* Products */}
            {results.products.length > 0 && (
              <Section title={`🎁 Подарки · ${results.products.length}`} s={s}>
                {results.products.map(hit => (
                  <Pressable key={`p${hit.id}`} style={s.searchHit} {...ripple()} onPress={onHitPress(hit)}>
                    <View style={[s.searchHitIcon, { backgroundColor: C.purpleSoft }]}>
                      <Gift size={16} color={C.purpleDeep} strokeWidth={2.2} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.searchHitTitle} numberOfLines={1} ellipsizeMode="tail">{hit.title}</Text>
                      {hit.subtitle && <Text style={s.searchHitSub} numberOfLines={1}>{hit.subtitle}</Text>}
                      {hit.match && <Text style={s.searchHitMatch} numberOfLines={2}>{hit.match}</Text>}
                    </View>
                  </Pressable>
                ))}
              </Section>
            )}

            {/* Quests */}
            {results.quests.length > 0 && (
              <Section title={`🎯 Квесты · ${results.quests.length}`} s={s}>
                {results.quests.map(hit => (
                  <Pressable key={`q${hit.id}`} style={s.searchHit} {...ripple()} onPress={onHitPress(hit)}>
                    <View style={[s.searchHitIcon, { backgroundColor: C.limeSoft }]}>
                      <Target size={16} color={C.limeDeep} strokeWidth={2.2} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.searchHitTitle} numberOfLines={1} ellipsizeMode="tail">{hit.title}</Text>
                      {hit.subtitle && <Text style={s.searchHitSub} numberOfLines={1}>{hit.subtitle}</Text>}
                      {hit.match && <Text style={s.searchHitMatch} numberOfLines={2}>{hit.match}</Text>}
                    </View>
                  </Pressable>
                ))}
              </Section>
            )}

            {/* Promotions */}
            {results.promotions.length > 0 && (
              <Section title={`📣 Акции · ${results.promotions.length}`} s={s}>
                {results.promotions.map(hit => (
                  <Pressable key={`pr${hit.id}`} style={s.searchHit} {...ripple()} onPress={onHitPress(hit)}>
                    <View style={[s.searchHitIcon, { backgroundColor: C.purpleSoft }]}>
                      <Megaphone size={16} color={C.purpleDeep} strokeWidth={2.2} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.searchHitTitle} numberOfLines={1} ellipsizeMode="tail">{hit.title}</Text>
                      {hit.subtitle && <Text style={s.searchHitSub} numberOfLines={1}>{hit.subtitle}</Text>}
                      {hit.match && <Text style={s.searchHitMatch} numberOfLines={2}>{hit.match}</Text>}
                    </View>
                  </Pressable>
                ))}
              </Section>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const Section: React.FC<{ title: string; s: S; children: React.ReactNode }> = ({ title, s, children }) => (
  <View style={s.searchSection}>
    <Text style={s.searchSectionTitle}>{title}</Text>
    <View>{children}</View>
  </View>
);

function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}
