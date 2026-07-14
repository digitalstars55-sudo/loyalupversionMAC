// ════════════════════════════════════════════════════════════════════
// TYPES — общие интерфейсы для RF-аналитики
// ════════════════════════════════════════════════════════════════════

export type Mode = 'restaurant' | 'delivery';

export interface RFThresholds {
  r_fresh_max: number; r_warm_max: number; r_cooling_max: number;
  f_rare_max: number; f_moderate_max: number;
}
export interface RLevel { r_score: number; label: string; name: string; range: string; }
export interface FLevel { f_score: number; label: string; name: string; range: string; }
export interface RFCell {
  r_score: number; f_score: number;
  count: number; pct: number; segment_id: number | null;
  delta_pct?: number;
}
export interface RFSummary {
  total: number; active_r3: number; at_risk_r1: number; lost_r0: number;
  total_delta_pct?: number; active_delta_pct?: number;
  at_risk_delta_pct?: number; lost_delta_pct?: number;
}
export interface RFMigration { from: string; to: string; count: number; from_emoji?: string; to_emoji?: string; }
export interface RFBranch {
  id: number;
  name: string;
  address?: string;       // улица, дом, город
  city?: string;
}

// Воронка по точкам контакта (отслеживаемым QR) — /api/v1/analytics/contact-points/
export interface ContactPointRow {
  id: number;
  name: string;
  branch: string;
  mode: string;           // «В кафе (на месте)» | «Доставка»
  is_active: boolean;
  scans: number;
  guests: number;
  subscribed: number;
  played: number;
  activated: number;
  conversion: number;     // подписались ÷ гости, %
}

export interface ContactPointsResponse {
  rows: ContactPointRow[];
  totals: {
    scans: number; guests: number; subscribed: number;
    played: number; activated: number; conversion: number;
  };
  meta: { start: string; end: string; branch_ids: number[] };
}

export interface RFMatrixResponse {
  thresholds: RFThresholds;
  thresholds_source: 'branch' | 'global' | 'default';
  thresholds_scope_label: string;
  matrix: { r_levels: RLevel[]; f_levels: FLevel[]; cells: Record<string, RFCell>; };
  summary: RFSummary;
  migrations: RFMigration[];
  branches: RFBranch[];
  updated_at: string;
}

// NB: бэк должен ограничить name до 24 символов в форме переименования сегмента.
// На UI всё равно стоит numberOfLines + ellipsizeMode для защиты.
export interface SegmentInfo {
  name: string;
  code: string;
  sub: string;
  strategy: string;
  hint: string;
  emoji: string;
}

export interface Guest {
  vk_id: string; first_name: string; last_name: string;
  last_visit: string; frequency: number; recency_days: number; coins: number;
}

export type FilterChipKey = 'all' | 'hot' | 'vip' | 'fresh';

// ════════════════════════════════════════════════════════════════════
// REVIEWS
// ════════════════════════════════════════════════════════════════════

// Backend хранит 'WAITING' (TextChoices.WAITING) для непроанализированных,
// бэк-сериализатор MobileReviewSerializer мапит WAITING → PENDING.
// Тип принимает оба значения на случай, если где-то WAITING просочится напрямую.
export type Sentiment = 'POSITIVE' | 'NEGATIVE' | 'PARTIALLY_NEGATIVE' | 'NEUTRAL' | 'SPAM' | 'PENDING' | 'WAITING';
export type ReviewSource = 'APP' | 'VK_MESSAGE';

// Источник сообщения внутри переписки по отзыву
export type TestimonialMessageSource = 'APP' | 'VK_MESSAGE' | 'ADMIN_REPLY';

// Вложение к сообщению (фото из ВК). url отдаёт бэк уже абсолютным.
// purged=true → файл удалён по сроку хранения (90 дн), url=null.
export interface ReviewAttachment {
  type: 'photo' | string;
  url: string | null;
  purged: boolean;
}

