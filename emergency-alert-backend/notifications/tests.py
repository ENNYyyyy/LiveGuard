from unittest.mock import patch, MagicMock
from django.test import TestCase

from accounts.models import User
from agencies.models import SecurityAgency, AgencyUser
from alerts.models import EmergencyAlert, Location, AlertAssignment
from notifications.models import NotificationLog
from notifications.services import NotificationDispatcher


def create_user(email='user@test.com', phone='+2348011111111'):
    return User.objects.create_user(
        email=email, password='testpass123',
        phone_number=phone, full_name='Test User',
    )


def create_agency(name='Police', agency_type='POLICE', email='p@test.com',
                  phone='+2348012345678', fcm_token='test-fcm-token'):
    return SecurityAgency.objects.create(
        agency_name=name, agency_type=agency_type,
        contact_email=email, contact_phone=phone,
        jurisdiction='Nationwide', address='Abuja',
        is_active=True, fcm_token=fcm_token,
    )


def make_assignment(user=None, agency=None):
    if user is None:
        user = create_user()
    if agency is None:
        agency = create_agency()
    alert = EmergencyAlert.objects.create(
        user=user, alert_type='ARMED_ROBBERY', priority_level='HIGH', status='DISPATCHED',
    )
    Location.objects.create(alert=alert, latitude='6.5244', longitude='3.3792', address='Lagos')
    return AlertAssignment.objects.create(alert=alert, agency=agency)


class NotificationLogOnDispatchTests(TestCase):

    @patch('notifications.services.NotificationDispatcher._send_sms')
    @patch('notifications.services.NotificationDispatcher._send_email')
    @patch('firebase_admin.messaging.send', return_value='projects/test/messages/123')
    def test_notification_log_created_on_dispatch(self, mock_fcm, mock_email, mock_sms):
        assignment = make_assignment()
        dispatcher = NotificationDispatcher()
        dispatcher.dispatch_alert(assignment)

        logs = NotificationLog.objects.filter(assignment=assignment)
        self.assertTrue(logs.exists())

    @patch('notifications.services.NotificationDispatcher._send_sms')
    @patch('notifications.services.NotificationDispatcher._send_email')
    @patch('firebase_admin.messaging.send', return_value='projects/test/messages/123')
    def test_all_three_channels_attempted(self, mock_fcm, mock_email, mock_sms):
        assignment = make_assignment()
        dispatcher = NotificationDispatcher()
        dispatcher.dispatch_alert(assignment)

        mock_sms.assert_called_once()
        mock_email.assert_called_once()
        # Push log created via the real _send_push (FCM send is mocked)
        push_log = NotificationLog.objects.filter(
            assignment=assignment, channel_type='PUSH'
        )
        self.assertTrue(push_log.exists())

    def test_failed_log_when_no_fcm_token(self):
        agency = create_agency(fcm_token='')
        assignment = make_assignment(agency=agency)

        with patch('notifications.services.NotificationDispatcher._send_sms'), \
             patch('notifications.services.NotificationDispatcher._send_email'):
            dispatcher = NotificationDispatcher()
            dispatcher.dispatch_alert(assignment)

        failed_push = NotificationLog.objects.filter(
            assignment=assignment,
            channel_type='PUSH',
            delivery_status='FAILED',
        )
        self.assertTrue(failed_push.exists())
        self.assertIn('No FCM token', failed_push.first().error_message)

    def test_assignment_status_set_to_sent_when_any_channel_succeeds(self):
        assignment = make_assignment()

        with patch('notifications.services.NotificationDispatcher._send_push'), \
             patch('notifications.services.NotificationDispatcher._send_sms'), \
             patch('notifications.services.NotificationDispatcher._send_email'):
            # Simulate push creating a SENT log
            NotificationLog.objects.create(
                assignment=assignment,
                channel_type='PUSH',
                recipient='test',
                delivery_status='SENT',
            )
            dispatcher = NotificationDispatcher()
            dispatcher._update_assignment_status(assignment)

        assignment.refresh_from_db()
        self.assertEqual(assignment.notification_status, 'SENT')


# ─── Retry setting fallback ───────────────────────────────────────────────────

class RetrySettingFallbackTests(TestCase):
    """
    Unit tests for notifications.services._get_max_retries().
    Verify the function never crashes and always returns a usable integer:
      - When DB row is missing, returns _DEFAULT_MAX_RETRIES.
      - When DB row is present, returns the stored integer.
      - When DB value is invalid (non-integer), falls back to default.
      - When DB value is negative, returns 0 (clipped by max(0, value)).
    """

    def test_fallback_when_db_setting_missing(self):
        """No DB row → returns _DEFAULT_MAX_RETRIES (2)."""
        from notifications.services import _get_max_retries, _DEFAULT_MAX_RETRIES
        from admin_panel.models import SystemSetting

        SystemSetting.objects.filter(key='max_notification_retries').delete()
        result = _get_max_retries()
        self.assertEqual(result, _DEFAULT_MAX_RETRIES)

    def test_valid_db_setting_is_used(self):
        """DB row with valid integer → that value is returned."""
        from notifications.services import _get_max_retries
        from admin_panel.models import SystemSetting

        SystemSetting.objects.update_or_create(
            key='max_notification_retries',
            defaults={'value': '5', 'description': 'test'},
        )
        self.assertEqual(_get_max_retries(), 5)

    def test_invalid_db_value_falls_back(self):
        """Non-integer DB value → warning log + returns _DEFAULT_MAX_RETRIES."""
        from notifications.services import _get_max_retries, _DEFAULT_MAX_RETRIES
        from admin_panel.models import SystemSetting
        import logging

        SystemSetting.objects.update_or_create(
            key='max_notification_retries',
            defaults={'value': 'invalid', 'description': 'test'},
        )
        with self.assertLogs('notifications.services', level=logging.WARNING):
            result = _get_max_retries()
        self.assertEqual(result, _DEFAULT_MAX_RETRIES)

    def test_negative_db_value_returns_zero(self):
        """Negative integer is clipped to 0 by max(0, value) — no crash."""
        from notifications.services import _get_max_retries
        from admin_panel.models import SystemSetting

        SystemSetting.objects.update_or_create(
            key='max_notification_retries',
            defaults={'value': '-3', 'description': 'test'},
        )
        result = _get_max_retries()
        self.assertEqual(result, 0)

    def test_zero_db_value_returns_zero(self):
        """Zero retries is valid — means send once, no retries."""
        from notifications.services import _get_max_retries
        from admin_panel.models import SystemSetting

        SystemSetting.objects.update_or_create(
            key='max_notification_retries',
            defaults={'value': '0', 'description': 'test'},
        )
        self.assertEqual(_get_max_retries(), 0)
