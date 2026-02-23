from django.db import models
from django.db.models import (
    AutoField, CharField, TextField, IntegerField, FloatField,
    ForeignKey, OneToOneField, CASCADE, DateTimeField, DecimalField
)


class EmergencyAlert(models.Model):
    ALERT_TYPES = [
        ('TERRORISM', 'Terrorism'),
        ('BANDITRY', 'Banditry'),
        ('KIDNAPPING', 'Kidnapping'),
        ('ARMED_ROBBERY', 'Armed Robbery'),
        ('FIRE_INCIDENCE', 'Fire Incidence'),
        ('ACCIDENT', 'Accident'),
        ('ROBBERY', 'Robbery'),
        ('OTHER', 'Other'),
    ]
    PRIORITY_LEVELS = [
        ('CRITICAL', 'Critical'),
        ('HIGH', 'High'),
        ('MEDIUM', 'Medium'),
        ('LOW', 'Low'),
    ]
    STATUSES = [
        ('PENDING', 'Pending'),
        ('DISPATCHED', 'Dispatched'),
        ('ACKNOWLEDGED', 'Acknowledged'),
        ('RESPONDING', 'Responding'),
        ('RESOLVED', 'Resolved'),
        ('CANCELLED', 'Cancelled'),
    ]

    alert_id = AutoField(primary_key=True)
    user = ForeignKey('accounts.User', on_delete=CASCADE, related_name='alerts')
    alert_type = CharField(max_length=20, choices=ALERT_TYPES)
    priority_level = CharField(max_length=10, choices=PRIORITY_LEVELS, default='CRITICAL')
    description = TextField(blank=True, null=True)
    status = CharField(max_length=15, choices=STATUSES, default='PENDING')
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)

    def __str__(self):
        return f"Alert #{self.alert_id} - {self.alert_type} ({self.status})"


class Location(models.Model):
    location_id = AutoField(primary_key=True)
    alert = OneToOneField(EmergencyAlert, on_delete=CASCADE, related_name='location')
    latitude = DecimalField(max_digits=10, decimal_places=7)
    longitude = DecimalField(max_digits=10, decimal_places=7)
    accuracy = FloatField(null=True, blank=True)
    address = TextField(blank=True, null=True)
    captured_at = DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Location for Alert #{self.alert_id}"


class AlertAssignment(models.Model):
    NOTIFICATION_STATUSES = [
        ('PENDING', 'Pending'),
        ('SENT', 'Sent'),
        ('DELIVERED', 'Delivered'),
        ('FAILED', 'Failed'),
    ]

    assignment_id = AutoField(primary_key=True)
    alert = ForeignKey(EmergencyAlert, on_delete=CASCADE, related_name='assignments')
    agency = ForeignKey('agencies.SecurityAgency', on_delete=CASCADE, related_name='assignments')
    assigned_at = DateTimeField(auto_now_add=True)
    notification_status = CharField(max_length=10, choices=NOTIFICATION_STATUSES, default='PENDING')
    response_time = DateTimeField(null=True, blank=True)
    assignment_priority = IntegerField(default=1)

    def __str__(self):
        return f"Assignment #{self.assignment_id} - Alert #{self.alert_id} to {self.agency}"


class Acknowledgment(models.Model):
    ack_id = AutoField(primary_key=True)
    assignment = OneToOneField(AlertAssignment, on_delete=CASCADE, related_name='acknowledgment')
    acknowledged_by = CharField(max_length=150)
    ack_timestamp = DateTimeField(auto_now_add=True)
    estimated_arrival = IntegerField(null=True, blank=True)  # minutes
    response_message = TextField(blank=True, null=True)
    responder_contact = CharField(max_length=15, blank=True, null=True)

    def __str__(self):
        return f"Ack for Assignment #{self.assignment_id} by {self.acknowledged_by}"
