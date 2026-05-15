import React, { useMemo, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, TextInput, Linking, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft, ChevronDown, ChevronUp, Search, X, MessageSquare, BookOpen,
  Phone, Mail,
} from 'lucide-react-native';

import { C } from '../theme';
import { useResponsive } from '../responsive';
import { haptic, ripple, callPhone } from '../platform';
import { makeStyles } from '../styles';
import type { S } from '../styles';

// ════════════════════════════════════════════════════════════════════
// HELP SCREEN — FAQ + контакты поддержки
// FAQ собран по реальным граблям, на которые жаловались владельцы кафе
// и которые встречаются в потоке поддержки ЛоялUP.
// ════════════════════════════════════════════════════════════════════

interface FAQItem { q: string; a: string; tag: string; }

const FAQ: FAQItem[] = [
  // RF и сегментация
  {
    tag: 'RF',
    q: 'Что значат R и F в матрице?',
    a: 'R (Recency) — насколько недавно гость был у вас. R3 — был совсем недавно, R0 — давно потерян. F (Frequency) — как часто ходит. F3 — часто, F1 — редко. Лучшие гости — R3·F3 («чемпионы»), самый болезненный сегмент — R1·F3 (постоянные, которые вдруг пропали).',
  },
  {
    tag: 'RF',
    q: 'Как настроить пороги под свой бизнес?',
    a: 'Откройте «Ещё → Пороги RF». Например, если у вас доставка с длинным циклом — увеличьте R3 до 21 дней (вместо 14). Для кофейни наоборот — оставьте 7 дней. После сохранения RF пересчитается автоматически.',
  },
  {
    tag: 'RF',
    q: 'Почему числа в матрице меняются после пересчёта?',
    a: 'Гости постоянно мигрируют между сегментами: новые приходят, старые уходят, частота визитов растёт или падает. Пересчёт берёт свежие данные из БД и распределяет по новым уровням. Это нормально — обычно 5–15% базы перемещается за месяц.',
  },

  // Отзывы
  {
    tag: 'Отзывы',
    q: 'Почему я не могу закрыть негативный отзыв без ответа?',
    a: 'Это специально. Негативный отзыв = недовольный гость, и тишина — худший ответ. Если решили оффлайн (по телефону, при встрече) — напишите коротко «Связались, разобрались» и закройте. Это сохраняет историю взаимодействия и видно другим, что вы реагируете.',
  },
  {
    tag: 'Отзывы',
    q: 'Что такое AI-черновик и как его подтвердить?',
    a: 'Когда приходит новый отзыв, AI читает его и готовит вариант ответа на основе тональности и контекста. Вам приходит пуш «AI-черновик готов». Откройте отзыв → текст уже в поле ответа → можете отредактировать или сразу нажать «Ответить». Без вашего нажатия ничего не отправляется.',
  },
  {
    tag: 'Отзывы',
    q: 'Как отключить автоответы для определённых точек?',
    a: '«Ещё → Автоответы» → раздел «Точки» → переключите тогл рядом с нужной точкой. Можно также отключить по тональностям (например, оставить только негатив).',
  },
  {
    tag: 'Отзывы',
    q: 'Спам тоже идёт через автоответы?',
    a: 'Нет. Спам всегда игнорируется и не попадает в очередь автоответов — даже если включить все остальные тональности.',
  },

  // Рассылки
  {
    tag: 'Рассылки',
    q: 'Как часто можно делать рассылки одному сегменту?',
    a: 'Зависит от сегмента. Чемпионам (R3·F3) — не чаще 1 раза в неделю и только эксклюзивы. Спящим (R1·F2) — один сильный оффер, потом пауза 2–3 недели. В карточке каждого сегмента есть подсказка «СОВЕТ ПО РАССЫЛКЕ» с конкретными цифрами.',
  },
  {
    tag: 'Рассылки',
    q: 'Куда уходит рассылка — на телефон, в VK?',
    a: 'Сейчас основной канал — VK-сообщения через Senler. Гости получают сообщение в VK от вашей группы. Также есть push в приложение ЛоялUP (если гость его установил).',
  },
  {
    tag: 'Рассылки',
    q: 'Что значит охват ниже 100%?',
    a: 'Не все гости в сегменте получили сообщение. Причины: пользователь отписался от рассылок, заблокировал группу, не привязан VK ID. В среднем охват 92–98% — это норма.',
  },

  // Чат и менеджер
  {
    tag: 'Поддержка',
    q: 'Как добавить новую точку?',
    a: 'Сейчас точки заводит менеджер ЛоялUP в админке системы — это нужно для синхронизации с вашей кассой и Senler. Просто напишите менеджеру в чат название и город, подключим в течение суток.',
  },
  {
    tag: 'Поддержка',
    q: 'Где задать номер менеджера?',
    a: 'Номер задаёт команда ЛоялUP при подключении тенанта — в приложении он отображается только для просмотра в «Ещё → Менеджер». Если нужен другой контакт — напишите нам.',
  },
  {
    tag: 'Поддержка',
    q: 'Чат не отвечает — менеджер не онлайн',
    a: 'Менеджеры работают Пн–Пт 10:00–19:00 МСК. Вне этого времени отвечают на следующий рабочий день. Если вопрос срочный — пишите всё равно, увидим утром в первую очередь.',
  },

  // Команда и права
  {
    tag: 'Команда',
    q: 'Чем отличается «Управляющий» от «Только просмотр»?',
    a: '«Управляющий» — может отвечать на отзывы, запускать рассылки, видеть аналитику и базу гостей. «Только просмотр» — видит отзывы и точки, но не отвечает и не отправляет рассылки. Тонкие настройки можно поправить вручную в карточке сотрудника.',
  },
  {
    tag: 'Команда',
    q: 'Можно ли дать управляющему доступ только к одной точке?',
    a: 'Да. В карточке сотрудника → раздел «Точки доступа» → выберите конкретные. Если не выбрано ни одной — сотрудник видит все точки.',
  },
  {
    tag: 'Команда',
    q: 'Как временно отключить сотрудника?',
    a: 'В списке «Сотрудники» — переключите тогл рядом с именем. Все его сессии завершатся, в приложение он не попадёт. Чтобы вернуть — включите тогл обратно. История его действий сохранится.',
  },

  // Тариф и оплата
  {
    tag: 'Тариф',
    q: 'Что входит в тариф «Стандарт»?',
    a: 'RF-аналитика, отзывы с автоответами AI, чат с менеджером, до 5 точек, 5 сотрудников. Полный список — на сайте levelup.ru/pricing.',
  },
  {
    tag: 'Тариф',
    q: 'Что произойдёт если не оплатить вовремя?',
    a: 'За 7 дней до окончания вы видите напоминание на главной. После окончания приложение переходит в режим «только чтение» — отзывы видны, но новые рассылки и автоответы выключаются. Через 30 дней без оплаты данные архивируются.',
  },
  {
    tag: 'Тариф',
    q: 'Какие способы оплаты?',
    a: 'СБП, карты любых банков, специальные интеграции с Сбером, Т-Банком, Альфа-Банком, ВТБ. Для юр. лиц — счёт через расчётный счёт.',
  },

  // Технические
  {
    tag: 'Прочее',
    q: 'Не приходят пуш-уведомления',
    a: 'Проверьте: 1) Разрешения уведомлений в системных настройках телефона; 2) Не выключен ли «не беспокоить»; 3) В самом приложении уведомления приходят как тестовый пуш из «Ещё → Симулятор пушей»? Если симулятор не работает — это баг приложения, напишите менеджеру.',
  },
  {
    tag: 'Прочее',
    q: 'Цифры в аналитике не сходятся с кассой',
    a: 'RF считается только по гостям с привязкой к ЛоялUP (VK ID или телефон). Анонимные продажи в кассе не попадают в RF. Это нормально — обычно 60–80% выручки идёт через ЛоялUP.',
  },
  {
    tag: 'Прочее',
    q: 'Можно ли выгрузить базу гостей в Excel?',
    a: 'Сейчас выгрузка только через веб-кабинет (levone.ru). На мобайле — в разработке. Если срочно нужно — попросите менеджера выгрузить по запросу.',
  },
];

