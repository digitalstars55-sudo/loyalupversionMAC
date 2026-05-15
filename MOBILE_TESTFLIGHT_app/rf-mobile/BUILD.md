# ЛоялUP — гайд по сборке (TestFlight + Android APK)

Это пошаговая инструкция, что нужно сделать, чтобы собрать приложение
для App Store TestFlight и Google Play. Большая часть подготовки уже
сделана — иконки, plugins, permissions, JWT-auth, env-конфиг.

## 0. Предусловия

- Установлен **Node.js 20+** и **npm 10+** (или yarn).
- Поставлен EAS CLI: `npm i -g eas-cli`.
- Аккаунт на Expo: `eas login`.
- Для **TestFlight**: Apple Developer account ($99/год) + два certificates
  (Distribution + APNs). EAS их обычно создаёт сам, нужны только credentials.
- Для **Google Play**: Google Play Console account ($25 единоразово) + ключ
  подписи (EAS создаёт автоматически).

## 1. Подключить проект к EAS

```bash
cd levelup-back-mobile/rf-mobile
npm install
eas init      # создаст project на EAS dashboard и пропишет projectId в app.json
```

После `eas init` поле `expo.extra.eas.projectId` в `app.json` сменится с
`00000000-...` на реальный UUID.

## 2. Конфигурация бэкенда

Создай `.env` в `levelup-back-mobile/rf-mobile/` (рядом с `package.json`):

```bash
cp .env.example .env
```

Открой `.env` и впиши:

```
EXPO_PUBLIC_API_BASE=https://demo.levone.ru   # реальный домен тенанта
EXPO_PUBLIC_USE_MOCK=false                    # переключить с моков на real-backend
```

Без `.env` приложение запустится с моками — это нормально для разработки.

## 3. Подключить недостающие native-зависимости

Сейчас есть `expo-image-picker`, `expo-notifications`, `expo-haptics`,
`expo-device`. Для безопасного хранения токена и кеширования нужно ещё:

```bash
npx expo install expo-secure-store @react-native-async-storage/async-storage
```

Они обёрнуты в `try/require` в `src/storage.ts`, так что без установки
приложение тоже работает (fallback в-память), но для прода лучше поставить.

## 4. Иконки и сплеш

Сейчас в `assets/` лежат изображения, унаследованные с базового шаблона
Expo. Замените их на брендированные ЛоялUP:

- `icon.png` — **1024×1024 PNG** без прозрачности (App Store требует).
- `adaptive-icon.png` — **1024×1024 PNG**, должен прорабатываться круглой
  и квадратной маской (Android adaptive). Прозрачность OK, фон уходит
  в `expo.android.adaptiveIcon.backgroundColor` (`#A855F7`).
- `splash-icon.png` — **1242×2436 PNG** (iPhone 15 Pro Max baseline).
  Фон — фиолетовый `#A855F7`, логотип по центру.
- `favicon.png` — **48×48 PNG** для web-превью.

Положите файлы поверх существующих (имена сохранить!).

## 5. Тестовый локальный билд (без EAS)

Чтобы проверить, что всё работает на устройстве через Expo Go:

```bash
npx expo start --tunnel
```

Открой ссылку в Expo Go на телефоне. Заметь что Expo Go не поддерживает
custom native модули, но для большинства фич ЛоялUP (UI, push через Expo,
картинки) этого хватает.

Для пушей и других native-фич — собрать **dev client** (раз):

```bash
eas build --profile development --platform ios       # или android
```

После сборки придёт ссылка, по которой ставится приложение на телефон.
В нём `expo start` работает с native-модулями, не падая на missing-modules.

## 6. Production-сборка

### Android APK (для своего тестирования)

```bash
eas build --profile preview --platform android
# → даст APK-файл, ставится напрямую на телефон через USB или ссылку.
```

### Android AAB (для Google Play Console)

```bash
eas build --profile production --platform android
eas submit --profile production --platform android   # отправка в Play
```

### iOS TestFlight

Перед первым `eas submit` обнови `eas.json` секция `submit.production.ios`:

```json
"submit": {
  "production": {
    "ios": {
      "appleId":     "ваш-apple-id@example.com",
      "ascAppId":    "1234567890",      // App Store Connect App ID
      "appleTeamId": "ABCDE12345"        // Team ID из Apple Developer Portal
    }
  }
}
```

Потом:

```bash
eas build --profile production --platform ios
eas submit --profile production --platform ios       # автоматическая выгрузка
```

После успешной выгрузки приложение появится в TestFlight через 5-30 минут
(статус "Processing" в App Store Connect).

## 7. Push-нотификации

Серверная часть (Django) уже принимает регистрацию токена:

```
POST /api/v1/push/register/
Authorization: Bearer <jwt>
{ "token": "ExponentPushToken[xxxx]", "platform": "ios" | "android" | "web" }
```

Для отправки пушей с бэка — используется Expo Push API
(https://exp.host/--/api/v2/push/send). Это решение пока не реализовано
в backend; если нужно — попроси добавить.

Native push-credentials (APNs cert + FCM key) автоматически создаются
EAS при первом `eas build` для каждой платформы.

## 8. Обновление через OTA (без пересборки)

После любого изменения JS-кода (без правки native plugins или app.json):

```bash
eas update --branch production --message "fix: краш на экране отзывов"
```

Все клиенты, привязанные к каналу `production`, получат обновление при
следующем запуске. Native-changes (новый plugin, иконка, разрешение) —
требуют новой сборки.

## 9. Чек-лист перед первым релизом

- [ ] `app.json` → `extra.eas.projectId` ≠ нули (после `eas init`)
- [ ] `eas.json` → `submit.production.ios` заполнен реальными credentials
- [ ] `assets/` → брендированные иконки и сплеш (см. п. 4)
- [ ] `.env` → `EXPO_PUBLIC_API_BASE` указывает на боевой домен
- [ ] `.env` → `EXPO_PUBLIC_USE_MOCK=false` (только для production-build)
- [ ] Бэкенд: миграции применены (`./manage.py migrate`)
- [ ] Бэкенд: `corsheaders` настроены для прод-доменов (см. settings.py)
- [ ] Бэкенд: `POST /api/v1/auth/login/` работает (проверить через curl)
- [ ] Бэкенд: `GET /api/v1/mobile/reviews/` возвращает данные
- [ ] EAS: project успешно привязан, `eas build:list` показывает сборку

## 10. Частые проблемы

**Проблема:** "JavaScript heap out of memory" при `eas build`.
**Решение:** в `.env` поставь `NODE_OPTIONS=--max-old-space-size=8192`.

**Проблема:** TestFlight показывает "Missing Push Notification Entitlement".
**Решение:** `eas credentials:configure --platform ios` → доустановить APNs.

**Проблема:** Android APK не ставится — "App not installed".
**Решение:** проверить, что `versionCode` в `app.json` увеличен; либо удалить
старую версию приложения с телефона.

**Проблема:** `Network Error` после смены `.env`.
**Решение:** перезапусти `expo start --clear` чтобы Metro подхватил новый env.

---

Вопросы — пиши. Этот гайд можно расширять.