export interface TestimonialMessage {
  id: number;
  source: TestimonialMessageSource;
  text: string;
  created_at: string;        // ISO
  rating?: number;           // 1-5 (только APP)
  phone?: string;            // если гость указал
  table_number?: number;     // если оставили со стола
  // только для ADMIN_REPLY: кто отправил
  admin_name?: string;
  attachments?: ReviewAttachment[];  // фото из ВК
  // LU-40: контекст «на что ответил гость» — текст+дата предыдущего сообщения
  // в треде (обычно авто-опрос «Понравилось?»). Показываем как цитату над бабблом.
  reply_to_text?: string;
  reply_to_date?: string;    // ISO
}

// Кто-то из коллег сейчас работает с отзывом (presence)
export interface ReviewPresence {
  staff_id: number;
  staff_name: string;
  state: 'viewing' | 'typing'; // смотрит или печатает ответ
  since: string;               // ISO
}

export interface Review {
  id: number;
  source: ReviewSource;
  // Все источники этого треда (с учётом cross-conv merge по vk_sender_id):
  // ['APP'] — только из миниаппа, ['VK_MESSAGE'] — только из ВК-группы,
  // ['APP','VK_MESSAGE'] — гость писал и туда, и туда (показываем оба бейджа).
  // Опционально для обратной совместимости — старый бэк отдаёт только source.
  sources?: ReviewSource[];
  sentiment: Sentiment;
  ai_comment: string;
  branch_id: number;
  branch_name: string;
  customer_name: string;
  vk_sender_id?: string;
  text: string;              // текст ПЕРВОГО (или последнего) сообщения гостя — для превью в карточке
  rating?: number;           // 1-5 — наивысшая/последняя оценка для APP
  last_message_at: string;   // ISO
  has_unread: boolean;
  is_replied: boolean;
  has_draft?: boolean;       // AI-черновик готов и ждёт подтверждения
  draft_text?: string;
  draft_created_at?: string;
  // Полный thread сообщений. Загружается лениво при открытии (или сразу в моках).
  messages?: TestimonialMessage[];
  // Multi-staff: кто сейчас работает с отзывом (другие управляющие в данный момент)
  presence?: ReviewPresence[];
  // Ссылки на отзыв-площадки точки (для кнопки «Вставить ссылки» на позитивных)
  review_link_yandex?: string;
  review_link_2gis?: string;
}

export type ReviewFilterKey = 'all' | 'negative' | 'pending' | 'replied' | 'app' | 'draft';

// ════════════════════════════════════════════════════════════════════
// AUTO-REPLY SETTINGS
// ════════════════════════════════════════════════════════════════════
export type ReminderMinutes = 30 | 60 | 180 | 720;
export type AiTone = 'formal' | 'friendly' | 'neutral';

export interface AutoReplySettings {
  enabled: boolean;
  // Какие тональности обрабатывать AI (SPAM всегда выключен)
  sentiment_enabled: {
    POSITIVE: boolean;
    NEGATIVE: boolean;
    PARTIALLY_NEGATIVE: boolean;
    NEUTRAL: boolean;
    PENDING: boolean;
  };
  // По точкам: branch_id → on/off (0 не используем здесь)
  branch_enabled: Record<number, boolean>;
  // Через сколько напомнить если не подтвердили
  reminder_minutes: ReminderMinutes;
  // Тон AI
  ai_tone: AiTone;
}

// ════════════════════════════════════════════════════════════════════
// TAB NAVIGATION
// ════════════════════════════════════════════════════════════════════
export type TabKey = 'home' | 'analytics' | 'reviews' | 'chat' | 'more';

// ════════════════════════════════════════════════════════════════════
// CHAT (с менеджером ЛоялUP)
// ════════════════════════════════════════════════════════════════════
export interface ChatManager {
  id: number;
  name: string;
  role: string;          // «Ваш менеджер»
  avatar_url?: string;
  online: boolean;
  last_seen: string;     // ISO
  phone?: string;        // E.164, для tel:-ссылки
  work_hours?: string;   // напр. «Пн–Пт 10:00–19:00»
}

export type ChatSender = 'user' | 'manager';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface ChatAttachment {
  id?: number;
  type: 'image' | 'file';
  uri: string;            // локальный uri или URL с бэка
  name?: string;          // оригинальное имя файла
  size?: number;          // байт
  mime?: string;
}

