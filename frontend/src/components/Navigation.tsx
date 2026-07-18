// src/components/Navigation.tsx
import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  FileText,
  Home,
  Info,
  LogOut,
  LogIn,
  UserPlus,
  LayoutDashboard,
  Target,
} from "lucide-react";
import { isAuthenticated, hasUploadedCV, logout, subscribeAuth } from "@/utils/auth";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [authed, setAuthed] = useState(isAuthenticated());
  const [cvReady, setCvReady] = useState(hasUploadedCV());
  const nav = useNavigate();
  const location = useLocation();

  // Keep state fresh on any auth change
  useEffect(() => {
    const refresh = () => {
      setAuthed(isAuthenticated());
      setCvReady(hasUploadedCV());
    };
    refresh(); // on mount

    const unsub = subscribeAuth(refresh);

    // cross-tab + same-tab custom event
    const onStorage = () => refresh();
    const onDomEvent = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener("auth-changed", onDomEvent);

    return () => {
      unsub();
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auth-changed", onDomEvent);
    };
  }, []);

  // Re-check on route changes
  useEffect(() => {
    setAuthed(isAuthenticated());
    setCvReady(hasUploadedCV());
  }, [location.key]);

  // Final labels (consistent with "CV")
  const navItems = [
    { name: "Home", href: "/", icon: Home, show: true },
    { name: "Upload CV", href: "/upload", icon: FileText, show: authed },
    { name: "Match Jobs", href: "/matcher", icon: Target, show: authed },
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, show: authed },
    { name: "About", href: "/about", icon: Info, show: true },
  ].filter((i) => i.show);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      // best-effort notify listeners in this and other tabs
      try { window.dispatchEvent(new Event("storage")); } catch {}
      try { window.dispatchEvent(new Event("auth-changed")); } catch {}
      setAuthed(false);
      setCvReady(false);
      nav("/", { replace: true });
    }
  };

  return (
    <nav className="bg-background/60 backdrop-blur border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 grid grid-cols-[auto_1fr_auto] items-center gap-3">
        {/* Left: Brand */}
        <NavLink
          to="/"
          className="inline-flex items-center justify-center h-10 w-10 rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="VeriCV home"
        >
          <img src="/brand/favicon.svg" alt="VeriCV" className="h-10 w-10" />
        </NavLink>

        {/* Center: Desktop Nav (always centered) */}
        <div className="hidden md:flex items-center justify-center gap-6">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center gap-2 text-sm ${
                  isActive ? "text-primary" : "text-foreground/80 hover:text-foreground"
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </NavLink>
          ))}
        </div>

        {/* Right: Auth buttons (desktop) + Mobile toggle */}
        <div className="flex items-center gap-2 justify-end">
          {/* Desktop auth buttons */}
          <div className="hidden md:flex items-center gap-2">
            {!authed ? (
              <>
                <Button variant="outline" onClick={() => nav("/login")}>
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
                <Button className="gradient-primary button-glow" onClick={() => nav("/register")}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Sign Up
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setIsOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden border-t">
          <div className="container mx-auto px-4 py-3 flex flex-col gap-3">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 text-foreground/90"
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </NavLink>
            ))}
            <div className="flex gap-2 pt-2">
              {!authed ? (
                <>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setIsOpen(false);
                      nav("/login");
                    }}
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </Button>
                  <Button
                    className="flex-1 gradient-primary button-glow"
                    onClick={() => {
                      setIsOpen(false);
                      nav("/register");
                    }}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Sign Up
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={async () => {
                    setIsOpen(false);
                    await handleLogout();
                  }}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
