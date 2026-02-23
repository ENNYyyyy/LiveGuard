from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User


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
        self.assertIn('email', response.data)

    def test_user_registration_invalid_phone(self):
        payload = self.valid_payload()
        payload['phone_number'] = '12345'
        response = self.client.post(self.url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('phone_number', response.data)

    def test_user_registration_short_password(self):
        payload = self.valid_payload()
        payload['password'] = 'short'
        response = self.client.post(self.url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


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

    def test_user_login_wrong_password(self):
        response = self.client.post(self.url, {'email': 'user@test.com', 'password': 'wrongpass'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_login_unknown_email(self):
        response = self.client.post(self.url, {'email': 'nobody@test.com', 'password': 'password123'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ProfileViewTests(APITestCase):
    url = reverse('auth-profile')

    def setUp(self):
        self.user = create_user()

    def test_profile_view_authenticated(self):
        response = self.client.get(self.url, **auth_header(self.user))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], self.user.email)
        self.assertEqual(response.data['full_name'], self.user.full_name)

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