export interface ChatMessage {
  id: number;
  sender: ChatSender;
  text: string;
  created_at: string;    // ISO
  status?: MessageStatus;
  attachments?: ChatAttachment[];
}

// ════════════════════════════════════════════════════════════════════
// CAMPAIGNS — история рассылок
// ════════════════════════════════════════════════════════════════════
export type CampaignStatus = 'sent' | 'sending' | 'failed' | 'scheduled';

export type GenderFilter = 'all' | 'male' | 'female';

export interface CampaignVariant {
  label: 'A' | 'B';
  text: string;
  percent: number;          // доля от общего таргета (0–100)
  sent_count: number;       // фактически отправлено
  response_rate?: number;   // % реакций (открытие/ответ) — заполняется бэком после
}

export interface Campaign {
  id: number;
  segment_key: string;        // '3_3', '1_3' и т.п.
  segment_name: string;
  segment_emoji: string;
  sent_at: string;            // ISO
  total_sent: number;
  total_target: number;       // сколько было в сегменте на момент отправки
  message_text: string;       // для A/B — пустая строка либо текст A (для совместимости)
  image_uri?: string | null;
  status: CampaignStatus;
  channel: 'vk' | 'push' | 'email';
  // A/B + фильтры (опциональные — обычная рассылка их не имеет)
  gender_filter?: GenderFilter;       // 'all' если не указан — для всех
  variants?: CampaignVariant[];       // если есть — это A/B; иначе обычная рассылка
}

// ════════════════════════════════════════════════════════════════════
// PROFILE — текущий пользователь приложения
// ════════════════════════════════════════════════════════════════════
// Сеть (тенант), доступная пользователю — для переключателя сетей.
export interface TenantCompany {
  id: number;
  name: string;
  domain: string;   // напр. "asap-orel.levelupapp.ru"
}

export interface Profile {
  id: number;
  full_name: string;       // ФИО
  role_label: string;      // «Владелец», «Управляющий», «Просмотр»
  role: StaffRole;
  city?: string;
  birthday?: string;       // ISO date YYYY-MM-DD
  birthday_set_at?: string; // ISO datetime — когда установили. Менять нельзя без админа.
  email?: string;
  phone?: string;
  avatar_url?: string;
  branch_ids: number[];    // на какие точки имеет доступ
  tenant_domain?: string | null;   // напр. "demo.levone.ru" — мобайл переключает API_BASE
  tenant_name?: string | null;     // напр. "Кофейня Уют"
  companies?: TenantCompany[];     // все сети юзера — если >1, показываем выбор сети
  is_superadmin?: boolean;         // платформенный суперадмин — видит сводную по ВСЕМ клиентам
  feature_access?: string[];       // разделы с доступом (паритет с веб User.feature_access).
                                   // Пусто/undefined = без ограничений (показываем всё). См. src/access.ts
}

// ════════════════════════════════════════════════════════════════════
// CROSS-TENANT OVERVIEW — сводная по всем клиентам (только superadmin)
// ════════════════════════════════════════════════════════════════════
// Поля «Экономики клиента» (ТЗ): деньги — float ₽, cost_per_* = null при делении на 0.
export interface CrossEconomics {
  gift_cost: number;
  service_cost: number;
  total_cost: number;
  sub_contacts: number;
  unique_digitized: number;
  cost_per_contact: number | null;
  cost_per_unique: number | null;
}
export interface CrossOverviewRow extends CrossEconomics {
  name: string;
  schema: string;
  domain: string;
  logo: string;
  total_scans: number;
  new_community: number;
  new_newsletter: number;
  stories: number;
  reviews: number;
  scan_index: number;
  pos_guests: number;
}
export interface CrossOverviewTotals extends CrossEconomics {
  total_scans: number;
  new_community: number;
  new_newsletter: number;
  stories: number;
  reviews: number;
  scan_index: number;
  pos_guests: number;
}
export interface CrossOverviewFeedItem {
  client: string;
  logo: string;
  domain: string;
  conversation_id: number;
  text: string;
  created_at: string;        // ISO
  sentiment_label: string;   // «Позитивный» / «Негативный» / …
  sentiment_class: string;   // pos | neg | neu
  review_link_yandex?: string;
  review_link_2gis?: string;
}
export interface CrossOverview {
  period: string;
  client_count: number;
  totals: CrossOverviewTotals;
  rows: CrossOverviewRow[];
  feed?: CrossOverviewFeedItem[];   // лента последних отзывов по всем клиентам (топ-20)
}

