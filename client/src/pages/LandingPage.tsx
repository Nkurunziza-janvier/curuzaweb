import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  ArrowRight, ArrowUpRight, BadgeCheck, BedDouble, Check, Clock3, Coffee, Copy, Globe2, Hammer,
  MapPin, MessageCircle, Plus, Scissors, Share2, ShieldCheck, Smartphone, Sparkles, Star, Store,
  Wallet, type LucideIcon,
} from "lucide-react";
import { Link } from "react-router";
import { Brand } from "../components/ui";
import { useLanguage } from "../i18n";
import { usePublicBusinessList } from "../hooks/apiHooks";

/* ================================================================== helpers */

const HOME_URL = "https://ebusinessrw.rw";

function useSectionReveal() {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!("IntersectionObserver" in window)) {
      targets.forEach((element) => element.classList.add("is-in"));
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.14, rootMargin: "0px 0px -48px 0px" },
    );
    targets.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  return rootRef;
}

function delayStyle(delay = 0) {
  return { "--qr-d": `${delay}ms` } as CSSProperties;
}

type LiveExampleBusiness = { slug: string; name?: string; coverImageUrl?: string | null };

/* ================================================================== copy-link */

function CopyLinkButton({ path }: { path: string }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const url = `${HOME_URL}${path}`;
    try {
      if ("clipboard" in navigator && typeof navigator.clipboard?.writeText === "function") {
        await navigator.clipboard.writeText(url);
      } else {
        const area = document.createElement("textarea");
        area.value = url;
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        document.body.removeChild(area);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1900);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button type="button" className={`qr-copy-btn${copied ? " is-copied" : ""}`} onClick={copy} aria-live="polite">
      {copied ? <><Check size={13} aria-hidden="true" /> {t("Copied")}</> : <><Copy size={13} aria-hidden="true" /> {t("Copy")}</>}
    </button>
  );
}

/* ================================================================== faq */

function FaqItem({ q, a, index, open: initial }: { q: string; a: string; index: number; open: boolean }) {
  const [open, setOpen] = useState(initial);
  const panelId = `qr-faq-panel-${index}`;
  return (
    <div className={`qr-faq-item${open ? " is-open" : ""}`}>
      <button type="button" className="qr-faq-q" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)}>
        <span>{q}</span>
        <span className="qr-faq-icon" aria-hidden="true"><Plus size={14} /></span>
      </button>
      <div className="qr-faq-a" id={panelId} aria-hidden={!open}>
        <div><p>{a}</p></div>
      </div>
    </div>
  );
}

/* ================================================================== showcase */

type Space = {
  id: string;
  icon: LucideIcon;
  label: string;
  name: string;
  place: string;
  accent: string;
  soft: string;
  badge: string;
  stat: string;
  tabs: string[];
  items: Array<{ name: string; meta: string; price: string }>;
  actions: [string, string];
  modules: string[];
};

