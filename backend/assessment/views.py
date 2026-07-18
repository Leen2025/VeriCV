from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Avg
from .models import Assessment
from .serializers import AssessmentSerializer

class AssessmentSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        assessments = Assessment.objects.filter(user=user, kind="quiz")
        count = assessments.count()
        avg_score = assessments.aggregate(Avg("average_score"))["average_score__avg"] or 0
        last_activity = assessments.order_by("-date_created").first()
        last_date = last_activity.date_created if last_activity else None

        all_skills = {}
        for a in assessments:
            if not isinstance(a.skills_analyzed, dict):
                continue
            for skill, score in a.skills_analyzed.items():
                if isinstance(score, (int, float)):
                    all_skills[skill] = max(all_skills.get(skill, 0), float(score))
        top_skill = max(all_skills, key=all_skills.get) if all_skills else None

        return Response({
            "assessments": count,
            "average_score": round(avg_score, 1),
            "top_skill": top_skill,
            "last_activity": last_date,
        })


class AssessmentListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        assessments = Assessment.objects.filter(user=request.user, kind="quiz").order_by("-date_created")
        serializer = AssessmentSerializer(assessments, many=True)
        return Response(serializer.data)
    
from rest_framework import status

class AssessmentCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        data = request.data

        # Extract expected fields
        position = data.get("position")
        average_score = data.get("average_score")
        skills_analyzed = data.get("skills_analyzed")

        # Basic validation
        if not all([position, average_score, skills_analyzed]):
            return Response(
                {"error": "position, average_score, and skills_analyzed are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create the record
        assessment = Assessment.objects.create(
            user=user,
            kind="quiz",
            position=position,
            average_score=average_score,
            skills_analyzed=skills_analyzed
        )

        serializer = AssessmentSerializer(assessment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AssessmentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk: int):
        try:
            a = Assessment.objects.get(id=pk, user=request.user, kind="quiz")
        except Assessment.DoesNotExist:
            return Response({"error": "Not found"}, status=404)

        # Return full details including skills_analyzed so frontend can render past results
        return Response({
            "id": a.id,
            "position": a.position,
            "average_score": a.average_score,
            "date_created": a.date_created,
            "skills_analyzed": a.skills_analyzed or {},
            "kind": getattr(a, "kind", "quiz"),
        })
