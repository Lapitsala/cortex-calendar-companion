import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";

type User = Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"];
type Session = Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"];

interface AuthContext {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isPreviewMode: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ requiresEmailVerification: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<AuthContext | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    }).catch((error) => {
      console.error("Failed to read auth session:", error);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    if (!isSupabaseConfigured) {
      console.warn("Preview mode: sign up is disabled.");
      return { requiresEmailVerification: false };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    });

    if (error) throw error;

    return {
      requiresEmailVerification: !data.session,
    };
  };

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      console.warn("Preview mode: sign in is disabled.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
  };

  return (
    <AuthCtx.Provider value={{ user, session, loading, isPreviewMode: !isSupabaseConfigured, signUp, signIn, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
