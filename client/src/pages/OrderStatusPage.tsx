import { useState } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, CheckCircle2, Clock3, Copy, CreditCard, Image as ImageIcon, MapPin, MessageCircle, Phone, ShoppingBag, Store, Truck, XCircle } from "lucide-react";
import { orderService, resolveAssetUrl } from "../services/api";
import { usePublicOrder } from "../hooks/apiHooks";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { Button, Card, Heading, Input, Label } from "../components/ui";
import BrandLoader from "../components/BrandLoader";
import { LanguageSwitcher, useLanguage } from "../i18n";
import type { OrderPayment, OrderStatus, PublicOrder } from "../types/order";

const statusTone: Record<OrderStatus, string> = {
  PENDING: "bg-[#fff7e7] text-[#8a5a12] border-[#f3dcae]",
  CONFIRMED: "bg-[#eaf8f1] text-[#076146] border-[#c1e7d7]",
  PROCESSING: "bg-[#eef4ff] text-[#31538c] border-[#cad9f4]",
  READY: "bg-[#eaf8f1] text-[#076146] border-[#c1e7d7]",
  COMPLETED: "bg-[#f2f3f5] text-[#59636c] border-[#dfe3e8]",
  CANCELLED: "bg-[#fff0ec] text-[#963f2c] border-[#f0cabe]",
};

