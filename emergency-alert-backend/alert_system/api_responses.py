from rest_framework.response import Response


def error_response(detail, status_code, errors=None, include_legacy_error=True):
    """
    Standardized error response envelope.

    Example:
    {
        "detail": "Validation error.",
        "errors": {"field": ["message"]},
        "error": "Validation error."  # legacy compatibility key
    }
    """
    payload = {'detail': detail}
    if errors is not None:
        payload['errors'] = errors
    if include_legacy_error:
        payload['error'] = detail
    return Response(payload, status=status_code)


def derive_detail_from_errors(errors, default='Validation error.'):
    """Best-effort human-readable summary from DRF serializer errors."""
    if isinstance(errors, dict):
        non_field = errors.get('non_field_errors')
        if isinstance(non_field, list) and non_field:
            return str(non_field[0])
        for field, field_errors in errors.items():
            if isinstance(field_errors, list) and field_errors:
                return f"{field}: {field_errors[0]}"
            if isinstance(field_errors, str):
                return f"{field}: {field_errors}"
    if isinstance(errors, list) and errors:
        return str(errors[0])
    return default
