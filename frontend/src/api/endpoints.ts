import api from "./http";
import { saveTokens, clearTokens, isAuthed } from "./auth";

// Types for history endpoints
export type Assessment = {
  id?: number | string;
  date?: string | null;
  title?: string;
  score?: number | null;
  skills?: string[];
  status?: string;
  // allow extra fields without breaking
  [key: string]: any;
};

export type HistorySummary = {
  total?: number;
  total_assessments?: number;
  average_score?: number | null;
  avg_score?: number | null;
  last_activity?: string | null;
  last_assessment_date?: string | null;
  top_skill?: string | null | { skill?: string; score?: number };
  // allow extra fields without breaking
  [key: string]: any;
};

/* =====================
   Auth
   ===================== */

export async function login(username: string, password: string) {
  const { data } = await api.post("token/", { username, password });
  if (data?.access && data?.refresh) saveTokens(data.access, data.refresh);
  return data;
}

export async function register(payload: {
  username: string;
  password: string;
  confirm: string;
  name: string;
}) {
  const { data } = await api.post("users/register/", {
    username: payload.username,
    name: payload.name,
    password: payload.password,
    confirm_password: payload.confirm,
  });
  if (data?.tokens?.access && data?.tokens?.refresh) {
    saveTokens(data.tokens.access, data.tokens.refresh);
  }
  return data;
}

export function logout() {
  clearTokens();
}

export { isAuthed };

/* =====================
   CV Upload
   ===================== */

export async function uploadCV(file: File, title = "My CV") {
  const name = file?.name || "upload.pdf";
  if (file.type !== "application/pdf" && !name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Please choose a PDF file.");
  }

  // Standard create endpoint /api/cv/ with {title, file}
  const form = new FormData();
  form.append("title", title);
  form.append("file", file, name);
  const { data } = await api.post("cv/", form);
  return data; // { id, title, file, ... }
}

/* =====================
   CV Metrics
   ===================== */

export async function getCvCount(): Promise<number> {
  try {
    // Prefer explicit count endpoint if available
    const res = await api.get("cv/count/");
    const data = res.data;

    if (typeof data === "number") return data;
    if (data && typeof data.count === "number") return data.count;
    if (Array.isArray(data)) return data.length;

    return 0;
  } catch {
    // Fallback: try listing and count
    try {
      const res2 = await api.get("cv/list/");
      const data2 = res2.data;
      if (Array.isArray(data2)) return data2.length;
    } catch {
      /* ignore */
    }
    return 0;
  }
}

/* =====================
   AI: Quiz generation & submission
   ===================== */

export async function aiGenerateFromFileSmart(file: File) {
  const tryKeys = ["cv", "file", "pdf", "cv_file", "resume", "document"];
  let last: any;
  for (const key of tryKeys) {
    try {
      const fd = new FormData();
      fd.append(key, file, file.name || "upload.pdf");
      const { data } = await api.post("ai/generate/", fd);
      return data; // {questions:[...]} or [...]
    } catch (e) {
      last = e;
    }
  }
  throw last || new Error("PDF upload for AI generation failed.");
}

export async function aiGenerateFromCVId(cvId: number | string) {
  const { data } = await api.post("ai/generate/", { cv_id: cvId });
  return data; // {questions:[...]} or [...]
}

export async function aiSubmitAnswers(
  answers: Array<{ question: string; answer: string }>
) {
  const { data } = await api.post("ai/submit/", { answers });
  return data;
}

export async function submitAnswers(answers: any) {
  const { data } = await api.post("ai/submit/", { answers });
  return data;
}

/* =====================
   History/Dashboard
   ===================== */

export async function getHistorySummary(): Promise<HistorySummary> {
  const { data } = await api.get("history/summary/");
  return data;
}

export async function getHistoryList(): Promise<Assessment[]> {
  const { data } = await api.get("history/list/");
  return data;
}

export async function addHistory(payload: {
  position: string;
  average_score: number;
  skills_analyzed: Record<string, number> | Array<{ skill: string; score: number }>;
}) {
  const { data } = await api.post("history/add/", payload);
  return data;
}

export async function getHistoryDetail(id: number | string): Promise<{
  id: number;
  position: string;
  average_score: number;
  date_created: string;
  skills_analyzed: Record<string, number> | any;
  kind?: string;
}> {
  const { data } = await api.get(`history/${id}/`);
  return data;
}
