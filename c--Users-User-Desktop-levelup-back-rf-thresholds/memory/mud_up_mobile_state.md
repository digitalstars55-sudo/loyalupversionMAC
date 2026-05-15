---
name: ЛоялUP mobile — текущее состояние и roadmap
description: Состояние мобильного приложения на 2026-05-07 — что сделано (Фазы A/B/C, F1-F5), на каком шаге выкатки в TestFlight
type: project
originSessionId: 3362e558-88ad-43d8-a23a-4e38c0c3dd12
---

# 🚨 Текущий шаг (2026-05-07) — ВЫКАТКА В TESTFLIGHT, ЗАСТРЯЛИ

**Где мы:** настроены credentials в Apple Developer + App Store Connect, упёрлись в **2FA SMS блокировку Apple**.

**Что уже готово:**
- ✅ EAS проект создан (`@levone/mud-up`, projectId в `app.json`).
- ✅ Bundle ID `ru.levelup.mudup` зарегистрирован в Apple Developer + Push Notifications capability включён.
- ✅ App Store Connect: приложение «ЛоялUP» создано. **ASC App ID** = `6767007325`, **Team ID** = `4SH8A27VC9`, **Apple ID email** = `levonelevon11@gmail.com`. Эти три значения уже в `eas.json` → `submit.production.ios`.
- ✅ App Store Connect API Key создан, файл `AuthKey_7CM4KKVKVJ.p8` лежит в `rf-mobile/` (gitignored через `*.p8`).
  - **Key ID:** `7CM4KKVKVJ`
  - **Issuer ID:** `09228cbf-f64a-429f-a773-0019583fb7d2`
- ✅ В `eas.json` убран `channel` из всех профилей (был блокером — требовал expo-updates).
- ✅ В `app.json` убран `owner: "levelup"` (юзер логинится как `levone`, не `levelup`).
- ✅ Git инициализирован в **родительской** папке `levelup-back-rf-thresholds/` (когда EAS попросил).

**Блокер:** Apple temporarily blocks SMS verification codes на её phone number. Ошибка от Apple:
> Verification codes can't be sent to this phone number at this time. Please try again later.

EAS требует Apple Developer Portal login для setup credentials (cert + provisioning profile + push key). Все варианты `eas credentials` → `Add API Key` всё равно лезут в Apple login. App-Specific Password не работает (она пробовала `godn-sfjd-msnr-dxil`, который теперь должен быть **отозван** — она сама отзывала). ASC API Key через env vars `EXPO_ASC_API_KEY_PATH`/`EXPO_ASC_KEY_ID`/`EXPO_ASC_ISSUER_ID` не помогает — `eas build --non-interactive` ругается «Distribution Certificate is not validated for non-interactive builds».

**Следующий шаг (когда продолжим):**
1. **Подождать 1-24 часа** пока Apple снимет SMS rate-limit. ИЛИ
2. **Trusted Apple device:** залогиниться в Apple ID на iPhone/iPad/Mac → Settings → Apple ID. Тогда 2FA код придёт push-уведомлением, а не SMS.
3. После разблока: `cd levelup-back-mobile/rf-mobile && eas credentials` → `iOS` → `production` → **YES** на «Do you want to log in» → ввести пароль → ввести 2FA код → пройти меню API Key → выйти.
4. После credentials setup: `eas build --profile production --platform ios` → ~25 мин → `.ipa`.
5. `eas submit --profile production --platform ios` → TestFlight (5-30 мин до Processing → Ready).

**Что НЕ настроено ещё:**
- EAS env vars (`EXPO_PUBLIC_API_BASE`, `EXPO_PUBLIC_USE_MOCK=false`) для production-сборки. Сейчас билд пойдёт с дефолтами (mock-режим, placeholder домен). Для теста UI в TestFlight это OK; для реального production — нужно настроить.
- Google Play Console: app не создан, service account не сгенерирован. Pack-в-Path A: сначала iOS, потом Android.
- Иконки `assets/*.png` — статус неизвестен. Если дефолтные — Apple Review отклонит.

