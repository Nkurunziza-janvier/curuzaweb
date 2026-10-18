import { Activity, Building2, LayoutDashboard, LogOut, Menu, ShieldCheck, X, CreditCard } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Brand, Button, ButtonLink } from "../components/ui";
import { useCurrentUser } from "../hooks/apiHooks";
import { authService } from "../services/authService";
import { NotificationBell } from "../components/NotificationBell";
import { LanguageSwitcher, useLanguage } from "../i18n";

const adminLinks = [
  ["/admin", "Overview", LayoutDashboard],
  ["/admin/businesses", "Businesses", Building2],
  ["/admin/payments", "Payment reviews", CreditCard],
  ["/admin/activity", "Admin activity", Activity],
] as const;

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const { data: user } = useCurrentUser();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logout = () => {
    authService.signOut();
    queryClient.clear();
    navigate("/login", { replace: true });
  };
  const navigation = <>
    <div className="px-5 py-5"><Brand /></div>
    <div className="px-3">
      <p className="px-3 pb-2 text-[.65rem] font-bold uppercase tracking-[.14em] text-muted">{t("Platform")}</p>
      <nav className="space-y-1">{adminLinks.map(([to, label, Icon]) => <NavLink key={to} end={to === "/admin"} to={to} onClick={() => setOpen(false)} className={({ isActive }) => `admin-nav-link flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? "admin-nav-active" : "text-muted"}`}><Icon size={18} />{t(label)}</NavLink>)}</nav>
    </div>
    <div className="mt-auto p-4"><div className="admin-role-card rounded-2xl p-4"><span className="admin-role-icon grid size-9 place-items-center rounded-xl"><ShieldCheck size={18} /></span><p className="mt-3 text-sm font-bold">Platform administrator</p><p className="mt-1 text-xs leading-relaxed text-muted">Manage business access, product publishing, and directory visibility.</p></div></div>
  </>;

  return <div className="ebiz-dashboard ebiz-admin min-h-screen bg-[#f4f6f2]">
    <aside className="dashboard-sidebar fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r lg:flex">{navigation}</aside>
    {open && <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Close admin navigation" className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={() => setOpen(false)} /><aside className="dashboard-sidebar relative flex h-full w-72 flex-col border-r shadow-float"><Button variant="ghost" className="absolute right-2 top-3" aria-label="Close navigation" onClick={() => setOpen(false)} icon={<X />} />{navigation}</aside></div>}
    <div className="lg:pl-64">
      <header className="dashboard-topbar sticky top-0 z-30 flex h-18 items-center justify-between border-b px-4 backdrop-blur-xl sm:px-7">
        <Button variant="ghost" className="lg:hidden" aria-label="Open admin navigation" onClick={() => setOpen(true)} icon={<Menu />} />
        <div className="hidden lg:block"><p className="text-xs text-muted">e-businessRw</p><p className="text-sm font-bold">Platform administration</p></div>
        <div className="ml-auto flex items-center gap-2"><LanguageSwitcher compact /><ButtonLink to="/" variant="secondary" className="hidden sm:inline-flex">{t("View public site")}</ButtonLink><NotificationBell /><Button variant="ghost" className="gap-2" onClick={logout} aria-label={`${t("Sign out")} ${user?.name ?? ""}`}><span className="admin-avatar grid size-8 place-items-center rounded-full text-xs font-bold">{user?.name?.slice(0, 2).toUpperCase() ?? "A"}</span><span className="hidden text-sm sm:inline">{user?.name ?? t("Admin")}</span><LogOut size={15} /></Button></div>
      </header>
      <main className="dashboard-content page-enter min-h-[calc(100vh-4.5rem)] p-4 sm:p-7 lg:p-9"><Outlet /></main>
    </div>
  </div>;
}
