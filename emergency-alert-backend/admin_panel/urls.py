from django.urls import path
from .views import (
    DashboardView,
    AgencyListCreateView,
    AgencyDetailView,
    AgencyStaffView,
    AgencyStaffDetailView,
    AlertListView,
    AlertDetailView,
    AlertAssignView,
    CivilianUserListView,
    CivilianUserDetailView,
    NotificationLogListView,
    BroadcastNotificationView,
    ReportsView,
    SystemSettingsView,
)

urlpatterns = [
    # Dashboard
    path('dashboard/', DashboardView.as_view(), name='admin-dashboard'),

    # Agency management
    path('agencies/', AgencyListCreateView.as_view(), name='admin-agency-list'),
    path('agencies/<int:agency_id>/', AgencyDetailView.as_view(), name='admin-agency-detail'),
    path('agencies/<int:agency_id>/staff/', AgencyStaffView.as_view(), name='admin-agency-staff'),
    path('agencies/<int:agency_id>/staff/<int:user_id>/', AgencyStaffDetailView.as_view(), name='admin-agency-staff-detail'),

    # Alert management
    path('alerts/', AlertListView.as_view(), name='admin-alert-list'),
    path('alerts/<int:alert_id>/', AlertDetailView.as_view(), name='admin-alert-detail'),
    path('alerts/<int:alert_id>/assign/', AlertAssignView.as_view(), name='admin-alert-assign'),

    # User management
    path('users/', CivilianUserListView.as_view(), name='admin-user-list'),
    path('users/<int:user_id>/', CivilianUserDetailView.as_view(), name='admin-user-detail'),

    # Notification audit trail + broadcast
    path('notifications/', NotificationLogListView.as_view(), name='admin-notification-logs'),
    path('notifications/broadcast/', BroadcastNotificationView.as_view(), name='admin-notification-broadcast'),

    # Aggregated reports
    path('reports/', ReportsView.as_view(), name='admin-reports'),

    # Operational system settings
    path('settings/', SystemSettingsView.as_view(), name='admin-settings'),
]
