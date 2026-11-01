import { useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Link } from "react-router";
import { ArrowRight, BadgeCheck, CalendarDays, Camera, Clock3, ExternalLink, Image as ImageIcon, Mail, MapPin, MessageCircle, Minus, Phone, Plus, Search, Share2, ShoppingBag, ShoppingCart, Star, Store, UtensilsCrossed, X } from "lucide-react";
import { resolveAssetUrl } from "../services/api";
import { LanguageSwitcher, useLanguage } from "../i18n";
import { effectiveCapabilities } from "../lib/capabilities";
import type { PublicBusiness, PublicProduct, PublicService } from "./PublicBusinessPage";

type Setter<T> = Dispatch<SetStateAction<T>>;
type CartItem = PublicProduct & { quantity: number };

interface BusinessStorefrontProps {
  business: PublicBusiness;
  products: PublicProduct[];
  visibleProducts: PublicProduct[];
  visibleServices: PublicService[];
  categories: string[];
  search: string;
  setSearch: Setter<string>;
  category: string;
  setCategory: Setter<string>;
  cartItems: CartItem[];
  cartCount: number;
  cartTotal: number;
  cartOpen: boolean;
  setCartOpen: Setter<boolean>;
  copied: boolean;
  shareUrl: string;
  sharePage: () => Promise<void>;
  addToCart: (product: PublicProduct) => void;
  changeCartQuantity: (id: string, amount: number) => void;
  sendOrderRequest: () => void;
  track: (eventType: string, metadata?: Record<string, unknown>) => void;
  phoneLink?: string;
  whatsappLink?: string;
  directionsLink?: string;
  openingHours?: string;
}

const currency = (amount: number | string, code = "RWF") => `${code} ${Number(amount).toLocaleString()}`;

const categoryThemes = [
  { match: ["restaurant", "cafe", "food", "catering"], header: "#5c2c17", hero: "linear-gradient(90deg,#40200f 0%,rgba(64,32,15,.97) 35%,rgba(64,32,15,.78) 62%,rgba(64,32,15,.3) 100%)", accent: "#f3c66b", accentText: "#3d220b", glow: "rgba(243,198,107,.18)" },
  { match: ["beauty", "salon", "spa", "wellness"], header: "#4b2740", hero: "linear-gradient(90deg,#32192b 0%,rgba(50,25,43,.97) 35%,rgba(50,25,43,.78) 62%,rgba(50,25,43,.3) 100%)", accent: "#f5c7df", accentText: "#421f36", glow: "rgba(245,199,223,.2)" },
  { match: ["mechanic", "auto", "repair"], header: "#17344a", hero: "linear-gradient(90deg,#0e2535 0%,rgba(14,37,53,.97) 35%,rgba(14,37,53,.78) 62%,rgba(14,37,53,.3) 100%)", accent: "#bfe2f2", accentText: "#102b3b", glow: "rgba(191,226,242,.18)" },
  { match: ["photograph"], header: "#26232b", hero: "linear-gradient(90deg,#17151b 0%,rgba(23,21,27,.97) 35%,rgba(23,21,27,.78) 62%,rgba(23,21,27,.3) 100%)", accent: "#f0d7a4", accentText: "#2b2314", glow: "rgba(240,215,164,.18)" },
  { match: ["event", "decor", "wedding"], header: "#3b295c", hero: "linear-gradient(90deg,#271b3e 0%,rgba(39,27,62,.97) 35%,rgba(39,27,62,.78) 62%,rgba(39,27,62,.3) 100%)", accent: "#e9c7f5", accentText: "#321f4a", glow: "rgba(233,199,245,.2)" },
  { match: ["construction", "contractor", "builder"], header: "#54370f", hero: "linear-gradient(90deg,#3b2609 0%,rgba(59,38,9,.97) 35%,rgba(59,38,9,.78) 62%,rgba(59,38,9,.3) 100%)", accent: "#ffd37a", accentText: "#3d2708", glow: "rgba(255,211,122,.18)" },
  { match: ["furniture", "home decor"], header: "#4a3b2b", hero: "linear-gradient(90deg,#33291e 0%,rgba(51,41,30,.97) 35%,rgba(51,41,30,.78) 62%,rgba(51,41,30,.3) 100%)", accent: "#e7d2ad", accentText: "#362a1d", glow: "rgba(231,210,173,.18)" },
  { match: ["real estate", "property"], header: "#1c3a3a", hero: "linear-gradient(90deg,#122a2a 0%,rgba(18,42,42,.97) 35%,rgba(18,42,42,.78) 62%,rgba(18,42,42,.3) 100%)", accent: "#c5e8d9", accentText: "#14322d", glow: "rgba(197,232,217,.18)" },
  { match: ["home services", "clean"], header: "#16414a", hero: "linear-gradient(90deg,#0d2e35 0%,rgba(13,46,53,.97) 35%,rgba(13,46,53,.78) 62%,rgba(13,46,53,.3) 100%)", accent: "#bce8e3", accentText: "#103138", glow: "rgba(188,232,227,.18)" },
];

