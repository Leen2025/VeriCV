import { createContext, useContext, useEffect, useState } from "react";
import api from "@/api/http";
import { isAuthenticated, saveTokens, clearTokens } from "@/utils/auth";

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

  // Login
  const login = async (username: string, password: string) => {
    try {
      const res = await api.post("token/", { username, password });
      saveTokens(res.data.access, res.data.refresh);
      setAuthed(true);
    } catch (err: any) {
      console.error("Login failed:", err.response?.data || err.message);
      setAuthed(false);
      throw err;
    }
  };

  // Logout
  const logout = () => {
    clearTokens();
    setAuthed(false);
  };

  // React to storage or CV updates across tabs — this also picks up
  // the case where api/http.ts's interceptor clears tokens itself
  // after a failed refresh attempt on a real 401.
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