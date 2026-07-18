# backend/ai/urls.py

from django.urls import path
from .views import generate_questions_view, submit_answers_view

urlpatterns = [
    path("generate/", generate_questions_view, name="ai-generate"),
    path("submit/", submit_answers_view, name="ai-submit"),
]
