from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from cv.models import CV  # adjust if your model name/app differs
from .ai_logic import extract_text_from_pdf, generate_questions_from_cv
import json


@csrf_exempt
def generate_questions_view(request):
    """
    POST:
      JSON:  { "cv_id": <int> }  -> uses a server-stored CV file
      OR multipart/form-data with file under one of:
          'cv' | 'file' | 'pdf' | 'cv_file' | 'resume' | 'document'
    RESP: { "questions": [ {question, options?, skill?, category?}, ... ] }
    """
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request method."}, status=400)

    cv_file = None

    # Try JSON body with cv_id
    try:
        if request.content_type and "application/json" in request.content_type:
            body = request.body.decode("utf-8") or "{}"
            data = json.loads(body)
            cv_id = data.get("cv_id")
            if cv_id is not None:
                try:
                    obj = CV.objects.get(pk=cv_id)
                    cv_file = obj.file  # FileField
                except CV.DoesNotExist:
                    return JsonResponse({"error": "CV not found."}, status=404)
    except Exception:
        # Fall back to file upload
        pass

    # Try multipart with a file under common keys
    if cv_file is None:
        for key in ["cv", "file", "pdf", "cv_file", "resume", "document"]:
            if key in request.FILES:
                cv_file = request.FILES[key]
                break
        if not cv_file:
            return JsonResponse(
                {"error": "Please upload a valid PDF file or provide cv_id."},
                status=400,
            )

    # Extract text & generate questions
    try:
        text = extract_text_from_pdf(cv_file)
        questions = generate_questions_from_cv(text)
        questions = _normalize_questions(questions)

        #  Add inferred skill + category if missing
        for q in questions:
            qtext = q.get("question", "")
            if "skill" not in q or not q.get("skill"):
                skill = _infer_skill_from_question(qtext)
                q["skill"] = skill
                q["category"] = (
                    "soft"
                    if skill in ["Communication", "Project Management"]
                    else "technical"
                )

        return JsonResponse({"questions": questions}, status=200, safe=False)

    except Exception as e:
        return JsonResponse(
            {"error": f"Failed to generate questions: {e}"}, status=500
        )


@csrf_exempt
def submit_answers_view(request):
    """
    POST /api/ai/submit/
    Body: { "answers": [ { "question": "...", "answer": 1, "correct_index": 1, "skill": "Python", "category": "technical" } ] }
    Returns: overall score + per-skill results.
    """
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request method."}, status=400)

    try:
        data = json.loads(request.body.decode("utf-8") or "{}")
        answers = data.get("answers", [])

        correct = 0
        total = 0
        per_skill = {}

        for a in answers:
            skill = a.get("skill", "General")
            cat = a.get("category", "technical")

            if skill not in per_skill:
                per_skill[skill] = {"sum": 0, "count": 0, "category": cat}

            user_answer = a.get("answer")
            correct_index = a.get("correct_index")

            if isinstance(user_answer, int) and isinstance(correct_index, int):
                total += 1
                if user_answer == correct_index:
                    correct += 1
                    per_skill[skill]["sum"] += 100
                else:
                    per_skill[skill]["sum"] += 0
                per_skill[skill]["count"] += 1
            else:
                # For open-ended or text answers, give neutral score
                per_skill[skill]["sum"] += 70
                per_skill[skill]["count"] += 1

        overall = round((correct / total) * 100) if total else 70
        skills = [
            {
                "skill": s,
                "score": round(v["sum"] / max(v["count"], 1)),
                "category": v["category"],
            }
            for s, v in per_skill.items()
        ]

        return JsonResponse({"overall": overall, "skills": skills}, status=200)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# -----------------
# Helpers
# -----------------
def _normalize_questions(raw):
    """Accepts dict/list/JSON-string and returns list[dict]."""
    if raw is None:
        return []
    if isinstance(raw, list):
        return raw
    if isinstance(raw, dict):
        if isinstance(raw.get("questions"), list):
            return raw["questions"]
        if isinstance(raw.get("data"), list):
            return raw["data"]
        return []
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            return _normalize_questions(parsed)
        except Exception:
            return [{"question": raw}]
    return []


def _infer_skill_from_question(q: str) -> str:
    """Basic keyword mapping to keep Results UI consistent."""
    s = (q or "").lower()
    if "react" in s:
        return "React"
    if "python" in s:
        return "Python"
    if "sql" in s or "database" in s:
        return "SQL"
    if "project management" in s or "manager" in s:
        return "Project Management"
    if "communication" in s or "team" in s:
        return "Communication"
    if "marketing" in s:
        return "Marketing"
    if "budget" in s or "finance" in s:
        return "Budget Management"
    return "General"
