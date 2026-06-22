import { Filter, Flame, Crown, Sprout } from 'lucide-react-native';
import type {
  SegmentInfo, Guest, FilterChipKey, RFMatrixResponse, Review, AutoReplySettings,
  ChatManager, ChatMessage, Campaign, RFMigration,
  Profile, Staff, StaffPermissions, SubscriptionStatus,
  GuestDetail, GeneralStats, LoyaltyReport, CrossOverview,
  Product, ProductCategory, Quest, Promotion, DailyCode,
  AuditLogEntry, GuestBirthday,
  GiftAnalytic, QuestAnalytic, EngagementSummary,
  ContactPointsResponse,
} from './types';

// ════════════════════════════════════════════════════════════════════
// SEGMENT META — emoji + текстовка для каждого сегмента (12 шт.)
// ════════════════════════════════════════════════════════════════════
export const SEG: Record<string, SegmentInfo> = {
  '3_1': { emoji: '🌱', name: 'Новички', code: 'R3 · F1',
    sub: 'Недавно пришли и редко возвращались. **Цель — второй визит.**',
    strategy: 'Welcome-серия, обучение программе ЛоялUP. Бонус за первое приглашение друга. Внимание в первые две недели — критично.',
    hint: 'Welcome-серия в первые 3 дня. Не более 1 сообщения в неделю.' },
  '3_2': { emoji: '⭐', name: 'Лояльные', code: 'R3 · F2',
    sub: 'Регулярно посещают, недавний визит. **Поддерживать интерес.**',
    strategy: 'Новинки меню, персональные предложения, события и сезонные блюда. Не пережимайте — гости и так с вами.',
    hint: '1–2 рассылки в месяц. Тон полезный, без агрессивных промо.' },
  '3_3': { emoji: '🏆', name: 'Чемпионы', code: 'R3 · F3',
    sub: 'Лучший сегмент: высокая частота визитов и недавнее посещение. **Удерживать любой ценой.**',
    strategy: 'Награждайте лояльность: эксклюзивные предложения, ранний доступ к новинкам, персональные приглашения. Просите рекомендации и отзывы.',
    hint: 'Не больше 1 рассылки в неделю. Только эксклюзив — скидки убивают ценность.' },
  '2_1': { emoji: '🌤', name: 'Потенциал', code: 'R2 · F1',
    sub: 'Гость ещё «тёплый», но уже не активный. **Окно возврата открыто.**',
    strategy: 'Купон с дедлайном, бонус за визит на этой неделе. Без агрессии — гость пока не отвернулся.',
    hint: 'Купон с дедлайном 7 дней. Чёткий триггер для возврата.' },
  '2_2': { emoji: '📈', name: 'Растущие', code: 'R2 · F2',
    sub: 'На пути в R3 F2. **Один шаг до лояльности.**',
    strategy: 'Подарок за 4-й визит, реферальная механика. Вовлеките в накопительную программу.',
    hint: 'Реферальная механика и геймификация. 1 рассылка в 2 недели.' },
  '2_3': { emoji: '🔄', name: 'Постоянные', code: 'R2 · F3',
    sub: 'Часто ходят, но в последний месяц редко. **Лёгкое напоминание.**',
    strategy: 'Тонкое касание о новинке или акции. Не пережимайте — слишком частые письма раздражают именно эту аудиторию.',
    hint: 'Тонкое касание о новинке. Не чаще 2 раз в месяц.' },
  '1_1': { emoji: '🌫', name: 'Угасают', code: 'R1 · F1',
    sub: 'Редкие визиты, давно не были. **Реактивация — последний шанс.**',
    strategy: 'Персональный бонус «давно вас ждём». Если за две недели не сработало — переводим в R0.',
    hint: 'Персональный бонус «давно вас ждём». Дедлайн 14 дней.' },
  '1_2': { emoji: '😴', name: 'Спящие', code: 'R1 · F2',
    sub: 'Ходили нормально — пропали. **Узнайте почему.**',
    strategy: 'Сильный оффер: −20% или подарок к заказу. Короткий опрос в боте — почему перестали приходить.',
    hint: 'Сильный оффер: −20% или подарок. Один раз — без напоминаний.' },
  '1_3': { emoji: '🚨', name: 'VIP риск', code: 'R1 · F3',
    sub: 'Были частыми гостями. **Высший приоритет на возврат.**',
    strategy: 'Звонок менеджера или персональный бонус от шеф-повара. Эти гости стоили дорого — нельзя терять.',
    hint: 'Звонок менеджера в первую очередь. Письмо — вторым шагом.' },
  '0_1': { emoji: '❄️', name: 'Потерянные', code: 'R0 · F1',
    sub: 'Давно не были, визитов было мало. **Минимум усилий.**',
    strategy: 'Общая сезонная рассылка раз в квартал. Не тратьте бюджет на индивидуальные кампании.',
    hint: 'Сезонная рассылка раз в квартал. Бюджет на персонализацию не тратьте.' },
  '0_2': { emoji: '📉', name: 'Уходят', code: 'R0 · F2',
    sub: 'Были постоянными — ушли надолго. **Финальная попытка.**',
    strategy: 'Сильный оффер + опрос «почему ушли». Дальше — в архив на полгода.',
    hint: 'Финальная попытка: оффер + опрос. Дальше в архив на полгода.' },
  '0_3': { emoji: '💔', name: 'Не теряем', code: 'R0 · F3',
    sub: 'Это были чемпионы. **Срочно — личный контакт.**',
    strategy: 'Звонок управляющего, персональное приглашение шефом, индивидуальный комплимент. Только живое касание.',
    hint: 'Только живой контакт: звонок управляющего, личное приглашение.' },
};

// ════════════════════════════════════════════════════════════════════
// FILTER CHIPS — категории для bento-фильтра
// ════════════════════════════════════════════════════════════════════
export const FILTER_CHIPS: { key: FilterChipKey; label: string; icon: any }[] = [
  { key: 'all',   label: 'Все',     icon: Filter },
  { key: 'hot',   label: 'Горящее', icon: Flame },
  { key: 'vip',   label: 'VIP',     icon: Crown },
  { key: 'fresh', label: 'Свежие',  icon: Sprout },
];

export const inFilter = (r: number, f: number, key: FilterChipKey): boolean => {
  if (key === 'all') return true;
  if (key === 'hot') return r === 0 || r === 1;
  if (key === 'vip') return f === 3;
  if (key === 'fresh') return r === 3;
  return true;
};

// ════════════════════════════════════════════════════════════════════
// PERIODS — варианты периодов
// ════════════════════════════════════════════════════════════════════
export const PERIODS = [
  { label: '7 дней',   days: 7 },
  { label: '30 дней',  days: 30 },
  { label: '90 дней',  days: 90 },
  { label: '180 дней', days: 180 },
  { label: 'Год',      days: 365 },
];

// ════════════════════════════════════════════════════════════════════
// MOCK DATA — RF-матрица для разработки/демо
// ════════════════════════════════════════════════════════════════════
export const MOCK: RFMatrixResponse = {
  thresholds: { r_fresh_max: 14, r_warm_max: 30, r_cooling_max: 60, f_rare_max: 3, f_moderate_max: 5 },
  thresholds_source: 'global',
  thresholds_scope_label: 'Все точки',
  matrix: {
    r_levels: [
      { r_score: 3, label: 'R3', name: 'Свежие',   range: '0–14 дн' },
      { r_score: 2, label: 'R2', name: 'Тёплые',   range: '15–30 дн' },
      { r_score: 1, label: 'R1', name: 'Остывают', range: '31–60 дн' },
      { r_score: 0, label: 'R0', name: 'Потеряны', range: '> 60 дн' },
    ],
    f_levels: [
      { f_score: 1, label: 'F1', name: 'Редкие',  range: '≤ 3 виз.' },
      { f_score: 2, label: 'F2', name: 'Средние', range: '4–5 виз.' },
      { f_score: 3, label: 'F3', name: 'Частые',  range: '6+ виз.' },
    ],
    cells: {
      '3_1': { r_score: 3, f_score: 1, count: 186, pct: 6.5,  segment_id: 31, delta_pct:  4 },
      '3_2': { r_score: 3, f_score: 2, count: 214, pct: 7.5,  segment_id: 32, delta_pct:  6 },
      '3_3': { r_score: 3, f_score: 3, count: 312, pct: 11.0, segment_id: 33, delta_pct: 18 },
      '2_1': { r_score: 2, f_score: 1, count: 241, pct: 8.5,  segment_id: 21, delta_pct: -3 },
      '2_2': { r_score: 2, f_score: 2, count: 198, pct: 7.0,  segment_id: 22, delta_pct:  9 },
      '2_3': { r_score: 2, f_score: 3, count: 163, pct: 5.7,  segment_id: 23, delta_pct: -2 },
      '1_1': { r_score: 1, f_score: 1, count: 152, pct: 5.3,  segment_id: 11, delta_pct: -5 },
      '1_2': { r_score: 1, f_score: 2, count: 128, pct: 4.5,  segment_id: 12, delta_pct: -8 },
      '1_3': { r_score: 1, f_score: 3, count: 145, pct: 5.1,  segment_id: 13, delta_pct: -7 },
      '0_1': { r_score: 0, f_score: 1, count: 198, pct: 7.0,  segment_id:  1, delta_pct:  3 },
      '0_2': { r_score: 0, f_score: 2, count:  94, pct: 3.3,  segment_id:  2, delta_pct: 11 },
      '0_3': { r_score: 0, f_score: 3, count:  76, pct: 2.7,  segment_id:  3, delta_pct: 14 },
    },
  },
  summary: {
    total: 2847, active_r3: 712, at_risk_r1: 425, lost_r0: 198,
    total_delta_pct: 12.4, active_delta_pct: 4, at_risk_delta_pct: -7, lost_delta_pct: 3,
  },
  migrations: [
    { from: 'Лояльные', to: 'Чемпионы', count: 47 },
    { from: 'Растущие', to: 'Лояльные', count: 28 },
    { from: 'VIP риск', to: 'Постоянные', count: 19 },
    { from: 'Спящие',   to: 'Потерянные', count: -34 },
  ],
  branches: [
    { id: 0, name: 'Все точки' },
    { id: 1, name: 'Набережная',  address: 'ул. Набережная, 14',     city: 'Екатеринбург' },
    { id: 2, name: 'Ленина',      address: 'пр. Ленина, 27',          city: 'Екатеринбург' },
    { id: 3, name: 'Кофейня',     address: 'ул. Малышева, 51, ТРЦ',  city: 'Екатеринбург' },
    { id: 4, name: 'Шавуха',      address: 'ул. Куйбышева, 88',       city: 'Екатеринбург' },
    { id: 5, name: 'Шавуха №2',   address: 'ул. Сулимова, 4',         city: 'Екатеринбург' },
  ],
  updated_at: new Date().toISOString(),
};