function themeFor(category: string) {
  const value = category.toLowerCase();
  return categoryThemes.find((theme) => theme.match.some((word) => value.includes(word))) ?? { header: "#003c30", hero: "linear-gradient(90deg,#062820 0%,rgba(6,40,32,.97) 35%,rgba(6,40,32,.78) 62%,rgba(6,40,32,.3) 100%)", accent: "#c9f36a", accentText: "#173320", glow: "rgba(52,211,153,.16)" };
}

function SectionHeading({ icon, eyebrow, title, action }: { icon: ReactNode; eyebrow?: string; title: string; action?: ReactNode }) {
  return <div className="sf-section-head"><div className="sf-section-title"><span className="sf-section-icon">{icon}</span><div className="sf-section-copy">{eyebrow && <p className="sf-eyebrow">{eyebrow}</p>}<h2>{title}</h2></div></div>{action}</div>;
}

export default function BusinessStorefront(props: BusinessStorefrontProps) {
  const { t } = useLanguage();
  const {
    business, products, visibleProducts, visibleServices, categories, search, setSearch, category, setCategory,
    cartItems, cartCount, cartTotal, cartOpen, setCartOpen, copied, shareUrl, sharePage, addToCart,
    sendOrderRequest, changeCartQuantity, track, phoneLink, whatsappLink: rawWhatsappLink, directionsLink, openingHours,
  } = props;
  const [activeSection, setActiveSection] = useState("home");
  const cartCloseRef = useRef<HTMLButtonElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const capabilities = effectiveCapabilities(business.capabilities);
  const canOrder = capabilities.has("product_orders");
  const canBook = capabilities.has("appointments");
  const canRequest = capabilities.has("service_requests");
  const canShowProducts = capabilities.has("products") && products.length > 0;
  const canShowServices = capabilities.has("services") && business.services.length > 0;
  const canShowReviews = capabilities.has("reviews");
  const canShowPortfolio = capabilities.has("portfolio");
  const canShowContactForm = capabilities.has("contact_form");
  const whatsappLink = capabilities.has("whatsapp_contact") ? rawWhatsappLink : undefined;

  const gallery = useMemo(() => {
    const images = [
      ...(business.coverImageUrl ? [{ id: "cover", url: business.coverImageUrl, label: `${business.name} cover` }] : []),
      ...business.products.filter((product) => product.imageUrl).map((product) => ({ id: `product-${product.id}`, url: product.imageUrl!, label: product.name })),
      ...business.services.filter((service) => service.imageUrl).map((service) => ({ id: `service-${service.id}`, url: service.imageUrl!, label: service.name })),
    ];
    return images.filter((image, index) => images.findIndex((candidate) => candidate.url === image.url) === index);
  }, [business]);
  const theme = themeFor(business.category);
  const onlineBooking = canBook && Boolean(business.bookingSettings?.isEnabled && business.availabilityWindows?.length);
  const bookableServices = business.services.filter((service) => service.isBookable && service.durationMinutes && onlineBooking);
  const bookingUrl = bookableServices.length === 1 ? `/b/${business.slug}/book?service=${bookableServices[0]!.id}` : `/b/${business.slug}/book`;
  const sections = [
    { label: "Home", href: "#home", icon: <Store size={16} /> },
    ...(canShowProducts ? [{ label: "Products", href: "#products", icon: <ShoppingBag size={16} /> }] : []),
    ...(canShowServices ? [{ label: "Services", href: "#services", icon: <UtensilsCrossed size={16} /> }] : []),
    ...(bookableServices.length ? [{ label: "Book online", href: "#booking", icon: <CalendarDays size={16} /> }] : []),
    ...(business.profileDetails?.length ? [{ label: "Details", href: "#details", icon: <BadgeCheck size={16} /> }] : []),
    ...(canShowPortfolio && gallery.length ? [{ label: "Gallery", href: "#gallery", icon: <Camera size={16} /> }] : []),
    ...(canShowReviews ? [{ label: "Reviews", href: "#reviews", icon: <Star size={16} /> }] : []),
    { label: "Contact", href: "#contact", icon: <MessageCircle size={16} /> },
  ];
  const sectionIds = sections.map((section) => section.href.slice(1)).join(" ");
  const location = [business.address, business.city, business.country].filter(Boolean).join(", ");
  const tagline = business.tagline;
  const heroDescription = business.description.split("\n").map((line) => line.trim()).filter((line) => line && !/^#{1,6}\s/.test(line) && !/^[-*]\s/.test(line)).map((line) => line.replace(/\*\*(.*?)\*\*/g, "$1").replace(/__(.*?)__/g, "$1")).join(" ").replace(/\s+/g, " ").trim();
  const requestUrl = `/b/${business.slug}/request`;
  const initials = business.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");

  useEffect(() => {
    const nodes = sectionIds.split(" ").map((id) => document.getElementById(id)).filter((node): node is HTMLElement => Boolean(node));
    if (!nodes.length) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible[0]) setActiveSection(visible[0].target.id);
    }, { rootMargin: "-32% 0px -55% 0px", threshold: [0, 0.15, 0.4, 0.75] });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [sectionIds]);

  useEffect(() => {
    if (!cartOpen) return;
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    const previous = document.body.style.overflow;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setCartOpen(false); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    cartCloseRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      lastFocusedRef.current?.focus();
    };
  }, [cartOpen, setCartOpen]);

  const navLink = (section: { label: string; href: string; icon: ReactNode }) => (
    <a key={section.href} href={section.href} className="sf-tab" data-active={activeSection === section.href.slice(1)} onClick={() => setActiveSection(section.href.slice(1))}>{section.icon}{t(section.label)}</a>
  );

  return <div className="business-storefront">
    <a href="#storefront-main" className="sf-skip-link">{t("Skip to content")}</a>

    <header className="sf-header">
      <div className="sf-header-main">
        <a href="#home" className="sf-brand" aria-label={business.name}>
          <span className="sf-brand-logo">{business.logoUrl ? <img src={resolveAssetUrl(business.logoUrl)} alt="" /> : <Store size={21} />}</span>
          <span className="sf-brand-copy"><strong>{business.name}</strong><small>{business.category || t("Business")}</small></span>
        </a>
        <div className="sf-header-tools">
          <label className="sf-search sf-search-desktop"><Search size={16} aria-hidden="true" /><input aria-label={t("Search products and services")} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Search products and services")} />{search && <button type="button" onClick={() => setSearch("")} aria-label={t("Clear search")}><X size={14} /></button>}</label>
          <span className="sf-header-lang"><LanguageSwitcher compact /></span>
          <button type="button" onClick={() => void sharePage()} className="sf-icon-btn" aria-label={copied ? t("Copied") : t("Share")}><Share2 size={17} /><span className="sf-tool-label">{copied ? t("Copied") : t("Share")}</span></button>
          {whatsappLink && <a href={whatsappLink} target="_blank" rel="noreferrer" onClick={() => track("WHATSAPP_CLICK")} className="sf-btn sf-btn-whatsapp sf-header-cta"><MessageCircle size={16} />{t("Contact us")}</a>}
          {canShowProducts && canOrder && <button type="button" onClick={() => setCartOpen(true)} aria-label={`${t("Open order")}, ${cartCount} ${t("items")}`} className="sf-icon-btn sf-cart-btn"><ShoppingCart size={18} />{cartCount > 0 && <span className="sf-cart-count">{cartCount}</span>}</button>}
        </div>
      </div>
      <div className="sf-navbar">
        <div className="sf-navbar-inner">
          <nav aria-label={t("Business sections")} className="sf-tabs">{sections.map(navLink)}</nav>
          <div className="sf-navbar-end">{openingHours && <span className="sf-hours-note"><Clock3 size={14} />{openingHours}</span>}<span className="sf-navbar-lang"><LanguageSwitcher compact /></span></div>
        </div>
      </div>
    </header>

    <main id="storefront-main">
      <section id="home" className="sf-hero" style={{ backgroundColor: theme.header }}>
        {business.coverImageUrl && <img src={resolveAssetUrl(business.coverImageUrl)} alt="" className="sf-hero-img" />}
        <div className="sf-hero-shade" style={{ backgroundImage: theme.hero }} />
        <div className="sf-hero-glow" style={{ background: `radial-gradient(circle,${theme.glow},transparent 68%)` }} />
        <div className="sf-container sf-hero-inner">
          <div className="sf-hero-copy">
            <div className="sf-hero-logo">{business.logoUrl ? <img src={resolveAssetUrl(business.logoUrl)} alt={`${business.name} logo`} /> : <Store size={38} />}</div>
            <div className="sf-hero-badges">
              <span className="sf-chip sf-chip-solid">{business.category || t("Business")}</span>
              {business.reviewCount > 0 && <span className="sf-chip"><Star size={13} className="fill-current" />{business.rating.toFixed(1)}<span className="sf-chip-muted">({business.reviewCount})</span></span>}
              {onlineBooking && <span className="sf-chip"><CalendarDays size={13} />{t("Book online")}</span>}
            </div>
            <h1>{business.name}</h1>
            {tagline && <p className="sf-hero-tagline">{tagline}</p>}
            {heroDescription && <p className="sf-hero-desc">{heroDescription.slice(0, 210)}{heroDescription.length > 210 ? "…" : ""}</p>}
            <div className="sf-hero-actions">
              {bookableServices.length
                ? <Link to={bookingUrl} onClick={() => track("BOOKING_CLICK")} className="sf-btn sf-btn-hero-primary" style={{ backgroundColor: theme.accent, color: theme.accentText }}><CalendarDays size={17} />{t("Book an appointment")}<ArrowRight size={16} /></Link>
                : <a href={canShowServices ? "#services" : canRequest ? requestUrl : "#contact"} className="sf-btn sf-btn-hero-primary" style={{ backgroundColor: theme.accent, color: theme.accentText }}>{canShowServices ? t("View services") : canRequest ? t("Send a request") : t("Contact us")}<ArrowRight size={16} /></a>}
              {whatsappLink && <a href={whatsappLink} target="_blank" rel="noreferrer" onClick={() => track("WHATSAPP_CLICK")} className="sf-btn sf-btn-hero-ghost"><MessageCircle size={16} />{t("Chat on WhatsApp")}</a>}
              {phoneLink && <a href={phoneLink} onClick={() => track("PHONE_CLICK")} className="sf-btn sf-btn-hero-ghost"><Phone size={15} />{t("Call")}</a>}
            </div>
            {location && <div className="sf-hero-location"><MapPin size={15} /><span>{location}</span>{directionsLink && <a href={directionsLink} target="_blank" rel="noreferrer" onClick={() => track("DIRECTIONS_CLICK")}>{t("View on maps")}<ExternalLink size={12} /></a>}</div>}
          </div>
        </div>
      </section>

      {(location || openingHours) && <div className="sf-container sf-info-wrap">
        <div className="sf-info">
          <div className="sf-info-grid">
            {location && <div className="sf-info-item"><span className="sf-info-icon"><MapPin size={18} /></span><div><p className="sf-info-label">{t("Location")}</p><p className="sf-info-value">{location}</p>{directionsLink && <a href={directionsLink} target="_blank" rel="noreferrer" onClick={() => track("DIRECTIONS_CLICK")} className="sf-info-link">{t("View directions")}<ExternalLink size={11} /></a>}</div></div>}
            {openingHours && <div className="sf-info-item"><span className="sf-info-icon"><Clock3 size={18} /></span><div><p className="sf-info-label">{t("Opening hours")}</p><p className="sf-info-value">{openingHours}</p></div></div>}
            {phoneLink && <a href={phoneLink} onClick={() => track("PHONE_CLICK")} className="sf-info-item sf-info-item-link"><span className="sf-info-icon"><Phone size={18} /></span><div><p className="sf-info-label">{t("Call")}</p><p className="sf-info-value">{business.phone}</p></div></a>}
          </div>
          <div className="sf-info-actions">
            {whatsappLink && <a href={whatsappLink} target="_blank" rel="noreferrer" onClick={() => track("WHATSAPP_CLICK")} className="sf-btn sf-btn-soft"><MessageCircle size={16} />{t("WhatsApp")}</a>}
            {canRequest && <Link to={requestUrl} className="sf-btn sf-btn-primary">{t("Send a request")}<ArrowRight size={15} /></Link>}
          </div>
        </div>
      </div>}

      {business.offers.length > 0 && <div className="sf-container sf-offers">{business.offers.map((offer) => <article key={offer.id} className="sf-offer"><div><p className="sf-eyebrow">{t("Current offer")}</p><h2>{offer.title}</h2>{offer.description && <p>{offer.description}</p>}</div><span className="sf-offer-badge">{offer.discountType === "PERCENTAGE" ? `${Number(offer.discountValue)}% ${t("off")}` : currency(offer.discountValue)}</span></article>)}</div>}

      {business.profileDetails?.length ? <div className="sf-container"><section id="details" className="sf-card sf-section"><SectionHeading icon={<BadgeCheck size={19} />} eyebrow={t("At a glance")} title={t("Business details")} /><dl className="grid gap-3 sm:grid-cols-2">{business.profileDetails.map((detail) => <div key={detail.key} className="rounded-xl border border-line bg-[#faf9f6] p-4"><dt className="text-xs font-bold uppercase tracking-wide text-muted">{detail.label}</dt><dd className="mt-1 text-sm font-semibold text-ink">{detail.value}</dd></div>)}</dl></section></div> : null}

      <div className="sf-container sf-layout">
        <div className="sf-content">
          {canShowProducts && <section id="products" className="sf-card sf-section">
            <SectionHeading icon={<ShoppingBag size={19} />} eyebrow={t("Browse the catalog")} title={t("Products")} action={<span className="sf-section-count">{products.length} {t("items")}</span>} />
            <div className="sf-toolbar">
              <div className="sf-chips">{categories.map((item) => <button type="button" key={item} onClick={() => setCategory(item)} className="sf-chip-btn" data-active={category === item}>{category === "All" && item === "All" ? t("All") : item}</button>)}</div>
              <label className="sf-search sf-search-inline"><Search size={15} aria-hidden="true" /><input aria-label={t("Search products and services")} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Search")} /></label>
            </div>
            {visibleProducts.length ? <div className="sf-products">{visibleProducts.map((product) => <article key={product.id} className="sf-product">
              <div className="sf-product-media">
                {product.imageUrl ? <img src={resolveAssetUrl(product.imageUrl)} alt={product.name} loading="lazy" /> : <span className="sf-product-placeholder"><ImageIcon size={26} /><span className="sr-only">{t("No product image")}</span></span>}
                {product.category && <span className="sf-product-cat">{product.category}</span>}
              </div>
              <div className="sf-product-body">
                <h3 className="sf-product-name">{product.name}</h3>
                {product.description && <p className="sf-product-desc">{product.description}</p>}
                <div className="sf-product-foot">
                  <p className="sf-price">{currency(product.price, product.currency)}</p>
                  {canOrder && <button type="button" onClick={() => addToCart(product)} className="sf-add"><Plus size={13} />{t("Order")}</button>}
                </div>
              </div>
            </article>)}</div> : <p className="sf-empty">{t("No products match this search.")}</p>}
          </section>}

          {bookableServices.length > 0 && <section id="booking" className="sf-booking" style={{ backgroundColor: theme.header }}>
            <div className="sf-booking-head">
              <div className="sf-booking-title"><span className="sf-booking-icon" style={{ color: theme.accent }}><CalendarDays size={21} /></span><div><p className="sf-eyebrow sf-eyebrow-light">{t("Reserve your time")}</p><h2>{t("Book an appointment")}</h2><p className="sf-booking-copy">{t("Choose a service, pick an available time, and receive a private booking link.")}</p></div></div>
              <Link to={bookingUrl} onClick={() => track("BOOKING_CLICK")} className="sf-btn" style={{ backgroundColor: theme.accent, color: theme.accentText }}>{t("Start booking")}<ArrowRight size={15} /></Link>
            </div>
            <div className="sf-booking-services">{bookableServices.slice(0, 4).map((service) => <Link key={service.id} to={`/b/${business.slug}/book?service=${service.id}`} onClick={() => track("BOOKING_CLICK", { serviceId: service.id })} className="sf-booking-service"><span><strong>{service.name}</strong><small><Clock3 size={11} />{service.durationMinutes} {t("minutes")}</small></span><ArrowRight size={15} style={{ color: theme.accent }} /></Link>)}</div>
          </section>}

          {canShowServices && <section id="services" className="sf-card sf-section">
            <SectionHeading icon={<UtensilsCrossed size={19} />} eyebrow={t("Ways we can help")} title={t("Services")} />
            {visibleServices.length ? <div className="sf-services">{visibleServices.map((service) => <article key={service.id} className="sf-service">
              <div className="sf-service-media">{service.imageUrl ? <img src={resolveAssetUrl(service.imageUrl)} alt="" loading="lazy" /> : <UtensilsCrossed size={22} />}</div>
              <div className="sf-service-body">
                <h3>{service.name}</h3>
                {service.description && <p>{service.description}</p>}
                <div className="sf-service-meta"><span className="sf-price">{t("From")} {currency(service.startingPrice, service.currency)}</span>{service.duration && <span className="sf-service-duration">{service.duration}</span>}</div>
                {service.isBookable && service.durationMinutes && onlineBooking
                  ? <Link to={`/b/${business.slug}/book?service=${service.id}`} onClick={() => track("BOOKING_CLICK", { serviceId: service.id })} className="sf-service-link"><CalendarDays size={14} />{t("Book online")}<ArrowRight size={14} /></Link>
                  : canRequest
                    ? <Link to={requestUrl} state={{ selectedService: { id: service.id, name: service.name } }} className="sf-service-link">{t("Request this service")}<ArrowRight size={14} /></Link>
                    : <a href="#contact" className="sf-service-link">{t("Contact us")}<ArrowRight size={14} /></a>}
              </div>
            </article>)}</div> : <p className="sf-empty">{t("No services match this search.")}</p>}
          </section>}

          {canShowPortfolio && gallery.length > 0 && <section id="gallery" className="sf-card sf-section">
            <SectionHeading icon={<Camera size={19} />} eyebrow={t("From the catalog")} title={t("Gallery")} action={<span className="sf-section-count">{gallery.length} {t("photos")}</span>} />
            <div className="sf-gallery" data-count={Math.min(gallery.length, 6)}>{gallery.slice(0, 6).map((image) => <img key={image.id} src={resolveAssetUrl(image.url)} alt={image.label} loading="lazy" />)}</div>
          </section>}

          {canShowReviews && <section id="reviews" className="sf-card sf-section">
            <SectionHeading icon={<Star size={18} className="fill-current" />} eyebrow={t("Customer feedback")} title={t("Reviews")} action={business.reviewCount > 0 ? <span className="sf-section-count"><Star size={13} className="fill-current" />{business.rating.toFixed(1)} · {business.reviewCount}</span> : undefined} />
            {business.reviews.length ? <div className="sf-reviews">{business.reviews.slice(0, 4).map((review) => <article key={review.id} className="sf-review">
              <div className="sf-review-head">
                <div className="sf-review-person"><span className="sf-avatar">{review.customerName.slice(0, 1).toUpperCase()}</span><div><strong>{review.customerName}{review.isVerified && <BadgeCheck size={13} aria-label={t("Verified customer")} />}</strong><time>{new Date(review.createdAt).toLocaleDateString()}</time></div></div>
                <span className="sf-stars" aria-label={`${review.rating} / 5`}>{Array.from({ length: Math.max(0, Math.min(5, review.rating)) }).map((_, index) => <Star key={index} size={13} className="fill-current" />)}</span>
              </div>
              <p>{review.comment}</p>
            </article>)}</div> : <div className="sf-empty sf-empty-row"><span className="sf-section-icon"><Star size={18} /></span><p>{t("No published reviews yet.")}</p></div>}
          </section>}
        </div>

        <aside className="sf-sidebar">
          <section id="contact" className="sf-card sf-contact">
            <SectionHeading icon={<MessageCircle size={19} />} title={`${t("Contact")} ${business.name}`} />
            <p className="sf-contact-copy">{t("Get in touch with the business for questions or service requests.")}</p>
            <div className="sf-contact-actions">
              {whatsappLink && <a href={whatsappLink} target="_blank" rel="noreferrer" onClick={() => track("WHATSAPP_CLICK")} className="sf-btn sf-btn-whatsapp sf-btn-block"><MessageCircle size={17} />{t("Chat on WhatsApp")}</a>}
              {canRequest && <Link to={requestUrl} className="sf-btn sf-btn-outline sf-btn-block">{t("Send a request")}<ArrowRight size={15} /></Link>}
              {!canRequest && canShowContactForm && business.email && <a href={`mailto:${business.email}`} className="sf-btn sf-btn-outline sf-btn-block"><Mail size={15} />{t("Email us")}</a>}
            </div>
            {(phoneLink || business.email || location || openingHours) && <div className="sf-contact-list">
              {phoneLink && <a href={phoneLink} onClick={() => track("PHONE_CLICK")}><span className="sf-contact-icon"><Phone size={16} /></span><span><small>{t("Call")}</small><strong>{business.phone}</strong></span></a>}
              {business.email && <a href={`mailto:${business.email}`}><span className="sf-contact-icon"><Mail size={16} /></span><span><small>{t("Email")}</small><strong>{business.email}</strong></span></a>}
              {location && <div><span className="sf-contact-icon"><MapPin size={16} /></span><span><small>{t("Location")}</small><strong>{location}</strong>{directionsLink && <a href={directionsLink} target="_blank" rel="noreferrer" onClick={() => track("DIRECTIONS_CLICK")} className="sf-info-link">{t("View directions")}<ExternalLink size={11} /></a>}</span></div>}
              {openingHours && <div><span className="sf-contact-icon"><Clock3 size={16} /></span><span><small>{t("Opening hours")}</small><strong>{openingHours}</strong></span></div>}
            </div>}
            <button type="button" onClick={() => void sharePage()} className="sf-share-row"><Share2 size={15} />{copied ? t("Copied") : t("Share this page")}</button>
          </section>

          <section className="sf-card sf-glance">
            <SectionHeading icon={<BadgeCheck size={19} />} title={t("At a glance")} />
            <div className="sf-glance-chips">
              {business.category && <span>{business.category}</span>}
              {business.reviewCount > 0 && <span className="sf-glance-rating"><Star size={12} className="fill-current" />{business.rating.toFixed(1)} · {business.reviewCount} {t("reviews")}</span>}
              {openingHours && <span><Clock3 size={12} />{t("Hours listed")}</span>}
            </div>
            <div className="sf-stats">
              <div><strong>{business.stats.pageViews.toLocaleString()}</strong><small>{t("Page visits")}</small></div>
              <div><strong>{business.stats.customerRequests.toLocaleString()}</strong><small>{t("Requests received")}</small></div>
              {typeof business.stats.bookings === "number" && business.stats.bookings > 0 && <div className="sf-stats-wide"><CalendarDays size={14} /><span>{business.stats.bookings} {t("appointments booked")}</span></div>}
            </div>
          </section>
        </aside>
      </div>
    </main>

    <footer className="sf-footer">
      <div className="sf-container sf-footer-grid">
        <div className="sf-footer-brand">
          <div className="sf-footer-logo">{business.logoUrl ? <img src={resolveAssetUrl(business.logoUrl)} alt="" /> : <Store size={20} />}</div>
          <strong>{business.name}</strong>
          {tagline && <p>{tagline}</p>}
          {location && <p className="sf-footer-location"><MapPin size={13} />{location}</p>}
        </div>
        <div className="sf-footer-col"><h2>{t("Explore")}</h2>{sections.map((section) => <a key={section.href} href={section.href}>{t(section.label)}</a>)}</div>
        <div className="sf-footer-col"><h2>{t("Contact")}</h2>{business.phone && <a href={phoneLink}>{business.phone}</a>}{business.email && <a href={`mailto:${business.email}`}>{business.email}</a>}{whatsappLink && <a href={whatsappLink} target="_blank" rel="noreferrer">{t("WhatsApp")}</a>}</div>
        <div className="sf-footer-col"><h2>{t("Share this page")}</h2><div className="sf-footer-share"><button type="button" onClick={() => void sharePage()}>{copied ? t("Copied") : t("Copy link")}</button>{whatsappLink && <a href={`https://wa.me/?text=${encodeURIComponent(`${business.name} — ${shareUrl}`)}`} target="_blank" rel="noreferrer">WhatsApp</a>}</div><div className="sf-footer-lang"><LanguageSwitcher compact /></div></div>
      </div>
      <div className="sf-footer-bottom"><div className="sf-container"><span>© {new Date().getFullYear()} {business.name}. {t("All rights reserved.")}</span><Link to="/">{t("Powered by e-businessRw")}</Link></div></div>
    </footer>

    <div className="sf-mobile-bar">
      {canShowProducts && canOrder
        ? <button type="button" onClick={() => setCartOpen(true)} className="sf-mobile-primary"><ShoppingCart size={17} />{t("Order")}{cartCount > 0 && ` (${cartCount})`}</button>
        : canRequest
          ? <Link to={requestUrl} className="sf-mobile-primary"><MessageCircle size={17} />{t("Request")}</Link>
          : <a href="#contact" className="sf-mobile-primary"><MessageCircle size={17} />{t("Contact")}</a>}
      {whatsappLink
        ? <a href={whatsappLink} target="_blank" rel="noreferrer" onClick={() => track("WHATSAPP_CLICK")} className="sf-mobile-secondary"><MessageCircle size={17} />WhatsApp</a>
        : phoneLink
          ? <a href={phoneLink} onClick={() => track("PHONE_CLICK")} className="sf-mobile-secondary"><Phone size={17} />{t("Call")}</a>
          : <a href="#contact" className="sf-mobile-secondary"><MessageCircle size={17} />{t("Contact")}</a>}
    </div>

    {cartOpen && <div className="sf-drawer-backdrop" role="presentation">
      <button type="button" aria-label={t("Close order")} onClick={() => setCartOpen(false)} className="sf-drawer-scrim" />
      <aside role="dialog" aria-modal="true" aria-label={t("Your order")} className="sf-drawer">
        <div className="sf-drawer-head">
          <div><p className="sf-eyebrow">{t("Your order")}</p><h2>{cartCount} {cartCount === 1 ? t("item") : t("items")}</h2></div>
          <button type="button" ref={cartCloseRef} onClick={() => setCartOpen(false)} className="sf-icon-btn" aria-label={t("Close order")}><X size={18} /></button>
        </div>
        {cartItems.length ? <>
          <div className="sf-drawer-body">{cartItems.map((item) => <article key={item.id} className="sf-cart-item">
            <div className="sf-cart-media">{item.imageUrl ? <img src={resolveAssetUrl(item.imageUrl)} alt="" /> : <span><ImageIcon size={20} /></span>}</div>
            <div className="sf-cart-info">
              <h3>{item.name}</h3>
              <p className="sf-price">{currency(item.price, item.currency)}</p>
              <div className="sf-stepper">
                <button type="button" onClick={() => changeCartQuantity(item.id, -1)} aria-label={`${t("Remove one")} ${item.name}`}><Minus size={13} /></button>
                <span>{item.quantity}</span>
                <button type="button" onClick={() => changeCartQuantity(item.id, 1)} aria-label={`${t("Add another")} ${item.name}`}><Plus size={13} /></button>
              </div>
            </div>
          </article>)}</div>
          <div className="sf-drawer-foot">
            <div className="sf-total"><span>{t("Estimated total")}</span><strong>{currency(cartTotal, cartItems[0]?.currency)}</strong></div>
            <p>{t("Review your items, choose pickup or delivery, and place the order. The business will confirm it and arrange payment.")}</p>
            <button type="button" onClick={sendOrderRequest} className="sf-btn sf-btn-primary sf-btn-block">{t("Continue to order")}<ArrowRight size={16} /></button>
          </div>
        </> : <div className="sf-drawer-empty"><span className="sf-section-icon"><ShoppingCart size={22} /></span><h3>{t("Your order is empty")}</h3><p>{t("Browse the catalog to add an item.")}</p><button type="button" onClick={() => setCartOpen(false)} className="sf-btn sf-btn-outline">{t("Continue shopping")}</button></div>}
      </aside>
    </div>}
  </div>;
}
