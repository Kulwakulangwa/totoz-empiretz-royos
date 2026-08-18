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

  // Listen for auth changes
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
      setLoading(false);
    });
    
    return () => sub.subscription.unsubscribe();
  }, []);

  const user: User | null = session?.user ?? null;

  // Fetch staff profile when user changes
  useEffect(() => {
    if (!user) {
      setStaffProfile(null);
      setRole(null);
      return;
    }

    let active = true;
    setError(null);

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

        if (error) throw error;

        if (active) {
          if (data) {
            // Check if staff is active
            if (!data.is_active) {
              setError("Your account has been deactivated. Please contact your administrator.");
              setStaffProfile(null);
              setRole(null);
              // Sign out inactive user
              await supabase.auth.signOut();
              return;
            }
            setStaffProfile(data);
            setRole(data.role);
          } else {
            // No staff profile found - user not authorized
            setError("No staff profile found. Please contact your administrator.");
            setStaffProfile(null);
            setRole(null);
            // Sign out unauthorized user
            await supabase.auth.signOut();
          }
        }
      } catch (err: any) {
        console.error("Error fetching staff profile:", err);
        setError(err.message);
        if (active) {
          setStaffProfile(null);
          setRole(null);
        }
      }
    };

    fetchStaffProfile();

    return () => {
      active = false;
    };
  }, [user]);

  // Sign in function only - NO SIGN UP
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Staff profile will be fetched by the useEffect above
      return { data, error: null };
    } catch (err: any) {
      setError(err.message);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  }, []);

  // Sign out function
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
    
    try {
      setLoading(true);
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
        if (!data.is_active) {
          setError("Your account has been deactivated.");
          await supabase.auth.signOut();
          return;
        }
        setStaffProfile(data);
        setRole(data.role);
      }
    } catch (err: any) {
      console.error("Error refreshing profile:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Check if user has specific role
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
    signIn,
    signOut,
    refreshProfile,
    hasRole,
  };
}
