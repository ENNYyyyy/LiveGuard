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
    'description': 'Robbery in progress',
    'risk_answers': {
        'robbery_in_progress': True,
        'suspects_armed': False,
        'shots_fired': False,
        'locations_affected': 'ONE',
        'injury_severity': 'NONE',
    },
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
        response = self.client.post(self.url, ALERT_PAYLOAD, format='json', **auth_header(self.user))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['alert_type'], 'ARMED_ROBBERY')
        self.assertEqual(response.data['status'], 'DISPATCHED')
        self.assertEqual(response.data['priority_level'], 'MEDIUM')

    @patch('alerts.views.NotificationDispatcher.dispatch_alert')
    def test_create_alert_ignores_client_priority_tampering(self, mock_dispatch):
        payload = {
            **ALERT_PAYLOAD,
            'priority_level': 'LOW',  # ignored by backend
            'risk_answers': {
                'active_attack': True,
                'explosives_or_bombs': True,
                'hostages': True,
                'people_at_risk': 'HUNDRED_ONE_TO_THOUSAND',
                'injury_severity': 'CRITICAL_OR_FATAL',
            },
            'alert_type': 'TERRORISM',
        }
        response = self.client.post(self.url, payload, format='json', **auth_header(self.user))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['priority_level'], 'CRITICAL')

        alert = EmergencyAlert.objects.get(alert_id=response.data['alert_id'])
        self.assertEqual(alert.priority_level, 'CRITICAL')

    @patch('alerts.views.NotificationDispatcher.dispatch_alert')
    def test_create_alert_assigns_correct_agencies(self, mock_dispatch):
        military = create_agency('Army', 'MILITARY', 'army@test.com', '+2348023456789')
        sec_force = create_agency('NSCDC', 'SECURITY_FORCE', 'nscdc@test.com', '+2348034567890')

        payload = {
            **ALERT_PAYLOAD,
            'alert_type': 'TERRORISM',
            'risk_answers': {
                'active_attack': True,
                'explosives_or_bombs': False,
                'hostages': False,
                'people_at_risk': 'FIVE_OR_FEWER',
                'injury_severity': 'NONE',
            },
        }
        response = self.client.post(self.url, payload, format='json', **auth_header(self.user))
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
        response = self.client.post(self.url, ALERT_PAYLOAD, format='json', **auth_header(self.user))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        alert = EmergencyAlert.objects.get(alert_id=response.data['alert_id'])
        self.assertTrue(hasattr(alert, 'location'))
        self.assertAlmostEqual(float(alert.location.latitude), 6.5244, places=3)
        self.assertAlmostEqual(float(alert.location.longitude), 3.3792, places=3)

    def test_create_alert_unauthenticated(self):
        response = self.client.post(self.url, ALERT_PAYLOAD, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch('alerts.views.NotificationDispatcher.dispatch_alert')
    def test_create_alert_invalid_latitude(self, mock_dispatch):
        payload = {**ALERT_PAYLOAD, 'latitude': '999'}
        response = self.client.post(self.url, payload, format='json', **auth_header(self.user))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('latitude', response.data)

    @patch('alerts.views.NotificationDispatcher.dispatch_alert')
    def test_create_alert_missing_required_risk_answers(self, mock_dispatch):
        payload = {
            **ALERT_PAYLOAD,
            'risk_answers': {
                'robbery_in_progress': True,
            },
        }
        response = self.client.post(self.url, payload, format='json', **auth_header(self.user))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('risk_answers', response.data)
        self.assertIn('locations_affected', response.data['risk_answers'])

    @patch('alerts.views.NotificationDispatcher.dispatch_alert')
    def test_create_alert_invalid_longitude(self, mock_dispatch):
        payload = {**ALERT_PAYLOAD, 'longitude': '-999'}
        response = self.client.post(self.url, payload, format='json', **auth_header(self.user))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('longitude', response.data)


class PriorityQuestionsTests(APITestCase):
    url = reverse('alert-priority-questions')

    def setUp(self):
        self.user = create_user()

    def test_requires_alert_type_query_param(self):
        response = self.client.get(self.url, **auth_header(self.user))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.data)

    def test_returns_questions_for_alert_type(self):
        response = self.client.get(
            self.url,
            {'alert_type': 'FIRE_INCIDENCE'},
            **auth_header(self.user),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['alert_type'], 'FIRE_INCIDENCE')
        self.assertIn('version', response.data)
        self.assertGreater(len(response.data['questions']), 0)
        first_question = response.data['questions'][0]
        self.assertIn('id', first_question)
        self.assertIn('type', first_question)
        self.assertIn('label', first_question)
        self.assertIn('required', first_question)
        self.assertIn('weight', first_question)

    def test_rejects_unknown_alert_type(self):
        response = self.client.get(
            self.url,
            {'alert_type': 'ALIEN_INVASION'},
            **auth_header(self.user),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.data)


