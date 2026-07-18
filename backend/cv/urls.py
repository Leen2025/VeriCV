from rest_framework.routers import DefaultRouter
from .views import CVViewSet
from django.urls import path, include

router = DefaultRouter()
router.register(r'', CVViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
