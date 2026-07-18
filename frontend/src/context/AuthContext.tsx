import { createContext, useContext, useEffect, useState } from "react";
import api from "@/api"; // Axios instance
import { isAuthenticated } from "@/utils/auth";
// Type definition for context
type AuthContextType = {
  authed: boolean;
  setAuthed: (v: boolean) => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};
// Create context
const AuthContext = createContext<AuthContextType>({
  authed: false,
  setAuthed: () => {},
  login: async () => {},
  logout: () => {},
});
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [authed, setAuthed] = useState<boolean>(isAuthenticated());
  // :brain: :one: Login
  const login = async (username: string, password: string) => {
    try {
      const res = await api.post("users/token/", { username, password });
      localStorage.setItem("access", res.data.access);
      localStorage.setItem("refresh", res.data.refresh);
      setAuthed(true);
    } catch (err: any) {
      console.error("Login failed:", err.response?.data || err.message);
      setAuthed(false);
      throw err;
    }
  };
  // :door: :two: Logout
  const logout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setAuthed(false);
  };
  // :arrows_counterclockwise: :three: Token Refresh Function
  const refreshAccessToken = async () => {
    const refresh = localStorage.getItem("refresh");
    if (!refresh) {
      logout();
      return;
    }
    try {
      const res = await api.post("users/token/refresh/", { refresh });
      localStorage.setItem("access", res.data.access);
      setAuthed(true);
    } catch (err: any) {
      console.warn("Token refresh failed:", err.response?.data || err.message);
      logout();
    }
  };
  // :alarm_clock: :four: Periodic token refresh (every 4 minutes)
  useEffect(() => {
    if (authed) {
      const interval = setInterval(() => {
        refreshAccessToken();
      }, 4 * 60 * 1000); // 4 minutes
      return () => clearInterval(interval);
    }
  }, [authed]);
  // :package: :five: React to storage or CV updates across tabs
  useEffect(() => {
    const onStorage = () => setAuthed(isAuthenticated());
    const onCvUpdated = () => setAuthed(isAuthenticated());
    window.addEventListener("storage", onStorage);
    window.addEventListener("vericv:cv-updated", onCvUpdated);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("vericv:cv-updated", onCvUpdated);
    };
  }, []);
  return (
    <AuthContext.Provider value={{ authed, setAuthed, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => useContext(AuthContext);