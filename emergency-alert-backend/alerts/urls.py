from django.urls import path
from .views import (
    CreateEmergencyAlertView,
    AlertStatusView,
    UserAlertHistoryView,
    UpdateAlertLocationView,
    CancelAlertView,
)

urlpatterns = [
    path('create/', CreateEmergencyAlertView.as_view(), name='alert-create'),
    path('history/', UserAlertHistoryView.as_view(), name='alert-history'),
    path('<int:alert_id>/status/', AlertStatusView.as_view(), name='alert-status'),
    path('<int:alert_id>/location/', UpdateAlertLocationView.as_view(), name='alert-update-location'),
    path('<int:alert_id>/cancel/', CancelAlertView.as_view(), name='alert-cancel'),
]
