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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  // If no role required, allow access
  if (!requiredRole) {
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
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
