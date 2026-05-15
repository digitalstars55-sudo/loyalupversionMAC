# ЛоялUP Mobile (rf-mobile) — гайд для Claude

> **Открыт в этой папке = ты работаешь над iOS/Android приложением для
> ВЛАДЕЛЬЦЕВ ресторанов (TestFlight).** Это НЕ VK мини-апс гостей и НЕ
> Django backend. Прежде чем что-то менять — прочитай этот файл целиком.

---

## 0. Что это и что это НЕ

- **Это:** Expo / React Native приложение. Личный кабинет владельца сети
  ресторанов: RF-аналитика, отзывы, рассылки, каталог, квесты, ДР гостей,
  саппорт-чат с поддержкой ЛоялUP (через CheckUp), push. Распространяется
  через TestFlight (iOS) + internal track (Android).
- **Это НЕ:** (1) VK мини-апс гостей — отдельный проект `levone-front-v3`
  (Vite/React) на сервере, грузится из VK iframe. (2) Backend — Django,
  репо `digitalstars55-sudo/loyaluplastversion14-05-2026`, на `81.17.154.208`.
- **Канон-репо:** `digitalstars55-sudo/loyalupversionMAC`, путь:
  `MOBILE_TESTFLIGHT_app/rf-mobile/`
- **Деплой:** OTA через `eas update` (НЕ rebuild для JS-правок). Раздел 9.

Карта всех репо/папок: `FILE_LAYOUT.md` в корне репо. История инцидента
2026-05-14: backend-репо `docs/SESSION_2026_05_14.md`.

---

## 1. Стек

Expo ~54 (`newArchEnabled`), React 19.1, RN 0.81.5. expo-updates ~29
(OTA канал `production`, `runtimeVersion.policy: appVersion`),
expo-notifications (push), expo-secure-store (JWT), async-storage,
lucide-react-native, react-native-svg, react-native-web. TS ~5.9.
**Навигация самописная через state в App.tsx** (без react-navigation).
EAS project `06c888dd-4212-4d02-8280-511cdbef7045`, owner `levone`,
iOS bundle `ru.levelup.mudup`.

---

## 2. Архитектура

```
index.ts → App.tsx (root state + навигация + realtime + push)
              └── src/screens/*.tsx (~30 экранов)
                    └── src/api.ts (весь HTTP) → getApiBase()+authHeaders()
```

Глобальный state в App.tsx, прокидывается пропсами. `messages`+`setMessages`
для чата — App-level (badge непрочитанных работает вне таба «Чат»).

| Файл | Роль |
|---|---|
| `App.tsx` | Root, ~457 стр. State, навигация (tab/flow), auth bootstrap, realtime+push. |
| `src/api.ts` | Весь HTTP-клиент, ~1500 стр, ~70 функций. `getApiBase/setApiBase/setAuthToken`, `USE_MOCK`. |
| `src/types.ts` | Все TS-типы. |
| `src/mocks.ts` | Мок-данные (`MOCK_MESSAGES`, ...). Дефолт state в App.tsx даже при USE_MOCK=false. |
| `src/realtime.ts` | Event bus (`subscribe/emit`). Топики chat:typing/message/read/presence. Сейчас mock. |
| `src/push.ts` | Expo push, `setupPushHandlers()`, типы PushType. |
| `src/storage.ts` | web→localStorage, native→SecureStore/AsyncStorage. |
| `src/network.ts` | Offline-детект. |
| `src/theme.ts` | Палитра `C` (фиолетовый `#A855F7`). |
| `src/styles.ts` | `makeStyles(r)`. `src/responsive.ts` — `useResponsive()`. |
| `src/components/*` | ChatBubble, TabBar, модалки, Skeleton, OfflineBanner. |

---

## 3. API-клиент (src/api.ts) — must-know

- `USE_MOCK = _envBool('EXPO_PUBLIC_USE_MOCK', false)` — дефолт false (прод).
  При true — все функции возвращают мок без сети (паттерн
  `if (USE_MOCK) return MOCK_X` в начале каждой).
- **Мультитенантность (КРИТИЧНО):**
  `_DEFAULT_API_BASE = EXPO_PUBLIC_API_BASE || 'https://levelupapp.ru'`.
  `/auth/login/`, `/leads/*` → public-домен. После логина App.tsx зовёт
  `setApiBase(profile.tenant_domain)` → дальше всё на `<schema>.levelupapp.ru`.
  **В новых fetch всегда `getApiBase()`**, не `API_BASE` (не реактивный).
- `setAuthToken(jwt)` → `authHeaders()` = `{Authorization: Bearer <jwt>}`.
- Паттерн: `fetch(new URL('/api/v1/...', getApiBase()).toString(), {headers:{Accept,...authHeaders()}})`.

---

## 4. Auth / навигация (App.tsx)

bootstrap читает token+profile из storage → есть: setAuthToken +
setApiBase(tenant_domain) → tabs; нет: flow='choice'. flow:
choice → AuthScreen(login) ИЛИ Onboarding(Slideshow→Chat→submitLead→Pending).
Табы — switch по `tab: TabKey` (home/analytics/reviews/chat/more + вложенные).