class PriorityEngineTests(APITestCase):
    """Unit-level tests for the priority engine via the questions and create endpoints."""

    def setUp(self):
        self.user = create_user()

    def test_all_alert_types_return_questions(self):
        """Every supported alert type must return at least one question."""
        alert_types = [
            'FIRE_INCIDENCE', 'TERRORISM', 'BANDITRY', 'KIDNAPPING',
            'ARMED_ROBBERY', 'ROBBERY', 'ACCIDENT', 'OTHER',
        ]
        url = reverse('alert-priority-questions')
        for alert_type in alert_types:
            response = self.client.get(url, {'alert_type': alert_type}, **auth_header(self.user))
            self.assertEqual(response.status_code, status.HTTP_200_OK, f'Failed for {alert_type}')
            self.assertGreater(
                len(response.data['questions']), 0,
                f'No questions returned for {alert_type}',
            )

    @patch('alerts.views.NotificationDispatcher.dispatch_alert')
    def test_critical_override_from_boolean_flag(self, mock_dispatch):
        """
        people_trapped=True is a critical_if_true override for FIRE_INCIDENCE.
        Even if the base+other scores would produce HIGH, the result must be CRITICAL.
        """
        payload = {
            'alert_type': 'FIRE_INCIDENCE',
            'latitude': '6.5244',
            'longitude': '3.3792',
            'risk_answers': {
                'buildings_affected': 'ONE',    # score 8 — not critical
                'people_trapped': True,        # critical_if_true=True → override
                'spread_rate': 'CONTAINED',    # score 5
                'hazardous_materials': False,
                'injury_severity': 'NONE',     # score 0
            },
        }
        response = self.client.post(
            reverse('alert-create'), payload, format='json', **auth_header(self.user),
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['priority_level'], 'CRITICAL')

    @patch('alerts.views.NotificationDispatcher.dispatch_alert')
    def test_invalid_enum_risk_answer_returns_400(self, mock_dispatch):
        """Submitting an unrecognised enum value for a single_select question → 400."""
        payload = {
            'alert_type': 'FIRE_INCIDENCE',
            'latitude': '6.5244',
            'longitude': '3.3792',
            'risk_answers': {
                'buildings_affected': 'ONE',
                'people_trapped': False,
                'spread_rate': 'SUPERSONIC',   # invalid option
                'hazardous_materials': False,
                'injury_severity': 'NONE',
            },
        }
        response = self.client.post(
            reverse('alert-create'), payload, format='json', **auth_header(self.user),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('risk_answers', response.data)
        self.assertIn('spread_rate', response.data['risk_answers'])

    @patch('alerts.views.NotificationDispatcher.dispatch_alert')
    def test_out_of_range_integer_risk_answer_returns_400(self, mock_dispatch):
        """Invalid single_select option value for buildings_affected → 400."""
        payload = {
            'alert_type': 'FIRE_INCIDENCE',
            'latitude': '6.5244',
            'longitude': '3.3792',
            'risk_answers': {
                'buildings_affected': 'ONE_MILLION',  # not a valid option
                'people_trapped': False,
                'spread_rate': 'CONTAINED',
                'hazardous_materials': False,
                'injury_severity': 'NONE',
            },
        }
        response = self.client.post(
            reverse('alert-create'), payload, format='json', **auth_header(self.user),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('risk_answers', response.data)
        self.assertIn('buildings_affected', response.data['risk_answers'])


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
        self.agency = create_agency(
            name='Cancel Police',
            agency_type='POLICE',
            email='cancel_police@test.com',
            phone='+2348010001234',
        )

    def _make_alert(self, status_val, with_assignment=True):
        alert = EmergencyAlert.objects.create(
            user=self.user,
            alert_type='OTHER',
            priority_level='LOW',
            status=status_val,
        )
        if with_assignment:
            AlertAssignment.objects.create(alert=alert, agency=self.agency)
        return alert

    @patch('alerts.views.NotificationDispatcher.send_cancellation_notice')
    def test_cancel_alert_while_pending(self, mock_send_cancellation_notice):
        alert = self._make_alert('PENDING')
        url = reverse('alert-cancel', args=[alert.alert_id])
        response = self.client.put(url, **auth_header(self.user))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        alert.refresh_from_db()
        self.assertEqual(alert.status, 'CANCELLED')
        self.assertEqual(mock_send_cancellation_notice.call_count, alert.assignments.count())

    @patch('alerts.views.NotificationDispatcher.send_cancellation_notice')
    def test_cancel_alert_while_dispatched(self, mock_send_cancellation_notice):
        alert = self._make_alert('DISPATCHED')
        url = reverse('alert-cancel', args=[alert.alert_id])
        response = self.client.put(url, **auth_header(self.user))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        alert.refresh_from_db()
        self.assertEqual(alert.status, 'CANCELLED')
        self.assertEqual(mock_send_cancellation_notice.call_count, alert.assignments.count())

    def test_cannot_cancel_resolved_alert(self):
        alert = self._make_alert('RESOLVED')
        url = reverse('alert-cancel', args=[alert.alert_id])
        response = self.client.put(url, **auth_header(self.user))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        alert.refresh_from_db()
        self.assertEqual(alert.status, 'RESOLVED')

    @patch('alerts.views.NotificationDispatcher.send_cancellation_notice')
    def test_cancel_alert_notifies_assigned_agencies(self, mock_send_cancellation_notice):
        alert = self._make_alert('DISPATCHED', with_assignment=False)
        assignment = AlertAssignment.objects.create(alert=alert, agency=self.agency)

        url = reverse('alert-cancel', args=[alert.alert_id])
        response = self.client.put(url, **auth_header(self.user))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_send_cancellation_notice.assert_called_once()
        called_assignment = mock_send_cancellation_notice.call_args[0][0]
        self.assertEqual(called_assignment.assignment_id, assignment.assignment_id)

    @patch('alerts.views.NotificationDispatcher.send_cancellation_notice')
    def test_cancel_alert_with_no_assignments_still_succeeds(self, mock_send_cancellation_notice):
        alert = self._make_alert('PENDING', with_assignment=False)
        alert.assignments.all().delete()

        url = reverse('alert-cancel', args=[alert.alert_id])
        response = self.client.put(url, **auth_header(self.user))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_send_cancellation_notice.assert_not_called()


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
