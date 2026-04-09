"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Cpu, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { useRedirectIfAuthed } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

/**
 * LoginPage Component
 * 
 * Handles user authentication via Supabase Auth and coordinates 
 * with the NestJS backend to retrieve enriched user metadata.
 * 
 * Key Flow:
 * 1. Supabase Auth: Directly signs in/up users using Supabase client.
 * 2. Token Exchange: Obtains a JWT and stores it in the useAuthStore (Zustand).
 * 3. Enriched Profile: Calls the NestJS `/auth/me` endpoint to get tenant and role info.
 * 4. Redirection: Automatically redirects already-authenticated users away from this page.
 */
export default function LoginPage() {
  useRedirectIfAuthed();

  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { setUser, setToken } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
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

      // 1. Sign in via Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // 2. Obtain and store the session token
      const accessToken = data.session!.access_token;
      setToken(accessToken);

      // 3. Fetch enriched multi-tenant user data from the backend
      const user = await authApi.me(accessToken);
      setUser(user);

      // 4. Proceed to the application
      router.replace("/chat");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-lg shadow-primary/30">
            <Cpu className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">StreamAI</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Multi-tenant AI platform
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
          {/* Tabs */}
          <div className="flex bg-muted rounded-xl p-1 mb-6">
            {(["sign-in", "sign-up"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  mode === m
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "sign-in" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 pr-10 rounded-xl border border-input bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === "sign-in" ? "Sign In" : "Create Account"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Backed by NestJS + Supabase + Anthropic
        </p>
      </div>
    </div>
  );
}
