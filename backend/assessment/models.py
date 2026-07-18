from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Assessment(models.Model):
    KIND_CHOICES = (
        ("quiz", "Quiz"),
        ("match", "Match"),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default="quiz")
    position = models.CharField(max_length=255)
    average_score = models.FloatField()
    skills_analyzed = models.JSONField()
    date_created = models.DateTimeField(auto_now_add=True)

    def top_skills(self):
        if not self.skills_analyzed or not isinstance(self.skills_analyzed, dict):
            return []
        # Consider only numeric scores to avoid crashes when matcher stores strings
        numeric_items = [(k, v) for k, v in self.skills_analyzed.items() if isinstance(v, (int, float))]
        if not numeric_items:
            return []
        sorted_skills = sorted(numeric_items, key=lambda x: x[1], reverse=True)
        return [skill for skill, _ in sorted_skills[:4]]
