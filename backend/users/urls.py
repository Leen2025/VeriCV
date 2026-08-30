from django.urls import path
from .views import RegisterView, LoginView, CustomTokenRefreshView, MeView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('me/', MeView.as_view(), name='me'),
]