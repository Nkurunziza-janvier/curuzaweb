import { AlertCircle, CalendarDays, Check, FileText, Mail, MessageCircle, Package, PanelTop, ShoppingBag, ShoppingCart, Sparkles, Star, Store, Truck, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Card, Heading } from "../components/ui";
import { queryKeys, useBusinessCatalog, useCurrentUser, useWorkspaceSummary } from "../hooks/apiHooks";
import { effectiveCapabilities, type CapabilityKey } from "../lib/capabilities";
import { businessService } from "../services/api";
import type { BusinessCatalog, CapabilityDefinition } from "../types/business";
import type { WorkspaceSummary } from "../types/dashboard";
import { useLanguage } from "../i18n";

const capabilityIcons: Record<string, LucideIcon> = {
  products: Package,
  product_orders: ShoppingCart,
  services: ShoppingBag,
  appointments: CalendarDays,
  service_requests: FileText,
  portfolio: PanelTop,
  reviews: Star,
  whatsapp_contact: MessageCircle,
  contact_form: Mail,
  delivery: Truck,
  pickup: Store,
};

const capabilityGroups: Array<{ label: string; keys: CapabilityKey[] }> = [
  { label: "Selling and fulfilment", keys: ["products", "product_orders", "delivery", "pickup"] },
  { label: "Services and scheduling", keys: ["services", "appointments", "service_requests", "portfolio"] },
  { label: "Trust and contact", keys: ["reviews", "whatsapp_contact", "contact_form"] },
];

const plannedByIndustry: Record<string, string[]> = {
  accommodation: ["rooms", "accommodation_bookings"],
  food: ["food_menu", "food_orders", "table_reservations"],
  real_estate: ["properties", "property_inquiries"],
  retail: ["inventory"],
  automotive: ["inventory"],
  events: ["events", "ticketing"],
  entertainment: ["events", "ticketing"],
};

const capabilityOrder = ["products", "product_orders", "services", "appointments", "service_requests", "portfolio", "reviews", "whatsapp_contact", "contact_form", "delivery", "pickup"] as const;

function enableCapability(set: Set<string>, key: CapabilityKey) {
  set.add(key);
  if (key === "product_orders") {
    set.add("products");
    if (!set.has("pickup") && !set.has("delivery")) set.add("pickup");
  }
  if (key === "delivery" || key === "pickup") {
    set.add("products");
    set.add("product_orders");
  }
  if (key === "appointments") set.add("services");
}

function disableCapability(set: Set<string>, key: CapabilityKey) {
  set.delete(key);
  if (key === "products") {
    set.delete("product_orders");
    set.delete("delivery");
    set.delete("pickup");
  }
  if (key === "services") set.delete("appointments");
  if (key === "product_orders") {
    set.delete("delivery");
    set.delete("pickup");
  }
  if (key === "pickup" && !set.has("delivery")) set.delete("product_orders");
  if (key === "delivery" && !set.has("pickup")) set.delete("product_orders");
}

