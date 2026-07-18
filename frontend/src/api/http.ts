// src/api/http.ts
import axios, { AxiosError, AxiosRequestConfig, AxiosRequestHeaders } from "axios";

const api = axios.create({
  baseURL: "/api",
});

// Helpers for tokens
const getAccess = () => localStorage.getItem("access");
const getRefresh = () => localStorage.getItem("refresh");
const setAccess = (t: string) => localStorage.setItem("access", t);
const clearTokens = () => {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
};

// Attach Authorization header
api.interceptors.request.use((config: AxiosRequestConfig) => {
  const token = getAccess();
  if (!config.headers) config.headers = {} as AxiosRequestHeaders;

  if (token) {
    // Axios 1.x can have headers as AxiosHeaders or plain object
    const h = config.headers as any;
    if (typeof h.set === "function") {
      h.set("Authorization", `Bearer ${token}`);
    } else {
      (config.headers as AxiosRequestHeaders)["Authorization"] = `Bearer ${token}`;
    }
  }
  return config;
});

// Auto refresh access token once on 401
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefresh();
  if (!refresh) return null;
  try {
    const { data } = await axios.post("/api/token/refresh/", { refresh });
    if (data?.access) {
      setAccess(data.access);
      return data.access as string;
    }
  } catch {
    /* ignore */
  }
  return null;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;

    if (status === 401 && !original._retry) {
      original._retry = true;

      // ensure only one refresh happens
      if (!refreshing) refreshing = refreshAccessToken();
      const newAccess = await refreshing.finally(() => (refreshing = null));

      if (newAccess) {
        // retry with new token
        if (!original.headers) original.headers = {} as AxiosRequestHeaders;
        const h = original.headers as any;
        if (typeof h.set === "function") {
          h.set("Authorization", `Bearer ${newAccess}`);
        } else {
          (original.headers as AxiosRequestHeaders)["Authorization"] = `Bearer ${newAccess}`;
        }
        return api(original);
      }
      // refresh failed: clear and (optionally) redirect
      clearTokens();
      // window.location.href = "/auth"; // enable if you want
    }
    return Promise.reject(error);
  }
);

export default api;