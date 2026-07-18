import os
import json
import requests
from dotenv import load_dotenv
from PyPDF2 import PdfReader
from pdf2image import convert_from_path
import pytesseract
import tempfile
import re
import logging
import time

# Setup logging instead of print statements
logger = logging.getLogger(__name__)

# Load API key
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# -- Extract Text --
def extract_text_from_pdf(file):
    """Extract text from a PDF file (supports OCR for scanned resumes)."""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
        for chunk in file.chunks():
            tmp_file.write(chunk)
        temp_path = tmp_file.name

    text = ""
    try:
        reader = PdfReader(temp_path)
        for page in reader.pages:
            text += page.extract_text() or ""

        if not text.strip():
            logger.info("No text detected — switching to OCR mode...")
            images = convert_from_path(temp_path)
            for img in images:
                text += pytesseract.image_to_string(img)

        logger.info(f"Extracted text preview: {text[:400]}")
        return text[:4000]
    finally:
        os.remove(temp_path)


# --- Generate Quiz Questions ---
def generate_questions_from_cv(cv_text):
    """Send resume text to Groq API and generate professional questions."""
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    prompt = f"""
You are an experienced HR and technical interviewer working for an AI-powered resume assessment platform called VeriCV.
Analyze the following resume content carefully:
---
{cv_text}
---
Extract all *technical* and *soft* skills mentioned or implied, then rank them by importance and relevance.

Generate a total of **up to 25 MCQs maximum**, focusing on the most important skills.
Allocate 1–3 questions per skill depending on importance.
Vary difficulty across easy, medium, and hard.
Never exceed 25 questions total.

Each question must include:
"question": the question text
"options": a list of 4 possible answers
"correct_index": integer 0–3
"skill": the specific skill being tested
"difficulty": "easy", "medium", or "hard"
"category": "technical" or "soft"

Output format example:
[
  {{
    "question": "Which command initializes a Git repository?",
    "options": ["git init", "git start", "git new", "git repo"],
    "correct_index": 0,
    "skill": "Git",
    "difficulty": "easy",
    "category": "technical"
  }}
]
Return ONLY this JSON array — no markdown, no extra text.
"""
    data = {"model": "groq/compound", "messages": [{"role": "user", "content": prompt}]}

    for attempt in range(3):
        response = requests.post(url, headers=headers, json=data, timeout=45)
        if response.status_code == 429:
            logger.warning(":warning: Groq rate limit hit. Retrying in 3 seconds...")
            time.sleep(3)
            continue
        break

    if response.status_code == 200:
        content = response.json()["choices"][0]["message"]["content"]
        logger.info(f"Raw model output: {content[:500]}")
        match = re.search(r"(\{.*\}|\[.*\])", content, re.DOTALL)
        if match:
            content = match.group(1).strip()

        try:
            parsed = json.loads(content)
            if isinstance(parsed, list) and len(parsed) > 25:
                parsed = parsed[:25]
            return parsed
        except json.JSONDecodeError:
            logger.warning("JSON parsing failed. Attempting cleanup...")
            cleaned = content.strip().replace("```json", "").replace("```", "")
            try:
                parsed = json.loads(cleaned)
                if isinstance(parsed, list) and len(parsed) > 25:
                    parsed = parsed[:25]
                return parsed
            except Exception:
                logger.error(f"Invalid JSON after cleanup: {cleaned[:500]}")
                return []
    else:
        logger.error(f"Groq API Error ({response.status_code}): {response.text}")
        return []

# --- Generate Feedback ---
def generate_feedback_from_ai(wrong_answers, percent):
    """Generate professional feedback based on user's wrong answers."""
    if not wrong_answers:
        return "Excellent work! You answered all questions correctly. "

    summary = f"Score: {percent:.1f}%\nIncorrect answers:\n"
    for w in wrong_answers:
        summary += f"- Question: {w['question']}\nYour answer: {w['chosen']}\nCorrect: {w['correct']}\n"

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"}

    prompt = f"""
You are a career coach and HR expert.

The candidate scored {percent:.1f}% on a professional interview test.
Here are the incorrect questions:
{summary}

Write feedback that:
- Identifies improvement areas.
- Gives clear, practical advice.
- Encourages and motivates the candidate.
"""

    data = {"model": "groq/compound-mini", "messages": [{"role": "user", "content": prompt}]}
    response = requests.post(url, headers=headers, json=data, timeout=30)

    if response.status_code == 200:
        return response.json()["choices"][0]["message"]["content"]
    else:
        return f"Error while generating feedback: {response.text}"


def _parse_match_score(value):
    """Parse match score from various formats and clamp to 0..100.

    Accepts int, float, or strings like "78", "78.5", "78%".
    Returns an int or None if parsing fails.
    """
    try:
        if isinstance(value, (int, float)):
            return max(0, min(100, int(round(float(value)))))
        if isinstance(value, str):
            m = re.search(r"(\d+(?:\.\d+)?)", value)
            if m:
                return max(0, min(100, int(round(float(m.group(1))))))
    except Exception:
        pass
    return None


