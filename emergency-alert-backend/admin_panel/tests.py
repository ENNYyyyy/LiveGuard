from unittest.mock import patch
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from agencies.models import SecurityAgency
from alerts.models import EmergencyAlert, Location, AlertAssignment


# ─── Helpers ──────────────────────────────────────────────────────────────────

def make_admin(email='admin@test.com'):
    return User.objects.create_user(
        email=email, password='adminpass123',
        phone_number='+2348000000001', full_name='Admin User',
        is_staff=True,
    )


def make_user(email='user@test.com', phone='+2348000000002'):
    return User.objects.create_user(
        email=email, password='pass123',
        phone_number=phone, full_name='Test User',
    )


def make_agency(name='Police', agency_type='POLICE', email='p@a.com', phone='+2348012345678'):
    return SecurityAgency.objects.create(
        agency_name=name, agency_type=agency_type,
        contact_email=email, contact_phone=phone,
        jurisdiction='Nationwide', address='Abuja', is_active=True,
    )


def make_alert(user, alert_type='BANDITRY', alert_status='PENDING'):
    alert = EmergencyAlert.objects.create(
        user=user, alert_type=alert_type, priority_level='HIGH', status=alert_status,
    )
    Location.objects.create(alert=alert, latitude='6.5244', longitude='3.3792')
    return alert


def auth(user):
    return {'HTTP_AUTHORIZATION': f'Bearer {RefreshToken.for_user(user).access_token}'}


# ─── Permission guard ─────────────────────────────────────────────────────────

class AdminPermissionTests(APITestCase):
    """All admin endpoints must reject non-staff users."""

    def setUp(self):
        self.civilian = make_user()

    def test_dashboard_requires_admin(self):
        resp = self.client.get(reverse('admin-dashboard'), **auth(self.civilian))
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_agency_list_requires_admin(self):
        resp = self.client.get(reverse('admin-agency-list'), **auth(self.civilian))
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_alert_list_requires_admin(self):
        resp = self.client.get(reverse('admin-alert-list'), **auth(self.civilian))
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


# ─── Dashboard ────────────────────────────────────────────────────────────────

class DashboardTests(APITestCase):
    def setUp(self):
        self.admin = make_admin()
        self.user  = make_user()
        make_agency()
        make_alert(self.user)

    def test_dashboard_returns_expected_keys(self):
        resp = self.client.get(reverse('admin-dashboard'), **auth(self.admin))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('totals', resp.data)
        self.assertIn('alerts_by_status', resp.data)
        self.assertIn('alerts_by_type', resp.data)
        self.assertIn('alerts_by_priority', resp.data)

    def test_dashboard_counts_are_correct(self):
        resp = self.client.get(reverse('admin-dashboard'), **auth(self.admin))
        self.assertEqual(resp.data['totals']['alerts_all_time'], 1)
        self.assertEqual(resp.data['totals']['agencies_total'], 1)
        self.assertEqual(resp.data['totals']['civilian_users'], 1)


# ─── Agency management ────────────────────────────────────────────────────────

class AgencyListCreateTests(APITestCase):
    def setUp(self):
        self.admin = make_admin()
        self.url   = reverse('admin-agency-list')

    def test_list_agencies(self):
        make_agency()
        resp = self.client.get(self.url, **auth(self.admin))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)

    def test_create_agency(self):
        payload = {
            'agency_name': 'Fire Service Lagos',
            'agency_type': 'FIRE',
            'contact_email': 'fire@lagos.gov.ng',
            'contact_phone': '+2348055555555',
            'jurisdiction': 'Lagos',
            'address': 'Lagos Island',
        }
        resp = self.client.post(self.url, payload, **auth(self.admin))
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['agency_name'], 'Fire Service Lagos')
        self.assertTrue(SecurityAgency.objects.filter(agency_name='Fire Service Lagos').exists())

    def test_create_agency_missing_required_fields(self):
        resp = self.client.post(self.url, {'agency_name': 'Incomplete'}, **auth(self.admin))
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