// Полная страница «Все отзывы» — /api/v1/overview/reviews/ (пагинация + фильтр)
export interface CrossOverviewReview extends CrossOverviewFeedItem {
  rating?: number | null;
}
export interface CrossOverviewReviewsResponse {
  period: string;
  sentiment: string;
  start: string;
  end: string;
  total: number;
  page: number;
  num_pages: number;
  results: CrossOverviewReview[];
}

// ════════════════════════════════════════════════════════════════════
// STAFF / RBAC — управление сотрудниками и правами доступа
// ════════════════════════════════════════════════════════════════════
export type StaffRole = 'owner' | 'manager' | 'viewer';

export interface StaffPermissions {
  see_analytics: boolean;
  see_reviews: boolean;
  see_broadcasts: boolean;
  see_guests: boolean;
  see_branches: boolean;
  edit_thresholds: boolean;
  reply_reviews: boolean;
  send_broadcasts: boolean;
  manage_staff: boolean;       // только владелец
  edit_profile: boolean;
  // Управление контентом
  manage_catalog: boolean;     // подарки + категории
  manage_quests: boolean;      // квесты
  manage_promotions: boolean;  // акции
  adjust_coins: boolean;       // ручная корректировка баланса гостя
}

export interface Staff {
  id: number;
  full_name: string;
  role: StaffRole;
  role_label: string;
  email?: string;
  phone?: string;
  active: boolean;
  permissions: StaffPermissions;
  feature_access?: string[]; // разделы, к которым есть доступ (ключи FEATURE_CHOICES). Единый источник, паритет с вебом.
  branch_ids: number[];      // на какие точки имеет доступ ('all' = пустой массив трактуется как все)
  invited_at: string;        // ISO
  last_active_at?: string;
}

export interface FeatureChoice { key: string; label: string; }

// ════════════════════════════════════════════════════════════════════
// GUEST DETAIL — расширенная карточка гостя (визиты, монеты, VK-статус)
// Открывается тапом на Госте в списке Гостей.
// ════════════════════════════════════════════════════════════════════
export type CoinTxnType = 'EARN' | 'SPEND' | 'BIRTHDAY_GIFT' | 'REFERRAL' | 'ADJUST';
export type CoinTxnSource = 'QR_SCAN' | 'PURCHASE' | 'GAME' | 'QUEST' | 'BIRTHDAY' | 'ADMIN' | 'STORY' | 'REFERRAL';

export interface GuestVisit {
  id: number;
  branch_id: number;
  branch_name: string;
  visited_at: string;       // ISO
  table_number?: number;
}

export interface GuestCoinTxn {
  id: number;
  type: CoinTxnType;
  source: CoinTxnSource;
  amount: number;           // + для начисления, - для списания
  balance_after: number;
  description?: string;
  created_at: string;       // ISO
}

export interface GuestVKStatus {
  is_subscribed_community: boolean;   // подписан на группу ВК
  is_subscribed_newsletter: boolean;  // разрешил рассылку
  is_blocked: boolean;
  last_seen_at?: string;
}

export interface GuestDetail {
  vk_id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  birthday?: string;        // ISO date
  registered_at: string;    // ISO когда зарегистрировался в программе
  // RF и метрики
  recency_days: number;
  frequency: number;
  coins_balance: number;
  total_earned: number;
  total_spent: number;
  // Сегмент
  segment_key?: string;     // '3_3' и т.п.
  segment_emoji?: string;
  segment_name?: string;
  // Связанные данные
  vk_status: GuestVKStatus;
  recent_visits: GuestVisit[];
  recent_txns: GuestCoinTxn[];
  prizes_received: number;  // сколько подарков получил
  prizes_activated: number; // сколько активировал
  reviews_count: number;    // сколько отзывов оставил
}