// ════════════════════════════════════════════════════════════════════
// MOCK для ДОСТАВКИ — другая структура: больше F1 (разовые),
// меньше F3 (постоянных), общий total меньше; точки те же.
// ════════════════════════════════════════════════════════════════════
export const MOCK_DELIVERY: RFMatrixResponse = {
  thresholds: { r_fresh_max: 14, r_warm_max: 30, r_cooling_max: 60, f_rare_max: 3, f_moderate_max: 5 },
  thresholds_source: 'global',
  thresholds_scope_label: 'Все точки · доставка',
  matrix: {
    r_levels: MOCK.matrix.r_levels,
    f_levels: MOCK.matrix.f_levels,
    cells: {
      // Доставка: основной вес в F1 (разовые заказчики)
      '3_1': { r_score: 3, f_score: 1, count: 412, pct: 22.2, segment_id: 131, delta_pct: 14 },
      '3_2': { r_score: 3, f_score: 2, count: 158, pct:  8.5, segment_id: 132, delta_pct:  7 },
      '3_3': { r_score: 3, f_score: 3, count:  86, pct:  4.6, segment_id: 133, delta_pct: 12 },
      '2_1': { r_score: 2, f_score: 1, count: 297, pct: 16.0, segment_id: 121, delta_pct: -2 },
      '2_2': { r_score: 2, f_score: 2, count: 124, pct:  6.7, segment_id: 122, delta_pct:  5 },
      '2_3': { r_score: 2, f_score: 3, count:  72, pct:  3.9, segment_id: 123, delta_pct: -1 },
      '1_1': { r_score: 1, f_score: 1, count: 218, pct: 11.8, segment_id: 111, delta_pct: -6 },
      '1_2': { r_score: 1, f_score: 2, count:  98, pct:  5.3, segment_id: 112, delta_pct: -9 },
      '1_3': { r_score: 1, f_score: 3, count:  41, pct:  2.2, segment_id: 113, delta_pct: -4 },
      '0_1': { r_score: 0, f_score: 1, count: 234, pct: 12.6, segment_id: 101, delta_pct:  6 },
      '0_2': { r_score: 0, f_score: 2, count:  82, pct:  4.4, segment_id: 102, delta_pct:  9 },
      '0_3': { r_score: 0, f_score: 3, count:  32, pct:  1.7, segment_id: 103, delta_pct:  3 },
    },
  },
  summary: {
    total: 1854, active_r3: 656, at_risk_r1: 357, lost_r0: 348,
    total_delta_pct: 8.7, active_delta_pct: 11, at_risk_delta_pct: -5, lost_delta_pct: 6,
  },
  migrations: [
    { from: 'Новички',    to: 'Растущие',  count: 38 },
    { from: 'Растущие',   to: 'Лояльные',  count: 12 },
    { from: 'Постоянные', to: 'VIP риск',  count: -8 },
    { from: 'Спящие',     to: 'Потерянные', count: -27 },
  ],
  branches: MOCK.branches,
  updated_at: new Date().toISOString(),
};

export const MOCK_GUESTS: Guest[] = [
  { vk_id: '128493022', first_name: 'Анна',     last_name: 'Иванова',    last_visit: '12 апр',  frequency: 8,  recency_days: 22, coins: 340 },
  { vk_id: '203845611', first_name: 'Дмитрий',  last_name: 'Соколов',    last_visit: '08 апр',  frequency: 12, recency_days: 26, coins: 540 },
  { vk_id: '187234509', first_name: 'Екатерина',last_name: 'Морозова',   last_visit: '02 апр',  frequency: 6,  recency_days: 32, coins: 220 },
  { vk_id: '129003721', first_name: 'Игорь',    last_name: 'Никитин',    last_visit: '28 мар',  frequency: 15, recency_days: 37, coins: 690 },
  { vk_id: '210394577', first_name: 'Ольга',    last_name: 'Васильева',  last_visit: '21 мар',  frequency: 4,  recency_days: 44, coins: 160 },
  { vk_id: '155002384', first_name: 'Михаил',   last_name: 'Петров',     last_visit: '18 мар',  frequency: 9,  recency_days: 47, coins: 410 },
  { vk_id: '301488721', first_name: 'Светлана', last_name: 'Кузнецова',  last_visit: '15 мар',  frequency: 7,  recency_days: 50, coins: 280 },
  { vk_id: '274300912', first_name: 'Алексей',  last_name: 'Лебедев',    last_visit: '11 мар',  frequency: 11, recency_days: 54, coins: 460 },
  { vk_id: '199003841', first_name: 'Татьяна',  last_name: 'Новикова',   last_visit: '07 мар',  frequency: 5,  recency_days: 58, coins: 190 },
  { vk_id: '266501823', first_name: 'Кирилл',   last_name: 'Орлов',      last_visit: '03 мар',  frequency: 13, recency_days: 62, coins: 580 },
  { vk_id: '345782901', first_name: 'Юлия',     last_name: 'Смирнова',   last_visit: '27 фев',  frequency: 3,  recency_days: 66, coins: 110 },
  { vk_id: '198772341', first_name: 'Артём',    last_name: 'Романов',    last_visit: '22 фев',  frequency: 10, recency_days: 71, coins: 430 },
  { vk_id: '204477332', first_name: 'Мария',    last_name: 'Громова',    last_visit: '17 фев',  frequency: 6,  recency_days: 76, coins: 240 },
  { vk_id: '301029488', first_name: 'Никита',   last_name: 'Жуков',      last_visit: '12 фев',  frequency: 14, recency_days: 81, coins: 620 },
  { vk_id: '278443210', first_name: 'Алина',    last_name: 'Беляева',    last_visit: '08 фев',  frequency: 4,  recency_days: 85, coins: 170 },
];

// ════════════════════════════════════════════════════════════════════
// MOCK REVIEWS — 18 отзывов с миксом тональностей и источников
// ════════════════════════════════════════════════════════════════════
const now = Date.now();
const minAgo = (n: number) => new Date(now - n * 60_000).toISOString();
const hrAgo = (n: number) => new Date(now - n * 3_600_000).toISOString();
const daysAgo = (n: number) => new Date(now - n * 86_400_000).toISOString();

