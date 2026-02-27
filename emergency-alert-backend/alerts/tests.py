from unittest.mock import patch
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from agencies.models import SecurityAgency, AgencyUser
from alerts.models import EmergencyAlert, Location, AlertAssignment


def create_user(email='user@test.com', password='testpass123', phone='+2348011111111'):
    return User.objects.create_user(
        email=email, password=password,
        phone_number=phone, full_name='Test User',
    )


def auth_header(user):
    return {'HTTP_AUTHORIZATION': f'Bearer {RefreshToken.for_user(user).access_token}'}


def create_agency(name='Police HQ', agency_type='POLICE', email='police@test.com', phone='+2348012345678'):
    return SecurityAgency.objects.create(
        agency_name=name,
        agency_type=agency_type,
        contact_email=email,
        contact_phone=phone,
        jurisdiction='Nationwide',
        address='Abuja HQ',
        is_active=True,
    )


ALERT_PAYLOAD = {
    'alert_type': 'ARMED_ROBBERY',
    'priority_level': 'HIGH',
    'description': 'Robbery in progress',
    'latitude': '6.5244',
    'longitude': '3.3792',
    'accuracy': 10.0,
}


class CreateAlertTests(APITestCase):
    url = reverse('alert-create')

    def setUp(self):
        self.user = create_user()
        self.police = create_agency('Police Force', 'POLICE', 'p@test.com', '+2348012345678')

    @patch('alerts.views.NotificationDispatcher.dispatch_alert')
    def test_create_alert_success(self, mock_dispatch):
        response = self.client.post(self.url, ALERT_PAYLOAD, **auth_header(self.user))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['alert_type'], 'ARMED_ROBBERY')
        self.assertEqual(response.data['status'], 'DISPATCHED')

    @patch('alerts.views.NotificationDispatcher.dispatch_alert')
    def test_create_alert_assigns_correct_agencies(self, mock_dispatch):
        military = create_agency('Army', 'MILITARY', 'army@test.com', '+2348023456789')
        sec_force = create_agency('NSCDC', 'SECURITY_FORCE', 'nscdc@test.com', '+2348034567890')

        payload = {**ALERT_PAYLOAD, 'alert_type': 'TERRORISM'}
        response = self.client.post(self.url, payload, **auth_header(self.user))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        alert = EmergencyAlert.objects.get(alert_id=response.data['alert_id'])
        assigned_types = set(
            AlertAssignment.objects.filter(alert=alert)
            .values_list('agency__agency_type', flat=True)
        )
        self.assertIn('MILITARY', assigned_types)
        self.assertIn('POLICE', assigned_types)
        self.assertIn('SECURITY_FORCE', assigned_types)

    @patch('alerts.views.NotificationDispatcher.dispatch_alert')
    def test_create_alert_creates_location(self, mock_dispatch):
        response = self.client.post(self.url, ALERT_PAYLOAD, **auth_header(self.user))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        alert = EmergencyAlert.objects.get(alert_id=response.data['alert_id'])
        self.assertTrue(hasattr(alert, 'location'))
        self.assertAlmostEqual(float(alert.location.latitude), 6.5244, places=3)
        self.assertAlmostEqual(float(alert.location.longitude), 3.3792, places=3)

    def test_create_alert_unauthenticated(self):
        response = self.client.post(self.url, ALERT_PAYLOAD)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch('alerts.views.NotificationDispatcher.dispatch_alert')
    def test_create_alert_invalid_latitude(self, mock_dispatch):
        payload = {**ALERT_PAYLOAD, 'latitude': '999'}
        response = self.client.post(self.url, payload, **auth_header(self.user))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('latitude', response.data)

    @patch('alerts.views.NotificationDispatcher.dispatch_alert')
    def test_create_alert_invalid_longitude(self, mock_dispatch):
        payload = {**ALERT_PAYLOAD, 'longitude': '-999'}
        response = self.client.post(self.url, payload, **auth_header(self.user))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('longitude', response.data)