export default function DashboardFeatures() {
  const { t } = useLanguage();
  const { data: user } = useCurrentUser();
  const business = user?.business;
  const businessId = business?.id;
  const queryClient = useQueryClient();
  const { data: catalog } = useBusinessCatalog<BusinessCatalog>();
  const { data: summary } = useWorkspaceSummary<WorkspaceSummary>(businessId);
  const [selected, setSelected] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSelected([...effectiveCapabilities(business?.capabilities)]);
  }, [business?.capabilities]);

  const industry = catalog?.industries.find((entry) => entry.key === business?.industryKey);
  const recommended = new Set(industry?.recommended ?? []);
  const definitions = useMemo(() => new Map<string, CapabilityDefinition>((catalog?.capabilities ?? []).map((definition) => [definition.key, definition])), [catalog?.capabilities]);
  const plannedKeys = plannedByIndustry[business?.industryKey ?? ""] ?? [];
  const original = useMemo(() => new Set(effectiveCapabilities(business?.capabilities)), [business?.capabilities]);
  const selectedSet = new Set(selected);
  const changed = selected.length !== original.size || selected.some((key) => !original.has(key));

  const counts: Record<string, number> = {
    products: summary?.catalog.products.total ?? 0,
    services: summary?.catalog.services.total ?? 0,
    product_orders: summary?.orders?.total ?? 0,
    appointments: summary?.bookings?.total ?? 0,
    service_requests: summary?.requests?.total ?? 0,
    contact_form: summary?.requests?.total ?? 0,
    reviews: summary?.reviews?.total ?? 0,
  };

  const mutation = useMutation({
    mutationFn: (payload: { capabilities: string[]; confirmCapabilityChanges: boolean }) => businessService.update(businessId!, payload),
    onSuccess: () => {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
      void queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
      if (businessId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceSummary(businessId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.business(businessId) });
      }
      if (business?.slug) void queryClient.invalidateQueries({ queryKey: queryKeys.publicBusiness(business.slug) });
    },
  });

  const toggle = (key: CapabilityKey) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) disableCapability(next, key);
      else enableCapability(next, key);
      return capabilityOrder.filter((entry) => next.has(entry));
    });
  };

  const save = () => {
    const removed = [...original].filter((key) => !selectedSet.has(key));
    const hasRecords = removed.some((key) => (counts[key] ?? 0) > 0);
    if (removed.length && hasRecords) {
      const confirmed = window.confirm(t("Disabling these features hides them from your public page, but all existing records are kept. Continue?"));
      if (!confirmed) return;
    }
    mutation.mutate({ capabilities: selected, confirmCapabilityChanges: hasRecords });
  };

  const reset = () => setSelected([...original]);

  return <div className="mx-auto max-w-6xl">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><Heading as="h1">{t("Features & modules")}</Heading><p className="mt-2 max-w-3xl text-muted">{t("Choose how customers interact with your business. Features you turn on appear in your dashboard and on your public page.")}</p></div>
      <div className="flex flex-wrap gap-2">{changed && <Button variant="ghost" onClick={reset} disabled={mutation.isPending}>{t("Reset")}</Button>}<Button onClick={save} loading={mutation.isPending} disabled={!changed || selected.length === 0} icon={saved ? <Check size={17} /> : undefined}>{saved ? t("Saved") : t("Save changes")}</Button></div>
    </div>

    <Card className="mt-6 flex items-start gap-3 border-[#e6e0f5] bg-[#f7f4ff] p-4 text-sm text-[#5a3b8f]"><AlertCircle size={18} className="mt-0.5 shrink-0" /><p>{t("Disabling a feature hides it without deleting your products, services, orders, bookings, or customer history. Planned features cannot be activated yet.")}</p></Card>
    {mutation.isError && <p role="alert" className="mt-4 rounded-xl bg-coral-soft p-3 text-sm text-coral-dark">{mutation.error instanceof Error ? mutation.error.message : t("Your feature changes could not be saved")}</p>}
    {selected.length === 0 && <p role="alert" className="mt-4 rounded-xl bg-[#fff8e8] p-3 text-sm text-[#8a5a00]">{t("Keep at least one feature active so your public page has a customer action.")}</p>}

    <div className="mt-8 space-y-8">
      {capabilityGroups.map((group) => <section key={group.label}>
        <div className="flex items-center justify-between gap-3"><h2 className="font-display text-lg font-bold">{t(group.label)}</h2><span className="text-xs text-muted">{group.keys.filter((key) => selectedSet.has(key)).length} {t("active")}</span></div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">{group.keys.map((key) => {
          const definition = definitions.get(key);
          if (!definition) return null;
          const active = selectedSet.has(key);
          const Icon = capabilityIcons[key] ?? Sparkles;
          const dependencies = definition.dependsOn?.filter((dependency) => !selectedSet.has(dependency)) ?? [];
          return <Card key={key} className={`p-4 transition ${active ? "border-[#c8e4d5] bg-[#fbfefc]" : ""}`}>
            <div className="flex items-start gap-3">
              <span className={`icon-tile shrink-0 ${active ? "bg-[#e8f5ed] text-[#075b43]" : ""}`}><Icon size={17} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><p className="font-bold">{t(definition.label)}</p>{recommended.has(key) && <Badge tone="violet">{t("Recommended")}</Badge>}</div>
                <p className="mt-1 text-xs leading-5 text-muted">{t(definition.description)}</p>
                {active && dependencies.length > 0 && <p className="mt-2 text-xs font-semibold text-[#8a5a00]">{t("Needs")} {dependencies.map((dependency) => t(definitions.get(dependency)?.label ?? dependency)).join(", ")}</p>}
              </div>
              <button type="button" role="switch" aria-checked={active} aria-label={`${t(active ? "Disable" : "Enable")} ${t(definition.label)}`} onClick={() => toggle(key)} className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${active ? "bg-[#087553]" : "bg-[#d7ddd3]"}`}>
                <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-all ${active ? "left-[1.375rem]" : "left-0.5"}`} />
              </button>
            </div>
          </Card>;
        })}</div>
      </section>)}
    </div>

    {plannedKeys.length > 0 && <section className="mt-10">
      <div className="flex items-center gap-2"><h2 className="font-display text-lg font-bold">{t("Planned for your industry")}</h2><Badge tone="neutral">{t("Coming soon")}</Badge></div>
      <p className="mt-1 text-sm text-muted">{t("These modules are not available yet. They cannot be turned on from this page.")}</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">{plannedKeys.map((key) => {
        const definition = definitions.get(key);
        if (!definition) return null;
        return <Card key={key} className="border-dashed p-4 opacity-80"><div className="flex items-start gap-3"><span className="icon-tile shrink-0"><Sparkles size={17} /></span><div><div className="flex flex-wrap items-center gap-2"><p className="font-bold">{t(definition.label)}</p><Badge tone="neutral">{t("Planned")}</Badge></div><p className="mt-1 text-xs leading-5 text-muted">{t(definition.description)}</p></div></div></Card>;
      })}</div>
    </section>}

    {changed && <div className="sticky bottom-4 z-20 mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 shadow-float"><p className="text-sm font-semibold">{t("You have unsaved feature changes.")}</p><div className="flex gap-2"><Button variant="ghost" onClick={reset} disabled={mutation.isPending}>{t("Discard")}</Button><Button onClick={save} loading={mutation.isPending} disabled={selected.length === 0}>{t("Save changes")}</Button></div></div>}
  </div>;
}
