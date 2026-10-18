import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Check,
  CircleCheck,
  ClipboardList,
  FileCheck2,
  Hammer,
  Heart,
  Link2,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Store,
  Utensils,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Brand, Button, ButtonLink } from "../components/ui";
import { businessService, resolveAssetUrl } from "../services/api";
import { useLanguage } from "../i18n";

interface FeaturedBusiness {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  phone: string | null;
  whatsapp: string | null;
  city: string | null;
  products: Array<{ id: string; name: string; description: string; price: number | string; currency: string; imageUrl: string | null }>;
  services: Array<{ id: string; name: string; description: string; startingPrice: number | string; currency: string; duration: string | null; imageUrl: string | null }>;
}

const categoryCards = [
  { name: "Food & drink", sub: "Menus, specials and catering", photo: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=85", icon: Utensils },
  { name: "Fashion", sub: "Clothing, accessories and more", photo: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=85", icon: Sparkles },
  { name: "Electronics", sub: "Showcase what you sell", photo: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85", icon: Package },
  { name: "Home & living", sub: "Furniture, decor and services", photo: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=85", icon: Hammer },
  { name: "Beauty & care", sub: "Services, styles and products", photo: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=85", icon: Heart },
];

export default function LandingPage() {
  const { t } = useLanguage();
  const handleHeroPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    event.currentTarget.style.setProperty("--hero-tilt-x", `${x * 2.4}deg`);
    event.currentTarget.style.setProperty("--hero-tilt-y", `${y * -1.8}deg`);
  };
  const resetHeroPointer = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty("--hero-tilt-x", "0deg");
    event.currentTarget.style.setProperty("--hero-tilt-y", "0deg");
  };
  const businesses = useQuery<ListedBusiness[]>({ queryKey: ["public-businesses"], queryFn: businessService.getPublicBusinesses<ListedBusiness> });
  const demoSlug = businesses.data?.[0]?.slug;
  const featured = useQuery<FeaturedBusiness>({ queryKey: ["public-business", demoSlug ?? ""], queryFn: () => businessService.getPublicBusiness<FeaturedBusiness>(demoSlug!), enabled: Boolean(demoSlug) });
  const business = featured.data;
  const features: Array<{ icon: LucideIcon; title: string; description: string; tone: string }> = [
    { icon: Store, title: "Create your page", description: "Register your business in minutes and set up your page.", tone: "mint" },
    { icon: Package, title: "Add your products", description: "Upload photos, set prices and write descriptions.", tone: "orange" },
    { icon: ClipboardList, title: "Receive requests", description: "Let customers ask about products or request a quote.", tone: "violet" },
    { icon: BarChart3, title: "Manage your business", description: "Track page visits and customer enquiries.", tone: "blue" },
    { icon: ShieldCheck, title: "Build customer trust", description: "Show your details, location and what you offer.", tone: "pink" },
  ];
  const steps = [
    { icon: Users, title: "Register", copy: "Create your business account in minutes." },
    { icon: Package, title: "Add products", copy: "Upload photos, set prices and write descriptions." },
    { icon: Store, title: "Go live", copy: "Your page is ready to share with customers." },
    { icon: BarChart3, title: "Receive requests", copy: "Manage enquiries and grow your sales." },
  ];
  const previewItems = business?.products.slice(0, 2) ?? [
    { id: "sample-product-1", name: "Restaurant favourite", price: 18500, currency: "RWF", imageUrl: null, description: "Freshly prepared" },
    { id: "sample-product-2", name: "A customer favourite", price: 24000, currency: "RWF", imageUrl: null, description: "Made with care" },
  ];
  const bannerImage = resolveAssetUrl(business?.coverImageUrl ?? null) ?? "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1100&q=85";

  return <div className="ebiz-landing ref-landing">
    <section className="ref-hero">
      <div className="landing-shell ref-hero-grid">
        <div className="ref-hero-copy landing-hero-copy">
          <span className="ref-eyebrow">{t("SELL")} <i /> {t("CONNECT")} <i /> {t("GROW")}</span>
          <h1><span>{t("Turn your business")}</span><span>{t("into an")} <em>{t("online store.")}</em></span></h1>
          <p>{t("e-businessRw helps local businesses register, showcase their products and services, and reach more customers — all in one place.")}</p>
          <div className="ref-hero-actions"><Link to="/register" className="ref-button">{t("Get started free")} <ArrowRight size={15} /></Link><a href="#how-it-works" className="ref-button ref-button-outline"><span className="ref-play">▶</span> {t("How it works")}</a></div>
          <div className="ref-hero-perks"><span><ShieldCheck /> {t("No website needed")}</span><span><Sparkles /> {t("Easy to use")}</span><span><ShieldCheck /> {t("Secure account")}</span></div>
        </div>
        <div className="ref-hero-devices" aria-label="Preview of an e-businessRw storefront on a laptop and mobile phone" onPointerMove={handleHeroPointerMove} onPointerLeave={resetHeroPointer}>
          <div className="ref-room-photo" />
          <div className="ref-laptop"><div className="ref-laptop-screen"><div className="ref-browser-bar"><i /><i /><i /><span>e-businessRw / {business?.slug ?? "your-business"}</span></div><div className="ref-store-nav"><Brand /><span>Products&nbsp;&nbsp;&nbsp; Services&nbsp;&nbsp;&nbsp; Offers</span><Search size={14} /></div><div className="ref-store-banner" style={{ backgroundImage: `linear-gradient(90deg,rgba(7,30,23,.78),rgba(7,30,23,.06)),url("${bannerImage}")` }}><div><b>{business?.name ?? "Local products. Better tomorrow."}</b><small>Showcase what you offer and help customers find you.</small><span>Explore the page <ArrowRight size={11} /></span></div><span className="ref-store-avatar" /></div><div className="ref-store-cats"><span>🛍️<small>Food & Drink</small></span><span>🧥<small>Fashion</small></span><span>◉<small>Electronics</small></span><span>⌂<small>Home & Living</small></span><span>✿<small>Beauty</small></span></div><div className="ref-product-row">{previewItems.map((item, index) => <div className="ref-mini-product" key={item.id}><div style={{ backgroundImage: `url("${resolveAssetUrl(item.imageUrl) ?? categoryCards[index]?.photo ?? categoryCards[0]!.photo}")` }} /><b>{item.name}</b><small>{item.currency} {Number(item.price).toLocaleString()}</small></div>)}</div></div><div className="ref-laptop-base" /></div>
          <div className="ref-phone"><div className="ref-phone-speaker" /><div className="ref-phone-screen"><div className="ref-phone-top"><span>e-businessRw</span><Search size={11} /></div><div className="ref-phone-banner" style={{ backgroundImage: `linear-gradient(0deg,rgba(7,30,23,.76),transparent 90%),url("${bannerImage}")` }}><b>{business?.name ?? "Support local businesses"}</b></div><div className="ref-phone-icons"><span>🛍️</span><span>🧥</span><span>◉</span><span>⌂</span></div><div className="ref-phone-products">{previewItems.map((item, index) => <div key={item.id}><img src={resolveAssetUrl(item.imageUrl) ?? categoryCards[index]?.photo ?? categoryCards[0]!.photo} alt="" /><b>{item.name}</b><small>{item.currency} {Number(item.price).toLocaleString()}</small></div>)}</div><span className="ref-phone-home" /></div></div>
          <div className="ref-plant" aria-hidden="true"><i /><i /><i /><i /><i /><i /><span /></div>
        </div>
      </div>
    </section>

    <section id="features" className="ref-features"><div className="landing-shell ref-feature-layout"><Reveal className="ref-feature-intro"><span className="ref-section-label">{t("WHY CHOOSE E-BUSINESSRW?")}</span><h2>{t("Everything you need to grow your business.")}</h2><p>{t("Get the tools to create your online store, manage your products and reach new customers with ease.")}</p></Reveal><div className="ref-feature-cards">{features.map(({ icon: Icon, title, description, tone }, index) => <Reveal key={title} delay={index * 55}><article className="ref-feature-card"><span className={`ref-feature-icon ${tone}`}><Icon size={21} /></span><h3>{t(title)}</h3><p>{t(description)}</p></article></Reveal>)}</div></div></section>

    <section id="industries" className="ref-categories"><div className="landing-shell ref-category-layout"><Reveal className="ref-category-intro"><span className="ref-section-label">{t("POPULAR CATEGORIES")}</span><h2>{t("Explore a wide range of products.")}</h2><p>{t("From food and fashion to electronics and home essentials, find everything in one place.")}</p><Link to="/register" className="ref-small-button">{t("Browse all categories")} <ArrowRight size={13} /></Link></Reveal><div className="ref-category-cards">{categoryCards.map(({ name, photo }, index) => <Reveal key={name} delay={index * 50}><Link to="/register" className="ref-category-tile"><img src={photo} alt="" loading="lazy" /><span><b>{t(name)}</b><small>{t("Explore")} <ArrowRight size={11} /></small></span></Link></Reveal>)}</div></div></section>

    <section id="how-it-works" className="ref-how"><div className="landing-shell ref-how-layout">
      <Reveal className="ref-how-intro"><span className="ref-section-label ref-how-pill">{t("HOW IT WORKS")}</span><h2>{t("Start in 4 simple steps.")}</h2><p>{t("Get your business online and start reaching customers in no time.")}</p></Reveal>
      <div className="ref-step-row">{steps.map(({ icon: Icon, title, copy }, index) => <Reveal key={title} delay={index * 55}><article className="ref-step"><div className="ref-step-visual"><span>{index + 1}</span><i><Icon size={24} /></i>{index < steps.length - 1 && <ArrowRight className="ref-step-arrow" size={17} />}</div><h3>{t(title)}</h3><p>{t(copy)}</p></article></Reveal>)}</div>
      <Reveal className="ref-join-card"><div className="ref-join-copy"><span className="ref-join-icon"><Store size={23} /></span><b>{t("Join thousands of business owners already online.")}</b><p>{t("Your success is just a few clicks away.")}</p><Link to="/register" className="ref-button">{t("Get started free")} <ArrowRight size={14} /></Link></div><div className="ref-join-preview" aria-hidden="true"><div className="ref-join-browser"><i /><i /><i /><span>e-businessRw / your-business</span></div><div className="ref-join-store-banner"><b>{t("Your business, online")}</b><small>{t("Products customers can explore")}</small></div><div className="ref-join-products"><i /><i /><i /></div><div className="ref-join-phone"><b>e-businessRw</b><i /><i /></div></div><div className="ref-join-leaf" /></Reveal>
    </div></section>

    <section id="about" className="ref-proof"><div className="landing-shell ref-proof-layout">
      <Reveal className="ref-proof-photo"><img src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=950&q=85" alt={t("A local business owner helping a customer")} loading="lazy" /><span><i><Store size={18} /></i><b>{t("Local business owner")}</b><small>{t("Ready to be discovered")}</small></span></Reveal>
      <Reveal className="ref-proof-story"><span className="ref-section-label">{t("BUILT FOR LOCAL BUSINESSES")}</span><h2>{t("Give customers one clear place to discover your business.")}</h2><p>{t("Share your story, show what you offer, and make it easier for people to reach you when they are ready.")}</p><div className="ref-proof-link-card"><span><Link2 size={17} /> {t("Your e-businessRw page")}</span><b>{t("Products, services, and contact details in one shareable place.")}</b></div></Reveal>
      <Reveal className="ref-proof-benefits"><h3>{t("Everything customers need to take the next step.")}</h3><p>{t("Keep the important parts of your business easy to find.")}</p><div className="ref-proof-benefit-list"><div><i><Store size={19} /></i><span><b>{t("Your online storefront")}</b><small>{t("Showcase products and services in one place.")}</small></span></div><div><i><ClipboardList size={19} /></i><span><b>{t("Customer requests")}</b><small>{t("Keep enquiries organized in your account.")}</small></span></div><div><i><ShieldCheck size={19} /></i><span><b>{t("Business details")}</b><small>{t("Help customers know how to find and contact you.")}</small></span></div></div><Link to="/register" className="ref-proof-link">{t("Create your business page")} <ArrowRight size={15} /></Link></Reveal>
    </div></section>

    <section id="contact" className="ref-cta"><div className="landing-shell ref-cta-inner"><div><span className="ref-section-label">{t("GET STARTED TODAY")}</span><h2>{t("Your business deserves to be seen.")}</h2><p>{t("Join e-businessRw and give your products the visibility they need.")}</p></div><Link to="/register" className="ref-cta-button">{t("Get started free")} <ArrowRight size={15} /><small>{t("No website needed")}</small></Link><div className="ref-cta-leaves" aria-hidden="true"><i /><i /><i /></div></div></section>

    <footer className="ref-footer"><div className="landing-shell"><div className="ref-footer-main"><div><Brand light /><small>{t("Your Business Online")}</small></div><nav aria-label={t("Footer")}><a href="#features">{t("Features")}</a><a href="#how-it-works">{t("How it works")}</a><Link to="/pricing">{t("Pricing")}</Link><a href="#about">{t("About")}</a><a href="#contact">{t("Contact")}</a></nav><div className="ref-socials"><a href="#contact" aria-label="Facebook">f</a><a href="#contact" aria-label="Instagram">◎</a><a href="#contact" aria-label="X">𝕏</a><a href="#contact" aria-label="YouTube">▶</a></div></div><div className="ref-footer-bottom"><span>© {new Date().getFullYear()} e-businessRw. {t("All rights reserved.")}</span><div><a href="#contact">{t("Privacy policy")}</a><a href="#contact">{t("Terms of service")}</a><a href="#contact">{t("Support")}</a></div></div></div></footer>
  </div>;
}

interface ListedBusiness {
  id: string;
  name: string;
  slug: string;
  category: string;
}

type DemoTab = "products" | "request" | "quote" | "contact";
type CatalogTab = "products" | "services";

const sampleProducts = [
  { name: "Goat Meat", description: "Made fresh to order", price: 12000 },
  { name: "Chicken Stew", description: "A house favourite", price: 10000 },
  { name: "Fresh Juice", description: "Seasonal fruit blend", price: 6000 },
];
const sampleServices = [
  { name: "Catering for an event", description: "Talk with the business about your menu and guest count.", startingPrice: 45000, currency: "RWF", duration: null },
  { name: "Custom service request", description: "Describe what you need and get a tailored response.", startingPrice: 25000, currency: "RWF", duration: null },
];
const sampleItems = [
  { name: "On-site consultation", detail: "Measurements and materials", quantity: 1, price: 25000 },
  { name: "Custom shelving", detail: "Made to fit · oak finish", quantity: 2, price: 85000 },
];
const money = (amount: number | string, currency = "RWF") => `${currency} ${Number(amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

function DishArtwork({ variant = 0 }: { variant?: number }) {
  const plateX = variant % 2 ? 112 : 120;
  return <svg aria-hidden="true" viewBox="0 0 240 150" className="size-full">
    <rect width="240" height="150" fill={variant % 2 ? "#d7a66a" : "#c78f55"} />
    <circle cx={plateX} cy="77" r="58" fill="#efe8d9" />
    <circle cx={plateX} cy="77" r="48" fill="#faf6ec" />
    <ellipse cx={plateX} cy="77" rx="38" ry="34" fill={variant % 2 ? "#8f3e1f" : "#a34721"} />
    <ellipse cx={plateX - 12} cy="69" rx="12" ry="8" fill="#d88431" transform="rotate(-25 108 69)" />
    <ellipse cx={plateX + 12} cy="83" rx="13" ry="8" fill="#e39a39" transform="rotate(20 132 83)" />
    <ellipse cx={plateX - 5} cy="94" rx="12" ry="7" fill="#c96b29" transform="rotate(12 115 94)" />
    <path d={`M${plateX - 20} 61q8-12 18 0q-9 8-18 0m26 30q8-14 18-2q-10 9-18 2m-35 9q8-13 16-4q-8 10-16 4`} fill="#5c8140" />
    <circle cx={plateX + 2} cy="67" r="3" fill="#b8c56b" /><circle cx={plateX - 14} cy="86" r="3" fill="#f0c16a" /><circle cx={plateX + 22} cy="67" r="3" fill="#f0c16a" />
    <path d="M0 128q57-28 102 10t138-8v20H0z" fill="#42251a" opacity=".18" />
  </svg>;
}

function ProductArtwork({ category, variant }: { category?: string; variant: number }) {
  if (category?.toLowerCase().includes("restaurant") || category?.toLowerCase().includes("cafe")) return <DishArtwork variant={variant} />;
  return <div className="grid size-full place-items-center bg-gradient-to-br from-[#f2eee6] to-[#e4dfd5] text-[#9b8a73]"><Package size={22} strokeWidth={1.4} /></div>;
}

function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -24px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref} className={`${className} ${visible ? "landing-reveal-visible" : ""}`} style={{ "--reveal-delay": `${delay}ms` } as CSSProperties & { "--reveal-delay": string }}>{children}</div>;
}

function Label({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return <p className={`text-[.68rem] font-extrabold uppercase tracking-[.12em] ${light ? "text-coral" : "text-coral-dark"}`}>{children}</p>;
}

function ProductBrowser({ business, slug, compact = false }: { business?: FeaturedBusiness; slug?: string; compact?: boolean }) {
  const products = business?.products.slice(0, compact ? 3 : 4) ?? sampleProducts.map((product, index) => ({
    ...product, id: `illustration-${index}`, currency: "RWF", imageUrl: null,
  }));
  const name = business?.name ?? "AfriNaija Pots Restaurant";

  return <div className="overflow-hidden rounded-[1rem] border border-[#e8e4de] bg-white shadow-[0_16px_50px_rgba(14,24,43,.13)]">
    <div className="flex h-8 items-center gap-1.5 border-b border-[#eeeae4] bg-white px-3">
      <span className="size-2 rounded-full bg-[#f17a69]" /><span className="size-2 rounded-full bg-[#edc05b]" /><span className="size-2 rounded-full bg-[#64b98a]" />
      <span className="mx-auto max-w-[65%] truncate rounded-md bg-[#f8f7f4] px-4 py-1 text-[.58rem] text-muted">{slug ? `e-businessrw.rw/b/${slug}` : "e-businessrw.rw/business"}</span>
    </div>
    <div className="bg-[#faf9f6] p-3">
      <div className="relative overflow-hidden rounded-lg bg-[#20170f]">
        <div className="h-24 bg-gradient-to-br from-[#49301f] via-[#21170f] to-[#090d14] sm:h-32">
          {business?.coverImageUrl && <img src={resolveAssetUrl(business.coverImageUrl)} alt={`${name} cover photo`} className="size-full object-cover" onError={(event) => { event.currentTarget.style.opacity = "0"; }} />}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c1018]/85 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
          <div className="min-w-0 text-white"><p className="truncate font-display text-sm font-extrabold sm:text-base">{name}</p><p className="mt-0.5 text-[.6rem] text-white/75">{business?.category ?? "Restaurant"}{business?.city ? ` · ${business.city}` : " · Kigali"}</p></div>
          {business && <BadgeCheck size={16} className="shrink-0 text-white" aria-label="Published business page" />}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between border-b border-[#eae6df] pb-2 text-[.54rem] font-semibold text-muted sm:text-[.62rem]">
        <span className="flex items-center gap-1"><MapPin size={10} /> Location</span><span className="flex items-center gap-1"><Phone size={10} /> Call</span><span className="flex items-center gap-1"><MessageCircle size={10} /> WhatsApp</span><span className="flex items-center gap-1"><Utensils size={10} /> Menu</span><span className="flex items-center gap-1"><Store size={10} /> Offers</span>
      </div>
      <div className="mt-2 flex items-center justify-between"><p className="text-[.62rem] font-bold sm:text-[.68rem]">Popular {business?.category?.toLowerCase().includes("restaurant") ? "dishes" : "products"}</p><span className="text-[.55rem] text-muted">{business ? "From this business" : "Example menu"}</span></div>
      <div className={`mt-2 grid ${compact ? "grid-cols-3" : "grid-cols-4"} gap-2`}>
        {products.slice(0, compact ? 3 : 4).map((product, index) => <div key={product.id} className="min-w-0 overflow-hidden rounded-md border border-[#eeeae4] bg-white">
          <div className="aspect-[1.45/1] overflow-hidden bg-[#d7a66a]">{product.imageUrl ? <img src={resolveAssetUrl(product.imageUrl)} alt={product.name} className="size-full object-cover" /> : <ProductArtwork category={business?.category ?? "restaurant"} variant={index} />}</div>
          <div className="p-1.5"><p className="truncate text-[.55rem] font-bold sm:text-[.62rem]">{product.name}</p><p className="mt-0.5 truncate text-[.52rem] text-muted sm:text-[.58rem]">{money(product.price, product.currency)}</p></div>
        </div>)}
      </div>
    </div>
  </div>;
}

function HeroShowcase({ business, slug }: { business?: FeaturedBusiness; slug?: string }) {
  const firstProduct = business?.products.find((product) => product.imageUrl);
  return <div className="landing-hero-product relative mx-auto w-full max-w-[44rem] lg:pl-3">
    <div className="absolute -left-4 top-8 z-10 hidden items-center gap-2 rounded-lg border border-[#eee9e3] bg-white px-3 py-2.5 shadow-card sm:flex">
      <span className="grid size-5 place-items-center rounded-full bg-[#fff4ef] text-coral"><Search size={12} /></span><span><strong className="block text-[.58rem]">A customer finds your business</strong><small className="block text-[.5rem] text-muted">On Google, social media or a shared link</small></span><ArrowRight size={12} className="text-muted" />
    </div>
    <div className="absolute -right-1 -top-5 -z-10 size-44 rounded-full bg-[#ffe5d8] blur-2xl sm:size-64" />
    <ProductBrowser business={business} slug={slug} />
    <div className="absolute -right-3 top-[24%] z-10 hidden w-[27%] overflow-hidden rounded-[1.5rem] border-[4px] border-[#161b20] bg-white shadow-float sm:block">
      <div className="relative aspect-[.58/1] overflow-hidden bg-gradient-to-br from-[#49301f] to-[#111827]">
        {(firstProduct?.imageUrl ?? business?.coverImageUrl) && <img src={resolveAssetUrl(firstProduct?.imageUrl ?? business?.coverImageUrl)} alt="" className="size-full object-cover" />}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-8 text-[.52rem] font-bold text-white">{business?.name ?? "Restaurant product page"}</div>
      </div>
      <div className="space-y-1.5 p-2"><div className="text-[.53rem] font-bold">{business?.name ?? "Explore the menu"}</div><div className="flex justify-around text-[.45rem] text-muted"><span>Call</span><span>WhatsApp</span><span>Menu</span></div><a href={slug ? `/b/${slug}/request` : "#live-demo"} className="block rounded bg-coral px-1 py-1.5 text-center text-[.48rem] font-bold text-white">Request Quote</a><div className="rounded border border-line py-1 text-center text-[.45rem] font-bold">View Menu</div></div>
    </div>
    <div className="absolute -bottom-4 left-[28%] z-10 hidden items-center gap-2 rounded-lg bg-white px-3 py-2.5 shadow-card sm:flex">
      <CircleCheck size={17} className="shrink-0 text-success" /><span><strong className="block text-[.58rem]">Customer takes action</strong><small className="block text-[.5rem] text-muted">Requests a quote, places an order or contacts you</small></span>
    </div>
    {!business && <p className="mt-2 text-center text-[.62rem] text-muted">Illustrative preview · example content</p>}
  </div>;
}

function InteractiveDemo({ business, slug }: { business?: FeaturedBusiness; slug?: string }) {
  const [tab, setTab] = useState<DemoTab>("products");
  const [catalogTab, setCatalogTab] = useState<CatalogTab>("products");
  const [submitted, setSubmitted] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const products = business?.products.length
    ? business.products.slice(0, 4).map((product) => ({ ...product, price: Number(product.price) }))
    : sampleProducts.map((product, index) => ({ ...product, id: `sample-${index}`, currency: "RWF", imageUrl: null }));
  const services = business?.services.length
    ? business.services.slice(0, 3).map((service) => ({ ...service, startingPrice: Number(service.startingPrice) }))
    : sampleServices;
  const cartTotal = products.reduce((total, item) => total + (cart[item.id] ?? 0) * item.price, 0);
  const phone = business?.phone;
  const whatsapp = business?.whatsapp?.replace(/\D/g, "");
  const requestLink = slug ? `/b/${slug}/request` : "/register";
  const tabItems: Array<{ id: DemoTab; title: string; icon: LucideIcon }> = [
    { id: "products", title: "Explore Products", icon: Store },
    { id: "request", title: "Request a Quote", icon: ClipboardList },
    { id: "quote", title: "View a Quote", icon: FileCheck2 },
    { id: "contact", title: "Contact", icon: MessageCircle },
  ];

  return <div id="live-demo" className="scroll-mt-24">
    <div className="mb-4 flex justify-center" role="tablist" aria-label="Explore the product demonstration">
      <div className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-line bg-white p-1 shadow-sm">
        {tabItems.map(({ id, title, icon: Icon }) => <button key={id} id={`demo-tab-${id}`} type="button" role="tab" aria-selected={tab === id} aria-controls="demo-panel" onClick={() => setTab(id)} className={`inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[.6rem] font-bold transition-colors sm:px-4 sm:text-[.68rem] ${tab === id ? "bg-coral text-white shadow-sm" : "text-muted hover:bg-[#f7f5f1] hover:text-ink"}`}><Icon size={13} />{title}</button>)}
      </div>
    </div>
    <div className="mx-auto grid max-w-6xl items-start gap-3 lg:grid-cols-[1fr_300px]">
      <div className="overflow-hidden rounded-xl border border-[#eeece7] bg-white p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex items-center justify-between"><h3 className="font-display text-xs font-bold">{business?.name ?? "Example business page"}</h3><span className="flex items-center gap-1 rounded-full bg-success-soft px-2 py-1 text-[.55rem] font-bold text-success"><CircleCheck size={10} />{business ? "Live page" : "Demo"}</span></div>
        <div id="demo-panel" role="tabpanel" aria-labelledby={`demo-tab-${tab}`} aria-live="polite">
          {tab === "products" && <div>
            <div className="mb-2.5 flex gap-1" aria-label="Catalog type">
              <button type="button" aria-pressed={catalogTab === "products"} onClick={() => setCatalogTab("products")} className={`rounded-full px-2.5 py-1 text-[.55rem] font-bold ${catalogTab === "products" ? "bg-coral-soft text-coral-dark" : "bg-[#f6f5f2] text-muted"}`}>Products</button>
              <button type="button" aria-pressed={catalogTab === "services"} onClick={() => setCatalogTab("services")} className={`rounded-full px-2.5 py-1 text-[.55rem] font-bold ${catalogTab === "services" ? "bg-coral-soft text-coral-dark" : "bg-[#f6f5f2] text-muted"}`}>Services</button>
            </div>
            {catalogTab === "products" && <div className="grid gap-2.5 sm:grid-cols-3">
            {products.slice(0, 3).map((product, index) => <article key={product.id} className="overflow-hidden rounded-lg border border-[#eeece7] bg-white">
              <div className="aspect-[1.6/1] overflow-hidden bg-[#d7a66a]">{product.imageUrl ? <img src={resolveAssetUrl(product.imageUrl)} alt={product.name} className="size-full object-cover" /> : <ProductArtwork category={business?.category ?? "restaurant"} variant={index} />}</div>
              <div className="p-2"><p className="truncate text-[.62rem] font-bold">{product.name}</p><p className="mt-0.5 text-[.55rem] text-muted">{money(product.price, product.currency)}</p><button type="button" className="mt-2 min-h-7 w-full rounded-md bg-coral px-2 text-[.58rem] font-bold text-white transition hover:bg-coral-dark" onClick={() => setCart((current) => ({ ...current, [product.id]: (current[product.id] ?? 0) + 1 }))}>Add to Cart</button></div>
            </article>)}
            </div>}
            {catalogTab === "services" && <div className="grid gap-2.5 sm:grid-cols-2">
              {services.map((service) => <article key={service.name} className="flex items-center justify-between gap-3 rounded-lg border border-[#eeece7] bg-white p-3">
                <div className="min-w-0"><p className="truncate text-[.62rem] font-bold">{service.name}</p><p className="mt-1 line-clamp-2 text-[.55rem] leading-relaxed text-muted">{service.description || "Ask the business for more details."}</p></div>
                <div className="shrink-0 text-right"><p className="text-[.58rem] font-bold">{service.startingPrice ? `From ${money(service.startingPrice, service.currency)}` : "Ask for price"}</p><a href={requestLink} className="mt-1 inline-block text-[.55rem] font-bold text-coral-dark">Request a quote</a></div>
              </article>)}
              {business?.services.length === 0 && <p className="col-span-full rounded-lg bg-[#f8f7f4] p-3 text-[.58rem] text-muted">This business hasn’t published services yet.</p>}
            </div>}
            {slug && <a href={`/b/${slug}`} className="mt-2.5 inline-flex items-center gap-1 text-[.55rem] font-bold text-muted hover:text-coral-dark">View full business page <ArrowRight size={10} /></a>}
          </div>}
          {tab === "request" && <form className="mx-auto max-w-md space-y-3" onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}>
            <h4 className="font-display text-sm font-bold">Request a quote <span className="ml-2 text-[.6rem] font-normal text-muted">Interactive preview</span></h4>
            <label className="block text-xs font-semibold" htmlFor="demo-name">Your name<input id="demo-name" className="field mt-1.5 min-h-9 text-xs" placeholder="e.g. Alex" required onChange={() => setSubmitted(false)} /></label>
            <label className="block text-xs font-semibold" htmlFor="demo-need">What do you need?<textarea id="demo-need" className="field mt-1.5 min-h-16 resize-y text-xs" placeholder="Tell the business what you need" required onChange={() => setSubmitted(false)} /></label>
            {submitted && <p role="status" className="rounded-lg bg-success-soft p-2 text-xs font-semibold text-success">Demo complete — no real request was submitted.</p>}
            <Button type="submit" className="min-h-8 w-full text-xs" icon={submitted ? <Check size={13} /> : <Send size={13} />}>{submitted ? "Request flow previewed" : "Preview request flow"}</Button>
          </form>}
          {tab === "quote" && <div className="mx-auto max-w-md rounded-lg border border-line bg-white p-3">
            <div className="flex items-start justify-between gap-2 border-b border-line pb-2"><div><p className="text-[.55rem] font-bold uppercase tracking-wider text-coral-dark">Demonstration quote</p><h4 className="mt-1 font-display text-xs font-bold">{business?.name ?? "Kivu Crafted Studio"}</h4></div><span className={`rounded-full px-2 py-1 text-[.53rem] font-bold ${accepted ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>{accepted ? "Accepted · demo" : "Ready to review"}</span></div>
            <div className="mt-2 space-y-2">{sampleItems.map((item) => <div key={item.name} className="flex justify-between gap-2 border-b border-line pb-2 text-[.65rem]"><div><p className="font-semibold">{item.name}</p><p className="mt-1 text-[.55rem] text-muted">{item.detail} · {item.quantity} × {money(item.price)}</p></div><strong className="shrink-0">{money(item.quantity * item.price)}</strong></div>)}</div>
            <div className="mt-2 flex items-center justify-between text-xs font-bold"><span>Total</span><span>{money(sampleItems.reduce((sum, item) => sum + item.quantity * item.price, 0))}</span></div>
            <p className="mt-2 text-[.55rem] text-muted">Example only. Accepting creates no real quote or payment.</p>
            <Button type="button" variant={accepted ? "secondary" : "primary"} className="mt-2 min-h-8 w-full text-xs" onClick={() => setAccepted(!accepted)} icon={accepted ? <Check size={12} /> : <FileCheck2 size={12} />}>{accepted ? "Reset quote demo" : "Accept quote · demo"}</Button>
          </div>}
          {tab === "contact" && <div className="mx-auto max-w-md space-y-2.5">
            <h4 className="font-display text-sm font-bold">Choose how to connect</h4>
            <p className="mb-3 text-xs text-muted">Available contact options for this business.</p>
            {phone && <a className="flex items-center gap-2.5 rounded-lg border border-line p-3 text-xs font-semibold transition hover:border-coral/50" href={`tel:${phone}`}><Phone size={15} className="text-coral" />Call the business <span className="ml-auto text-muted">{phone}</span></a>}
            {whatsapp && <a className="flex items-center gap-2.5 rounded-lg border border-line p-3 text-xs font-semibold transition hover:border-coral/50" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer"><MessageCircle size={15} className="text-success" />Continue on WhatsApp <ArrowRight size={13} className="ml-auto text-muted" /></a>}
            {!phone && !whatsapp && <p className="rounded-lg border border-dashed border-line p-3 text-xs text-muted">This business has not added contact details to the demo page.</p>}
            <a className="flex items-center justify-between rounded-lg bg-ink px-3 py-2.5 text-xs font-bold text-white" href={requestLink}>Send a structured request <ArrowRight size={13} /></a>
          </div>}
        </div>
      </div>
      {tab === "products" && catalogTab === "products" && <aside className="rounded-xl border border-line bg-white p-3.5 shadow-sm">
        <div className="flex items-center justify-between border-b border-line pb-2.5"><h4 className="text-xs font-bold">Your Cart <Heart size={12} className="inline text-coral" /></h4><span className="text-[.55rem] text-muted">{Object.values(cart).reduce((sum, quantity) => sum + quantity, 0)} items</span></div>
        <div className="min-h-14 space-y-2 py-2.5">
          {products.filter((product) => cart[product.id]).map((product) => <div key={product.id} className="flex items-center justify-between gap-2 text-[.58rem]"><span className="min-w-0 truncate font-semibold">{product.name} × {cart[product.id]}</span><span className="shrink-0 text-muted">{money(product.price * cart[product.id], product.currency)}</span></div>)}
          {!Object.values(cart).some(Boolean) && <p className="py-3 text-center text-[.6rem] text-muted">Add a product to see your order here.</p>}
        </div>
        <div className="flex items-center justify-between border-t border-line pt-2.5 text-[.62rem] font-bold"><span>Total</span><span>{money(cartTotal)}</span></div>
        <a href={requestLink} className="mt-2.5 flex min-h-7 items-center justify-center rounded-md bg-coral px-3 text-[.58rem] font-bold text-white transition hover:bg-coral-dark">Place Order</a>
        <p className="mt-2 text-center text-[.52rem] text-muted">Example cart · no order is placed</p>
      </aside>}
      {tab === "products" && catalogTab === "services" && <aside className="rounded-xl border border-line bg-white p-3.5 shadow-sm"><span className="grid size-8 place-items-center rounded-lg bg-coral-soft text-coral"><ClipboardList size={15} /></span><h4 className="mt-2 text-xs font-bold">Need something tailored?</h4><p className="mt-1 text-[.58rem] leading-relaxed text-muted">Send the business a few details to get a response about your project.</p><a href={requestLink} className="mt-3 flex min-h-7 items-center justify-center rounded-md bg-coral px-3 text-[.58rem] font-bold text-white">Request a Quote</a></aside>}
    </div>
  </div>;
}

