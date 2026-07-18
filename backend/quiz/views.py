from rest_framework import viewsets, permissions
from .models import Quiz, Question, Result
from .serializers import QuizSerializer, QuestionSerializer, ResultSerializer


class QuizViewSet(viewsets.ModelViewSet):
    queryset = Quiz.objects.all()
    serializer_class = QuizSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Quiz.objects.all()
        return Quiz.objects.filter(user=user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Question.objects.all()
        return Question.objects.filter(quiz__user=user)


class ResultViewSet(viewsets.ModelViewSet):
    queryset = Result.objects.all()
    serializer_class = ResultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Result.objects.all()
        return Result.objects.filter(user=user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
