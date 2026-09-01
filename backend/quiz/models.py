from django.db import models
from django.contrib.auth.models import User

class Quiz(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='quizzes')
    title = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

class Question(models.Model):
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name="questions",
    )

    text = models.TextField()
    options = models.JSONField()

    # AI returns 0, 1, 2, or 3.
    # Keep the existing column for now to avoid an unnecessary rename migration.
    correct_answer = models.CharField(max_length=1)

    skill = models.CharField(max_length=100, blank=True, default="")
    category = models.CharField(max_length=20, blank=True, default="")
    difficulty = models.CharField(max_length=20, blank=True, default="")

class Result(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    score = models.FloatField()
    completed_at = models.DateTimeField(auto_now_add=True)