# Контекст
# Контекст
Работаем над мобильным приложением **ЛоялUP** (ребренд из «МуД UP») — кабинет администратора заведения общепита, читает данные из Django-бэка по адресу типа `https://your-tenant.levone.ru`. Веб-версия живёт в `levelup-back-rf-thresholds/`. Мобильная реализация — в `levelup-back-mobile/rf-mobile/` (Expo SDK 54, RN 0.81, TypeScript). Бренд URL и bundle ID (`ru.levelup.mudup`) НЕ переименовывались — только UI-тексты сменены на «ЛоялUP».

# Фаза C — закончена 2026-05-05
Все 4 фичи в коде, `npx tsc --noEmit` чистый.

## #4 Realtime чат
- `src/realtime.ts` — singleton event-bus (`subscribe/emit`) с топиками `chat:typing|message|read|presence|user-typing`. Mock-цикл `startMockRealtime()` запускается из App.tsx и каждые 90–180 сек переключает manager.online↔offline.
- `mockManagerReplyFlow(userMsgId, buildReply)` оркестрирует last-mile demo: typing → read-receipt user-сообщения → message от менеджера. Использован в ChatScreen.onSend вместо прямого `mockManagerReply` append.
- App.tsx — глобальный subscriber на `chat:message`+`chat:read` (чтобы badge тикал даже когда юзер не на табе чата). ChatScreen — только локальные UI-эффекты (typing indicator, presence в шапке) + auto-mark-read при появлении нового сообщения когда экран открыт.
- ChatBubble визуально отделяет `delivered` (✓✓ белые) от `read` (✓✓ зелёные C.lime) — read-receipt сразу видно.

## #16 A/B-рассылки + пол + процент
- `src/types.ts`: новые `GenderFilter`, `CampaignVariant`, расширение `Campaign` опциональными `gender_filter`+`variants[]`.
- `sendBroadcast` в api.ts принимает variants[] и gender_filter. В моке имитирует сплит: total = base, deli по percent.
- `BroadcastModal.tsx` — добавлен collapsible блок: чипы пола (Все/Женщины/Мужчины) + toggle «A/B-тест» + второе текстовое поле + AI-кнопка для варианта B + визуальная пропорциональная полоска `[A 65%][B 35%]` + два числовых поля (любое поле — другое автопересчёт через clampSplit) + чипы 50/70/80/90 как пресеты. Пол считает оценочный охват по моку 55%♀/45%♂.
- `CampaignsScreen.tsx` — A/B-кампании рендерятся как два бокса side-by-side (response_rate каждого, pill «победитель» у того у кого выше). Gender pill в meta-row. Демо-данные id 9 (без пола) и 10 (только ♀) в MOCK_CAMPAIGNS.

## #9 Аналитика подарков и квестов
- `src/screens/EngagementAnalyticsScreen.tsx` — новый overlay-экран (открывается из Home quick-action 🎁). Таб Подарки/Квесты, чипы периода 7/30/90, KPI плитки, воронка `получили→активировали→сгорело`, top-список с трендами ±%, конверсиями (зелёный ≥85% / жёлтый ≥70% / красный иначе для подарков; ≥60/40/иначе для квестов), стек-бар start/complete для квестов.
- `fetchEngagementAnalytics()` в api.ts. Моки: `MOCK_GIFTS_ANALYTICS` (7 шт), `MOCK_QUESTS_ANALYTICS` (6 шт), `MOCK_ENGAGEMENT_SUMMARY`.
- Подключено как overlay `'engagement'` в App.tsx. Добавлена quick-action в HomeScreen.

## #11 Offline mode
- `src/storage.ts` — расширен `cacheGet/cacheSet/withCache<T>(key, fetcher)`. Префикс ключей `@loyalup/cache:`.
- `src/network.ts` — детектор online/offline (web: navigator.onLine + online/offline events; native: NetInfo если установлен, иначе всегда online до первого fail-fetch). Хук `useNetworkStatus()`. Manual debug-toggle `setForceOffline()`. `markOffline()/markOnline()` дёргается из api.ts при сетевой ошибке.
- `src/components/OfflineBanner.tsx` — янтарная полоска сверху приложения в App.tsx (рендерится поверх AuthGate, не зависит от логина).
- `fetchRFMatrix`, `fetchReviews`, `fetchGuests` обёрнуты в `withCache`. Mock-путь тоже пишет в кэш (для будущей real-сборки seed). Real-путь `netFetch()` вместо `fetch()` чтобы метить markOnline/markOffline.
- More → секция Debug → toggle «Оффлайн (вкл/выкл)» — для демо/тестирования.

