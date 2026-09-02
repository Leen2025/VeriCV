import json

from django.db import transaction

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from cv.models import CV
from quiz.models import Quiz, Question, Result

from .ai_logic import extract_text_from_pdf, generate_questions_from_cv


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_questions_view(request):
    """
    Generate quiz questions from a stored CV or uploaded PDF.

    Accepts:
        JSON:
            {
                "cv_id": <int>
            }

        OR multipart/form-data with a file under:
            cv
            file
            pdf
            cv_file
            resume
            document

    Returns:
        {
            "quiz_id": <int>,
            "questions": [...]
        }
    """

    cv_file = None

    # --------------------------------------------------
    # 1. Try to use an already stored CV
    # --------------------------------------------------

    cv_id = request.data.get("cv_id")

    if cv_id is not None:
        try:
            cv = CV.objects.get(
                pk=cv_id,
                user=request.user,
            )

            cv_file = cv.file

        except CV.DoesNotExist:
            return Response(
                {"error": "CV not found."},
                status=404,
            )

    # --------------------------------------------------
    # 2. Otherwise try a directly uploaded file
    # --------------------------------------------------

    if cv_file is None:
        allowed_file_keys = [
            "cv",
            "file",
            "pdf",
            "cv_file",
            "resume",
            "document",
        ]

        for key in allowed_file_keys:
            if key in request.FILES:
                cv_file = request.FILES[key]
                break

    if not cv_file:
        return Response(
            {
                "error": (
                    "Please upload a valid PDF file "
                    "or provide cv_id."
                )
            },
            status=400,
        )

    try:
        # --------------------------------------------------
        # 3. Extract CV text
        # --------------------------------------------------

        text = extract_text_from_pdf(cv_file)

        # --------------------------------------------------
        # 4. Generate questions using AI
        # --------------------------------------------------

        questions = generate_questions_from_cv(text)

        # Ensure AI response becomes list[dict]
        questions = _normalize_questions(questions)

        if not questions:
            return Response(
                {"error": "No questions were generated."},
                status=502,
            )

        # --------------------------------------------------
        # 5. Add missing skill/category information
        # --------------------------------------------------

        for question in questions:
            question_text = question.get(
                "question",
                "",
            )

            if not question.get("skill"):
                skill = _infer_skill_from_question(
                    question_text
                )

                question["skill"] = skill

                question["category"] = (
                    "soft"
                    if skill
                    in [
                        "Communication",
                        "Project Management",
                    ]
                    else "technical"
                )

        # --------------------------------------------------
        # 6. Save Quiz + Questions
        # --------------------------------------------------

        with transaction.atomic():
            quiz = Quiz.objects.create(
                user=request.user,
                title="CV Quiz",
            )

            question_objects = []

            for question in questions:
                correct_index = question.get(
                    "correct_index"
                )

                correct_answer = (
                    str(correct_index)
                    if isinstance(correct_index, int)
                    and 0 <= correct_index <= 3
                    else ""
                )

                question_objects.append(
                    Question(
                        quiz=quiz,
                        text=question.get(
                            "question",
                            "",
                        ),
                        options=question.get(
                            "options",
                            [],
                        ),
                        correct_answer=correct_answer,
                        skill=question.get(
                            "skill",
                            "",
                        ),
                        category=question.get(
                            "category",
                            "",
                        ),
                        difficulty=question.get(
                            "difficulty",
                            "",
                        ),
                    )
                )

            saved_questions = (
                Question.objects.bulk_create(
                    question_objects
                )
            )

        # --------------------------------------------------
        # 7. Return real database IDs to frontend
        # --------------------------------------------------

        response_questions = []

        for question, db_question in zip(
            questions,
            saved_questions,
        ):
            item = dict(question)

            item["id"] = db_question.id

            response_questions.append(item)

        return Response(
            {
                "quiz_id": quiz.id,
                "questions": response_questions,
            },
            status=200,
        )

    except Exception as exc:
        return Response(
            {
                "error": (
                    f"Failed to generate questions: "
                    f"{exc}"
                )
            },
            status=500,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_answers_view(request):
    """
    Submit answers for a saved quiz.

    Expected body:
    {
        "quiz_id": 2,
        "answers": [
            {
                "question_id": 20,
                "answer": 0
            },
            {
                "question_id": 21,
                "answer": 2
            }
        ]
    }

    Returns:
    {
        "quiz_id": 2,
        "result_id": 1,
        "overall": 80,
        "skills": [...]
    }
    """

    try:
        quiz_id = request.data.get("quiz_id")
        answers = request.data.get("answers", [])

        if not quiz_id:
            return Response(
                {"error": "quiz_id is required."},
                status=400,
            )

        if not isinstance(answers, list):
            return Response(
                {"error": "answers must be a list."},
                status=400,
            )

        # Make sure this quiz belongs to the logged-in user.
        try:
            quiz = Quiz.objects.get(
                id=quiz_id,
                user=request.user,
            )
        except Quiz.DoesNotExist:
            return Response(
                {"error": "Quiz not found."},
                status=404,
            )

        # Load all questions for this quiz once.
        quiz_questions = {
            question.id: question
            for question in Question.objects.filter(
                quiz=quiz
            )
        }

        correct = 0
        total = 0
        per_skill = {}

        for answer_data in answers:
            question_id = answer_data.get(
                "question_id"
            )
            user_answer = answer_data.get(
                "answer"
            )

            question = quiz_questions.get(
                question_id
            )

            # Ignore IDs that do not belong to this quiz.
            if question is None:
                continue

            skill = question.skill or "General"
            category = (
                question.category
                or "technical"
            )

            if skill not in per_skill:
                per_skill[skill] = {
                    "sum": 0,
                    "count": 0,
                    "category": category,
                }

            # Current VeriCV questions are MCQs.
            if isinstance(user_answer, int):
                try:
                    correct_index = int(
                        question.correct_answer
                    )
                except (
                    TypeError,
                    ValueError,
                ):
                    continue

                total += 1

                if user_answer == correct_index:
                    correct += 1
                    question_score = 100
                else:
                    question_score = 0

                per_skill[skill]["sum"] += (
                    question_score
                )
                per_skill[skill]["count"] += 1

        overall = (
            round(
                (correct / total) * 100
            )
            if total
            else 0
        )

        skills = [
            {
                "skill": skill,
                "score": round(
                    values["sum"]
                    / max(
                        values["count"],
                        1,
                    )
                ),
                "category": values[
                    "category"
                ],
            }
            for skill, values
            in per_skill.items()
        ]

        # Save one result for this quiz/user.
        existing_result = (
            Result.objects
            .filter(
                quiz=quiz,
                user=request.user,
            )
            .first()
        )

        if existing_result:
            existing_result.score = overall
            existing_result.save(
                update_fields=["score"]
            )
            result = existing_result
        else:
            result = Result.objects.create(
                quiz=quiz,
                user=request.user,
                score=overall,
            )

        return Response(
            {
                "quiz_id": quiz.id,
                "result_id": result.id,
                "overall": overall,
                "skills": skills,
            },
            status=200,
        )

    except Exception as exc:
        return Response(
            {"error": str(exc)},
            status=500,
        )


# --------------------------------------------------
# Helpers
# --------------------------------------------------


def _normalize_questions(raw):
    """
    Convert different AI response formats
    into list[dict].
    """

    if raw is None:
        return []

    if isinstance(raw, list):
        return raw

    if isinstance(raw, dict):
        if isinstance(
            raw.get("questions"),
            list,
        ):
            return raw["questions"]

        if isinstance(
            raw.get("data"),
            list,
        ):
            return raw["data"]

        return []

    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)

            return _normalize_questions(
                parsed
            )

        except Exception:
            return [
                {
                    "question": raw
                }
            ]

    return []


def _infer_skill_from_question(question):
    """
    Infer a basic skill from question keywords.

    Used only when the AI response does not
    already contain a skill.
    """

    text = (
        question or ""
    ).lower()

    if "react" in text:
        return "React"

    if "python" in text:
        return "Python"

    if (
        "sql" in text
        or "database" in text
    ):
        return "SQL"

    if (
        "project management" in text
        or "manager" in text
    ):
        return "Project Management"

    if (
        "communication" in text
        or "team" in text
    ):
        return "Communication"

    if "marketing" in text:
        return "Marketing"

    if (
        "budget" in text
        or "finance" in text
    ):
        return "Budget Management"

    return "General"