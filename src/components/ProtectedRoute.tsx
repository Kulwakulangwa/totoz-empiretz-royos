import { Navigate } from "react-router-dom";
import { useAuth, type AppRole } from "@/hooks/use-auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: AppRole | AppRole[];
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredRole,
  redirectTo = "/auth"
}: ProtectedRouteProps) {
  const { user, role, loading, isOwner, isManager, isCashier } = useAuth();

  // Debug logging
  console.log("🔐 ProtectedRoute Debug:");
  console.log("  - User:", user?.email);
  console.log("  - Role from hook:", role);
  console.log("  - isOwner:", isOwner);
  console.log("  - isManager:", isManager);
  console.log("  - isCashier:", isCashier);
  console.log("  - Required role:", requiredRole);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    console.log("🔐 No user, redirecting to auth");
    return <Navigate to={redirectTo} replace />;
  }

  // If no role required, allow access
  if (!requiredRole) {
    console.log("🔐 No role required, allowing access");
    return <>{children}</>;
  }

  // Check role
  let hasRequiredRole = false;
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  
  for (const r of roles) {
    if (r === "owner" && isOwner) {
      hasRequiredRole = true;
      break;
    }
    if (r === "manager" && isManager) {
      hasRequiredRole = true;
      break;
    }
    if (r === "cashier" && isCashier) {
      hasRequiredRole = true;
      break;
    }
    // Fallback: check direct role match
    if (r === role) {
      hasRequiredRole = true;
      break;
    }
  }

  if (!hasRequiredRole) {
    console.log(`🔐 Role check failed. Required: ${requiredRole}, Current: ${role}`);
    return <Navigate to="/dashboard" replace />;
  }

  console.log("🔐 Role check passed, rendering children");
  return <>{children}</>;
}