def _tokenize(text):
    tokens = re.findall(r"[A-Za-z0-9+#\.\-]+", (text or "").lower())
    # Lightweight stopword filter to reduce noise
    stop = {
        "the","and","for","with","that","this","your","you","are","our","job","role","a","an","to","of","in","on","as","by","be","is","at","we","us","they","he","she","it","from","or","will","have","has","had","not","but","if","then","than","into","within","per","about","over","under","across","into","out","up","down"
    }
    return {t for t in tokens if len(t) > 2 and t not in stop}


def _compute_fallback_match(cv_text, job_description, position):
    """Heuristic match score and missing keywords if AI is unavailable.

    Computes overlap between JD and CV tokens + position bonus.
    """
    cv_tokens = _tokenize(cv_text)
    jd_tokens = _tokenize(job_description)
    pos_tokens = _tokenize(position)

    if not jd_tokens:
        return 0, []

    overlap = len(cv_tokens & jd_tokens)
    base = int(round((overlap / max(len(jd_tokens), 1)) * 100))

    # Small bonus if position tokens appear in CV
    pos_overlap = len(cv_tokens & pos_tokens)
    bonus = min(10, pos_overlap * 3)

    score = max(0, min(100, base + bonus))

    # Missing keywords: top terms in JD not present in CV (limit 10)
    missing = [t for t in jd_tokens if t not in cv_tokens]
    # Prefer more "important" looking tokens (longer first)
    missing.sort(key=lambda x: (-len(x), x))
    missing = missing[:10]

    return score, missing


# --- Job Match Analysis (AI-Powered + Improvement Advice) ---
def analyze_job_match(cv_text, job_description, position):
    """
    Compare a candidate’s CV with a job posting and return an AI-based match report.
    Includes match score, missing keywords, professional feedback, and advice for improvement.
    """
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    # --- AI Prompt ---
    prompt = f"""
You are a senior recruiter, HR expert, and resume coach working for an AI platform called VeriCV.

Your task is to analyze how well this resume fits the following job:

---
Job Title: {position}
Job Description: {job_description}
---
Candidate Resume:
{cv_text}
---

Please do the following:

1. Evaluate how well the resume matches the job title and description.
2. Give a **match score (0–100)** indicating the overall compatibility.
3. List **missing or weak keywords/skills** that could improve the match.
4. Write a **short professional feedback summary (2–3 sentences)**, from an HR perspective.
5. Suggest **clear, actionable advice** explaining *what the candidate should change* in the CV to improve the match.

Return **only valid JSON** in this exact format — no text or markdown before or after:
{{
  "match_score": <integer>,
  "missing_keywords": [<list of strings>],
  "summary": "<short feedback summary>",
  "improvement_advice": "<specific advice for improving the CV>"
}}

Example:
{{
  "match_score": 78,
  "missing_keywords": ["REST APIs", "Team Leadership"],
  "summary": "Good technical foundation but lacks API integration and leadership experience.",
  "improvement_advice": "Include a section describing REST API projects and leadership roles to improve your match score."
}}
"""

    # --- Send Request to Groq ---
    data = {"model": "groq/compound", "messages": [{"role": "user", "content": prompt}]}
    response = requests.post(url, headers=headers, json=data, timeout=60)

    # --- Handle Response ---
    if response.status_code == 200:
        try:
            content = response.json()["choices"][0]["message"]["content"]
            # Extract JSON only
            match = re.search(r"(\{.*\})", content, re.DOTALL)
            if match:
                content = match.group(1).strip()
            result = json.loads(content)

            # Robust score parsing with fallbacks
            score = _parse_match_score(
                result.get("match_score")
                or result.get("score")
                or result.get("match")
                or result.get("compatibility")
            )

            missing = result.get("missing_keywords", [])
            if isinstance(missing, str):
                # Accept comma-separated string
                missing = [s.strip() for s in missing.split(",") if s.strip()]
            if not isinstance(missing, list):
                missing = []

            if score is None:
                # Derive fallback score and missing keywords
                score, derived_missing = _compute_fallback_match(cv_text, job_description, position)
                if not missing:
                    missing = derived_missing

            return {
                "match_score": int(score if score is not None else 0),
                "missing_keywords": missing,
                "summary": result.get("summary", "No feedback provided."),
                "improvement_advice": result.get("improvement_advice", "No advice provided.")
            }
        except Exception as e:
            logger.error(f"Job match parsing error: {e}")
            score, missing = _compute_fallback_match(cv_text, job_description, position)
            return {
                "match_score": int(score),
                "missing_keywords": missing,
                "summary": "Generated via fallback heuristic due to AI parsing error.",
                "improvement_advice": "Add missing keywords and align CV with the job description to improve the score."
            }
    else:
        logger.error(f"Groq API Error ({response.status_code}): {response.text}")
        score, missing = _compute_fallback_match(cv_text, job_description, position)
        return {
            "match_score": int(score),
            "missing_keywords": missing,
            "summary": "Generated via fallback heuristic due to AI service unavailability.",
            "improvement_advice": "Add missing keywords and align CV with the job description to improve the score."
        }
