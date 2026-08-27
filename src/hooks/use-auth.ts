import { useCallback, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "owner" | "manager" | "cashier";

export interface StaffProfile {
  id: string;
  user_id: string;
  branch_id: string;
  full_name: string;
  email: string;
  role: AppRole;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  branch?: {
    id: string;
    name: string;
  };
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Listen for auth changes (session only – no loading change)
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) {
        setRole(null);
        setStaffProfile(null);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const user: User | null = session?.user ?? null;

  // 2. Fetch staff profile – controls loading state
  useEffect(() => {
    if (!user) {
      setStaffProfile(null);
      setRole(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    const fetchStaffProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("staff")
          .select(`
            *,
            branch:branches(
              id,
              name
            )
          `)
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          // Network or DB error – we'll show an error state
          setError(error.message);
          setStaffProfile(null);
          setRole(null);
          // Don't sign out, let the user see the error
          setLoading(false);
          return;
        }

        if (active) {
          if (data) {
            if (!data.is_active) {
              // Account deactivated – sign out
              await supabase.auth.signOut();
              // The session change will trigger the !user path and set loading false
              // We keep loading true until that happens
              return;
            }
            // Valid staff
            setStaffProfile(data);
            setRole(data.role);
            setLoading(false);
          } else {
            // No staff record – sign out immediately
            await supabase.auth.signOut();
            // Session will change; we keep loading true until then
            // Do not set loading false here
            return;
          }
        }
      } catch (err: any) {
        // Unexpected error – show error and stop loading
        console.error("Error fetching staff profile:", err);
        setError(err.message);
        setStaffProfile(null);
        setRole(null);
        setLoading(false);
      }
    };

    fetchStaffProfile();

    return () => {
      active = false;
    };
  }, [user]);

  // Magic link sign‑in (passwordless)
  const signInWithMagicLink = useCallback(async (email: string) => {
    try {
      setError(null);
      setLoading(true);

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin + "/auth/callback",
        },
      });

      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      setError(err.message);
      return { error: err };
    } finally {
      setLoading(false);
    }
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      setError(null);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setRole(null);
      setStaffProfile(null);
      return { error: null };
    } catch (err: any) {
      setError(err.message);
      return { error: err };
    }
  }, []);

  // Refresh staff profile
  const refreshProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("staff")
        .select(`
          *,
          branch:branches(
            id,
            name
          )
        `)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setStaffProfile(data);
        setRole(data.role);
      } else {
        setStaffProfile(null);
        setRole(null);
      }
    } catch (err: any) {
      console.error("Error refreshing profile:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const hasRole = useCallback((requiredRole: AppRole | AppRole[]) => {
    if (!role) return false;
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(role);
    }
    return role === requiredRole;
  }, [role]);

  return {
    session,
    user,
    role,
    staffProfile,
    loading,
    error,
    isOwner: role === "owner",
    isManager: role === "owner" || role === "manager",
    isCashier: role === "cashier",
    signInWithMagicLink,
    signOut,
    refreshProfile,
    hasRole,
  };
}
