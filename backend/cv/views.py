from rest_framework import viewsets, permissions
from .models import CV
from .serializers import CVSerializer
from rest_framework.permissions import IsAuthenticated

class CVViewSet(viewsets.ModelViewSet):
    queryset = CV.objects.all()
    serializer_class = CVSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return CV.objects.all()
        return CV.objects.filter(user=user)
