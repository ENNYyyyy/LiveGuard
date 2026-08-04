from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/alerts/', include('alerts.urls')),
    path('api/agency/', include('agencies.urls')),
    path('api/admin/', include('admin_panel.urls')),
]
