import { BarChart3, CalendarClock, CalendarDays, ChevronDown, Eye, FileText, Gift, LayoutDashboard, Menu, Package, PanelTop, Settings, ShoppingBag, Sparkles, X, CreditCard } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Brand, Button, ButtonLink } from "../components/ui";
import { useCurrentUser } from "../hooks/apiHooks";
import { authService } from "../services/authService";
import { NotificationBell } from "../components/NotificationBell";
import { LanguageSwitcher, useLanguage } from "../i18n";

const links = [
  ["/dashboard", "Overview", LayoutDashboard],
  ["/dashboard/requests", "Requests", FileText],
  ["/dashboard/bookings", "Bookings", CalendarDays],
  ["/dashboard/availability", "Availability", CalendarClock],
  ["/dashboard/quotes", "Quotes", Sparkles],
  ["/dashboard/products", "Products", Package],
  ["/dashboard/billing", "Plans & billing", CreditCard],
  ["/dashboard/services", "Services", ShoppingBag],
  ["/dashboard/offers", "Offers", Gift],
  ["/dashboard/business-page", "Business page", PanelTop],
  ["/dashboard/analytics", "Analytics", BarChart3],
  ["/dashboard/settings", "Settings", Settings],
] as const;

export default function DashboardLayout() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const { t } = useLanguage();
  const businessSlug = user?.business?.slug ?? "";
  const logout = () => {
    authService.signOut();
    queryClient.clear();
    navigate("/login", { replace: true });
  };
  const side = <><div className="px-5 py-5"><Brand /></div><div className="px-3"><p className="px-3 pb-2 text-[.65rem] font-bold uppercase tracking-[.14em] text-muted">{t("Workspace")}</p><nav className="space-y-1">{links.map(([to, label, Icon]) => <NavLink key={to} end={to === "/dashboard"} to={to} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? "bg-ink text-white shadow-md" : "text-muted hover:bg-white hover:text-ink"}`}><Icon size={18} />{t(label)}</NavLink>)}</nav></div><div className="mt-auto p-4"><div className="rounded-2xl bg-violet-soft p-4"><Sparkles size={18} className="text-violet" /><p className="mt-3 text-sm font-bold">{t("Grow with every action")}</p><p className="mt-1 text-xs leading-relaxed text-muted">{t("Complete your page to improve customer conversion.")}</p><div className="mt-3 h-1.5 rounded-full bg-white"><div className="h-full w-4/5 rounded-full bg-violet" /></div></div></div></>;
  return (
    <div className="ebiz-dashboard min-h-screen bg-[#f7f6f2]">
      <aside className="dashboard-sidebar fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-cream lg:flex">{side}</aside>
      {open && <div className="fixed inset-0 z-50 lg:hidden"><button aria-label={t("Close navigation")} className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={() => setOpen(false)} /><aside className="dashboard-sidebar relative flex h-full w-[min(18rem,calc(100vw-2rem))] flex-col bg-cream shadow-float"><Button variant="ghost" aria-label={t("Close navigation")} className="absolute right-2 top-3" onClick={() => setOpen(false)} icon={<X />} />{side}</aside></div>}
      <div className="min-w-0 lg:pl-64">
        <header className="dashboard-topbar sticky top-0 z-30 flex h-18 items-center justify-between border-b border-line/70 bg-[#f7f6f2]/90 px-4 backdrop-blur-xl sm:px-7">
          <Button variant="ghost" className="lg:hidden" aria-label={t("Open navigation")} onClick={() => setOpen(true)} icon={<Menu />} />
          <div className="hidden lg:block"><p className="text-xs text-muted">{user?.business?.name ?? t("Business workspace")}</p><p className="text-sm font-bold">{t("Business workspace")}</p></div>
          <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2"><LanguageSwitcher compact />{businessSlug && <ButtonLink to={`/b/${businessSlug}`} target="_blank" rel="noopener noreferrer" variant="secondary" className="!min-h-10 !px-3 sm:!px-4" icon={<Eye size={16} />}><span className="hidden sm:inline">{t("View public page")}</span><span className="sr-only sm:hidden">{t("View public page")}</span></ButtonLink>}<NotificationBell /><Button variant="ghost" className="gap-2 !px-2 sm:!px-3" onClick={logout} aria-label={`${t("Sign out")} ${user?.name ?? ""}`}><span className="grid size-8 shrink-0 place-items-center rounded-full bg-coral-soft text-xs font-bold text-coral-dark">{user?.name?.slice(0, 2).toUpperCase() ?? "U"}</span><span className="hidden text-sm sm:inline">{user?.name ?? t("Account")}</span><ChevronDown size={14} /></Button></div>
        </header>
        <main className="dashboard-content page-enter min-w-0 p-4 sm:p-7 lg:p-9"><Outlet /></main>
      </div>
    </div>
  );
}
