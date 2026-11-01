import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CheckCircle2, Image as ImageIcon, MapPin, ShieldCheck, ShoppingBag, Store, Truck } from "lucide-react";
import { orderService, resolveAssetUrl } from "../services/api";
import { usePublicBusiness } from "../hooks/apiHooks";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { Button, Card, Heading, Input, Label, Textarea } from "../components/ui";
import BrandLoader from "../components/BrandLoader";
import { LanguageSwitcher, useLanguage } from "../i18n";
import type { PublicBusiness } from "./PublicBusinessPage";
import type { FulfillmentType, PublicOrder } from "../types/order";

export interface CheckoutItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  imageUrl?: string | null;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const money = (amount: number | string, currency = "RWF") => `${currency} ${Number(amount).toLocaleString()}`;

export default function OrderPage() {
  const { t } = useLanguage();
  const { businessSlug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: business, isLoading, isError } = usePublicBusiness<PublicBusiness>(businessSlug);
  const [items, setItems] = useState<CheckoutItem[]>(() => {
    const stateItems = (location.state as { items?: CheckoutItem[] } | null)?.items;
    if (stateItems?.length) return stateItems;
    try {
      const stored = window.sessionStorage.getItem(`ebiz_order_cart_${businessSlug ?? ""}`);
      return stored ? JSON.parse(stored) as CheckoutItem[] : [];
    } catch {
      return [];
    }
  });
  const [form, setForm] = useState({ customerName: "", customerPhone: "", customerEmail: "", customerNote: "", fulfillment: "PICKUP" as FulfillmentType, deliveryAddress: "" });

  useEffect(() => {
    if (items.length) window.sessionStorage.setItem(`ebiz_order_cart_${businessSlug ?? ""}`, JSON.stringify(items));
  }, [items, businessSlug]);

  const total = useMemo(() => items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0), [items]);
  const currency = items[0]?.currency ?? "RWF";
  const phoneInvalid = Boolean(form.customerPhone.trim() && form.customerPhone.replace(/\D/g, "").length < 7);
  const emailInvalid = Boolean(form.customerEmail.trim() && !emailPattern.test(form.customerEmail.trim()));
  const hasContact = Boolean(form.customerPhone.trim() || form.customerEmail.trim());
  const needsAddress = form.fulfillment === "DELIVERY" && !form.deliveryAddress.trim();
  const canSubmit = items.length > 0 && form.customerName.trim().length >= 2 && hasContact && !phoneInvalid && !emailInvalid && !needsAddress;
  useDocumentMeta({ title: business ? `Checkout · ${business.name}` : "Checkout", description: business ? `Place an order with ${business.name} on e-businessRw.` : undefined, image: business?.coverImageUrl });

  const createMutation = useMutation({
    mutationFn: () => orderService.create<PublicOrder>(businessSlug!, {
      items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.trim(),
      customerEmail: form.customerEmail.trim(),
      customerNote: form.customerNote.trim(),
      fulfillment: form.fulfillment,
      deliveryAddress: form.fulfillment === "DELIVERY" ? form.deliveryAddress.trim() : "",
    }),
    onSuccess: (order) => {
      window.sessionStorage.removeItem(`ebiz_order_cart_${businessSlug ?? ""}`);
      navigate(`/orders/${order.publicToken}`, { replace: true });
    },
  });

  const updateQuantity = (id: string, amount: number) => setItems((current) => current.map((item) => item.productId === id ? { ...item, quantity: Math.max(0, item.quantity + amount) } : item).filter((item) => item.quantity > 0));

  if (isLoading) return <BrandLoader />;
  if (isError || !business) return <main className="grid min-h-screen place-items-center bg-[#f3f8f5] p-5"><div className="absolute right-5 top-5"><LanguageSwitcher compact /></div><Card className="max-w-lg p-8 text-center"><Heading as="h1">{t("Checkout is unavailable")}</Heading><p className="mt-3 text-muted">{t("This business page could not be loaded.")}</p><Link to="/" className="mt-6 inline-flex font-bold text-[#087553]">{t("Back to e-businessRw")}</Link></Card></main>;

  return <div className="min-h-screen bg-[#f3f8f5] text-[#143d38]">
    <header className="border-b border-[#dce9e4] bg-white/90 backdrop-blur-xl"><div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6"><Link to={`/b/${business.slug}`} className="inline-flex min-w-0 items-center gap-2 text-sm font-bold text-[#2b5b53] hover:text-[#087553]"><ArrowLeft size={16} /><span className="truncate">{business.name}</span></Link><LanguageSwitcher compact /></div></header>
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#4a8b78]">{t("Secure checkout")}</p><Heading as="h1" className="mt-1">{t("Complete your order")}</Heading><p className="mt-2 text-sm leading-6 text-muted">{t("No account is needed. The business will confirm availability and contact you using the details below.")}</p></div>

      {!items.length ? <Card className="mt-7 p-8 text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#edf6f2] text-[#087553]"><ShoppingBag size={24} /></span><h2 className="mt-4 font-display text-xl font-bold">{t("Your order is empty")}</h2><p className="mt-2 text-sm text-muted">{t("Add products from the business page before checking out.")}</p><Link to={`/b/${business.slug}`} className="btn btn-primary mt-6">{t("Browse products")}</Link></Card> : <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-[#eaf7f1] text-[#087553]"><ShoppingBag size={18} /></span><div><h2 className="font-display text-lg font-bold">{t("Your items")}</h2><p className="text-xs text-muted">{items.reduce((sum, item) => sum + item.quantity, 0)} {t("items")}</p></div></div>
            <div className="mt-5 space-y-4">{items.map((item) => <div key={item.productId} className="flex gap-3 border-b border-[#eef3f0] pb-4 last:border-0 last:pb-0">
              <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-[#eef4ef]">{item.imageUrl ? <img src={resolveAssetUrl(item.imageUrl)} alt="" className="size-full object-cover" /> : <span className="grid size-full place-items-center text-[#7fa396]"><ImageIcon size={20} /></span>}</div>
              <div className="min-w-0 flex-1"><p className="text-sm font-bold">{item.name}</p><p className="mt-1 text-xs text-muted">{money(item.unitPrice, item.currency)}</p><div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-[#dce9e4]"><button type="button" onClick={() => updateQuantity(item.productId, -1)} className="grid size-8 place-items-center text-[#456b63] hover:bg-[#f1f8f4]" aria-label={`${t("Remove one")} ${item.name}`}>−</button><span className="min-w-6 text-center text-xs font-bold">{item.quantity}</span><button type="button" onClick={() => updateQuantity(item.productId, 1)} className="grid size-8 place-items-center text-[#456b63] hover:bg-[#f1f8f4]" aria-label={`${t("Add another")} ${item.name}`}>+</button></div></div>
              <p className="shrink-0 text-sm font-bold">{money(item.unitPrice * item.quantity, item.currency)}</p>
            </div>)}</div>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold">{t("How should we fulfil it?")}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setForm({ ...form, fulfillment: "PICKUP" })} className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${form.fulfillment === "PICKUP" ? "border-[#087553] bg-[#f0faf5] ring-1 ring-[#087553]" : "border-[#e0ece7] bg-white hover:border-[#9bcebb]"}`}><Store size={19} className="mt-0.5 text-[#0b8661]" /><span><strong className="block text-sm">{t("Pick up")}</strong><span className="mt-0.5 block text-[11px] leading-4 text-[#6c817b]">{t("Collect from the business location.")}</span></span></button>
              <button type="button" onClick={() => setForm({ ...form, fulfillment: "DELIVERY" })} className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${form.fulfillment === "DELIVERY" ? "border-[#087553] bg-[#f0faf5] ring-1 ring-[#087553]" : "border-[#e0ece7] bg-white hover:border-[#9bcebb]"}`}><Truck size={19} className="mt-0.5 text-[#0b8661]" /><span><strong className="block text-sm">{t("Delivery")}</strong><span className="mt-0.5 block text-[11px] leading-4 text-[#6c817b]">{t("The business will confirm the delivery fee.")}</span></span></button>
            </div>
            {form.fulfillment === "DELIVERY" && <div className="mt-4"><Label htmlFor="delivery-address">{t("Delivery address")}</Label><Input id="delivery-address" value={form.deliveryAddress} onChange={(event) => setForm({ ...form, deliveryAddress: event.target.value })} maxLength={300} placeholder={t("Street, sector, district, landmark")} /></div>}
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold">{t("Your details")}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label htmlFor="order-name">{t("Your name")} <span className="text-[#0b9367]">*</span></Label><Input id="order-name" value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} autoComplete="name" maxLength={120} placeholder={t("e.g. Aline Uwimana")} /></div>
              <div><Label htmlFor="order-phone">{t("Phone or WhatsApp")}</Label><Input id="order-phone" value={form.customerPhone} onChange={(event) => setForm({ ...form, customerPhone: event.target.value })} autoComplete="tel" inputMode="tel" maxLength={40} aria-invalid={phoneInvalid} placeholder="+250 78..." className={phoneInvalid ? "border-[#d9826b]" : ""} />{phoneInvalid && <p className="mt-1 text-[11px] font-medium text-[#a34932]">{t("Enter a valid phone number.")}</p>}</div>
              <div><Label htmlFor="order-email">{t("Email")}</Label><Input id="order-email" type="email" value={form.customerEmail} onChange={(event) => setForm({ ...form, customerEmail: event.target.value })} autoComplete="email" maxLength={180} aria-invalid={emailInvalid} placeholder={t("you@example.com")} className={emailInvalid ? "border-[#d9826b]" : ""} />{emailInvalid && <p className="mt-1 text-[11px] font-medium text-[#a34932]">{t("Enter a valid email address.")}</p>}</div>
              <div className="sm:col-span-2"><Label htmlFor="order-note">{t("Order note")} <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{t("optional")}</span></Label><Textarea id="order-note" value={form.customerNote} onChange={(event) => setForm({ ...form, customerNote: event.target.value })} maxLength={2000} className="min-h-24" placeholder={t("Preferences, substitutions, or a question about your order.")} /></div>
            </div>
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#f2faf6] px-3 py-2.5 text-[11px] leading-5 text-[#54716a]"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-[#0b8661]" />{t("Provide a phone number or email so the business can reach you. No account is required.")}</p>
            {createMutation.isError && <p className="mt-4 rounded-xl bg-[#fff3ef] p-3 text-sm text-[#9a3d2c]">{createMutation.error.message}</p>}
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card className="p-5">
            <h2 className="font-display text-lg font-bold">{t("Order summary")}</h2>
            <div className="mt-4 space-y-3 text-sm"><div className="flex justify-between text-muted"><span>{t("Subtotal")}</span><span>{money(total, currency)}</span></div><div className="flex justify-between text-muted"><span>{t("Fulfilment")}</span><span>{form.fulfillment === "DELIVERY" ? t("Delivery") : t("Pickup")}</span></div><div className="flex justify-between border-t border-[#e6efea] pt-3 font-display text-xl font-bold"><span>{t("Total")}</span><span>{money(total, currency)}</span></div></div>
            <p className="mt-3 text-[11px] leading-5 text-[#6b817a]">{t("The final total may change if the business confirms different availability or a delivery fee. Payment is arranged after the order is confirmed.")}</p>
            <Button className="mt-5 w-full" loading={createMutation.isPending} disabled={!canSubmit || createMutation.isPending} onClick={() => createMutation.mutate()}>{t("Place order")}<ArrowRight size={16} /></Button>
            {!canSubmit && <p className="mt-2 text-center text-[11px] text-[#6b817a]">{t("Add your name and a phone number or email to continue.")}</p>}
          </Card>
          <div className="rounded-2xl border border-[#dbeae4] bg-white p-4 text-xs leading-5 text-[#54716a]"><p className="flex items-center gap-2 font-bold text-[#234f49]"><MapPin size={15} className="text-[#0b8661]" />{business.name}</p>{[business.address, business.city].filter(Boolean).length > 0 && <p className="mt-2">{[business.address, business.city].filter(Boolean).join(", ")}</p>}<p className="mt-2 flex items-start gap-2"><CheckCircle2 size={13} className="mt-0.5 shrink-0 text-[#0b8661]" />{t("You will receive a private order tracking link.")}</p></div>
        </aside>
      </div>}
    </main>
  </div>;
}
