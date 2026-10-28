import { BarChart3, ChevronRight, CreditCard, Eye, FileText, Gift, LayoutDashboard, LogOut, Menu, Package, PanelTop, Settings, ShoppingBag, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Brand, Button, ButtonLink } from "../components/ui";
import { useCurrentUser } from "../hooks/apiHooks";
import { authService } from "../services/authService";
import { NotificationBell } from "../components/NotificationBell";
import { LanguageSwitcher, useLanguage } from "../i18n";

const groups = [
  {
    label: "Overview",
    links: [
      ["/dashboard", "Overview", LayoutDashboard],
      ["/dashboard/analytics", "Analytics", BarChart3],
    ],
  },
  {
    label: "Customers",
    links: [
      ["/dashboard/requests", "Requests", FileText],
      ["/dashboard/quotes", "Quotes", Sparkles],
    ],
  },
  {
    label: "Catalog",
    links: [
      ["/dashboard/products", "Products", Package],
      ["/dashboard/services", "Services", ShoppingBag],
      ["/dashboard/offers", "Offers", Gift],
    ],
  },
  {
    label: "Business",
    links: [
      ["/dashboard/business-page", "Business page", PanelTop],
      ["/dashboard/billing", "Plans & billing", CreditCard],
      ["/dashboard/settings", "Settings", Settings],
    ],
  },
  {
    label: "Support",
    links: [["/dashboard/assistant", "AI Assistant", Sparkles, "New"]],
  },
] as const;

const pageTitles: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/requests": "Requests",
  "/dashboard/quotes": "Quotes",
  "/dashboard/products": "Products",
  "/dashboard/services": "Services",
  "/dashboard/offers": "Offers",
  "/dashboard/business-page": "Business page",
  "/dashboard/billing": "Plans & billing",
  "/dashboard/settings": "Settings",
  "/dashboard/analytics": "Analytics",
  "/dashboard/assistant": "AI Assistant",
};

function currentPageTitle(pathname: string) {
  const match = Object.keys(pageTitles)
    .filter((path) => pathname === path || pathname.startsWith(`${path}/`))
    .sort((a, b) => b.length - a.length)[0];
  return pageTitles[match ?? "/dashboard"] ?? "Overview";
}

export default function DashboardLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const { t } = useLanguage();
  const business = user?.business;
  const businessSlug = business?.slug ?? "";
  const initials = (user?.name ?? "Business")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const logout = () => {
    authService.signOut();
    queryClient.clear();
    navigate("/login", { replace: true });
  };

  const side = (
    <>
      <div className="dash-side-head">
        <Brand />
        <button type="button" aria-label={t("Close navigation")} onClick={() => setOpen(false)} className="dash-side-close lg:hidden">
          <X size={18} />
        </button>
      </div>

      <div className="dash-workspace-card">
        <span className="dash-workspace-avatar">{initials.slice(0, 1)}</span>
        <div className="min-w-0">
          <strong className="dash-workspace-name">{business?.name ?? t("Your business")}</strong>
          <span className="dash-workspace-meta">
            <span className={`dash-status-dot ${business?.isPublished ? "is-live" : ""}`} />
            {business?.isPublished ? t("Live") : t("Draft")}
            {business?.category ? ` · ${business.category}` : ""}
          </span>
        </div>
        {businessSlug && (
          <a href={`/b/${businessSlug}`} target="_blank" rel="noopener noreferrer" aria-label={t("View public page")} className="dash-workspace-link">
            <ChevronRight size={16} />
          </a>
        )}
      </div>

      <nav className="dash-nav" aria-label={t("Dashboard")}>
        {groups.map((group) => (
          <div key={group.label} className="dash-nav-group">
            <p className="dash-nav-label">{t(group.label)}</p>
            {group.links.map(([to, label, Icon, badge]) => (
              <NavLink key={to} end={to === "/dashboard"} to={to} className={({ isActive }) => `dash-nav-link ${isActive ? "is-active" : ""}`}>
                <Icon size={17} strokeWidth={2} />
                <span className="dash-nav-text">{t(label)}</span>
                {badge && <span className="dash-nav-new">{t(badge)}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="dash-side-foot">
        <div className="dash-mobile-lang"><LanguageSwitcher compact /></div>
        <div className="dash-help-card">
          <span className="dash-help-icon"><Sparkles size={16} /></span>
          <div>
            <p className="dash-help-title">{t("Need a hand?")}</p>
            <p className="dash-help-copy">{t("Ask the assistant about publishing, quotes, and more.")}</p>
          </div>
          <ButtonLink to="/dashboard/assistant" variant="secondary" className="dash-help-btn">
            {t("Ask AI")}
            <ChevronRight size={14} />
          </ButtonLink>
        </div>
        <div className="dash-account">
          <span className="dash-account-avatar">{initials || "U"}</span>
          <div className="min-w-0">
            <strong className="dash-account-name">{user?.name ?? t("Account")}</strong>
            <span className="dash-account-email">{user?.email ?? ""}</span>
          </div>
          <button type="button" className="dash-account-signout" onClick={logout} title={t("Sign out")} aria-label={`${t("Sign out")} ${user?.name ?? ""}`}>
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="ebiz-dashboard dash-shell min-h-screen bg-[#f4f6f2]">
      <aside className="dashboard-sidebar dash-sidebar fixed inset-y-0 left-0 z-40 hidden w-[17.5rem] flex-col border-r border-line lg:flex">{side}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label={t("Close navigation")} className="absolute inset-0 bg-ink/35 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside role="dialog" aria-modal="true" aria-label={t("Dashboard")} className="dashboard-sidebar dash-sidebar dash-sidebar-mobile relative flex h-full w-[min(18.5rem,calc(100vw-1.5rem))] flex-col border-r border-line bg-cream shadow-float">
            {side}
          </aside>
        </div>
      )}
      <div className="min-w-0 lg:pl-[17.5rem]">
        <header className="dashboard-topbar dash-topbar sticky top-0 z-30 flex h-[4.5rem] items-center gap-3 border-b border-line/70 px-4 backdrop-blur-xl sm:px-7">
          <Button variant="ghost" className="dash-menu-button !px-2" aria-label={t("Open navigation")} onClick={() => setOpen(true)} icon={<Menu size={19} />} />
          <div className="min-w-0">
            <p className="dash-topbar-eyebrow">{business?.name ?? t("Business workspace")}</p>
            <p className="dash-topbar-title">{t(currentPageTitle(location.pathname))}</p>
          </div>
          <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
            <div className="dash-topbar-lang"><LanguageSwitcher compact /></div>
            {businessSlug && (
              <ButtonLink to={`/b/${businessSlug}`} target="_blank" rel="noopener noreferrer" variant="secondary" className="dash-topbar-page !min-h-10 !px-3 sm:!px-4" icon={<Eye size={16} />}>
                <span className="hidden sm:inline">{t("View public page")}</span>
                <span className="sr-only sm:hidden">{t("View public page")}</span>
              </ButtonLink>
            )}
            <NotificationBell />
          </div>
        </header>
        <main className="dashboard-content page-enter min-w-0 p-4 sm:p-7 lg:p-9">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
