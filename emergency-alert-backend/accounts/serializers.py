import re
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.core.exceptions import ObjectDoesNotExist
from .models import User

NIGERIAN_PHONE_RE = re.compile(r'^\+234[789][01]\d{8}$|^0[789][01]\d{8}$')


def validate_nigerian_phone(value):
    if value and not NIGERIAN_PHONE_RE.match(value):
        raise serializers.ValidationError(
            "Enter a valid Nigerian phone number (e.g. +2348012345678 or 08012345678)."
        )
    return value


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            'full_name', 'email', 'phone_number', 'password',
            'emergency_contact_name', 'emergency_contact_phone',
        ]

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_phone_number(self, value):
        return validate_nigerian_phone(value)

    def validate_emergency_contact_phone(self, value):
        return validate_nigerian_phone(value)

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data.pop('password', None)
        return data


class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    client_type = serializers.ChoiceField(
        choices=['AGENCY', 'CIVILIAN'],
        required=False,
    )

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get('request'),
            email=attrs['email'],
            password=attrs['password'],
        )
        if not user:
            raise serializers.ValidationError("Invalid email or password.")
        if not user.is_active:
            raise serializers.ValidationError("This account is inactive.")
        attrs['user'] = user
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    admin_level = serializers.SerializerMethodField()
    is_agency_user = serializers.SerializerMethodField()
    agency_id = serializers.SerializerMethodField()
    agency_name = serializers.SerializerMethodField()
    agency_role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'user_id', 'full_name', 'email', 'phone_number',
            'emergency_contact_name', 'emergency_contact_phone',
            'address', 'date_joined',
            'role', 'admin_level', 'is_agency_user', 'agency_id', 'agency_name', 'agency_role',
        ]
        read_only_fields = [
            'user_id', 'email', 'date_joined',
            'role', 'admin_level', 'is_agency_user', 'agency_id', 'agency_name', 'agency_role',
        ]

    def validate_phone_number(self, value):
        return validate_nigerian_phone(value)

    def validate_emergency_contact_phone(self, value):
        return validate_nigerian_phone(value)

    def _agency_profile(self, obj):
        try:
            return obj.agency_profile
        except ObjectDoesNotExist:
            return None

    def _admin_profile(self, obj):
        try:
            return obj.systemadmin
        except ObjectDoesNotExist:
            return None

    def get_role(self, obj):
        if self._admin_profile(obj):
            return 'ADMIN'
        return 'AGENCY' if self._agency_profile(obj) else 'CIVILIAN'

    def get_admin_level(self, obj):
        profile = self._admin_profile(obj)
        return profile.admin_level if profile else None

    def get_is_agency_user(self, obj):
        return bool(self._agency_profile(obj))

    def get_agency_id(self, obj):
        profile = self._agency_profile(obj)
        return profile.agency.agency_id if profile else None

    def get_agency_name(self, obj):
        profile = self._agency_profile(obj)
        return profile.agency.agency_name if profile else None

    def get_agency_role(self, obj):
        profile = self._agency_profile(obj)
        return profile.role if profile else None
