from django.urls import path
from .views import AssessmentSummaryView, AssessmentListView, AssessmentCreateView, AssessmentDetailView

urlpatterns = [
    path("summary/", AssessmentSummaryView.as_view(), name="assessment-summary"),
    path("list/", AssessmentListView.as_view(), name="assessment-list"),
    path("add/", AssessmentCreateView.as_view(), name="assessment-add"),
    path("<int:pk>/", AssessmentDetailView.as_view(), name="assessment-detail"),
    path("detail/<int:pk>/", AssessmentDetailView.as_view(), name="assessment-detail-compat"),
]
