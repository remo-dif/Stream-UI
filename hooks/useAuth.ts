"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { ApiError, authApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";

function isInvalidSessionError(error: unknown) {
  return (
    error instanceof ApiError &&
    (error.statusCode === 401 || error.statusCode === 403)
  );
}

/**
 * Initialises auth state from Supabase session and keeps it in sync.
 * Call once at the app root.
 */
export function useAuthInit() {
  const { setUser, setToken, setLoading, logout } = useAuthStore();

  useEffect(() => {
    const supabase = createClient();

    const clearInvalidSession = async () => {
      await supabase.auth.signOut().catch(() => undefined);
      logout();
    };

    const init = async () => {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        setToken(session.access_token);
        try {
          const user = await authApi.me(session.access_token);
          setUser(user);
        } catch (error) {
          if (isInvalidSessionError(error)) {
            await clearInvalidSession();
          } else {
            setUser(null);
          }
        }
      } else {
        logout();
      }
      setLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        logout();
        setLoading(false);
        return;
      }

      if (session?.access_token) {
        setToken(session.access_token);
        try {
          const user = await authApi.me(session.access_token);
          setUser(user);
        } catch (error) {
          if (isInvalidSessionError(error)) {
            await clearInvalidSession();
          } else {
            setUser(null);
          }
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setToken, setLoading, logout]);
}

/**
 * Redirect to /login if not authenticated.
 */
export function useRequireAuth(redirectTo = "/login") {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(redirectTo);
    }
  }, [user, isLoading, router, redirectTo]);

  return { user, isLoading };
}

/**
 * Redirect to /chat if already authenticated.
 */
export function useRedirectIfAuthed(redirectTo = "/chat") {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(redirectTo);
    }
  }, [user, isLoading, router, redirectTo]);

  return { user, isLoading };
}
