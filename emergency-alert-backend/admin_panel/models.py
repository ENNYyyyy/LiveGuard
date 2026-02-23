from django.db import models
from django.db.models import AutoField, CharField, OneToOneField, CASCADE, GenericIPAddressField


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
