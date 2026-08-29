"""
Django settings for core project.
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import timedelta
import dj_database_url  # make sure it's installed

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables (edit path if needed)
load_dotenv(BASE_DIR / ".env")

# -----------------------------
# Basic setup
# -----------------------------
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-key")
DEBUG = os.getenv("DEBUG", "True") == "True"
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "*").split(",")

# -----------------------------
# Installed apps
# -----------------------------
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",  # required for collectstatic
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "storages",
    "users",
    "cv",
    "feedback",
    "quiz",
    "ai",
    "assessment",
    "matcher",
    "core",
    "healthcheck",
]

# -----------------------------
# Middleware
# -----------------------------
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"

# -----------------------------
# Database: SQLite (local) / PostgreSQL (server)
# -----------------------------
USE_SQLITE = os.getenv("USE_SQLITE", "1") == "1"

if USE_SQLITE:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
else:
    SUPABASE_DB_URL = os.getenv("SUPABASE_POSTGRES_URL_NON_POOLING") or os.getenv("SUPABASE_POSTGRES_URL")
    if SUPABASE_DB_URL:
        DATABASES = {
            "default": dj_database_url.config(
                default=SUPABASE_DB_URL,
                conn_max_age=600,
                conn_health_checks=True,
            )
        }
        DATABASES["default"]["OPTIONS"] = {
            **DATABASES["default"].get("OPTIONS", {}),
            "sslmode": "require"
        }
    else:
        DATABASES = {
            "default": {
                "ENGINE": "django.db.backends.postgresql",
                "NAME": os.getenv("SUPABASE_POSTGRES_DATABASE") or os.getenv("DB_NAME", "django"),
                "USER": os.getenv("SUPABASE_POSTGRES_USER") or os.getenv("DB_USER", "django"),
                "PASSWORD": os.getenv("SUPABASE_POSTGRES_PASSWORD") or os.getenv("DB_PASSWORD", ""),
                "HOST": os.getenv("SUPABASE_POSTGRES_HOST") or os.getenv("DB_HOST", "localhost"),
                "PORT": os.getenv("DB_PORT", "5432"),
                "OPTIONS": {
                    **({"sslmode": "require"} if os.getenv("DB_SSLMODE") == "require" else {})
                },
            }
        }

print("Using database engine:", DATABASES["default"]["ENGINE"])

# -----------------------------
# Static & Media configuration
# -----------------------------
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

USE_SUPABASE_STORAGE = os.getenv("USE_SUPABASE_STORAGE", "0") == "1"

if USE_SUPABASE_STORAGE:
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3.S3Storage",
            "OPTIONS": {
                "access_key": os.getenv("SUPABASE_S3_ACCESS_KEY_ID"),
                "secret_key": os.getenv("SUPABASE_S3_SECRET_ACCESS_KEY"),
                "bucket_name": os.getenv(
                    "SUPABASE_STORAGE_BUCKET",
                    "cvs",
                ),
                "endpoint_url": os.getenv(
                    "SUPABASE_S3_ENDPOINT_URL"
                ),
                "region_name": os.getenv(
                    "SUPABASE_S3_REGION"
                ),
                "addressing_style": "path",
                "signature_version": "s3v4",
                "default_acl": None,
                "file_overwrite": False,
                "querystring_auth": True,
            },
        },
        "staticfiles": {
            "BACKEND": (
                "django.contrib.staticfiles.storage."
                "StaticFilesStorage"
            ),
        },
    }
else:
    MEDIA_URL = "/media/"
    MEDIA_ROOT = BASE_DIR / "media"

# -----------------------------
# REST Framework + JWT
# -----------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# -----------------------------
# CORS (frontend connection)
# -----------------------------
if DEBUG:
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
else:
    CORS_ALLOWED_ORIGINS = [
        "https://vericv.net",
        "http://104.248.136.7",
    ]

# -----------------------------
# Miscellaneous
# -----------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# -----------------------------
# AI Key
# -----------------------------
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
