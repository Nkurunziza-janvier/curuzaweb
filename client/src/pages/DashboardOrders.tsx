import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronRight, CreditCard, MapPin, MessageCircle, Phone, Search, ShoppingBag, Truck, X } from "lucide-react";
import { orderService } from "../services/api";
import { queryKeys, useBusinessOrders, useCurrentUser } from "../hooks/apiHooks";
import { Badge, Button, Card, Heading, Input, Select, Stat } from "../components/ui";
import { useLanguage } from "../i18n";
import { moduleByKey, moduleLabel } from "../lib/dashboardModules";
import type { OrderPaymentStatus, OrderStatus, PublicOrder, OrderSummary } from "../types/order";

const money = (amount: number | string, currency = "RWF") => `${currency} ${Number(amount).toLocaleString()}`;
const statusLabel: Record<OrderStatus, string> = { PENDING: "New", CONFIRMED: "Confirmed", PROCESSING: "Preparing", READY: "Ready", COMPLETED: "Completed", CANCELLED: "Cancelled" };
const statusTone = (status: OrderStatus) => status === "COMPLETED" ? "success" as const : status === "CANCELLED" ? "warning" as const : status === "PENDING" ? "accent" as const : "violet" as const;
const paymentLabel: Record<OrderPaymentStatus, string> = { UNPAID: "Unpaid", PENDING: "Payment pending", PAID: "Paid", REFUNDED: "Refunded" };
const nextActions: Partial<Record<OrderStatus, Array<{ status: OrderStatus; label: string }>>> = {
  PENDING: [{ status: "CONFIRMED", label: "Confirm order" }, { status: "CANCELLED", label: "Cancel" }],
  CONFIRMED: [{ status: "PROCESSING", label: "Start preparing" }, { status: "CANCELLED", label: "Cancel" }],
  PROCESSING: [{ status: "READY", label: "Mark ready" }, { status: "CANCELLED", label: "Cancel" }],
  READY: [{ status: "COMPLETED", label: "Complete" }],
};

function ErrorNotice({ message }: { message: string }) {
  return <p role="alert" className="rounded-xl bg-coral-soft p-3 text-sm text-coral-dark">{message}</p>;
}

