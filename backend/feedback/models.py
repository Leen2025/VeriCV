from django.db import models
from django.contrib.auth.models import User
from cv.models import CV
from quiz.models import Result

class Feedback(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='feedbacks')
    cv = models.ForeignKey(CV, on_delete=models.CASCADE, related_name='feedbacks')
    result = models.OneToOneField(Result, on_delete=models.CASCADE, related_name='feedback')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Feedback for {self.user.username} | CV: {self.cv.title} | Score: {self.result.score}"