export const MOCK_REVIEWS: Review[] = [
  {
    id: 1, source: 'VK_MESSAGE', sentiment: 'NEGATIVE',
    ai_comment: 'Гость недоволен временем ожидания заказа и холодной едой. Требует возврата.',
    branch_id: 1, branch_name: 'Набережная',
    customer_name: 'Дмитрий Соколов', vk_sender_id: '203845611',
    text: 'Ждал свою пасту 40 минут, принесли уже холодную. Сейчас бы вернуть деньги, иначе пишу в Роспотребнадзор.',
    last_message_at: minAgo(8), has_unread: true, is_replied: false,
    has_draft: true, draft_created_at: minAgo(7),
    draft_text: 'Дмитрий, искренне извиняемся за такую ситуацию. Я уже связался с управляющим — оформим возврат и приготовим вам пасту за счёт заведения, когда удобно зайти. Напишите подходящее время — менеджер встретит лично.',
    presence: [
      { staff_id: 2, staff_name: 'Ольга Петрова', state: 'typing', since: minAgo(1) },
    ],
  },
  {
    id: 2, source: 'APP', sentiment: 'NEGATIVE',
    ai_comment: 'Низкая оценка из-за грязного стола. Упоминается персонал.',
    branch_id: 2, branch_name: 'Ленина',
    customer_name: 'Анна Иванова',
    text: 'Стол не убрали после прошлых гостей. Официант сказал «потом», и уже минут 15 не подошёл.',
    rating: 2,
    last_message_at: minAgo(35), has_unread: true, is_replied: false,
  },
  {
    id: 3, source: 'VK_MESSAGE', sentiment: 'PENDING',
    ai_comment: '',
    branch_id: 3, branch_name: 'Кофейня',
    customer_name: 'VK 187234509', vk_sender_id: '187234509',
    text: 'Здравствуйте! А у вас можно бронь стола на 4 человека на пятницу 19:00?',
    last_message_at: minAgo(52), has_unread: true, is_replied: false,
    has_draft: true, draft_created_at: minAgo(50),
    draft_text: 'Здравствуйте! Конечно, забронируем стол на 4 человек в пятницу к 19:00. Уточните, пожалуйста, на какое имя оформлять и есть ли пожелания (у окна, у бара, тихий зал).',
  },
  {
    id: 4, source: 'VK_MESSAGE', sentiment: 'POSITIVE',
    ai_comment: 'Высокая оценка, гость хвалит пасту карбонара и обслуживание.',
    branch_id: 1, branch_name: 'Набережная', vk_sender_id: '111222333',
    customer_name: 'Екатерина Морозова',
    text: 'Лучшая карбонара в городе! Официант Андрей очень внимательный — спасибо.',
    rating: 5,
    last_message_at: hrAgo(2), has_unread: true, is_replied: false,
    review_link_yandex: 'https://clck.ru/3UAbca', review_link_2gis: 'https://clck.ru/3UAbyD',
  },
  {
    id: 5, source: 'VK_MESSAGE', sentiment: 'PARTIALLY_NEGATIVE',
    ai_comment: 'Положительные впечатления от еды, но недовольство громкой музыкой.',
    branch_id: 4, branch_name: 'Шавуха',
    customer_name: 'Игорь Никитин', vk_sender_id: '129003721',
    text: 'Шаурма топ, но музыка такая громкая, что разговаривать невозможно. Сделайте потише вечером.',
    last_message_at: hrAgo(3), has_unread: false, is_replied: true,
    messages: [
      { id: 501, source: 'VK_MESSAGE', text: 'Шаурма топ, но музыка такая громкая, что разговаривать невозможно. Сделайте потише вечером.', created_at: hrAgo(6) },
      { id: 502, source: 'ADMIN_REPLY', text: 'Игорь, спасибо за обратную связь — действительно вечером плеер крутили громче. Передал диджею: после 19:00 убавим на 20%. Заходите ещё, попробуйте новую шаурму с уткой!', created_at: hrAgo(5), admin_name: 'Ольга Петрова' },
      { id: 503, source: 'VK_MESSAGE', text: 'Спасибо! Проверю в эту пятницу.', created_at: hrAgo(3) },
    ],
  },
  {
    id: 6, source: 'APP', sentiment: 'POSITIVE',
    ai_comment: 'Гость доволен скоростью доставки и упаковкой.',
    branch_id: 2, branch_name: 'Ленина',
    customer_name: 'Михаил Петров',
    text: 'Доставка приехала за 25 минут, всё горячее, упаковка не промокла. Отлично!',
    rating: 5,
    last_message_at: hrAgo(5), has_unread: false, is_replied: false,
  },
  {
    id: 7, source: 'VK_MESSAGE', sentiment: 'NEGATIVE',
    ai_comment: 'Жалоба на ошибку в заказе и грубость менеджера на телефоне.',
    branch_id: 5, branch_name: 'Шавуха №2',
    customer_name: 'Ольга Васильева', vk_sender_id: '210394577',
    text: 'Заказ привезли неправильный — вместо курицы говядина. Менеджер по телефону начал спорить, что я сама ошиблась.',
    last_message_at: hrAgo(7), has_unread: true, is_replied: false,
    has_draft: true, draft_created_at: hrAgo(7),
    draft_text: 'Ольга, очень жаль, что так вышло — это наша ошибка. Сегодня перевезём вам правильный заказ за наш счёт + комплимент от шефа. Менеджеру передам отдельно — такой реакции быть не должно. Удобно сегодня вечером с 18:00?',
    presence: [
      { staff_id: 3, staff_name: 'Дмитрий Соколов', state: 'viewing', since: minAgo(2) },
    ],
  },
  {
    id: 8, source: 'APP', sentiment: 'NEUTRAL',
    ai_comment: 'Нейтральная оценка без яркого впечатления.',
    branch_id: 1, branch_name: 'Набережная',
    customer_name: 'Светлана Кузнецова',
    text: 'Нормально. Поел, ушёл.',
    rating: 3,
    last_message_at: hrAgo(9), has_unread: false, is_replied: false,
  },
  {
    id: 9, source: 'VK_MESSAGE', sentiment: 'POSITIVE',
    ai_comment: 'Гость благодарит за помощь с особым заказом для аллергика.',
    branch_id: 3, branch_name: 'Кофейня',
    customer_name: 'Алексей Лебедев', vk_sender_id: '274300912',
    text: 'Ребята, спасибо что без молочки сделали — у дочки аллергия. Очень порадовали внимательностью!',
    last_message_at: hrAgo(14), has_unread: false, is_replied: true,
    messages: [
      { id: 901, source: 'VK_MESSAGE', text: 'Ребята, спасибо что без молочки сделали — у дочки аллергия. Очень порадовали внимательностью!', created_at: hrAgo(16) },
      { id: 902, source: 'ADMIN_REPLY', text: 'Алексей, очень рады что попробовали — у нас есть отдельная веган-карта (овсяное, кокосовое, миндальное молоко, без следов молочных). Если будете в следующий раз — попросите бариста, отдельно покажет.', created_at: hrAgo(14), admin_name: 'Ольга Петрова' },
    ],
  },
  {
    id: 10, source: 'APP', sentiment: 'POSITIVE',
    ai_comment: 'Гость в восторге от десертов.',
    branch_id: 3, branch_name: 'Кофейня',
    customer_name: 'Татьяна Новикова',
    text: 'Чизкейк просто бомба 🍰 муж попросил повторить — пришли ещё раз вечером!',
    rating: 5,
    last_message_at: hrAgo(20), has_unread: false, is_replied: false,
  },
  {
    id: 11, source: 'VK_MESSAGE', sentiment: 'PENDING',
    ai_comment: '',
    branch_id: 2, branch_name: 'Ленина',
    customer_name: 'VK 266501823', vk_sender_id: '266501823',
    text: 'У вас в меню есть безлактозное молоко для капучино?',
    last_message_at: daysAgo(1), has_unread: true, is_replied: false,
    has_draft: true, draft_created_at: daysAgo(1),
    draft_text: 'Здравствуйте! Да, есть овсяное и соевое — доплата 50₽. Просто скажите бариста при заказе «капучино на овсяном» (или соевом), и сделают.',
  },
  {
    id: 12, source: 'APP', sentiment: 'PARTIALLY_NEGATIVE',
    ai_comment: 'Хорошая еда, но долго ждали официанта.',
    branch_id: 1, branch_name: 'Набережная',
    customer_name: 'Юлия Смирнова',
    text: 'Еда вкусная, но 20 минут ждали пока официант примет заказ. В будний день, в обед — это много.',
    rating: 3,
    last_message_at: daysAgo(1), has_unread: false, is_replied: true,
  },
  {
    id: 13, source: 'VK_MESSAGE', sentiment: 'POSITIVE',
    ai_comment: 'Постоянный гость хвалит атмосферу и поваров.',
    branch_id: 1, branch_name: 'Набережная',
    customer_name: 'Артём Романов', vk_sender_id: '198772341',
    text: 'Хожу к вам каждую субботу третий месяц. Ребята-повара — топ! Привет шефу 🙌',
    last_message_at: daysAgo(2), has_unread: false, is_replied: true,
  },
  {
    id: 14, source: 'APP', sentiment: 'NEGATIVE',
    ai_comment: 'Жалоба на завышение цены в чеке.',
    branch_id: 4, branch_name: 'Шавуха',
    customer_name: 'Мария Громова',
    text: 'В меню одна цена, в чеке другая. Разница 80 рублей. Так и не разобрались с официанткой.',
    rating: 1,
    last_message_at: daysAgo(2), has_unread: false, is_replied: false,
  },
  {
    id: 15, source: 'VK_MESSAGE', sentiment: 'SPAM',
    ai_comment: 'Спам с рекламой стороннего сервиса.',
    branch_id: 1, branch_name: 'Набережная',
    customer_name: 'VK 999111222', vk_sender_id: '999111222',
    text: 'Зарабатывай от 5000 в день! Подробности в личке.',
    last_message_at: daysAgo(3), has_unread: false, is_replied: false,
  },
  {
    id: 16, source: 'APP', sentiment: 'POSITIVE',
    ai_comment: 'Гость отмечает обновлённое меню.',
    branch_id: 5, branch_name: 'Шавуха №2',
    customer_name: 'Никита Жуков',
    text: 'Новое сезонное меню огонь! Особенно лосось — пожалуйста, оставьте в постоянке.',
    rating: 5,
    last_message_at: daysAgo(4), has_unread: false, is_replied: false,
  },
  {
    id: 17, source: 'VK_MESSAGE', sentiment: 'NEUTRAL',
    ai_comment: 'Уточнение режима работы.',
    branch_id: 3, branch_name: 'Кофейня',
    customer_name: 'Алина Беляева', vk_sender_id: '278443210',
    text: 'Подскажите, до скольки сегодня работаете?',
    last_message_at: daysAgo(5), has_unread: false, is_replied: true,
  },
  {
    id: 18, source: 'APP', sentiment: 'POSITIVE',
    ai_comment: 'Семейный гость, отмечает детское меню.',
    branch_id: 2, branch_name: 'Ленина',
    customer_name: 'Кирилл Орлов',
    text: 'Большое спасибо за детское меню и раскраски! Сын был счастлив весь обед :)',
    rating: 5,
    last_message_at: daysAgo(6), has_unread: false, is_replied: false,
  },
];

// Фильтр-категории для отзывов (Telegram-folders style)
export type ReviewFilterChip = { key: import('./types').ReviewFilterKey; label: string; emoji?: string };
export const REVIEW_FILTERS: ReviewFilterChip[] = [
  { key: 'all',      label: 'Все' },
  { key: 'draft',    label: 'Черновики', emoji: '🤖' },
  { key: 'pending',  label: 'Ожидают',   emoji: '⏳' },
  { key: 'negative', label: 'Негатив',   emoji: '🔥' },
  { key: 'replied',  label: 'Отвечено',  emoji: '✅' },
  { key: 'app',      label: 'APP',       emoji: '⭐' },
];

export const inReviewFilter = (rev: Review, key: import('./types').ReviewFilterKey): boolean => {
  if (key === 'all') return true;
  if (key === 'draft') return !!rev.has_draft && !rev.is_replied;
  if (key === 'negative') return rev.sentiment === 'NEGATIVE' || rev.sentiment === 'PARTIALLY_NEGATIVE';
  if (key === 'pending') return rev.has_unread && !rev.is_replied;
  if (key === 'replied') return rev.is_replied;
  if (key === 'app') return rev.source === 'APP';
  return true;
};

// ════════════════════════════════════════════════════════════════════
// AUTO-REPLY SETTINGS — дефолты
// ════════════════════════════════════════════════════════════════════
export const DEFAULT_AUTO_REPLY_SETTINGS: AutoReplySettings = {
  enabled: true,
  sentiment_enabled: {
    POSITIVE: true,
    NEGATIVE: true,
    PARTIALLY_NEGATIVE: true,
    NEUTRAL: true,
    PENDING: true,
    // SPAM не входит в тип — всегда выключен
  },
  branch_enabled: { 1: true, 2: true, 3: true, 4: true, 5: true },
  reminder_minutes: 60,
  ai_tone: 'friendly',
};

export const REMINDER_OPTIONS: { value: import('./types').ReminderMinutes; label: string }[] = [
  { value: 30,  label: '30 мин' },
  { value: 60,  label: '1 час' },
  { value: 180, label: '3 часа' },
  { value: 720, label: '12 часов' },
];

export const TONE_OPTIONS: { value: import('./types').AiTone; label: string }[] = [
  { value: 'formal',   label: 'Формальный' },
  { value: 'friendly', label: 'Дружелюбный' },
  { value: 'neutral',  label: 'Нейтральный' },
];

