import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import MarketingLayout from "../layouts/MarketingLayout";
import DashboardLayout from "../layouts/DashboardLayout";
import ProtectedRoute from "../components/auth/ProtectedRoute";

const LandingPage = lazy(() => import("../pages/LandingPage"));
const PricingPage = lazy(() => import("../pages/PricingPage"));
const PublicBusinessPage = lazy(() => import("../pages/PublicBusinessPage"));
const RequestPage = lazy(() => import("../pages/RequestPage"));
const QuotePage = lazy(() => import("../pages/QuotePage"));
const ActionPage = lazy(() => import("../pages/ActionPage"));
const OnboardingPage = lazy(() => import("../pages/OnboardingPage"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage"));
const AuthPage = lazy(() => import("../pages/AuthPages").then((module) => ({ default: module.AuthPage })));
const DashboardHome = lazy(() => import("../pages/DashboardPages").then((module) => ({ default: module.DashboardHome })));
const RequestsPage = lazy(() => import("../pages/DashboardPages").then((module) => ({ default: module.RequestsPage })));
const CreateQuotePage = lazy(() => import("../pages/DashboardPages").then((module) => ({ default: module.CreateQuotePage })));
const ResourcePage = lazy(() => import("../pages/DashboardPages").then((module) => ({ default: module.ResourcePage })));
const AnalyticsPage = lazy(() => import("../pages/DashboardPages").then((module) => ({ default: module.AnalyticsPage })));

function Page({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="grid min-h-[60vh] place-items-center"><div className="skeleton h-12 w-48 rounded-2xl" aria-label="Loading page" /></div>}>
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    Component: MarketingLayout,
    children: [
      { index: true, element: <Page><LandingPage /></Page> },
      { path: "pricing", element: <Page><PricingPage /></Page> },
    ],
  },
  { path: "login", element: <Page><AuthPage /></Page> },
  { path: "register", element: <Page><AuthPage register /></Page> },
  { path: "onboarding", element: <Page><OnboardingPage /></Page> },
  { path: "b/:businessSlug", element: <Page><PublicBusinessPage /></Page> },
  { path: "b/:businessSlug/request", element: <Page><RequestPage /></Page> },
  { path: "b/:businessSlug/:action", element: <Page><ActionPage /></Page> },
  { path: "q/:quoteId", element: <Page><QuotePage /></Page> },
  {
    path: "dashboard",
    element: <ProtectedRoute><DashboardLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <Page><DashboardHome /></Page> },
      { path: "requests", element: <Page><RequestsPage /></Page> },
      { path: "quotes", element: <Page><ResourcePage type="quotes" /></Page> },
      { path: "quotes/new", element: <Page><CreateQuotePage /></Page> },
      { path: "products", element: <Page><ResourcePage type="products" /></Page> },
      { path: "services", element: <Page><ResourcePage type="services" /></Page> },
      { path: "offers", element: <Page><ResourcePage type="offers" /></Page> },
      { path: "business-page", element: <Page><ResourcePage type="business-page" /></Page> },
      { path: "analytics", element: <Page><AnalyticsPage /></Page> },
      { path: "settings", element: <Page><ResourcePage type="settings" /></Page> },
    ],
  },
  { path: "signup", element: <Navigate to="/register" replace /> },
  { path: "*", element: <Page><NotFoundPage /></Page> },
]);
