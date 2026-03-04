import math
import logging
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.db import transaction
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .throttles import AlertCreationThrottle

from .models import EmergencyAlert, AlertAssignment
from .serializers import (
    EmergencyAlertCreateSerializer,
    EmergencyAlertDetailSerializer,
    EmergencyAlertListSerializer,
)
from .priority_engine import QUESTION_SCHEMA_VERSION, get_questions
from agencies.models import SecurityAgency
from notifications.services import NotificationDispatcher, enqueue_alert_dispatch

logger = logging.getLogger(__name__)

ALERT_TYPE_AGENCY_MAP = {
    'TERRORISM':      ['MILITARY', 'POLICE', 'SECURITY_FORCE'],
    'BANDITRY':       ['POLICE', 'SECURITY_FORCE'],
    'KIDNAPPING':     ['POLICE', 'SECURITY_FORCE'],
    'ARMED_ROBBERY':  ['POLICE'],
    'ROBBERY':        ['POLICE'],
    'FIRE_INCIDENCE': ['FIRE'],
    'ACCIDENT':       ['MEDICAL'],
    'OTHER':          ['POLICE'],
}


def _haversine_km(lat1, lon1, lat2, lon2):
    """Great-circle distance in kilometres (Haversine formula)."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _rank_agencies(agencies, alert_lat, alert_lng):
    """
    Sort agencies by distance from the alert location.
    Agencies that have geo coordinates (latitude/longitude set) are ranked
    closest-first and assigned higher priority (lower priority number).
    Agencies without coordinates are appended at the end — they still receive
    the alert but at lower priority.  This is the deterministic fallback for
    agencies that have not yet had coordinates entered in the admin panel.

    Returns a list of (agency, distance_km_or_None) tuples in priority order.
    """
    with_geo, without_geo = [], []
    for agency in agencies:
        if agency.latitude is not None and agency.longitude is not None:
            dist = _haversine_km(
                alert_lat, alert_lng,
                float(agency.latitude), float(agency.longitude),
            )
            with_geo.append((agency, dist))
        else:
            without_geo.append((agency, None))
    with_geo.sort(key=lambda x: x[1])
    return with_geo + without_geo


class CreateEmergencyAlertView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [AlertCreationThrottle]

    def post(self, request):
        payload = request.data.copy()
        if hasattr(payload, 'pop'):
            # Priority is computed server-side from risk answers.
            payload.pop('priority_level', None)

        serializer = EmergencyAlertCreateSerializer(
            data=payload, context={'request': request}
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            alert = serializer.save(user=request.user)

            agency_types = ALERT_TYPE_AGENCY_MAP.get(alert.alert_type, ['POLICE'])
            agencies = list(SecurityAgency.objects.filter(
                agency_type__in=agency_types, is_active=True
            ))

            # Rank agencies by proximity when the alert has a location.
            # assignment_priority=1 means closest/highest priority.
            try:
                ranked = _rank_agencies(
                    agencies,
                    float(alert.location.latitude),
                    float(alert.location.longitude),
                )
            except Exception:
                # No location on alert ? fall back to type-only, all priority=1
                ranked = [(a, None) for a in agencies]

            assignments = [
                AlertAssignment(alert=alert, agency=agency, assignment_priority=i + 1)
                for i, (agency, _) in enumerate(ranked)
            ]
            AlertAssignment.objects.bulk_create(assignments)

            alert.status = 'DISPATCHED'
            alert.save(update_fields=['status'])

            if settings.ALERT_DISPATCH_ASYNC:
                alert_id = alert.alert_id
                transaction.on_commit(
                    lambda alert_id=alert_id: enqueue_alert_dispatch(alert_id)
                )
            else:
                dispatcher = NotificationDispatcher()
                created_assignments = AlertAssignment.objects.filter(alert=alert).select_related(
                    'alert__user', 'alert__location', 'agency'
                )
                for assignment in created_assignments:
                    dispatcher.dispatch_alert(assignment)

        return Response(
            EmergencyAlertDetailSerializer(alert, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class PriorityQuestionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        alert_type = request.query_params.get('alert_type')
        if not alert_type:
            return Response(
                {'detail': 'alert_type query parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            normalized_type = str(alert_type).strip().upper()
            questions = get_questions(normalized_type)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                'alert_type': normalized_type,
                'version': QUESTION_SCHEMA_VERSION,
                'questions': questions,
            },
            status=status.HTTP_200_OK,
        )


class AlertStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, alert_id):
        try:
            alert = EmergencyAlert.objects.select_related('location').prefetch_related(
                'assignments__agency',
                'assignments__acknowledgment',
                'assignments__notifications',
            ).get(alert_id=alert_id)
        except EmergencyAlert.DoesNotExist:
            return Response({'error': 'Alert not found.'}, status=status.HTTP_404_NOT_FOUND)

        is_owner = alert.user_id == request.user.pk
        is_agency_staff = hasattr(request.user, 'agency_profile')

        if not (is_owner or is_agency_staff):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        return Response(
            EmergencyAlertDetailSerializer(alert, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )


class UserAlertHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        alerts = EmergencyAlert.objects.filter(
            user=request.user
        ).select_related('location').order_by('-created_at')

        return Response(
            EmergencyAlertListSerializer(alerts, many=True, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )


class UpdateAlertLocationView(APIView):
    """
    PATCH /api/alerts/{alert_id}/location/
    Called by the civilian app every ~15 seconds while the alert is active
    to stream real-time position updates to the assigned agencies.
    """
    permission_classes = [IsAuthenticated]

    TERMINAL_STATUSES = ('RESOLVED', 'CANCELLED')

    def patch(self, request, alert_id):
        try:
            alert = EmergencyAlert.objects.select_related('location').get(
                alert_id=alert_id, user=request.user
            )
        except EmergencyAlert.DoesNotExist:
            return Response({'error': 'Alert not found.'}, status=status.HTTP_404_NOT_FOUND)

        if alert.status in self.TERMINAL_STATUSES:
            return Response(
                {'error': 'Location cannot be updated for a resolved or cancelled alert.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        raw_lat = request.data.get('latitude')
        raw_lng = request.data.get('longitude')
        if raw_lat is None or raw_lng is None:
            return Response(
                {'error': 'latitude and longitude are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            lat = Decimal(str(raw_lat))
            lng = Decimal(str(raw_lng))
            if not (Decimal('-90') <= lat <= Decimal('90')):
                raise ValueError
            if not (Decimal('-180') <= lng <= Decimal('180')):
                raise ValueError
        except (ValueError, InvalidOperation):
            return Response(
                {'error': 'Invalid coordinates.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        location = alert.location
        location.latitude = lat
        location.longitude = lng
        update_fields = ['latitude', 'longitude']

        accuracy = request.data.get('accuracy')
        if accuracy is not None:
            location.accuracy = accuracy
            update_fields.append('accuracy')

        location.save(update_fields=update_fields)

        return Response({
            'latitude':  str(location.latitude),
            'longitude': str(location.longitude),
            'accuracy':  location.accuracy,
            'maps_url':  f"https://maps.google.com/?q={location.latitude},{location.longitude}",
        }, status=status.HTTP_200_OK)


class RateAlertView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, alert_id):
        try:
            alert = EmergencyAlert.objects.get(alert_id=alert_id, user=request.user)
        except EmergencyAlert.DoesNotExist:
            return Response({'error': 'Alert not found.'}, status=status.HTTP_404_NOT_FOUND)

        rating = request.data.get('rating')
        if not isinstance(rating, int) or rating not in range(1, 6):
            return Response({'error': 'rating must be an integer between 1 and 5.'}, status=status.HTTP_400_BAD_REQUEST)

        if alert.rating is not None:
            return Response({'error': 'Already rated.'}, status=status.HTTP_400_BAD_REQUEST)

        alert.rating = rating
        alert.save(update_fields=['rating'])
        return Response({'rating': rating}, status=status.HTTP_200_OK)


class CancelAlertView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, alert_id):
        try:
            alert = EmergencyAlert.objects.get(alert_id=alert_id, user=request.user)
        except EmergencyAlert.DoesNotExist:
            return Response({'error': 'Alert not found.'}, status=status.HTTP_404_NOT_FOUND)

        if alert.status not in ('PENDING', 'DISPATCHED'):
            return Response(
                {'error': f'Cannot cancel an alert with status \'{alert.status}\'.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        alert.status = 'CANCELLED'
        alert.save(update_fields=['status'])

        assignments = (
            AlertAssignment.objects
            .filter(alert=alert)
            .select_related('alert', 'agency')
        )
        dispatcher = NotificationDispatcher()
        for assignment in assignments:
            try:
                dispatcher.send_cancellation_notice(assignment)
            except Exception:
                logger.exception(
                    "Cancellation notice failed for alert_id=%s assignment_id=%s",
                    alert.alert_id,
                    assignment.assignment_id,
                )

        return Response(
            {'message': 'Alert cancelled.', 'alert_id': alert_id},
            status=status.HTTP_200_OK,
        )
