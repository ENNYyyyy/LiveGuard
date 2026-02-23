from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from alerts.models import AlertAssignment, Acknowledgment
from alerts.serializers import AlertAssignmentSerializer, AcknowledgmentSerializer
from .serializers import AcknowledgeAlertSerializer
from notifications.services import NotificationDispatcher
from alert_system.permissions import IsAgencyUser


class AgencyAlertListView(APIView):
    permission_classes = [IsAuthenticated, IsAgencyUser]

    def get(self, request):
        agency = request.user.agency_profile.agency
        assignments = (
            AlertAssignment.objects
            .filter(agency=agency)
            .select_related('alert__location', 'agency')
            .prefetch_related('acknowledgment')
            .order_by('-assigned_at')
        )
        return Response(
            AlertAssignmentSerializer(assignments, many=True, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )


class AcknowledgeAlertView(APIView):
    permission_classes = [IsAuthenticated, IsAgencyUser]

    def post(self, request, assignment_id):
        agency = request.user.agency_profile.agency

        try:
            assignment = AlertAssignment.objects.select_related(
                'alert__user', 'agency'
            ).get(assignment_id=assignment_id, agency=agency)
        except AlertAssignment.DoesNotExist:
            return Response({'error': 'Assignment not found.'}, status=status.HTTP_404_NOT_FOUND)

        if hasattr(assignment, 'acknowledgment'):
            return Response(
                {'error': 'This assignment has already been acknowledged.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = AcknowledgeAlertSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        acknowledgment = Acknowledgment.objects.create(
            assignment=assignment,
            **serializer.validated_data,
        )

        assignment.notification_status = 'DELIVERED'
        assignment.response_time = timezone.now()
        assignment.save(update_fields=['notification_status', 'response_time'])

        alert = assignment.alert
        alert.status = 'ACKNOWLEDGED'
        alert.save(update_fields=['status'])

        dispatcher = NotificationDispatcher()
        dispatcher.send_user_acknowledgment(
            user=alert.user,
            acknowledgment_data={
                'alert_id': alert.alert_id,
                'agency_name': assignment.agency.agency_name,
                'estimated_arrival': acknowledgment.estimated_arrival,
            },
            assignment=assignment,
        )

        return Response(
            AcknowledgmentSerializer(acknowledgment).data,
            status=status.HTTP_201_CREATED,
        )


class UpdateAlertStatusView(APIView):
    permission_classes = [IsAuthenticated, IsAgencyUser]

    ALLOWED_STATUSES = ('RESPONDING', 'RESOLVED')

    def put(self, request, assignment_id):
        agency = request.user.agency_profile.agency
        new_status = request.data.get('status')

        if new_status not in self.ALLOWED_STATUSES:
            return Response(
                {'error': f"Status must be one of: {', '.join(self.ALLOWED_STATUSES)}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            assignment = AlertAssignment.objects.select_related(
                'alert__user'
            ).get(assignment_id=assignment_id, agency=agency)
        except AlertAssignment.DoesNotExist:
            return Response({'error': 'Assignment not found.'}, status=status.HTTP_404_NOT_FOUND)

        alert = assignment.alert
        alert.status = new_status
        alert.save(update_fields=['status'])

        NotificationDispatcher().send_status_update(assignment, new_status)

        return Response(
            {'message': f"Alert status updated to '{new_status}'.", 'alert_id': alert.alert_id},
            status=status.HTTP_200_OK,
        )


class AlertLocationView(APIView):
    permission_classes = [IsAuthenticated, IsAgencyUser]

    def get(self, request, assignment_id):
        agency = request.user.agency_profile.agency

        try:
            assignment = AlertAssignment.objects.select_related(
                'alert__location'
            ).get(assignment_id=assignment_id, agency=agency)
        except AlertAssignment.DoesNotExist:
            return Response({'error': 'Assignment not found.'}, status=status.HTTP_404_NOT_FOUND)

        location = getattr(assignment.alert, 'location', None)
        if not location:
            return Response({'error': 'No location data for this alert.'}, status=status.HTTP_404_NOT_FOUND)

        maps_url = f"https://maps.google.com/?q={location.latitude},{location.longitude}"

        return Response(
            {
                'latitude': location.latitude,
                'longitude': location.longitude,
                'accuracy': location.accuracy,
                'address': location.address,
                'captured_at': location.captured_at,
                'maps_url': maps_url,
            },
            status=status.HTTP_200_OK,
        )


class RegisterAgencyDeviceView(APIView):
    """
    POST /api/agency/register-device/
    Registers (or updates) the push token for the caller's agency so that
    emergency alert notifications can be delivered to the agency app.
    """
    permission_classes = [IsAuthenticated, IsAgencyUser]

    def post(self, request):
        push_token = request.data.get('push_token')
        if not push_token:
            return Response({'error': 'push_token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        agency = request.user.agency_profile.agency
        agency.fcm_token = push_token
        agency.save(update_fields=['fcm_token'])

        return Response({'message': 'Device registered successfully.'}, status=status.HTTP_200_OK)
