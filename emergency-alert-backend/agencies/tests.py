from unittest.mock import patch
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from agencies.models import SecurityAgency, AgencyUser
from alerts.models import EmergencyAlert, Location, AlertAssignment, Acknowledgment


def create_user(email='user@test.com', password='testpass123', phone='+2348011111111'):
    return User.objects.create_user(
        email=email, password=password,
        phone_number=phone, full_name='Test User',
    )


def create_agency(name='Police', agency_type='POLICE', email='p@test.com', phone='+2348012345678'):
    return SecurityAgency.objects.create(
        agency_name=name, agency_type=agency_type,
        contact_email=email, contact_phone=phone,
        jurisdiction='Nationwide', address='Abuja', is_active=True,
    )


def create_agency_user(agency, email='officer@test.com', phone='+2348099999999', role='DISPATCHER'):
    user = create_user(email=email, phone=phone)
    AgencyUser.objects.create(user=user, agency=agency, role=role)
    return user


def auth_header(user):
    return {'HTTP_AUTHORIZATION': f'Bearer {RefreshToken.for_user(user).access_token}'}


def make_alert_with_assignment(civilian, agency, alert_status='DISPATCHED'):
    alert = EmergencyAlert.objects.create(
        user=civilian, alert_type='BANDITRY',
        priority_level='HIGH', status=alert_status,
    )
    Location.objects.create(alert=alert, latitude='6.5244', longitude='3.3792')
    assignment = AlertAssignment.objects.create(alert=alert, agency=agency)
    return alert, assignment


class AcknowledgeAlertTests(APITestCase):
    def setUp(self):
        self.civilian = create_user()
        self.agency = create_agency()
        self.officer = create_agency_user(self.agency)
        self.alert, self.assignment = make_alert_with_assignment(self.civilian, self.agency)

    def ack_url(self):
        return reverse('agency-alert-acknowledge', args=[self.assignment.assignment_id])

    @patch('agencies.views.NotificationDispatcher')
    def test_acknowledge_alert(self, mock_dispatcher):
        payload = {
            'acknowledged_by': 'Officer Bello',
            'estimated_arrival': 15,
            'response_message': 'On our way',
            'responder_contact': '+2348055555555',
        }
        response = self.client.post(self.ack_url(), payload, **auth_header(self.officer))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['acknowledged_by'], 'Officer Bello')
        self.assertEqual(response.data['estimated_arrival'], 15)

    @patch('agencies.views.NotificationDispatcher')
    def test_acknowledge_updates_alert_status(self, mock_dispatcher):
        payload = {
            'acknowledged_by': 'Officer Bello',
            'estimated_arrival': 10,
        }
        self.client.post(self.ack_url(), payload, **auth_header(self.officer))

        self.alert.refresh_from_db()
        self.assertEqual(self.alert.status, 'ACKNOWLEDGED')

        self.assignment.refresh_from_db()
        self.assertEqual(self.assignment.notification_status, 'DELIVERED')
        self.assertIsNotNone(self.assignment.response_time)

    @patch('agencies.views.NotificationDispatcher')
    def test_cannot_acknowledge_twice(self, mock_dispatcher):
        payload = {'acknowledged_by': 'Officer Bello'}
        self.client.post(self.ack_url(), payload, **auth_header(self.officer))
        response = self.client.post(self.ack_url(), payload, **auth_header(self.officer))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_acknowledge_requires_agency_user(self):
        civilian = create_user(email='civ2@test.com', phone='+2348011111112')
        response = self.client.post(self.ack_url(), {}, **auth_header(civilian))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class AgencyAlertVisibilityTests(APITestCase):
    url = reverse('agency-alert-list')

    def setUp(self):
        self.civilian = create_user()

        self.agency_a = create_agency('Police A', 'POLICE', 'a@test.com', '+2348012345678')
        self.agency_b = create_agency('Police B', 'POLICE', 'b@test.com', '+2348023456789')

        self.officer_a = create_agency_user(self.agency_a, 'officer_a@test.com', '+2348031111111')
        self.officer_b = create_agency_user(self.agency_b, 'officer_b@test.com', '+2348032222222')

        alert_a = EmergencyAlert.objects.create(
            user=self.civilian, alert_type='BANDITRY', priority_level='HIGH', status='DISPATCHED'
        )
        alert_b = EmergencyAlert.objects.create(
            user=self.civilian, alert_type='OTHER', priority_level='LOW', status='DISPATCHED'
        )
        AlertAssignment.objects.create(alert=alert_a, agency=self.agency_a)
        AlertAssignment.objects.create(alert=alert_b, agency=self.agency_b)

    def test_agency_can_only_see_own_assignments(self):
        response_a = self.client.get(self.url, **auth_header(self.officer_a))
        response_b = self.client.get(self.url, **auth_header(self.officer_b))

        self.assertEqual(response_a.status_code, status.HTTP_200_OK)
        self.assertEqual(response_b.status_code, status.HTTP_200_OK)

        self.assertEqual(len(response_a.data), 1)
        self.assertEqual(len(response_b.data), 1)

        self.assertEqual(response_a.data[0]['agency']['agency_name'], 'Police A')
        self.assertEqual(response_b.data[0]['agency']['agency_name'], 'Police B')


