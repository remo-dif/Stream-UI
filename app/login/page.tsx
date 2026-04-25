"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Cpu, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { useAuthInit, useRedirectIfAuthed } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  useAuthInit();
  useRedirectIfAuthed();

  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { setUser, setToken } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const supabase = createClient();

      if (mode === "sign-up") {
        await authApi.signUp(email, password);
        toast.success("Check your email to confirm your account");
        setMode("sign-in");
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      const accessToken = data.session!.access_token;
      setToken(accessToken);

      let user;
      try {
        user = await authApi.me(accessToken);
      } catch (authError) {
        await supabase.auth.signOut().catch(() => undefined);
        throw authError;
      }
      setUser(user);

      router.replace("/chat");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-10 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -left-24 bottom-10 h-64 w-64 rounded-full bg-accent/70 blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden lg:flex lg:flex-col lg:justify-center">
          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-border/70 bg-card/80 px-4 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Cpu className="h-4 w-4" />
              </span>
              Production-ready AI workspace
            </div>
            <h1 className="text-4xl font-semibold leading-tight text-foreground xl:text-5xl">
              Fast, focused AI collaboration for teams that ship.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground xl:text-lg">
              StreamAI brings chat, usage visibility, and async workflows into
              one calm interface built for day-to-day product work.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                ["Streaming replies", "Low-friction chat with persistent context."],
                ["Usage visibility", "Quota and request trends where you need them."],
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

        <section className="surface-panel relative mx-auto w-full max-w-md overflow-hidden p-5 shadow-[0_30px_120px_-60px_rgba(14,116,144,0.45)] sm:p-7">
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Cpu className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-semibold">Welcome to StreamAI</h1>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              Sign in to continue your workspace, or create a new account to
              start chatting with the platform.
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
                onClick={() => setMode(m)}
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

          <form onSubmit={handleSubmit} className="space-y-5">
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
                placeholder="you@company.com"
                className="ui-input"
              />
            </div>

            <div>
              <label htmlFor="password" className="ui-label">
                Password
              </label>
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
                  placeholder="Enter a secure password"
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
            </div>

            <button
              type="submit"
              disabled={isLoading}
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
