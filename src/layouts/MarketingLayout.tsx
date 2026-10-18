import { Menu, X } from "lucide-react";
import { useEffect, useState, type MouseEvent } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { Brand, Button, ButtonLink } from "../components/ui";
import { LanguageSwitcher, useLanguage } from "../i18n";

const sectionLinks = [
  { label: "Features", href: "/#features", section: "features" },
  { label: "How It Works", href: "/#how-it-works", section: "how-it-works" },
  { label: "About", href: "/#about", section: "about" },
  { label: "Contact", href: "/#contact", section: "contact" },
];

export default function MarketingLayout() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("home");
  const location = useLocation();
  const navigate = useNavigate();
  const closeMenu = () => setOpen(false);
  const { t } = useLanguage();
  const scrollBehavior = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  const goHome = () => {
    closeMenu();
    if (location.pathname === "/") {
      if (location.hash) navigate("/", { preventScrollReset: true });
      window.scrollTo({ top: 0, behavior: scrollBehavior() });
    }
  };
  const goToSection = (section: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    closeMenu();
    if (location.pathname !== "/") return;
    event.preventDefault();
    if (location.hash !== `#${section}`) navigate(`/#${section}`, { preventScrollReset: true });
    window.requestAnimationFrame(() => document.getElementById(section)?.scrollIntoView({ behavior: scrollBehavior(), block: "start" }));
  };

  // Route changes also reset scroll and support anchors when arriving from
  // another page (for example, Pricing → Features).
  useEffect(() => {
    closeMenu();
    if (location.hash) {
      const sectionId = decodeURIComponent(location.hash.slice(1));
      let attempts = 0;
      let timer: number | undefined;
      const scrollToSection = () => {
        const section = document.getElementById(sectionId);
        if (section) {
          section.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
        } else if (attempts++ < 10) {
          timer = window.setTimeout(scrollToSection, 40);
        }
      };
      const frame = window.requestAnimationFrame(scrollToSection);
      return () => {
        window.cancelAnimationFrame(frame);
        if (timer) window.clearTimeout(timer);
      };
    }
    if (location.pathname !== "/") window.scrollTo({ top: 0, behavior: scrollBehavior() });
    return undefined;
  }, [location.pathname, location.hash]);

  // Keep the active navigation item in sync with the visible page section.
  useEffect(() => {
    if (location.pathname !== "/") {
      setActive(location.pathname === "/pricing" ? "pricing" : "");
      return;
    }
    const sectionIds = ["features", "how-it-works", "about", "contact"];
    const updateActive = () => {
      const marker = window.scrollY + Math.min(window.innerHeight * .34, 240);
      let current = "home";
      for (const id of sectionIds) {
        const section = document.getElementById(id);
        if (section && section.getBoundingClientRect().top + window.scrollY <= marker) current = id;
      }
      setActive(current);
    };
    updateActive();
    window.addEventListener("scroll", updateActive, { passive: true });
    window.addEventListener("resize", updateActive);
    return () => {
      window.removeEventListener("scroll", updateActive);
      window.removeEventListener("resize", updateActive);
    };
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const navClass = (key: string) => `ref-nav-link text-sm font-semibold ${active === key ? "ref-nav-active text-[#075b43]" : "text-muted hover:text-ink"}`;
  return (
    <div className="min-h-screen bg-cream">
      <header className="ebiz-marketing-header sticky top-0 z-40 border-b border-line/70 bg-cream/90 backdrop-blur-xl">
        <nav className="shell-wide marketing-nav flex h-16 items-center justify-between" aria-label="Main navigation">
          <Brand onClick={goHome} />
          <div className="ref-desktop-links hidden items-center gap-7 md:flex">
            <Link to="/" onClick={goHome} className={navClass("home")} aria-current={active === "home" ? "page" : undefined}>{t("Home")}</Link>
            {sectionLinks.slice(0, 2).map(({ label, href, section }) => <Link key={section} to={href} onClick={goToSection(section)} className={navClass(section)} aria-current={active === section ? "location" : undefined}>{t(label)}</Link>)}
            <Link to="/pricing" className={navClass("pricing")} aria-current={active === "pricing" ? "page" : undefined}>{t("Pricing")}</Link>
            {sectionLinks.slice(2).map(({ label, href, section }) => <Link key={section} to={href} onClick={goToSection(section)} className={navClass(section)} aria-current={active === section ? "location" : undefined}>{t(label)}</Link>)}
          </div>
          <div className="ref-desktop-actions hidden items-center gap-2 md:flex">
            <LanguageSwitcher compact />
            <ButtonLink to="/login" variant="ghost">{t("Log in")}</ButtonLink>
            <ButtonLink to="/register">{t("Get started")} <span aria-hidden="true">→</span></ButtonLink>
          </div>
          <Button variant="ghost" className="ref-menu-toggle md:hidden" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="marketing-mobile-nav" onClick={() => setOpen(!open)} icon={open ? <X /> : <Menu />} />
        </nav>
        <div id="marketing-mobile-nav" hidden={!open} aria-label="Mobile navigation" className="ref-mobile-nav border-t border-line bg-cream p-4 shadow-card md:hidden"><div className="grid gap-2">
          <LanguageSwitcher />
          <ButtonLink to="/" variant={active === "home" ? "secondary" : "ghost"} onClick={goHome}>{t("Home")}</ButtonLink>
          {sectionLinks.slice(0, 2).map(({ label, href, section }) => <ButtonLink key={section} to={href} variant={active === section ? "secondary" : "ghost"} onClick={goToSection(section)}>{t(label)}</ButtonLink>)}
          <ButtonLink to="/pricing" variant={active === "pricing" ? "secondary" : "ghost"} onClick={closeMenu}>{t("Pricing")}</ButtonLink>
          {sectionLinks.slice(2).map(({ label, href, section }) => <ButtonLink key={section} to={href} variant={active === section ? "secondary" : "ghost"} onClick={goToSection(section)}>{t(label)}</ButtonLink>)}
          <ButtonLink to="/login" variant="secondary" onClick={closeMenu}>{t("Log in")}</ButtonLink>
          <ButtonLink to="/register" onClick={closeMenu}>{t("Get started")}</ButtonLink>
        </div></div>
      </header>
      <main><Outlet /></main>
    </div>
  );
}