---

## 5. Саппорт-чат (LoyalUP ↔ CheckUp relay)

```
ChatScreen → sendChatMessage() POST /api/v1/support/chat/messages/
  → Django SupportChatMessage(user) → _safe_relay_to_checkup()
  → POST checkupapp.ru/api/v1/loyalup/inbound/ → CheckUp чат, менеджер отвечает
  → CheckUp → POST levelupapp.ru/api/v1/internal/support/inbound-reply/
  → Django SupportChatMessage(manager) + Expo push 'chat_message'
  → мобайл: push ИЛИ polling подтянет
```

Эндпоинты: `fetchChatManager()` GET `/support/chat/manager/` (метаданные +
с backend-коммита `dee0ed3` встроенные `messages`/`unread_count`),
`fetchChatMessages()` GET `/support/chat/messages/`,
`sendChatMessage()` POST `/support/chat/messages/`.

**⚠️ Уже исправленный баг (`2fbde82`) — НЕ откатывать:** App.tsx
инициализирует `messages = MOCK_MESSAGES` (не пустой). Раньше guard
`if (messages.length === 0) fetchChatMessages()` блокировал реальный
fetch → юзер видел только мок. Фикс: убран guard + `setInterval(5000)`
polling пока экран открыт (realtime/WS только для typing/presence).

Realtime: `src/realtime.ts` mock-таймеры. Реальные сообщения менеджера
приходят через HTTP-polling, НЕ через bus. Будущий WS — `emit()` в тот же bus.

---

## 6. Push (src/push.ts)

`setupPushHandlers()` один раз на старте. Регистрация Expo-токена → бэк.
Типы: review_new, draft_ready, chat_message, payment_due, report_ready,
staff_invited, broadcast_done, daily_code_missing, guest_birthday.
Expo Go (Android SDK 53+) remote push не работает — нужен билд.

---

## 7. Backend-контракт

Под `https://<tenant>.levelupapp.ru/api/v1/` (после setApiBase), кроме
auth/leads (`levelupapp.ru`). Backend — репо `loyaluplastversion14-05-2026`.
Изменение формы ответа = backend change, не здесь. Добавление полей
безопасно, удаление/переименование ломает. Точные пути:
`grep "fetch(new URL" src/api.ts`.

---

## 8. Конвенции / подводные камни

1. Всегда `getApiBase()`, не `API_BASE`.
2. USE_MOCK guard в каждой api-функции — сохраняй.
3. State чата (`messages`) — App-level через пропсы, не локальный.
4. Realtime реальных сообщений = polling, не WS. Не выпиливай `setInterval` в ChatScreen.
5. Иконки — `lucide-react-native`. Стили — `makeStyles(r)`.
6. Бренд фиолетовый (`C` в theme.ts).
7. Не добавляй react-navigation (навигация осознанно на state).
8. Токен — через `storage`, не напрямую AsyncStorage.
9. `.env`: `EXPO_PUBLIC_API_BASE`, `EXPO_PUBLIC_USE_MOCK`. Только `EXPO_PUBLIC_` в бандл.

---

## 9. Деплой — OTA, не rebuild

JS/TS-правки → OTA мгновенно:
```bash
cd MOBILE_TESTFLIGHT_app/rf-mobile
git pull origin main
# правки → commit → push
eas update --branch production --message "что сделал"
```
Rebuild ТОЛЬКО при нативке/app.json/новых expo-модулях/смене version:
```bash
eas build --profile production --platform ios && eas submit --platform ios
```
После любого изменения — commit + push в git (репо `loyalupversionMAC`).
Правило как «отче наш» — чтобы не повторить катастрофу 2026-05-14
(несохранённая работа в overlay контейнера уничтожена force-recreate).

---

## 10. Workflow для Claude

1. Прочитал файл → понял: мобайл клиента, не бэк/не мини-апс.
2. `git pull origin main`.
3. Правки **только в rf-mobile/**.
4. `npx expo start` / `npm run web` для проверки.
5. `git add -A && git commit && git push origin main`.
6. JS-only → `eas update --branch production`. Нативка → предупреди, нужен build.
7. Backend-изменения (форма API) — НЕ здесь, скажи править в `loyaluplastversion14-05-2026`.

---

## 11. ТЕКУЩАЯ ЗАДАЧА (ТЗ)

> _Пользователь продиктует ТЗ здесь или в чате. Если пусто — спроси
> что делаем. Не выдумывай задачу сам._

(— ожидает ТЗ —)

---

## 12. Ссылки

- Карта репо: `FILE_LAYOUT.md` (корень репо)
- Backend канон: https://github.com/digitalstars55-sudo/loyaluplastversion14-05-2026
- История 2026-05-14: backend-репо `docs/SESSION_2026_05_14.md`
- Прод: `root@81.17.154.208`, `~levone/levelup-back`