// ════════════════════════════════════════════════════════════════════
// CHAT — менеджер + первоначальная переписка + quick-replies
// ════════════════════════════════════════════════════════════════════
export const MOCK_MANAGER: ChatManager = {
  id: 1,
  name: 'Анна Соколова',
  role: 'Ваш менеджер',
  online: true,
  last_seen: new Date(Date.now() - 2 * 60_000).toISOString(),
  phone: '+79912345678',
  work_hours: 'Пн–Пт 10:00–19:00 МСК',
};

const _now = Date.now();
const _hAgo = (h: number) => new Date(_now - h * 3_600_000).toISOString();
const _mAgo = (m: number) => new Date(_now - m * 60_000).toISOString();

export const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: 1, sender: 'manager',
    text: 'Здравствуйте! Я Анна, ваш менеджер от ЛоялUP 👋 Если будут вопросы по работе с приложением — пишите, я на связи в рабочие дни 10:00–19:00.',
    created_at: _hAgo(28), status: 'read',
  },
  {
    id: 2, sender: 'user',
    text: 'Здравствуйте! А можно подключить ещё одну точку?',
    created_at: _hAgo(4), status: 'read',
  },
  {
    id: 3, sender: 'manager',
    text: 'Конечно! Подскажите, в каком городе и какое название?',
    created_at: _hAgo(4), status: 'read',
  },
  {
    id: 4, sender: 'user',
    text: 'Кофейня «Рассвет», Екатеринбург 🌅',
    created_at: _hAgo(3), status: 'read',
  },
  {
    id: 5, sender: 'manager',
    text: 'Принял! Подключу в течение 24 часов и пришлю логин/пароль на email. Что-то ещё?',
    created_at: _hAgo(3), status: 'read',
  },
  {
    id: 6, sender: 'user',
    text: 'Спасибо! Пока всё 🙌',
    created_at: _hAgo(3), status: 'read',
  },
  {
    id: 7, sender: 'manager',
    text: 'Кстати, обратите внимание — мы только что выкатили автоответы по отзывам. AI готовит черновик, вы подтверждаете отправку. Глянете в «Ещё → Автоответы»?',
    created_at: _mAgo(8), status: 'delivered',
  },
];

export const QUICK_REPLIES: string[] = [
  'Помогите с настройкой автоответов',
  'Вопрос по тарифу',
  'Нашёл баг',
  'Как добавить точку',
  'Спасибо!',
];

// ════════════════════════════════════════════════════════════════════
// CAMPAIGNS — история рассылок
// ════════════════════════════════════════════════════════════════════
const __cnow = Date.now();
const __cd = (n: number) => new Date(__cnow - n * 86_400_000).toISOString();
const __ch = (n: number) => new Date(__cnow - n * 3_600_000).toISOString();

export const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: 1, segment_key: '1_3', segment_name: 'VIP риск', segment_emoji: '🚨',
    sent_at: __ch(2), total_sent: 138, total_target: 145,
    message_text: 'Светлана, мы вас давно не видели — соскучились! От шефа подарок к ужину: попробуйте новый тартар на этой неделе. Бронь по этому сообщению.',
    status: 'sent', channel: 'vk',
  },
  {
    id: 2, segment_key: '3_3', segment_name: 'Чемпионы', segment_emoji: '🏆',
    sent_at: __cd(1), total_sent: 304, total_target: 312,
    message_text: 'Только для наших — ранний доступ к сезонному меню до 18:00 в эту субботу. Покажите это сообщение официанту 🍷',
    status: 'sent', channel: 'vk',
  },
  {
    id: 3, segment_key: '1_2', segment_name: 'Спящие', segment_emoji: '😴',
    sent_at: __cd(2), total_sent: 121, total_target: 128,
    message_text: 'Скучаем! Возвращайтесь — −20% на любой заказ до конца недели. Просто покажите это сообщение.',
    image_uri: 'https://placehold.co/600x400/png',
    status: 'sent', channel: 'vk',
  },
  {
    id: 4, segment_key: '2_1', segment_name: 'Потенциал', segment_emoji: '🌤',
    sent_at: __cd(4), total_sent: 0, total_target: 241,
    message_text: 'Купон на горячий обед действует 7 дней. Заходите в любой будний день — стол ждёт.',
    status: 'failed', channel: 'vk',
  },
  {
    id: 5, segment_key: '3_2', segment_name: 'Лояльные', segment_emoji: '⭐',
    sent_at: __cd(6), total_sent: 211, total_target: 214,
    message_text: 'Новинки в меню: севиче из лосося и лимончелло. Покажите сообщение — десерт в подарок к новому блюду.',
    status: 'sent', channel: 'vk',
  },
  {
    id: 6, segment_key: '0_3', segment_name: 'Не теряем', segment_emoji: '💔',
    sent_at: __cd(8), total_sent: 71, total_target: 76,
    message_text: 'Дмитрий, лично от управляющего: хочу пригласить вас на дегустацию нового сезонного меню в четверг 19:00. Я буду на месте, встретим лично.',
    status: 'sent', channel: 'vk',
  },
  {
    id: 7, segment_key: '2_2', segment_name: 'Растущие', segment_emoji: '📈',
    sent_at: __cd(10), total_sent: 195, total_target: 198,
    message_text: 'Бонус за 4-й визит: фирменный десерт от шефа в подарок. Просто приходите — баристы знают.',
    status: 'sent', channel: 'vk',
  },
  {
    id: 8, segment_key: '3_1', segment_name: 'Новички', segment_emoji: '🌱',
    sent_at: __cd(14), total_sent: 178, total_target: 186,
    message_text: 'Спасибо что заглянули! Бонус для второго визита — подарок к любому горячему до конца месяца.',
    status: 'sent', channel: 'vk',
  },
  // ── A/B-тесты для демо ─────────────────────────────────────────────
  {
    id: 9, segment_key: '2_2', segment_name: 'Растущие · A/B', segment_emoji: '🧪',
    sent_at: __cd(3), total_sent: 198, total_target: 204,
    message_text: '',
    status: 'sent', channel: 'vk',
    gender_filter: 'all',
    variants: [
      {
        label: 'A', percent: 50, sent_count: 99,
        text: 'Бонус за 4-й визит: фирменный десерт от шефа в подарок. Просто приходите — баристы знают 🍰',
        response_rate: 14.1,
      },
      {
        label: 'B', percent: 50, sent_count: 99,
        text: 'Заходите в среду — десерт от шефа за наш счёт к любому горячему. До конца недели.',
        response_rate: 9.7,
      },
    ],
  },
  {
    id: 10, segment_key: '1_2', segment_name: 'Спящие · A/B (♀)', segment_emoji: '🧪',
    sent_at: __cd(7), total_sent: 87, total_target: 90,
    message_text: '',
    status: 'sent', channel: 'vk',
    gender_filter: 'female',
    variants: [
      {
        label: 'A', percent: 70, sent_count: 61,
        text: 'Скучаем! −20% на любой заказ до конца недели. Просто покажите это сообщение.',
        response_rate: 22.3,
      },
      {
        label: 'B', percent: 30, sent_count: 26,
        text: 'Бесплатный кофе к любому десерту — на этой неделе. Хорошего дня ☕',
        response_rate: 11.5,
      },
    ],
  },
];

// ════════════════════════════════════════════════════════════════════
// PROFILE — текущий пользователь
// ════════════════════════════════════════════════════════════════════
export const MOCK_PROFILE: Profile = {
  id: 1,
  full_name: 'Иванов Александр Сергеевич',
  role: 'owner',
  role_label: 'Владелец',
  is_superadmin: true,
  city: 'Екатеринбург',
  birthday: '1988-04-12',
  birthday_set_at: new Date('2024-08-15T10:30:00Z').toISOString(),
  email: 'a.ivanov@example.ru',
  phone: '+79912345678',
  branch_ids: [1, 2, 3, 4, 5],
};

// ════════════════════════════════════════════════════════════════════
// STAFF — сотрудники с правами доступа
// ════════════════════════════════════════════════════════════════════
const _staffNow = new Date();
const _daysAgo = (n: number) => new Date(_staffNow.getTime() - n * 86_400_000).toISOString();
const _hrsAgo  = (n: number) => new Date(_staffNow.getTime() - n * 3_600_000).toISOString();

const PERMS_OWNER: StaffPermissions = {
  see_analytics: true, see_reviews: true, see_broadcasts: true,
  see_guests: true, see_branches: true, edit_thresholds: true,
  reply_reviews: true, send_broadcasts: true, manage_staff: true, edit_profile: true,
  manage_catalog: true, manage_quests: true, manage_promotions: true, adjust_coins: true,
};
const PERMS_MANAGER: StaffPermissions = {
  see_analytics: true, see_reviews: true, see_broadcasts: true,
  see_guests: true, see_branches: true, edit_thresholds: false,
  reply_reviews: true, send_broadcasts: true, manage_staff: false, edit_profile: true,
  manage_catalog: true, manage_quests: true, manage_promotions: true, adjust_coins: false,
};
const PERMS_VIEWER: StaffPermissions = {
  see_analytics: false, see_reviews: true, see_broadcasts: false,
  see_guests: false, see_branches: true, edit_thresholds: false,
  reply_reviews: false, send_broadcasts: false, manage_staff: false, edit_profile: false,
  manage_catalog: false, manage_quests: false, manage_promotions: false, adjust_coins: false,
};

export const DEFAULT_PERMS_BY_ROLE: Record<'owner' | 'manager' | 'viewer', StaffPermissions> = {
  owner:   PERMS_OWNER,
  manager: PERMS_MANAGER,
  viewer:  PERMS_VIEWER,
};