const statusLabel: Record<OrderStatus, string> = {
  PENDING: "Awaiting confirmation",
  CONFIRMED: "Confirmed",
  PROCESSING: "Being prepared",
  READY: "Ready",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const paymentLabel = { UNPAID: "Payment due", PENDING: "Payment pending", PAID: "Paid", REFUNDED: "Refunded" } as const;
const money = (amount: number | string, currency = "RWF") => `${currency} ${Number(amount).toLocaleString()}`;

interface PaymentInitResult {
  payment: OrderPayment;
  demoMode: boolean;
  recipient: { name: string; number: string };
}

export default function OrderStatusPage() {
  const { t, locale } = useLanguage();
  const { publicToken } = useParams();
  const queryClient = useQueryClient();
  const { data: order, isLoading, isError, error } = usePublicOrder<PublicOrder>(publicToken);
  const [copied, setCopied] = useState(false);
  const [payerPhone, setPayerPhone] = useState("");
  const [payment, setPayment] = useState<PaymentInitResult | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  useDocumentMeta({ title: order ? `Order ${order.orderNumber} · ${order.business.name}` : "Order tracking", description: order ? `Track order ${order.orderNumber} with ${order.business.name}.` : undefined });

  const initiateMutation = useMutation({
    mutationFn: () => orderService.initiatePayment<PaymentInitResult>(publicToken!, { provider: "MOBILE_MONEY", payerPhone: payerPhone.trim() }),
    onSuccess: (result) => setPayment(result),
  });
  const confirmMutation = useMutation({
    mutationFn: (reference: string) => orderService.confirmPayment<PublicOrder>(reference),
    onSuccess: (updated) => {
      queryClient.setQueryData(["public-order", publicToken], updated);
      setPayment(null);
    },
  });
  const cancelMutation = useMutation({
    mutationFn: () => orderService.cancelPublic<PublicOrder>(publicToken!),
    onSuccess: (updated) => {
      queryClient.setQueryData(["public-order", publicToken], updated);
      setShowCancel(false);
    },
  });

  if (isLoading) return <BrandLoader />;
  if (isError || !order) return <main className="grid min-h-screen place-items-center bg-[#f3f8f5] p-5"><div className="absolute right-5 top-5"><LanguageSwitcher compact /></div><Card className="max-w-lg p-8 text-center"><span className="mx-auto grid size-14 place-items-center rounded-full bg-[#fff0ec] text-[#b04a33]"><XCircle size={25} /></span><Heading as="h1" className="mt-4">{t("Order link unavailable")}</Heading><p className="mt-3 text-sm text-muted">{error?.message ?? t("This private link is invalid or the order no longer exists.")}</p><Link to="/" className="btn btn-secondary mt-6">{t("Back to e-businessRw")}</Link></Card></main>;

  const whatsappDigits = order.business.whatsapp?.replace(/\D/g, "");
  const trackingUrl = window.location.href;
  const itemSummary = order.items.map((item) => `${item.name} × ${item.quantity}`).join(", ");
  const whatsappMessage = `Hello ${order.business.name}, I would like to follow up on order ${order.orderNumber} (${itemSummary}; total ${money(order.total, order.currency)}). My name is ${order.customerName}.`;
  const whatsappLink = whatsappDigits ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(whatsappMessage)}` : undefined;
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(trackingUrl); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { setCopied(false); }
  };
  const pendingPayment = order.payments.find((entry) => entry.status === "PENDING");
  const paid = order.paymentStatus === "PAID";
  const canPay = !paid && order.status !== "CANCELLED" && order.paymentStatus !== "REFUNDED";

  return <div className="min-h-screen bg-[#f3f8f5] pb-12 text-[#143d38]">
    <header className="border-b border-[#dce9e4] bg-white/90 backdrop-blur-xl"><div className="mx-auto flex min-h-16 max-w-4xl items-center justify-between gap-3 px-4 sm:px-6"><Link to={`/b/${order.business.slug}`} className="inline-flex min-w-0 items-center gap-2 text-sm font-bold text-[#2b5b53] hover:text-[#087553]"><ArrowLeft size={16} /><span className="truncate">{order.business.name}</span></Link><LanguageSwitcher compact /></div></header>

    <main className="mx-auto max-w-4xl px-4 py-7 sm:px-6 sm:py-10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#4a8b78]">{t("Private order")} · {order.orderNumber}</p><Heading as="h1" className="mt-1">{t("Your order")}</Heading></div><div className="flex flex-wrap gap-2"><span className={`rounded-full border px-3 py-1.5 text-[11px] font-extrabold ${statusTone[order.status]}`}>{t(statusLabel[order.status])}</span><span className={`rounded-full border px-3 py-1.5 text-[11px] font-extrabold ${paid ? "border-[#c1e7d7] bg-[#eaf8f1] text-[#076146]" : "border-[#f3dcae] bg-[#fff7e7] text-[#8a5a12]"}`}>{t(paymentLabel[order.paymentStatus])}</span></div></div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#eaf7f1] text-[#087553]"><ShoppingBag size={21} /></span><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#6b8d82]">{t("Order items")}</p><p className="mt-1 text-sm font-bold">{order.items.reduce((sum, item) => sum + item.quantity, 0)} {t("items")}</p></div></div><p className="font-display text-lg font-bold">{money(order.total, order.currency)}</p></div>
            <div className="mt-4 space-y-3 border-t border-[#eef3f0] pt-4">{order.items.map((item) => <div key={item.id} className="flex items-center gap-3"><div className="size-12 shrink-0 overflow-hidden rounded-lg bg-[#eef4ef]">{item.imageUrl ? <img src={resolveAssetUrl(item.imageUrl)} alt="" className="size-full object-cover" /> : <span className="grid size-full place-items-center text-[#7fa396]"><ImageIcon size={17} /></span>}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.name}</p><p className="text-[11px] text-muted">{item.quantity} × {money(item.unitPrice, order.currency)}</p></div><p className="text-sm font-bold">{money(item.lineTotal, order.currency)}</p></div>)}</div>
            <div className="mt-4 flex items-center justify-between border-t border-[#eef3f0] pt-4 text-sm"><span className="text-muted">{t("Total")}</span><strong className="font-display text-xl">{money(order.total, order.currency)}</strong></div>
            <div className="mt-4 grid gap-3 border-t border-[#eef3f0] pt-4 text-xs text-[#4e6a63] sm:grid-cols-2"><p className="flex items-start gap-2">{order.fulfillment === "DELIVERY" ? <Truck size={14} className="mt-0.5 shrink-0 text-[#0b8661]" /> : <Store size={14} className="mt-0.5 shrink-0 text-[#0b8661]" />}<span><strong className="block text-[#234f49]">{order.fulfillment === "DELIVERY" ? t("Delivery") : t("Pickup")}</strong>{order.fulfillment === "DELIVERY" ? order.deliveryAddress : t("Collect from the business")}</span></p><p className="flex items-start gap-2"><Clock3 size={14} className="mt-0.5 shrink-0 text-[#0b8661]" /><span><strong className="block text-[#234f49]">{t("Placed")}</strong>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.createdAt))}</span></p></div>
            {order.customerNote && <div className="mt-4 rounded-xl bg-[#f7faf8] p-3 text-xs leading-5 text-[#58716d]"><strong className="text-[#315c56]">{t("Your note")}:</strong> {order.customerNote}</div>}
            {order.cancellationReason && <p className="mt-3 rounded-xl bg-[#f7f2ef] p-3 text-xs text-[#795138]">{order.cancellationReason}</p>}
          </Card>

          {canPay && <Card className="border-[#cfe5dc] p-5 sm:p-6">
            <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#eaf7f1] text-[#087553]"><CreditCard size={19} /></span><div><h2 className="font-display text-lg font-bold">{t("Payment")}</h2><p className="text-xs text-muted">{t("Pay the business directly using the reference below.")}</p></div></div>
            {paid ? <p className="mt-4 flex items-center gap-2 rounded-xl bg-[#eef9f3] p-3 text-sm font-semibold text-[#076146]"><CheckCircle2 size={16} />{t("Payment received. Thank you.")}</p> : pendingPayment ? <div className="mt-4 rounded-xl border border-[#e4efe9] bg-[#f9fcfb] p-4"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#6b8d82]">{t("Payment reference")}</p><p className="mt-1 font-display text-lg font-bold">{pendingPayment.reference}</p><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[#54716a]">{pendingPayment.instructions}</p>{(payment?.demoMode ?? order.demoMode) && <Button className="mt-3" loading={confirmMutation.isPending} disabled={confirmMutation.isPending} onClick={() => confirmMutation.mutate(pendingPayment.reference)}>{t("Confirm test payment")}</Button>}{confirmMutation.isError && <p className="mt-2 text-xs text-[#9a3d2c]">{confirmMutation.error.message}</p>}</div> : payment ? <div className="mt-4 rounded-xl border border-[#e4efe9] bg-[#f9fcfb] p-4"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#6b8d82]">{t("Payment reference")}</p><p className="mt-1 font-display text-lg font-bold">{payment.payment.reference}</p><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[#54716a]">{payment.payment.instructions}</p>{payment.demoMode && <Button className="mt-3" loading={confirmMutation.isPending} disabled={confirmMutation.isPending} onClick={() => confirmMutation.mutate(payment.payment.reference)}>{t("Confirm test payment")}</Button>}{confirmMutation.isError && <p className="mt-2 text-xs text-[#9a3d2c]">{confirmMutation.error.message}</p>}</div> : <div className="mt-4"><Label htmlFor="payer-phone">{t("Mobile money number")}</Label><Input id="payer-phone" value={payerPhone} onChange={(event) => setPayerPhone(event.target.value)} inputMode="tel" maxLength={30} placeholder="+250 78..." /><p className="mt-2 text-[11px] leading-5 text-[#6b817a]">{t("We will generate a payment reference. The business verifies the transfer before marking the order paid.")}</p>{initiateMutation.isError && <p className="mt-2 text-xs text-[#9a3d2c]">{initiateMutation.error.message}</p>}<Button className="mt-3" loading={initiateMutation.isPending} disabled={initiateMutation.isPending || payerPhone.replace(/\D/g, "").length < 7} onClick={() => initiateMutation.mutate()}>{t("Get payment reference")}</Button></div>}
          </Card>}

          {order.canCancel && <Card className="p-5 sm:p-6"><p className="text-sm font-bold">{t("Need to change your order?")}</p><p className="mt-1 text-xs leading-5 text-muted">{t("You can cancel online before the business starts preparing it. After that, contact them directly.")}</p>{showCancel ? <div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" onClick={() => setShowCancel(false)}>{t("Keep order")}</Button><Button loading={cancelMutation.isPending} disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate()} className="!bg-[#a24934] hover:!bg-[#8d3d2a]">{t("Confirm cancellation")}</Button></div> : <Button variant="secondary" className="mt-4" onClick={() => setShowCancel(true)}>{t("Cancel order")}</Button>}{cancelMutation.isError && <p className="mt-2 text-xs text-[#9a3d2c]">{cancelMutation.error.message}</p>}</Card>}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card className="p-5"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#6b8d82]">{t("Business")}</p><h2 className="mt-1 font-display text-lg font-bold">{order.business.name}</h2><div className="mt-3 space-y-2 text-xs text-[#4e6a63]">{[order.business.address, order.business.city, order.business.country].filter(Boolean).length > 0 && <p className="flex items-start gap-2"><MapPin size={14} className="mt-0.5 shrink-0 text-[#0b8661]" />{[order.business.address, order.business.city, order.business.country].filter(Boolean).join(", ")}</p>}{order.business.phone && <a href={`tel:${order.business.phone}`} className="flex items-center gap-2 hover:text-[#087553]"><Phone size={14} className="text-[#0b8661]" />{order.business.phone}</a>}</div><div className="mt-4 grid gap-2">{whatsappLink && <a href={whatsappLink} target="_blank" rel="noreferrer" className="btn btn-secondary !min-h-10 text-xs"><MessageCircle size={15} />{t("Follow up on WhatsApp")}</a>}{order.business.phone && <a href={`tel:${order.business.phone}`} className="btn btn-ghost !min-h-10 text-xs"><Phone size={15} />{t("Call business")}</a>}</div></Card>
          <div className="rounded-2xl border border-[#dbeae4] bg-white p-4"><p className="flex items-center gap-2 text-xs font-bold text-[#234f49]"><BadgeCheck size={14} className="text-[#0b8661]" />{t("Keep this link")}</p><p className="mt-2 text-[11px] leading-5 text-[#6b817a]">{t("Bookmark this private page to check updates. Anyone with the link can view this order, so do not share it publicly.")}</p><Button variant="secondary" className="mt-3 !min-h-9 w-full text-[11px]" onClick={() => void copyLink()} icon={<Copy size={13} />}>{copied ? t("Copied") : t("Copy private link")}</Button></div>
        </aside>
      </div>
    </main>
  </div>;
}