# Что было до Фазы C (Фазы A+B, 2026-05-04→05)
- **Фаза A**: AuthScreen + login()/logout + JWT persist через storage abstraction (web localStorage / native AsyncStorage если есть, иначе in-memory), AuthGate в App.tsx; AuditLogScreen + 18 типов AuditAction; новые push-channels default/urgent/info; реальный sendPushTokenToBackend.
- **Фаза B**: SearchScreen (debounced 250ms) + globalSearch() across guests/reviews/products/quests/promotions; BirthdaysScreen + fetchUpcomingBirthdays; bulk-операции в ReviewsScreen (long-press → selectionMode → sticky action bar) + bulk-resolve; Multi-staff presence (mock на reviews #1 и #7) + presence-banner в ReviewDetailModal.

# Фаза F — закончена 2026-05-07
Большая фича-серия: онбординг новых клиентов через AI + автосоздание тенанта + еженедельные дайджесты. Все packs аддитивны для бэкенда — веб-панель не тронута.

## Pack F1 — UI онбординга
- `src/screens/ChoiceScreen.tsx` — стартовый экран с двумя CTA: «Войти в кабинет» (existing AuthScreen) и «Я хочу стать клиентом».
- `src/screens/OnboardingSlideshow.tsx` — 5 слайдов про продукт (RF, рассылки, отзывы, подарки/квесты).
- `src/screens/OnboardingChatScreen.tsx` — чат с AI-менеджером. Имеет три режима через state machine `mode: 'loading' | 'ai' | 'script'`. На mount пытается создать Lead через бэк → если успех, ai-режим. Если падает → fallback на скрипт (state machine с фиксированными вопросами cafe_name → cafe_count → traffic → full_name → vk_explain → vk_token → email → review).
- `src/screens/OnboardingPendingScreen.tsx` — после submit, объясняет что письмо придёт когда подтвердят.
- App.tsx → новый AuthGate flow: `'choice' | 'slideshow' | 'chat' | 'pending' | 'auth'`. AuthScreen теперь принимает опциональный `onBack` чтобы вернуться к ChoiceScreen.

## Pack F2 — Lead model + admin
- Новое shared-приложение `apps/shared/leads/` (в SHARED_APPS, не в TENANT_APPS — Lead существует ДО тенанта).
- Модель `Lead`: cafe_name, cafe_count, traffic_estimate, package_suggested, full_name, email, vk_token, domain_slug, status (`draft|submitted|confirmed|rejected`), conversation_history (JSON), session_token (32 char random для безавторизационного доступа из мобайла), confirmed_by FK на User, company FK на Company.
- Endpoints (без auth, по session_token): POST `/api/v1/leads/`, GET/PATCH `/api/v1/leads/{token}/`, POST `/api/v1/leads/{token}/submit/`.
- Admin регистрация в public_admin (super-админ) с action «Подтвердить заявку».
- Миграция `0001_initial.py` создаёт таблицу `leads_lead` в public schema.

## Pack F3 — AI-чат через Anthropic Claude
- `apps/shared/leads/ai.py` — модуль с system prompt + tool `update_lead` (JSON Schema) + `run_chat_turn(lead, user_message)`. Использует `claude-haiku-4-5-20251001`, уважает `AI_PROXY_URL`. Цикл с лимитом 3 итерации (защита от tool-loops). Подмешивает Knowledge Base из existing analytics.KnowledgeBaseDocument.
- Endpoint POST `/api/v1/leads/{token}/chat/` — реальный AI. Если Anthropic упал → 503 + `fallback: true`, мобайл переключается на script-режим.
- `_apply_tool_input(lead, tool_input)` — валидирует поля (cafe_count диапазон 1-999, email формат), авто-генерит `domain_slug` из `cafe_name` транслитерацией.
- В мобайле: `chatWithLeadAI`, `createLead`, `submitLeadByToken`, класс `AIFallbackError`. UI показывает «AI» pill в шапке когда работает Anthropic.

## Pack F4 — авто-создание тенанта
- `apps/shared/leads/provisioning.py` → `create_tenant_from_lead(lead, by_user)`:
  1. Валидация и unique schema_name.
  2. `Company.objects.create(...)` (auto_create_schema=True → Postgres schema создаётся, миграции tenant_apps применяются).
  3. `Domain` (primary `{schema}.levone.ru`).
  4. `User` с `role=NETWORK_ADMIN`, random password.
  5. `CompanySecret` (новая модель, отдельно от ClientConfig — там VK group token).
  6. Lead.status=CONFIRMED, ссылка на Company.
- Откат при ошибке: `company.auto_drop_schema=True; company.delete()` (django-tenants дропает schema).
- Email клиенту с creds (HTML+text шаблон `templates/leads/email_credentials.html` в фирстайле). Уведомление супер-админу.
- Settings: SMTP конфиг (Yandex SMTP defaults через env, fallback на console.EmailBackend если EMAIL_HOST_USER пустой).
- Миграция `0002_company_secret_and_password_fields.py` (CompanySecret + поля initial_password_hint, email_sent_at у Lead).

## Pack F4.5 — tenant_domain routing на мобайле
- `ProfileSerializer` теперь возвращает `tenant_domain` (primary domain первой компании юзера) и `tenant_name`.
- Мобайл: `getApiBase()`, `setApiBase(domain | null)` в api.ts. Все 64 fetch'а заменены с `API_BASE` на `getApiBase()`.
- App.tsx: после login → `setApiBase(profile.tenant_domain)`. На bootstrap → восстанавливаем из storage. На logout → `setApiBase(null)`.
- `Profile.tenant_domain?: string | null` добавлен в types.ts.
- Сюда же — `STORAGE_KEYS.REFRESH_TOKEN`, `LoginResponse.refresh?: string`. Refresh-токен сохраняется в SecureStore (если установлен) при login, чистится при logout.

## Pack F5 — еженедельный дайджест
- `apps/shared/leads/digest.py` — `collect_metrics(company)`: для каждого тенанта внутри его schema считает `branches_count`, `reviews_unanswered_negative` (>24ч), `reviews_overdue_negative` (>72ч), `reviews_total_week`, `broadcasts_sent_week`, `last_login_days_ago`. Скоринг неактивности (max 100): >5 негативов = +30, 0 рассылок = +20, login>7д = +25, просрочка>72ч = +25. Status: green<30, yellow 30-49, red ≥50.
- `apps/shared/leads/tasks.py` → Celery task `weekly_client_digest_task` шлёт email клиенту (network_admin User'у) + при `red` — алерт супер-админу через `SUPER_ADMIN_EMAILS`.
- `templates/leads/email_digest.html` — KPI-grid в фирстайле, рекомендации по приоритетам.
- `main/celery.py`: добавлен в `beat_schedule` запись `weekly-client-digest` каждый понедельник в 9:00 МСК.

## Бэкенд: что добавлено в settings/urls (ВСЁ АДДИТИВНО)
- `main/settings.py`:
  - `INSTALLED_APPS` (через TENANT_APPS): `apps.tenant.mobile.apps.MobileConfig`.
  - `INSTALLED_APPS` (через SHARED_APPS): `apps.shared.leads.apps.LeadsConfig`.
  - `REST_FRAMEWORK.DEFAULT_AUTHENTICATION_CLASSES`: `[JWTAuthentication, SessionAuthentication]` — JWT для мобайла, Session для веба, веб не сломан.
  - `CORS_*` секции (corsheaders уже было в middleware).
  - `EMAIL_*` секции (Yandex SMTP defaults, console fallback).
  - `TENANT_DOMAIN_ROOT='levone.ru'`, `SUPER_ADMIN_EMAILS=[]`.
- `main/urls.py`: `path('api/v1/', include('apps.shared.users.api.urls'))` + `path('api/v1/', include('apps.tenant.mobile.api.urls'))`.
- `main/public_urls.py`: `path('api/v1/', include('apps.shared.users.api.urls'))` + `path('api/v1/', include('apps.shared.leads.api.urls'))`.
- `apps/shared/users/auth.py` — JWT auth class на PyJWT (уже было в requirements).

## Бэкенд: что НЕ сделано / отложено
- Pack B был отложен: `PushToken` модель в `apps/shared/users/models.py`. Сейчас `PushRegisterAPIView._store` — in-memory dict, теряется при рестарте. Нужно создать модель + migrate, потом подменить `_store` на `PushToken.objects.update_or_create`.
- Эндпоинты для остальной мобайл-логики (chat manager, auto-reply, search, birthdays, audit-log, engagement) **не реализованы** — мобайл использует моки.

# Сборка / выкладка — НЕ ГОТОВО
- `app.json` уже сконфигурен (bundleId `ru.levelup.mudup`, scheme `mudup`, plugins, permissions).
- `eas.json` есть, но submit-секция = `REPLACE_ME` (Apple ID/ASC App ID/Team ID).
- `extra.eas.projectId` в app.json = `00000000-...` — надо `eas init`.
- `USE_MOCK = true` в src/api.ts — переключить на false.
- `API_BASE = 'https://your-tenant.levone.ru'` — заменить на реальный URL.
- Иконки в `assets/` — дефолтные expo, надо брендированные.
- Apple Developer аккаунт + APNs cert + Firebase для пушей — заводится в EAS dashboard.
- При выкладке учитывать что мок-моды (`USE_MOCK=true`) ВЕЗДЕ — каждая `if (USE_MOCK)` ветка должна быть проверена и отдавать аналог по реальному API.

# Открытые вопросы для следующей сессии
1. Apple Developer аккаунт есть? Без него только Android.
2. Реальный API_BASE — какой URL у прод-инстанса Django?
3. Все ли эндпоинты из mud_up_backend_contract.md уже реализованы в Django? (включая новые из Фаз A/B/C: /api/v1/auth/login, /api/v1/audit-log, /api/v1/search, /api/v1/birthdays, /api/v1/analytics/engagement)
4. Push: какой провайдер (Expo Push, FCM, APNs прямой)?
5. Брендированные иконки/сплеш — есть макет или генерировать из логотипа?

## Why: для чего вообще делается мобайл
Юзер (владелец/админ кафе) переносит существующую веб-аналитику Levelup в нативное приложение, потому что веб-версия не оптимизирована под телефон, а большинство задач возникают в моменте «на смене».

# v2 пакет (после первого билда — TestFlight + Expo Dev Client + should-have)

## Новые экраны и фичи (2026-05-04, после длинного раунда)
- **Home dashboard** (HomeScreen) — приветствие по времени суток, карточка «Задачи дня» (ответить на негатив, апрувнуть AI-черновик, прочесть менеджера, поблагодарить позитив с deep-link через `onOpenReview`), KPI-снимок дня (база/риск/негатив 7д/чемпионы), VIP-риск фокус-блок (R1·F3), топ-3 точек по рейтингу, лента активности (отзывы + сообщения менеджера), quick-actions. Defaultный таб приложения теперь `home`.
- **Кампании** (CampaignsScreen) — история рассылок, фильтр All/Sent/Failed, summary «всего отправлено», status pills (sent/failed/scheduled). Mock-данные в `MOCK_CAMPAIGNS` (8 рассылок).
- **Гости** (GuestsScreen) — полная база с поиском по имени/VK ID, фильтрами по recency (Свежие/Тёплые/Остывают/Потеряны).
- **Точки** (BranchesScreen) — список филиалов с рейтингом APP-отзывов и количеством, кнопка «Подключить точку» → открыть чат с менеджером.
- **Пороги RF** (RFThresholdsScreen) — степпер по каждому порогу (R3/R2/R1, F1/F2), Save/Reset с confirm-alert. Save вызывает `updateRFThresholds`.
- **Полная история миграций** (MigrationsModal) — bottom-sheet со всеми 15 миграциями, фильтр All/Прирост/Отток, summary +Gain/-Loss. Кнопка «Показать все миграции» в AnalyticsScreen после короткого списка.
- **Поиск в Отзывах** — TextInput по имени гостя/тексту/точке с x-кнопкой очистки.
- **Skeleton-загрузчики** — `<Skeleton/>`, `<SkeletonCard/>`, `<SkeletonList/>` в `src/components/Skeleton.tsx`. Заменён ActivityIndicator в AnalyticsScreen, ReviewsScreen, CampaignsScreen, GuestsScreen, BranchesScreen, RFThresholdsScreen, MigrationsModal, HomeScreen.
- **Pull-to-refresh в чате** — RefreshControl на инвертированный FlatList.
- **Attachments в чате** — paperclip → expo-image-picker (native) или `<input type=file>` (web, через FileReader → data URL). Превью-стрип над input bar с x-кнопкой удаления. ChatBubble рендерит `bubbleImage` или `bubbleFile` для каждого attachment. На отправку attachments переносятся в финальное сообщение в `setMessages` callback.
- **Расширены типы**: `ChatAttachment`, `Campaign`, `CampaignStatus` в `src/types.ts`.
- **Новые API-функции**: `fetchCampaigns`, `fetchFullMigrations`, `updateRFThresholds`, `fetchBranches` в `src/api.ts` (MOCK-режим работает).

## Конфигурация под TestFlight + Expo Dev Client (готово)
- `app.json` — name «МуД UP», slug `mud-up`, bundleId `ru.levelup.mudup`, scheme `mudup`, фиолетовый `#A855F7` splash, expo-notifications + expo-image-picker plugins с русскими permission-описаниями, iOS NSCameraUsageDescription/NSPhotoLibraryUsageDescription/NSMicrophoneUsageDescription/ITSAppUsesNonExemptEncryption, Android permissions для камеры/галереи/вибрации, owner `levelup`.
- `eas.json` — 4 профиля (`development` Dev Client APK + iOS internal, `development-simulator`, `preview` TestFlight internal, `production` App Store + Play AAB). Submit-секция с placeholder `REPLACE_ME` для Apple ID/ASC App ID/Team ID — заполнить перед первым `eas submit`.
- Перед билдом нужно: `eas init` чтобы создать project, заменить нули в `extra.eas.projectId` (сейчас `00000000-...`).

## Удалено
- Debug-плашка V5 в `AnalyticsScreen` — снята.

## TS-чек
- `npx tsc --noEmit` → 0 ошибок.

## Текущий dev-сервер
- Порт **8102**, чистый кеш, 1 Metro-процесс. Доступен по http://localhost:8102/.

# v1 базовый пакет — что готово на 2026-05-04 (визуально подтверждено в браузере)

1. **5 табов навигации:** 🏠 Главная (заглушка) · 📊 Аналитика · ⭐ Отзывы · 💬 Чат · ⋯ Ещё
2. **RF-аналитика** в стиле Bento (hero + 2 medium + horizontal compact strip) с тогглом на классическую матрицу 4×3, фильтр-чипами Все/Горящее/VIP/Свежие, LegendSheet-карточкой памятки
3. **Detail-карточка сегмента** с объединённым жёлтым advice-боксом (совет + стратегия), кнопками Рассылка/Гости
4. **BroadcastModal** с AI-текстом, char-counter'ом, web-веткой image picker через `<input type="file">`, Senler-ссылкой внизу
5. **Reviews-лента** с summary-strip (распределение тональностей бар-полосой), фильтр-чипами (Все/Черновики/Ожидают/Негатив/Отвечено/APP), карточками с avatar/sentiment/AI-comment, ReviewDetailModal с pre-fill из AI-черновика
6. **Auto-reply settings** в Ещё → большой sub-screen с per-тональность/per-точка тогглами, выбором интервала напоминаний (30/60/180/720 мин), тоном AI
7. **ChatScreen** полноценный: пузырьки, day-separator, status receipts (◌→✓✓), quick-reply chips, KeyboardAvoidingView, mock auto-reply менеджера через 1.5–3 сек с контекст-зависимыми ответами
8. **Manager contact** — карточка в Ещё→Поддержка с большим аватаром, телефоном (selectable), часами, статусом + кнопки «Позвонить» (через `Linking.openURL('tel:...')`) и «Открыть чат»
9. **Push** — `expo-notifications` подключен, registerForPushNotifications + addPushResponseListener, deep-link тапа открывает нужный таб + автоматически открывает конкретный отзыв по review_id; симулятор пушей в Ещё с тремя кнопками
10. **Доставка ≠ кафе** — отдельный MOCK_DELIVERY с другими числами (total 1854 vs 2847, больше F1, меньше F3)
11. **Произвольный период** — DateRangeModal с маской ДД.ММ.ГГГГ + quick-presets, параметры передаются на бэк как `start_date`/`end_date`
12. **Рейтинг точек** — секция в Аналитике после bento, считается из APP-отзывов через `computeBranchRatings(reviews, branches)` в helpers.tsx
13. **Запрет закрытия негативного отзыва без ответа** — кнопка «Mark resolved» убрана для VK+негатив+неотвечено, вместо неё красная подсказка про необходимость ответа
14. **Адаптивность** — `useResponsive` хук, breakpoints для tiny/small/normal/large/tablet, корректно работает 320–768px

## How to apply: что это значит для продолжения работы
- Стиль закреплён: Manrope шрифт, фиолетовый+lime бренд, тени, скругления — НЕ менять без явной просьбы юзера. Юзер дважды просил «не трогать стиль».
- Можно добавлять новые экраны и фичи, опираясь на существующие компоненты в `src/components/` и стили в `src/styles.ts`.

# Что осталось до прода (после v2 — приоритетный порядок)

## Блокеры запуска
1. **Авторизация полностью отсутствует.** Default tab = home, экран логина не нужен прямо сейчас если только в TestFlight. Для прода нужен: экран логина, хранение JWT через `expo-secure-store` (native) и `localStorage` (web), вызов `setAuthToken(jwt)` после логина.
2. **`USE_MOCK = true` в `src/api.ts`** — переключить на false + указать реальный API_BASE.
3. **Бэк-эндпоинтов которых нет** — см. `mud_up_backend_contract.md`. Дополнительно к существующему списку добавились: `/api/v1/analytics/campaigns/`, `/api/v1/analytics/rf/migrations/`, `/api/v1/analytics/rf/thresholds/` (PATCH), `/api/v1/branches/`.
4. **EAS init** — `eas init` чтобы создать project, заменить нули в `extra.eas.projectId` в app.json. Без этого `eas build` не запустится.
5. **APNs cert (iOS) + Firebase (Android) для push** — заводится в EAS dashboard. Сервис отправки пушей через Expo Push API.
6. **Iconchecking иконок** — `assets/icon.png`, `assets/adaptive-icon.png`, `assets/splash-icon.png` сейчас дефолтные expo. Заменить на брендированные перед TestFlight.
7. **Удалить App.tsx.backup-pre-refactor** в корне rf-mobile/.
8. **Submit credentials** — заполнить `REPLACE_ME` в `eas.json` submit-секции (Apple ID, ASC App ID, Apple Team ID).

## Should-have (v2 закрыт всё кроме реалтайм чата)
- **Реалтайм чат** — сейчас pull-to-refresh и mock auto-reply. Нужен WebSocket/SSE/long-polling для прода.
- **Профиль** — пока заглушка в Ещё.
- **Общая статистика** — пока заглушка.
- **Помощь / Выход** — пока заглушки.

## Nice-to-have
- Голосовые сообщения в чате
- i18n если будут не русскоязычные тенанты
- Accessibility-метки

# Открытые вопросы для юзера
1. Apple Developer аккаунт — есть? Без него TestFlight не получится. Если нет — пока только Expo Dev Client APK для Android.
2. Кто делает недостающие бэк-эндпоинты — это работа Django-разработчика. Нужна сверка с реальными моделями.
