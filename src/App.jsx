// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./contextproviders/AuthContext";
import { ConfigContextAuthProvider } from "./contextproviders/ConfigContext";
import { DBAuthProvider } from "./contextproviders/DashboardContext";
import ComingSoon from "./pages/ComingSoon";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AgentBreakdown from "./pages/reporting/ByAgent";
import StateBreakdown from "./pages/reporting/ByState";
import { Toaster } from "@/components/ui/sonner";
import VendorBreakdown from "./pages/reporting/ByVendor";

function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
}

function PublicRoute() {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return isAuthenticated ? <Navigate to="/dashboard" /> : <Outlet />;
}

function ProtectedWithConfig() {
  return (
    <ConfigContextAuthProvider>
      <Outlet />
    </ConfigContextAuthProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes - NO config context */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
          </Route>

          {/* Protected routes - WITH config context */}
          <Route element={<ProtectedRoute />}>
            <Route element={<ProtectedWithConfig />}>
              <Route 
                path="/dashboard" 
                element={
                  <DBAuthProvider>
                    <Dashboard />
                  </DBAuthProvider>
                } 
              />
              <Route 
                path="/reporting/agent" 
                element={
                  <AgentBreakdown />
                } 
              />
               <Route 
                path="/reporting/state" 
                element={
                  <StateBreakdown />
                } 
              />
              <Route 
                path="/reporting/vendor" 
                element={
                  <VendorBreakdown />
                } 
              />
              {/* All other protected routes get config too */}
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<ComingSoon/>}/>
        </Routes>
      </AuthProvider>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;