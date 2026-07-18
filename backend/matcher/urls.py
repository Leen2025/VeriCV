from django.urls import path
from .views import JobMatcherView

urlpatterns = [
    path("", JobMatcherView.as_view(), name="job_matcher"),
]