export const MOCK_STAFF: Staff[] = [
  {
    id: 1, full_name: 'Иванов Александр Сергеевич',
    role: 'owner', role_label: 'Владелец',
    email: 'a.ivanov@example.ru', phone: '+79912345678',
    active: true, permissions: PERMS_OWNER,
    branch_ids: [], invited_at: _daysAgo(180), last_active_at: _hrsAgo(1),
  },
  {
    id: 2, full_name: 'Петрова Ольга Викторовна',
    role: 'manager', role_label: 'Управляющий',
    email: 'o.petrova@example.ru', phone: '+79215557788',
    active: true, permissions: PERMS_MANAGER,
    branch_ids: [1, 2], invited_at: _daysAgo(120), last_active_at: _hrsAgo(3),
  },
  {
    id: 3, full_name: 'Соколов Дмитрий',
    role: 'manager', role_label: 'Управляющий',
    email: 'd.sokolov@example.ru', phone: '+79121113344',
    active: true, permissions: { ...PERMS_MANAGER, send_broadcasts: false },
    branch_ids: [3], invited_at: _daysAgo(60), last_active_at: _daysAgo(1),
  },
  {
    id: 4, full_name: 'Зайцева Мария',
    role: 'viewer', role_label: 'Просмотр',
    email: 'm.zaytseva@example.ru',
    active: true, permissions: PERMS_VIEWER,
    branch_ids: [4, 5], invited_at: _daysAgo(30), last_active_at: _daysAgo(5),
  },
  {
    id: 5, full_name: 'Кузнецов Илья',
    role: 'manager', role_label: 'Управляющий',
    email: 'i.kuznetsov@example.ru',
    active: false, permissions: PERMS_MANAGER,
    branch_ids: [4], invited_at: _daysAgo(15),
  },
];

// ════════════════════════════════════════════════════════════════════
// SUBSCRIPTION — статус оплаты тарифа
// ════════════════════════════════════════════════════════════════════
export const MOCK_SUBSCRIPTION: SubscriptionStatus = {
  plan: 'standard',
  plan_label: 'Стандарт',
  price_rub: 4900,
  // Через 5 дней — попадает в окно «за 7 дней до» → reminder активен
  next_payment_at: new Date(_staffNow.getTime() + 5 * 86_400_000).toISOString(),
  paid_until:      new Date(_staffNow.getTime() + 5 * 86_400_000).toISOString(),
  auto_pay_enabled: false,
};

// ════════════════════════════════════════════════════════════════════
// FULL MIGRATIONS — расширенный список (12+ записей) для отдельного экрана
// ════════════════════════════════════════════════════════════════════
export const MOCK_FULL_MIGRATIONS: RFMigration[] = [
  { from: 'Лояльные',   to: 'Чемпионы',   count:  47 },
  { from: 'Растущие',   to: 'Лояльные',   count:  28 },
  { from: 'VIP риск',   to: 'Постоянные', count:  19 },
  { from: 'Новички',    to: 'Растущие',   count:  41 },
  { from: 'Потенциал',  to: 'Растущие',   count:  22 },
  { from: 'Постоянные', to: 'Чемпионы',   count:  16 },
  { from: 'Угасают',    to: 'Потенциал',  count:  11 },
  { from: 'Спящие',     to: 'Потерянные', count: -34 },
  { from: 'Чемпионы',   to: 'Лояльные',   count: -18 },
  { from: 'Лояльные',   to: 'Постоянные', count: -12 },
  { from: 'Растущие',   to: 'Угасают',    count:  -9 },
  { from: 'VIP риск',   to: 'Не теряем',  count:  -7 },
  { from: 'Новички',    to: 'Угасают',    count:  -6 },
  { from: 'Уходят',     to: 'Потерянные', count: -23 },
  { from: 'Потерянные', to: 'Архив',      count: -41 },
];

// ════════════════════════════════════════════════════════════════════
// GUEST DETAILS — расширенные карточки гостей
// ════════════════════════════════════════════════════════════════════
const _gd_now = Date.now();
const _gd_d = (n: number) => new Date(_gd_now - n * 86_400_000).toISOString();
const _gd_h = (n: number) => new Date(_gd_now - n * 3_600_000).toISOString();

// Деталки на каждого из MOCK_GUESTS — используются по vk_id
export const MOCK_GUEST_DETAILS: Record<string, GuestDetail> = {
  '203845611': {
    vk_id: '203845611',
    first_name: 'Дмитрий', last_name: 'Соколов',
    phone: '+79121234567', birthday: '1989-07-22',
    registered_at: _gd_d(420),
    recency_days: 3, frequency: 14, coins_balance: 1240,
    total_earned: 4860, total_spent: 3620,
    segment_key: '3_3', segment_emoji: '🏆', segment_name: 'Чемпионы',
    vk_status: { is_subscribed_community: true, is_subscribed_newsletter: true, is_blocked: false, last_seen_at: _gd_h(3) },
    recent_visits: [
      { id: 1, branch_id: 1, branch_name: 'Набережная', visited_at: _gd_d(3),  table_number: 7 },
      { id: 2, branch_id: 1, branch_name: 'Набережная', visited_at: _gd_d(12), table_number: 4 },
      { id: 3, branch_id: 2, branch_name: 'Ленина',     visited_at: _gd_d(28) },
      { id: 4, branch_id: 1, branch_name: 'Набережная', visited_at: _gd_d(45) },
    ],
    recent_txns: [
      { id: 11, type: 'EARN',  source: 'QR_SCAN',  amount:  +150, balance_after: 1240, description: 'QR в Набережной',         created_at: _gd_d(3) },
      { id: 12, type: 'SPEND', source: 'PURCHASE', amount:  -500, balance_after: 1090, description: 'Десерт в подарок (магазин)', created_at: _gd_d(12) },
      { id: 13, type: 'EARN',  source: 'GAME',     amount:  +200, balance_after: 1590, description: 'Победа в игре',           created_at: _gd_d(12) },
      { id: 14, type: 'EARN',  source: 'STORY',    amount:  +100, balance_after: 1390, description: 'История в ВК',            created_at: _gd_d(20) },
      { id: 15, type: 'SPEND', source: 'PURCHASE', amount: -1000, balance_after: 1290, description: 'Сертификат 1000₽',         created_at: _gd_d(35) },
    ],
    prizes_received: 12, prizes_activated: 9, reviews_count: 3,
  },
  '187234509': {
    vk_id: '187234509',
    first_name: 'Анна', last_name: 'Иванова',
    phone: '+79991112233', birthday: '1992-03-14',
    registered_at: _gd_d(180),
    recency_days: 0, frequency: 8, coins_balance: 540,
    total_earned: 1820, total_spent: 1280,
    segment_key: '3_2', segment_emoji: '⭐', segment_name: 'Лояльные',
    vk_status: { is_subscribed_community: true, is_subscribed_newsletter: false, is_blocked: false, last_seen_at: _gd_h(0.5) },
    recent_visits: [
      { id: 5, branch_id: 2, branch_name: 'Ленина', visited_at: _gd_h(2) },
      { id: 6, branch_id: 2, branch_name: 'Ленина', visited_at: _gd_d(5) },
      { id: 7, branch_id: 2, branch_name: 'Ленина', visited_at: _gd_d(14) },
    ],
    recent_txns: [
      { id: 21, type: 'EARN',  source: 'QR_SCAN', amount: +120, balance_after:  540, description: 'QR в Ленина',     created_at: _gd_h(2) },
      { id: 22, type: 'EARN',  source: 'GAME',    amount: +200, balance_after:  420, description: 'Победа в игре',  created_at: _gd_d(5) },
      { id: 23, type: 'SPEND', source: 'PURCHASE',amount: -300, balance_after:  220, description: 'Кофе из магазина', created_at: _gd_d(14) },
    ],
    prizes_received: 6, prizes_activated: 5, reviews_count: 1,
  },
  '129003721': {
    vk_id: '129003721',
    first_name: 'Игорь', last_name: 'Никитин',
    phone: '+79051234599',
    registered_at: _gd_d(95),
    recency_days: 2, frequency: 5, coins_balance: 380,
    total_earned: 980, total_spent: 600,
    segment_key: '2_2', segment_emoji: '📈', segment_name: 'Растущие',
    vk_status: { is_subscribed_community: true, is_subscribed_newsletter: true, is_blocked: false, last_seen_at: _gd_h(8) },
    recent_visits: [
      { id: 8, branch_id: 4, branch_name: 'Шавуха', visited_at: _gd_d(2) },
      { id: 9, branch_id: 4, branch_name: 'Шавуха', visited_at: _gd_d(18) },
    ],
    recent_txns: [
      { id: 31, type: 'EARN',  source: 'QR_SCAN', amount: +100, balance_after: 380, description: 'QR в Шавухе',  created_at: _gd_d(2) },
      { id: 32, type: 'SPEND', source: 'PURCHASE',amount: -300, balance_after: 280, description: 'Соус в магазине', created_at: _gd_d(8) },
    ],
    prizes_received: 3, prizes_activated: 2, reviews_count: 2,
  },
};

// Получить деталку для гостя — fallback из базового Guest
export function buildGuestDetailFromGuest(g: Guest): GuestDetail {
  const cached = MOCK_GUEST_DETAILS[g.vk_id];
  if (cached) return cached;
  // fallback — синтезируем минимум из базовых полей
  return {
    vk_id: g.vk_id,
    first_name: g.first_name, last_name: g.last_name,
    registered_at: _gd_d(60 + g.frequency * 5),
    recency_days: g.recency_days, frequency: g.frequency, coins_balance: g.coins,
    total_earned: g.coins + Math.round(g.coins * 1.4),
    total_spent: Math.round(g.coins * 1.4),
    vk_status: { is_subscribed_community: true, is_subscribed_newsletter: g.frequency > 3, is_blocked: false },
    recent_visits: [{
      id: 1, branch_id: 1, branch_name: 'Набережная', visited_at: _gd_d(g.recency_days),
    }],
    recent_txns: [{
      id: 1, type: 'EARN', source: 'QR_SCAN',
      amount: 100, balance_after: g.coins,
      description: 'QR-сканирование',
      created_at: _gd_d(g.recency_days),
    }],
    prizes_received: Math.floor(g.frequency * 0.7),
    prizes_activated: Math.floor(g.frequency * 0.5),
    reviews_count: g.frequency > 5 ? 1 : 0,
  };
}