class AlertStatusViewTests(APITestCase):
    def setUp(self):
        self.user = create_user()
        self.other_user = create_user(email='other@test.com', phone='+2348022222222')
        self.alert = EmergencyAlert.objects.create(
            user=self.user,
            alert_type='BANDITRY',
            priority_level='HIGH',
            status='PENDING',
        )
        Location.objects.create(
            alert=self.alert, latitude='6.5', longitude='3.3'
        )

    def test_alert_status_view(self):
        url = reverse('alert-status', args=[self.alert.alert_id])
        response = self.client.get(url, **auth_header(self.user))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['alert_id'], self.alert.alert_id)

    def test_alert_status_forbidden_for_other_user(self):
        url = reverse('alert-status', args=[self.alert.alert_id])
        response = self.client.get(url, **auth_header(self.other_user))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class AlertHistoryTests(APITestCase):
    url = reverse('alert-history')

    def setUp(self):
        self.user = create_user()
        self.other_user = create_user(email='other@test.com', phone='+2348022222222')

        EmergencyAlert.objects.create(
            user=self.user, alert_type='BANDITRY', priority_level='HIGH', status='PENDING'
        )
        EmergencyAlert.objects.create(
            user=self.user, alert_type='OTHER', priority_level='LOW', status='RESOLVED'
        )
        EmergencyAlert.objects.create(
            user=self.other_user, alert_type='KIDNAPPING', priority_level='CRITICAL', status='PENDING'
        )

    def test_alert_history_returns_only_user_alerts(self):
        response = self.client.get(self.url, **auth_header(self.user))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        emails = {a['alert_type'] for a in response.data}
        self.assertNotIn('KIDNAPPING', emails)


class CancelAlertTests(APITestCase):
    def setUp(self):
        self.user = create_user()

    def _make_alert(self, status_val):
        return EmergencyAlert.objects.create(
            user=self.user,
            alert_type='OTHER',
            priority_level='LOW',
            status=status_val,
        )

    def test_cancel_alert_while_pending(self):
        alert = self._make_alert('PENDING')
        url = reverse('alert-cancel', args=[alert.alert_id])
        response = self.client.put(url, **auth_header(self.user))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        alert.refresh_from_db()
        self.assertEqual(alert.status, 'CANCELLED')

    def test_cancel_alert_while_dispatched(self):
        alert = self._make_alert('DISPATCHED')
        url = reverse('alert-cancel', args=[alert.alert_id])
        response = self.client.put(url, **auth_header(self.user))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        alert.refresh_from_db()
        self.assertEqual(alert.status, 'CANCELLED')

    def test_cannot_cancel_resolved_alert(self):
        alert = self._make_alert('RESOLVED')
        url = reverse('alert-cancel', args=[alert.alert_id])
        response = self.client.put(url, **auth_header(self.user))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        alert.refresh_from_db()
        self.assertEqual(alert.status, 'RESOLVED')


