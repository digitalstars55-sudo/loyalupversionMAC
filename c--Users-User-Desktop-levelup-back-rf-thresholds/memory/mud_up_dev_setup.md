---
name: МуД UP — операционные заметки по dev-серверу и сборке
description: Грабли при разработке Expo web-превью на этой машине — порты, кеш Metro, проверка что бандл свежий
type: project
originSessionId: 3362e558-88ad-43d8-a23a-4e38c0c3dd12
---
## Где живёт код
`c:\Users\User\Desktop\levelup-back-rf-thresholds\levelup-back-mobile\rf-mobile\` — Expo проект, SDK 54, RN 0.81, TypeScript. Зависимости установлены, ~700+ npm-пакетов в `node_modules/`.

## Запуск web-превью
```bash
cd /c/Users/User/Desktop/levelup-back-rf-thresholds/levelup-back-mobile/rf-mobile
CI=1 npx expo start --web --port 8101
```
- `CI=1` обязателен — без него Expo требует interactive ввода (например подтверждение порта). С CI просто стартует и слушает.
- Бандл собирается лениво при первом curl/visit — заранее ничего не bundle'ится.

## Грабли с Metro-кешем (важно)
**Симптом:** Изменил исходники → ребут сервера → бандл всё ещё старый. Юзер не видит изменений.

**Причины которые встречались:**
1. **Зомби-процессы.** На этой машине привычка плодить старые `expo start` процессы — каждый перезапуск оставляет node.exe висеть. Доходило до 12 параллельных Metro. Они конкурируют за `node_modules/.cache/metro` и портят его.
2. **Бандл-инспекция через curl ВВОДИТ В ЗАБЛУЖДЕНИЕ.** URL `/index.ts.bundle?...&lazy=true` отдаёт ТОЛЬКО entry-chunk. Cyrillic-литералы JSX-текстов из других модулей в нём не находятся, даже если они в коде. Так что grep на бандл — ненадёжный способ проверки.

**Правильная процедура когда «изменения не видны»:**
```bash
# 1. Убить все node-процессы
taskkill //F //IM node.exe
# 2. Очистить кеши
rm -rf node_modules/.cache .expo
# 3. Один свежий Metro с --clear на новом порту
CI=1 npx expo start --web --port 81XX --clear
# 4. Проверить через браузер с Ctrl+Shift+R или режим инкогнито
```

## Проверка что бандл свежий
Не надёжно через grep. Надёжный способ — добавить временную **зелёную плашку «✅ V<N> · ...»** в самом верху AnalyticsScreen перед header'ом. Юзер сразу видит её или не видит.

(Сейчас такая плашка стоит в `src/screens/AnalyticsScreen.tsx` — её нужно удалить перед прод-сборкой.)

## Текущее состояние сервера на 2026-05-04 в конце сессии
- Активный порт: **8102** (CI=1, --clear, чистый кеш)
- 1 Metro-процесс
- Debug-плашка V5 удалена при сборке под TestFlight.

## EAS / TestFlight setup (готово)
- `app.json` — bundleId `ru.levelup.mudup`, scheme `mudup`, name «МуД UP», иконки/permissions/expo-notifications/expo-image-picker plugins, splash purple `#A855F7`.
- `eas.json` — 4 build-профиля: `development` (Dev Client APK + iOS internal), `development-simulator`, `preview` (TestFlight internal), `production` (App Store + Play AAB). Submit-секция требует Apple ID / ASC App ID / Team ID — заглушки `REPLACE_ME`, заполнить перед первым `eas submit`.
- Нужно: `eas init` → получить projectId → заменить нули в `extra.eas.projectId` в app.json. Затем `eas build --profile development --platform ios|android`.

## Backup файл
`App.tsx.backup-pre-refactor` в корне `rf-mobile/` — оставлен после рефакторинга монолита в src/. Безопасен к удалению, всё что в нём было — теперь в src/.

## Установленные опциональные зависимости
- `expo-haptics` (для taptics на native, no-op на web)
- `expo-image-picker` (на native; на web используется `<input type=file>`)
- `expo-notifications` + `expo-device` (для пушей)

Все обёрнуты в `try { require(...) } catch {}` в `src/platform.ts` и `src/push.ts`, так что при их отсутствии приложение не падает.

## Web-специфика
- `Platform.OS === 'web'` ветка в:
  - `BroadcastModal.onPickImage` — HTML `<input type="file">` вместо expo-image-picker
  - `haptic()` — no-op
  - `ripple()` — возвращает `{}` (Material ripple только Android)
  - `registerForPushNotifications()` — возвращает `null` (нет push-токена в браузере)
- `KeyboardAvoidingView` с `behavior=padding` только на iOS, иначе undefined.

## Why: эти заметки спасут полчаса
Юзер видел «не видно изменений» дважды за сессию из-за зомби-процессов и кеша. Не повторять — следовать процедуре выше.
