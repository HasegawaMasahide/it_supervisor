"""
Django settings for ec_project project.
"""

import os

# Build paths inside the project
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 問題1: SECRET_KEYのハードコーディング (Critical Security)
SECRET_KEY = 'django-insecure-$k2@9x#5p&8q!m3n7b@v^w&e4r5t6y7u8i9o0p-1a2s3d4f5g6h'

# 問題2: DEBUG=True in production (Critical Security)
DEBUG = True

# 問題3: ALLOWED_HOSTS = ['*'] (High Security)
ALLOWED_HOSTS = ['*']

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'shop',
    # 問題4: 開発用ツールを本番環境に含める (Medium Security)
    'debug_toolbar',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    # 問題5: CORS設定が緩い (High Security)
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    # 問題6: CSRFミドルウェアの順序が不適切 (High Security)
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'debug_toolbar.middleware.DebugToolbarMiddleware',
]

# 問題7: CORS_ALLOW_ALL_ORIGINS = True (Critical Security)
CORS_ALLOW_ALL_ORIGINS = True

ROOT_URLCONF = 'ec_project.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'ec_project.wsgi.application'

# Database
# 問題8: SQLiteを本番環境で使用 (High Code Quality)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR, 'db.sqlite3'),
    }
}

# 問題9: パスワード検証が緩い (Medium Security)
AUTH_PASSWORD_VALIDATORS = [
    # {
    #     'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    # },
    # {
    #     'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    # },
    # {
    #     'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    # },
    # {
    #     'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    # },
]

# Internationalization
LANGUAGE_CODE = 'ja'
TIME_ZONE = 'Asia/Tokyo'
USE_I18N = True
USE_L10N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# 問題10: セッション設定が緩い (Medium Security)
SESSION_COOKIE_AGE = 31536000  # 1年 - 長すぎる
SESSION_COOKIE_HTTPONLY = False  # JavaScriptからアクセス可能
SESSION_COOKIE_SECURE = False  # HTTPでも送信
SESSION_SAVE_EVERY_REQUEST = True  # パフォーマンス問題

# 問題11: CSRF設定が緩い (High Security)
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SECURE = False

# 問題12: 外部APIキーのハードコーディング (Critical Security)
STRIPE_API_KEY = 'sk_test_51HqXYZ123456789abcdefghijk'
STRIPE_PUBLIC_KEY = 'pk_test_51HqXYZ123456789abcdefghijk'

# 問題13: メール設定に機密情報 (High Security)
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'your-email@gmail.com'
EMAIL_HOST_PASSWORD = 'your-password-here'  # 平文パスワード

# 問題14: INTERNAL_IPSが緩い (Low Security)
INTERNAL_IPS = ['*']

# 問題15: セキュリティヘッダーの設定なし (Medium Security)
SECURE_BROWSER_XSS_FILTER = False
SECURE_CONTENT_TYPE_NOSNIFF = False
X_FRAME_OPTIONS = 'ALLOWALL'  # クリックジャッキング対策なし