// ════════════════════════════════════════════════════════════════════
// GENERAL STATS — сводные метрики (как /analytics/ в вебе)
// ════════════════════════════════════════════════════════════════════
export const MOCK_GENERAL_STATS: GeneralStats = {
  qr_scans:                    1842,
  total_scans:                 2410,
  cafe_scans:                  2280,
  delivery_scans:               130,
  game_reached:                2190,
  total_vk_subscribers:        4127,
  new_community_subscribers:    156,
  new_newsletter_subscribers:   148,
  community_subs_cafe:          120,
  community_subs_delivery:       18,
  community_subs_story:          15,
  community_subs_other:           3,
  newsletter_subs_cafe:         118,
  newsletter_subs_delivery:      16,
  newsletter_subs_story:         12,
  newsletter_subs_other:          2,
  new_group_with_gift:           93,

  repeat_game_players:          427,
  coin_purchasers:              211,
  first_gift_receivers:         182,
  gift_activators:              167,

  birthday_greetings_sent:       58,
  birthday_celebrants:           34,

  message_open_rate:             71.4,
  message_total_sent:           2340,
  message_total_read:           1671,

  vk_stories_publishers:        118,
  stories_referrals:             67,

  pos_guests:                   2410,
  scan_index:                    76.4,

  period_label:                'За 30 дней',
  start_date:                  _gd_d(30).slice(0, 10),
  end_date:                    _gd_d(0).slice(0, 10),
};

// ════════════════════════════════════════════════════════════════════
// LOYALTY REPORT — расширенный отчёт (для PDF + экрана Отчёты)
// ════════════════════════════════════════════════════════════════════
export const MOCK_LOYALTY_REPORT: LoyaltyReport = {
  stats: MOCK_GENERAL_STATS,
  reviews: { positive: 84, negative: 12, partial: 9, neutral: 17, spam: 4, total: 126 },
  rf_summary: { total: 2847, active_r3: 1213, at_risk_r1: 246, lost_r0: 312 },
  segment_counts: {
    'Чемпионы':   324, 'Лояльные':   411, 'Новички':    218,
    'Растущие':   267, 'Постоянные': 159, 'VIP риск':   145,
    'Спящие':     232, 'Угасают':    178, 'Уходят':     112,
  },
  migration:    { promoted: 187, demoted: 91, new_users: 156, lost_users: 64 },
  sources:      { from_cafe: 1842, from_delivery: 568 },
  ai_summary:   'Отличный месяц для ЛоялUP: +15% к активной базе, открываемость рассылок 71% (выше среднего по индустрии), 187 гостей перешли в более активные сегменты. Зона внимания — VIP риск (145 чел) и Угасают (178) — рекомендую запустить персональные приглашения от управляющего на этой неделе.',
};

// ── Сводная по всем клиентам (superadmin) ───────────────────────────
export const MOCK_CROSS_OVERVIEW: CrossOverview = {
  period: '30d',
  client_count: 4,
  totals: { total_scans: 5708, new_community: 2106, new_newsletter: 2220, stories: 622, reviews: 1132, scan_index: 6.6, pos_guests: 11642 },
  rows: [
    { name: 'Levone', schema: 'levone', domain: '', logo: '', total_scans: 624, new_community: 173, new_newsletter: 209, stories: 66, reviews: 161, scan_index: 8.6, pos_guests: 7200 },
    { name: 'Автосуши Орёл', schema: 'asap_orel', domain: '', logo: '', total_scans: 656, new_community: 194, new_newsletter: 216, stories: 62, reviews: 120, scan_index: 0, pos_guests: 0 },
    { name: 'БИРФЕСТ', schema: 'birfest', domain: '', logo: '', total_scans: 993, new_community: 278, new_newsletter: 287, stories: 114, reviews: 44, scan_index: 0, pos_guests: 0 },
    { name: 'Шавуха от Лео', schema: 'shavuha_ot_leo', domain: '', logo: '', total_scans: 426, new_community: 186, new_newsletter: 166, stories: 30, reviews: 95, scan_index: 4.9, pos_guests: 4442 },
  ],
};

export const MOCK_CONTACT_POINTS: ContactPointsResponse = {
  rows: [
    { id: 1, name: 'Детская зона — листовка', branch: 'Центр', mode: 'В кафе (на месте)', is_active: true,  scans: 142, guests: 98, subscribed: 41, played: 63, activated: 27, conversion: 42 },
    { id: 2, name: 'Флаер у кассы',           branch: 'Центр', mode: 'В кафе (на месте)', is_active: true,  scans: 86,  guests: 71, subscribed: 19, played: 38, activated: 12, conversion: 27 },
    { id: 3, name: 'Коробка доставки',        branch: 'Центр', mode: 'Доставка',          is_active: true,  scans: 54,  guests: 50, subscribed: 22, played: 31, activated: 18, conversion: 44 },
  ],
  totals: { scans: 282, guests: 219, subscribed: 82, played: 132, activated: 57, conversion: 37 },
  meta: { start: '2026-05-24', end: '2026-06-23', branch_ids: [] },
};

// ════════════════════════════════════════════════════════════════════
// CATALOG — категории + подарки (mock + helpers для CRUD)
// ════════════════════════════════════════════════════════════════════
const _cat_now = Date.now();
const _cat_iso = (offsetSec = 0) => new Date(_cat_now - offsetSec * 1000).toISOString();

export const MOCK_CATEGORIES: ProductCategory[] = [
  { id: 1, branch_id: 1, name: 'Напитки',     ordering: 10, products_count: 4 },
  { id: 2, branch_id: 1, name: 'Десерты',     ordering: 20, products_count: 2 },
  { id: 3, branch_id: 1, name: 'Сертификаты', ordering: 30, products_count: 1 },
  { id: 4, branch_id: 1, name: 'Мерч',        ordering: 40, products_count: 1 },
  { id: 5, branch_id: 2, name: 'Напитки',     ordering: 10, products_count: 3 },
  { id: 6, branch_id: 2, name: 'Горячее',     ordering: 20, products_count: 2 },
  { id: 7, branch_id: 3, name: 'Кофе',        ordering: 10, products_count: 5 },
  { id: 8, branch_id: 3, name: 'Десерты',     ordering: 20, products_count: 3 },
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 1, name: 'Капучино в подарок', description: 'Любая чашка капучино из меню. Размер 250 мл.',
    price: 200, is_super_prize: false, is_birthday_prize: false,
    image_url: 'https://placehold.co/600x600/A855F7/fff/png?text=☕',
    assignments: [
      { branch_id: 1, category_id: 1, ordering: 10, is_active: true },
      { branch_id: 3, category_id: 7, ordering: 10, is_active: true },
    ],
    created_at: _cat_iso(86_400 * 30), updated_at: _cat_iso(86_400 * 5),
  },
  {
    id: 2, name: 'Чизкейк к чаю', description: 'Кусок фирменного чизкейка от шефа. Идеально к чаю или кофе.',
    price: 350, is_super_prize: false, is_birthday_prize: true,
    image_url: 'https://placehold.co/600x600/C5E62D/333/png?text=🍰',
    assignments: [
      { branch_id: 1, category_id: 2, ordering: 20, is_active: true },
      { branch_id: 3, category_id: 8, ordering: 20, is_active: true },
    ],
    created_at: _cat_iso(86_400 * 25), updated_at: _cat_iso(86_400 * 3),
  },
  {
    id: 3, name: 'Пицца Маргарита 30см', description: 'Полноразмерная классическая Маргарита. Только для суперприза.',
    price: 1500, is_super_prize: true, is_birthday_prize: false,
    image_url: 'https://placehold.co/600x600/DC2626/fff/png?text=🍕',
    assignments: [
      { branch_id: 1, category_id: null, ordering: 0, is_active: true },
      { branch_id: 2, category_id: 6, ordering: 10, is_active: true },
    ],
    created_at: _cat_iso(86_400 * 60), updated_at: _cat_iso(86_400 * 14),
  },
  {
    id: 4, name: 'Сертификат 500 ₽', description: 'Подарочный сертификат на сумму 500 рублей. Можно подарить другу.',
    price: 1000, is_super_prize: false, is_birthday_prize: false,
    image_url: 'https://placehold.co/600x600/F5EBFE/7E22CE/png?text=★500₽',
    assignments: [
      { branch_id: 1, category_id: 3, ordering: 10, is_active: true },
    ],
    created_at: _cat_iso(86_400 * 90), updated_at: _cat_iso(86_400 * 90),
  },
  {
    id: 5, name: 'Фирменный стакан-керамика', description: 'Стакан с лого заведения, 350 мл, термоудерживающий.',
    price: 800, is_super_prize: false, is_birthday_prize: false,
    image_url: 'https://placehold.co/600x600/18181B/C5E62D/png?text=🥤',
    assignments: [
      { branch_id: 1, category_id: 4, ordering: 10, is_active: true },
      { branch_id: 3, category_id: null, ordering: 0, is_active: false },
    ],
    created_at: _cat_iso(86_400 * 45), updated_at: _cat_iso(86_400 * 7),
  },
  {
    id: 6, name: 'Напиток дня от шефа', description: 'Сезонный спецнапиток. Состав меняется раз в неделю.',
    price: 100, is_super_prize: false, is_birthday_prize: false,
    image_url: 'https://placehold.co/600x600/9DBA1F/fff/png?text=🥤',
    assignments: [
      { branch_id: 1, category_id: 1, ordering: 5, is_active: true },
      { branch_id: 2, category_id: 5, ordering: 5, is_active: true },
      { branch_id: 3, category_id: 7, ordering: 5, is_active: true },
    ],
    created_at: _cat_iso(86_400 * 15), updated_at: _cat_iso(86_400 * 1),
  },
  {
    id: 7, name: 'Шаурма с курицей', description: 'Классическая шаурма с курицей. Только в подарок ко ДР.',
    price: 0, is_super_prize: false, is_birthday_prize: true,
    image_url: 'https://placehold.co/600x600/EA580C/fff/png?text=🌯',
    assignments: [
      { branch_id: 4, category_id: null, ordering: 0, is_active: true },
      { branch_id: 5, category_id: null, ordering: 0, is_active: true },
    ],
    created_at: _cat_iso(86_400 * 50), updated_at: _cat_iso(86_400 * 10),
  },
];

