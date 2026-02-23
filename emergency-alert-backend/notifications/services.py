import logging
import requests as http_requests
from .models import NotificationLog

logger = logging.getLogger(__name__)


class NotificationDispatcher:
    """
    Dispatches emergency alerts through ALL three channels simultaneously.
    Each channel is independent — failure in one does not block others.
    All attempts are logged in NotificationLog.

    Push token routing:
      - Tokens starting with "ExponentPushToken" → Expo Push API
      - All other tokens (native FCM device tokens) → Firebase Admin SDK
    """

    AGENCY_ALERT_MAPPING = {
        'TERRORISM': ['MILITARY', 'POLICE', 'SECURITY_FORCE'],
        'BANDITRY': ['POLICE', 'SECURITY_FORCE'],
        'KIDNAPPING': ['POLICE', 'SECURITY_FORCE'],
        'ARMED_ROBBERY': ['POLICE'],
        'OTHER': ['POLICE'],
    }

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def dispatch_alert(self, assignment):
        """Send alert to the assigned agency through all channels."""
        agency = assignment.agency
        alert = assignment.alert
        location = alert.location

        alert_data = {
            'alert_id': alert.alert_id,
            'alert_type': alert.alert_type,
            'priority': alert.priority_level,
            'description': alert.description or 'No description provided',
            'latitude': str(location.latitude),
            'longitude': str(location.longitude),
            'address': location.address or 'Address unavailable',
            'user_name': alert.user.full_name,
            'user_phone': alert.user.phone_number,
            'timestamp': alert.created_at.isoformat(),
            'maps_url': f"https://maps.google.com/?q={location.latitude},{location.longitude}",
        }

        self._send_push(assignment, agency, alert_data)
        self._send_sms(assignment, agency, alert_data)
        self._send_email(assignment, agency, alert_data)
        self._update_assignment_status(assignment)

    def send_user_acknowledgment(self, user, acknowledgment_data, assignment=None):
        """
        Notify the civilian user that their alert was acknowledged.
        User push tokens are always Expo tokens, so we use the Expo Push API.
        Pass assignment to persist each channel attempt in NotificationLog.
        """
        if user.push_token:
            try:
                self._send_expo_push(
                    token=user.push_token,
                    title='Alert Acknowledged!',
                    body=(
                        f"{acknowledgment_data['agency_name']} has acknowledged your alert. "
                        f"ETA: {acknowledgment_data.get('estimated_arrival', 'Unknown')} min"
                    ),
                    data={
                        'type': 'ACKNOWLEDGMENT',
                        'alert_id': str(acknowledgment_data['alert_id']),
                        'agency_name': acknowledgment_data['agency_name'],
                    },
                )
                if assignment:
                    NotificationLog.objects.create(
                        assignment=assignment,
                        channel_type='PUSH',
                        recipient=user.push_token[:50],
                        delivery_status='SENT',
                    )
                logger.info(f"Ack push sent to user {user.email}")
            except Exception as e:
                if assignment:
                    NotificationLog.objects.create(
                        assignment=assignment,
                        channel_type='PUSH',
                        recipient=user.push_token[:50],
                        delivery_status='FAILED',
                        error_message=str(e),
                    )
                logger.error(f"User ack push failed for {user.email}: {e}")
        elif assignment:
            NotificationLog.objects.create(
                assignment=assignment,
                channel_type='PUSH',
                recipient=user.email,
                delivery_status='FAILED',
                error_message='No push token registered for this user.',
            )

        try:
            from twilio.rest import Client
            from decouple import config

            client = Client(config('TWILIO_ACCOUNT_SID'), config('TWILIO_AUTH_TOKEN'))
            client.messages.create(
                body=(
                    f"Your emergency alert has been acknowledged by "
                    f"{acknowledgment_data['agency_name']}. "
                    f"Estimated arrival: {acknowledgment_data.get('estimated_arrival', 'Unknown')} minutes. "
                    f"Stay safe."
                ),
                from_=config('TWILIO_PHONE_NUMBER'),
                to=user.phone_number,
            )
            if assignment:
                NotificationLog.objects.create(
                    assignment=assignment,
                    channel_type='SMS',
                    recipient=user.phone_number,
                    delivery_status='SENT',
                )
            logger.info(f"Ack SMS sent to {user.phone_number}")
        except Exception as e:
            if assignment:
                NotificationLog.objects.create(
                    assignment=assignment,
                    channel_type='SMS',
                    recipient=user.phone_number,
                    delivery_status='FAILED',
                    error_message=str(e),
                )
            logger.error(f"User ack SMS failed for {user.phone_number}: {e}")

    def send_status_update(self, assignment, new_status):
        """
        Notify the civilian user that their alert status has been updated.
        Called when an agency updates status to RESPONDING or RESOLVED.
        Never raises an uncaught exception to the caller.
        """
        user = assignment.alert.user
        status_messages = {
            'RESPONDING': (
                'Help is on the way!',
                f"{assignment.agency.agency_name} is now responding to your alert.",
            ),
            'RESOLVED': (
                'Alert Resolved',
                f"{assignment.agency.agency_name} has marked your alert as resolved.",
            ),
        }
        title, body = status_messages.get(
            new_status,
            ('Alert Update', f"Your alert status has been updated to {new_status}."),
        )

        if user.push_token:
            try:
                self._send_expo_push(
                    token=user.push_token,
                    title=title,
                    body=body,
                    data={
                        'type': 'STATUS_UPDATE',
                        'alert_id': str(assignment.alert.alert_id),
                        'new_status': new_status,
                    },
                )
                NotificationLog.objects.create(
                    assignment=assignment,
                    channel_type='PUSH',
                    recipient=user.push_token[:50],
                    delivery_status='SENT',
                )
                logger.info(f"Status update push sent to user {user.email}: {new_status}")
            except Exception as e:
                NotificationLog.objects.create(
                    assignment=assignment,
                    channel_type='PUSH',
                    recipient=user.push_token[:50],
                    delivery_status='FAILED',
                    error_message=str(e),
                )
                logger.error(f"Status update push failed for {user.email}: {e}")
        else:
            NotificationLog.objects.create(
                assignment=assignment,
                channel_type='PUSH',
                recipient=user.email,
                delivery_status='FAILED',
                error_message='No push token registered for this user.',
            )

        try:
            from twilio.rest import Client
            from decouple import config

            client = Client(config('TWILIO_ACCOUNT_SID'), config('TWILIO_AUTH_TOKEN'))
            client.messages.create(
                body=(
                    f"Emergency Alert Update: {assignment.agency.agency_name} has updated "
                    f"your alert status to {new_status}. Alert ID: {assignment.alert.alert_id}"
                ),
                from_=config('TWILIO_PHONE_NUMBER'),
                to=user.phone_number,
            )
            NotificationLog.objects.create(
                assignment=assignment,
                channel_type='SMS',
                recipient=user.phone_number,
                delivery_status='SENT',
            )
            logger.info(f"Status update SMS sent to {user.phone_number}: {new_status}")
        except Exception as e:
            NotificationLog.objects.create(
                assignment=assignment,
                channel_type='SMS',
                recipient=user.phone_number,
                delivery_status='FAILED',
                error_message=str(e),
            )
            logger.error(f"Status update SMS failed for {user.phone_number}: {e}")

    # ------------------------------------------------------------------
    # Push notification helpers
    # ------------------------------------------------------------------

    def _send_expo_push(self, token, title, body, data=None):
        """Send a push notification via the Expo Push API."""
        response = http_requests.post(
            'https://exp.host/--/api/v2/push/send',
            json={
                'to': token,
                'title': title,
                'body': body,
                'data': {k: str(v) for k, v in (data or {}).items()},
                'sound': 'default',
                'priority': 'high',
            },
            headers={
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            timeout=10,
        )
        response.raise_for_status()
        result = response.json()
        # Expo returns { data: { status: 'error', message: '...' } } on failure
        ticket = result.get('data', {})
        if isinstance(ticket, dict) and ticket.get('status') == 'error':
            raise ValueError(f"Expo push error: {ticket.get('message')}")
        return result

    def _send_push(self, assignment, agency, alert_data):
        """
        Send push notification to the agency device.
        Routes to Expo Push API or Firebase Admin SDK based on token format.
        """
        try:
            if not agency.fcm_token:
                raise ValueError("No FCM token registered for this agency")

            title = f"EMERGENCY: {alert_data['alert_type']}"
            body = f"Priority: {alert_data['priority']}. Location: {alert_data['address']}"

            if agency.fcm_token.startswith('ExponentPushToken'):
                # Agency app built with Expo — use Expo Push API
                self._send_expo_push(
                    token=agency.fcm_token,
                    title=title,
                    body=body,
                    data=alert_data,
                )
                response_info = 'sent via Expo Push API'
            else:
                # Native FCM token — use Firebase Admin SDK
                from firebase_admin import messaging
                message = messaging.Message(
                    notification=messaging.Notification(title=title, body=body),
                    data={k: str(v) for k, v in alert_data.items()},
                    token=agency.fcm_token,
                )
                response_info = messaging.send(message)

            NotificationLog.objects.create(
                assignment=assignment,
                channel_type='PUSH',
                recipient=agency.fcm_token[:50],
                delivery_status='SENT',
            )
            logger.info(f"Push sent to {agency.agency_name}: {response_info}")

        except Exception as e:
            NotificationLog.objects.create(
                assignment=assignment,
                channel_type='PUSH',
                recipient=agency.fcm_token[:50] if agency.fcm_token else 'NO_TOKEN',
                delivery_status='FAILED',
                error_message=str(e),
            )
            logger.error(f"Push failed for {agency.agency_name}: {e}")

    # ------------------------------------------------------------------
    # SMS / Email
    # ------------------------------------------------------------------

    def _send_sms(self, assignment, agency, alert_data):
        """Send SMS to agency contact phone."""
        try:
            from twilio.rest import Client
            from decouple import config

            client = Client(config('TWILIO_ACCOUNT_SID'), config('TWILIO_AUTH_TOKEN'))
            message_body = (
                f"EMERGENCY ALERT [{alert_data['alert_type']}]\n"
                f"Priority: {alert_data['priority']}\n"
                f"Location: {alert_data['address']}\n"
                f"Coordinates: {alert_data['latitude']}, {alert_data['longitude']}\n"
                f"Reporter: {alert_data['user_name']} ({alert_data['user_phone']})\n"
                f"Map: {alert_data['maps_url']}\n"
                f"Alert ID: {alert_data['alert_id']}"
            )
            sms = client.messages.create(
                body=message_body,
                from_=config('TWILIO_PHONE_NUMBER'),
                to=agency.contact_phone,
            )
            NotificationLog.objects.create(
                assignment=assignment,
                channel_type='SMS',
                recipient=agency.contact_phone,
                delivery_status='SENT',
            )
            logger.info(f"SMS sent to {agency.agency_name}: {sms.sid}")

        except Exception as e:
            NotificationLog.objects.create(
                assignment=assignment,
                channel_type='SMS',
                recipient=agency.contact_phone,
                delivery_status='FAILED',
                error_message=str(e),
            )
            logger.error(f"SMS failed for {agency.agency_name}: {e}")

    def _send_email(self, assignment, agency, alert_data):
        """Send email alert to agency."""
        try:
            from django.core.mail import send_mail
            from decouple import config

            subject = f"EMERGENCY ALERT: {alert_data['alert_type']} - Priority {alert_data['priority']}"
            body = (
                f"EMERGENCY ALERT\n"
                f"{'=' * 50}\n\n"
                f"Type: {alert_data['alert_type']}\n"
                f"Priority: {alert_data['priority']}\n"
                f"Time: {alert_data['timestamp']}\n\n"
                f"LOCATION\n"
                f"Address: {alert_data['address']}\n"
                f"Coordinates: {alert_data['latitude']}, {alert_data['longitude']}\n"
                f"Google Maps: {alert_data['maps_url']}\n\n"
                f"REPORTER\n"
                f"Name: {alert_data['user_name']}\n"
                f"Phone: {alert_data['user_phone']}\n\n"
                f"DESCRIPTION\n"
                f"{alert_data['description']}\n\n"
                f"Alert ID: {alert_data['alert_id']}\n"
                f"Please acknowledge this alert through the system."
            )
            send_mail(
                subject=subject,
                message=body,
                from_email=config('DEFAULT_FROM_EMAIL'),
                recipient_list=[agency.contact_email],
                fail_silently=False,
            )
            NotificationLog.objects.create(
                assignment=assignment,
                channel_type='EMAIL',
                recipient=agency.contact_email,
                delivery_status='SENT',
            )
            logger.info(f"Email sent to {agency.agency_name}")

        except Exception as e:
            NotificationLog.objects.create(
                assignment=assignment,
                channel_type='EMAIL',
                recipient=agency.contact_email,
                delivery_status='FAILED',
                error_message=str(e),
            )
            logger.error(f"Email failed for {agency.agency_name}: {e}")

    def _update_assignment_status(self, assignment):
        """Update assignment notification_status based on channel results."""
        logs = assignment.notifications.all()
        if logs.filter(delivery_status='SENT').exists():
            assignment.notification_status = 'SENT'
        elif logs.filter(delivery_status='FAILED').count() == logs.count():
            assignment.notification_status = 'FAILED'
        assignment.save(update_fields=['notification_status'])
