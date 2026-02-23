from rest_framework.permissions import BasePermission


class IsAgencyUser(BasePermission):
    """Grants access to users linked to a SecurityAgency via AgencyUser."""
    message = 'You must be a registered agency user to perform this action.'

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'agency_profile')
        )


class IsAdminUser(BasePermission):
    """Grants access to users with a SystemAdmin profile or Django staff flag."""
    message = 'You must be a system administrator to perform this action.'

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_staff or hasattr(request.user, 'systemadmin'))
        )
