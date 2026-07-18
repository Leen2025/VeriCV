// src/api/auth.ts
// A lightweight API client using fetch + JWT support

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/";

function getAccess() {
  return localStorage.getItem("access");
}
function getRefresh() {
  return localStorage.getItem("refresh");
}
function setAccess(token: string) {
  localStorage.setItem("access", token);
}

async function rawFetch(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  const access = getAccess();

  if (access) headers.set("Authorization", `Bearer ${access}`);
  // only set JSON when not sending FormData or URLSearchParams
  const isFormLike = (options.body instanceof FormData) || (options.body instanceof URLSearchParams);
  if (!isFormLike && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, { ...options, headers });
}

async function request(path: string, options: RequestInit = {}) {
  // remove any leading slashes so BASE + path doesn't become .../api//token/
  const clean = path.replace(/^\/+/, "");
  const url = BASE + clean;

  let res = await rawFetch(url, options);

  // Try refresh once on 401
  if (res.status === 401 && !(options as any)._retried) {
    const refresh = getRefresh();
    if (refresh) {
      const r = await fetch(BASE + "token/refresh/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      if (r.ok) {
        const data = await r.json();
        if (data?.access) {
          setAccess(data.access);
          (options as any)._retried = true;
          res = await rawFetch(url, options);
        }
      }
    }
  }

  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const err = await res.json();
      message = typeof err === "string" ? err : JSON.stringify(err);
    } catch { }
    throw new Error(message);
  }

  const ct = res.headers.get("Content-Type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

export const API = {
  get: (p: string) => request(p, { method: "GET" }),
  post: (p: string, body?: any) =>
    request(p, {
      method: "POST",
      body: (body instanceof FormData || body instanceof URLSearchParams)
        ? body
        : JSON.stringify(body ?? {}),
    }),
  put: (p: string, body?: any) =>
    request(p, { method: "PUT", body: JSON.stringify(body ?? {}) }),
  del: (p: string) => request(p, { method: "DELETE" }),
};

export function saveTokens(access: string, refresh: string) {
  localStorage.setItem("access", access);
  localStorage.setItem("refresh", refresh);
}
export function clearTokens() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
}
export function isAuthed() {
  return !!localStorage.getItem("access");
}
export default API;
