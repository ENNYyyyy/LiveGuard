from datetime import timedelta

from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser

from agencies.models import SecurityAgency
from alerts.models import EmergencyAlert, AlertAssignment
from accounts.models import User
from notifications.services import NotificationDispatcher

from .serializers import (
    AgencyListSerializer,
    AgencyDetailSerializer,
    AgencyCreateUpdateSerializer,
    AlertListAdminSerializer,
    AlertDetailAdminSerializer,
    CivilianUserSerializer,
)


# ─── Dashboard ────────────────────────────────────────────────────────────────

class DashboardView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        alerts = EmergencyAlert.objects.all()

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
                'alerts_all_time':  alerts.count(),
                'alerts_today':     alerts.filter(created_at__gte=today_start).count(),
                'alerts_this_week': alerts.filter(created_at__gte=now - timedelta(days=7)).count(),
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

        return Response(AlertListAdminSerializer(qs, many=True).data)


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
