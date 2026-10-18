import { useMemo, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Link } from "react-router";
import { ArrowRight, BadgeCheck, Camera, Check, Clock3, ExternalLink, Image as ImageIcon, Mail, MapPin, MessageCircle, Minus, Phone, Plus, Search, Share2, ShoppingBag, ShoppingCart, Star, Store, UtensilsCrossed, X } from "lucide-react";
import { resolveAssetUrl } from "../services/api";
import { LanguageSwitcher, useLanguage } from "../i18n";
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

function SectionHeading({ icon, eyebrow, title, action }: { icon: ReactNode; eyebrow?: string; title: string; action?: ReactNode }) {
  return <div className="mb-5 flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e7f5ef] text-[#087553]">{icon}</span><div className="min-w-0">{eyebrow && <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#63907b]">{eyebrow}</p>}<h2 className="font-display text-lg font-bold tracking-tight text-[#123d37] sm:text-xl">{title}</h2></div></div>{action}</div>;
}

function StoryText({ text }: { text: string }) {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return null;
  const clean = (line: string) => line.replace(/^#{1,6}\s*/, "").replace(/\*\*(.*?)\*\*/g, "$1").replace(/__(.*?)__/g, "$1").replace(/`([^`]+)`/g, "$1");
  return <div className="space-y-3 text-sm leading-6 text-[#58716d]">{lines.map((line, index) => /^[-*]\s+/.test(line)
    ? <p key={`${index}-${line}`} className="flex gap-2.5"><span className="mt-[.65rem] size-1.5 shrink-0 rounded-full bg-[#0a9b6d]" /><span>{clean(line.replace(/^[-*]\s+/, ""))}</span></p>
    : /^#{1,6}\s+/.test(line)
      ? <h3 key={`${index}-${line}`} className="font-display font-bold text-[#234f49]">{clean(line)}</h3>
      : <p key={`${index}-${line}`}>{clean(line)}</p>)}</div>;
}

export default function BusinessStorefront(props: BusinessStorefrontProps) {
  const { t } = useLanguage();
  const {
    business, products, visibleProducts, visibleServices, categories, search, setSearch, category, setCategory,
    cartItems, cartCount, cartTotal, cartOpen, setCartOpen, copied, shareUrl, sharePage, addToCart,
    sendOrderRequest, changeCartQuantity, track, phoneLink, whatsappLink, directionsLink, openingHours,
  } = props;
  const gallery = useMemo(() => {
    const images = [
      ...(business.coverImageUrl ? [{ id: "cover", url: business.coverImageUrl, label: `${business.name} cover` }] : []),
      ...business.products.filter((product) => product.imageUrl).map((product) => ({ id: `product-${product.id}`, url: product.imageUrl!, label: product.name })),
      ...business.services.filter((service) => service.imageUrl).map((service) => ({ id: `service-${service.id}`, url: service.imageUrl!, label: service.name })),
    ];
    return images.filter((image, index) => images.findIndex((candidate) => candidate.url === image.url) === index);
  }, [business]);
  const sections = [
    { label: "Home", href: "#home", icon: <Store size={16} /> },
    ...(products.length ? [{ label: "Products", href: "#products", icon: <ShoppingBag size={16} /> }] : []),
    ...(business.services.length ? [{ label: "Services", href: "#services", icon: <UtensilsCrossed size={16} /> }] : []),
    ...(gallery.length ? [{ label: "Gallery", href: "#gallery", icon: <Camera size={16} /> }] : []),
    { label: "Reviews", href: "#reviews", icon: <Star size={16} /> },
    { label: "Contact", href: "#contact", icon: <MessageCircle size={16} /> },
  ];
  const location = [business.address, business.city, business.country].filter(Boolean).join(", ");
  const tagline = business.tagline;
  const heroDescription = business.description.split("\n").map((line) => line.trim()).filter((line) => line && !/^#{1,6}\s/.test(line) && !/^[-*]\s/.test(line)).map((line) => line.replace(/\*\*(.*?)\*\*/g, "$1").replace(/__(.*?)__/g, "$1")).join(" ").replace(/\s+/g, " ").trim();
  const requestUrl = `/b/${business.slug}/request`;

  return <div className="min-h-screen bg-[#f1f8f7] pb-20 text-[#113c3b] sm:pb-0">
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#003c30] text-white shadow-[0_5px_24px_rgba(0,42,32,.2)]">
      <div className="mx-auto flex h-[70px] max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-7 xl:px-10">
        <a href="#home" className="flex min-w-0 items-center gap-3" aria-label="e-businessRw home">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#15bf7b] text-[#003d31]"><Store size={23} strokeWidth={2.7} /></span>
          <span className="min-w-0"><span className="block truncate font-display text-lg font-extrabold leading-5 tracking-tight sm:text-xl">e-businessRw</span><span className="hidden text-[10px] font-medium tracking-wide text-emerald-100/75 sm:block">{t("Discover · Connect · Grow")}</span></span>
        </a>
        <nav aria-label="Business page" className="hidden items-center gap-1 xl:flex">{sections.map((section, index) => <a key={section.href} href={section.href} className={`inline-flex min-h-[70px] items-center gap-2 border-b-2 px-3 text-[12px] font-semibold transition ${index === 0 ? "border-emerald-400 text-white" : "border-transparent text-emerald-50/75 hover:border-white/35 hover:text-white"}`}>{section.icon}{t(section.label)}</a>)}</nav>
        <div className="flex shrink-0 items-center gap-2">
          <LanguageSwitcher compact />
          <label className="hidden items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-2 text-white/75 xl:flex"><Search size={15} /><input aria-label={t("Search products and services")} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Search")} className="w-24 bg-transparent text-xs text-white outline-none placeholder:text-white/55" /></label>
          <button type="button" onClick={() => void sharePage()} className="hidden min-h-10 items-center gap-2 rounded-full border border-white/25 px-4 text-xs font-bold transition hover:bg-white/10 sm:flex"><Share2 size={15} />{copied ? t("Copied") : t("Share")}</button>
          {whatsappLink && <a href={whatsappLink} target="_blank" rel="noreferrer" onClick={() => track("WHATSAPP_CLICK")} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#12b978] px-3.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#0aa56b] sm:px-4"><MessageCircle size={16} /><span className="hidden sm:inline">{t("Contact us")}</span></a>}
          {products.length > 0 && <button type="button" onClick={() => setCartOpen(true)} aria-label={`Open basket, ${cartCount} items`} className="relative grid size-10 place-items-center rounded-full border border-white/20 text-white hover:bg-white/10"><ShoppingCart size={18} />{cartCount > 0 && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-[#f28c38] px-1 text-[10px] font-bold leading-5">{cartCount}</span>}</button>}
        </div>
      </div>
    </header>

    <main>
      <section id="home" className="relative isolate scroll-mt-20 overflow-hidden bg-[#003b30] text-white">
        {business.coverImageUrl && <img src={resolveAssetUrl(business.coverImageUrl)} alt="" className="absolute inset-0 -z-20 size-full object-cover object-center" />}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#002c24_0%,rgba(0,48,39,.97)_32%,rgba(0,53,43,.84)_53%,rgba(0,43,37,.16)_100%)]" />
        <div className="mx-auto grid min-h-[320px] max-w-[1500px] items-center gap-7 px-4 py-8 sm:px-7 sm:py-10 lg:grid-cols-[190px_minmax(0,1fr)_auto] lg:gap-8 xl:px-10">
          <div className="grid size-36 place-items-center overflow-hidden rounded-[1.35rem] border border-white/60 bg-white/10 shadow-[0_18px_55px_rgba(0,0,0,.25)] backdrop-blur-sm sm:size-44 lg:size-48">{business.logoUrl ? <img src={resolveAssetUrl(business.logoUrl)} alt={`${business.name} logo`} className="size-full object-cover" /> : <Store size={54} className="text-emerald-300" />}</div>
          <div className="max-w-3xl">
            <div className="mb-3 flex flex-wrap items-center gap-2"><span className="rounded-full border border-emerald-200/30 bg-emerald-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[.15em] text-emerald-100">{business.category || "Business"}</span></div>
            <h1 className="font-display text-3xl font-extrabold leading-[1.04] tracking-[-.045em] sm:text-4xl lg:text-[3.1rem]">{business.name}</h1>
            {tagline && <p className="mt-3 text-base font-medium text-emerald-200 sm:text-lg">{tagline}</p>}
            {location && <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/90"><span className="inline-flex items-center gap-2"><MapPin size={17} className="text-emerald-300" />{location}</span>{directionsLink && <a href={directionsLink} target="_blank" rel="noreferrer" onClick={() => track("DIRECTIONS_CLICK")} className="inline-flex items-center gap-1.5 font-bold text-emerald-300 hover:text-white">{t("View on maps")} <ArrowRight size={15} /></a>}</div>}
            <div className="mt-4 flex flex-wrap items-center gap-4">{business.reviewCount > 0 && <div className="flex items-center gap-2"><span className="flex text-amber-400">{Array.from({ length: 5 }).map((_, index) => <Star key={index} size={17} className={index < Math.round(business.rating) ? "fill-current" : "opacity-35"} />)}</span><strong className="text-sm">{business.rating.toFixed(1)}</strong><span className="text-xs text-white/75">({business.reviewCount} {business.reviewCount === 1 ? t("review") : t("reviews")})</span></div>}{openingHours && <span className="inline-flex items-center gap-1.5 text-xs text-white/80"><Clock3 size={14} className="text-emerald-300" />{openingHours}</span>}</div>
            {heroDescription && <p className="mt-4 max-w-2xl text-sm leading-6 text-white/85">{heroDescription.slice(0, 190)}{heroDescription.length > 190 ? "…" : ""}</p>}
            <div className="mt-5 flex flex-wrap gap-2.5"><Link to={requestUrl} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0db779] px-5 text-sm font-extrabold text-white shadow-lg shadow-emerald-950/20 transition hover:-translate-y-0.5 hover:bg-[#08a76c]">{t("Send a request")} <ArrowRight size={16} /></Link>{phoneLink && <a href={phoneLink} onClick={() => track("PHONE_CLICK")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/35 bg-white/5 px-4 text-sm font-bold text-white transition hover:bg-white/15"><Phone size={15} />{t("Call")}</a>}</div>
          </div>
          <div className="hidden min-w-[150px] justify-items-end lg:grid">{openingHours && <div className="max-w-[210px] rounded-2xl border border-white/15 bg-[#00362b]/85 p-4 text-right shadow-xl backdrop-blur-md"><span className="mx-auto mb-2 block size-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_5px_rgba(52,211,153,.12)]" /><p className="text-sm font-bold">{t("Hours")}</p><p className="mt-1 text-xs leading-5 text-white/70">{openingHours}</p></div>}</div>
        </div>
      </section>

      <div className="sticky top-[70px] z-30 border-b border-[#dcebe8] bg-white/95 shadow-[0_5px_20px_rgba(20,74,67,.04)] backdrop-blur-xl xl:hidden">
        <nav aria-label="Business sections" className="mx-auto flex max-w-[1500px] gap-1 overflow-x-auto px-3 py-2">{sections.map((section) => <a key={section.href} href={section.href} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-[#315c57] hover:bg-[#eaf5f1] hover:text-[#087553]">{section.icon}{t(section.label)}</a>)}</nav>
        <label className="mx-auto mb-2 flex max-w-[1500px] items-center gap-2 px-4 text-[#628078] sm:px-7"><Search size={15} /><input aria-label={t("Search products and services")} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Search products and services")} className="min-h-8 w-full bg-transparent text-xs outline-none placeholder:text-[#94a6a0]" /></label>
      </div>
      <div className="hidden border-b border-[#dcebe8] bg-white/95 xl:block"><nav aria-label="Business sections" className="mx-auto flex max-w-[1500px] gap-2 overflow-x-auto px-7 xl:px-10">{sections.map((section, index) => <a key={section.href} href={section.href} className={`inline-flex min-h-12 items-center gap-2 border-b-2 px-3 text-xs font-semibold ${index === 0 ? "border-[#11a875] text-[#075b49]" : "border-transparent text-[#466560] hover:border-emerald-300 hover:text-[#075b49]"}`}>{section.icon}{t(section.label)}</a>)}</nav></div>

      {business.offers.length > 0 && <div className="mx-auto max-w-[1500px] px-4 pt-5 sm:px-7 xl:px-10">{business.offers.map((offer) => <article key={offer.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-gradient-to-r from-[#e8f8ef] to-white px-5 py-4 shadow-sm"><div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#398268]">{t("Current offer")}</p><h2 className="mt-1 font-display font-bold text-[#123d37]">{offer.title}</h2>{offer.description && <p className="mt-1 text-xs text-[#58716d]">{offer.description}</p>}</div><span className="rounded-xl bg-[#087553] px-4 py-2 text-sm font-extrabold text-white">{offer.discountType === "PERCENTAGE" ? `${Number(offer.discountValue)}% ${t("off")}` : currency(offer.discountValue)}</span></article>)}</div>}

      <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 sm:px-7 sm:py-7 xl:px-10 lg:grid-cols-[minmax(230px,.92fr)_minmax(420px,1.9fr)_minmax(245px,.92fr)]">
        <section id="about" className="scroll-mt-40 rounded-2xl border border-[#e0eeeb] bg-white p-5 shadow-[0_8px_28px_rgba(13,80,69,.045)] sm:p-6">
          <SectionHeading icon={<Store size={19} />} title={t("About us")} />
          <StoryText text={business.description || business.tagline} />
            {business.highlights.length > 0 && <><div className="my-5 h-px bg-[#e9f1ef]" /><h3 className="text-xs font-bold uppercase tracking-[.13em] text-[#548073]">{t("Highlights")}</h3><ul className="mt-3 grid grid-cols-2 gap-3">{business.highlights.map((highlight, index) => <li key={`${highlight}-${index}`} className="flex min-w-0 items-center gap-2 rounded-xl bg-[#f2faf7] p-2.5 text-xs font-medium text-[#345c56]"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#dff3e9] text-[#087553]"><Check size={15} /></span><span className="line-clamp-2">{highlight.replace(/^[-*✓]\s*/, "")}</span></li>)}</ul></>}
          {business.city && <p className="mt-5 flex items-start gap-2 border-t border-[#e9f1ef] pt-4 text-xs leading-5 text-[#627b76]"><MapPin size={15} className="mt-0.5 shrink-0 text-[#0a9670]" />{location}</p>}
          <a href="#contact" className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-full border border-[#0b9b6a] px-4 text-xs font-bold text-[#087553] transition hover:bg-[#eaf8f1]">{t("More about ")}{business.name} <ArrowRight size={14} /></a>
        </section>

        <div className="min-w-0 space-y-5">
          <section id="products" className="scroll-mt-40 rounded-2xl border border-[#e0eeeb] bg-white p-5 shadow-[0_8px_28px_rgba(13,80,69,.045)] sm:p-6">
            <SectionHeading icon={<ShoppingBag size={20} />} eyebrow={t("Browse the catalog")} title={t("Products")} action={<a href="#products" className="hidden items-center gap-1 text-[11px] font-bold text-[#07845d] sm:inline-flex">{products.length} {t("items")} <ArrowRight size={13} /></a>} />
            {products.length > 0 ? <><div className="mb-4 flex flex-wrap gap-2">{categories.map((item) => <button type="button" key={item} onClick={() => setCategory(item)} className={`rounded-full border px-3.5 py-1.5 text-[11px] font-bold transition ${category === item ? "border-[#087553] bg-[#087553] text-white" : "border-[#dcebe5] bg-white text-[#54716a] hover:border-[#0e9b6e]"}`}>{category === "All" && item === "All" ? t("All") : item}</button>)}</div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{visibleProducts.map((product) => <article key={product.id} className="group overflow-hidden rounded-xl border border-[#e4eeeb] bg-white shadow-[0_3px_12px_rgba(15,70,59,.04)] transition hover:-translate-y-1 hover:shadow-[0_12px_26px_rgba(15,70,59,.1)]"><div className="relative h-36 overflow-hidden bg-gradient-to-br from-[#e9f4ef] to-[#f8f7ee]">{product.imageUrl ? <img src={resolveAssetUrl(product.imageUrl)} alt={product.name} className="size-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" /> : <div className="grid size-full place-items-center text-[#7ba998]"><ImageIcon size={28} /><span className="sr-only">{t("No product image")}</span></div>}{product.category && <span className="absolute left-2.5 top-2.5 rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-bold text-[#38665b] shadow-sm">{product.category}</span>}</div><div className="p-3"><h3 className="truncate text-sm font-bold text-[#143e3b]">{product.name}</h3>{product.description && <p className="mt-1 line-clamp-2 min-h-8 text-[11px] leading-4 text-[#6a817b]">{product.description}</p>}<div className="mt-3 flex items-center justify-between gap-2"><p className="text-xs font-extrabold text-[#075b49]">{currency(product.price, product.currency)}</p><button type="button" onClick={() => addToCart(product)} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-[#087553] px-3 text-[10px] font-bold text-white transition hover:bg-[#056046]"><Plus size={13} />{t("Add")}</button></div></div></article>)}</div>{visibleProducts.length === 0 && <p className="rounded-xl bg-[#f4f9f7] p-5 text-sm text-[#627b76]">{t("No products match this search.")}</p>}</> : <div className="rounded-xl bg-[#f5faf8] p-5 text-sm leading-6 text-[#627b76]">{business.name} {t("has not published any products yet.")}</div>}
          </section>

          {business.services.length > 0 && <section id="services" className="scroll-mt-40 rounded-2xl border border-[#e0eeeb] bg-white p-5 shadow-[0_8px_28px_rgba(13,80,69,.045)] sm:p-6"><SectionHeading icon={<UtensilsCrossed size={19} />} eyebrow={t("Ways we can help")} title={t("Services")} />{visibleServices.length ? <div className="grid gap-3 sm:grid-cols-2">{visibleServices.map((service) => <article key={service.id} className="flex min-w-0 gap-3 rounded-xl border border-[#e6efec] bg-[#fbfdfc] p-3.5">{service.imageUrl ? <img src={resolveAssetUrl(service.imageUrl)} alt="" className="size-[72px] shrink-0 rounded-lg object-cover" loading="lazy" /> : <span className="grid size-[72px] shrink-0 place-items-center rounded-lg bg-[#e8f5ef] text-[#0b8661]"><UtensilsCrossed size={23} /></span>}<div className="min-w-0 flex-1"><h3 className="truncate text-sm font-bold">{service.name}</h3>{service.description && <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[#70857f]">{service.description}</p>}<div className="mt-2 flex flex-wrap items-center justify-between gap-2"><span className="text-[11px] font-extrabold text-[#087553]" >{t("From")} {currency(service.startingPrice, service.currency)}</span>{service.duration && <span className="text-[10px] text-[#81948e]">{service.duration}</span>}</div><Link to={requestUrl} state={{ selectedService: { id: service.id, name: service.name } }} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#087553] to-[#0aa577] px-3 text-xs font-extrabold text-white shadow-sm shadow-emerald-900/10 transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087553] focus-visible:ring-offset-2">{t("Book this service")} <ArrowRight size={15} /></Link></div></article>)}</div> : <p className="text-sm text-[#718780]">{t("No services match this search.")}</p>}</section>}
        </div>

        <aside className="grid content-start gap-5 sm:grid-cols-2 lg:grid-cols-1">
          <section id="contact" className="scroll-mt-40 rounded-2xl border border-[#e0eeeb] bg-white p-5 shadow-[0_8px_28px_rgba(13,80,69,.045)] sm:p-6"><SectionHeading icon={<MessageCircle size={19} />} title={`Contact ${business.name}`} />
            <p className="-mt-2 text-xs leading-5 text-[#718780]">Get in touch with the business for questions or service requests.</p>
            {whatsappLink && <a href={whatsappLink} target="_blank" rel="noreferrer" onClick={() => track("WHATSAPP_CLICK")} className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#078c63] text-sm font-bold text-white transition hover:bg-[#067655]"><MessageCircle size={18} />{t("Chat on WhatsApp")}</a>}
            {(phoneLink || business.email || location || openingHours) && <div className="mt-4 divide-y divide-[#eaf1ef]">{phoneLink && <a href={phoneLink} onClick={() => track("PHONE_CLICK")} className="flex items-center gap-3 py-3 text-xs font-semibold text-[#335c56]"><span className="grid size-9 place-items-center rounded-full bg-[#eaf5f3] text-[#087553]"><Phone size={16} /></span>{business.phone}</a>}{business.email && <a href={`mailto:${business.email}`} className="flex items-center gap-3 py-3 text-xs font-semibold text-[#335c56]"><span className="grid size-9 place-items-center rounded-full bg-[#eaf5f3] text-[#087553]"><Mail size={16} /></span><span className="min-w-0 truncate">{business.email}</span></a>}{location && <div className="flex items-start gap-3 py-3 text-xs font-semibold leading-5 text-[#335c56]"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#eaf5f3] text-[#087553]"><MapPin size={16} /></span><span>{location}{directionsLink && <a href={directionsLink} target="_blank" rel="noreferrer" onClick={() => track("DIRECTIONS_CLICK")} className="mt-1 block text-[10px] font-bold text-[#07845d]">{t("View directions")} <ExternalLink size={11} className="inline" /></a>}</span></div>}{openingHours && <div className="flex items-start gap-3 py-3 text-xs text-[#54716a]"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#eaf5f3] text-[#087553]"><Clock3 size={16} /></span><span><strong className="block text-[#335c56]">{t("Opening hours")}</strong><span className="mt-1 block leading-5">{openingHours}</span></span></div>}</div>}
            <Link to={requestUrl} className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#0a9368] text-sm font-bold text-[#087553] transition hover:bg-[#eff9f4]">{t("Send a request")} <ArrowRight size={16} /></Link>
          </section>
          <section className="rounded-2xl border border-[#e0eeeb] bg-white p-5 shadow-[0_8px_28px_rgba(13,80,69,.045)] sm:p-6"><SectionHeading icon={<BadgeCheck size={19} />} title={t("At a glance")} /><div className="flex flex-wrap gap-2">{business.category && <span className="rounded-full bg-[#eff8f4] px-3 py-1.5 text-[10px] font-bold text-[#397166]">{business.category}</span>}{business.reviewCount > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-[#fff8e8] px-3 py-1.5 text-[10px] font-bold text-[#93661a]"><Star size={12} className="fill-current" />{business.rating.toFixed(1)} · {business.reviewCount} {t("reviews")}</span>}{openingHours && <span className="inline-flex items-center gap-1 rounded-full bg-[#eff8f4] px-3 py-1.5 text-[10px] font-bold text-[#397166]"><Clock3 size={12} />{t("Hours listed")}</span>}</div>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#eaf1ef] pt-4"><div className="rounded-xl bg-[#f2f9f6] p-3"><p className="text-lg font-extrabold text-[#087553]">{business.stats.pageViews.toLocaleString()}</p><p className="text-[10px] text-[#718780]">{t("Page visits")}</p></div><div className="rounded-xl bg-[#f2f9f6] p-3"><p className="text-lg font-extrabold text-[#087553]">{business.stats.customerRequests.toLocaleString()}</p><p className="text-[10px] text-[#718780]">{t("Requests received")}</p></div></div>
          </section>
        </aside>
      </div>

      <div className={`mx-auto grid max-w-[1500px] items-start gap-5 px-4 pb-8 sm:px-7 ${gallery.length > 0 ? "lg:grid-cols-[1.15fr_1fr]" : "lg:grid-cols-1"} xl:px-10`}>
        {gallery.length > 0 && <section id="gallery" className="scroll-mt-40 rounded-2xl border border-[#e0eeeb] bg-white p-5 shadow-[0_8px_28px_rgba(13,80,69,.045)] sm:p-6"><SectionHeading icon={<Camera size={19} />} eyebrow={t("From the catalog")} title={t("Gallery")} action={<span className="text-[11px] font-semibold text-[#718780]">{gallery.length} {t("photos")}</span>} /><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{gallery.slice(0, 6).map((image) => <img key={image.id} src={resolveAssetUrl(image.url)} alt={image.label} loading="lazy" className="h-28 w-full rounded-xl object-cover sm:h-32" />)}</div></section>}
        <section id="reviews" className="scroll-mt-40 rounded-2xl border border-[#e0eeeb] bg-white p-5 shadow-[0_8px_28px_rgba(13,80,69,.045)] sm:p-6"><SectionHeading icon={<Star size={19} className="fill-current" />} eyebrow={t("Customer feedback")} title={t("Reviews")} action={business.reviewCount > 0 ? <span className="text-[11px] font-semibold text-[#718780]">{business.rating.toFixed(1)} · {business.reviewCount}</span> : undefined} />{business.reviews.length ? <div className="space-y-3">{business.reviews.slice(0, 3).map((review) => <article key={review.id} className="rounded-xl border border-[#e4eeeb] bg-[#fcfefd] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-xs text-[#234f49]">{review.customerName}</strong><span className="flex text-amber-400">{Array.from({ length: Math.max(0, Math.min(5, review.rating)) }).map((_, index) => <Star key={index} size={13} className="fill-current" />)}</span></div><p className="mt-2 text-xs leading-5 text-[#58716d]">{review.comment}</p><time className="mt-2 block text-[10px] text-[#8a9a95]">{new Date(review.createdAt).toLocaleDateString()}</time></article>)}</div> : <div className="rounded-xl bg-[#f5faf8] p-5 text-sm leading-6 text-[#627b76]">{t("No published reviews yet.")}</div>}</section>
      </div>
    </main>

    <footer className="bg-[#00382e] text-white"><div className="mx-auto grid max-w-[1500px] gap-7 px-4 py-7 sm:grid-cols-2 sm:px-7 lg:grid-cols-4 xl:px-10"><div><div className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-xl bg-emerald-400 text-[#00382e]">{business.logoUrl ? <img src={resolveAssetUrl(business.logoUrl)} alt="" className="size-full rounded-xl object-cover" /> : <Store size={18} />}</span><strong className="font-display">{business.name}</strong></div>{tagline && <p className="mt-2 text-xs text-emerald-50/65">{tagline}</p>}</div><div><h2 className="text-xs font-bold">Explore</h2><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-emerald-50/70">{sections.map((section) => <a key={section.href} href={section.href} className="hover:text-white">{section.label}</a>)}</div></div><div><h2 className="text-xs font-bold">Contact</h2><div className="mt-3 grid gap-2 text-xs text-emerald-50/70">{business.phone && <a href={phoneLink}>{business.phone}</a>}{business.email && <a href={`mailto:${business.email}`}>{business.email}</a>}{location && <span>{location}</span>}</div></div><div><h2 className="text-xs font-bold">Share this page</h2><div className="mt-3 flex gap-2"><button type="button" onClick={() => void sharePage()} className="rounded-lg border border-white/20 px-3 py-2 text-xs font-bold hover:bg-white/10">{copied ? "Copied" : "Copy link"}</button>{whatsappLink && <a href={`https://wa.me/?text=${encodeURIComponent(`${business.name} — ${shareUrl}`)}`} target="_blank" rel="noreferrer" className="rounded-lg border border-white/20 px-3 py-2 text-xs font-bold hover:bg-white/10">WhatsApp</a>}</div></div></div><div className="border-t border-white/10"><div className="mx-auto flex max-w-[1500px] flex-col gap-2 px-4 py-4 text-[10px] text-white/55 sm:flex-row sm:justify-between sm:px-7 xl:px-10"><span>© {new Date().getFullYear()} {business.name}. All rights reserved.</span><Link to="/" className="font-semibold text-emerald-200 hover:text-white">Powered by e-businessRw</Link></div></div></footer>

    <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-[#dcebe8] bg-white/95 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:hidden">{products.length > 0 ? <button type="button" onClick={() => setCartOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#087553] text-xs font-bold text-white"><ShoppingCart size={16} />Order{cartCount > 0 && ` (${cartCount})`}</button> : <Link to={requestUrl} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#087553] text-xs font-bold text-white"><MessageCircle size={16} />Request</Link>}{whatsappLink ? <a href={whatsappLink} target="_blank" rel="noreferrer" onClick={() => track("WHATSAPP_CLICK")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#b8d9cd] bg-white text-xs font-bold text-[#087553]"><MessageCircle size={16} />WhatsApp</a> : phoneLink ? <a href={phoneLink} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#b8d9cd] bg-white text-xs font-bold text-[#087553]"><Phone size={16} />Call</a> : <a href="#contact" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#b8d9cd] text-xs font-bold text-[#087553]">Contact</a>}</div>

    {cartOpen && <div className="fixed inset-0 z-[60]" role="presentation"><button type="button" aria-label="Close order basket" onClick={() => setCartOpen(false)} className="absolute inset-0 size-full bg-[#09251d]/50 backdrop-blur-[2px]" /><aside role="dialog" aria-modal="true" aria-label="Your order basket" className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-[#e2ece9] px-5 py-4"><div><p className="font-display text-lg font-bold">Your basket</p><p className="text-xs text-[#7a8980]">{cartCount} {cartCount === 1 ? "item" : "items"}</p></div><button type="button" onClick={() => setCartOpen(false)} className="grid size-10 place-items-center rounded-xl border border-[#e4e8df]" aria-label="Close basket"><X size={19} /></button></div>{cartItems.length ? <><div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">{cartItems.map((item) => <article key={item.id} className="flex gap-3 rounded-xl border border-[#e2ece9] p-3">{item.imageUrl ? <img src={resolveAssetUrl(item.imageUrl)} alt="" className="size-[68px] shrink-0 rounded-lg object-cover" /> : <span className="grid size-[68px] shrink-0 place-items-center rounded-lg bg-[#eaf5f1] text-[#087553]"><ImageIcon size={20} /></span>}<div className="min-w-0 flex-1"><h3 className="truncate text-sm font-bold">{item.name}</h3><p className="mt-1 text-xs font-bold text-[#087553]">{currency(item.price, item.currency)}</p><div className="mt-2 flex items-center gap-2"><button type="button" onClick={() => changeCartQuantity(item.id, -1)} className="grid size-7 place-items-center rounded-md bg-[#eaf5f1] text-[#087553]" aria-label={`Remove one ${item.name}`}><Minus size={13} /></button><span className="text-xs font-bold">{item.quantity}</span><button type="button" onClick={() => changeCartQuantity(item.id, 1)} className="grid size-7 place-items-center rounded-md bg-[#eaf5f1] text-[#087553]" aria-label={`Add another ${item.name}`}><Plus size={13} /></button></div></div></article>)}</div><div className="border-t border-[#e2ece9] p-5"><div className="flex justify-between text-sm"><span>Estimated subtotal</span><strong>{currency(cartTotal, cartItems[0]?.currency)}</strong></div><p className="mt-2 text-xs leading-5 text-[#788b85]">The business will confirm availability and the final price after your request.</p><button type="button" onClick={sendOrderRequest} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#087553] text-sm font-bold text-white">Continue to request <ArrowRight size={16} /></button></div></> : <div className="grid flex-1 content-center justify-items-center px-8 text-center"><span className="grid size-14 place-items-center rounded-full bg-[#edf6f2] text-[#087553]"><ShoppingCart size={22} /></span><h3 className="mt-4 font-display text-lg font-bold">Your basket is empty</h3><p className="mt-2 text-sm text-[#77867d]">Browse the catalog to add an item.</p></div>}</aside></div>}
  </div>;
}
