import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { useCurrentUser } from "../../hooks/apiHooks";
import { dashboardModules, moduleIsVisible } from "../../lib/dashboardModules";

export default function CapabilityRoute({ moduleKey, children }: { moduleKey: string; children: ReactNode }) {
  const { data: user, isLoading } = useCurrentUser();
  const module = dashboardModules.find((entry) => entry.key === moduleKey);
  if (!module || isLoading) return children;
  if (!moduleIsVisible(module, user?.business?.capabilities)) return <Navigate to="/dashboard" replace />;
  return children;
}
