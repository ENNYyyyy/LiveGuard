from django.db import models
from django.db.models import AutoField, CharField, TextField, IntegerField, ForeignKey, CASCADE, DateTimeField


class NotificationLog(models.Model):
    CHANNEL_TYPES = [
        ('PUSH', 'Push Notification'),
        ('SMS', 'SMS'),
        ('EMAIL', 'Email'),
    ]
    DELIVERY_STATUSES = [
        ('PENDING', 'Pending'),
        ('SENT', 'Sent'),
        ('DELIVERED', 'Delivered'),
        ('FAILED', 'Failed'),
    ]

    log_id = AutoField(primary_key=True)
    assignment = ForeignKey('alerts.AlertAssignment', on_delete=CASCADE, related_name='notifications')
    channel_type = CharField(max_length=5, choices=CHANNEL_TYPES)
    recipient = CharField(max_length=200)
    sent_at = DateTimeField(auto_now_add=True)
    delivery_status = CharField(max_length=10, choices=DELIVERY_STATUSES, default='PENDING')
    retry_count = IntegerField(default=0)
    error_message = TextField(blank=True, null=True)

    def __str__(self):
        return f"Notification #{self.log_id} - {self.channel_type} to {self.recipient} ({self.delivery_status})"