const TAGS = ['Все', 'RF', 'Отзывы', 'Рассылки', 'Поддержка', 'Команда', 'Тариф', 'Прочее'];

export const HelpScreen: React.FC<{
  onBack: () => void;
  onOpenChat: () => void;
}> = ({ onBack, onOpenChat }) => {
  const r = useResponsive();
  const s = useMemo(() => makeStyles(r), [r]);

  const [search, setSearch] = useState('');
  const [tag, setTag] = useState<string>('Все');
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());

  const toggle = (idx: number) => () => {
    haptic('light');
    setOpenIds(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return FAQ
      .map((item, idx) => ({ ...item, idx }))
      .filter(it => {
        if (tag !== 'Все' && it.tag !== tag) return false;
        if (!q) return true;
        return it.q.toLowerCase().includes(q) || it.a.toLowerCase().includes(q);
      });
  }, [search, tag]);

  const onMail = async () => {
    const url = 'mailto:support@levelup.ru?subject=Помощь%20ЛоялUP';
    if (Platform.OS === 'web') { window.open(url, '_blank'); return; }
    try { await Linking.openURL(url); } catch {}
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="dark" />

      <View style={s.backHeader}>
        <Pressable style={s.backBtn} {...ripple()} onPress={onBack}>
          <ChevronLeft size={20} color={C.ink} strokeWidth={2.2} />
        </Pressable>
        <View style={s.screenTitleBlock}>
          <Text style={s.screenTitleSuper}>База знаний</Text>
          <Text style={s.screenTitleMain}>Помощь</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* Поиск */}
        <View style={s.searchWrap}>
          <Search size={16} color={C.ink4} strokeWidth={2} />
          <TextInput
            style={s.searchInput}
            placeholder="Поиск по вопросам"
            placeholderTextColor={C.ink4}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable style={s.searchClear} onPress={() => setSearch('')}>
              <X size={12} color={C.ink2} strokeWidth={2.4} />
            </Pressable>
          )}
        </View>

        {/* Tags */}
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.rvFiltersRow}
          style={[s.rvFilters, { marginBottom: 14 }]}
        >
          {TAGS.map(t => {
            const active = tag === t;
            return (
              <Pressable
                key={t}
                style={[s.filterChip, active && s.filterChipActive]}
                {...ripple()}
                onPress={() => { haptic('light'); setTag(t); }}
              >
                <Text style={[s.filterChipText, active && s.filterChipTextActive]}>{t}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* FAQ list */}
        {filtered.length === 0 ? (
          <View style={s.emptyState}>
            <BookOpen size={36} color={C.ink4} strokeWidth={1.5} />
            <Text style={s.emptyStateTitle}>По запросу ничего не найдено</Text>
            <Text style={s.emptyStateSub}>
              Не нашли ответ? Напишите менеджеру — он поможет в течение часа в рабочее время.
            </Text>
          </View>
        ) : filtered.map(item => {
          const open = openIds.has(item.idx);
          return (
            <View key={item.idx} style={s.faqCard}>
              <Pressable style={s.faqHead} {...ripple()} onPress={toggle(item.idx)}>
                <View style={s.faqIcon}>
                  <BookOpen size={14} color={C.purpleDeep} strokeWidth={2.4} />
                </View>
                <Text style={s.faqQ}>{item.q}</Text>
                {open
                  ? <ChevronUp size={16} color={C.ink3} strokeWidth={2} />
                  : <ChevronDown size={16} color={C.ink3} strokeWidth={2} />
                }
              </Pressable>
              {open && (
                <View style={s.faqBody}>
                  <Text style={s.faqA}>{item.a}</Text>
                </View>
              )}
            </View>
          );
        })}

        {/* Контакты — внизу всегда */}
        <Text style={[s.menuSectionTitle, { marginTop: 16 }]}>Не нашли ответ?</Text>
        <View style={s.menuCard}>
          <Pressable style={s.menuRow} {...ripple()} onPress={() => { haptic('light'); onOpenChat(); }}>
            <View style={[s.menuIconWrap, { backgroundColor: C.purpleSoft }]}>
              <MessageSquare size={18} color={C.purpleDeep} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.menuRowTitle}>Написать менеджеру</Text>
              <Text style={s.menuRowSub}>Чат · ответ в течение часа</Text>
            </View>
            <ChevronLeft size={16} color={C.ink4} strokeWidth={2} style={{ transform: [{ rotate: '180deg' }] }} />
          </Pressable>
          <Pressable
            style={s.menuRow}
            {...ripple()}
            onPress={() => callPhone({ phone: '+78001234567', name: 'Поддержка ЛоялUP' })}
          >
            <View style={[s.menuIconWrap, { backgroundColor: C.limeSoft }]}>
              <Phone size={18} color={C.limeDeep} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.menuRowTitle}>Позвонить</Text>
              <Text style={s.menuRowSub}>+7 800 123-45-67 · бесплатно</Text>
            </View>
          </Pressable>
          <Pressable style={[s.menuRow, s.menuRowLast]} {...ripple()} onPress={onMail}>
            <View style={[s.menuIconWrap, { backgroundColor: C.lineSoft }]}>
              <Mail size={18} color={C.ink2} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.menuRowTitle}>Email</Text>
              <Text style={s.menuRowSub}>support@levelup.ru</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