// ════════════════════════════════════════════════════════════════════
// GENERAL STATS — сводка по всем 16 метрикам (как /analytics/ в вебе)
// ════════════════════════════════════════════════════════════════════
export interface GeneralStats {
  // Engagement
  qr_scans: number;                    // уник. гости со сканом (для индекса оцифровки)
  total_scans?: number;                // «Отсканировали QR-код» = кафе + доставка (события)
  cafe_scans?: number;                 // сканы в кафе
  delivery_scans?: number;             // сканы с доставки
  game_reached?: number;               // «Начали игру» (события запуска игры)
  total_vk_subscribers: number;
  new_community_subscribers: number;
  new_newsletter_subscribers: number;
  // подписки по источникам (кафе/доставка/сториз/другие)
  community_subs_cafe?: number;
  community_subs_delivery?: number;
  community_subs_story?: number;
  community_subs_website?: number;     // подписки в VK с сайта
  community_subs_other?: number;
  newsletter_subs_cafe?: number;
  newsletter_subs_delivery?: number;
  newsletter_subs_story?: number;
  newsletter_subs_website?: number;    // подписки на рассылку с сайта
  newsletter_subs_other?: number;
  new_group_with_gift: number;

  // Game / activations
  repeat_game_players: number;
  coin_purchasers: number;
  first_gift_receivers: number;
  gift_activators: number;

  // Воронка «Сториз» (подарки из сториз)
  story_gift_receivers?: number;
  story_gift_activators?: number;
  story_gift_expired?: number;      // получил, но не дошёл в кафе — подарок сгорел

  // Воронка «Сайт» (QR на сайте клиента)
  website_gift_players?: number;
  website_gift_receivers?: number;
  website_gift_activators?: number;
  website_gift_expired?: number;

  // Birthdays
  birthday_greetings_sent: number;
  birthday_celebrants: number;

  // Messages / reach
  message_open_rate: number | null;   // %
  message_total_sent: number;
  message_total_read: number;
  message_trackable?: number;          // отслеживаемые (с vk_message_id)

  // VK stories
  vk_stories_publishers: number;
  stories_referrals: number;

  // POS
  pos_guests: number;
  scan_index: number;                  // QR / POS * 100
  pos_data_days?: number;              // дней с POS-данными (окно индекса)

  // Период (для отображения)
  period_label: string;
  start_date: string;                  // ISO
  end_date: string;                    // ISO
}

// ════════════════════════════════════════════════════════════════════
// LOYALTY REPORT — extended отчёт (для экрана Отчёты + PDF-выгрузки)
// ════════════════════════════════════════════════════════════════════
export interface LoyaltyReport {
  stats: GeneralStats;
  // Сводка по отзывам
  reviews: {
    positive: number;
    negative: number;
    partial: number;
    neutral: number;
    spam: number;
    total: number;
  };
  // RF
  rf_summary: {
    total: number;
    active_r3: number;
    at_risk_r1: number;
    lost_r0: number;
  };
  segment_counts: Record<string, number>;   // имя сегмента → число гостей
  // Эффективность миграций
  migration: {
    promoted: number;     // ушли в более активный сегмент
    demoted: number;      // упали в менее активный
    new_users: number;
    lost_users: number;
  };
  // Источники
  sources: {
    from_cafe: number;
    from_delivery: number;
  };
  // Точки контакта (отслеживаемые QR, src=<метка>) — воронка по каждой
  contact_points?: {
    id: number;
    name: string;
    branch: string;
    mode: string;
    is_active: boolean;
    scans: number;
    guests: number;
    subscribed: number;
    played: number;
    activated: number;
    conversion: number;
  }[];
  // AI-резюме
  ai_summary?: string;
}

// ════════════════════════════════════════════════════════════════════
// CATALOG — подарки и категории (для редактирования)
// ════════════════════════════════════════════════════════════════════
export interface ProductCategory {
  id: number;
  branch_id: number;
  name: string;
  ordering: number;
  products_count?: number;     // на бэке считается, на UI показываем
}

