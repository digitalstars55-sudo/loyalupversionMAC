---
name: МуД UP — контракт между мобайлом и Django-бэком
description: Эндпоинты которые мобайл ожидает; что уже есть в вебе и что нужно создать дополнительно
type: project
originSessionId: 3362e558-88ad-43d8-a23a-4e38c0c3dd12
---
Мобайл и веб должны быть синхронизированы — единый бэк, единая БД, единые JWT-токены. Все обращения мобайла собраны в `src/api.ts`. Сейчас там `USE_MOCK = true`, для прода `false`.

## Существующие в вебе эндпоинты (сверены)
- `GET /api/v1/analytics/rf/` — RF-матрица. Параметры: `mode=restaurant|delivery`, `branch_ids=1,2,3`, либо `trend_days=30`, либо `start=YYYY-MM-DD`+`end=YYYY-MM-DD`.
  - **Гэп:** в response мобайл ожидает у каждой `cell` поле `delta_pct` (рост/падение к предыдущему периоду). Сейчас в вебе нет — нужно добавить расчёт на бэке либо считать клиентски.
- `POST /api/v1/analytics/rf/recalculate/` — пересчёт RF
- `POST /api/v1/analytics/rf/send-broadcast/` — рассылка (FormData с image)
- `POST /api/v1/analytics/rf/generate-broadcast-text/` — AI-текст рассылки

## Эндпоинты которые НУЖНО создать на бэке
Сейчас в вебе только HTML-вьюхи отзывов и нет JSON-API для мобайла. Нужны:

### Отзывы
- `GET /api/v1/analytics/reviews/?branch_ids=&period=30` — список Review-объектов. Поля: `id, source (APP|VK_MESSAGE), sentiment, ai_comment, branch_id, branch_name, customer_name, vk_sender_id, text, rating (1-5 для APP), last_message_at, has_unread, is_replied, has_draft, draft_text, draft_created_at`
- `POST /api/v1/analytics/reviews/{id}/reply/` body `{text}` — отправить ответ гостю в VK
- `POST /api/v1/analytics/reviews/{id}/resolve/` — пометить решённым (без отправки сообщения)
- `POST /api/v1/analytics/reviews/{id}/regenerate-draft/` → `{draft_text}` — попросить AI новый вариант черновика
- `POST /api/v1/analytics/reviews/{id}/reject-draft/` — админ отклонил черновик, не присылать напоминания

### Auto-reply settings
- `GET /api/v1/analytics/auto-reply/settings/` → `AutoReplySettings`-объект (см. `src/types.ts`): `enabled, sentiment_enabled (5 ключей), branch_enabled (по id), reminder_minutes (30|60|180|720), ai_tone (formal|friendly|neutral)`
- `PATCH /api/v1/analytics/auto-reply/settings/` body — частичное обновление

### Серверная логика автоответов
Webhook на новый VK-message или APP-rating → создание Review → проверка `auto_reply.enabled` для тенанта + проверка sentiment в `sentiment_enabled` + проверка branch в `branch_enabled` + sentiment != SPAM → дёргает AI-провайдер с тоном `ai_tone` → пишет результат в `Review.draft_text` → шлёт push типа `draft_ready` админу. Если через `reminder_minutes` админ не апрувнул — повторный push с тем же payload. Никогда не отправляет автоматически без апрува.

### Чат с менеджером
- `GET /api/v1/support/chat/manager/` → `{id, name, role, online, last_seen, phone (E.164), work_hours, avatar_url?}`
- `GET /api/v1/support/chat/messages/` → `{messages: ChatMessage[]}` где `ChatMessage = {id, sender (user|manager), text, created_at, status?}`
- `POST /api/v1/support/chat/messages/` body `{text}` → созданное сообщение

### Push регистрация
- `POST /api/v1/push/register/` body `{token, platform: ios|android|web}` — сохранить Expo push-токен для последующей рассылки

### Pushes от бэка через Expo Push API
- `review_new` payload `{review_id}` — новый отзыв
- `draft_ready` payload `{review_id}` — AI-черновик готов
- `chat_message` payload `{message_id}` — сообщение от менеджера

## Авторизация
Заголовок `Authorization: Bearer <jwt>` во всех запросах если `setAuthToken(jwt)` был вызван (см. `src/api.ts`). На бэке нужен endpoint логина (наверное уже есть для веба).

## Why: единая правда — критично
Юзер явно сказал «важно чтобы веб и мобилка синхронизированы были». Когда менеджер ответил в вебе — мобайл должен видеть `is_replied=true`. Когда админ закрыл отзыв на мобайле — веб тоже видит. Никаких отдельных таблиц для мобайла.

## How to apply при работе на бэке
- Все новые модели/сериализаторы должны соответствовать полям в `src/types.ts` мобайла
- Обязательно ограничить `Review.customer_name` и `Segment.name` до 24 символов (юзер просил, и UI имеет защитный `numberOfLines`+`ellipsizeMode` но это belt-and-suspenders)
- `delta_pct` для RFCell нужно либо считать на бэке (предпочтительно — точный расчёт на сравнении с предыдущим периодом), либо отдавать null и мобайл скроет дельта-pill
