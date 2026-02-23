from django.contrib import admin
from .models import NotificationLog


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = ('assignment', 'channel_type', 'recipient', 'delivery_status', 'sent_at', 'retry_count')
    list_filter = ('channel_type', 'delivery_status')
    search_fields = ('recipient', 'assignment__assignment_id')
    ordering = ('-sent_at',)