export interface ProductBranchAssignment {
  branch_id: number;
  category_id: number | null;
  ordering: number;
  is_active: boolean;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  image_url?: string | null;       // URL уже загруженной картинки
  image_local_uri?: string | null; // локальный uri выбранной но не загруженной
  price: number;                    // в баллах
  is_super_prize: boolean;
  is_birthday_prize: boolean;
  // Привязка к точкам
  assignments: ProductBranchAssignment[];
  created_at: string;
  updated_at: string;
}

// ════════════════════════════════════════════════════════════════════
// QUEST — задания для гостей
// ════════════════════════════════════════════════════════════════════
export interface Quest {
  id: number;
  branch_id: number;
  name: string;
  description: string;
  reward: number;            // в баллах
  is_active: boolean;
  ordering: number;
  submits_count?: number;    // сколько гостей выполнило (read-only)
  created_at: string;
  updated_at: string;
}

// ════════════════════════════════════════════════════════════════════
// ENGAGEMENT ANALYTICS — аналитика подарков и квестов
// ════════════════════════════════════════════════════════════════════
export interface GiftAnalytic {
  product_id: number;
  product_name: string;
  product_emoji?: string;
  category_name?: string;
  price_coins: number;            // цена в баллах
  redeemed_count: number;         // сколько раз получили
  activated_count: number;        // сколько активировали (показали кассиру)
  expired_count: number;          // сколько сгорело
  conversion_rate: number;        // 0–100 (activated / redeemed)
  trend_pct: number;              // ±% относительно прошлого периода
}

export interface QuestAnalytic {
  quest_id: number;
  quest_name: string;
  reward_coins: number;
  is_active: boolean;
  started_count: number;          // сколько начали
  completed_count: number;        // сколько завершили
  completion_rate: number;        // 0–100
  avg_completion_hours: number;   // среднее время от старта до завершения
  trend_pct: number;              // ±% относительно прошлого периода
}

export interface EngagementSummary {
  period_label: string;            // «За 30 дней»
  gifts_redeemed_total: number;
  gifts_activated_total: number;
  gifts_avg_conversion: number;    // 0–100
  gifts_total_coins_spent: number; // сколько баллов «сгорело» на подарках
  quests_started_total: number;
  quests_completed_total: number;
  quests_avg_completion: number;   // 0–100
  quests_avg_completion_hours: number;
}

// ════════════════════════════════════════════════════════════════════
// PROMOTION — акции/баннеры в приложении
// ════════════════════════════════════════════════════════════════════
export interface Promotion {
  id: number;
  branch_id: number;
  branch_name?: string;
  title: string;
  discount: string;          // описание условий (макс. 500)
  dates: string;             // период текстом «01.06 – 30.06»
  image_url?: string | null;
  image_local_uri?: string | null;
  created_at: string;
  updated_at: string;
}

// ════════════════════════════════════════════════════════════════════
// DAILY CODE — код дня (auto-generated, ручная только emergency)
// ════════════════════════════════════════════════════════════════════
export type DailyCodePurpose = 'BIRTHDAY' | 'SUPERPRIZE' | 'OTHER';

export interface DailyCode {
  id: number;
  branch_id: number;
  branch_name?: string;
  purpose: DailyCodePurpose;
  code: string;              // 4-значный
  valid_date: string;        // ISO date YYYY-MM-DD
  generated_by: 'AUTO' | 'MANUAL';
  created_at: string;
}

// ════════════════════════════════════════════════════════════════════
// COIN ADJUSTMENT — ручная корректировка баланса гостя админом
// ════════════════════════════════════════════════════════════════════
export interface CoinAdjustment {
  vk_id: string;
  amount: number;            // + или -
  reason: string;            // обязательно — что-то осмысленное
}

