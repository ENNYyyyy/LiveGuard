from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from agencies.models import SecurityAgency, AgencyUser


def create_user(email='user@test.com', password='password123', phone='+2348011111111', full_name='Test User'):
    user = User.objects.create_user(
        email=email,
        password=password,
        phone_number=phone,
        full_name=full_name,
    )
    return user


def auth_header(user):
    refresh = RefreshToken.for_user(user)
    return {'HTTP_AUTHORIZATION': f'Bearer {refresh.access_token}'}


def create_agency_user(email='officer@test.com'):
    agency = SecurityAgency.objects.create(
        agency_name='Police',
        agency_type='POLICE',
        contact_email='police@test.com',
        contact_phone='+2348012345678',
        jurisdiction='Nationwide',
        address='Abuja',
        is_active=True,
    )
    user = create_user(email=email, phone='+2348099999999')
    AgencyUser.objects.create(user=user, agency=agency, role='DISPATCHER')
    return user


class UserRegistrationTests(APITestCase):
    url = reverse('auth-register')

    def valid_payload(self, email='new@test.com'):
        return {
            'full_name': 'John Doe',
            'email': email,
            'phone_number': '+2348011111111',
            'password': 'password123',
        }

    def test_user_registration_success(self):
        response = self.client.post(self.url, self.valid_payload())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['email'], 'new@test.com')
        self.assertNotIn('password', response.data['user'])

    def test_user_registration_duplicate_email(self):
        create_user(email='new@test.com')
        response = self.client.post(self.url, self.valid_payload(email='new@test.com'))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.data)
        self.assertIn('errors', response.data)
        self.assertIn('email', response.data['errors'])

    def test_user_registration_invalid_phone(self):
        payload = self.valid_payload()
        payload['phone_number'] = '12345'
        response = self.client.post(self.url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.data)
        self.assertIn('errors', response.data)
        self.assertIn('phone_number', response.data['errors'])

    def test_user_registration_short_password(self):
        payload = self.valid_payload()
        payload['password'] = 'short'
        response = self.client.post(self.url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_agency_registration_blocked(self):
        payload = self.valid_payload()
        payload['client_type'] = 'AGENCY'
        response = self.client.post(self.url, payload)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('detail', response.data)
        self.assertIn('errors', response.data)
        self.assertIn('client_type', response.data['errors'])


class UserLoginTests(APITestCase):
    url = reverse('auth-login')

    def setUp(self):
        self.user = create_user()

    def test_user_login_success(self):
        response = self.client.post(self.url, {'email': 'user@test.com', 'password': 'password123'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['email'], 'user@test.com')
        self.assertEqual(response.data['user']['role'], 'CIVILIAN')
        self.assertFalse(response.data['user']['is_agency_user'])

    def test_user_login_wrong_password(self):
        response = self.client.post(self.url, {'email': 'user@test.com', 'password': 'wrongpass'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('detail', response.data)
        self.assertIn('errors', response.data)

    def test_user_login_unknown_email(self):
        response = self.client.post(self.url, {'email': 'nobody@test.com', 'password': 'password123'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('detail', response.data)
        self.assertIn('errors', response.data)

    def test_agency_login_requires_agency_account(self):
        response = self.client.post(self.url, {
            'email': 'user@test.com',
            'password': 'password123',
            'client_type': 'AGENCY',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('detail', response.data)
        self.assertIn('errors', response.data)
        self.assertIn('client_type', response.data['errors'])

    def test_agency_login_success_for_agency_user(self):
        agency_user = create_agency_user(email='agency@test.com')
        response = self.client.post(self.url, {
            'email': 'agency@test.com',
            'password': 'password123',
            'client_type': 'AGENCY',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['email'], agency_user.email)
        self.assertEqual(response.data['user']['role'], 'AGENCY')
        self.assertTrue(response.data['user']['is_agency_user'])
        self.assertIsNotNone(response.data['user']['agency_id'])
        self.assertIsNotNone(response.data['user']['agency_name'])
        self.assertEqual(response.data['user']['agency_role'], 'DISPATCHER')


class ProfileViewTests(APITestCase):
    url = reverse('auth-profile')

    def setUp(self):
        self.user = create_user()

    def test_profile_view_authenticated(self):
        response = self.client.get(self.url, **auth_header(self.user))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], self.user.email)
        self.assertEqual(response.data['full_name'], self.user.full_name)
        self.assertEqual(response.data['role'], 'CIVILIAN')
        self.assertFalse(response.data['is_agency_user'])
        self.assertIsNone(response.data['agency_id'])
        self.assertIsNone(response.data['agency_name'])
        self.assertIsNone(response.data['agency_role'])

    def test_profile_view_unauthenticated(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_update(self):
        response = self.client.put(
            self.url,
            {'full_name': 'Updated Name', 'phone_number': '+2348022222222'},
            **auth_header(self.user),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['full_name'], 'Updated Name')

    def test_profile_view_for_agency_user_includes_agency_metadata(self):
        agency_user = create_agency_user(email='agencyprofile@test.com')
        response = self.client.get(self.url, **auth_header(agency_user))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['role'], 'AGENCY')
        self.assertTrue(response.data['is_agency_user'])
        self.assertIsNotNone(response.data['agency_id'])
        self.assertIsNotNone(response.data['agency_name'])
        self.assertEqual(response.data['agency_role'], 'DISPATCHER')
