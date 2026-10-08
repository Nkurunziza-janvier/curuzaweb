import { BarChart3, ChevronDown, FileText, Gift, LayoutDashboard, Menu, Package, PanelTop, Settings, ShoppingBag, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router";
import { Brand, Button, ButtonLink } from "../components/ui";

const links = [
  ["/dashboard", "Overview", LayoutDashboard],
  ["/dashboard/requests", "Requests", FileText],
  ["/dashboard/quotes", "Quotes", Sparkles],
  ["/dashboard/products", "Products", Package],
  ["/dashboard/services", "Services", ShoppingBag],
  ["/dashboard/offers", "Offers", Gift],
  ["/dashboard/business-page", "Business page", PanelTop],
  ["/dashboard/analytics", "Analytics", BarChart3],
  ["/dashboard/settings", "Settings", Settings],
] as const;

export default function DashboardLayout() {
  const [open, setOpen] = useState(false);
  const side = <><div className="px-5 py-5"><Brand /></div><div className="px-3"><p className="px-3 pb-2 text-[.65rem] font-bold uppercase tracking-[.14em] text-muted">Workspace</p><nav className="space-y-1">{links.map(([to, label, Icon]) => <NavLink key={to} end={to === "/dashboard"} to={to} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? "bg-ink text-white shadow-md" : "text-muted hover:bg-white hover:text-ink"}`}><Icon size={18} />{label}{label === "Requests" && <span className="ml-auto rounded-full bg-coral px-2 py-0.5 text-[.65rem] text-white">4</span>}</NavLink>)}</nav></div><div className="mt-auto p-4"><div className="rounded-2xl bg-violet-soft p-4"><Sparkles size={18} className="text-violet" /><p className="mt-3 text-sm font-bold">Grow with every action</p><p className="mt-1 text-xs leading-relaxed text-muted">Complete your page to improve customer conversion.</p><div className="mt-3 h-1.5 rounded-full bg-white"><div className="h-full w-4/5 rounded-full bg-violet" /></div></div></div></>;
  return (
    <div className="min-h-screen bg-[#f7f6f2]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-cream lg:flex">{side}</aside>
      {open && <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Close navigation" className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={() => setOpen(false)} /><aside className="relative flex h-full w-72 flex-col bg-cream shadow-float"><Button variant="ghost" className="absolute right-2 top-3" onClick={() => setOpen(false)} icon={<X />} />{side}</aside></div>}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-18 items-center justify-between border-b border-line/70 bg-[#f7f6f2]/90 px-4 backdrop-blur-xl sm:px-7">
          <Button variant="ghost" className="lg:hidden" aria-label="Open navigation" onClick={() => setOpen(true)} icon={<Menu />} />
          <div className="hidden lg:block"><p className="text-xs text-muted">Afrinaija Pots</p><p className="text-sm font-bold">Business workspace</p></div>
          <div className="ml-auto flex items-center gap-2"><ButtonLink to="/b/afrinai-ja" variant="secondary" className="hidden sm:inline-flex">View public page</ButtonLink><Button variant="ghost" className="gap-2"><span className="grid size-8 place-items-center rounded-full bg-coral-soft text-xs font-bold text-coral-dark">AN</span><span className="hidden text-sm sm:inline">Amina</span><ChevronDown size={14} /></Button></div>
        </header>
        <main className="page-enter p-4 sm:p-7 lg:p-9"><Outlet /></main>
      </div>
    </div>
  );
}
