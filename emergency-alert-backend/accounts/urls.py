from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import RegisterView, LoginView, ProfileView, RegisterDeviceView, LogoutView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('login/', LoginView.as_view(), name='auth-login'),
    path('profile/', ProfileView.as_view(), name='auth-profile'),
    path('token/refresh/', TokenRefreshView.as_view(), name='auth-token-refresh'),
    path('register-device/', RegisterDeviceView.as_view(), name='auth-register-device'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
]
