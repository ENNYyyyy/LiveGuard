from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import User
from alert_system.api_responses import error_response, derive_detail_from_errors
from .serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserProfileSerializer,
)


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = []  # Auth endpoints are exempt from the global UserRateThrottle

    def post(self, request):
        request_data = request.data.copy()
        client_type = request_data.get('client_type')
        request_data.pop('client_type', None)

        if client_type == 'AGENCY':
            return error_response(
                detail='Agency accounts are provisioned by system administrators.',
                status_code=status.HTTP_403_FORBIDDEN,
                errors={'client_type': ['Agency self-signup is not supported.']},
            )

        serializer = UserRegistrationSerializer(data=request_data)
        if serializer.is_valid():
            user = serializer.save()
            tokens = get_tokens_for_user(user)
            return Response(
                {
                    'user': UserProfileSerializer(user).data,
                    'access': tokens['access'],
                    'refresh': tokens['refresh'],
                },
                status=status.HTTP_201_CREATED,
            )
        return error_response(
            detail=derive_detail_from_errors(serializer.errors),
            status_code=status.HTTP_400_BAD_REQUEST,
            errors=serializer.errors,
            include_legacy_error=False,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = []  # Auth endpoints are exempt from the global UserRateThrottle

    def post(self, request):
        serializer = UserLoginSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = serializer.validated_data['user']
            client_type = serializer.validated_data.get('client_type')

            if client_type == 'AGENCY' and not hasattr(user, 'agency_profile'):
                return error_response(
                    detail='Agency login is restricted to agency accounts.',
                    status_code=status.HTTP_403_FORBIDDEN,
                    errors={'client_type': ['This account is not linked to an agency profile.']},
                )

            tokens = get_tokens_for_user(user)
            return Response(
                {
                    'user': UserProfileSerializer(user).data,
                    'access': tokens['access'],
                    'refresh': tokens['refresh'],
                },
                status=status.HTTP_200_OK,
            )
        return error_response(
            detail=derive_detail_from_errors(serializer.errors, default='Login failed.'),
            status_code=status.HTTP_401_UNAUTHORIZED,
            errors=serializer.errors,
            include_legacy_error=False,
        )


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        serializer = UserProfileSerializer(
            request.user, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return error_response(
            detail=derive_detail_from_errors(serializer.errors),
            status_code=status.HTTP_400_BAD_REQUEST,
            errors=serializer.errors,
            include_legacy_error=False,
        )


class RegisterDeviceView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        push_token = request.data.get('push_token')
        if not push_token:
            return error_response(
                detail='push_token is required.',
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        request.user.push_token = push_token
        request.user.save(update_fields=['push_token'])
        return Response(
            {'message': 'Device registered successfully.'},
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return error_response(
                detail='Refresh token is required.',
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError as e:
            return error_response(
                detail=str(e),
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        return Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current_password = request.data.get('current_password', '')
        new_password = request.data.get('new_password', '')

        if not current_password or not new_password:
            return error_response(
                detail='current_password and new_password are required.',
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if not request.user.check_password(current_password):
            return error_response(
                detail='Current password is incorrect.',
                status_code=status.HTTP_400_BAD_REQUEST,
                errors={'current_password': ['Incorrect password.']},
            )
        if len(new_password) < 8:
            return error_response(
                detail='New password must be at least 8 characters.',
                status_code=status.HTTP_400_BAD_REQUEST,
                errors={'new_password': ['Password too short.']},
            )
        request.user.set_password(new_password)
        request.user.save(update_fields=['password'])
        return Response({'message': 'Password changed successfully.'}, status=status.HTTP_200_OK)


class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        password = request.data.get('password', '')
        if not password:
            return error_response(
                detail='Password is required to delete your account.',
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if not request.user.check_password(password):
            return error_response(
                detail='Incorrect password.',
                status_code=status.HTTP_400_BAD_REQUEST,
                errors={'password': ['Incorrect password.']},
            )
        request.user.delete()
        return Response({'message': 'Account deleted successfully.'}, status=status.HTTP_200_OK)
