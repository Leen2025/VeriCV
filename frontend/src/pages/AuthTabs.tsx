import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { login, register } from "@/api/endpoints";


export default function AuthTabs({
  initialTab = "signin" as "signin" | "signup",
}) {
  const nav = useNavigate();

  // -------------------------
  // Sign In state
  // -------------------------

  const [siUsername, setSiUsername] = useState("");
  const [siPassword, setSiPassword] = useState("");
  const [siLoading, setSiLoading] = useState(false);
  const [siError, setSiError] = useState("");

  // -------------------------
  // Sign Up state
  // -------------------------

  const [suName, setSuName] = useState("");
  const [suUsername, setSuUsername] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suConfirm, setSuConfirm] = useState("");
  const [suLoading, setSuLoading] = useState(false);
  const [suError, setSuError] = useState("");

  // Password requirements:
  // - at least 8 characters
  // - one uppercase letter
  // - one lowercase letter
  // - one number

  const passwordIsStrong =
    suPassword.length >= 8 &&
    /[A-Z]/.test(suPassword) &&
    /[a-z]/.test(suPassword) &&
    /\d/.test(suPassword);

  const passwordsMatch =
    suPassword === suConfirm ||
    suConfirm.length === 0;


  // -------------------------
  // Sign In
  // -------------------------

  const handleSignIn = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();
    setSiError("");

    if (!siUsername || !siPassword) {
      setSiError(
        "Please enter your username and password."
      );
      return;
    }

    try {
      setSiLoading(true);

      const res = await login(
        siUsername,
        siPassword
      );

      if (res?.access) {
        nav("/");
      } else {
        setSiError(
          "Invalid login credentials."
        );
      }
    } catch (err) {
      console.error(err);

      setSiError(
        "Login failed. Please check your credentials."
      );
    } finally {
      setSiLoading(false);
    }
  };


  // -------------------------
  // Sign Up
  // -------------------------

  const handleSignUp = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();
    setSuError("");

    // Required fields
    if (
      !suName ||
      !suUsername ||
      !suPassword ||
      !suConfirm
    ) {
      setSuError(
        "Please fill all fields."
      );
      return;
    }

    // Password strength
    if (!passwordIsStrong) {
      setSuError(
        "Password must be at least 8 characters and include an uppercase letter, lowercase letter, and number."
      );
      return;
    }

    // Password confirmation
    if (suPassword !== suConfirm) {
      setSuError(
        "Passwords do not match."
      );
      return;
    }

    try {
      setSuLoading(true);

      // Register
      await register({
        username: suUsername,
        password: suPassword,
        confirm: suConfirm,
        name: suName,
      });

      // Auto-login after registration
      const res = await login(
        suUsername,
        suPassword
      );

      if (res?.access) {
        nav("/");
      } else {
        setSuError(
          "Registered successfully, but auto-login failed. Please sign in."
        );
      }
    } catch (err: any) {
      console.error(err);

      const data =
        err?.response?.data ??
        err?.data ??
        err;

      let msg =
        "Registration failed.";

      if (typeof data === "string") {
        msg = data;
      } else if (
        Array.isArray(data?.password) &&
        data.password.length > 0
      ) {
        msg = data.password[0];
      } else if (
        Array.isArray(
          data?.confirm_password
        ) &&
        data.confirm_password.length > 0
      ) {
        msg =
          data.confirm_password[0];
      } else if (
        Array.isArray(
          data?.non_field_errors
        ) &&
        data.non_field_errors.length > 0
      ) {
        msg =
          data.non_field_errors[0];
      } else if (
        Array.isArray(data?.username) &&
        data.username.length > 0
      ) {
        msg = data.username[0];
      } else if (data?.error) {
        msg = data.error;
      } else if (data?.detail) {
        msg = data.detail;
      }

      setSuError(msg);
    } finally {
      setSuLoading(false);
    }
  };


  // -------------------------
  // UI
  // -------------------------

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center gradient-text">
            Welcome
          </CardTitle>

          <CardDescription className="text-center">
            Sign in to your account or create a new one
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs
            defaultValue={initialTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">
                Sign In
              </TabsTrigger>

              <TabsTrigger value="signup">
                Sign Up
              </TabsTrigger>
            </TabsList>

            {/* ---------------- SIGN IN ---------------- */}

            <TabsContent value="signin">
              <form
                onSubmit={handleSignIn}
                className="space-y-4"
              >
                {siError && (
                  <p className="text-sm text-destructive">
                    {siError}
                  </p>
                )}

                <div className="space-y-2">
                  <Label htmlFor="signin-username">
                    Username
                  </Label>

                  <Input
                    id="signin-username"
                    placeholder="your_username"
                    value={siUsername}
                    onChange={(e) =>
                      setSiUsername(
                        e.target.value
                      )
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signin-password">
                    Password
                  </Label>

                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={siPassword}
                    onChange={(e) =>
                      setSiPassword(
                        e.target.value
                      )
                    }
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  variant="gradient"
                  size="lg"
                  disabled={siLoading}
                >
                  {siLoading
                    ? "Signing in..."
                    : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            {/* ---------------- SIGN UP ---------------- */}

            <TabsContent value="signup">
              <form
                onSubmit={handleSignUp}
                className="space-y-4"
              >
                {suError && (
                  <p className="text-sm text-destructive">
                    {suError}
                  </p>
                )}

                <div className="space-y-2">
                  <Label htmlFor="signup-name">
                    Full Name
                  </Label>

                  <Input
                    id="signup-name"
                    placeholder="Your name"
                    value={suName}
                    onChange={(e) =>
                      setSuName(
                        e.target.value
                      )
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-username">
                    Username
                  </Label>

                  <Input
                    id="signup-username"
                    placeholder="your_username"
                    value={suUsername}
                    onChange={(e) =>
                      setSuUsername(
                        e.target.value
                      )
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">
                    Password
                  </Label>

                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={suPassword}
                    onChange={(e) =>
                      setSuPassword(
                        e.target.value
                      )
                    }
                    required
                  />

                  <p className="text-xs text-muted-foreground">
                    Use at least 8 characters with
                    an uppercase letter, lowercase
                    letter, and number.
                  </p>

                  {suPassword.length > 0 &&
                    !passwordIsStrong && (
                      <p className="text-xs text-destructive">
                        Please use a stronger
                        password.
                      </p>
                    )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">
                    Confirm Password
                  </Label>

                  <Input
                    id="signup-confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={suConfirm}
                    onChange={(e) =>
                      setSuConfirm(
                        e.target.value
                      )
                    }
                    required
                  />

                  {!passwordsMatch && (
                    <p className="text-xs text-destructive">
                      Passwords do not match.
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  variant="gradient"
                  size="lg"
                  disabled={
                    suLoading ||
                    !passwordsMatch
                  }
                >
                  {suLoading
                    ? "Creating..."
                    : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}