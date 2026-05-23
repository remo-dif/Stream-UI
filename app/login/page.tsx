"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Cpu, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { useAuthInit, useRedirectIfAuthed } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getPasswordValidation(password: string) {
  const trimmed = password.trim();

  return {
    minLength: trimmed.length >= 8,
    hasLetter: /[A-Za-z]/.test(trimmed),
    hasNumber: /\d/.test(trimmed),
  };
}

export default function LoginPage() {
  useAuthInit();
  useRedirectIfAuthed();

  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const emailHintId = useId();
  const passwordHintId = useId();
  const emailErrorId = useId();
  const passwordErrorId = useId();

  const { setUser, setToken } = useAuthStore();
  const router = useRouter();

  const normalizedEmail = email.trim();
  const passwordValidation = useMemo(
    () => getPasswordValidation(password),
    [password],
  );

  const emailError =
    attemptedSubmit && !emailPattern.test(normalizedEmail)
      ? "Enter a valid work email address."
      : null;

  const passwordError =
    attemptedSubmit && mode === "sign-up" &&
    (!passwordValidation.minLength ||
      !passwordValidation.hasLetter ||
      !passwordValidation.hasNumber)
      ? "Use at least 8 characters with a letter and a number."
      : attemptedSubmit && mode === "sign-in" && password.length === 0
        ? "Enter your password to continue."
        : null;

  const canSubmit =
    emailPattern.test(normalizedEmail) &&
    (mode === "sign-in"
      ? password.length > 0
      : passwordValidation.minLength &&
        passwordValidation.hasLetter &&
        passwordValidation.hasNumber);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAttemptedSubmit(true);
    setSubmitError(null);

    if (!canSubmit) {
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      if (mode === "sign-up") {
        await authApi.signUp(normalizedEmail, password);
        toast.success("Check your inbox to confirm your account.");
        setMode("sign-in");
        setPassword("");
        setSubmitError(null);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        throw error;
      }

      const accessToken = data.session?.access_token;

      if (!accessToken) {
        throw new Error("Your session could not be created. Please try again.");
      }

      setToken(accessToken);

      let user;
      try {
        user = await authApi.me(accessToken);
      } catch (authError) {
        await supabase.auth.signOut().catch(() => undefined);
        throw authError;
      }

      setUser(user);
      toast.success("Welcome back.");
      router.replace("/chat");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Authentication failed.";
      setSubmitError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const passwordChecks = [
    { label: "At least 8 characters", valid: passwordValidation.minLength },
    { label: "Includes a letter", valid: passwordValidation.hasLetter },
    { label: "Includes a number", valid: passwordValidation.hasNumber },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -left-24 bottom-10 h-64 w-64 rounded-full bg-accent/70 blur-3xl" />
        <div className="absolute right-[-6rem] top-1/3 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        <section className="order-2 lg:order-1 lg:flex lg:flex-col lg:justify-center">
          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-border/70 bg-card/80 px-4 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Cpu className="h-4 w-4" />
              </span>
              Production-ready AI workspace
            </div>
            <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl xl:text-5xl">
              Faster sign-in, clearer context, smoother collaboration.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-7 text-muted-foreground sm:text-base xl:text-lg">
              StreamAI keeps chat, usage visibility, and async workflows in one
              focused workspace built for teams shipping product every day.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                ["Streaming replies", "Persistent context without losing momentum."],
                ["Usage visibility", "See quota and request activity at a glance."],
                ["Team-ready control", "Roles, tenants, and background jobs included."],
              ].map(([title, description]) => (
                <div key={title} className="surface-panel p-4">
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="order-1 surface-panel relative mx-auto w-full max-w-lg overflow-hidden p-5 shadow-[0_30px_120px_-60px_rgba(14,116,144,0.45)] sm:p-7 lg:order-2">
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Cpu className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-semibold">Welcome to StreamAI</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              Sign in to continue your workspace, or create an account with a
              strong password to get started.
            </p>
          </div>

          <div
            className="mb-6 grid grid-cols-2 rounded-2xl border border-border/70 bg-muted/60 p-1"
            role="tablist"
            aria-label="Authentication mode"
          >
            {(["sign-in", "sign-up"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setAttemptedSubmit(false);
                  setSubmitError(null);
                }}
                type="button"
                role="tab"
                aria-selected={mode === m}
                className={cn(
                  "rounded-[1rem] px-4 py-2 text-sm font-medium transition-all",
                  mode === m
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "sign-in" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="ui-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                inputMode="email"
                spellCheck={false}
                aria-invalid={emailError ? "true" : "false"}
                aria-describedby={emailError ? emailErrorId : emailHintId}
                placeholder="you@company.com"
                className="ui-input"
              />
              <p
                id={emailError ? emailErrorId : emailHintId}
                className={cn(
                  "ui-helper-text",
                  emailError && "ui-helper-text-error",
                )}
              >
                {emailError ?? "Use the email connected to your workspace."}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="password" className="ui-label">
                  Password
                </label>
                {mode === "sign-up" && (
                  <span className="text-xs text-muted-foreground">
                    8+ characters
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={
                    mode === "sign-in" ? "current-password" : "new-password"
                  }
                  aria-invalid={passwordError ? "true" : "false"}
                  aria-describedby={passwordError ? passwordErrorId : passwordHintId}
                  placeholder={
                    mode === "sign-in"
                      ? "Enter your password"
                      : "Create a secure password"
                  }
                  className="ui-input pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {mode === "sign-up" ? (
                <ul id={passwordHintId} className="mt-3 space-y-2">
                  {passwordChecks.map((item) => (
                    <li
                      key={item.label}
                      className={cn(
                        "flex items-center gap-2 text-sm",
                        item.valid ? "text-emerald-600" : "text-muted-foreground",
                      )}
                    >
                      <CheckCircle2
                        className={cn(
                          "h-4 w-4 shrink-0",
                          item.valid ? "opacity-100" : "opacity-40",
                        )}
                      />
                      {item.label}
                    </li>
                  ))}
                </ul>
              ) : (
                <p
                  id={passwordError ? passwordErrorId : passwordHintId}
                  className={cn(
                    "ui-helper-text",
                    passwordError && "ui-helper-text-error",
                  )}
                >
                  {passwordError ?? "Your password stays private to your account."}
                </p>
              )}

              {passwordError && mode === "sign-up" && (
                <p id={passwordErrorId} className="ui-helper-text ui-helper-text-error">
                  {passwordError}
                </p>
              )}
            </div>

            {submitError && (
              <div
                className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                role="alert"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{submitError}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !canSubmit}
              className="ui-button-primary mt-2 w-full py-3"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "sign-in" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
            By continuing, you agree to use this workspace responsibly with your
            authenticated account.
          </p>
        </section>
      </div>
    </main>
  );
}
