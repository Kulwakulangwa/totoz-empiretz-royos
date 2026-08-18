import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthPage } from "@/pages/AuthPage";
import { Dashboard } from "@/pages/Dashboard";
import { POS } from "@/pages/POS";
import { Inventory } from "@/pages/Inventory";
import { StaffManagement } from "@/pages/Admin/StaffManagement";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/hooks/useAuth";

// Wrapper component to handle role-based redirects
function AppContent() {
  const { role, loading, user } = useAuth();

  // Debug
  console.log("AppContent - User:", user?.email);
  console.log("AppContent - Role:", role);
  console.log("AppContent - Loading:", loading);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/pos"
        element={
          <ProtectedRoute requiredRole={["owner", "manager", "cashier"]}>
            <POS />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/inventory"
        element={
          <ProtectedRoute requiredRole={["owner", "manager"]}>
            <Inventory />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/staff"
        element={
          <ProtectedRoute requiredRole="owner">
            <StaffManagement />
          </ProtectedRoute>
        }
      />
      
      {/* Redirect based on role */}
      <Route 
        path="/" 
        element={
          user ? (
            role === "cashier" ? 
              <Navigate to="/pos" replace /> : 
              <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/auth" replace />
          )
        } 
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
