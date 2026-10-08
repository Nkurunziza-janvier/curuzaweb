import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Outlet, Link } from "react-router";
import { Brand, Button, ButtonLink } from "../components/ui";

export default function MarketingLayout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-cream/90 backdrop-blur-xl">
        <nav className="shell-wide flex h-18 items-center justify-between" aria-label="Main navigation">
          <Brand />
          <div className="hidden items-center gap-7 md:flex">
            <Link to="/#how-it-works" className="text-sm font-semibold text-muted hover:text-ink">How it works</Link>
            <Link to="/b/afrinai-ja" className="text-sm font-semibold text-muted hover:text-ink">Live demo</Link>
            <Link to="/pricing" className="text-sm font-semibold text-muted hover:text-ink">Pricing</Link>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <ButtonLink to="/login" variant="ghost">Log in</ButtonLink>
            <ButtonLink to="/register">Start free</ButtonLink>
          </div>
          <Button variant="ghost" className="md:hidden" aria-label="Toggle menu" onClick={() => setOpen(!open)} icon={open ? <X /> : <Menu />} />
        </nav>
        {open && <div className="border-t border-line bg-white p-4 md:hidden"><div className="grid gap-2"><ButtonLink to="/b/afrinai-ja" variant="ghost">Live demo</ButtonLink><ButtonLink to="/pricing" variant="ghost">Pricing</ButtonLink><ButtonLink to="/login" variant="secondary">Log in</ButtonLink><ButtonLink to="/register">Start free</ButtonLink></div></div>}
      </header>
      <main><Outlet /></main>
    </div>
  );
}
