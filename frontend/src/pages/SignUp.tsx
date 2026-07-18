// src/pages/SignUp.tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { register, login } from "@/api/endpoints"; // ✅ use API layer

export default function SignUp() {
  const nav = useNavigate();
  const [name, setName] = useState("");        // kept for future profile
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");      // optional; include if your backend uses it
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const passwordsMatch = password === confirm || confirm.length === 0;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!name || !username || !password || !confirm) {
      setError("Please fill all fields");
      setLoading(false);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      // ✅ 1) Register the user
      await register({ username, password, confirm, name });




      // ✅ 2) Auto-login after successful registration
      const res = await login(username, password);
      if (res?.access) {
        nav("/");
      } else {
        setError("Registered but auto-login failed. Please sign in.");
      }
    } catch (err: any) {
      console.error(err);
      const msg = (err?.data && typeof err.data === "string")
        ? err.data
        : err?.data?.error || err?.data?.detail || "Registration failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-large">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Create Account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {error && <p className="text-destructive text-sm">{error}</p>}

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>

            {/* Optional Email (uncomment if your backend expects it) */}
            {/* <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div> */}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm Password</Label>
              <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              {!passwordsMatch && <p className="text-xs text-destructive">Passwords do not match.</p>}
            </div>

            <Button type="submit" className="w-full" disabled={loading || !passwordsMatch}>
              {loading ? "Creating..." : "Sign Up"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground mt-4 text-center">
            Already have an account?{" "}
            <Link to="/login" className="underline">
              Sign In
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