export default function OrdersPage() {
  const { t } = useLanguage();
  const { data: user } = useCurrentUser();
  const business = user?.business;
  const businessId = business?.id;
  const ordersModule = moduleByKey("product_orders");
  const queryClient = useQueryClient();
  const { data: orders, isLoading, isError, error } = useBusinessOrders<PublicOrder>(businessId);
  const { data: summary, isLoading: summaryLoading } = useQuery<OrderSummary>({
    queryKey: queryKeys.orderSummary(businessId ?? ""),
    queryFn: () => orderService.summary<OrderSummary>(businessId!),
    enabled: Boolean(businessId),
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [payment, setPayment] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = orders?.find((order) => order.id === selectedId) ?? null;

  const refresh = () => {
    if (!businessId) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.orders(businessId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.orderSummary(businessId) });
  };
  const statusMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: OrderStatus }) => orderService.updateStatus<PublicOrder>(id, next),
    onSuccess: (updated) => {
      if (businessId) queryClient.setQueryData<PublicOrder[]>(queryKeys.orders(businessId), (current) => current?.map((order) => order.id === updated.id ? updated : order));
      refresh();
    },
  });
  const paidMutation = useMutation({
    mutationFn: (id: string) => orderService.markPaid<PublicOrder>(id),
    onSuccess: (updated) => {
      if (businessId) queryClient.setQueryData<PublicOrder[]>(queryKeys.orders(businessId), (current) => current?.map((order) => order.id === updated.id ? updated : order));
      refresh();
    },
  });

  const filtered = useMemo(() => (orders ?? []).filter((order) => {
    const query = search.trim().toLowerCase();
    return (status === "ALL" || order.status === status) &&
      (payment === "ALL" || order.paymentStatus === payment) &&
      (!query || `${order.orderNumber} ${order.customerName} ${order.customerPhone ?? ""}`.toLowerCase().includes(query));
  }), [orders, search, status, payment]);

  return <div className="mx-auto max-w-7xl">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><Heading as="h1">{t(ordersModule ? moduleLabel(ordersModule, business) : "Orders")}</Heading><p className="mt-2 text-muted">{t("Confirm, prepare, and fulfil customer orders from your storefront.")}</p></div></div>
    {(isError || statusMutation.isError || paidMutation.isError) && <div className="mt-5"><ErrorNotice message={error?.message ?? statusMutation.error?.message ?? paidMutation.error?.message ?? t("Orders could not be loaded")} /></div>}
    <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Stat label={t("New")} value={summaryLoading ? "—" : String(summary?.pending ?? 0)} />
      <Stat label={t("In progress")} value={summaryLoading ? "—" : String((summary?.confirmed ?? 0) + (summary?.processing ?? 0) + (summary?.ready ?? 0))} />
      <Stat label={t("Completed")} value={summaryLoading ? "—" : String(summary?.completed ?? 0)} />
      <Stat label={t("Unpaid")} value={summaryLoading ? "—" : String(summary?.unpaid ?? 0)} />
      <Stat label={t("Paid value")} value={summaryLoading ? "—" : money(summary?.paidValue ?? 0)} />
    </div>

    <Card className="mt-6 overflow-hidden">
      <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr]">
        <div className="relative"><Search size={16} className="absolute left-3 top-3.5 text-muted" /><Input aria-label={t("Search orders")} className="pl-9" placeholder={t("Search order, customer, phone…")} value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <Select aria-label={t("Filter by order status")} value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">{t("All statuses")}</option>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}</Select>
        <Select aria-label={t("Filter by payment status")} value={payment} onChange={(event) => setPayment(event.target.value)}><option value="ALL">{t("All payments")}</option>{Object.entries(paymentLabel).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}</Select>
      </div>
      {isLoading ? <div className="space-y-3 p-5"><div className="skeleton h-16 rounded-xl" /><div className="skeleton h-16 rounded-xl" /><div className="skeleton h-16 rounded-xl" /></div>
        : filtered.length === 0 ? <div className="p-10 text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#eef4ef] text-[#5c7f74]"><ShoppingBag size={24} /></span><p className="mt-4 font-display text-lg font-bold">{t((orders ?? []).length ? "No orders match these filters" : "No orders yet")}</p><p className="mt-2 text-sm text-muted">{t((orders ?? []).length ? "Try changing the search or filters." : "Orders placed on your public page will appear here.")}</p></div>
          : <div className="divide-y divide-line">{(filtered).map((order) => <article key={order.id} className="p-4 transition hover:bg-[#faf9f6] sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-display font-bold">#{order.orderNumber}</p><Badge tone={statusTone(order.status)}>{t(statusLabel[order.status])}</Badge><Badge tone={order.paymentStatus === "PAID" ? "success" : "neutral"}>{t(paymentLabel[order.paymentStatus])}</Badge></div><p className="mt-1.5 text-sm text-muted">{order.customerName} · {order.items.reduce((sum, item) => sum + item.quantity, 0)} {t("items")} · {new Date(order.createdAt).toLocaleDateString()}</p><p className="mt-1 text-xs text-muted">{order.fulfillment === "DELIVERY" ? `${t("Delivery")}: ${order.deliveryAddress}` : t("Pickup")}</p></div>
              <div className="flex items-center gap-3"><p className="font-display text-lg font-bold">{money(order.total, order.currency)}</p><Button variant="secondary" onClick={() => setSelectedId(order.id)}>{t("Open")}<ChevronRight size={15} /></Button></div>
            </div>
          </article>)}</div>}
    </Card>

    {selected && <div className="fixed inset-0 z-50 grid place-items-center bg-ink/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`${t("Order")} ${selected.orderNumber}`}>
      <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto p-5 shadow-float sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">{t("Order")}</p><h2 className="font-display text-2xl font-bold">#{selected.orderNumber}</h2><div className="mt-2 flex flex-wrap gap-2"><Badge tone={statusTone(selected.status)}>{t(statusLabel[selected.status])}</Badge><Badge tone={selected.paymentStatus === "PAID" ? "success" : "neutral"}>{t(paymentLabel[selected.paymentStatus])}</Badge></div></div><Button variant="ghost" onClick={() => setSelectedId(null)} aria-label={t("Close")} icon={<X size={18} />}>{t("Close")}</Button></div>

        <div className="mt-5 grid gap-3 rounded-2xl bg-[#f7faf8] p-4 text-sm sm:grid-cols-2">
          <div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#6b8d82]">{t("Customer")}</p><p className="mt-1 font-semibold">{selected.customerName}</p>{selected.customerPhone && <a href={`tel:${selected.customerPhone}`} className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-[#087553]"><Phone size={12} />{selected.customerPhone}</a>}{selected.customerEmail && <a href={`mailto:${selected.customerEmail}`} className="mt-1 block break-all text-xs text-[#087553]">{selected.customerEmail}</a>}</div>
          <div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#6b8d82]">{t("Fulfilment")}</p><p className="mt-1 flex items-center gap-1.5 font-semibold">{selected.fulfillment === "DELIVERY" ? <Truck size={14} /> : <MapPin size={14} />}{selected.fulfillment === "DELIVERY" ? t("Delivery") : t("Pickup")}</p>{selected.fulfillment === "DELIVERY" && <p className="mt-1 text-xs text-muted">{selected.deliveryAddress}</p>}<p className="mt-1 text-xs text-muted">{new Date(selected.createdAt).toLocaleString()}</p></div>
        </div>

        <div className="mt-4 space-y-2">{selected.items.map((item) => <div key={item.id} className="flex justify-between gap-4 border-b border-line pb-2 text-sm"><span>{item.name}<span className="block text-xs text-muted">{item.quantity} × {money(item.unitPrice, selected.currency)}</span></span><strong>{money(item.lineTotal, selected.currency)}</strong></div>)}<div className="flex justify-between pt-2 font-display text-lg font-bold"><span>{t("Total")}</span><span>{money(selected.total, selected.currency)}</span></div></div>
        {selected.customerNote && <p className="mt-4 whitespace-pre-wrap rounded-xl bg-[#fffaf0] p-3 text-xs leading-5 text-[#76522a]"><strong>{t("Customer note")}:</strong> {selected.customerNote}</p>}

        <div className="mt-5 flex flex-wrap gap-2">
          {nextActions[selected.status]?.map((action) => <Button key={action.status} variant={action.status === "CANCELLED" ? "secondary" : "primary"} loading={statusMutation.isPending} disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: selected.id, next: action.status })}>{t(action.label)}</Button>)}
          {selected.paymentStatus !== "PAID" && selected.paymentStatus !== "REFUNDED" && <Button variant="secondary" icon={<CreditCard size={16} />} loading={paidMutation.isPending} disabled={paidMutation.isPending} onClick={() => paidMutation.mutate(selected.id)}>{t("Mark as paid")}</Button>}
          {selected.business.whatsapp && <a className="btn btn-secondary" target="_blank" rel="noreferrer" href={`https://wa.me/${selected.business.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello ${selected.customerName}, about order ${selected.orderNumber}…`)}`}><MessageCircle size={16} />{t("WhatsApp customer")}</a>}
        </div>
        {selected.payments.length > 0 && <div className="mt-5"><p className="text-xs font-bold uppercase tracking-wide text-muted">{t("Payment history")}</p><div className="mt-2 space-y-2">{selected.payments.map((entry) => <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-xs"><span><strong>{entry.reference}</strong> · {entry.provider.replace("_", " ")}</span><span className="flex items-center gap-2">{entry.status === "PAID" && <CheckCircle2 size={14} className="text-success" />}{entry.status} · {money(entry.amount, entry.currency)}</span></div>)}</div></div>}
        {statusMutation.isError && <div className="mt-3"><ErrorNotice message={statusMutation.error.message} /></div>}
        {paidMutation.isError && <div className="mt-3"><ErrorNotice message={paidMutation.error.message} /></div>}
      </Card>
    </div>}
  </div>;
}
