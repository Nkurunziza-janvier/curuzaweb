import { useEffect, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { authService } from "../../services/authService";
import { useCurrentUser } from "../../hooks/apiHooks";
import BrandLoader from "../BrandLoader";

export default function ProtectedRoute({ children, requireAdmin = false }: { children: ReactNode; requireAdmin?: boolean }) {
  const location = useLocation();
  const user = useCurrentUser();
  useEffect(() => {
    if (user.isError) authService.signOut();
  }, [user.isError]);

  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (user.isLoading) return <BrandLoader title="Securing your workspace" detail="Checking your account and preparing your dashboard." />;
  if (user.isError || !user.data) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (requireAdmin && user.data.role !== "ADMIN") return <Navigate to="/dashboard" replace />;

  return children;
}
