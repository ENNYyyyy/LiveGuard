import logging
from datetime import timedelta
from threading import Thread

from django.utils import timezone
from django.db import close_old_connections
from django.db.models import Count, Avg, Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination

logger = logging.getLogger(__name__)

from alert_system.permissions import IsAdminUser

from agencies.models import SecurityAgency, AgencyUser
from alerts.models import EmergencyAlert, AlertAssignment
from accounts.models import User
from notifications.models import NotificationLog
from notifications.services import NotificationDispatcher

from .models import SystemSetting
from .serializers import (
    AgencyListSerializer,
    AgencyDetailSerializer,
    AgencyCreateUpdateSerializer,
    AgencyStaffCreateSerializer,
    AgencyStaffUpdateSerializer,
    AlertListAdminSerializer,
    AlertDetailAdminSerializer,
    CivilianUserSerializer,
    NotificationLogSerializer,
    SystemSettingSerializer,
)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _parse_bool(value):
    """
    Parse a boolean value from JSON or form data robustly.

    Accepts:
      - Python/JSON bool: True / False
      - Integers: 1 (True) or 0 (False)
      - Strings (case-insensitive): 'true'/'false', '1'/'0', 'yes'/'no', 'on'/'off'

    Returns (bool, None) on success; (None, error_message) on failure.
    Used so PATCH { "is_active": "false" } is not silently misread as True.
    """
    if isinstance(value, bool):
        return value, None
    if isinstance(value, int):
        if value in (0, 1):
            return bool(value), None
        return None, f'"is_active" integer must be 0 or 1, got {value!r}.'
    if isinstance(value, str):
        lower = value.strip().lower()
        if lower in ('true', '1', 'yes', 'on'):
            return True, None
        if lower in ('false', '0', 'no', 'off'):
            return False, None
    return None, '"is_active" must be a boolean (true/false) or equivalent string (yes/no, on/off, 1/0).'


class AdminPageNumberPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


def _run_broadcast_job(channel, title, message):
    """
    Background broadcast worker.
    Runs in a daemon thread so HTTP request returns immediately.
    """
    close_old_connections()
    sent = 0
    failed = 0
    try:
        civilians = User.objects.filter(is_staff=False, is_superuser=False, is_active=True)
        dispatcher = NotificationDispatcher()

        if channel == 'PUSH':
            targets = civilians.exclude(push_token__isnull=True).exclude(push_token='')
            for user in targets:
                try:
                    dispatcher._send_expo_push(
                        token=user.push_token,
                        title=title,
                        body=message,
                        data={'type': 'BROADCAST'},
                    )
                    sent += 1
                except Exception as exc:
                    failed += 1
                    logger.error(f"Broadcast push failed for {user.email}: {exc}")

        elif channel == 'SMS':
            targets = civilians.exclude(phone_number__isnull=True).exclude(phone_number='')
            for user in targets:
                try:
                    from twilio.rest import Client
                    from decouple import config
                    Client(
                        config('TWILIO_ACCOUNT_SID'),
                        config('TWILIO_AUTH_TOKEN'),
                    ).messages.create(
                        body=f"{title}\n{message}",
                        from_=config('TWILIO_PHONE_NUMBER'),
                        to=user.phone_number,
                    )
                    sent += 1
                except Exception as exc:
                    failed += 1
                    logger.error(f"Broadcast SMS failed for {user.phone_number}: {exc}")

        elif channel == 'EMAIL':
            from django.core.mail import send_mail
            from decouple import config
            from_email = config('DEFAULT_FROM_EMAIL', default='noreply@liveguard.app')
            targets = civilians.exclude(email__isnull=True).exclude(email='')
            for user in targets:
                try:
                    send_mail(title, message, from_email, [user.email], fail_silently=False)
                    sent += 1
                except Exception as exc:
                    failed += 1
                    logger.error(f"Broadcast email failed for {user.email}: {exc}")

        logger.info(
            "Broadcast job completed channel=%s sent=%s failed=%s",
            channel,
            sent,
            failed,
        )
    except Exception:
        logger.exception("Broadcast job crashed channel=%s", channel)
    finally:
        close_old_connections()


