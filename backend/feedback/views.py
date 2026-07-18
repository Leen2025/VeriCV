from rest_framework import viewsets, permissions, serializers
from .models import Feedback
from .serializers import FeedbackSerializer

class FeedbackViewSet(viewsets.ModelViewSet):
    queryset = Feedback.objects.all()
    serializer_class = FeedbackSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        user = self.request.user

        # Try to get related instances automatically
        cv_id = self.request.data.get('cv')
        result_id = self.request.data.get('result')

        if not cv_id or not result_id:
            raise serializers.ValidationError("Both 'cv' and 'result' fields are required.")

        serializer.save(
            user=user,
            cv_id=cv_id,
            result_id=result_id
        )

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Feedback.objects.all()
        return Feedback.objects.filter(user=user)
