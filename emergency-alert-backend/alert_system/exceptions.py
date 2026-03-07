import math

from rest_framework.exceptions import Throttled
from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    """
    Attach Retry-After header for throttled requests so clients can show
    deterministic cooldown timers.
    """
    response = exception_handler(exc, context)
    if response is None:
        return None

    if isinstance(exc, Throttled):
        wait = getattr(exc, 'wait', None)
        if wait is not None:
            response['Retry-After'] = str(max(1, math.ceil(wait)))

    return response