class UpdateAlertLocationTests(APITestCase):
    def setUp(self):
        self.user = create_user()
        self.other_user = create_user(email='other@test.com', phone='+2348099000000')
        self.alert = EmergencyAlert.objects.create(
            user=self.user, alert_type='BANDITRY',
            priority_level='HIGH', status='DISPATCHED',
        )
        Location.objects.create(alert=self.alert, latitude='6.5244', longitude='3.3792')

    def url(self):
        return reverse('alert-update-location', args=[self.alert.alert_id])

    def test_update_location_success(self):
        response = self.client.patch(
            self.url(), {'latitude': '6.6000', 'longitude': '3.4000'}, **auth_header(self.user)
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('latitude', response.data)
        self.assertIn('longitude', response.data)
        self.assertIn('maps_url', response.data)
        self.assertIn('maps.google.com', response.data['maps_url'])

        self.alert.location.refresh_from_db()
        self.assertAlmostEqual(float(self.alert.location.latitude), 6.6000, places=3)
        self.assertAlmostEqual(float(self.alert.location.longitude), 3.4000, places=3)

    def test_update_location_with_accuracy(self):
        response = self.client.patch(
            self.url(),
            {'latitude': '6.5500', 'longitude': '3.3900', 'accuracy': 8.5},
            **auth_header(self.user),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.alert.location.refresh_from_db()
        self.assertEqual(float(self.alert.location.accuracy), 8.5)

    def test_non_owner_gets_404(self):
        response = self.client.patch(
            self.url(), {'latitude': '6.5', 'longitude': '3.3'}, **auth_header(self.other_user)
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated_returns_401(self):
        response = self.client.patch(self.url(), {'latitude': '6.5', 'longitude': '3.3'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_terminal_alert_returns_400(self):
        self.alert.status = 'RESOLVED'
        self.alert.save(update_fields=['status'])
        response = self.client.patch(
            self.url(), {'latitude': '6.5', 'longitude': '3.3'}, **auth_header(self.user)
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_latitude_returns_400(self):
        response = self.client.patch(
            self.url(), {'latitude': '999', 'longitude': '3.3'}, **auth_header(self.user)
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_longitude_returns_400(self):
        response = self.client.patch(
            self.url(), {'latitude': '6.5', 'longitude': '-999'}, **auth_header(self.user)
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_coordinates_returns_400(self):
        response = self.client.patch(self.url(), {}, **auth_header(self.user))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ─── Throttle fallback ────────────────────────────────────────────────────────

class AlertCreationThrottleFallbackTests(APITestCase):
    """
    Unit tests for AlertCreationThrottle.get_rate().
    Verify that the throttle is never silently disabled:
      - When DB row is missing, falls back to settings.py value (a valid non-empty string).
      - When DB row is present, the DB value is preferred.
      - When DB value is invalid (non-integer), falls back gracefully.
    """

    def test_fallback_when_db_setting_missing(self):
        """No DB row → super().get_rate() returns the settings.py rate (not None/empty)."""
        from alerts.throttles import AlertCreationThrottle
        from admin_panel.models import SystemSetting

        SystemSetting.objects.filter(key='alert_creation_rate_limit').delete()
        throttle = AlertCreationThrottle()
        rate = throttle.get_rate()
        # Must be a non-empty string in "N/period" format — throttle never disabled.
        self.assertIsNotNone(rate)
        self.assertIn('/', rate)
        parts = rate.split('/')
        self.assertTrue(int(parts[0]) > 0)

    def test_db_rate_overrides_settings(self):
        """When DB row exists, its value takes precedence over settings.py."""
        from alerts.throttles import AlertCreationThrottle
        from admin_panel.models import SystemSetting

        SystemSetting.objects.update_or_create(
            key='alert_creation_rate_limit',
            defaults={'value': '42', 'description': 'test'},
        )
        throttle = AlertCreationThrottle()
        rate = throttle.get_rate()
        self.assertEqual(rate, '42/hour')

    def test_invalid_db_value_falls_back(self):
        """Non-integer DB value triggers warning log and falls back to settings."""
        from alerts.throttles import AlertCreationThrottle
        from admin_panel.models import SystemSetting
        import logging

        SystemSetting.objects.update_or_create(
            key='alert_creation_rate_limit',
            defaults={'value': 'not-a-number', 'description': 'test'},
        )
        throttle = AlertCreationThrottle()
        with self.assertLogs('alerts.throttles', level=logging.WARNING):
            rate = throttle.get_rate()
        # Fallback must still be a valid rate string.
        self.assertIsNotNone(rate)
        self.assertIn('/', rate)

    def test_zero_db_value_falls_back(self):
        """Zero or negative DB value is rejected and falls back to settings."""
        from alerts.throttles import AlertCreationThrottle
        from admin_panel.models import SystemSetting
        import logging

        SystemSetting.objects.update_or_create(
            key='alert_creation_rate_limit',
            defaults={'value': '0', 'description': 'test'},
        )
        throttle = AlertCreationThrottle()
        with self.assertLogs('alerts.throttles', level=logging.WARNING):
            rate = throttle.get_rate()
        self.assertIsNotNone(rate)
        self.assertIn('/', rate)
