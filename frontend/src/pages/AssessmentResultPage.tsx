import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, ArrowLeft, Target, Calendar, Trophy } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import api from "@/api/http";
import { getMe } from "@/api/endpoints";

type AssessmentDetail = {
  id: number | string;
  kind: "quiz" | "match";
  title?: string | null;
  score?: number | null;
  date?: string | null;
  skills?: string[] | null;
  missing_keywords?: string[] | null;
  summary?: string | null;
  items?: Array<{
    question: string;
    correct_answer?: string | null;
    user_answer?: string | null;
    is_correct?: boolean | null;
    [k: string]: any;
  }>;
  [k: string]: any;
};

export default function AssessmentResultPage() {
  const { id } = useParams();
  const [data, setData] = useState<AssessmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const me = await getMe();
        setUsername(me.username || null);
      } catch {
        /* not logged in or endpoint unavailable — filename falls back below */
      }
    })();
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Prefer the detail/ path; backend also supports plain <id>/ for compatibility
        const res = await api.get(`/history/detail/${id}/`).catch(async () => api.get(`/history/${id}/`));
        if (!mounted) return;
        const raw = res.data || {};

        const kind: "quiz" | "match" = raw?.kind === "match" ? "match" : "quiz";
        const avg = typeof raw?.average_score === "number" ? raw.average_score : raw?.score ?? null;
        const when = raw?.date ?? raw?.date_created ?? raw?.created_at ?? null;
        const analyzed = raw?.skills_analyzed || {};

        const normalized: AssessmentDetail = {
          id: raw?.id ?? (id as string),
          kind,
          title: raw?.title ?? raw?.position ?? (kind === "match" ? "Job Match" : "Quiz"),
          score: typeof avg === "number" ? Math.round(avg) : null,
          date: when,
          skills:
            kind === "quiz"
              ? Array.isArray(raw?.skills)
                ? raw.skills
                : Object.keys(analyzed).filter((k) => typeof analyzed[k] === "number")
              : [],
          missing_keywords: kind === "match" && Array.isArray(analyzed?.missing_keywords) ? analyzed.missing_keywords : [],
          summary: kind === "match" && typeof analyzed?.summary === "string" ? analyzed.summary : null,
          items: Array.isArray(raw?.items) ? raw.items : [],
        };
        setData(normalized);
      } catch (e: any) {
        setErr("Unable to load this result.");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  const reportFilename = (): string => {
    const base = username && username.trim() ? username.trim() : "vericv-user";
    const safe = base.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    const kindLabel = data?.kind === "match" ? "match" : "quiz";
    return `${safe || "vericv-user"}-${kindLabel}-results.pdf`;
  };

  const downloadReport = async () => {
    try {
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

      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = reportFilename();
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("PDF download failed", e);
    }
  };

  if (loading) return <div className="p-6">Loading…</div>;
  if (err)
    return (
      <div className="p-6">
        <p className="mb-4">{err}</p>
        <Button asChild variant="outline">
          <Link to="/dashboard">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Link>
        </Button>
      </div>
    );
  if (!data) return null;

  return (
    <div className="min-h-screen bg-gradient-hero py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div ref={reportRef} className="bg-white p-2">
          <div className="text-center mb-8">
            <Trophy className="w-16 h-16 gradient-primary text-white p-3 rounded-full mx-auto mb-4 shadow-glow" />
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              {data.kind === "match" ? "Job Match Result" : "Your Quiz Results"}
            </h1>
            <p className="text-muted-foreground">
              {data.kind === "match"
                ? "How your CV compares against this job description"
                : "Here's your personalized skill analysis and improvement roadmap"}
            </p>
          </div>

          <Card className="shadow-large mb-6">
            <CardContent className="p-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">
                    {data.kind === "match" ? "Match Score" : "Score"}
                  </div>
                  <div className="text-4xl font-bold text-primary">
                    {typeof data.score === "number" ? `${data.score}%` : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                    <Calendar className="w-4 h-4" /> Date
                  </div>
                  <div className="text-lg font-semibold">
                    {data.date ? new Date(data.date).toLocaleDateString() : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">
                    {data.kind === "match" ? "Position" : "Title"}
                  </div>
                  <div className="text-lg font-semibold">{data.title || "—"}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {data.kind === "quiz" ? (
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Skills Covered
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(data.skills ?? []).length ? (
                  <div className="flex flex-wrap gap-2">
                    {(data.skills ?? []).map((s) => (
                      <Badge key={s} variant="outline">
                        {s}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No skill breakdown available for this quiz.</p>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {data.summary && (
                <Card className="shadow-medium mb-6">
                  <CardHeader>
                    <CardTitle>Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{data.summary}</p>
                  </CardContent>
                </Card>
              )}
              <Card className="shadow-medium">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Missing Keywords
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(data.missing_keywords ?? []).length ? (
                    <div className="flex flex-wrap gap-2">
                      {(data.missing_keywords ?? []).map((k) => (
                        <Badge key={k} variant="outline">
                          {k}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No missing keywords detected.</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Button variant="hero" size="lg" onClick={downloadReport}>
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}