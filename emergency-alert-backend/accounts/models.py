from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db.models import (
    AutoField, EmailField, CharField, TextField, DateTimeField, BooleanField
)


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    username = None  # Remove username, use email instead
    objects = UserManager()
    user_id = AutoField(primary_key=True)
    email = EmailField(unique=True)
    phone_number = CharField(max_length=15)
    full_name = CharField(max_length=150)
    emergency_contact_name = CharField(max_length=150, blank=True, null=True)
    emergency_contact_phone = CharField(max_length=15, blank=True, null=True)
    address = TextField(blank=True, null=True)
    push_token = TextField(blank=True, null=True)  # FCM/Expo push token
    date_joined = DateTimeField(auto_now_add=True)
    is_active = BooleanField(default=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['phone_number', 'full_name']

    def __str__(self):
        return f"{self.full_name} ({self.email})"
