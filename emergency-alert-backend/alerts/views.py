from decimal import Decimal, InvalidOperation

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
from agencies.models import SecurityAgency
from notifications.services import NotificationDispatcher


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


class CreateEmergencyAlertView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [AlertCreationThrottle]

    def post(self, request):
        serializer = EmergencyAlertCreateSerializer(
            data=request.data, context={'request': request}
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        alert = serializer.save(user=request.user)

        agency_types = ALERT_TYPE_AGENCY_MAP.get(alert.alert_type, ['POLICE'])
        agencies = SecurityAgency.objects.filter(
            agency_type__in=agency_types, is_active=True
        )

        assignments = [
            AlertAssignment(alert=alert, agency=agency)
            for agency in agencies
        ]
        AlertAssignment.objects.bulk_create(assignments)

        alert.status = 'DISPATCHED'
        alert.save(update_fields=['status'])

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


class AlertStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, alert_id):
        try:
            alert = EmergencyAlert.objects.select_related('location').prefetch_related(
                'assignments__agency',
                'assignments__acknowledgment',
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

        return Response(
            {'message': 'Alert cancelled.', 'alert_id': alert_id},
            status=status.HTTP_200_OK,
        )
