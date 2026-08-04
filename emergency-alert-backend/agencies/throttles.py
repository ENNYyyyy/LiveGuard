from rest_framework.throttling import UserRateThrottle


class AgencyPollingThrottle(UserRateThrottle):
    """
    Dedicated throttle for high-frequency agency dashboard polling.
    Keeps protection enabled but avoids tripping the global user throttle.
    """
    scope = 'agency_poll'
