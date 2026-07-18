// src/utils/auth.ts
const ACCESS_KEY = "access";
const REFRESH_KEY = "refresh";
const LAST_CV_ID = "last_cv_id";

/* ---------- Token Management ---------- */
export function saveTokens(access: string, refresh?: string) {
  if (access) localStorage.setItem(ACCESS_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

/* ---------- Auth ---------- */
export function isAuthenticated(): boolean {
  return !!localStorage.getItem(ACCESS_KEY);
}

/* ---------- CV ---------- */
export function hasUploadedCV(): boolean {
  return !!localStorage.getItem(LAST_CV_ID);
}

/* ---------- Events ---------- */
export function subscribeAuth(cb: () => void) {
  const handler = () => cb();
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

/* ---------- Export alias so imports work ---------- */
export const logout = clearTokens;
