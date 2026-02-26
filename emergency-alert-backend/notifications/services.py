import logging
from threading import Thread

import requests as http_requests
from django.db import close_old_connections

from .models import NotificationLog

logger = logging.getLogger(__name__)

# Hard-coded fallback used when the DB setting cannot be read.
_DEFAULT_MAX_RETRIES = 2


def _get_max_retries():
    """
    Read max_notification_retries from SystemSetting (DB).
    Returns _DEFAULT_MAX_RETRIES on any error so notifications always fire.
    """
    try:
        from admin_panel.models import SystemSetting
        setting = SystemSetting.objects.get(key='max_notification_retries')
        value = int(setting.value.strip())
        return max(0, value)
    except Exception as exc:
        logger.warning(
            f'_get_max_retries: could not read DB setting ({exc}); '
            f'using default={_DEFAULT_MAX_RETRIES}.'
        )
        return _DEFAULT_MAX_RETRIES


def dispatch_alert_assignments(alert_id):
    """
    Background worker that dispatches all assignments for one alert.
    Runs in a daemon thread so /api/alerts/create/ can return immediately.
    """
    close_old_connections()
    logger.info(f"Async dispatch worker started for alert_id={alert_id}")

    try:
        from alerts.models import AlertAssignment

        assignments = (
            AlertAssignment.objects
            .filter(alert_id=alert_id)
            .select_related('alert__user', 'alert__location', 'agency')
            .order_by('assignment_priority', 'assignment_id')
        )

        dispatcher = NotificationDispatcher()
        total = 0
        failed = 0

        for assignment in assignments:
            total += 1
            try:
                dispatcher.dispatch_alert(assignment)
            except Exception:
                failed += 1
                logger.exception(
                    f"Async dispatch failed for alert_id={alert_id}, "
                    f"assignment_id={assignment.assignment_id}"
                )

        logger.info(
            f"Async dispatch worker completed for alert_id={alert_id}: "
            f"assignments={total}, failed={failed}"
        )
    except Exception:
        logger.exception(f"Async dispatch worker crashed for alert_id={alert_id}")
    finally:
        close_old_connections()


def enqueue_alert_dispatch(alert_id):
    """
    Enqueue dispatch for all assignments of an alert in a daemon thread.
    Safe to call inside transaction.on_commit().
    """
    logger.info(f"Queueing async dispatch for alert_id={alert_id}")
    thread = Thread(
        target=dispatch_alert_assignments,
        args=(alert_id,),
        daemon=True,
        name=f"alert-dispatch-{alert_id}",
    )
    thread.start()
    return thread


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

    # ------------------------------------------------------------------
    # Retry helper
    # ------------------------------------------------------------------

    def _send_with_retry(self, send_fn, assignment, channel_type, recipient):
        """
        Call send_fn() up to (_get_max_retries() + 1) times.
        The retry ceiling is read from SystemSetting DB on each dispatch call;
        falls back to _DEFAULT_MAX_RETRIES when the DB is unavailable.
        Persists one NotificationLog row per attempt with the correct retry_count.
        Returns True if any attempt succeeded; never raises an exception to the caller.
        One channel's failure does not affect sibling channels.
        """
        max_retries = _get_max_retries()
        for attempt in range(max_retries + 1):
            try:
                send_fn()
                NotificationLog.objects.create(
                    assignment=assignment,
                    channel_type=channel_type,
                    recipient=recipient,
                    delivery_status='SENT',
                    retry_count=attempt,
                )
                logger.info(
                    f"{channel_type} delivered (attempt {attempt + 1}) to {recipient}"
                )
                return True
            except Exception as e:
                NotificationLog.objects.create(
                    assignment=assignment,
                    channel_type=channel_type,
                    recipient=recipient,
                    delivery_status='FAILED',
                    error_message=str(e),
                    retry_count=attempt,
                )
                if attempt < max_retries:
                    logger.warning(
                        f"{channel_type} attempt {attempt + 1} failed for {recipient}, "
                        f"retrying: {e}"
                    )
                else:
                    logger.error(
                        f"{channel_type} all {max_retries + 1} attempts failed "
                        f"for {recipient}: {e}"
                    )
        return False

    # ------------------------------------------------------------------
    # Push / SMS / Email — each uses _send_with_retry
    # ------------------------------------------------------------------

    def _send_push(self, assignment, agency, alert_data):
        """
        Send push notification to the agency device.
        Routes to Expo Push API or Firebase Admin SDK based on token format.
        """
        if not agency.fcm_token:
            NotificationLog.objects.create(
                assignment=assignment,
                channel_type='PUSH',
                recipient='NO_TOKEN',
                delivery_status='FAILED',
                error_message='No FCM token registered for this agency.',
                retry_count=0,
            )
            logger.error(f"Push skipped for {agency.agency_name}: no token")
            return

        title = f"EMERGENCY: {alert_data['alert_type']}"
        body = f"Priority: {alert_data['priority']}. Location: {alert_data['address']}"

        def _do_push():
            if agency.fcm_token.startswith('ExponentPushToken'):
                self._send_expo_push(
                    token=agency.fcm_token, title=title, body=body, data=alert_data
                )
            else:
                from firebase_admin import messaging
                msg = messaging.Message(
                    notification=messaging.Notification(title=title, body=body),
                    data={k: str(v) for k, v in alert_data.items()},
                    token=agency.fcm_token,
                )
                messaging.send(msg)

        self._send_with_retry(_do_push, assignment, 'PUSH', agency.fcm_token[:50])

    # ------------------------------------------------------------------
    # SMS / Email
    # ------------------------------------------------------------------

    def _send_sms(self, assignment, agency, alert_data):
        """Send SMS to agency contact phone (with retry)."""
        message_body = (
            f"EMERGENCY ALERT [{alert_data['alert_type']}]\n"
            f"Priority: {alert_data['priority']}\n"
            f"Location: {alert_data['address']}\n"
            f"Coordinates: {alert_data['latitude']}, {alert_data['longitude']}\n"
            f"Reporter: {alert_data['user_name']} ({alert_data['user_phone']})\n"
            f"Map: {alert_data['maps_url']}\n"
            f"Alert ID: {alert_data['alert_id']}"
        )

        def _do_sms():
            from twilio.rest import Client
            from decouple import config
            client = Client(config('TWILIO_ACCOUNT_SID'), config('TWILIO_AUTH_TOKEN'))
            client.messages.create(
                body=message_body,
                from_=config('TWILIO_PHONE_NUMBER'),
                to=agency.contact_phone,
            )

        self._send_with_retry(_do_sms, assignment, 'SMS', agency.contact_phone)

    def _send_email(self, assignment, agency, alert_data):
        """Send email alert to agency (with retry)."""
        subject = (
            f"EMERGENCY ALERT: {alert_data['alert_type']} - Priority {alert_data['priority']}"
        )
        email_body = (
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

        def _do_email():
            from django.core.mail import send_mail
            from decouple import config
            send_mail(
                subject=subject,
                message=email_body,
                from_email=config('DEFAULT_FROM_EMAIL'),
                recipient_list=[agency.contact_email],
                fail_silently=False,
            )

        self._send_with_retry(_do_email, assignment, 'EMAIL', agency.contact_email)

    def _update_assignment_status(self, assignment):
        """Update assignment notification_status based on channel results."""
        logs = assignment.notifications.all()
        if logs.filter(delivery_status='SENT').exists():
            assignment.notification_status = 'SENT'
        elif logs.filter(delivery_status='FAILED').count() == logs.count():
            assignment.notification_status = 'FAILED'
        assignment.save(update_fields=['notification_status'])
