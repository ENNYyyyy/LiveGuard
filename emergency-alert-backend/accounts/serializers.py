import re
from rest_framework import serializers
from django.contrib.auth import authenticate
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
    class Meta:
        model = User
        fields = [
            'user_id', 'full_name', 'email', 'phone_number',
            'emergency_contact_name', 'emergency_contact_phone',
            'address', 'date_joined',
        ]
        read_only_fields = ['user_id', 'email', 'date_joined']

    def validate_phone_number(self, value):
        return validate_nigerian_phone(value)

    def validate_emergency_contact_phone(self, value):
        return validate_nigerian_phone(value)