const spaces: Space[] = [
  {
    id: "cafe",
    icon: Coffee,
    label: "Cafés & restaurants",
    name: "Green Beans Coffee",
    place: "Kigali · Café",
    accent: "#c2410c",
    soft: "#ffe3d3",
    badge: "Open today",
    stat: "Menu updated 2m ago",
    tabs: ["Menu", "Our story", "Visit"],
    items: [
      { name: "Espresso brew", meta: "Single origin", price: "2,800" },
      { name: "Bushera bowl", meta: "Warm & sweet", price: "4,000" },
      { name: "Banana bread", meta: "Baked at 6am", price: "5,200" },
    ],
    actions: ["Order now", "Book a table"],
    modules: ["Products", "Bookings", "Requests", "Payments"],
  },
  {
    id: "salon",
    icon: Scissors,
    label: "Salons & barbers",
    name: "Kigali Hair Studio",
    place: "Remera · Hair & beauty",
    accent: "#8a4b6b",
    soft: "#f6e3ec",
    badge: "3 slots left",
    stat: "Bookings +18 this week",
    tabs: ["Services", "Gallery", "Book"],
    items: [
      { name: "Braids & twists", meta: "2–3 hours", price: "15,000" },
      { name: "Wash & style", meta: "45 minutes", price: "8,000" },
      { name: "Beard trim", meta: "20 minutes", price: "3,000" },
    ],
    actions: ["Book a service", "Send a message"],
    modules: ["Services", "Bookings", "Reviews", "Requests"],
  },
  {
    id: "hardware",
    icon: Hammer,
    label: "Hardware stores",
    name: "Kigali Hardware",
    place: "Nyabugogo · Building supplies",
    accent: "#a1601f",
    soft: "#f7e7d4",
    badge: "Delivery today",
    stat: "Quotes accepted 12",
    tabs: ["Catalogue", "Delivery", "Visit"],
    items: [
      { name: "Cement 50kg", meta: "CIMERWA", price: "12,000" },
      { name: "Paint 5L", meta: "Interior matte", price: "18,500" },
      { name: "Hinges (pair)", meta: "Stainless", price: "1,200" },
    ],
    actions: ["Order now", "Request a quote"],
    modules: ["Products", "Orders", "Quotes", "Payments"],
  },
  {
    id: "guesthouse",
    icon: BedDouble,
    label: "Guest houses",
    name: "Lakeview Guest House",
    place: "Rubavu · Lakeside stay",
    accent: "#356a8a",
    soft: "#e1eef6",
    badge: "Rooms available",
    stat: "Requests answered 9",
    tabs: ["Rooms", "The house", "Explore"],
    items: [
      { name: "Double room", meta: "Lake view", price: "45,000" },
      { name: "Breakfast", meta: "Served 7–10am", price: "5,000" },
      { name: "Airport pickup", meta: "One way", price: "10,000" },
    ],
    actions: ["Book a room", "Send a message"],
    modules: ["Rooms", "Bookings", "Requests", "Location"],
  },
];

const tickerItems = ["Cafés & restaurants", "Salons & barbers", "Hardware stores", "Tailors & boutiques", "Guest houses", "Mechanics", "Bakeries", "Phone repair", "Photographers", "Coffee shops", "Pharmacies", "Print shops"];

const faqs: Array<[string, string]> = [
  ["Do I need a website or an app?", "No. Your page lives on e-businessRw and opens in any browser — customers reach it from a link you share."],
  ["How do customers reach me?", "They open your page and send a request, booking or order. It lands with full details in your workspace."],
  ["What does it cost to start?", "Creating your page and receiving requests is free. You pay only when you publish products and services — RWF 10,000 monthly or RWF 100,000 yearly."],
  ["Can I change my content later?", "Yes. Prices, services and settings stay editable from your workspace, in seconds, whenever something changes."],
  ["What if customers message me on WhatsApp already?", "Keep using it. Your page gives those conversations a permanent home: menu, prices, catalogue and a place to be found."],
  ["Is it built for Rwandan businesses?", "Yes — Mobile Money, RWF pricing and Kinyarwanda support are part of the product, not an afterthought."],
];