// ════════════════════════════════════════════════════════════════════
// BIRTHDAYS — гости с ближайшими ДР (для рассылок-поздравлений)
// ════════════════════════════════════════════════════════════════════
export interface GuestBirthday {
  vk_id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  branch_name?: string;
  coins: number;
  segment_emoji?: string;
  segment_name?: string;
  birthday: string;             // ISO YYYY-MM-DD
  birthday_this_year: string;   // ISO в этом году (для сортировки)
  days_until: number;           // 0 = сегодня, -N = N дней назад, +N = через N
  age_turning?: number;         // сколько исполняется (если год рождения известен)
  is_loyal: boolean;            // постоянный гость (frequency >= 8)
  greeting_status: 'planned' | 'sent' | 'came' | 'none';  // статус автопоздравления
}

// ════════════════════════════════════════════════════════════════════
// GLOBAL SEARCH — поиск по всему приложению
// ════════════════════════════════════════════════════════════════════
export type SearchEntityType = 'guest' | 'review' | 'product' | 'quest' | 'promotion';

export interface SearchHit<T = any> {
  type: SearchEntityType;
  id: number | string;
  title: string;
  subtitle?: string;
  match?: string;        // сниппет с подсветкой совпадения
  raw: T;                // оригинальная сущность (для навигации)
}

export interface SearchResults {
  q: string;
  total: number;
  guests: SearchHit[];
  reviews: SearchHit[];
  products: SearchHit[];
  quests: SearchHit[];
  promotions: SearchHit[];
}

// ════════════════════════════════════════════════════════════════════
// AUTH — логин и сессия
// ════════════════════════════════════════════════════════════════════
export interface LoginCredentials {
  login: string;     // email или телефон
  password: string;
}

export interface LoginResponse {
  token: string;
  refresh?: string;        // refresh-token (из бэкенда apps.shared.users.auth)
  profile: Profile;
  expires_at?: string;
}

// ════════════════════════════════════════════════════════════════════
// AUDIT LOG — журнал действий сотрудников
// ════════════════════════════════════════════════════════════════════
export type AuditActionType =
  | 'COIN_ADJUST'      // изменил баланс гостя
  | 'REVIEW_REPLY'     // ответил на отзыв
  | 'REVIEW_RESOLVE'   // закрыл отзыв
  | 'BROADCAST_SEND'   // отправил рассылку
  | 'PRODUCT_CREATE'   // создал подарок
  | 'PRODUCT_UPDATE'   // изменил подарок
  | 'PRODUCT_DELETE'   // удалил подарок
  | 'QUEST_CREATE' | 'QUEST_UPDATE' | 'QUEST_DELETE'
  | 'PROMO_CREATE'  | 'PROMO_UPDATE'  | 'PROMO_DELETE'
  | 'STAFF_INVITE'     // пригласил сотрудника
  | 'STAFF_TOGGLE'     // включил/выключил сотрудника
  | 'STAFF_PERMS'      // изменил права
  | 'THRESHOLDS_SAVE'  // сохранил пороги RF
  | 'DAILY_CODE_MANUAL' // вручную сгенерировал код дня
  | 'AUTH_LOGIN'       // вход
  | 'AUTH_LOGOUT';     // выход

export interface AuditLogEntry {
  id: number;
  staff_id: number;
  staff_name: string;
  action_type: AuditActionType;
  target_type?: 'guest' | 'review' | 'product' | 'quest' | 'promotion' | 'staff' | 'broadcast' | 'thresholds' | 'daily_code';
  target_id?: number | string;
  target_label?: string;          // «Дмитрий Соколов», «Капучино в подарок»
  details?: string;               // текстовое описание («+500 ★ за лояльность», «отключил Кузнецова»)
  delta?: { before?: any; after?: any };
  created_at: string;
}

// ════════════════════════════════════════════════════════════════════
// SUBSCRIPTION / PAYMENT — напоминание об оплате тарифа
// ════════════════════════════════════════════════════════════════════
export interface SubscriptionStatus {
  plan: 'starter' | 'standard' | 'pro';
  plan_label: string;        // «Стандарт»
  price_rub: number;         // 4900
  next_payment_at: string;   // ISO
  auto_pay_enabled: boolean;
  paid_until: string;        // ISO
}
