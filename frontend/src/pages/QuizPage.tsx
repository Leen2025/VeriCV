// src/pages/QuizPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, ArrowLeft, ArrowRight, Upload as UploadIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { aiGenerateFromCVId, aiGenerateFromFileSmart, submitAnswers } from "@/api/endpoints";
import { useNavigate } from "react-router-dom"; // ✅ import this

type Question = {
  id?: number | string;
  question: string;
  options?: string[];
  correctAnswer?: number;   // optional; backend may not return it
  skill?: string;
  topic?: string;
  category?: "technical" | "soft" | string;
};

type QuizState = "generating" | "ready" | "submitting" | "completed" | "error";

export default function QuizPage() {
  const [status, setStatus] = useState<QuizState>("generating");
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number | string>>({});
  const [timeLeft, setTimeLeft] = useState(10 * 60); // 10 minutes
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const nav = useNavigate(); // now available
  const { toast } = useToast();

  const cvId = useMemo(() => localStorage.getItem("last_cv_id"), []);

  function inferSkillFromText(qText: string): string {
    const s = (qText || "").toLowerCase();
    // Programming / Frameworks
    if (s.includes("python") || s.includes("django") || s.includes("flask")) return "Python";
    if (s.includes("java") || s.includes("jvm")) return "Java";
    if (s.includes("javascript") || s.includes("typescript")) return "JavaScript/TypeScript";
    if (s.includes("react") || s.includes("component") || s.includes("hook")) return "React";
    if (s.includes("node") || s.includes("express")) return "Node.js";
    // Data / Databases
    if (s.includes("sql") || s.includes("query") || s.includes("join") || s.includes("database")) return "SQL";
    if (s.includes("mongodb") || s.includes("nosql")) return "NoSQL";
    // DevOps / Cloud
    if (s.includes("docker") || s.includes("container")) return "Docker";
    if (s.includes("kubernetes") || s.includes("k8s")) return "Kubernetes";
    if (s.includes("aws") || s.includes("s3") || s.includes("lambda")) return "AWS";
    if (s.includes("ci/cd") || s.includes("pipeline") || s.includes("github actions")) return "CI/CD";
    // Web / API
    if (s.includes("http") || s.includes("rest") || s.includes("endpoint") || s.includes("status code")) return "API Design";
    if (s.includes("html") || s.includes("css")) return "Web Fundamentals";
    // Soft / PM
    if (s.includes("communication") || s.includes("teamwork") || s.includes("leadership")) return "Communication";
    if (s.includes("project") && s.includes("management")) return "Project Management";
    if (s.includes("agile") || s.includes("scrum")) return "Agile/Scrum";
    return "General";
  }
  function inferCategoryFromSkill(skill: string): "technical" | "soft" {
    const soft = ["Communication", "Project Management", "Agile/Scrum"];
    return soft.includes(skill) ? "soft" : "technical";
  }
  // helper: normalize API shapes
  function normalize(raw: any): Question[] {
    if (!raw) return [];
    const arr = Array.isArray(raw) ? raw : raw.questions || [];
    return arr.map((q: any, i: number) => {
      const text = q.question ?? q.prompt ?? q.text ?? String(q);
      // Prefer backend-provided fields; otherwise infer from text
      const skill = q.skill ?? q.topic ?? inferSkillFromText(text);
      const category = q.category ?? inferCategoryFromSkill(skill);
      // Accept correctAnswer or correct_index from backend
      const correctAnswer =
        typeof q.correctAnswer === "number"
          ? q.correctAnswer
          : typeof (q as any).correct_index === "number"
            ? (q as any).correct_index
            : undefined;
      return {
        id: q.id ?? i + 1,
        question: text,
        options: Array.isArray(q.options) ? q.options : undefined,
        correctAnswer,
        skill,
        category,
      };
    });
  }
  useEffect(() => {
    let mounted = true;
    (async () => {
      setStatus("generating");
      setError(null);
      try {
        if (cvId) {
          const data = await aiGenerateFromCVId(cvId);
          const qs = normalize(data);
          if (!qs.length) throw new Error("No questions were generated. Please try again.");
          if (mounted) {
            setQuestions(qs);
            setStatus("ready");
          }
        } else {
          // No cvId? allow manual upload flow
          setStatus("ready");
        }
      } catch (e: any) {
        const msg = e?.response?.data?.error || e?.message || 'Failed to generate questions.';
        setError(msg);
        try { toast({ title: 'Generation Error', description: msg, variant: 'destructive' }); } catch {}
        setStatus('ready');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [cvId]);
  useEffect(() => {
    if (status !== "ready") return;
    if (timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [status, timeLeft]);
  const progress = questions.length ? ((current + 1) / questions.length) * 100 : 0;
  const handleAnswerSelect = (val: number | string) => {
    setAnswers((prev) => ({ ...prev, [current]: val }));
  };
  const handleNext = () => {
    if (current < questions.length - 1) setCurrent((i) => i + 1);
  };
  const handlePrev = () => {
    if (current > 0) setCurrent((i) => i - 1);
  };
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  };
  const submit = async () => {
    setStatus("submitting");
    try {
      // Build payload for backend (keep var names)
      const payload = questions.map((q, idx) => ({
        question: q.question,
        answer: answers[idx],
        correct_index:
          typeof q.correctAnswer === "number"
            ? q.correctAnswer
            : typeof (q as any).correct_index === "number"
              ? (q as any).correct_index
              : undefined,
        skill: q.skill,
        category: q.category,
      }));
      // Use backend scoring if available
      const data = await submitAnswers(payload);
      // Local fallback calculation (kept intact)
      const total = questions.filter(
        (q) => Array.isArray(q.options) && typeof q.correctAnswer === "number"
      ).length;
      const correct = questions.reduce((acc, q, i) => {
        if (Array.isArray(q.options) && typeof q.correctAnswer === "number" && answers[i] === q.correctAnswer) {
          return acc + 1;
        }
        return acc;
      }, 0);
      const overallScore = total > 0 ? Math.round((correct / total) * 100) : 75;
      const perSkill: Record<string, { sum: number; count: number; category: string }> = {};
      questions.forEach((q, i) => {
        const skill = q.skill || q.topic || "General";
        const category = q.category || (skill === "Communication" ? "soft" : "technical");
        const hasOpt = Array.isArray(q.options) && typeof q.correctAnswer === "number";
        const thisScore = hasOpt ? (answers[i] === q.correctAnswer ? 100 : 0) : 70;
        if (!perSkill[skill]) perSkill[skill] = { sum: 0, count: 0, category };
        perSkill[skill].sum += thisScore;
        perSkill[skill].count += 1;
      });
      const skills = Object.entries(perSkill).map(([skill, agg]) => ({
        skill,
        score: Math.round(agg.sum / Math.max(1, agg.count)),
        category: agg.category,
      }));
      // Prefer backend data if present
      const finalOverall = typeof data?.overall === "number" ? data.overall : overallScore;
      const finalSkills = Array.isArray(data?.skills) ? data.skills : skills;
      nav("/results", {
        state: {
          persistHistory: true,
          overallScore: finalOverall,
          skills: finalSkills,
          answers,
          questions,
        },
      });
      localStorage.setItem("ai_score", String(finalOverall));
      localStorage.setItem("ai_results", JSON.stringify(finalSkills));
      setStatus("completed");
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Failed to submit answers.");
      setStatus("error");
    }
  };
  const handleLocalPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setError("Please choose a PDF file.");
      setPdfFile(null);
      return;
    }
    setError(null);
    setPdfFile(f);
  };
  const generateFromFile = async () => {
    if (!pdfFile) return;
    setStatus("generating");
    setError(null);
    setQuestions([]);
    try {
      const data = await aiGenerateFromFileSmart(pdfFile);
      const qs = normalize(data);
      if (!qs.length) throw new Error("No questions were generated from the PDF.");
      setQuestions(qs);
      setCurrent(0);
      setAnswers({});
      setStatus("ready");
    } catch (e: any) {
      const msg2 = e?.response?.data?.error || e?.message || 'Generation failed.';
      setError(msg2);
      try { toast({ title: 'Generation Error', description: msg2, variant: 'destructive' }); } catch {}
      setStatus('ready');
    }
  };
  /* ---------- UI ---------- */
  if (status === "generating") {
    return (
      <div className="min-h-screen bg-gradient-hero py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card className="shadow-medium">
            <CardContent className="p-12 text-center">
              <div className="w-12 h-12 gradient-primary rounded-full mx-auto mb-4 animate-pulse" />
              <h2 className="text-2xl font-bold mb-2">Generating Questions...</h2>
              <p className="text-muted-foreground">Please wait while we create your personalized quiz</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  if (status === "completed") {
    return (
      <div className="min-h-screen bg-gradient-hero py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card className="shadow-large text-center">
            <CardContent className="p-12">
              <CheckCircle className="w-16 h-16 text-success mx-auto mb-6" />
              <h1 className="text-3xl font-bold mb-4">Quiz Completed!</h1>
              <p className="text-lg text-muted-foreground mb-8">
                Great job! Your answers have been submitted.
              </p>
              <Button
                variant="hero"
                size="lg"
                onClick={() =>
                  nav("/results", {
                    state: {
                      persistHistory: true,
                      overallScore: localStorage.getItem("ai_score")
                        ? Number(localStorage.getItem("ai_score"))
                        : undefined,
                      skills: localStorage.getItem("ai_results")
                        ? JSON.parse(localStorage.getItem("ai_results")!)
                        : [],
                      answers,
                      questions,
                    },
                  })
                }
              >
                View Results
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-hero py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Skill Assessment Quiz</h1>
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="font-mono">{formatTime(timeLeft)}</span>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">
            {questions.length ? <>Question {current + 1} of {questions.length}</> : <>Upload a PDF to begin</>}
          </p>
        </div>
        {/* Manual upload when no cvId/questions */}
        {!cvId && !questions.length && (
          <Card className="shadow-large mb-8">
            <CardHeader>
              <CardTitle>Upload a PDF CV</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <input type="file" accept="application/pdf,.pdf" onChange={handleLocalPick} />
                {pdfFile && <span className="text-sm">Selected: <strong>{pdfFile.name}</strong></span>}
              </div>
              <Button variant="hero" size="lg" className="gap-2" onClick={generateFromFile} disabled={!pdfFile}>
                <UploadIcon className="w-4 h-4" />
                Generate from PDF
              </Button>
              {error && <div className="text-red-600 text-sm">{error}</div>}
            </CardContent>
          </Card>
        )}
        {/* Question Card */}
        {questions.length > 0 && (
          <Card className="shadow-large mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{questions[current].question}</CardTitle>
                {questions[current].skill && (
                  <span className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full">
                    {questions[current].skill}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* MCQ options */}
              {Array.isArray(questions[current].options) && questions[current].options!.length > 0 ? (
                <div className="space-y-3">
                  {questions[current].options!.map((opt, idx) => {
                    const selected = answers[current] === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleAnswerSelect(idx)}
                        className={`w-full p-4 text-left rounded-lg border-2 transition-all ${selected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                          }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-4 h-4 rounded-full border-2 ${selected ? "border-primary bg-primary" : "border-muted-foreground"
                              }`}
                          />
                          <span>{opt}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                // Short answer fallback
                <div className="space-y-3">
                  <textarea
                    className="w-full min-h-[120px] rounded-lg border border-border p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Type your answer here..."
                    value={typeof answers[current] === "string" ? (answers[current] as string) : ""}
                    onChange={(e) => handleAnswerSelect(e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {/* Nav */}
        {questions.length > 0 && (
          <div className="flex justify-between">
            <Button variant="outline" onClick={handlePrev} disabled={current === 0}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            {current === questions.length - 1 ? (
              <Button
                variant="hero"
                onClick={submit}
                disabled={answers[current] === undefined || status === "submitting"}
              >
                {status === "submitting" ? "Submitting…" : "Submit Quiz"}
              </Button>
            ) : (
              <Button variant="hero" onClick={handleNext} disabled={answers[current] === undefined}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        )}
        {status === "error" && error && <div className="text-red-600 text-sm mt-4">{error}</div>}
      </div>
    </div>
  );
}









