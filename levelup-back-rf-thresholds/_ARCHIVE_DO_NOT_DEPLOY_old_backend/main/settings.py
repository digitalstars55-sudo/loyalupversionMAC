import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / '.env' / '.env.dev')

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-m1n*+lfy!bx87v)=6y98=-!yvfhzq0^q-^2l8k8l79#e545*1@')

DEBUG = os.getenv('DEBUG', 'True') == 'True'

ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    '.localhost',
    '6d12-37-151-244-38.ngrok-free.app',
    '.6d12-37-151-244-38.ngrok-free.app'
]

CSRF_TRUSTED_ORIGINS = [
    'http://localhost',
    'http://127.0.0.1',
    'https://6d12-37-151-244-38.ngrok-free.app'
]

# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------

SHARED_APPS = [
    'django_tenants',

    # Shared apps
    'apps.shared.config.apps.ConfigConfig',
    'apps.shared.clients.apps.ClientsConfig',
    'apps.shared.guest.apps.GuestConfig',
    'apps.shared.users.apps.UsersConfig',
    'apps.shared.leads.apps.LeadsConfig',

    # Django built-ins
    'django.contrib.admin',
    'django.contrib.humanize',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party
    'rest_framework',
    'corsheaders',
    'django_filters',
    'colorfield',
]

TENANT_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.auth',
    'django.contrib.admin',

    'apps.tenant.branch.apps.BranchAppConfig',
    'apps.tenant.catalog.apps.CatalogConfig',
    'apps.tenant.game.apps.GameConfig',
    'apps.tenant.inventory.apps.InventoryConfig',
    'apps.tenant.quest.apps.QuestConfig',
    'apps.tenant.analytics.apps.AnalyticsConfig',
    'apps.tenant.senler.apps.SenlerConfig',
    'apps.tenant.delivery.apps.DeliveryConfig',
    'apps.tenant.telegram.apps.TelegramConfig',
    'apps.tenant.mobile.apps.MobileConfig',
]

INSTALLED_APPS = list(SHARED_APPS) + [
    app for app in TENANT_APPS if app not in SHARED_APPS
]

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------

MIDDLEWARE = [
    'django_tenants.middleware.main.TenantMainMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# ---------------------------------------------------------------------------
# URLs
# ---------------------------------------------------------------------------

ROOT_URLCONF = 'main.urls'                  # tenant schemas
PUBLIC_SCHEMA_URLCONF = 'main.public_urls'  # public schema (superadmin)

# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'main.wsgi.application'

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

DATABASES = {
    'default': {
        'ENGINE': 'django_tenants.postgresql_backend',
        'NAME': os.getenv('POSTGRES_DB'),
        'USER': os.getenv('POSTGRES_USER'),
        'PASSWORD': os.getenv('POSTGRES_PASSWORD'),
        'HOST': os.getenv('POSTGRES_HOST'),
        'PORT': os.getenv('POSTGRES_PORT'),
    },
}

DATABASE_ROUTERS = (
    'django_tenants.routers.TenantSyncRouter',
)

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

AUTH_USER_MODEL = 'users.User'

AUTHENTICATION_BACKENDS = [
    'apps.shared.users.backends.RoleBasedBackend',
]

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ---------------------------------------------------------------------------
# Internationalisation
# ---------------------------------------------------------------------------

LANGUAGE_CODE = os.getenv('LANGUAGE_CODE', 'ru')
TIME_ZONE = os.getenv('TZ', 'Europe/Moscow')
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Static & Media
# ---------------------------------------------------------------------------

STATIC_URL = 'static/'
STATIC_ROOT = 'staticfiles/'
STATICFILES_DIRS = [BASE_DIR / 'static']

DEFAULT_FILE_STORAGE = 'django_tenants.files.storage.TenantFileSystemStorage'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ---------------------------------------------------------------------------
# DRF
# ---------------------------------------------------------------------------

REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
    # Аутентификация: сначала Bearer-JWT (для мобайла), потом Session (для веба).
    # JWT-класс возвращает None если нет Authorization-заголовка → падение в Session.
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'apps.shared.users.auth.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
}

