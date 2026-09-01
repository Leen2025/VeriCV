import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Calendar,
  TrendingUp,
  BarChart3,
  Star,
  AlertCircle,
  Activity,
  RefreshCcw,
  Target,
} from "lucide-react";
import { getHistorySummary, getHistoryList, type Assessment, type HistorySummary } from "@/api/endpoints";

function toNumber(n: unknown, fallback = 0): number {
  return typeof n === "number" && !Number.isNaN(n) ? n : fallback;
}

function normalizeAssessment(a: any): Assessment {
  const rawSkills = Array.isArray(a?.skills) ? a.skills : a?.top_skills || a?.tags || [];
  const skills: string[] = Array.isArray(rawSkills)
    ? rawSkills
        .map((s: any) => (typeof s === "string" ? s : s?.name ?? s?.label ?? ""))
        .filter(Boolean)
    : [];
  const missingKeywords: string[] = Array.isArray(a?.missing_keywords) ? a.missing_keywords : [];

  return {
    ...a,
    id: a?.id ?? a?.pk ?? a?.uuid ?? undefined,
    kind: a?.kind === "match" ? "match" : "quiz",
    date: typeof a?.date === "string" ? a.date : a?.date_created ?? a?.created_at ?? a?.timestamp ?? null,
    title: a?.title ?? a?.name ?? a?.position ?? a?.filename ?? "Assessment",
    score: typeof a?.score === "number" ? a.score : a?.average_score ?? a?.overall_score ?? a?.result?.score ?? null,
    skills,
    missing_keywords: missingKeywords,
    status: a?.status ?? a?.state ?? undefined,
  };
}

