from django.urls import path
from .views import (
    AgencyAlertListView,
    AcknowledgeAlertView,
    UpdateAlertStatusView,
    AlertLocationView,
    RegisterAgencyDeviceView,
)

urlpatterns = [
    path('alerts/', AgencyAlertListView.as_view(), name='agency-alert-list'),
    path('alerts/<int:assignment_id>/acknowledge/', AcknowledgeAlertView.as_view(), name='agency-alert-acknowledge'),
    path('alerts/<int:assignment_id>/status/', UpdateAlertStatusView.as_view(), name='agency-alert-status'),
    path('alerts/<int:assignment_id>/location/', AlertLocationView.as_view(), name='agency-alert-location'),
    path('register-device/', RegisterAgencyDeviceView.as_view(), name='agency-register-device'),
]
