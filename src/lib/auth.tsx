import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "student" | "teacher" | "admin";

export interface Profile {
  id: string;
  full_name: string;
  role: AppRole;
  school: string | null;
  grade: string | null;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (params: {
    email: string;
    password: string;
    full_name: string;
    school?: string;
    grade?: string;
  }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Resolves to null after ms — lets us race Supabase calls that might hang
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    // Guard: only query profiles when a Supabase session exists, otherwise RLS 403s.
    const sessionResult = await withTimeout(supabase.auth.getSession(), 5000);
    if (!sessionResult) {
      console.warn("[Auth] getSession timed out inside loadProfile");
      setProfile(null);
      return;
    }
    const { data: { session } } = sessionResult;
    if (!session?.user || session.user.id !== uid) {
      setProfile(null);
      return;
    }
    try {
      const queryResult = await withTimeout(
        supabase
          .from("profiles")
          .select("id, full_name, role, school, grade")
          .eq("id", uid)
          .maybeSingle(),
        5000,
      );
      if (!queryResult) {
        console.warn("[Auth] profiles query timed out");
        setProfile(null);
        return;
      }
      const { data, error } = queryResult;
      if (error) {
        if ((error as { code?: string }).code === "PGRST301" || /permission|denied|forbidden/i.test(error.message)) {
          console.warn("[Auth] profile read denied by RLS:", error.message);
        } else {
          console.error("[Auth] profile load failed:", error);
        }
        setProfile(null);
        return;
      }
      setProfile((data as Profile) ?? null);
    } catch (err) {
      console.error("[Auth] profile load threw:", err);
      setProfile(null);
    }
  };

  useEffect(() => {
    // Safety net: if getSession or loadProfile hangs, unblock the spinner after 8s
    const safetyTimer = setTimeout(() => {
      setLoading((prev) => {
        if (prev) console.warn("[Auth] loading safety-net fired — forcing unblock");
        return false;
      });
    }, 8000);

    // Set up listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        // Defer profile fetch to avoid deadlock
        setTimeout(() => void loadProfile(newSession.user.id), 0);
      } else {
        setProfile(null);
        // Session expired or signed out — redirect to login
        if (event === "SIGNED_OUT" || (event === "TOKEN_REFRESHED" && !newSession)) {
          if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
            window.location.href = "/login";
          }
        }
      }
    });

    // Then check existing session
    withTimeout(supabase.auth.getSession(), 6000).then((result) => {
      const existing = result?.data?.session ?? null;
      setSession(existing);
      setUser(existing?.user ?? null);
      if (existing?.user) {
        void loadProfile(existing.user.id).finally(() => {
          clearTimeout(safetyTimer);
          setLoading(false);
        });
      } else {
        clearTimeout(safetyTimer);
        setLoading(false);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, []);

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp: AuthContextValue["signUp"] = async ({
    email,
    password,
    full_name,
    school,
    grade,
  }) => {
    const redirectUrl =
      typeof window !== "undefined" ? `${window.location.origin}/` : undefined;
    // Role is intentionally NOT sent from the client. The backend trigger
    // always assigns role = 'student'; teacher/admin roles are granted
    // server-side only.
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name, school, grade },
      },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  return (
    <AuthContext.Provider
      value={{ user, session, profile, loading, signIn, signUp, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
