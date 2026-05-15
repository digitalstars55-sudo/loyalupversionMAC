# ЛоялUP — пакет для переноса на другой ноут

Архив содержит весь проект (бэкенд + мобайл) + память Claude с текущим прогрессом.

---

## Что внутри архива

```
loyalup-transfer-2026-05-07.zip
├── levelup-back-rf-thresholds/       ← основной проект
│   ├── levelup-back-mobile/rf-mobile/   ← мобильное приложение
│   │   ├── AuthKey_7CM4KKVKVJ.p8           ← App Store Connect API Key (СЕКРЕТ!)
│   │   ├── eas.json                        ← Apple credentials заполнены
│   │   ├── app.json                        ← projectId записан
│   │   └── ... (исходники)
│   ├── levelup-back-rf-thresholds/      ← Django бэкенд
│   └── README-TRANSFER.md               ← это ты сейчас читаешь
└── claude-memory/                    ← память Claude (текущий прогресс)
    ├── MEMORY.md
    ├── loyalup_release_progress.md         ← 🚨 ГДЕ МЫ ОСТАНОВИЛИСЬ
    ├── mud_up_mobile_state.md
    └── ...
```

---

## ⚠️ БЕЗОПАСНОСТЬ — прочитай первым делом

Архив содержит **`AuthKey_7CM4KKVKVJ.p8`** — это **секретный** API Key к Apple App Store Connect (роль Admin).

- **Не выкладывай архив** в публичные облака без шифрования.
- Если есть подозрение что архив утёк — сразу **отзови ключ** на https://appstoreconnect.apple.com/access/integrations/api → Keys → Revoke.
- При переносе используй: USB-флешку, личный OneDrive/Google Drive (с приватным шарингом), или зашифрованный архив.

Чтобы зашифровать архив паролем перед отправкой:
```powershell
# Через 7-Zip (если установлен)
& "C:\Program Files\7-Zip\7z.exe" a -p"твой_пароль" -mhe=on loyalup-transfer-encrypted.7z loyalup-transfer-2026-05-07.zip
```

---

## 🚀 Как развернуть на другом ноуте

### 1. Распаковка
Распакуй архив в **точно тот же путь** что и на первом ноуте:
- Проект → `c:\Users\User\Desktop\levelup-back-rf-thresholds\`
- Память Claude → `C:\Users\User\.claude\projects\c--Users-User-Desktop-levelup-back-rf-thresholds\memory\`

⚠ **Важно про user home directory:** если на втором ноуте имя пользователя **не `User`**, поменяй пути соответственно. Память Claude использует абсолютный путь, поэтому имя папки памяти должно совпадать с реальным путём проекта.

Если хочешь упростить — переименуй пользователя в Windows на `User` (системные настройки → Учётные записи) или используй symlink:
```powershell
# Если твой юзер например "Maria":
mklink /D "C:\Users\User" "C:\Users\Maria"
```

### 2. Поставить инструменты (если ещё не установлены)
```powershell
# Node.js 20+ — скачать с https://nodejs.org
node -v   # должно показать v20.x или выше

# EAS CLI
npm install -g eas-cli
eas --version
```

### 3. Поставить зависимости мобайла
```powershell
cd c:\Users\User\Desktop\levelup-back-rf-thresholds\levelup-back-mobile\rf-mobile
npm install
```
~3-5 минут.

### 4. Залогиниться в Expo
```powershell
eas login
# username: levone (или твой)
```

Если хочешь убедиться что .p8 ключ на месте:
```powershell
ls AuthKey_*.p8
# должно показать: AuthKey_7CM4KKVKVJ.p8
```

### 5. Открыть Claude Code в папке проекта
```powershell
cd c:\Users\User\Desktop\levelup-back-rf-thresholds
claude
```

Claude автоматически прочитает `claude-memory/MEMORY.md` (если ты положил папку памяти в правильный путь) и увидит:
- Текущий шаг релиза (`loyalup_release_progress.md`)
- Все pack'и (`mud_up_mobile_state.md`)
- Контекст бэкенд-API (`mud_up_backend_contract.md`)
- Дизайн-решения (`mud_up_design_decisions.md`)

Скажи Claude: **«продолжаем с TestFlight, читай память»** — и он сразу подхватит где мы остановились.

---

## 🔴 ТЕКУЩИЙ БЛОКЕР

**Apple временно заблокировал SMS verification codes** на номер `levonelevon11@gmail.com`. Это происходит автоматически после нескольких попыток login через `eas`. Разблок 30 мин - 24 часа сам.

**Когда возобновишь:**

### Вариант А — подождать SMS unblock
Через 1-2 часа (или сутки) запусти:
```powershell
cd c:\Users\User\Desktop\levelup-back-rf-thresholds\levelup-back-mobile\rf-mobile
eas credentials
```
- iOS → production → **YES** на «Do you want to log in»
- Apple ID: `levonelevon11@gmail.com`
- Password: обычный Apple ID
- 2FA код придёт SMS-кой → введи

### Вариант Б — Trusted Apple device (быстрее)
Если у тебя есть iPhone/iPad/Mac под этим Apple ID:
1. На устройстве → Settings → [твоё имя] → Sign In (если ещё не залогинена)
2. Запусти `eas credentials` как в Варианте А
3. Когда EAS попросит 2FA код — посмотри **на устройство**: всплывёт баннер «Apple ID Sign-In Requested» с кодом
4. Введи код в EAS

---

## После того как credentials настроены

```powershell
# 1. Билд iOS production (~25 мин)
eas build --profile production --platform ios

# 2. Submit в TestFlight (~5-30 мин до Processing → Ready)
eas submit --profile production --platform ios

# 3. В App Store Connect → ЛоялUP → TestFlight → Internal Testing → добавить тестеров
```

---

## Все идентификаторы (для справки)

| Что | Значение |
|---|---|
| Apple ID email | `levonelevon11@gmail.com` |
| Apple Team ID | `4SH8A27VC9` |
| App Store Connect App ID | `6767007325` |
| Bundle ID | `ru.levelup.mudup` |
| ASC API Key Path | `./AuthKey_7CM4KKVKVJ.p8` |
| ASC API Key ID | `7CM4KKVKVJ` |
| ASC API Issuer ID | `09228cbf-f64a-429f-a773-0019583fb7d2` |
| Expo username | `levone` |
| EAS project | `@levone/mud-up` |

Всё уже записано в `eas.json` (Apple creds) и `app.json` (projectId). API Key path/ID/Issuer ID запишутся через `eas credentials` после разблока 2FA.

---

## Оставшиеся задачи (после успешной TestFlight выкатки)

1. **EAS env vars** для прод-сборки (сейчас билд использует mock-режим):
   ```powershell
   eas env:create production --name EXPO_PUBLIC_API_BASE --value "https://your-domain.levone.ru" --type string
   eas env:create production --name EXPO_PUBLIC_USE_MOCK --value "false" --type string
   ```
2. **Иконки** в `assets/` — проверить что не дефолтные expo. Apple Review откажет если дефолт.
3. **Google Play Console** — создать app, service account, `eas build --profile production --platform android`, `eas submit`.
4. **Бэкенд миграции** на проде:
   ```bash
   python manage.py migrate_schemas --shared
   ```
   Применит `leads/0001_initial.py` и `leads/0002_company_secret_and_password_fields.py` (новые модели Lead и CompanySecret).

---

Ничего не сломай, спрашивай Claude если сомневаешься 🚀
