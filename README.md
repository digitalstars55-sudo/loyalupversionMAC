# loyalupversionMAC — Mac snapshot

> ⚠️ **ВНИМАНИЕ:** эта репо — НЕ канонический прод. Прод-бэкенд живёт в
> [`digitalstars55-sudo/loyaluplastversion14-05-2026`](https://github.com/digitalstars55-sudo/loyaluplastversion14-05-2026)
> (deploy'ится на `81.17.154.208`, `~levone/levelup-back`).

## Структура

```
loyalupversionMAC/
├── MOBILE_TESTFLIGHT_app/
│   └── rf-mobile/                       ← Expo приложение для клиентов (TestFlight)
│       └── (App.tsx, src/, app.json, eas.json...)
│
├── levelup-back-rf-thresholds/
│   └── _ARCHIVE_DO_NOT_DEPLOY_old_backend/   ← ⚠️ НЕ деплоить!
│
└── c--Users-User-Desktop-levelup-back-rf-thresholds/  ← Claude memory artifacts
```

## Что куда

### MOBILE_TESTFLIGHT_app/rf-mobile/ — **АКТИВНЫЙ** мобайл клиентов

iOS/Android приложение для **владельцев ресторанов** в TestFlight.
Содержит RF-аналитику, саппорт-чат с CheckUp, push-токены.

**Workflow:**
```bash
cd MOBILE_TESTFLIGHT_app/rf-mobile
git pull origin main

# Запустить локально:
npx expo start

# OTA-апдейт (для уже установленных TestFlight-сборок):
eas update --branch production --message "описание"

# Новый билд (нужен только при изменении нативного кода / app.json):
eas build --profile production --platform ios
eas submit --platform ios
```

### levelup-back-rf-thresholds/_ARCHIVE_DO_NOT_DEPLOY_old_backend/

⚠️ **НЕ деплоить.** Это старая снимочная копия бэкенда `rf-thresholds`-ветки
до сегодняшнего восстановления. На проде сейчас крутится **другая** версия
(с CheckUp relay, фиолетовой админкой, leads/, mobile/, audit log, CORS-фиксом).

Если нужно работать с прод-бэкендом — **клонируй отдельно**:
```bash
git clone https://github.com/digitalstars55-sudo/loyaluplastversion14-05-2026
```

Если в `rf-thresholds` есть полезные изменения которые хочется перенести —
делаем cherry-pick поверх свежего `loyaluplastversion14-05-2026/main`,
**не наоборот.**

### c--Users-User-Desktop-levelup-back-rf-thresholds/

Артефакты Claude memory из `.claude/projects/` папки VSCode. Можно
игнорить или удалить — это локальная история Claude-сессий, не код.

## Прод-репо для бэкенда (для справки)

- **Repo:** https://github.com/digitalstars55-sudo/loyaluplastversion14-05-2026
- **Сервер:** `root@81.17.154.208`, `~levone/levelup-back`
- **Полная история сессии 2026-05-14:** в репо файл `docs/SESSION_2026_05_14.md`

## Правило одной строкой

> Меняешь мобайл клиента → работай **только** в `MOBILE_TESTFLIGHT_app/rf-mobile/`.
> Хочешь править бэкенд → работай **только** в `loyaluplastversion14-05-2026` (отдельно склонировать).
> Папка `_ARCHIVE_DO_NOT_DEPLOY_...` — только архив, не трогать.