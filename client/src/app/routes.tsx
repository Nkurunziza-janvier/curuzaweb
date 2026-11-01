import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import MarketingLayout from "../layouts/MarketingLayout";
import DashboardLayout from "../layouts/DashboardLayout";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import CapabilityRoute from "../components/auth/CapabilityRoute";
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
const OrderPage = lazy(() => import("../pages/OrderPage"));
const OrderStatusPage = lazy(() => import("../pages/OrderStatusPage"));
const OnboardingPage = lazy(() => import("../pages/OnboardingPage"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage"));
const AuthPage = lazy(() => import("../pages/AuthPages").then((module) => ({ default: module.AuthPage })));
const DashboardHome = lazy(() => import("../pages/DashboardHome"));
const DashboardCustomersPage = lazy(() => import("../pages/DashboardCustomers"));
const DashboardReviewsPage = lazy(() => import("../pages/DashboardReviews"));
const DashboardFeaturesPage = lazy(() => import("../pages/DashboardFeatures"));
const RequestsPage = lazy(() => import("../pages/DashboardPages").then((module) => ({ default: module.RequestsPage })));
const RequestDetailPage = lazy(() => import("../pages/DashboardPages").then((module) => ({ default: module.RequestDetailPage })));
const CreateQuotePage = lazy(() => import("../pages/DashboardPages").then((module) => ({ default: module.CreateQuotePage })));
const QuoteDetailPage = lazy(() => import("../pages/DashboardPages").then((module) => ({ default: module.QuoteDetailPage })));
const ResourcePage = lazy(() => import("../pages/DashboardPages").then((module) => ({ default: module.ResourcePage })));
const AnalyticsPage = lazy(() => import("../pages/DashboardPages").then((module) => ({ default: module.AnalyticsPage })));
const DashboardOrdersPage = lazy(() => import("../pages/DashboardOrders"));
const DashboardBookingsPage = lazy(() => import("../pages/DashboardBookings"));
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
  { path: "b/:businessSlug/order", element: <Page><OrderPage /></Page> },
  { path: "bookings/:publicToken", element: <Page><BookingStatusPage /></Page> },
  { path: "orders/:publicToken", element: <Page><OrderStatusPage /></Page> },
  { path: "b/:businessSlug/:action", element: <Page><ActionPage /></Page> },
  { path: "q/:publicToken", element: <Page><QuotePage /></Page> },
  {
    path: "dashboard",
    element: <ProtectedRoute><DashboardLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <Page><DashboardHome /></Page> },
      { path: "orders", element: <Page><CapabilityRoute moduleKey="orders"><DashboardOrdersPage /></CapabilityRoute></Page> },
      { path: "bookings", element: <Page><CapabilityRoute moduleKey="bookings"><DashboardBookingsPage /></CapabilityRoute></Page> },
      { path: "requests", element: <Page><CapabilityRoute moduleKey="requests"><RequestsPage /></CapabilityRoute></Page> },
      { path: "requests/:requestId", element: <Page><CapabilityRoute moduleKey="requests"><RequestDetailPage /></CapabilityRoute></Page> },
      { path: "quotes", element: <Page><CapabilityRoute moduleKey="quotes"><ResourcePage type="quotes" /></CapabilityRoute></Page> },
      { path: "quotes/new", element: <Page><CapabilityRoute moduleKey="quotes"><CreateQuotePage /></CapabilityRoute></Page> },
      { path: "quotes/:quoteId", element: <Page><CapabilityRoute moduleKey="quotes"><QuoteDetailPage /></CapabilityRoute></Page> },
      { path: "products", element: <Page><CapabilityRoute moduleKey="products"><ResourcePage type="products" /></CapabilityRoute></Page> },
      { path: "customers", element: <Page><CapabilityRoute moduleKey="customers"><DashboardCustomersPage /></CapabilityRoute></Page> },
      { path: "reviews", element: <Page><CapabilityRoute moduleKey="reviews"><DashboardReviewsPage /></CapabilityRoute></Page> },
      { path: "billing", element: <Page><BillingPage /></Page> },
      { path: "services", element: <Page><CapabilityRoute moduleKey="services"><ResourcePage type="services" /></CapabilityRoute></Page> },
      { path: "offers", element: <Page><CapabilityRoute moduleKey="offers"><ResourcePage type="offers" /></CapabilityRoute></Page> },
      { path: "business-page", element: <Page><ResourcePage type="business-page" /></Page> },
      { path: "features", element: <Page><DashboardFeaturesPage /></Page> },
      { path: "analytics", element: <Page><AnalyticsPage /></Page> },
      { path: "assistant", element: <Page><AssistantPage /></Page> },
      { path: "settings", element: <Page><ResourcePage type="settings" /></Page> },
    ],
  },
  { path: "signup", element: <Navigate to="/register" replace /> },
  { path: "*", element: <Page><NotFoundPage /></Page> },
]);
