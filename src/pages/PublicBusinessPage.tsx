import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import { analyticsService, businessService } from "../services/api";
import { usePublicBusiness } from "../hooks/apiHooks";
import { ButtonLink, Card, Heading } from "../components/ui";
import BrandLoader from "../components/BrandLoader";
import BusinessStorefront from "./BusinessStorefront";
import { LanguageSwitcher, useLanguage } from "../i18n";

export interface PublicProduct { id: string; name: string; description: string; price: number | string; currency: string; imageUrl: string | null; category: string; }
export interface PublicService { id: string; name: string; description: string; startingPrice: number | string; currency: string; duration: string | null; imageUrl: string | null; }
export interface PublicOffer { id: string; title: string; description: string; discountType: "PERCENTAGE" | "FIXED"; discountValue: number | string; startsAt: string; endsAt: string; }
export interface PublicReview { id: string; customerName: string; rating: number; comment: string; createdAt: string; }
export interface PublicBusiness {
  id: string; slug: string; name: string; tagline: string; description: string; category: string; highlights: string[];
  logoUrl: string | null; coverImageUrl: string | null; phone: string | null; whatsapp: string | null; email: string | null;
  address: string | null; city: string | null; country: string; latitude: number | null; longitude: number | null;
  openingHours: { display?: string } | null; rating: number; reviewCount: number; stats: { pageViews: number; customerRequests: number };
  products: PublicProduct[]; services: PublicService[]; offers: PublicOffer[]; reviews: PublicReview[];
}

export default function PublicBusinessPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { businessSlug } = useParams();
  const { data: business, isLoading, isError, error } = usePublicBusiness<PublicBusiness>(businessSlug);
  const [minimumLoadingSlug, setMinimumLoadingSlug] = useState<string>();
  useEffect(() => {
    const timer = window.setTimeout(() => setMinimumLoadingSlug(businessSlug), 1800);
    return () => window.clearTimeout(timer);
  }, [businessSlug]);
  const { data: brand } = useQuery<{ name: string }>({
    queryKey: ["public-business-brand", businessSlug],
    queryFn: () => businessService.getPublicBusinessBrand<{ name: string }>(businessSlug!),
    enabled: Boolean(businessSlug),
    staleTime: 5 * 60_000,
  });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [copied, setCopied] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});

  const products = business?.products ?? [];
  const categories = useMemo(() => ["All", ...new Set(products.map((product) => product.category).filter(Boolean))], [products]);
  const visibleProducts = useMemo(() => products.filter((product) => (category === "All" || product.category === category) && (!search || `${product.name} ${product.description} ${product.category}`.toLowerCase().includes(search.toLowerCase()))), [products, category, search]);
  const visibleServices = useMemo(() => (business?.services ?? []).filter((service) => !search || `${service.name} ${service.description}`.toLowerCase().includes(search.toLowerCase())), [business?.services, search]);
  const cartItems = products.filter((product) => cart[product.id]).map((product) => ({ ...product, quantity: cart[product.id] }));
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cartItems.reduce((total, item) => total + Number(item.price) * item.quantity, 0);
  const changeCartQuantity = (id: string, amount: number) => setCart((current) => ({ ...current, [id]: Math.max(0, (current[id] ?? 0) + amount) }));

  if (isLoading || minimumLoadingSlug !== businessSlug) {
    const businessName = business?.name ?? brand?.name;
    const readableSlug = businessSlug?.split("-").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
    return <BrandLoader brandName={businessName ?? readableSlug ?? "Business"} />;
  }
  if (isError || !business) return <main className="relative grid min-h-screen place-items-center bg-[#fafaf6] p-5"><div className="absolute right-5 top-5"><LanguageSwitcher compact/></div><Card className="max-w-lg p-8 text-center"><Heading as="h1">{t("Business page unavailable")}</Heading><p className="mt-3 text-muted">{t("This business page is not available.")}</p><ButtonLink to="/" className="mt-6">{t("Back to e-businessRw")}</ButtonLink></Card></main>;

  const track = (eventType: string, metadata?: Record<string, unknown>) => { if (businessSlug) void analyticsService.track(businessSlug, eventType, metadata).catch((reason: unknown) => console.error("Could not record customer action", reason)); };
  const addToCart = (product: PublicProduct) => {
    setCart((current) => ({ ...current, [product.id]: (current[product.id] ?? 0) + 1 }));
    track("ORDER_CLICK", { action: "cart_add", productId: product.id, productName: product.name });
  };
  const sendOrderRequest = () => {
    if (!cartItems.length) return;
    navigate(`/b/${business.slug}/request`, { state: { orderItems: cartItems.map(({ id, name, quantity, price, currency }) => ({ id, name, quantity, unitPrice: Number(price), currency })) } });
    setCartOpen(false);
  };
  const phoneLink = business.phone ? `tel:${business.phone}` : undefined;
  const whatsappDigits = business.whatsapp?.replace(/\D/g, "");
  const whatsappLink = whatsappDigits ? `https://wa.me/${whatsappDigits}` : undefined;
  const hasCoordinates = business.latitude !== null && business.longitude !== null;
  const locationText = [business.address, business.city, business.country].filter(Boolean).join(", ");
  const mapQuery = hasCoordinates ? `${business.latitude},${business.longitude}` : encodeURIComponent(locationText);
  const directionsLink = hasCoordinates || locationText ? `https://www.google.com/maps/search/?api=1&query=${mapQuery}` : undefined;
  const openingHours = business.openingHours?.display?.trim();
  const shareUrl = window.location.href;
  const sharePage = async () => {
    if (navigator.share) { try { await navigator.share({ title: business.name, text: business.tagline || business.description, url: shareUrl }); } catch { /* User dismissed the share sheet. */ } return; }
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { setCopied(false); }
  };

  return <BusinessStorefront
    business={business}
    products={products}
    visibleProducts={visibleProducts}
    visibleServices={visibleServices}
    categories={categories}
    search={search}
    setSearch={setSearch}
    category={category}
    setCategory={setCategory}
    cartItems={cartItems}
    cartCount={cartCount}
    cartTotal={cartTotal}
    cartOpen={cartOpen}
    setCartOpen={setCartOpen}
    copied={copied}
    shareUrl={shareUrl}
    sharePage={sharePage}
    addToCart={addToCart}
    changeCartQuantity={changeCartQuantity}
    sendOrderRequest={sendOrderRequest}
    track={track}
    phoneLink={phoneLink}
    whatsappLink={whatsappLink}
    directionsLink={directionsLink}
    openingHours={openingHours}
  />;
}
