import { createContext, createEffect, onCleanup, useContext, createSignal, type JSX } from "solid-js";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "~/lib/supabase/client";
import type { Tables } from "~/types/database";

type Profile = Tables<"profiles">;

type AuthState = {
  session: () => Session | null;
  profile: () => Profile | null;
  loading: () => boolean;
  isAdmin: () => boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>();

export function AuthProvider(props: { children: JSX.Element }) {
  const [session, setSession] = createSignal<Session | null>(null);
  const [profile, setProfile] = createSignal<Profile | null>(null);
  const [loading, setLoading] = createSignal(true);

  async function loadProfile(userId: string) {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile(data ?? null);
  }

  createEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        loadProfile(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    onCleanup(() => sub.subscription.unsubscribe());
  });

  const value: AuthState = {
    session,
    profile,
    loading,
    isAdmin: () => profile()?.role === "admin",
    signOut: () => supabase.auth.signOut().then(() => {}),
  };

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
