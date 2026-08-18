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
    console.log("🔐 useAuth: Setting up auth listener");
    
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      console.log("🔐 useAuth: Auth state changed:", _event);
      console.log("🔐 useAuth: Session user:", next?.user?.email);
      
      setSession(next);
      if (!next) {
        setRole(null);
        setStaffProfile(null);
      }
    });
    
    supabase.auth.getSession().then(({ data }) => {
      console.log("🔐 useAuth: Initial session:", data.session?.user?.email);
      setSession(data.session);
      setLoading(false);
    });
    
    return () => {
      console.log("🔐 useAuth: Cleaning up auth listener");
      sub.subscription.unsubscribe();
    };
  }, []);

  const user: User | null = session?.user ?? null;

  // Fetch staff profile when user changes
  useEffect(() => {
    if (!user) {
      console.log("🔐 useAuth: No user, clearing staff profile");
      setStaffProfile(null);
      setRole(null);
      return;
    }

    let active = true;
    setError(null);

    const fetchStaffProfile = async () => {
      try {
        console.log("🔍 useAuth: Fetching staff profile for user:", user.id);
        console.log("🔍 useAuth: User email:", user.email);

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
          console.error("🔍 useAuth: Error fetching staff:", error);
          throw error;
        }

        console.log("🔍 useAuth: Staff data from DB:", data);

        if (active) {
          if (data) {
            console.log("🔍 useAuth: Found staff record with role:", data.role);
            
            // Check if staff is active
            if (!data.is_active) {
              console.log("🔍 useAuth: Staff account is deactivated");
              setError("Your account has been deactivated. Please contact your administrator.");
              setStaffProfile(null);
              setRole(null);
              // Sign out inactive user
              await supabase.auth.signOut();
              return;
            }
            
            setStaffProfile(data);
            setRole(data.role);
            console.log("✅ useAuth: Role set to:", data.role);
            console.log("✅ useAuth: isOwner:", data.role === "owner");
            console.log("✅ useAuth: isManager:", data.role === "owner" || data.role === "manager");
            console.log("✅ useAuth: isCashier:", data.role === "cashier");
          } else {
            // No staff profile found - user not authorized
            console.log("⚠️ useAuth: No staff record found!");
            setError("No staff profile found. Please contact your administrator.");
            setStaffProfile(null);
            setRole(null);
            // Sign out unauthorized user
            await supabase.auth.signOut();
          }
        }
      } catch (err: any) {
        console.error("❌ useAuth: Error fetching staff profile:", err);
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
      console.log("🔐 useAuth: Signing in user:", email);
      setError(null);
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error("❌ useAuth: Sign in error:", error);
        throw error;
      }
      
      console.log("✅ useAuth: Sign in successful:", data.user?.email);
      
      // Staff profile will be fetched by the useEffect above
      return { data, error: null };
    } catch (err: any) {
      console.error("❌ useAuth: Sign in error:", err);
      setError(err.message);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  }, []);

  // Sign out function
  const signOut = useCallback(async () => {
    try {
      console.log("🔐 useAuth: Signing out");
      setError(null);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setRole(null);
      setStaffProfile(null);
      console.log("✅ useAuth: Sign out successful");
      return { error: null };
    } catch (err: any) {
      console.error("❌ useAuth: Sign out error:", err);
      setError(err.message);
      return { error: err };
    }
  }, []);

  // Refresh staff profile
  const refreshProfile = useCallback(async () => {
    if (!user) {
      console.log("🔐 useAuth: No user to refresh");
      return;
    }
    
    try {
      console.log("🔄 useAuth: Refreshing staff profile for:", user.email);
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

      if (error) {
        console.error("❌ useAuth: Refresh error:", error);
        throw error;
      }

      if (data) {
        console.log("🔄 useAuth: Refreshed role:", data.role);
        if (!data.is_active) {
          console.log("🔄 useAuth: Account deactivated during refresh");
          setError("Your account has been deactivated.");
          await supabase.auth.signOut();
          return;
        }
        setStaffProfile(data);
        setRole(data.role);
        console.log("✅ useAuth: Refresh complete, role:", data.role);
      } else {
        console.log("⚠️ useAuth: No staff record found during refresh");
        setStaffProfile(null);
        setRole(null);
      }
    } catch (err: any) {
      console.error("❌ useAuth: Error refreshing profile:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Check if user has specific role
  const hasRole = useCallback((requiredRole: AppRole | AppRole[]) => {
    if (!role) {
      console.log("🔐 useAuth: hasRole called but role is null");
      return false;
    }
    if (Array.isArray(requiredRole)) {
      const has = requiredRole.includes(role);
      console.log(`🔐 useAuth: hasRole ${JSON.stringify(requiredRole)}: ${has} (current: ${role})`);
      return has;
    }
    const has = role === requiredRole;
    console.log(`🔐 useAuth: hasRole ${requiredRole}: ${has} (current: ${role})`);
    return has;
  }, [role]);

  // Log current state
  console.log("📊 useAuth: Current state:", {
    user: user?.email,
    role: role,
    staffProfile: staffProfile?.id,
    loading: loading,
    isOwner: role === "owner",
    isManager: role === "owner" || role === "manager",
    isCashier: role === "cashier",
  });

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
