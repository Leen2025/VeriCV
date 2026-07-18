# VeriCV/backend/core/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from healthcheck.views import health
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),

    # Auth (JWT)
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Apps routes
    path('api/cv/', include('cv.urls')),
    path('api/feedback/', include('feedback.urls')),
    path('api/quiz/', include('quiz.urls')),
    path('api/ai/', include('ai.urls')),          
    path('api/users/', include('users.urls')),
    path("api/history/", include("assessment.urls")),
    path("api/matcher/", include("matcher.urls")),


    # Health
    path('api/health/', health),                  
]

# Serve media files in development
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
