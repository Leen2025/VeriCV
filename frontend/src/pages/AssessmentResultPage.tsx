import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/api/http";

type AssessmentDetail = {
  id: number | string;
  kind?: string | null;
  title?: string | null;
  score?: number | null;
  date?: string | null;
  skills?: string[] | null;
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

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Prefer the detail/ path; backend also supports plain <id>/ for compatibility
        const res = await api.get(`/history/detail/${id}/`).catch(async () => api.get(`/history/${id}/`));
        if (!mounted) return;
        const raw = res.data || {};

        // Guard: only allow quiz results
        const kind = raw?.kind ?? raw?.type ?? "quiz";
        if (kind !== "quiz") {
          setErr("This result is not a quiz assessment.");
          return;
        }

        // Normalize backend shape to UI-friendly fields
        const avg = typeof raw?.average_score === "number" ? raw.average_score : raw?.score ?? null;
        const when = raw?.date ?? raw?.date_created ?? raw?.created_at ?? null;
        const analyzed = raw?.skills_analyzed || {};
        const skillEntries = Array.isArray(raw?.skills)
          ? raw.skills
          : Object.keys(analyzed).filter((k) => typeof analyzed[k] === "number");

        const normalized: AssessmentDetail = {
          id: raw?.id ?? (id as string),
          kind,
          title: raw?.title ?? raw?.position ?? "Quiz",
          score: typeof avg === "number" ? Math.round(avg) : null,
          date: when,
          skills: skillEntries,
          items: Array.isArray(raw?.items) ? raw.items : [],
        };
        setData(normalized);
      } catch (e: any) {
        setErr("Unable to load assessment.");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (err)
    return (
      <div className="p-6">
        <p className="mb-4">{err}</p>
        <Link to="/dashboard" className="btn">
          Back to Dashboard
        </Link>
      </div>
    );
  if (!data) return null;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Your Assessment Results</h1>
        <p className="text-slate-600">Here's your personalized skill analysis and improvement roadmap</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border p-4">
          <div className="text-sm text-slate-500">Score</div>
          <div className="text-2xl font-semibold">
            {typeof data.score === "number" ? `${Math.round(data.score)}%` : "—"}
          </div>
        </div>
        <div className="rounded-xl border p-4">
          <div className="text-sm text-slate-500">Date</div>
          <div className="text-2xl font-semibold">{data.date ? new Date(data.date).toLocaleDateString() : "—"}</div>
        </div>
        <div className="rounded-xl border p-4">
          <div className="text-sm text-slate-500">Top Skills</div>
          <div className="mt-2">
            {(data.skills ?? []).slice(0, 6).map((s) => (
              <span key={s} className="inline-block rounded-full border px-2 py-1 mr-2 mb-2">
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border">
        <div className="p-4 border-b font-semibold">Question Breakdown</div>
        <div className="p-4">
          {(data.items ?? []).length ? (
            <ol className="space-y-3">
              {(data.items ?? []).map((q, i) => (
                <li key={i} className="p-3 rounded-lg border">
                  <div className="font-medium mb-1">
                    {i + 1}. {q.question}
                  </div>
                  <div className="text-sm">
                    <div>
                      <strong>Your answer:</strong> {q.user_answer ?? "—"}
                    </div>
                    <div>
                      <strong>Correct answer:</strong> {q.correct_answer ?? "—"}
                    </div>
                    <div>
                      <strong>Result:</strong> {q.is_correct ? "✅ Correct" : "❌ Incorrect"}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div>No question-level details available.</div>
          )}
        </div>
      </div>

      <div>
        <Link to="/dashboard" className="btn">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