// ════════════════════════════════════════════════════════════════════
// QUESTS — задания
// ════════════════════════════════════════════════════════════════════
export const MOCK_QUESTS: Quest[] = [
  {
    id: 1, branch_id: 1, name: 'Опубликуй сторис',
    description: 'Опубликуйте сторис в ВК с упоминанием @rassvet_cafe и хэштегом #кофейнярассвет. Награда зачисляется автоматически после публикации.',
    reward: 500, is_active: true, ordering: 10, submits_count: 47,
    created_at: _cat_iso(86_400 * 90), updated_at: _cat_iso(86_400 * 14),
  },
  {
    id: 2, branch_id: 1, name: 'Приведи друга',
    description: 'Пригласите друга через ссылку из приложения. Когда он зарегистрируется и сделает первый визит — получите бонус.',
    reward: 1000, is_active: true, ordering: 20, submits_count: 12,
    created_at: _cat_iso(86_400 * 80), updated_at: _cat_iso(86_400 * 10),
  },
  {
    id: 3, branch_id: 1, name: 'Оставь отзыв в 2GIS',
    description: 'Опубликуйте отзыв на нашей странице 2GIS со скриншотом чека. Премодерация — до 24 часов.',
    reward: 300, is_active: true, ordering: 30, submits_count: 28,
    created_at: _cat_iso(86_400 * 70), updated_at: _cat_iso(86_400 * 5),
  },
  {
    id: 4, branch_id: 1, name: 'Подпишись на ВК',
    description: 'Подпишитесь на наше сообщество ВКонтакте через приложение. Один раз — 100 баллов сразу.',
    reward: 100, is_active: true, ordering: 40, submits_count: 156,
    created_at: _cat_iso(86_400 * 120), updated_at: _cat_iso(86_400 * 60),
  },
  {
    id: 5, branch_id: 2, name: 'Пригласи коллегу на бизнес-ланч',
    description: 'Покажите промокод коллеге, который придёт впервые на бизнес-ланч до 16:00.',
    reward: 400, is_active: false, ordering: 10, submits_count: 3,
    created_at: _cat_iso(86_400 * 60), updated_at: _cat_iso(86_400 * 30),
  },
];

// ════════════════════════════════════════════════════════════════════
// PROMOTIONS — акции/баннеры
// ════════════════════════════════════════════════════════════════════
export const MOCK_PROMOTIONS: Promotion[] = [
  {
    id: 1, branch_id: 1, branch_name: 'Набережная',
    title: 'Завтрак за 199 ₽',
    discount: 'С понедельника по пятницу до 11:00. Любой завтрак из меню за 199 ₽ при любом напитке.',
    dates: 'Пн–Пт до 11:00, постоянно',
    image_url: 'https://placehold.co/800x400/A855F7/fff/png?text=Завтрак+199',
    created_at: _cat_iso(86_400 * 14), updated_at: _cat_iso(86_400 * 3),
  },
  {
    id: 2, branch_id: 1, branch_name: 'Набережная',
    title: '−20% на ужин до 19:00',
    discount: 'Скидка на весь чек, если уходите до 19:00. Бронь — за час, по тел. +7 (343) 200-50-30.',
    dates: '01.06 – 30.06',
    image_url: 'https://placehold.co/800x400/C5E62D/18181B/png?text=-20%25+ужин',
    created_at: _cat_iso(86_400 * 7), updated_at: _cat_iso(86_400 * 1),
  },
  {
    id: 3, branch_id: 3, branch_name: 'Кофейня',
    title: 'Бранч по выходным',
    discount: 'В субботу и воскресенье с 11:00 до 14:00 — бранч-меню (стартеры + горячее + напиток) 690 ₽.',
    dates: 'Сб–Вс 11:00–14:00',
    image_url: 'https://placehold.co/800x400/F5EBFE/7E22CE/png?text=🥐+Бранч',
    created_at: _cat_iso(86_400 * 21), updated_at: _cat_iso(86_400 * 14),
  },
];

// ════════════════════════════════════════════════════════════════════
// DAILY CODES — коды дня (auto-gen + история)
// ════════════════════════════════════════════════════════════════════
const _today = new Date().toISOString().slice(0, 10);
const _yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
const _twoDaysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10);

export const MOCK_DAILY_CODES: DailyCode[] = [
  // Сегодня — есть авто-сгенерированный для ДР по точкам 1, 2
  { id: 1, branch_id: 1, branch_name: 'Набережная', purpose: 'BIRTHDAY', code: '7421',
    valid_date: _today, generated_by: 'AUTO', created_at: new Date().toISOString() },
  { id: 2, branch_id: 2, branch_name: 'Ленина', purpose: 'BIRTHDAY', code: '3859',
    valid_date: _today, generated_by: 'AUTO', created_at: new Date().toISOString() },
  // Сегодня для точки 3 НЕТ — баг автогенерации, нужно сгенерировать вручную (демо)
  // Вчера
  { id: 3, branch_id: 1, branch_name: 'Набережная', purpose: 'BIRTHDAY', code: '5142',
    valid_date: _yesterday, generated_by: 'AUTO', created_at: _yesterday + 'T00:05:00Z' },
  { id: 4, branch_id: 2, branch_name: 'Ленина', purpose: 'BIRTHDAY', code: '8724',
    valid_date: _yesterday, generated_by: 'AUTO', created_at: _yesterday + 'T00:05:00Z' },
  { id: 5, branch_id: 3, branch_name: 'Кофейня', purpose: 'BIRTHDAY', code: '1903',
    valid_date: _yesterday, generated_by: 'MANUAL', created_at: _yesterday + 'T08:30:00Z' },
  // Позавчера
  { id: 6, branch_id: 1, branch_name: 'Набережная', purpose: 'BIRTHDAY', code: '4068',
    valid_date: _twoDaysAgo, generated_by: 'AUTO', created_at: _twoDaysAgo + 'T00:05:00Z' },
];

// ════════════════════════════════════════════════════════════════════
// AUDIT LOG — лог действий сотрудников
// ════════════════════════════════════════════════════════════════════
const _aud_now = Date.now();
const _aud_h = (n: number) => new Date(_aud_now - n * 3_600_000).toISOString();
const _aud_d = (n: number) => new Date(_aud_now - n * 86_400_000).toISOString();

export const MOCK_AUDIT_LOG: AuditLogEntry[] = [
  { id: 1,  staff_id: 2, staff_name: 'Петрова Ольга',     action_type: 'REVIEW_REPLY',
    target_type: 'review',   target_id: 1,   target_label: 'Дмитрий Соколов',
    details: 'Ответила на негативный отзыв', created_at: _aud_h(0.2) },
  { id: 2,  staff_id: 1, staff_name: 'Иванов Александр', action_type: 'COIN_ADJUST',
    target_type: 'guest',    target_id: '203845611', target_label: 'Дмитрий Соколов',
    details: '+500 ★ — компенсация за неудачный заказ',
    delta: { before: 740, after: 1240 }, created_at: _aud_h(1.5) },
  { id: 3,  staff_id: 2, staff_name: 'Петрова Ольга',     action_type: 'BROADCAST_SEND',
    target_type: 'broadcast', target_id: 1, target_label: 'VIP риск · Набережная',
    details: 'Отправила рассылку 138 гостям', created_at: _aud_h(3) },
  { id: 4,  staff_id: 1, staff_name: 'Иванов Александр', action_type: 'PRODUCT_CREATE',
    target_type: 'product',  target_id: 7,   target_label: 'Шаурма с курицей',
    details: 'Создал подарок ко ДР', created_at: _aud_h(5) },
  { id: 5,  staff_id: 3, staff_name: 'Соколов Дмитрий',   action_type: 'REVIEW_RESOLVE',
    target_type: 'review',   target_id: 5,   target_label: 'Игорь Никитин',
    details: 'Закрыл с пометкой «решено лично»', created_at: _aud_h(8) },
  { id: 6,  staff_id: 1, staff_name: 'Иванов Александр', action_type: 'STAFF_TOGGLE',
    target_type: 'staff',    target_id: 5,   target_label: 'Кузнецов Илья',
    details: 'Отключил доступ',
    delta: { before: true, after: false }, created_at: _aud_h(12) },
  { id: 7,  staff_id: 1, staff_name: 'Иванов Александр', action_type: 'STAFF_PERMS',
    target_type: 'staff',    target_id: 3,   target_label: 'Соколов Дмитрий',
    details: 'Запретил рассылки',
    delta: { before: true, after: false }, created_at: _aud_d(1) },
  { id: 8,  staff_id: 2, staff_name: 'Петрова Ольга',     action_type: 'AUTH_LOGIN',
    details: 'Вход с iOS-приложения · Екатеринбург',
    created_at: _aud_d(1) },
  { id: 9,  staff_id: 1, staff_name: 'Иванов Александр', action_type: 'THRESHOLDS_SAVE',
    target_type: 'thresholds',
    details: 'Изменил R3 с 14 на 21 дн (доставка)',
    delta: { before: { r_fresh_max: 14 }, after: { r_fresh_max: 21 } },
    created_at: _aud_d(2) },
  { id: 10, staff_id: 2, staff_name: 'Петрова Ольга',     action_type: 'QUEST_UPDATE',
    target_type: 'quest', target_id: 2, target_label: 'Приведи друга',
    details: 'Подняла награду с 800 до 1000 ★', created_at: _aud_d(3) },
  { id: 11, staff_id: 1, staff_name: 'Иванов Александр', action_type: 'STAFF_INVITE',
    target_type: 'staff',    target_id: 4,   target_label: 'Зайцева Мария',
    details: 'Пригласил как Просмотр', created_at: _aud_d(5) },
  { id: 12, staff_id: 2, staff_name: 'Петрова Ольга',     action_type: 'DAILY_CODE_MANUAL',
    target_type: 'daily_code', target_id: 5, target_label: 'Кофейня',
    details: 'Сгенерировала код вручную (упала автогенерация)',
    created_at: _aud_d(7) },
];

