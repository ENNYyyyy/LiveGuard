from rest_framework.throttling import UserRateThrottle


class AlertCreationThrottle(UserRateThrottle):
    scope = 'alert_creation'
    # Rate is read from DEFAULT_THROTTLE_RATES['alert_creation'] in settings,
    # making it overridable per environment (e.g. disabled in tests).
