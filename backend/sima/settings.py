"""
Django settings for sima project.

Configuração do SIMA — Sistema Inteligente de Monitoramento e Alerta de Alagamentos.
Variáveis sensíveis carregadas via django-environ a partir de .env (raiz do repo).
"""

from datetime import timedelta
from pathlib import Path

import environ

BASE_DIR  = Path(__file__).resolve().parent.parent
REPO_ROOT = BASE_DIR.parent

env = environ.Env(
    DEBUG=(bool, True),
)
environ.Env.read_env(REPO_ROOT / '.env')

SECRET_KEY = env('DJANGO_SECRET_KEY', default='django-insecure-change-me-in-production')

DEBUG = env('DEBUG')

ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['localhost', '127.0.0.1'])

# ── WhatsApp / Alertas ────────────────────────────────────────────────────

SIMA_WA_PROVIDER       = env('SIMA_WA_PROVIDER',       default='twilio')

TWILIO_ACCOUNT_SID     = env('TWILIO_ACCOUNT_SID',     default='')
TWILIO_AUTH_TOKEN      = env('TWILIO_AUTH_TOKEN',       default='')
TWILIO_WA_FROM         = env('TWILIO_WA_FROM',         default='whatsapp:+14155238886')
TWILIO_WA_TEMPLATE_SID = env('TWILIO_WA_TEMPLATE_SID', default='')

META_WA_TOKEN         = env('META_WA_TOKEN',         default='')
META_WA_PHONE_ID      = env('META_WA_PHONE_ID',      default='')
META_WA_VERIFY_TOKEN  = env('META_WA_VERIFY_TOKEN',  default='')
META_WA_TEMPLATE_NAME = env('META_WA_TEMPLATE_NAME', default='alerta_alagamento')
META_WA_APP_SECRET    = env('META_WA_APP_SECRET',    default='')

SIMA_APP_URL = env('SIMA_APP_URL', default='http://localhost:5173')

SIMA_ALERTAS = {
    'RAIO_BAIXO_M': 300,
    'RAIO_MEDIO_M': 600,
    'RAIO_ALTO_M':  1200,
    'EMAIL_FROM':   'alertas@sima.recife.br',
    # Ativa WhatsApp automaticamente se o provedor e credenciais estiverem no .env
    'WA_ENABLED': bool(SIMA_WA_PROVIDER and (TWILIO_ACCOUNT_SID or META_WA_TOKEN)),
}

# ── Apps ──────────────────────────────────────────────────────────────────

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'apps.users',
    'apps.relatos',
    'apps.alertas',
    'apps.areas_risco',
    'apps.clima',
    'apps.dashboard',
]

AUTH_USER_MODEL = 'users.User'

# ── Middleware ────────────────────────────────────────────────────────────

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'sima.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
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

WSGI_APPLICATION = 'sima.wsgi.application'

# ── Banco de dados ────────────────────────────────────────────────────────

DATABASES = {
    'default': env.db_url(
        'DATABASE_URL',
        default=f'sqlite:///{BASE_DIR / "db.sqlite3"}',
    ),
}

# ── Senhas ────────────────────────────────────────────────────────────────

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ── Internacionalização ───────────────────────────────────────────────────

LANGUAGE_CODE = 'pt-br'
TIME_ZONE     = 'America/Recife'
USE_I18N      = True
USE_TZ        = True

# ── Arquivos estáticos e de mídia ─────────────────────────────────────────

STATIC_URL = 'static/'
MEDIA_URL  = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ── DRF ──────────────────────────────────────────────────────────────────

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# ── JWT ───────────────────────────────────────────────────────────────────

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME':  timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS':  True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# ── CORS ──────────────────────────────────────────────────────────────────

CORS_ALLOWED_ORIGINS = env.list(
    'CORS_ALLOWED_ORIGINS',
    default=['http://localhost:5173', 'http://127.0.0.1:5173'],
)

# ── APIs externas ─────────────────────────────────────────────────────────

OPENWEATHER_API_KEY = env('OPENWEATHER_API_KEY', default='')
TOMORROW_API_KEY    = env('TOMORROW_API_KEY',    default='')

# ── Email ─────────────────────────────────────────────────────────────────

if DEBUG:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
