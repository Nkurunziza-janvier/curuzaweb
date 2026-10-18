import { ArrowLeft, FileText, MessageCircle, Phone, ShoppingBag } from "lucide-react";
import { useParams } from "react-router";
import { analyticsService, resolveAssetUrl } from "../services/api";
import { usePublicBusiness } from "../hooks/apiHooks";
import BrandLoader from "../components/BrandLoader";
import { Brand, ButtonLink, Card, Heading } from "../components/ui";
import { LanguageSwitcher, useLanguage } from "../i18n";

interface BusinessActionData {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  whatsapp: string | null;
  products: Array<{ id: string; name: string; description: string; price: number | string; currency: string; imageUrl: string | null }>;
}

const fallbackImage = "https://images.unsplash.com/photo-1665333048952-a3ee97714c6b?auto=format&fit=crop&w=900&q=80";

export default function ActionPage() {
  const { t } = useLanguage();
  const { businessSlug, action } = useParams();
  const { data: business, isLoading, isError, error } = usePublicBusiness<BusinessActionData>(businessSlug);
  if (isLoading) return <BrandLoader title={t("Loading business details")} detail={t("Getting the information you need.")} />;
  if (!business) return <main className="relative grid min-h-screen place-items-center bg-cream p-5"><div className="absolute right-5 top-5"><LanguageSwitcher compact /></div><Card className="p-8"><Heading as="h1">{t("Business not found")}</Heading><p className="mt-3 text-muted">{t("This page is unavailable.")}</p></Card></main>;

  const contact = action === "contact";
  const title = contact ? `${t("Contact")} ${business.name}` : action === "book" ? `${t("Request from")} ${business.name}` : t("Browse products");
  const whatsapp = business.whatsapp?.replace(/\D/g, "");
  const onOrder = () => { if (businessSlug) void analyticsService.track(businessSlug, "ORDER_CLICK").catch((reason: unknown) => console.error("Could not record customer action", reason)); };
  return <div className="min-h-screen bg-cream"><header className="border-b border-line bg-white"><div className="shell flex h-16 items-center justify-between"><Brand /><LanguageSwitcher compact /><ButtonLink to={`/b/${business.slug}`} variant="ghost"><ArrowLeft size={16} />{t("Back")}</ButtonLink></div></header><main className="shell max-w-4xl py-12"><Heading as="h1">{title}</Heading><p className="mt-3 text-muted">{contact ? t("Choose the fastest way to reach the team.") : t("Explore the catalog or tell the business what you need.")}</p>
    {contact ? <div className="mt-8 grid gap-4 sm:grid-cols-2">{whatsapp && <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" onClick={() => businessSlug && void analyticsService.track(businessSlug, "WHATSAPP_CLICK").catch((reason: unknown) => console.error("Could not record customer action", reason))} className="flex h-32 flex-col items-start rounded-2xl border border-line bg-white p-6"><MessageCircle size={23} className="text-coral" /><span className="mt-3 font-display text-lg">WhatsApp</span><span className="text-sm text-muted">{t("Message the business directly")}</span></a>}{business.phone && <a href={`tel:${business.phone}`} onClick={() => businessSlug && void analyticsService.track(businessSlug, "PHONE_CLICK").catch((reason: unknown) => console.error("Could not record customer action", reason))} className="flex h-32 flex-col items-start rounded-2xl border border-line bg-white p-6"><Phone size={23} className="text-coral" /><span className="mt-3 font-display text-lg">{t("Call")}</span><span className="text-sm text-muted">{t("Call the business team")}</span></a>}</div> : action === "quote" || action === "book" || action === "question" ? <Card className="mt-8 flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center"><span className="icon-tile"><FileText size={23} /></span><div className="flex-1"><h2 className="font-display text-lg font-bold">{t("Start a request")}</h2><p className="mt-1 text-sm text-muted">{t("Answer a few questions so")} {business.name} {t("can respond with the right details.")}</p></div><ButtonLink to={`/b/${business.slug}/request`}>{t("Continue")}</ButtonLink></Card> : <div className="mt-8 grid gap-5 md:grid-cols-3">{business.products.map((product) => <Card key={product.id} className="overflow-hidden"><img src={resolveAssetUrl(product.imageUrl) ?? fallbackImage} alt={product.name} className="h-40 w-full object-cover" /><div className="p-4"><p className="font-bold">{product.name}</p><p className="mt-2 text-sm text-muted">{product.description}</p><p className="mt-3 font-semibold">{product.currency} {Number(product.price).toLocaleString()}</p><ButtonLink to={`/b/${business.slug}/request`} onClick={onOrder} className="mt-4 w-full" variant="secondary" icon={<ShoppingBag size={16} />}>{t("Ask about this item")}</ButtonLink></div></Card>)}</div>}
  </main></div>;
}