class UpdateAlertStatusTests(APITestCase):
    def setUp(self):
        self.civilian = create_user()
        self.agency = create_agency()
        self.officer = create_agency_user(self.agency)
        self.alert, self.assignment = make_alert_with_assignment(
            self.civilian, self.agency, alert_status='ACKNOWLEDGED'
        )

    def status_url(self):
        return reverse('agency-alert-status', args=[self.assignment.assignment_id])

    @patch('agencies.views.NotificationDispatcher')
    def test_update_to_responding(self, mock_dispatcher):
        response = self.client.put(
            self.status_url(), {'status': 'RESPONDING'}, **auth_header(self.officer)
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.alert.refresh_from_db()
        self.assertEqual(self.alert.status, 'RESPONDING')

    @patch('agencies.views.NotificationDispatcher')
    def test_update_to_resolved(self, mock_dispatcher):
        response = self.client.put(
            self.status_url(), {'status': 'RESOLVED'}, **auth_header(self.officer)
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.alert.refresh_from_db()
        self.assertEqual(self.alert.status, 'RESOLVED')

    @patch('agencies.views.NotificationDispatcher')
    def test_invalid_status_returns_400(self, mock_dispatcher):
        response = self.client.put(
            self.status_url(), {'status': 'PENDING'}, **auth_header(self.officer)
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_location_endpoint_returns_coords_and_maps_url(self):
        url = reverse('agency-alert-location', args=[self.assignment.assignment_id])
        response = self.client.get(url, **auth_header(self.officer))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('latitude', response.data)
        self.assertIn('longitude', response.data)
        self.assertIn('maps_url', response.data)
        self.assertIn('maps.google.com', response.data['maps_url'])

    def test_cross_agency_status_update_denied(self):
        agency_b = create_agency('Fire', 'FIRE', 'fire@test.com', '+2348044444444')
        officer_b = create_agency_user(agency_b, 'fire@officer.com', '+2348055555555')
        response = self.client.put(
            self.status_url(), {'status': 'RESPONDING'}, **auth_header(officer_b)
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class RegisterAgencyDeviceTests(APITestCase):
    url = reverse('agency-register-device')

    def setUp(self):
        self.agency = create_agency()
        self.officer = create_agency_user(self.agency)
        self.civilian = create_user(email='civ@test.com', phone='+2348077777777')

    def test_register_device_stores_token(self):
        token = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxx]'
        response = self.client.post(self.url, {'push_token': token}, **auth_header(self.officer))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.agency.refresh_from_db()
        self.assertEqual(self.agency.fcm_token, token)

    def test_register_device_updates_existing_token(self):
        self.agency.fcm_token = 'old-token'
        self.agency.save(update_fields=['fcm_token'])

        new_token = 'ExponentPushToken[new-token-value]'
        self.client.post(self.url, {'push_token': new_token}, **auth_header(self.officer))
        self.agency.refresh_from_db()
        self.assertEqual(self.agency.fcm_token, new_token)

    def test_missing_token_returns_400(self):
        response = self.client.post(self.url, {}, **auth_header(self.officer))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_civilian_returns_403(self):
        response = self.client.post(
            self.url, {'push_token': 'some-token'}, **auth_header(self.civilian)
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_returns_401(self):
        response = self.client.post(self.url, {'push_token': 'some-token'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
