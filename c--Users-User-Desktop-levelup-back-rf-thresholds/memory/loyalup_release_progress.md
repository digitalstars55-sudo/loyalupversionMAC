---
name: ЛоялUP — прогресс выкатки в TestFlight + Android
description: Где мы остановились по релизу мобильного приложения, какой блокер, как продолжить. Обновлено 2026-05-07.
type: project
originSessionId: 3362e558-88ad-43d8-a23a-4e38c0c3dd12
---
# Текущий статус: 🔴 ЗАСТРЯЛИ на Apple 2FA SMS блокировке

Мы пытаемся залить iOS production-билд в TestFlight. Все доступные шаги до фактического `eas build` сделаны. Apple временно заблокировал отправку SMS-кодов 2FA на номер телефона юзера — без 2FA-кода EAS не может пройти Apple Developer Portal authentication, без чего не создаются Distribution Certificate / Provisioning Profile / Push Key.

# Какие учётки и идентификаторы уже завязаны

## Apple Developer + App Store Connect
- **Apple ID email:** `levonelevon11@gmail.com`
- **Team ID:** `4SH8A27VC9`
- **Bundle ID:** `ru.levelup.mudup` (зарегистрирован в Apple Developer как App ID, Push Notifications capability включён)
- **App Store Connect App ID:** `6767007325` (приложение «ЛоялUP» создано)

## App Store Connect API Key (для обхода 2FA — но **EAS всё равно требует Apple login** для setup credentials)
- **Файл:** `levelup-back-mobile/rf-mobile/AuthKey_7CM4KKVKVJ.p8` (gitignored через `*.p8`)
- **Key ID:** `7CM4KKVKVJ`
- **Issuer ID:** `09228cbf-f64a-429f-a773-0019583fb7d2`
- **Access:** Admin

## Expo / EAS
- **Username:** `levone` (digitalstars55@gmail.com)
- **Project:** `@levone/mud-up`
- **projectId:** записан в `app.json` → `extra.eas.projectId` (создан через `eas init`).

## Где что в коде
- `app.json` — projectId на месте, `owner` поле удалено (был `levelup` — мешало, юзер логинится как `levone`).
- `eas.json` — submit.production.ios заполнен (appleId/ascAppId/appleTeamId). `channel` убран из всех профилей — был блокером (требовал expo-updates).
- `.gitignore` — покрывает `*.p8`, `.env`, `*.jks`, `*.p12`, `*.key`, `*.mobileprovision`.
- Git **инициализирован в родительской** папке `levelup-back-rf-thresholds/` (когда EAS попросил при первом запуске из неправильной директории).

# Что ПОПРОБОВАЛИ и НЕ работает

| Подход | Результат |
|---|---|
| `eas build --profile production --platform ios --non-interactive` | ❌ `Distribution Certificate is not validated for non-interactive builds` |
| Apple ID password + SMS 2FA | ❌ `Verification codes can't be sent to this phone number at this time` |
| App-Specific Password (`godn-sfjd-msnr-dxil`) | ❌ Не работает для EAS Build (только для App Store Connect API). Юзер должна была отозвать этот пароль. |
| ASC API Key через env vars `EXPO_ASC_API_KEY_PATH/KEY_ID/ISSUER_ID` + `--non-interactive` | ❌ EAS всё равно требует validation distribution certificate |
| `eas credentials` → `App Store Connect: Manage your API Key` → `Add a new API Key For EAS Submit` | ❌ Всё равно лезет в Apple login для валидации, упирается в SMS блок |

# Что попробовать когда вернёшься (next steps)

## Вариант 1 — подождать SMS unblock (1-24 часа)
Apple снимает rate-limit обычно через 30 мин - 2 часа. Через сутки **точно** должен разблокироваться. Юзер ничего не должна делать — просто **не запускать** новые `eas` команды чтобы не продлевать блок.

После разблока:
```powershell
cd c:\Users\User\Desktop\levelup-back-rf-thresholds\levelup-back-mobile\rf-mobile
eas credentials
```
- `Select platform` → **iOS**
- `Which build profile?` → **production**
- `Do you want to log in?` → **YES**
- Apple ID: `levonelevon11@gmail.com`
- Password: обычный Apple ID password (не app-specific)
- Когда попросит 2FA код — Apple пришлёт SMS (или баннер на trusted device)
- Дальше через меню добавить API Key (см. ниже)

После credentials setup — `eas build --profile production --platform ios`.

## Вариант 2 — Trusted Apple Device (быстрее, обходит SMS)
Если у юзера есть iPhone/iPad/Mac, она логинится там в Apple ID (Settings → her name → Sign In). После этого Apple отправляет 2FA код **push-уведомлением** прямо на устройство (не SMS). Этот канал не заблокирован.

Дальше тот же `eas credentials` flow.

## Вариант 3 — поменять trusted phone в Apple ID
Если SMS вообще не приходит даже после ожидания, юзеру можно добавить второй номер в Apple ID и удалить проблемный (https://appleid.apple.com → Sign-In and Security → Trusted Phone Numbers).

# Важно — что НЕ настроено ещё, понадобится после билда

1. **EAS environment variables** для production (сейчас билд использует дефолты — mock-режим, placeholder домен):
   ```powershell
   eas env:create production --name EXPO_PUBLIC_API_BASE --value "https://demo.levone.ru" --type string
   eas env:create production --name EXPO_PUBLIC_USE_MOCK --value "false" --type string
   ```
2. **Иконки** в `assets/` — статус неизвестен. Если дефолтные expo-фиолетовые → Apple Review отклонит. Нужны брендированные `icon.png` 1024×1024, `adaptive-icon.png` 1024×1024, `splash-icon.png` ≥1242×2436.
3. **Google Play Console** — приложение не создано, service account для `eas submit android` не сгенерирован. Делаем после успешного TestFlight pushа (Path A: iOS first).

# Полный план до завершения

1. ⏸️ Разблок SMS / trusted device для Apple login.
2. `eas credentials` → выбор API Key из меню (без login если возможно, или со SMS если разблочилось).
3. `eas build --profile production --platform ios` (~25 мин на сборку).
4. `eas submit --profile production --platform ios` → TestFlight.
5. В App Store Connect → TestFlight → добавить тестеров → раздать ссылку на установку.
6. Параллельно — Google Play Console + service account → `eas build --profile production --platform android` → `eas submit`.
7. EAS env vars для прод (Шаг 1 выше).
8. Если иконки дефолтные — заменить и пересобрать.

# Ссылки

- Текущий проект EAS: https://expo.dev/accounts/levone/projects/mud-up
- App Store Connect: https://appstoreconnect.apple.com/apps/6767007325
- Apple Developer Portal: https://developer.apple.com/account/resources/identifiers/list
- App Store Connect API Keys: https://appstoreconnect.apple.com/access/integrations/api
- Apple ID управление: https://appleid.apple.com
- Workaround Expo для SMS issues: https://expo.fyi/apple-2fa-sms-issues-workaround.md
