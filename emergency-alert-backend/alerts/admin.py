from django.contrib import admin
from .models import EmergencyAlert, Location, AlertAssignment, Acknowledgment


@admin.register(EmergencyAlert)
class EmergencyAlertAdmin(admin.ModelAdmin):
    list_display = ('alert_id', 'user', 'alert_type', 'priority_level', 'status', 'created_at')
    list_filter = ('alert_type', 'priority_level', 'status')
    search_fields = ('user__email', 'user__full_name', 'description')
    ordering = ('-created_at',)


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ('alert', 'latitude', 'longitude', 'address')
    search_fields = ('alert__alert_id', 'address')


@admin.register(AlertAssignment)
class AlertAssignmentAdmin(admin.ModelAdmin):
    list_display = ('alert', 'agency', 'notification_status', 'assigned_at')
    list_filter = ('notification_status', 'agency')
    search_fields = ('alert__alert_id', 'agency__agency_name')


@admin.register(Acknowledgment)
class AcknowledgmentAdmin(admin.ModelAdmin):
    list_display = ('assignment', 'acknowledged_by', 'estimated_arrival', 'ack_timestamp')
    search_fields = ('acknowledged_by', 'assignment__assignment_id')