function computeTopSkill(list: Assessment[]): string | null {
  const freq = new Map<string, number>();
  for (const a of list) {
    for (const s of a.skills ?? []) {
      freq.set(s, (freq.get(s) ?? 0) + 1);
    }
  }
  let best: string | null = null;
  let max = 0;
  for (const [skill, count] of freq) {
    if (count > max) {
      max = count;
      best = skill;
    }
  }
  return best;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const {
    data: summaryRaw,
    isLoading: summaryLoading,
    isError: summaryError,
    refetch: refetchSummary,
  } = useQuery<HistorySummary>({
    queryKey: ["history", "summary"],
    queryFn: getHistorySummary,
  });

  const {
    data: listRaw,
    isLoading: listLoading,
    isError: listError,
    refetch: refetchList,
  } = useQuery<Assessment[]>({
    queryKey: ["history", "list"],
    queryFn: getHistoryList,
  });

  const loading = summaryLoading || listLoading;
  const hasError = summaryError || listError;

  const quizzes = useMemo(() => {
    const arr = Array.isArray(listRaw) ? listRaw : [];
    const normalized = arr.map(normalizeAssessment);
    return normalized.filter((a: any) => {
      if (a.kind !== "quiz") return false;
      const hasScore = typeof a?.score === "number" && !Number.isNaN(a.score);
      const hasDate = !!a?.date;
      const hasTitle = typeof a?.title === "string" && a.title.trim().length > 0;
      return hasScore || (hasDate && hasTitle);
    });
  }, [listRaw]);

  const matches = useMemo(() => {
    const arr = Array.isArray(listRaw) ? listRaw : [];
    const normalized = arr.map(normalizeAssessment);
    return normalized.filter((a: any) => {
      if (a.kind !== "match") return false;
      const hasScore = typeof a?.score === "number" && !Number.isNaN(a.score);
      const hasDate = !!a?.date;
      const hasTitle = typeof a?.title === "string" && a.title.trim().length > 0;
      return hasScore || (hasDate && hasTitle);
    });
  }, [listRaw]);

  const totalAssessments = useMemo(() => {
    const total = (summaryRaw?.total ?? summaryRaw?.total_assessments ?? (summaryRaw as any)?.assessments) as number | undefined;
    return typeof total === "number" ? total : quizzes.length;
  }, [summaryRaw, quizzes.length]);

  const totalMatches = useMemo(() => {
    const total = (summaryRaw as any)?.matches as number | undefined;
    return typeof total === "number" ? total : matches.length;
  }, [summaryRaw, matches.length]);

  const averageScore = useMemo(() => {
    const s = (summaryRaw?.average_score ?? summaryRaw?.avg_score) as number | undefined;
    if (typeof s === "number") return s;
    const nums = quizzes.map((a) => toNumber(a.score, NaN)).filter((v) => !Number.isNaN(v));
    if (!nums.length) return 0;
    return Math.round(nums.reduce((acc, v) => acc + v, 0) / nums.length);
  }, [summaryRaw, quizzes]);

  const lastActivity = useMemo(() => {
    const d = (summaryRaw?.last_activity ?? summaryRaw?.last_assessment_date) as string | undefined;
    if (d) return d;
    const dates = quizzes
      .map((a) => (a.date ? new Date(a.date) : null))
      .filter((x): x is Date => x instanceof Date && !Number.isNaN(x.getTime()))
      .sort((a, b) => b.getTime() - a.getTime());
    return dates[0]?.toISOString() ?? null;
  }, [summaryRaw, quizzes]);

  const topSkill = useMemo(() => {
    return (summaryRaw?.top_skill as string | undefined) ?? computeTopSkill(quizzes);
  }, [summaryRaw, quizzes]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero py-8">
        <div className="container mx-auto px-4 max-w-6xl space-y-6">
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle>Loading dashboard…</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-6 w-48 bg-muted rounded animate-pulse mb-2" />
              <div className="h-4 w-72 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="min-h-screen bg-gradient-hero py-8">
        <div className="container mx-auto px-4 max-w-3xl">
          <Card className="shadow-medium border-destructive/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                Unable to load dashboard
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <p className="text-muted-foreground">Please try again in a moment.</p>
              <Button onClick={() => { refetchSummary(); refetchList(); }} variant="outline">
                <RefreshCcw className="w-4 h-4 mr-2" /> Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isEmpty = !quizzes.length && !matches.length;

  return (
    <div className="min-h-screen bg-gradient-hero py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Track your quizzes and skill growth</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-medium">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalAssessments}</p>
                  <p className="text-sm text-muted-foreground">Quizzes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-medium">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{toNumber(averageScore, 0)}%</p>
                  <p className="text-sm text-muted-foreground">Average Score</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-medium">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalMatches}</p>
                  <p className="text-sm text-muted-foreground">Job Matches</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-medium">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{topSkill ?? "—"}</p>
                  <p className="text-sm text-muted-foreground">Top Skill</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-medium">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {lastActivity ? new Date(lastActivity).toLocaleDateString() : "N/A"}
                  </p>
                  <p className="text-sm text-muted-foreground">Last Activity</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Empty state */}
        {isEmpty ? (
          <Card className="shadow-large">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                Get started with your first quiz
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <p className="text-muted-foreground">
                Upload a CV to generate insights and track progress over time.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button asChild variant="hero">
                  <Link to="/upload">
                    <FileText className="w-4 h-4 mr-2" /> Upload CV
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/matcher">
                    <Target className="w-4 h-4 mr-2" /> Match CV to Job
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {quizzes.length > 0 && (
              <Card className="shadow-large">
                <CardHeader>
                  <CardTitle>Recent Quizzes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-muted-foreground">
                        <tr className="text-left">
                          <th className="py-2 pr-3 font-medium">Date</th>
                          <th className="py-2 pr-3 font-medium">Score</th>
                          <th className="py-2 pr-3 font-medium">Top Skills</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quizzes.slice(0, 10).map((a, idx) => {
                          const date = a?.date ? new Date(a.date) : null;
                          const score = typeof a?.score === "number" && !Number.isNaN(a.score) ? `${a.score}%` : "0%";
                          const skills = Array.isArray(a?.skills) ? a.skills.slice(0, 4) : [];
                          return (
                            <tr
                              key={String(a.id ?? idx)}
                              className="border-t cursor-pointer hover:bg-muted/50"
                              onClick={() => a.id != null && navigate(`/assessments/${a.id}`)}
                            >
                              <td className="py-2 pr-3 whitespace-nowrap">
                                {date && !Number.isNaN(date.getTime())
                                  ? date.toLocaleDateString()
                                  : "N/A"}
                              </td>
                              <td className="py-2 pr-3">{score}</td>
                              <td className="py-2 pr-3">
                                <div className="flex flex-wrap gap-1">
                                  {skills.map((s) => (
                                    <Badge key={s} variant="outline" className="text-xs">
                                      {s}
                                    </Badge>
                                  ))}
                                  {Array.isArray(a?.skills) && a.skills.length > 4 && (
                                    <Badge variant="outline" className="text-xs">+{a.skills.length - 4} more</Badge>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {matches.length > 0 && (
              <Card className="shadow-large">
                <CardHeader>
                  <CardTitle>Recent Job Matches</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-muted-foreground">
                        <tr className="text-left">
                          <th className="py-2 pr-3 font-medium">Date</th>
                          <th className="py-2 pr-3 font-medium">Position</th>
                          <th className="py-2 pr-3 font-medium">Match Score</th>
                          <th className="py-2 pr-3 font-medium">Missing Keywords</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matches.slice(0, 10).map((a, idx) => {
                          const date = a?.date ? new Date(a.date) : null;
                          const score = typeof a?.score === "number" && !Number.isNaN(a.score) ? `${a.score}%` : "0%";
                          const missing = Array.isArray(a?.missing_keywords) ? a.missing_keywords.slice(0, 4) : [];
                          return (
                            <tr
                              key={String(a.id ?? idx)}
                              className="border-t cursor-pointer hover:bg-muted/50"
                              onClick={() => a.id != null && navigate(`/assessments/${a.id}`)}
                            >
                              <td className="py-2 pr-3 whitespace-nowrap">
                                {date && !Number.isNaN(date.getTime())
                                  ? date.toLocaleDateString()
                                  : "N/A"}
                              </td>
                              <td className="py-2 pr-3">{a.title || "—"}</td>
                              <td className="py-2 pr-3">{score}</td>
                              <td className="py-2 pr-3">
                                <div className="flex flex-wrap gap-1">
                                  {missing.map((s) => (
                                    <Badge key={s} variant="outline" className="text-xs">
                                      {s}
                                    </Badge>
                                  ))}
                                  {missing.length === 0 && (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}