// ════════════════════════════════════════════════════════════════════
// BIRTHDAYS — гости с ближайшими ДР
// Генерируем относительные даты от сегодня для демо
// ════════════════════════════════════════════════════════════════════
const _bd_today = new Date();
const _bd_yyyy = (d: Date) => d.toISOString().slice(0, 10);
const _bd_relative = (offsetDays: number, birthYear: number): string => {
  // Возвращаем дату ДР в исходном birthYear, но день/месяц как у +offsetDays от сегодня
  const target = new Date(_bd_today);
  target.setDate(target.getDate() + offsetDays);
  return `${birthYear}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
};
const _bd_thisYear = (offsetDays: number): string => {
  const target = new Date(_bd_today);
  target.setDate(target.getDate() + offsetDays);
  return _bd_yyyy(target);
};

export const MOCK_BIRTHDAYS: GuestBirthday[] = [
  {
    vk_id: '203845611', first_name: 'Дмитрий', last_name: 'Соколов',
    phone: '+79121234567', branch_name: 'Набережная', coins: 1240,
    segment_emoji: '🏆', segment_name: 'Чемпионы',
    birthday: _bd_relative(0, 1989), birthday_this_year: _bd_thisYear(0),
    days_until: 0, age_turning: new Date().getFullYear() - 1989,
    is_loyal: true, greeting_status: 'planned',
  },
  {
    vk_id: '128493022', first_name: 'Анна', last_name: 'Иванова',
    phone: '+79991112233', branch_name: 'Ленина', coins: 540,
    segment_emoji: '⭐', segment_name: 'Лояльные',
    birthday: _bd_relative(1, 1992), birthday_this_year: _bd_thisYear(1),
    days_until: 1, age_turning: new Date().getFullYear() - 1992,
    is_loyal: true, greeting_status: 'planned',
  },
  {
    vk_id: '129003721', first_name: 'Игорь', last_name: 'Никитин',
    phone: '+79051234599', branch_name: 'Шавуха', coins: 690,
    segment_emoji: '📈', segment_name: 'Растущие',
    birthday: _bd_relative(3, 1985), birthday_this_year: _bd_thisYear(3),
    days_until: 3, age_turning: new Date().getFullYear() - 1985,
    is_loyal: true, greeting_status: 'planned',
  },
  {
    vk_id: '210394577', first_name: 'Ольга', last_name: 'Васильева',
    phone: '+79153335577', branch_name: 'Шавуха №2', coins: 160,
    segment_emoji: '🌫', segment_name: 'Угасают',
    birthday: _bd_relative(5, 1995), birthday_this_year: _bd_thisYear(5),
    days_until: 5, age_turning: new Date().getFullYear() - 1995,
    is_loyal: false, greeting_status: 'none',
  },
  {
    vk_id: '187234509', first_name: 'Екатерина', last_name: 'Морозова',
    branch_name: 'Набережная', coins: 220,
    segment_emoji: '⭐', segment_name: 'Лояльные',
    birthday: _bd_relative(7, 1990), birthday_this_year: _bd_thisYear(7),
    days_until: 7, age_turning: new Date().getFullYear() - 1990,
    is_loyal: true, greeting_status: 'planned',
  },
  {
    vk_id: '274300912', first_name: 'Алексей', last_name: 'Лебедев',
    phone: '+79881122334', branch_name: 'Кофейня', coins: 460,
    segment_emoji: '🏆', segment_name: 'Чемпионы',
    birthday: _bd_relative(10, 1987), birthday_this_year: _bd_thisYear(10),
    days_until: 10, age_turning: new Date().getFullYear() - 1987,
    is_loyal: true, greeting_status: 'none',
  },
  {
    vk_id: '155002384', first_name: 'Михаил', last_name: 'Петров',
    branch_name: 'Ленина', coins: 410,
    segment_emoji: '⭐', segment_name: 'Лояльные',
    birthday: _bd_relative(14, 1991), birthday_this_year: _bd_thisYear(14),
    days_until: 14, age_turning: new Date().getFullYear() - 1991,
    is_loyal: true, greeting_status: 'none',
  },
  {
    vk_id: '301488721', first_name: 'Светлана', last_name: 'Кузнецова',
    branch_name: 'Набережная', coins: 280,
    segment_emoji: '😴', segment_name: 'Спящие',
    birthday: _bd_relative(21, 1988), birthday_this_year: _bd_thisYear(21),
    days_until: 21, age_turning: new Date().getFullYear() - 1988,
    is_loyal: false, greeting_status: 'none',
  },
  // Прошедшие — для отдельной вкладки «Прошли»
  {
    vk_id: '301029488', first_name: 'Никита', last_name: 'Жуков',
    branch_name: 'Шавуха', coins: 620,
    segment_emoji: '⭐', segment_name: 'Лояльные',
    birthday: _bd_relative(-3, 1986), birthday_this_year: _bd_thisYear(-3),
    days_until: -3, age_turning: new Date().getFullYear() - 1986,
    is_loyal: true, greeting_status: 'came',
  },
  {
    vk_id: '345782901', first_name: 'Юлия', last_name: 'Смирнова',
    branch_name: 'Кофейня', coins: 110,
    segment_emoji: '🌱', segment_name: 'Новички',
    birthday: _bd_relative(-7, 1993), birthday_this_year: _bd_thisYear(-7),
    days_until: -7, age_turning: new Date().getFullYear() - 1993,
    is_loyal: false, greeting_status: 'sent',
  },
];

// ────── Helpers (имитация CRUD на стороне моков) ─────────
let _productSeq  = MOCK_PRODUCTS.length + 1;
let _categorySeq = MOCK_CATEGORIES.length + 1;
let _questSeq    = MOCK_QUESTS.length + 1;
let _promoSeq    = MOCK_PROMOTIONS.length + 1;
let _dailySeq    = MOCK_DAILY_CODES.length + 1;

export const nextProductId  = () => _productSeq++;
export const nextCategoryId = () => _categorySeq++;
export const nextQuestId    = () => _questSeq++;
export const nextPromoId    = () => _promoSeq++;
export const nextDailyId    = () => _dailySeq++;

// ════════════════════════════════════════════════════════════════════
// ENGAGEMENT ANALYTICS — подарки и квесты (моки за 30 дней)
// ════════════════════════════════════════════════════════════════════
export const MOCK_GIFTS_ANALYTICS: GiftAnalytic[] = [
  {
    product_id: 1, product_name: 'Капучино классический', product_emoji: '☕',
    category_name: 'Напитки', price_coins: 250,
    redeemed_count: 184, activated_count: 167, expired_count: 17,
    conversion_rate: 90.8, trend_pct: 8.4,
  },
  {
    product_id: 2, product_name: 'Чизкейк фирменный', product_emoji: '🍰',
    category_name: 'Десерты', price_coins: 480,
    redeemed_count: 142, activated_count: 124, expired_count: 18,
    conversion_rate: 87.3, trend_pct: 12.1,
  },
  {
    product_id: 3, product_name: 'Раф ванильный', product_emoji: '🥤',
    category_name: 'Напитки', price_coins: 320,
    redeemed_count: 119, activated_count: 92, expired_count: 27,
    conversion_rate: 77.3, trend_pct: -4.5,
  },
  {
    product_id: 4, product_name: 'Круассан с миндалём', product_emoji: '🥐',
    category_name: 'Выпечка', price_coins: 280,
    redeemed_count: 98, activated_count: 82, expired_count: 16,
    conversion_rate: 83.7, trend_pct: 3.0,
  },
  {
    product_id: 5, product_name: 'Бизнес-ланч', product_emoji: '🍽',
    category_name: 'Еда', price_coins: 1200,
    redeemed_count: 64, activated_count: 41, expired_count: 23,
    conversion_rate: 64.1, trend_pct: -11.8,
  },
  {
    product_id: 6, product_name: 'Десерт от шефа', product_emoji: '🎂',
    category_name: 'Десерты', price_coins: 600,
    redeemed_count: 47, activated_count: 35, expired_count: 12,
    conversion_rate: 74.5, trend_pct: 5.2,
  },
  {
    product_id: 7, product_name: 'Латте на овсяном', product_emoji: '🌿',
    category_name: 'Напитки', price_coins: 290,
    redeemed_count: 39, activated_count: 31, expired_count: 8,
    conversion_rate: 79.5, trend_pct: 18.2,
  },
];

export const MOCK_QUESTS_ANALYTICS: QuestAnalytic[] = [
  {
    quest_id: 1, quest_name: 'Загляни 3 раза за неделю', reward_coins: 150,
    is_active: true,
    started_count: 312, completed_count: 198,
    completion_rate: 63.5, avg_completion_hours: 96.2,
    trend_pct: 7.8,
  },
  {
    quest_id: 2, quest_name: 'Попробуй 3 разных десерта', reward_coins: 200,
    is_active: true,
    started_count: 198, completed_count: 84,
    completion_rate: 42.4, avg_completion_hours: 168.5,
    trend_pct: -2.1,
  },
  {
    quest_id: 3, quest_name: 'Приведи друга', reward_coins: 500,
    is_active: true,
    started_count: 156, completed_count: 47,
    completion_rate: 30.1, avg_completion_hours: 384.0,
    trend_pct: 22.4,
  },
  {
    quest_id: 4, quest_name: 'Закажи завтрак до 11:00', reward_coins: 100,
    is_active: true,
    started_count: 421, completed_count: 314,
    completion_rate: 74.6, avg_completion_hours: 36.4,
    trend_pct: 4.5,
  },
  {
    quest_id: 5, quest_name: 'Оставь отзыв в приложении', reward_coins: 80,
    is_active: true,
    started_count: 287, completed_count: 192,
    completion_rate: 66.9, avg_completion_hours: 18.2,
    trend_pct: 11.3,
  },
  {
    quest_id: 6, quest_name: 'Попробуй сезонное меню', reward_coins: 250,
    is_active: false,
    started_count: 89, completed_count: 23,
    completion_rate: 25.8, avg_completion_hours: 240.0,
    trend_pct: -34.2,
  },
];

export const MOCK_ENGAGEMENT_SUMMARY: EngagementSummary = {
  period_label: 'За 30 дней',
  gifts_redeemed_total: MOCK_GIFTS_ANALYTICS.reduce((s, g) => s + g.redeemed_count, 0),
  gifts_activated_total: MOCK_GIFTS_ANALYTICS.reduce((s, g) => s + g.activated_count, 0),
  gifts_avg_conversion: 81.6,
  gifts_total_coins_spent: MOCK_GIFTS_ANALYTICS.reduce((s, g) => s + g.activated_count * g.price_coins, 0),
  quests_started_total: MOCK_QUESTS_ANALYTICS.reduce((s, q) => s + q.started_count, 0),
  quests_completed_total: MOCK_QUESTS_ANALYTICS.reduce((s, q) => s + q.completed_count, 0),
  quests_avg_completion: 50.5,
  quests_avg_completion_hours: 158.6,
};

