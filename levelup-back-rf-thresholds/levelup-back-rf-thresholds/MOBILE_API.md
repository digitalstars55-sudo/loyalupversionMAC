# Mobile API — для Django-разработчиков

Этот документ описывает, **какие изменения** были добавлены в Django,
чтобы мобильное приложение ЛоялUP могло читать данные веб-панели.

**Важно:** все правки **аддитивны** — существующие views, URL, templates
веб-админки не затронуты. Веб продолжает работать как работал.

## 0. Что добавлено

### Новые файлы

```
apps/shared/users/
  ├ auth.py                 # JWT authentication class (PyJWT, без simplejwt)
  └ api/
      ├ __init__.py
      ├ urls.py             # /auth/login, /me, /logout, /refresh, /push/register
      ├ views.py
      └ serializers.py

apps/tenant/mobile/         # Новое приложение под мобильные endpoints
  ├ __init__.py
  ├ apps.py                 # MobileConfig
  └ api/
      ├ __init__.py
      ├ urls.py             # /mobile/branches, /mobile/reviews/...
      ├ views.py
      └ serializers.py
```

### Правки в существующих файлах (только добавление в конец списков)

- `main/settings.py` — REST_FRAMEWORK получил DEFAULT_AUTHENTICATION_CLASSES;
  CORS настроен; добавлено `apps.tenant.mobile.apps.MobileConfig` в TENANT_APPS.
- `main/urls.py` — два новых `path('api/v1/', include(...))`.
- `main/public_urls.py` — один новый `path('api/v1/', include(...))`.

Никаких правок в существующих view, моделях, шаблонах.

## 1. Применение

```bash
# Установка зависимостей не требуется — PyJWT и django-cors-headers
# уже были в requirements.txt.
# Миграций тоже не нужно: новых моделей нет.

# Просто перезапусти Django:
docker compose restart  # или python manage.py runserver
```

## 2. Новые endpoints

### Auth (доступны на public и tenant схемах)

| Метод | URL | Описание |
|-------|-----|----------|
| POST  | `/api/v1/auth/login/`     | Логин по username/email + password. Возвращает access+refresh JWT. |
| GET   | `/api/v1/auth/me/`        | Текущий профиль по Bearer-токену. |
| POST  | `/api/v1/auth/logout/`    | "Выход" — JWT stateless, на сервере ничего не делает, мобайл удалит токен у себя. |
| POST  | `/api/v1/auth/refresh/`   | Обмен refresh-токена на новый access. |
| POST  | `/api/v1/push/register/`  | Регистрация Expo push-токена. **Сейчас in-memory** — для прода нужна модель PushToken (см. ниже). |

### Mobile data (только на tenant-схеме, потому что данные тенантские)

| Метод | URL | Описание |
|-------|-----|----------|
| GET   | `/api/v1/mobile/branches/`                       | Список активных точек тенанта. |
| GET   | `/api/v1/mobile/reviews/?branch_ids=&period=`    | Отзывы (TestimonialConversation в формате мобайла). |
| GET   | `/api/v1/mobile/reviews/{id}/messages/`          | Сообщения внутри треда. |
| POST  | `/api/v1/mobile/reviews/{id}/reply/`             | Создать ADMIN_REPLY-сообщение, пометить is_replied=True. |
| POST  | `/api/v1/mobile/reviews/{id}/resolve/`           | Пометить has_unread=False (с защитой от закрытия негатива без ответа). |

## 3. JWT-настройки

Срок жизни токенов задан константами в `apps/shared/users/auth.py`:

- `ACCESS_TOKEN_LIFETIME_HOURS = 24 * 30` (30 дней)
- `REFRESH_TOKEN_LIFETIME_DAYS = 90`

Подпись использует `settings.SECRET_KEY` — отдельного секрета не вводили.

## 4. CORS

Существующее `corsheaders` middleware теперь настроено в settings.py:

- В DEBUG: `CORS_ALLOW_ALL_ORIGINS = True` — для удобства разработки.
- В проде: regex `https://[a-z0-9-]+\.levone\.ru` — все subdomain'ы.

