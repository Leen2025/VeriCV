from django.urls import path

from rest_framework.routers import DefaultRouter
from .views import QuizViewSet, QuestionViewSet, ResultViewSet
from django.urls import path, include

router = DefaultRouter()
router.register(r'quizzes', QuizViewSet)
router.register(r'questions', QuestionViewSet)
router.register(r'results', ResultViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
