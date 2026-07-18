import { useMemo, useRef, useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  TrendingUp,
  Target,
  BookOpen,
  ArrowRight,
  Download,
  Share,
} from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { toast } from "@/components/ui/sonner";
import { addHistory, getHistoryDetail } from "@/api/endpoints";

console.log("ResultsPage loaded from:", import.meta.url);

export default function ResultsPage() {
  const location = useLocation() as any;
  const state = location?.state || {};
  console.log("Router state on load:", state);
  const reportRef = useRef<HTMLDivElement>(null);
  const [detail, setDetail] = useState<{
    overall?: number;
    skills?: Array<{ skill: string; score: number; category?: string }>;
  } | null>(null);

  // ✅ Fallback: load from localStorage if state is empty
  if (!state?.overallScore && !state?.overall && !state?.skills) {
    const storedScore = localStorage.getItem("ai_score");
    const storedResults = localStorage.getItem("ai_results");
    if (storedScore && storedResults) {
      try {
        state.overallScore = Number(storedScore);
        state.skills = JSON.parse(storedResults);
        console.log("✅ Loaded results from localStorage");
      } catch (err) {
        console.warn("⚠️ Failed to parse stored results:", err);
      }
    }
  }

  // ----- Helpers -----
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 70) return "text-primary";
    return "text-destructive";
  };
  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-success";
    if (score >= 70) return "bg-primary";
    return "bg-destructive";
  };

  // ----- Summarizer -----
  const summarized = useMemo(() => {
    // Prefer fetched detail if available
    if (detail && typeof detail.overall === "number" && Array.isArray(detail.skills) && detail.skills.length) {
      return { overallScore: detail.overall, skills: detail.skills, recommendations: [] };
    }
    // ✅ Prefer real data from QuizPage/backend
    if (
      state &&
      (typeof state.overallScore === "number" || typeof state.overall === "number") &&
      Array.isArray(state.skills) &&
      state.skills.length > 0
    ) {
      console.log("✅ Using real data from QuizPage/backend");
      console.log("Skills received:", state.skills);
      return {
        overallScore: state.overall ?? state.overallScore,
        skills: state.skills,
        recommendations: state.recommendations || [],
      };
    }

    // 🧠 Fallback: try localStorage
    const storedScore = localStorage.getItem("ai_score");
    const storedResults = localStorage.getItem("ai_results");
    if (storedScore && storedResults) {
      try {
        console.log("🧠 Using fallback data from localStorage");
        return {
          overallScore: Number(storedScore),
          skills: JSON.parse(storedResults),
          recommendations: [],
        };
      } catch {
        console.warn("⚠️ Failed to parse stored results");
      }
    }

    // ⚙️ Last resort: build from questions (dummy)
    console.log("⚙️ Using dummy summary fallback");
    const qs: any[] = Array.isArray(state?.questions) ? state.questions : [];
    const ans: Record<number, number | string> = state?.answers || {};
    let correct = 0;
    let total = 0;
    const skillScores: Record<string, { sum: number; count: number; category: string }> = {};

    qs.forEach((q, i) => {
      const hasOptions = Array.isArray(q.options) && q.options.length > 0;
      const skill = q.skill || q.topic || "General";
      const category = q.category || (skill === "Communication" ? "soft" : "technical");

      if (hasOptions && typeof q.correctAnswer === "number") {
        total += 1;
        if (ans[i] === q.correctAnswer) correct += 1;
      }

      const thisScore =
        hasOptions && typeof q.correctAnswer === "number"
          ? ans[i] === q.correctAnswer
            ? 100
            : 0
          : 70;

      if (!skillScores[skill]) skillScores[skill] = { sum: 0, count: 0, category };
      skillScores[skill].sum += thisScore;
      skillScores[skill].count += 1;
    });

    const skills = Object.entries(skillScores).map(([skill, agg]) => ({
      skill,
      score: Math.round(agg.sum / Math.max(1, agg.count)),
      category: agg.category,
    }));

    const overallScore =
      total > 0
        ? Math.round((correct / total) * 100)
        : Math.round(skills.reduce((acc, s) => acc + s.score, 0) / Math.max(1, skills.length));

    return { overallScore, skills, recommendations: [] };
  }, [state, detail]); // ✅ depend on state

  // Try to load full details when navigating from Dashboard with only an id
  useEffect(() => {
    const id = state?.id as number | string | undefined;
    const hasScoredSkills = Array.isArray(state?.skills) && state.skills.some((s: any) => typeof s?.score === "number");
    if (!id || hasScoredSkills) return;
    (async () => {
      try {
        const data = await getHistoryDetail(id);
        const skillsAnalyzed = (data as any)?.skills_analyzed || {};
        const skills = Object.entries(skillsAnalyzed)
          .filter(([, v]) => typeof v === "number")
          .map(([skill, score]) => ({ skill, score: Math.round(Number(score)), category: "technical" }));
        setDetail({ overall: Number((data as any)?.average_score) || 0, skills });
      } catch {
        /* ignore */
      }
    })();
  }, [state]);
  const strengths = (summarized.skills || []).filter((s) => s.score >= 80);
  const improvements = (summarized.skills || []).filter((s) => s.score < 70);

  // Persist the assessment to history only when explicitly requested
  const persistedRef = useRef(false);
  useEffect(() => {
    if (persistedRef.current) return;
    if (state?.persistHistory !== true) return; // view-only visits should not re-add history
    const overall = summarized?.overallScore;
    const skillsArr: any[] = Array.isArray(summarized?.skills) ? summarized.skills : [];
    if (typeof overall !== "number" || !skillsArr.length) return;

    const skillsAnalyzed: Record<string, number> = {};
    for (const s of skillsArr) {
      if (s && typeof s === "object") {
        const key = (s.skill ?? s.name ?? s.topic ?? "").toString();
        if (key) skillsAnalyzed[key] = typeof s.score === "number" ? s.score : 0;
      } else if (typeof s === "string") {
        skillsAnalyzed[s] = 0;
      }
    }
    const position = (state?.position || state?.jobTitle || state?.title || "CV Assessment") as string;

    (async () => {
      try {
        await addHistory({ position, average_score: overall, skills_analyzed: skillsAnalyzed });
        persistedRef.current = true;
      } catch (e) {
        // non-blocking; console only
        console.warn("Failed to persist assessment history", e);
      }
    })();
  }, [summarized, state]);

  // ----- Actions -----
  const renderReportToPdfBlob = async (): Promise<Blob> => {
    const el = reportRef.current;
    if (!el) throw new Error("Report content not ready");
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
    const imgWidth = canvas.width * ratio;
    const imgHeight = canvas.height * ratio;
    const x = (pageWidth - imgWidth) / 2;
    const y = (pageHeight - imgHeight) / 2;
    pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight, undefined, "FAST");
    return pdf.output("blob");
  };

  const downloadReport = async () => {
    try {
      const blob = await renderReportToPdfBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "vericv-results.pdf";
      a.click();
      URL.revokeObjectURL(url);
      toast("Results PDF downloaded");
    } catch (e: any) {
      console.error("PDF download failed", e);
      toast("Failed to generate PDF");
    }
  };

  const shareResults = async () => {
    try {
      const blob = await renderReportToPdfBlob();
      const file = new File([blob], "vericv-results.pdf", { type: "application/pdf" });
      // Prefer Web Share API with files
      if ((navigator as any).canShare && (navigator as any).canShare({ files: [file] }) && (navigator as any).share) {
        await (navigator as any).share({
          title: "My VeriCV Results",
          text: "Here are my VeriCV quiz results.",
          files: [file],
        });
        return;
      }
      // Fallback: copy link to clipboard
      await navigator.clipboard.writeText(window.location.href);
      toast("Link copied to clipboard");
    } catch (e: any) {
      console.error("Share failed", e);
      toast("Sharing failed");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero py-8">
      <div className="container mx-auto px-4 max-w-6xl" ref={reportRef}>
        {/* Header */}
        <div className="text-center mb-8">
          <Trophy className="w-16 h-16 gradient-primary text-white p-3 rounded-full mx-auto mb-4 shadow-glow" />
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Your Assessment Results</h1>
          <p className="text-lg text-muted-foreground">
            Here&apos;s your personalized skill analysis and improvement roadmap
          </p>
        </div>

        {/* Empty State */}
        {!summarized?.skills?.length ? (
          <Card className="shadow-large">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                No results to display yet. Please complete a quiz first.
              </p>
              <div className="mt-6">
                <Button asChild variant="hero" size="lg">
                  <Link to="/quiz">
                    Go to Quiz
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Overall Score */}
            <Card className="shadow-large mb-8">
              <CardContent className="p-8 text-center">
                <div className="flex items-center justify-center space-x-8">
                  <div>
                    <div className="text-5xl font-bold gradient-primary bg-clip-text text-transparent mb-2">
                      {summarized.overallScore}%
                    </div>
                    <p className="text-muted-foreground">Overall Score</p>
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-semibold mb-2">
                      {summarized.overallScore >= 80
                        ? "Excellent Performance!"
                        : summarized.overallScore >= 60
                        ? "Good Job!"
                        : "Needs Improvement"}
                    </h3>
                    <p className="text-muted-foreground max-w-md">
                      {summarized.overallScore >= 80
                        ? "You’ve demonstrated strong capabilities. Keep refining your skills."
                        : summarized.overallScore >= 60
                        ? "You did well! Focus on weaker areas to improve."
                        : "Don’t worry—review the recommendations below and try again."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Skill Breakdown + Strengths/Improvements */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Skill Breakdown */}
              <Card className="shadow-medium">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="w-5 h-5" />
                    <span>Skill Breakdown</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {summarized.skills.map((result: any) => (
                      <div key={result.skill} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{result.skill}</span>
                            <Badge
                              variant={result.category === "soft" ? "secondary" : "default"}
                              className="text-xs"
                            >
                              {result.category || "technical"}
                            </Badge>
                          </div>
                          <span className={`font-bold ${getScoreColor(result.score)}`}>
                            {result.score}%
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(
                              result.score
                            )}`}
                            style={{ width: `${result.score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Strengths & Improvements */}
              <div className="space-y-6">
                {/* Strengths */}
                <Card className="shadow-medium">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-success">
                      <TrendingUp className="w-5 h-5" />
                      <span>Your Strengths</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {strengths.length ? (
                        strengths.map((strength) => (
                          <div key={strength.skill} className="flex items-center justify-between">
                            <span>{strength.skill}</span>
                            <Badge variant="secondary" className="bg-success/10 text-success">
                              {strength.score}%
                            </Badge>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">We&apos;ll highlight strengths here.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Focus Areas */}
                <Card className="shadow-medium">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-primary">
                      <Target className="w-5 h-5" />
                      <span>Focus Areas</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {improvements.length ? (
                        improvements.map((improvement) => (
                          <div key={improvement.skill} className="flex items-center justify-between">
                            <span>{improvement.skill}</span>
                            <Badge variant="outline" className="border-primary text-primary">
                              {improvement.score}%
                            </Badge>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No critical gaps detected.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Recommendations */}
            {!!summarized.recommendations?.length && (
              <Card className="shadow-medium mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BookOpen className="w-5 h-5" />
                    <span>Personalized Recommendations</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {summarized.recommendations.map((rec: any) => (
                      <div key={rec.skill} className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-2">{rec.skill}</h4>
                        <p className="text-sm text-muted-foreground mb-3">{rec.suggestion}</p>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Recommended Resources:</p>
                          {(rec.resources || []).map((resource: string) => (
                            <Badge key={resource} variant="outline" className="mr-2 text-xs">
                              {resource}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="lg" onClick={downloadReport}>
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </Button>
              <Button variant="outline" size="lg" onClick={shareResults}>
                <Share className="w-4 h-4 mr-2" />
                Share Results
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}




