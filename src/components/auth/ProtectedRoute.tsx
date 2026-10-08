import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { authService } from "../../services/authService";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();

  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
