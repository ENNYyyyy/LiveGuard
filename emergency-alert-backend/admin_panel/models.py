from django.db import models
from django.db.models import AutoField, CharField, TextField, OneToOneField, CASCADE, GenericIPAddressField, DateTimeField


class SystemAdmin(models.Model):
    ADMIN_LEVELS = [
        ('SUPER_ADMIN', 'Super Admin'),
        ('ADMIN', 'Admin'),
        ('MODERATOR', 'Moderator'),
    ]

    admin_id = AutoField(primary_key=True)
    user = OneToOneField('accounts.User', on_delete=CASCADE)
    admin_level = CharField(max_length=15, choices=ADMIN_LEVELS)
    last_login_ip = GenericIPAddressField(null=True, blank=True)

    def __str__(self):
        return f"{self.user} ({self.admin_level})"


class SystemSetting(models.Model):
    """
    Operational key-value settings editable by admin without server redeployment.
    No secrets are stored here — only runtime-tunable operational values.
    """
    key         = CharField(max_length=100, unique=True)
    value       = CharField(max_length=500)
    description = TextField(blank=True)
    updated_at  = DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.key} = {self.value}"
