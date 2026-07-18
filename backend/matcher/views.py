from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from ai.ai_logic import extract_text_from_pdf
from ai.ai_logic import analyze_job_match
from assessment.models import Assessment

class JobMatcherView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        cv_file = request.FILES.get("cv")
        job_description = request.data.get("job_description")
        position = request.data.get("position")

        if not (cv_file and job_description and position):
            return Response({"error": "Missing required fields."}, status=status.HTTP_400_BAD_REQUEST)

        # Step 1: Extract text from CV
        cv_text = extract_text_from_pdf(cv_file)

        # Step 2: AI Analysis
        ai_result = analyze_job_match(cv_text, job_description, position)

        # Step 3: Save to assessment history as a 'match' record (excluded from quiz dashboard)
        Assessment.objects.create(
            user=request.user,
            kind="match",
            position=position,
            average_score=ai_result.get("match_score", 0) or 0,
            # Keep original matcher payload shape; quiz UI won't consume these entries
            skills_analyzed={
                "missing_keywords": ai_result.get("missing_keywords", []),
                "summary": ai_result.get("summary", ""),
            },
        )

        # Step 4: Return result
        return Response(ai_result, status=status.HTTP_200_OK)
