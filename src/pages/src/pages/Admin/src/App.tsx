import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthPage } from "@/pages/AuthPage";
import { Dashboard } from "@/pages/Dashboard";
import { POS } from "@/pages/POS";
import { Inventory } from "@/pages/Inventory";
import { StaffManagement } from "@/pages/Admin/StaffManagement";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthProvider } from "@/contexts/AuthContext";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
              <ProtectedRoute requiredRole="cashier">
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
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
