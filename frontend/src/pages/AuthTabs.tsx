import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { login, register } from "@/api/endpoints";

/**
 * AuthTabs
 * - Uses your existing backend logic (login/register) and token storage
 * - Presents the mock UI with Tabs for Sign In / Sign Up
 * - Safe to mount for both /login and /register (via initialTab prop)
 */
export default function AuthTabs({ initialTab = "signin" as "signin" | "signup" }) {
  const nav = useNavigate();

  // Sign In state (uses username + password per backend)
  const [siUsername, setSiUsername] = useState("");
  const [siPassword, setSiPassword] = useState("");
  const [siLoading, setSiLoading] = useState(false);
  const [siError, setSiError] = useState("");

  // Sign Up state (name + username + password + confirm) per your current API
  const [suName, setSuName] = useState("");
  const [suUsername, setSuUsername] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suConfirm, setSuConfirm] = useState("");
  const [suLoading, setSuLoading] = useState(false);
  const [suError, setSuError] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSiError("");
    if (!siUsername || !siPassword) {
      setSiError("Please enter your username and password");
      return;
    }
    try {
      setSiLoading(true);
      const res = await login(siUsername, siPassword);
      if (res?.access) {
        nav("/");
      } else {
        setSiError("Invalid login credentials");
      }
    } catch (err) {
      console.error(err);
      setSiError("Login failed. Please check your credentials.");
    } finally {
      setSiLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuError("");

    if (!suName || !suUsername || !suPassword || !suConfirm) {
      setSuError("Please fill all fields");
      return;
    }
    if (suPassword !== suConfirm) {
      setSuError("Passwords do not match");
      return;
    }

    try {
      setSuLoading(true);
      // 1) Register
      await register({ username: suUsername, password: suPassword, confirm: suConfirm, name: suName });
      // 2) Auto-login
      const res = await login(suUsername, suPassword);
      if (res?.access) {
        nav("/");
      } else {
        setSuError("Registered but auto-login failed. Please sign in.");
      }
    } catch (err: any) {
      console.error(err);
      const msg = (err?.data && typeof err.data === "string")
        ? err.data
        : err?.data?.error || err?.data?.detail || "Registration failed.";
      setSuError(msg);
    } finally {
      setSuLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center gradient-text">Welcome</CardTitle>
          <CardDescription className="text-center">
            Sign in to your account or create a new one
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={initialTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                {siError && <p className="text-sm text-destructive">{siError}</p>}
                <div className="space-y-2">
                  <Label htmlFor="signin-username">Username</Label>
                  <Input
                    id="signin-username"
                    placeholder="your_username"
                    value={siUsername}
                    onChange={(e) => setSiUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={siPassword}
                    onChange={(e) => setSiPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" variant="gradient" size="lg" disabled={siLoading}>
                  {siLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                {suError && <p className="text-sm text-destructive">{suError}</p>}
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    placeholder="Your name"
                    value={suName}
                    onChange={(e) => setSuName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-username">Username</Label>
                  <Input
                    id="signup-username"
                    placeholder="your_username"
                    value={suUsername}
                    onChange={(e) => setSuUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={suPassword}
                    onChange={(e) => setSuPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={suConfirm}
                    onChange={(e) => setSuConfirm(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" variant="gradient" size="lg" disabled={suLoading}>
                  {suLoading ? "Creating..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
