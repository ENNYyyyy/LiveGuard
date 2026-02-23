from django.db import models
from django.db.models import AutoField, CharField, EmailField, TextField, IntegerField, BooleanField, ForeignKey, OneToOneField, CASCADE


class SecurityAgency(models.Model):
    AGENCY_TYPES = [
        ('POLICE', 'Police'),
        ('FIRE', 'Fire Service'),
        ('MEDICAL', 'Medical/Ambulance'),
        ('MILITARY', 'Military'),
        ('SECURITY_FORCE', 'Security Force'),
    ]

    agency_id = AutoField(primary_key=True)
    agency_name = CharField(max_length=200)
    agency_type = CharField(max_length=20, choices=AGENCY_TYPES)
    contact_email = EmailField()
    contact_phone = CharField(max_length=15)
    jurisdiction = TextField()
    operational_capacity = IntegerField(null=True, blank=True)
    address = TextField()
    is_active = BooleanField(default=True)
    fcm_token = TextField(blank=True, null=True)

    def __str__(self):
        return self.agency_name


class AgencyUser(models.Model):
    ROLES = [
        ('DISPATCHER', 'Dispatcher'),
        ('RESPONDER', 'Responder'),
        ('COMMANDER', 'Commander'),
    ]

    agency = ForeignKey(SecurityAgency, on_delete=CASCADE, related_name='staff')
    user = OneToOneField('accounts.User', on_delete=CASCADE, related_name='agency_profile')
    role = CharField(max_length=20, choices=ROLES)

    def __str__(self):
        return f"{self.user} - {self.role} at {self.agency}"
