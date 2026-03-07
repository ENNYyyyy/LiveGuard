from .settings import *  # noqa

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'test_db.sqlite3',
        'OPTIONS': {
            'timeout': 30,  # seconds — lets concurrent threads wait for SQLite locks
        },
    }
}

# Speed up password hashing in tests
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

# Raise throttle limits so performance tests can send many requests freely.
# The view-level throttle_classes still apply, so we keep the scope key
# but set an effectively unlimited rate.
REST_FRAMEWORK = {
    **REST_FRAMEWORK,  # noqa
    'DEFAULT_THROTTLE_RATES': {
        'user': '100000/hour',
        'alert_creation': '100000/hour',
        'agency_poll': '100000/hour',
    },
}

# Keep tests deterministic and avoid thread timing issues under SQLite.
ALERT_DISPATCH_ASYNC = False

# Suppress expected DB-fallback warning from AlertCreationThrottle (SystemSetting
# row does not exist in the test DB, so the warning fires on every throttle check).
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {'null': {'class': 'logging.NullHandler'}},
    'loggers': {
        'alerts.throttles': {'handlers': ['null'], 'propagate': False},
    },
}
