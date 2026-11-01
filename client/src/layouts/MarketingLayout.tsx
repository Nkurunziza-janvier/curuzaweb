import { ArrowUpRight, Menu, X } from "lucide-react";
import { useEffect, useState, type MouseEvent } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { Brand } from "../components/ui";
import { LanguageSwitcher, useLanguage } from "../i18n";

const sectionLinks = [
  { label: "Why a page", href: "/#platform", section: "platform" },
  { label: "How it works", href: "/#how-it-works", section: "how-it-works" },
  { label: "Pricing", href: "/#pricing", section: "pricing" },
  { label: "FAQ", href: "/#faq", section: "faq" },
];

const sectionIds = ["platform", "capabilities", "how-it-works", "industries", "pricing", "faq"];

export default function MarketingLayout() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("home");
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const closeMenu = () => setOpen(false);
  const scrollBehavior = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

  const goHome = (event: MouseEvent<HTMLAnchorElement>) => {
    closeMenu();
    if (location.pathname !== "/") return;
    event.preventDefault();
    if (location.hash) navigate("/", { preventScrollReset: true });
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
  };

  const goToSection = (section: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    closeMenu();
    if (location.pathname !== "/") return;
    event.preventDefault();
    if (location.hash !== `#${section}`) navigate(`/#${section}`, { preventScrollReset: true });
    window.requestAnimationFrame(() => document.getElementById(section)?.scrollIntoView({ behavior: scrollBehavior(), block: "start" }));
  };

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
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
    return undefined;
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (location.pathname !== "/") {
      setActive(location.pathname === "/pricing" ? "pricing" : "");
      return;
    }
    const updateActive = () => {
      const marker = window.scrollY + Math.min(window.innerHeight * 0.34, 240);
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
    const updateScrolled = () => setScrolled(window.scrollY > 8);
    updateScrolled();
    window.addEventListener("scroll", updateScrolled, { passive: true });
    return () => window.removeEventListener("scroll", updateScrolled);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className={`lp-marketing min-h-screen ${location.pathname === "/" ? "is-landing" : ""}`}>
      <header className={`lp-header ${scrolled ? "is-scrolled" : ""}`}>
        <nav className="lp-shell lp-nav" aria-label="Main navigation">
          <Brand onClick={goHome} />
          <div className="lp-nav-links">
            {sectionLinks.map(({ label, href, section }) => <Link key={section} to={href} onClick={goToSection(section)} className={`lp-nav-link ${active === section ? "is-active" : ""}`} aria-current={active === section ? "location" : undefined}>{t(label)}</Link>)}
          </div>
          <div className="lp-nav-actions">
            <LanguageSwitcher compact />
            <Link to="/login" className="lp-nav-login">{t("Log in")}</Link>
            <Link to="/register" className="lp-nav-cta">{t("Create a page")} <ArrowUpRight size={14} aria-hidden="true" /></Link>
          </div>
          <button type="button" className="lp-menu-btn" aria-label={open ? t("Close navigation") : t("Open navigation")} aria-expanded={open} aria-controls="marketing-mobile-nav" onClick={() => setOpen(!open)}>
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </nav>
        {open && <div id="marketing-mobile-nav" className="lp-mobile-nav">
          <div className="lp-shell">
            <div className="lp-mobile-lang"><LanguageSwitcher /></div>
            <nav aria-label="Mobile navigation" className="lp-mobile-links">
              {sectionLinks.map(({ label, href, section }) => <Link key={section} to={href} onClick={goToSection(section)} className={active === section ? "is-active" : ""}>{t(label)} <ArrowUpRight size={15} aria-hidden="true" /></Link>)}
            </nav>
            <div className="lp-mobile-actions">
              <Link to="/login" onClick={closeMenu} className="lp-button lp-button-ghost">{t("Log in")}</Link>
              <Link to="/register" onClick={closeMenu} className="lp-button lp-button-primary">{t("Create a page")} <ArrowUpRight size={15} /></Link>
            </div>
          </div>
        </div>}
      </header>
      <main><Outlet /></main>
    </div>
  );
}
