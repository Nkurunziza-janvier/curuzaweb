import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import MarketingLayout from "../layouts/MarketingLayout";
import DashboardLayout from "../layouts/DashboardLayout";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import BrandLoader from "../components/BrandLoader";
import PublicBusinessPage from "../pages/PublicBusinessPage";
import { LanguageSwitcher, useLanguage } from "../i18n";

const LandingPage = lazy(() => import("../pages/LandingPage"));
const PricingPage = lazy(() => import("../pages/PricingPage"));
const RequestPage = lazy(() => import("../pages/RequestPage"));
const QuotePage = lazy(() => import("../pages/QuotePage"));
const ActionPage = lazy(() => import("../pages/ActionPage"));
const BookingPage = lazy(() => import("../pages/BookingPage"));
const BookingStatusPage = lazy(() => import("../pages/BookingStatusPage"));
const OnboardingPage = lazy(() => import("../pages/OnboardingPage"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage"));
const AuthPage = lazy(() => import("../pages/AuthPages").then((module) => ({ default: module.AuthPage })));
const DashboardHome = lazy(() => import("../pages/DashboardPages").then((module) => ({ default: module.DashboardHome })));
const RequestsPage = lazy(() => import("../pages/DashboardPages").then((module) => ({ default: module.RequestsPage })));
const RequestDetailPage = lazy(() => import("../pages/DashboardPages").then((module) => ({ default: module.RequestDetailPage })));
const CreateQuotePage = lazy(() => import("../pages/DashboardPages").then((module) => ({ default: module.CreateQuotePage })));
const QuoteDetailPage = lazy(() => import("../pages/DashboardPages").then((module) => ({ default: module.QuoteDetailPage })));
const ResourcePage = lazy(() => import("../pages/DashboardPages").then((module) => ({ default: module.ResourcePage })));
const AnalyticsPage = lazy(() => import("../pages/DashboardPages").then((module) => ({ default: module.AnalyticsPage })));
const AdminLayout = lazy(() => import("../layouts/AdminLayout"));
const AdminOverviewPage = lazy(() => import("../pages/AdminPages").then((module) => ({ default: module.AdminOverviewPage })));
const AdminBusinessesPage = lazy(() => import("../pages/AdminPages").then((module) => ({ default: module.AdminBusinessesPage })));
const AdminActivityPage = lazy(() => import("../pages/AdminPages").then((module) => ({ default: module.AdminActivityPage })));
const AdminPaymentsPage = lazy(() => import("../pages/SubscriptionPages").then((module) => ({ default: module.AdminPaymentsPage })));
const BillingPage = lazy(() => import("../pages/SubscriptionPages").then((module) => ({ default: module.BillingPage })));
const AssistantPage = lazy(() => import("../pages/DashboardAssistant"));

function LoadingFallback() {
  const { t } = useLanguage();
  return <><div className="fixed right-5 top-5 z-[100]"><LanguageSwitcher compact /></div><BrandLoader title={t("Opening e-businessRw")} detail={t("Getting the experience ready for you.")} /></>;
}

function Page({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingFallback />}>
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
  {
    path: "admin",
    element: <ProtectedRoute requireAdmin><AdminLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <Page><AdminOverviewPage /></Page> },
      { path: "businesses", element: <Page><AdminBusinessesPage /></Page> },
      { path: "activity", element: <Page><AdminActivityPage /></Page> },
      { path: "payments", element: <Page><AdminPaymentsPage /></Page> },
    ],
  },
  { path: "onboarding", element: <ProtectedRoute><Page><OnboardingPage /></Page></ProtectedRoute> },
  { path: "b/:businessSlug", element: <Page><PublicBusinessPage /></Page> },
  { path: "b/:businessSlug/request", element: <Page><RequestPage /></Page> },
  { path: "b/:businessSlug/book", element: <Page><BookingPage /></Page> },
  { path: "bookings/:publicToken", element: <Page><BookingStatusPage /></Page> },
  { path: "b/:businessSlug/:action", element: <Page><ActionPage /></Page> },
  { path: "q/:publicToken", element: <Page><QuotePage /></Page> },
  {
    path: "dashboard",
    element: <ProtectedRoute><DashboardLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <Page><DashboardHome /></Page> },
      { path: "requests", element: <Page><RequestsPage /></Page> },
      { path: "requests/:requestId", element: <Page><RequestDetailPage /></Page> },
      { path: "quotes", element: <Page><ResourcePage type="quotes" /></Page> },
      { path: "quotes/new", element: <Page><CreateQuotePage /></Page> },
      { path: "quotes/:quoteId", element: <Page><QuoteDetailPage /></Page> },
      { path: "products", element: <Page><ResourcePage type="products" /></Page> },
      { path: "billing", element: <Page><BillingPage /></Page> },
      { path: "services", element: <Page><ResourcePage type="services" /></Page> },
      { path: "offers", element: <Page><ResourcePage type="offers" /></Page> },
      { path: "business-page", element: <Page><ResourcePage type="business-page" /></Page> },
      { path: "analytics", element: <Page><AnalyticsPage /></Page> },
      { path: "assistant", element: <Page><AssistantPage /></Page> },
      { path: "settings", element: <Page><ResourcePage type="settings" /></Page> },
    ],
  },
  { path: "signup", element: <Navigate to="/register" replace /> },
  { path: "*", element: <Page><NotFoundPage /></Page> },
]);