# ---------------------------------------------------------------------------
# CORS — для мобильного web-превью и нативных сборок
# ---------------------------------------------------------------------------
# Нативные сборки (iOS/Android) посылают запросы напрямую и CORS не проверяют.
# Web-превью (expo --web) живёт на http://localhost:8112 (или другой порт),
# поэтому нужно разрешить эти origin'ы. В DEBUG разрешаем все, чтобы менять
# порт без правки конфига.
CORS_ALLOW_CREDENTIALS = True
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOWED_ORIGINS = [
        # Прод-домены клиентов мобильного приложения. Заполнить перед релизом.
        # 'https://app.levone.ru',
    ]
    CORS_ALLOWED_ORIGIN_REGEXES = [
        r'^https://[a-z0-9-]+\.levone\.ru$',
    ]

# ---------------------------------------------------------------------------
# Mobile JWT — настройки токенов (используются в apps.shared.users.auth)
# ---------------------------------------------------------------------------
# Перенесено в apps.shared.users.auth как константы; здесь только отметка
# о том, что подпись делается на SECRET_KEY и ничего отдельного не хранится.

# ---------------------------------------------------------------------------
# Email — для рассылки логин/пароль новым клиентам после онбординга.
# По умолчанию: Yandex SMTP, читаем creds из env. Если EMAIL_HOST_USER пустой —
# fallback на console-backend (письма печатаются в stdout сервера).
# ---------------------------------------------------------------------------
EMAIL_HOST          = os.getenv('EMAIL_HOST',          'smtp.yandex.ru')
EMAIL_PORT          = int(os.getenv('EMAIL_PORT',      '465'))
EMAIL_USE_SSL       = os.getenv('EMAIL_USE_SSL',       'True') == 'True'
EMAIL_USE_TLS       = os.getenv('EMAIL_USE_TLS',       'False') == 'True'
EMAIL_HOST_USER     = os.getenv('EMAIL_HOST_USER',     '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL  = os.getenv('DEFAULT_FROM_EMAIL',  EMAIL_HOST_USER or 'noreply@levone.ru')

if EMAIL_HOST_USER:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
else:
    # Если SMTP creds не настроены — пишем в консоль, чтобы при дев-разработке
    # письма были видимы и не падали с ошибкой авторизации.
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Корневой домен для тенантов. Поддомен формируется как
# {Company.schema_name}.{TENANT_DOMAIN_ROOT}
TENANT_DOMAIN_ROOT = os.getenv('TENANT_DOMAIN_ROOT', 'levone.ru')

# Email супер-админа сервиса (куда уходят алерты о новых лидах).
# Можно несколько через запятую.
SUPER_ADMIN_EMAILS = [
    e.strip() for e in os.getenv('SUPER_ADMIN_EMAILS', '').split(',') if e.strip()
]

# ---------------------------------------------------------------------------
# django-tenants
# ---------------------------------------------------------------------------

TENANT_MODEL = 'clients.Company'
TENANT_DOMAIN_MODEL = 'clients.Domain'

# ---------------------------------------------------------------------------
# Misc
# ---------------------------------------------------------------------------

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

VK_SECRET = os.getenv('VK_SECRET')
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')
VK_MINI_APP_ID=os.getenv('VK_MINI_APP_ID', 53418653)

# ---------------------------------------------------------------------------
# Celery
# ---------------------------------------------------------------------------

CELERY_BROKER_URL            = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND        = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT        = ['json']
CELERY_TASK_SERIALIZER       = 'json'
CELERY_RESULT_SERIALIZER     = 'json'
CELERY_TASK_TRACK_STARTED    = True
CELERY_TASK_TIME_LIMIT       = 300          # 5 min hard limit per task
CELERY_TASK_SOFT_TIME_LIMIT  = 240          # 4 min soft limit
CELERY_WORKER_PREFETCH_MULTIPLIER = 1       # one task at a time per worker slot
