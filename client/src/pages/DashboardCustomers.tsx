import { CalendarDays, FileText, Mail, Phone, Search, ShoppingCart, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Badge, Card, Heading, Input, Stat } from "../components/ui";
import { useBusinessCustomers, useCurrentUser } from "../hooks/apiHooks";
import { dashboardModules, moduleLabel } from "../lib/dashboardModules";
import type { CustomerRecord } from "../types/dashboard";
import { useLanguage } from "../i18n";

const sourceLabel: Record<CustomerRecord["sources"][number], string> = {
  orders: "Ordered",
  bookings: "Booked",
  requests: "Inquired",
};

export default function DashboardCustomers() {
  const { t } = useLanguage();
  const { data: user } = useCurrentUser();
  const business = user?.business;
  const currency = business?.currency ?? "RWF";
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { data: customers, isLoading, isError, error } = useBusinessCustomers<CustomerRecord[]>(business?.id, debouncedSearch);
  const module = dashboardModules.find((entry) => entry.key === "customers");
  const title = module ? moduleLabel(module, business) : "Customers";

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const stats = useMemo(() => {
    const records = customers ?? [];
    return {
      total: records.length,
      returning: records.filter((customer) => customer.sources.length > 1).length,
      ordered: records.filter((customer) => customer.orders > 0).length,
      bookedOrInquired: records.filter((customer) => customer.bookings > 0 || customer.requests > 0).length,
    };
  }, [customers]);

  return <div className="mx-auto max-w-7xl">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><Heading as="h1">{t(title)}</Heading><p className="mt-2 text-muted">{t("Everyone who has ordered, booked, or sent an inquiry to your business.")}</p></div>
      <div className="flex flex-wrap gap-2">
        <Link to="/dashboard/orders" className="btn btn-secondary"><ShoppingCart size={16} />{t("Orders")}</Link>
        <Link to="/dashboard/requests" className="btn btn-ghost"><FileText size={16} />{t("Inquiries")}</Link>
      </div>
    </div>

    {isError && <p role="alert" className="mt-5 rounded-xl bg-coral-soft p-3 text-sm text-coral-dark">{error instanceof Error ? error.message : t("Customers could not be loaded")}</p>}

    <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Stat label={t("Total customers")} value={isLoading ? "—" : String(stats.total)} icon={<Users size={18} />} />
      <Stat label={t("Returning")} value={isLoading ? "—" : String(stats.returning)} note={t("More than one interaction")} />
      <Stat label={t("Ordered")} value={isLoading ? "—" : String(stats.ordered)} icon={<ShoppingCart size={18} />} />
      <Stat label={t("Booked or inquired")} value={isLoading ? "—" : String(stats.bookedOrInquired)} icon={<CalendarDays size={18} />} />
    </div>

    <Card className="mt-6 overflow-hidden">
      <div className="border-b border-line p-4 sm:p-5">
        <div className="relative max-w-md"><Search size={16} className="absolute left-3 top-3.5 text-muted" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Search by name, email, or phone...")} aria-label={t("Search customers")} /></div>
      </div>

      {isLoading ? <div className="space-y-3 p-5"><div className="skeleton h-14 rounded-xl" /><div className="skeleton h-14 rounded-xl" /><div className="skeleton h-14 rounded-xl" /></div>
        : !customers?.length ? <div className="p-10 text-center"><span className="mx-auto grid size-12 place-items-center rounded-full bg-[#f0f4ef] text-violet"><Users size={20} /></span><p className="mt-4 font-display text-lg font-bold">{t(search ? "No customers match your search" : "No customers yet")}</p><p className="mx-auto mt-2 max-w-md text-sm text-muted">{t(search ? "Try a different name, email, or phone number." : "Customers appear here after they order, book, or send an inquiry.")}</p>{!search && <Link to="/dashboard/features" className="btn btn-secondary mt-5">{t("Check active features")}</Link>}</div>
          : <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[58rem] text-left text-sm">
                <thead className="bg-[#faf9f6] text-xs uppercase tracking-wider text-muted"><tr>{["Customer", "Contact", "Activity", "Order value", "Last activity"].map((label) => <th key={label} className="px-5 py-3 font-semibold">{t(label)}</th>)}</tr></thead>
                <tbody className="divide-y divide-line">{customers.map((customer) => <tr key={customer.key} className="hover:bg-[#faf9f6]">
                  <td className="px-5 py-4"><p className="font-bold">{customer.name}</p><div className="mt-1 flex flex-wrap gap-1">{customer.sources.map((source) => <Badge key={source} tone={source === "orders" ? "accent" : source === "bookings" ? "violet" : "neutral"}>{t(sourceLabel[source])}</Badge>)}</div></td>
                  <td className="px-5 py-4"><div className="space-y-1 text-xs">{customer.email && <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 text-violet"><Mail size={13} />{customer.email}</a>}{(customer.phone || customer.whatsapp) && <a href={`tel:${customer.whatsapp ?? customer.phone}`} className="flex items-center gap-1.5 text-muted"><Phone size={13} />{customer.whatsapp ?? customer.phone}</a>}{!customer.email && !customer.phone && !customer.whatsapp && <span className="text-muted">—</span>}</div></td>
                  <td className="px-5 py-4"><div className="flex flex-wrap gap-2 text-xs">{customer.orders > 0 && <span>{customer.orders} {t("orders")}</span>}{customer.bookings > 0 && <span>{customer.bookings} {t("bookings")}</span>}{customer.requests > 0 && <span>{customer.requests} {t("inquiries")}</span>}</div></td>
                  <td className="px-5 py-4 font-semibold">{customer.orderValue ? `${currency} ${customer.orderValue.toLocaleString()}` : "—"}</td>
                  <td className="px-5 py-4 text-muted">{new Date(customer.lastActivityAt).toLocaleDateString()}</td>
                </tr>)}</tbody>
              </table>
            </div>
            <div className="grid gap-3 p-4 lg:hidden">{customers.map((customer) => <article key={customer.key} className="rounded-xl border border-line p-4">
              <div className="flex items-start justify-between gap-3"><div><p className="font-bold">{customer.name}</p><p className="mt-1 text-xs text-muted">{new Date(customer.lastActivityAt).toLocaleDateString()}</p></div><Badge tone={customer.sources.length > 1 ? "violet" : "neutral"}>{customer.sources.length > 1 ? t("Returning") : t("New")}</Badge></div>
              <div className="mt-3 flex flex-wrap gap-1">{customer.sources.map((source) => <Badge key={source} tone="neutral">{t(sourceLabel[source])}</Badge>)}</div>
              <div className="mt-3 space-y-1 text-xs">{customer.email && <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 text-violet"><Mail size={13} />{customer.email}</a>}{(customer.phone || customer.whatsapp) && <a href={`tel:${customer.whatsapp ?? customer.phone}`} className="flex items-center gap-1.5 text-muted"><Phone size={13} />{customer.whatsapp ?? customer.phone}</a>}</div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">{customer.orders > 0 && <span>{customer.orders} {t("orders")}</span>}{customer.bookings > 0 && <span>{customer.bookings} {t("bookings")}</span>}{customer.requests > 0 && <span>{customer.requests} {t("inquiries")}</span>}{customer.orderValue > 0 && <span>{currency} {customer.orderValue.toLocaleString()}</span>}</div>
            </article>)}</div>
          </>}
    </Card>
  </div>;
}
