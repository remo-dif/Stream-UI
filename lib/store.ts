import { create } from "zustand";
import type { AuthUser } from "@/types";

/**
 * Auth Store
 *
 * SECURITY: intentionally NOT persisted to localStorage.
 * The Supabase JWT is sensitive — persisting it makes it readable by any XSS
 * payload on the page. Instead:
 *  - The token is held only in memory (gone on tab close / refresh).
 *  - On mount, useAuthInit re-hydrates it from the httpOnly cookie via
 *    supabase.auth.getSession(), which is safe because the cookie is
 *    inaccessible to JS.
 *  - The middleware (middleware.ts) re-validates the session on every
 *    server-side navigation, so a missing in-memory token just triggers
 *    a redirect to /login, not a security hole.
 */

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  token: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, token: null, isLoading: false }),
}));
