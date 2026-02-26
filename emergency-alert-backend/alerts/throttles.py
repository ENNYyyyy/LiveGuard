import logging

from rest_framework.throttling import UserRateThrottle

logger = logging.getLogger(__name__)


class AlertCreationThrottle(UserRateThrottle):
    scope = 'alert_creation'

    def get_rate(self):
        """
        Read the alert creation rate limit from SystemSetting (DB).
        The DB value is stored as a plain integer (e.g. '5'), interpreted as
        requests-per-hour.  Falls back to the Django settings.py value when the
        DB is unreachable or the value is invalid, so the throttle is never
        silently disabled.
        """
        try:
            from admin_panel.models import SystemSetting
            setting = SystemSetting.objects.get(key='alert_creation_rate_limit')
            rate = int(setting.value.strip())
            if rate <= 0:
                raise ValueError('rate must be positive')
            return f'{rate}/hour'
        except Exception as exc:
            logger.warning(
                f'AlertCreationThrottle: could not read DB rate ({exc}); '
                f'falling back to settings.py value.'
            )
            return super().get_rate()