# ─── Dashboard ────────────────────────────────────────────────────────────────

class DashboardView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        all_alerts = EmergencyAlert.objects.all()

        # Apply date_range filter for breakdown cards
        date_range = request.query_params.get('date_range', 'all')
        if date_range == 'today':
            alerts = all_alerts.filter(created_at__gte=today_start)
        elif date_range == '7d':
            alerts = all_alerts.filter(created_at__gte=now - timedelta(days=7))
        elif date_range == '30d':
            alerts = all_alerts.filter(created_at__gte=now - timedelta(days=30))
        else:
            alerts = all_alerts

        # Average agency response time (assigned_at → response_time)
        responded = AlertAssignment.objects.filter(response_time__isnull=False)
        avg_response_seconds = None
        if responded.exists():
            total = sum(
                (a.response_time - a.assigned_at).total_seconds()
                for a in responded
            )
            avg_response_seconds = round(total / responded.count())

        return Response({
            'totals': {
                'alerts_all_time':  all_alerts.count(),
                'alerts_today':     all_alerts.filter(created_at__gte=today_start).count(),
                'alerts_this_week': all_alerts.filter(created_at__gte=now - timedelta(days=7)).count(),
                'agencies_total':   SecurityAgency.objects.count(),
                'agencies_active':  SecurityAgency.objects.filter(is_active=True).count(),
                'civilian_users':   User.objects.filter(is_staff=False, is_superuser=False).count(),
            },
            'alerts_by_status': {
                s: alerts.filter(status=s).count()
                for s, _ in EmergencyAlert.STATUSES
            },
            'alerts_by_type': {
                t: alerts.filter(alert_type=t).count()
                for t, _ in EmergencyAlert.ALERT_TYPES
            },
            'alerts_by_priority': {
                p: alerts.filter(priority_level=p).count()
                for p, _ in EmergencyAlert.PRIORITY_LEVELS
            },
            'avg_agency_response_seconds': avg_response_seconds,
        })


# ─── Agency management ────────────────────────────────────────────────────────

class AgencyListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        agencies = (
            SecurityAgency.objects
            .prefetch_related('staff__user', 'assignments')
            .order_by('agency_name')
        )
        return Response(AgencyListSerializer(agencies, many=True).data)

    def post(self, request):
        serializer = AgencyCreateUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        agency = serializer.save()
        return Response(
            AgencyDetailSerializer(agency).data,
            status=status.HTTP_201_CREATED,
        )


class AgencyDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def _get(self, agency_id):
        try:
            return (
                SecurityAgency.objects
                .prefetch_related('staff__user', 'assignments')
                .get(agency_id=agency_id)
            )
        except SecurityAgency.DoesNotExist:
            return None

    def get(self, request, agency_id):
        agency = self._get(agency_id)
        if not agency:
            return Response({'error': 'Agency not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(AgencyDetailSerializer(agency).data)

    def put(self, request, agency_id):
        agency = self._get(agency_id)
        if not agency:
            return Response({'error': 'Agency not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = AgencyCreateUpdateSerializer(agency, data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        agency = serializer.save()
        return Response(AgencyDetailSerializer(agency).data)

    def patch(self, request, agency_id):
        agency = self._get(agency_id)
        if not agency:
            return Response({'error': 'Agency not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = AgencyCreateUpdateSerializer(agency, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        agency = serializer.save()
        return Response(AgencyDetailSerializer(agency).data)

    def delete(self, request, agency_id):
        agency = self._get(agency_id)
        if not agency:
            return Response({'error': 'Agency not found.'}, status=status.HTTP_404_NOT_FOUND)
        agency.is_active = False
        agency.save(update_fields=['is_active'])
        return Response(
            {'message': f"Agency '{agency.agency_name}' has been deactivated."},
            status=status.HTTP_200_OK,
        )


class AgencyStaffView(APIView):
    """Create a new staff member and link them to the agency."""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def _get_agency(self, agency_id):
        try:
            return SecurityAgency.objects.prefetch_related('staff__user', 'assignments').get(agency_id=agency_id)
        except SecurityAgency.DoesNotExist:
            return None

    def post(self, request, agency_id):
        agency = self._get_agency(agency_id)
        if not agency:
            return Response({'error': 'Agency not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = AgencyStaffCreateSerializer(data=request.data, context={'agency': agency})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        agency = self._get_agency(agency_id)
        return Response(AgencyDetailSerializer(agency).data, status=status.HTTP_201_CREATED)


class AgencyStaffDetailView(APIView):
    """Update or remove a staff member linked to an agency."""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def _get_agency_user(self, agency_id, user_id):
        try:
            return AgencyUser.objects.select_related('user').get(
                agency__agency_id=agency_id, user__user_id=user_id
            )
        except AgencyUser.DoesNotExist:
            return None

    def _agency_detail(self, agency_id):
        return (
            SecurityAgency.objects
            .prefetch_related('staff__user', 'assignments')
            .get(agency_id=agency_id)
        )

    def patch(self, request, agency_id, user_id):
        """
        PATCH /api/admin/agencies/<agency_id>/staff/<user_id>/
        Editable: full_name, phone_number, role.  Email is immutable.
        Returns updated AgencyDetailSerializer payload.
        """
        agency_user = self._get_agency_user(agency_id, user_id)
        if not agency_user:
            return Response({'error': 'Staff member not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = AgencyStaffUpdateSerializer(agency_user, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(AgencyDetailSerializer(self._agency_detail(agency_id)).data)

    def delete(self, request, agency_id, user_id):
        agency_user = self._get_agency_user(agency_id, user_id)
        if not agency_user:
            return Response({'error': 'Staff member not found.'}, status=status.HTTP_404_NOT_FOUND)
        user = agency_user.user
        user.delete()  # cascades to AgencyUser
        return Response(AgencyDetailSerializer(self._agency_detail(agency_id)).data)


# ─── Alert management ────────────────────────────────────────────────────────

class AlertListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        qs = (
            EmergencyAlert.objects
            .select_related('user', 'location')
            .prefetch_related('assignments')
            .order_by('-created_at')
        )
        # Query-param filters
        if s := request.query_params.get('status'):
            qs = qs.filter(status=s)
        if t := request.query_params.get('type'):
            qs = qs.filter(alert_type=t)
        if p := request.query_params.get('priority'):
            qs = qs.filter(priority_level=p)
        if raw_search := request.query_params.get('search'):
            search = raw_search.strip()
            if search:
                search_filter = (
                    Q(alert_type__icontains=search) |
                    Q(status__icontains=search) |
                    Q(user__full_name__icontains=search) |
                    Q(location__address__icontains=search)
                )
                if search.isdigit():
                    search_filter |= Q(alert_id=int(search))
                qs = qs.filter(search_filter)

        paginator = AdminPageNumberPagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        serializer = AlertListAdminSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class AlertDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, alert_id):
        try:
            alert = (
                EmergencyAlert.objects
                .select_related('user', 'location')
                .prefetch_related('assignments__agency', 'assignments__acknowledgment')
                .get(alert_id=alert_id)
            )
        except EmergencyAlert.DoesNotExist:
            return Response({'error': 'Alert not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(AlertDetailAdminSerializer(alert).data)


class AlertAssignView(APIView):
    """Manually assign (or re-assign) an alert to an agency and dispatch notifications."""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, alert_id):
        agency_id = request.data.get('agency_id')
        if not agency_id:
            return Response({'error': 'agency_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            alert = EmergencyAlert.objects.select_related('location').get(alert_id=alert_id)
        except EmergencyAlert.DoesNotExist:
            return Response({'error': 'Alert not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            agency = SecurityAgency.objects.get(agency_id=agency_id, is_active=True)
        except SecurityAgency.DoesNotExist:
            return Response(
                {'error': 'Agency not found or inactive.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if AlertAssignment.objects.filter(alert=alert, agency=agency).exists():
            return Response(
                {'error': 'This agency is already assigned to this alert.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        assignment = AlertAssignment.objects.create(alert=alert, agency=agency)

        if alert.status == 'PENDING':
            alert.status = 'DISPATCHED'
            alert.save(update_fields=['status'])

        NotificationDispatcher().dispatch_alert(assignment)

        return Response(
            {'message': f"Alert #{alert_id} assigned to {agency.agency_name} and dispatched."},
            status=status.HTTP_201_CREATED,
        )


# ─── User management ──────────────────────────────────────────────────────────

class CivilianUserListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        users = (
            User.objects
            .filter(is_staff=False, is_superuser=False)
            .prefetch_related('alerts')
            .order_by('-date_joined')
        )
        return Response(CivilianUserSerializer(users, many=True).data)


class CivilianUserDetailView(APIView):
    """
    PATCH /api/admin/users/<user_id>/
    Activate or deactivate a civilian (non-staff) user account.
    Body: { "is_active": true | false }
    Safety: staff and superuser accounts are never affected.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def patch(self, request, user_id):
        if 'is_active' not in request.data:
            return Response(
                {'error': '"is_active" (true or false) is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(pk=user_id, is_staff=False, is_superuser=False)
        except User.DoesNotExist:
            return Response(
                {'error': 'Civilian user not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        new_state, parse_err = _parse_bool(request.data['is_active'])
        if parse_err:
            return Response({'error': parse_err}, status=status.HTTP_400_BAD_REQUEST)
        user.is_active = new_state
        user.save(update_fields=['is_active'])

        action = 'activated' if new_state else 'deactivated'
        return Response({
            'message': f"User '{user.email}' has been {action}.",
            'user_id': user.pk,
            'is_active': user.is_active,
        })


# ─── Notification logs ────────────────────────────────────────────────────────

class NotificationLogListView(APIView):
    """
    GET /api/admin/notifications/
    Read-only view of all notification delivery attempts.
    Optional query params: ?channel=PUSH|SMS|EMAIL  ?status=SENT|FAILED  ?assignment=<id>
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        qs = (
            NotificationLog.objects
            .select_related('assignment__alert', 'assignment__agency')
            .order_by('-sent_at')
        )
        if ch := request.query_params.get('channel'):
            qs = qs.filter(channel_type=ch.upper())
        if st := request.query_params.get('status'):
            qs = qs.filter(delivery_status=st.upper())
        if aid := request.query_params.get('assignment'):
            qs = qs.filter(assignment_id=aid)

        paginator = AdminPageNumberPagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        serializer = NotificationLogSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


# ─── Broadcast notification ───────────────────────────────────────────────────

class BroadcastNotificationView(APIView):
    """
    POST /api/admin/notifications/broadcast/
    Send a push / SMS / email notification to all active civilian users.
    Body: { "title": "...", "message": "...", "channel": "PUSH"|"SMS"|"EMAIL" }
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request):
        title   = (request.data.get('title')   or '').strip()
        message = (request.data.get('message') or '').strip()
        channel = (request.data.get('channel') or 'PUSH').upper()

        if not title or not message:
            return Response(
                {'error': 'title and message are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if channel not in ('PUSH', 'SMS', 'EMAIL'):
            return Response(
                {'error': 'channel must be PUSH, SMS, or EMAIL.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        civilians = User.objects.filter(is_staff=False, is_superuser=False, is_active=True)
        if channel == 'PUSH':
            target_count = civilians.exclude(push_token__isnull=True).exclude(push_token='').count()
        elif channel == 'SMS':
            target_count = civilians.exclude(phone_number__isnull=True).exclude(phone_number='').count()
        else:
            target_count = civilians.exclude(email__isnull=True).exclude(email='').count()

        thread = Thread(
            target=_run_broadcast_job,
            args=(channel, title, message),
            daemon=True,
            name=f"broadcast-{channel.lower()}",
        )
        thread.start()

        return Response({
            'channel': channel,
            'queued': True,
            'target_count': target_count,
            'message': f"Broadcast queued for {target_count} recipients.",
        }, status=status.HTTP_202_ACCEPTED)


# ─── Reports ──────────────────────────────────────────────────────────────────

class ReportsView(APIView):
    """
    GET /api/admin/reports/
    Aggregated operational metrics for the admin dashboard.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        now = timezone.now()

        # Alert volume by period
        def alert_count(days):
            return EmergencyAlert.objects.filter(
                created_at__gte=now - timedelta(days=days)
            ).count()

        # Notification delivery rates per channel
        def channel_stats(channel):
            logs = NotificationLog.objects.filter(channel_type=channel)
            total = logs.count()
            sent  = logs.filter(delivery_status='SENT').count()
            return {
                'total':        total,
                'sent':         sent,
                'failed':       total - sent,
                'success_rate': round(sent / total * 100, 1) if total else None,
            }

        # Average response time (assigned_at → response_time) per agency type
        responded = AlertAssignment.objects.filter(response_time__isnull=False).select_related('agency')
        agency_response = {}
        for asgmt in responded:
            atype = asgmt.agency.agency_type
            delta = (asgmt.response_time - asgmt.assigned_at).total_seconds()
            agency_response.setdefault(atype, []).append(delta)
        avg_response_by_type = {
            k: round(sum(v) / len(v))
            for k, v in agency_response.items()
        }

        return Response({
            'alert_volume': {
                'last_24h':  alert_count(1),
                'last_7d':   alert_count(7),
                'last_30d':  alert_count(30),
                'all_time':  EmergencyAlert.objects.count(),
            },
            'alert_types': {
                t: EmergencyAlert.objects.filter(alert_type=t).count()
                for t, _ in EmergencyAlert.ALERT_TYPES
            },
            'alert_statuses': {
                s: EmergencyAlert.objects.filter(status=s).count()
                for s, _ in EmergencyAlert.STATUSES
            },
            'notification_delivery': {
                'PUSH':  channel_stats('PUSH'),
                'SMS':   channel_stats('SMS'),
                'EMAIL': channel_stats('EMAIL'),
            },
            'avg_response_seconds_by_agency_type': avg_response_by_type,
            'generated_at': now.isoformat(),
        })


# ─── System settings ──────────────────────────────────────────────────────────

# Default operational settings pre-populated on first access.
# No secrets — only runtime-tunable operational values.
_DEFAULT_SETTINGS = [
    ('alert_creation_rate_limit', '5',    'Max alerts a civilian can create per hour'),
    ('user_rate_limit',           '100',  'Max API requests per user per hour'),
    ('max_notification_retries',  '2',    'Maximum retry attempts per notification channel'),
    ('alert_polling_interval_s',  '5',    'Frontend polling interval in seconds (informational)'),
    ('location_update_interval_m','15',   'Min metres moved before location update is sent (informational)'),
]


class SystemSettingsView(APIView):
    """
    GET  /api/admin/settings/ — list all operational settings
    PATCH /api/admin/settings/ — update one or more values by key
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def _ensure_defaults(self):
        for key, value, description in _DEFAULT_SETTINGS:
            SystemSetting.objects.get_or_create(
                key=key,
                defaults={'value': value, 'description': description},
            )

    def get(self, request):
        self._ensure_defaults()
        settings = SystemSetting.objects.all().order_by('key')
        return Response(SystemSettingSerializer(settings, many=True).data)

    def patch(self, request):
        self._ensure_defaults()
        if not isinstance(request.data, dict):
            return Response(
                {'error': 'Expected a JSON object of {key: new_value} pairs.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        updated = []
        errors  = {}
        for key, value in request.data.items():
            try:
                setting = SystemSetting.objects.get(key=key)
                setting.value = str(value)
                setting.save(update_fields=['value', 'updated_at'])
                updated.append(key)
            except SystemSetting.DoesNotExist:
                errors[key] = 'Unknown setting key.'
        response = {'updated': updated}
        if errors:
            response['errors'] = errors
        return Response(response, status=status.HTTP_200_OK if updated else status.HTTP_400_BAD_REQUEST)