При деплое **обязательно** проверь, что `CORS_ALLOWED_ORIGIN_REGEXES`
покрывает все ваши прод-домены, и при необходимости добавь конкретный
`CORS_ALLOWED_ORIGINS`.

## 5. Что осталось сделать в Django (то что мобайл уже ожидает)

Мобильное приложение в `levelup-back-mobile/rf-mobile/src/api.ts` вызывает
эти endpoints — **их пока нет** на бэке, мобайл сейчас работает на моках:

### Auto-reply settings
- `GET  /api/v1/analytics/auto-reply/settings/` — настройки автоответов
- `PATCH /api/v1/analytics/auto-reply/settings/` — частичное обновление

### Чат с менеджером
- `GET  /api/v1/support/chat/manager/`  — карточка менеджера (имя, телефон, online)
- `GET  /api/v1/support/chat/messages/` — лента сообщений
- `POST /api/v1/support/chat/messages/` — отправить сообщение

### AI-черновики
- `POST /api/v1/mobile/reviews/{id}/regenerate-draft/` — новый черновик
- `POST /api/v1/mobile/reviews/{id}/reject-draft/`     — отклонить

### Search
- `GET /api/v1/mobile/search/?q=` — глобальный поиск (гости, отзывы, подарки, квесты, акции)

### Birthdays
- `GET /api/v1/mobile/birthdays/?days_ahead=&include_past=` — гости с ДР

### Audit log
- `GET /api/v1/mobile/audit-log/?staff_id=&action_type=&limit=` — журнал действий

### Engagement analytics
- `GET /api/v1/mobile/engagement/?period_days=&branch_id=` — gifts + quests

### RF thresholds
- `PATCH /api/v1/analytics/rf/thresholds/` — обновить пороги R/F

### Campaigns
- `GET /api/v1/analytics/campaigns/` — история рассылок (со связями A/B variants)

### Subscription
- `GET /api/v1/billing/subscription/` — подписка тенанта

### Staff
- `GET /api/v1/staff/`               — список сотрудников
- `PATCH /api/v1/staff/{id}/permissions/` — обновить права

### Catalog/Quests/Promotions
- Полный CRUD под `/api/v1/catalog/...`, `/api/v1/quests/...`, `/api/v1/promotions/...`

### Daily codes
- `GET  /api/v1/branch/daily-codes/` — список кодов
- `POST /api/v1/branch/daily-codes/generate/` — аварийная генерация

## 6. Оставшаяся работа

### Push token model (приоритет 1)

Сейчас `PushRegisterAPIView._store` — словарь в памяти процесса.
При рестарте теряется. Для прода:

1. Создать `apps/shared/users/models.py` модель:
   ```python
   class PushToken(models.Model):
       user = models.ForeignKey('users.User', on_delete=models.CASCADE)
       token = models.CharField(max_length=255, unique=True)
       platform = models.CharField(max_length=10)  # ios/android/web
       last_seen_at = models.DateTimeField(auto_now=True)
       created_at = models.DateTimeField(auto_now_add=True)
   ```
2. `python manage.py makemigrations users && migrate`.
3. Подменить `PushRegisterAPIView._store` на `PushToken.objects.update_or_create`.

### Безопасность

- Срок жизни access-токена сейчас 30 дней — это много для прода.
  Лучше 1-2 часа + refresh.
- Refresh-токены сейчас не отзываются. Для прода нужен blacklist
  (см. `djangorestframework-simplejwt` или своя таблица `RevokedRefresh`).

### Тесты

Тестов для новых view ещё нет. Перед прод-релизом стоит написать smoke-tests
на login + 1-2 review-endpoint'а.

## 7. Откатить всё одной командой

Если что-то идёт не так:

```bash
git diff main/settings.py main/urls.py main/public_urls.py
git checkout main/settings.py main/urls.py main/public_urls.py
rm -rf apps/shared/users/api apps/shared/users/auth.py apps/tenant/mobile
```

После этого Django вернётся в исходное состояние без правок.