class AgencyDetailTests(APITestCase):
    def setUp(self):
        self.admin  = make_admin()
        self.agency = make_agency()
        self.url    = reverse('admin-agency-detail', args=[self.agency.agency_id])

    def test_get_agency_detail(self):
        resp = self.client.get(self.url, **auth(self.admin))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['agency_name'], self.agency.agency_name)
        self.assertIn('staff', resp.data)

    def test_update_agency_put(self):
        payload = {
            'agency_name': 'Updated Police',
            'agency_type': 'POLICE',
            'contact_email': 'updated@police.gov.ng',
            'contact_phone': '+2348066666666',
            'jurisdiction': 'Nationwide',
            'address': 'Abuja',
        }
        resp = self.client.put(self.url, payload, **auth(self.admin))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.agency.refresh_from_db()
        self.assertEqual(self.agency.agency_name, 'Updated Police')

    def test_patch_agency(self):
        resp = self.client.patch(
            self.url, {'agency_name': 'Patched Name'}, **auth(self.admin)
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.agency.refresh_from_db()
        self.assertEqual(self.agency.agency_name, 'Patched Name')

    def test_deactivate_agency(self):
        resp = self.client.delete(self.url, **auth(self.admin))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.agency.refresh_from_db()
        self.assertFalse(self.agency.is_active)

    def test_get_nonexistent_agency_returns_404(self):
        url = reverse('admin-agency-detail', args=[99999])
        resp = self.client.get(url, **auth(self.admin))
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


# ─── Alert management ────────────────────────────────────────────────────────

class AlertListTests(APITestCase):
    def setUp(self):
        self.admin = make_admin()
        self.user  = make_user()
        self.url   = reverse('admin-alert-list')
        make_alert(self.user, alert_type='BANDITRY',      alert_status='PENDING')
        make_alert(self.user, alert_type='FIRE_INCIDENCE', alert_status='RESOLVED')

    def test_list_all_alerts(self):
        resp = self.client.get(self.url, **auth(self.admin))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 2)

    def test_filter_by_status(self):
        resp = self.client.get(self.url + '?status=PENDING', **auth(self.admin))
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['status'], 'PENDING')

    def test_filter_by_type(self):
        resp = self.client.get(self.url + '?type=FIRE_INCIDENCE', **auth(self.admin))
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['alert_type'], 'FIRE_INCIDENCE')

    def test_filter_by_priority(self):
        resp = self.client.get(self.url + '?priority=HIGH', **auth(self.admin))
        self.assertEqual(len(resp.data), 2)


class AlertDetailTests(APITestCase):
    def setUp(self):
        self.admin = make_admin()
        self.user  = make_user()
        self.alert = make_alert(self.user)
        self.url   = reverse('admin-alert-detail', args=[self.alert.alert_id])

    def test_get_alert_detail(self):
        resp = self.client.get(self.url, **auth(self.admin))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['alert_id'], self.alert.alert_id)
        self.assertIn('reporter', resp.data)
        self.assertIn('location', resp.data)
        self.assertIn('assignments', resp.data)

    def test_location_includes_maps_url(self):
        resp = self.client.get(self.url, **auth(self.admin))
        self.assertIn('maps_url', resp.data['location'])
        self.assertIn('maps.google.com', resp.data['location']['maps_url'])

    def test_nonexistent_alert_returns_404(self):
        url = reverse('admin-alert-detail', args=[99999])
        resp = self.client.get(url, **auth(self.admin))
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


class AlertAssignTests(APITestCase):
    def setUp(self):
        self.admin  = make_admin()
        self.user   = make_user()
        self.agency = make_agency()
        self.alert  = make_alert(self.user)
        self.url    = reverse('admin-alert-assign', args=[self.alert.alert_id])

    @patch('admin_panel.views.NotificationDispatcher')
    def test_assign_alert_to_agency(self, mock_dispatcher):
        resp = self.client.post(
            self.url, {'agency_id': self.agency.agency_id}, **auth(self.admin)
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            AlertAssignment.objects.filter(alert=self.alert, agency=self.agency).exists()
        )

    @patch('admin_panel.views.NotificationDispatcher')
    def test_assign_sets_status_to_dispatched(self, mock_dispatcher):
        self.client.post(self.url, {'agency_id': self.agency.agency_id}, **auth(self.admin))
        self.alert.refresh_from_db()
        self.assertEqual(self.alert.status, 'DISPATCHED')

    @patch('admin_panel.views.NotificationDispatcher')
    def test_cannot_assign_same_agency_twice(self, mock_dispatcher):
        self.client.post(self.url, {'agency_id': self.agency.agency_id}, **auth(self.admin))
        resp = self.client.post(
            self.url, {'agency_id': self.agency.agency_id}, **auth(self.admin)
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_assign_missing_agency_id_returns_400(self):
        resp = self.client.post(self.url, {}, **auth(self.admin))
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_assign_inactive_agency_returns_404(self):
        self.agency.is_active = False
        self.agency.save()
        resp = self.client.post(
            self.url, {'agency_id': self.agency.agency_id}, **auth(self.admin)
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


# ─── User management ──────────────────────────────────────────────────────────

class CivilianUserListTests(APITestCase):
    def setUp(self):
        self.admin = make_admin()
        self.url   = reverse('admin-user-list')

    def test_lists_only_civilian_users(self):
        make_user('civ1@test.com', '+2348011111111')
        make_user('civ2@test.com', '+2348022222222')
        resp = self.client.get(self.url, **auth(self.admin))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # admin is_staff=True — must not appear in results
        self.assertEqual(len(resp.data), 2)

    def test_user_response_includes_alert_count(self):
        user = make_user()
        make_alert(user)
        resp = self.client.get(self.url, **auth(self.admin))
        self.assertEqual(resp.data[0]['alert_count'], 1)