function Showcase({ liveExamplePath }: { liveExamplePath?: string }) {
  const { t } = useLanguage();
  const [active, setActive] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const space = spaces[active];

  const onTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = spaces.length - 1;
    let next: number | null = null;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") next = index === last ? 0 : index + 1;
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    if (next === null) return;
    event.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section id="industries" className="qr-section" aria-labelledby="qr-showcase-title">
      <div className="qr-shell">
        <div className="qr-showcase">
          <div className="qr-showcase-head" data-reveal="">
            <div>
              <span className="qr-eyebrow qr-eyebrow--light">{t("For every local business")}</span>
              <h2 id="qr-showcase-title" className="qr-h2">
                {t("Built for businesses")} <span className="qr-serif">{t("like yours.")}</span>
              </h2>
              <p className="qr-lede">
                {t("Pick a type. The same page reshapes itself around what you sell, how customers book, and what they need to know.")}
              </p>
            </div>
            {liveExamplePath && (
              <Link to={liveExamplePath} className="qr-arrow-link">
                {t("See a real page")} <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            )}
          </div>

          <div className="qr-tabs" role="tablist" aria-label={t("Business types")} data-reveal="">
            {spaces.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  ref={(element) => { tabRefs.current[index] = element; }}
                  id={`qr-show-tab-${item.id}`}
                  type="button"
                  role="tab"
                  aria-selected={active === index}
                  aria-controls="qr-show-panel"
                  tabIndex={active === index ? 0 : -1}
                  className={`qr-tab${active === index ? " is-active" : ""}`}
                  onClick={() => setActive(index)}
                  onKeyDown={(event) => onTabKeyDown(event, index)}
                >
                  <Icon size={15} aria-hidden="true" /> {t(item.label)}
                </button>
              );
            })}
          </div>

          <div
            id="qr-show-panel"
            role="tabpanel"
            aria-labelledby={`qr-show-tab-${space.id}`}
            tabIndex={0}
            className="qr-showcase-panel"
            style={{ "--qr-show-accent": space.accent, "--qr-show-soft": space.soft } as CSSProperties}
          >
            <div className="qr-showcase-cover">
              <span className="qr-live-chip"><i /> {space.badge}</span>
              <span className="qr-showcase-badge">{t(space.label)}</span>
              <div className="qr-showcase-cover-copy">
                <span>{t("Local business")}</span>
                <b>{space.name}</b>
                <small><MapPin size={11} aria-hidden="true" /> {space.place}</small>
              </div>
            </div>

            <div className="qr-showcase-body qr-showcase-swap" key={space.id}>
              <div className="qr-showcase-body-head">
                <b>{t("On the page")}</b>
                <span>{space.stat}</span>
              </div>
              <div className="qr-show-tabs">
                {space.tabs.map((tab, index) => <span key={tab} className={index === 0 ? "is-on" : ""}>{tab}</span>)}
              </div>
              <div className="qr-show-items">
                {space.items.map((item) => (
                  <article className="qr-show-item" key={item.name}>
                    <div className="qr-show-art" aria-hidden="true"><i /></div>
                    <div className="qr-show-item-copy">
                      <b>{item.name}</b>
                      <small>{item.meta}</small>
                    </div>
                    <span className="qr-show-price">RWF {item.price}</span>
                  </article>
                ))}
              </div>
              <div className="qr-show-actions">
                <span>{space.actions[0]}</span>
                <span>{space.actions[1]}</span>
              </div>
              <div className="qr-show-modules">
                {space.modules.map((module) => <span key={module}><Check size={11} aria-hidden="true" /> {t(module)}</span>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== page */

export default function LandingPage() {
  const { t } = useLanguage();
  const rootRef = useSectionReveal();
  const { data: liveBusinesses } = usePublicBusinessList<LiveExampleBusiness>();
  const liveExample = liveBusinesses?.find((business) => business.coverImageUrl) ?? liveBusinesses?.[0];
  const liveExamplePath = liveExample ? `/b/${liveExample.slug}` : undefined;
  const displaySlug = liveExamplePath ?? "/green-beans-coffee";
  const displayName = liveExample?.name ?? "Green Beans Coffee";
  const year = new Date().getFullYear();
  const scrollToHow = () => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="qr-landing" ref={rootRef}>

      {/* ============================================================ hero */}
      <section className="qr-hero" aria-labelledby="qr-hero-title">
        <div className="qr-shell">
          <div className="qr-hero-topline" data-reveal="">
            <span>{t("Rwanda · local business, online")}</span>
            <strong><i aria-hidden="true" /> {t("Pages publishing right now")}</strong>
          </div>

          <div className="qr-hero-grid">
            <div className="qr-hero-copy">
              <span className="qr-eyebrow" data-reveal="">{t("Your business, one link")}</span>
              <h1 id="qr-hero-title" className="qr-hero-title" data-reveal="" style={delayStyle(60)}>
                {t("The easiest way to put")} <span className="qr-serif">{t("your business")}</span> <em>{t("online.")}</em>
              </h1>
              <p className="qr-hero-lede" data-reveal="" style={delayStyle(120)}>
                {t("Turn scattered DMs, price lists and phone calls into one beautiful page — products, services and bookings, ready to share anywhere, with every request landing in a single workspace.")}
              </p>
              <div className="qr-hero-actions" data-reveal="" style={delayStyle(180)}>
                <Link to="/register" className="qr-btn qr-btn--ink">
                  {t("Create your business page")} <ArrowRight size={16} aria-hidden="true" />
                </Link>
                <button type="button" className="qr-btn qr-btn--ghost" onClick={scrollToHow}>
                  {t("See how it works")} <ArrowUpRight size={15} aria-hidden="true" />
                </button>
              </div>
              <div className="qr-hero-foot" data-reveal="" style={delayStyle(240)}>
                <span><Smartphone size={14} aria-hidden="true" /> {t("Works on any phone")}</span>
                <span><BadgeCheck size={14} aria-hidden="true" /> {t("No app needed")}</span>
                <span><Clock3 size={14} aria-hidden="true" /> {t("Live in minutes")}</span>
              </div>
            </div>

            <div className="qr-stage" data-reveal="" style={delayStyle(160)}>
              <div className="qr-stage-glow" aria-hidden="true" />
              <div className="qr-stage-orbit" aria-hidden="true" />
              <div className="qr-preview">
                <div className="qr-preview-bar">
                  <span className="qr-dots" aria-hidden="true"><i /><i /><i /></span>
                  <span className="qr-preview-url">ebusinessrw<b>.rw</b><em>/green-beans-coffee</em></span>
                  <span className="qr-preview-share" aria-hidden="true"><Share2 size={11} /></span>
                </div>
                <div className="qr-preview-cover">
                  <div className="qr-cover-top">
                    <span className="qr-live-chip"><i /> {t("Open today")}</span>
                    <span className="qr-cover-label">{t("Kigali · Café")}</span>
                  </div>
                  <div className="qr-cover-copy">
                    <b>{t("Green Beans Coffee")}</b>
                    <small>{t("Coffee, pastry & slow mornings")}</small>
                  </div>
                  <div className="qr-rating">
                    <i aria-hidden="true">
                      {Array.from({ length: 5 }).map((_, index) => <Star key={index} size={9} fill="currentColor" />)}
                    </i>
                    {t("4.9 · 128 visits")}
                  </div>
                </div>
                <div className="qr-preview-body">
                  <div className="qr-cat-pills">
                    <span>{t("Menu")}</span>
                    <span>{t("Our story")}</span>
                    <span>{t("Visit")}</span>
                  </div>
                  <div className="qr-mini-grid">
                    {([
                      ["a", "Espresso brew", "RWF 2,800"],
                      ["b", "Bushera bowl", "RWF 4,000"],
                      ["c", "Banana bread", "RWF 5,200"],
                    ] as Array<[string, string, string]>).map(([art, name, price]) => (
                      <div className="qr-mini-product" key={name}>
                        <div className={`qr-mini-art qr-mini-art--${art}`} aria-hidden="true"><i /></div>
                        <div className="qr-mini-meta"><b>{name}</b><small>{price}</small></div>
                      </div>
                    ))}
                  </div>
                  <div className="qr-preview-foot">
                    <span>{t("Order now")}</span>
                    <span>{t("Book a table")}</span>
                  </div>
                </div>
              </div>

              <div className="qr-inbox-card" aria-hidden="true">
                <div className="qr-inbox-head"><span>{t("Requests")}</span><i /></div>
                <div className="qr-inbox-body">
                  <b><MessageCircle size={11} /> {t("New request")}</b>
                  <p>{t("“Do you have a table tonight at 7?”")}</p>
                </div>
                <div className="qr-inbox-actions"><span>{t("Reply")}</span><span>{t("Accept")}</span></div>
              </div>

              <div className="qr-paid-pill">
                <span className="qr-paid-icon"><Wallet size={14} aria-hidden="true" /></span>
                <div><b>{t("Payment received")}</b><small>{t("Aline · Mobile Money · RWF 8,200")}</small></div>
              </div>

              <span className="qr-stage-caption" aria-hidden="true">{t("Your page, live")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ ticker */}
      <div className="qr-ticker" aria-hidden="true">
        <div className="qr-ticker-track">
          {[0, 1].map((group) => (
            <div className="qr-ticker-group" key={group}>
              {tickerItems.map((item) => <span className="qr-ticker-item" key={`${group}-${item}`}>{item}</span>)}
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================ platform */}
      <section id="platform" className="qr-section qr-platform" aria-labelledby="qr-platform-title">
        <div className="qr-shell">
          <div className="qr-platform-grid">
            <div className="qr-platform-copy">
              <span className="qr-eyebrow" data-reveal="">{t("The everyday challenge")}</span>
              <h2 id="qr-platform-title" className="qr-h2" data-reveal="" style={delayStyle(60)}>
                {t("Your work is already out there.")} <span className="qr-serif">{t("Make it easy to find.")}</span>
              </h2>
              <p className="qr-lede" data-reveal="" style={delayStyle(110)}>
                {t("Most owners are already doing the work — it is just spread across chats, screenshots and notebooks. A page gathers it into one link customers can trust.")}
              </p>
              <div className="qr-shift-list">
                {([
                  ["One link, always current", "Menu, prices, services and your story in one place you own — update it in seconds."],
                  ["Requests, not lost comments", "Orders, bookings and questions arrive structured, with the customer and details attached."],
                  ["You keep control", "Pause a service, change a price or close a request. No developer, no waiting."],
                ] as Array<[string, string]>).map(([title, body], index) => (
                  <div className="qr-shift-row" key={title} data-reveal="" style={delayStyle(140 + index * 70)}>
                    <span className="qr-shift-num">{String(index + 1).padStart(2, "0")}</span>
                    <div><h3>{t(title)}</h3><p>{t(body)}</p></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="qr-shift-visual" data-reveal="" style={delayStyle(120)}>
              <div className="qr-shift-panel qr-shift-panel--before">
                <span><i /> {t("Before · scattered")}</span>
                <div className="qr-chat-stack">
                  <span className="qr-chat-bubble">{t("Hi! Do you have the medium bag?")}</span>
                  <span className="qr-chat-bubble is-right">{t("Yes — RWF 12,000")}</span>
                  <span className="qr-chat-bubble">{t("Can I pay on delivery?")}</span>
                  <small>{t("3 apps · 2 notebooks")}</small>
                </div>
                <div className="qr-shift-before-note"><Clock3 size={11} aria-hidden="true" /> {t("Answers scattered across DMs")}</div>
              </div>

              <div className="qr-shift-panel qr-shift-panel--after">
                <span><i /> {t("After · one page")}</span>
                <div className="qr-request-card">
                  <b><MessageCircle size={12} aria-hidden="true" /> {t("New request from Aline")}</b>
                  <p>{t("2 × Espresso brew · pickup today, 4pm")}</p>
                  <div className="qr-request-actions"><span>{t("Reply")}</span><span>{t("Accept")}</span></div>
                </div>
                <div className="qr-url-pill"><Globe2 size={12} aria-hidden="true" /><span>ebusinessrw.rw/green-beans-coffee</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ capabilities */}
      <section id="capabilities" className="qr-section" aria-labelledby="qr-capabilities-title">
        <div className="qr-shell">
          <div className="qr-section-head">
            <div data-reveal="">
              <span className="qr-eyebrow">{t("Built into your page")}</span>
              <h2 id="qr-capabilities-title" className="qr-h2">
                {t("Everything customers need.")} <span className="qr-serif">{t("Nothing they don't.")}</span>
              </h2>
            </div>
            <p className="qr-lede" data-reveal="" style={delayStyle(80)}>
              {t("Capabilities switch on to match your business — a café shows a menu, a salon shows bookings. Choose what fits and hide the rest.")}
            </p>
          </div>

          <div className="qr-bento">
            <article className="qr-bento-card qr-bento-card--wide" data-reveal="">
              <div className="qr-bento-copy">
                <span className="qr-eyebrow">{t("Catalogue")}</span>
                <h3>{t("Products and services, always current")}</h3>
                <p>{t("Add a price once, change it whenever. Customers see exactly what is available today.")}</p>
              </div>
              <div className="qr-bento-visual">
                <div className="qr-mini-store">
                  <div className="qr-mini-store-head"><b>{t("Green Beans Coffee")}</b><span>{t("Open today")}</span></div>
                  <div className="qr-mini-store-grid">
                    {([
                      ["a", "Espresso brew", "RWF 2,800"],
                      ["b", "Bushera bowl", "RWF 4,000"],
                      ["c", "Banana bread", "RWF 5,200"],
                    ] as Array<[string, string, string]>).map(([art, name, price]) => (
                      <div className="qr-mini-store-item" key={name}>
                        <div className={`qr-mini-art qr-mini-art--${art}`} aria-hidden="true"><i /></div>
                        <b>{name}</b><small>{price}</small>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>

            <article className="qr-bento-card qr-bento-card--narrow qr-bento-card--forest" data-reveal="" style={delayStyle(80)}>
              <div className="qr-bento-copy">
                <span className="qr-eyebrow">{t("Requests")}</span>
                <h3>{t("One inbox for every customer")}</h3>
                <p>{t("Orders, bookings and questions land with names and details — not buried in comments.")}</p>
              </div>
              <div className="qr-bento-visual">
                <div className="qr-mini-inbox">
                  {([
                    ["A", "Aline M.", "Table for 2 · tonight", "New", false],
                    ["E", "Eric N.", "Cement × 20 · quote", "Quote", true],
                    ["D", "Diane K.", "Braids · Saturday", "Booked", false],
                  ] as Array<[string, string, string, string, boolean]>).map(([initial, name, detail, status, orange]) => (
                    <div className="qr-inbox-row" key={name}>
                      <span className="qr-inbox-avatar">{initial}</span>
                      <div><b>{name}</b><small>{detail}</small></div>
                      <span className={`qr-inbox-status${orange ? " is-orange" : ""}`}>{t(status)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <article className="qr-bento-card qr-bento-card--narrow qr-bento-card--dark" data-reveal="" style={delayStyle(120)}>
              <div className="qr-bento-copy">
                <span className="qr-eyebrow">{t("Payments")}</span>
                <h3>{t("Mobile Money, confirmed")}</h3>
                <p>{t("Send a payment request and see it settle. No more screenshot archaeology.")}</p>
              </div>
              <div className="qr-bento-visual">
                <div className="qr-mini-pay">
                  <div className="qr-pay-card">
                    <span className="qr-pay-icon"><Wallet size={15} aria-hidden="true" /></span>
                    <div><b>{t("Payment received")}</b><small>{t("Aline · MTN MoMo")}</small></div>
                    <strong>RWF 8,200</strong>
                  </div>
                  <div className="qr-pay-row"><i aria-hidden="true" /> {t("Matched to order #041")}</div>
                </div>
              </div>
            </article>

            <article className="qr-bento-card qr-bento-card--wide qr-bento-card--orange" data-reveal="" style={delayStyle(160)}>
              <div className="qr-bento-copy">
                <span className="qr-eyebrow">{t("Insight")}</span>
                <h3>{t("See what customers actually do")}</h3>
                <p>{t("Page visits, requests and top actions — the signals that tell you what to stock, post or fix next.")}</p>
              </div>
              <div className="qr-bento-visual">
                <div className="qr-mini-chart">
                  <div className="qr-chart-bars" aria-hidden="true">
                    {[38, 55, 42, 68, 58, 88, 74].map((height, index) => (
                      <i key={index} style={{ height: `${height}%` }} className={index === 5 ? "is-peak" : ""} />
                    ))}
                  </div>
                  <div className="qr-chart-copy"><b>+34%</b><small>{t("visits this week")}</small></div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ============================================================ showcase */}
      <Showcase liveExamplePath={liveExamplePath} />

      {/* ============================================================ how it works */}
      <section id="how-it-works" className="qr-section qr-how" aria-labelledby="qr-how-title">
        <div className="qr-shell">
          <div className="qr-section-head">
            <div data-reveal="">
              <span className="qr-eyebrow">{t("How it works")}</span>
              <h2 id="qr-how-title" className="qr-h2">
                {t("From one link to")} <span className="qr-serif">{t("I found you.")}</span>
              </h2>
            </div>
            <p className="qr-lede" data-reveal="" style={delayStyle(80)}>
              {t("Start with what you already know about your business, share it once, and let the page quietly do the rest.")}
            </p>
          </div>

          <div className="qr-how-grid">
            <div className="qr-steps">
              {([
                ["Create your page", "Register, add your name, category and location. Your demo checkout activates right away."],
                ["Publish what you sell", "Add products or services with prices. Your page updates in seconds, not days."],
                ["Share one link", "Put it on WhatsApp, Instagram, a receipt. Requests, bookings and orders land in your workspace."],
              ] as Array<[string, string]>).map(([title, body], index) => (
                <div className="qr-step" key={title} data-reveal="" style={delayStyle(index * 90)}>
                  <span className="qr-step-num">{String(index + 1).padStart(2, "0")}</span>
                  <div><h3>{t(title)}</h3><p>{t(body)}</p></div>
                </div>
              ))}
            </div>

            <div className="qr-link-card" data-reveal="" style={delayStyle(120)}>
              <div className="qr-link-card-head">
                <span>{t("Your page link")}</span>
                <span className="qr-published"><i /> {t("Published")}</span>
              </div>
              <div className="qr-link-card-body">
                <b>{displayName}</b>
                <p>{t("Share this one link on WhatsApp, Instagram, a receipt or your shop window.")}</p>
                <div className="qr-link-row">
                  <span>ebusinessrw<b>.rw</b>{displaySlug}</span>
                  <CopyLinkButton path={displaySlug} />
                </div>
                <div className="qr-link-mini">
                  <span><b>128</b>{t("Visits")}</span>
                  <span><b>9</b>{t("Requests")}</span>
                  <span><b>3</b>{t("Orders today")}</span>
                </div>
              </div>
              <div className="qr-link-card-foot">
                <ShieldCheck size={14} aria-hidden="true" /> {t("Free to create · publish when you're ready")}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ local */}
      <section className="qr-section qr-local" aria-labelledby="qr-local-title">
        <div className="qr-shell">
          <div className="qr-local-grid">
            <div data-reveal="">
              <span className="qr-eyebrow">{t("Made in Rwanda")}</span>
              <h2 id="qr-local-title">
                {t("Built in Kigali.")} <span className="qr-serif">{t("For every corner of Rwanda.")}</span>
              </h2>
              <p>
                {t("Mobile-first, Mobile Money aware, and designed around how business actually happens here — from Nyabugogo to Rubavu.")}
              </p>
              <div className="qr-local-stats">
                <div className="qr-local-stat"><b>RWF</b><small>{t("Pricing in local currency")}</small></div>
                <div className="qr-local-stat"><b>MTN · Airtel</b><small>{t("Mobile Money payments")}</small></div>
                <div className="qr-local-stat"><b>{t("Kinyarwanda")}</b><small>{t("Built for local customers")}</small></div>
              </div>
            </div>
            <div className="qr-coords" data-reveal="" style={delayStyle(100)} aria-hidden="true">
              <span className="qr-coords-ring" /><span className="qr-coords-ring" /><span className="qr-coords-ring" /><span className="qr-coords-ring" />
              <span className="qr-coords-pin"><MapPin size={22} /></span>
              <div className="qr-coords-copy">
                <b>1°57′S · 30°04′E</b>
                <small>{t("Kigali, Rwanda")}</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ pricing */}
      <section id="pricing" className="qr-section qr-pricing" aria-labelledby="qr-pricing-title">
        <div className="qr-shell">
          <div className="qr-section-head">
            <div data-reveal="">
              <span className="qr-eyebrow">{t("Simple publishing")}</span>
              <h2 id="qr-pricing-title" className="qr-h2">
                {t("Free to be found.")} <span className="qr-serif">{t("Pay to publish.")}</span>
              </h2>
            </div>
            <p className="qr-lede" data-reveal="" style={delayStyle(80)}>
              {t("Creating your page and receiving requests is free. Publish products and services when you're ready for customers to find you.")}
            </p>
          </div>

          <div className="qr-price-grid">
            <article className="qr-price-card" data-reveal="">
              <span className="qr-price-tag">{t("Monthly")}</span>
              <h3>{t("Monthly publishing")}</h3>
              <div className="qr-price-value"><b>10,000</b><small>RWF / 30 days</small></div>
              <p>{t("Flexible access for businesses getting started.")}</p>
              <div className="qr-price-list">
                {["Publish up to 50 products", "Business page and customer requests", "Verified Mobile Money payment", "Renew when access is ending"].map((feature) => (
                  <span key={feature}><Check size={13} aria-hidden="true" /> {t(feature)}</span>
                ))}
              </div>
              <Link to="/pricing" className="qr-btn qr-btn--ghost">{t("Choose monthly")} <ArrowRight size={14} aria-hidden="true" /></Link>
            </article>

            <article className="qr-price-card qr-price-card--featured" data-reveal="" style={delayStyle(90)}>
              <span className="qr-price-tag">{t("Best value")}</span>
              <h3>{t("Annual publishing")}</h3>
              <div className="qr-price-value"><b>100,000</b><small>RWF / 365 days</small></div>
              <p>{t("One payment for a full year of product visibility.")}</p>
              <div className="qr-price-list">
                {["Everything in Monthly", "Publish up to 50 products", "Save RWF 20,000 vs monthly", "One annual renewal"].map((feature) => (
                  <span key={feature}><Check size={13} aria-hidden="true" /> {t(feature)}</span>
                ))}
              </div>
              <Link to="/pricing" className="qr-btn qr-btn--light">{t("Choose annual")} <ArrowRight size={14} aria-hidden="true" /></Link>
            </article>
          </div>

          <div className="qr-price-note" data-reveal="" style={delayStyle(150)}>
            <span><ShieldCheck size={13} aria-hidden="true" /> {t("No card needed")}</span>
            <span><Clock3 size={13} aria-hidden="true" /> {t("Switch or renew anytime")}</span>
            <span><BadgeCheck size={13} aria-hidden="true" /> {t("Mobile Money, verified")}</span>
          </div>
        </div>
      </section>

      {/* ============================================================ faq */}
      <section id="faq" className="qr-section qr-faq" aria-labelledby="qr-faq-title">
        <div className="qr-shell">
          <div className="qr-faq-grid">
            <div className="qr-faq-intro" data-reveal="">
              <span className="qr-eyebrow">{t("Good to know")}</span>
              <h2 id="qr-faq-title" className="qr-h2">{t("Questions,")} <span className="qr-serif">{t("answered.")}</span></h2>
              <p className="qr-lede">{t("A few honest answers about what your page is, what it can do, and how to start.")}</p>
              <Link to="/register" className="qr-arrow-link">{t("Start with a page")} <ArrowUpRight size={15} aria-hidden="true" /></Link>
            </div>
            <div className="qr-faq-list" data-reveal="" style={delayStyle(80)}>
              {faqs.map(([q, a], index) => <FaqItem key={q} q={t(q)} a={t(a)} index={index} open={index === 0} />)}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ final */}
      <section className="qr-section" aria-labelledby="qr-final-title">
        <div className="qr-shell">
          <div className="qr-final" data-reveal="">
            <div className="qr-final-inner">
              <div>
                <span className="qr-eyebrow">{t("Your next customer is one link away")}</span>
                <h2 id="qr-final-title">{t("Give your business a")} <span className="qr-serif">{t("place to be found.")}</span></h2>
                <div className="qr-final-actions">
                  <Link to="/register" className="qr-btn qr-btn--ink">{t("Create your business page")} <ArrowRight size={16} aria-hidden="true" /></Link>
                  {liveExamplePath ? (
                    <Link to={liveExamplePath} className="qr-btn qr-btn--ghost">{t("See a real page")} <ArrowUpRight size={15} aria-hidden="true" /></Link>
                  ) : (
                    <Link to="/pricing" className="qr-btn qr-btn--ghost">{t("See pricing")} <ArrowUpRight size={15} aria-hidden="true" /></Link>
                  )}
                </div>
                <p className="qr-final-note">{t("Free to create · No card needed · Live in minutes")}</p>
              </div>
              <div className="qr-final-ticket">
                <span><Sparkles size={12} aria-hidden="true" /> {t("Your page, at a glance")}</span>
                <b>{t("One link that works while you work.")}</b>
                <div className="qr-final-ticket-row">
                  <Globe2 size={14} aria-hidden="true" />
                  <span>ebusinessrw<b>.rw</b>{displaySlug}</span>
                </div>
                <small>{t("Products · Bookings · Requests · Payments")}</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ footer */}
      <footer className="qr-footer">
        <div className="qr-shell">
          <div className="qr-footer-top">
            <div className="qr-footer-brand">
              <Brand />
              <p>{t("One page for your products, services and customer requests — built for local businesses in Rwanda.")}</p>
            </div>
            <div className="qr-footer-cols">
              <div className="qr-footer-col">
                <b>{t("Product")}</b>
                <a href="#platform">{t("Why a page")}</a>
                <a href="#capabilities">{t("Capabilities")}</a>
                <a href="#how-it-works">{t("How it works")}</a>
                <a href="#pricing">{t("Pricing")}</a>
              </div>
              <div className="qr-footer-col">
                <b>{t("Business types")}</b>
                <a href="#industries">{t("Cafés & restaurants")}</a>
                <a href="#industries">{t("Salons & barbers")}</a>
                <a href="#industries">{t("Hardware stores")}</a>
                <a href="#industries">{t("Guest houses")}</a>
              </div>
              <div className="qr-footer-col">
                <b>{t("Get started")}</b>
                <Link to="/register">{t("Create a page")}</Link>
                <Link to="/login">{t("Log in")}</Link>
                <a href="#faq">{t("FAQ")}</a>
                <Link to={displaySlug}>{t("See a live page")}</Link>
              </div>
            </div>
          </div>
          <div className="qr-footer-bottom">
            <span><i aria-hidden="true" /> {t("All systems normal · Kigali")}</span>
            <span>© {year} e-businessRw. {t("Made in Rwanda.")}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
