import { ArrowRight, BarChart3, Bell, Check, ChevronDown, ChevronRight, ChevronUp, Clipboard, Compass, Copy, Eye, FileText, Gift, Image, MessageCircle, MoreHorizontal, Package, Pencil, Phone, Plus, Search, Send, ShieldAlert, Sparkles, Trash2, TrendingUp, Users, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { businessService, offerService, productService, quoteService, requestService, resolveAssetUrl, serviceService } from "../services/api";
import { Badge, Button, ButtonLink, Card, Heading, Input, Label, Select, Stat, Textarea } from "../components/ui";
import { ImageUploadField } from "../components/ImageUploadField";
import { queryKeys, useBusinessAnalytics, useBusinessRequests, useCurrentUser } from "../hooks/apiHooks";
import { useLanguage } from "../i18n";

const money = (n: number | string) => `RWF ${Number(n).toLocaleString()}`;
type RequestStatus = "NEW" | "REVIEWING" | "QUOTE_SENT" | "CUSTOMER_RESPONDED" | "ACCEPTED" | "REJECTED" | "COMPLETED";
type QuoteStatus = "DRAFT" | "SENT" | "VIEWED" | "ACCEPTED" | "REJECTED" | "CHANGE_REQUESTED" | "EXPIRED" | "CANCELLED";

interface RequestRecord {
  id: string;
  requestNumber: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  customerWhatsapp: string | null;
  requestType: string;
  description: string;
  location: string | null;
  budget: number | string | null;
  status: RequestStatus;
  createdAt: string;
  answers: Array<{ id: string; label: string; value: unknown }>;
  quote: null | { id: string; quoteNumber: string; status: QuoteStatus; total: number | string };
}

interface QuoteRecord {
  id: string;
  quoteNumber: string;
  publicToken: string;
  status: QuoteStatus;
  total: number | string;
  currency: string;
  validityDays: number;
  subtotal: number | string;
  discount: number | string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number | string;
  depositAmount: number | string;
  createdAt: string;
  updatedAt: string;
  validUntil: string;
  estimatedCompletionDate: string | null;
  paymentTerms: string;
  items: Array<{ id: string; name: string; description: string; quantity: number | string; unitPrice: number | string; total: number | string }>;
  notes: string;
  messages: Array<{ id: string; senderType: "CUSTOMER" | "BUSINESS"; message: string; createdAt: string }>;
  business?: { name: string; slug: string; phone: string | null; whatsapp: string | null; email: string | null; logoUrl: string | null };
  request: { id: string; requestNumber: string; customerName: string; customerEmail?: string | null; customerPhone?: string | null; customerWhatsapp?: string | null; requestType: string; description?: string; location?: string | null; preferredDate?: string | null; answers?: Array<{ id: string; label: string; value: unknown }> };
}

interface AnalyticsRecord {
  pageViews: number;
  requests: number;
  quotes: number;
  acceptedQuotes: number;
  whatsappClicks: number;
  phoneClicks: number;
  directionsClicks: number;
  quoteValue: number;
  funnel: { visitors: number; actions: number; requests: number; quotes: number; acceptedQuotes: number };
}

function requestStatusLabel(status: RequestStatus) {
  return ({ NEW: "New", REVIEWING: "Reviewing", QUOTE_SENT: "Quote Sent", CUSTOMER_RESPONDED: "Customer Responded", ACCEPTED: "Accepted", REJECTED: "Rejected", COMPLETED: "Completed" } as const)[status];
}

const quoteStatusLabel: Record<QuoteStatus, string> = {
  DRAFT: "Draft", SENT: "Sent", VIEWED: "Viewed", ACCEPTED: "Accepted",
  REJECTED: "Rejected", CHANGE_REQUESTED: "Change requested", EXPIRED: "Expired", CANCELLED: "Cancelled",
};

const quoteStatusTone = (status: QuoteStatus) => status === "ACCEPTED"
  ? "success" as const
  : status === "DRAFT" || status === "CANCELLED"
    ? "neutral" as const
    : status === "REJECTED" || status === "EXPIRED"
      ? "warning" as const
      : "accent" as const;

interface QuoteSummary {
  total: number;
  drafts: number;
  awaitingResponse: number;
  changeRequested: number;
  accepted: number;
  rejectedOrExpired: number;
  acceptedValue: number;
  pendingValue: number;
  acceptanceRate: number;
  averageResponseTimeHours: number | null;
}

function QuotesManagement({ businessId, quotes, isLoading, error }: { businessId: string; quotes: QuoteRecord[]; isLoading: boolean; error: Error | null }) {
  const { t } = useLanguage();
  const { data: summary, isLoading: summaryLoading, isError: summaryError } = useQuery<QuoteSummary>({
    queryKey: ["quote-summary", businessId],
    queryFn: () => quoteService.summary<QuoteSummary>(businessId),
    enabled: Boolean(businessId),
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const filteredQuotes = useMemo(() => {
    const filtered = quotes.filter((quote) => {
      const created = new Date(quote.createdAt).toISOString().slice(0, 10);
      const query = search.trim().toLowerCase();
      return (!query || `${quote.quoteNumber} ${quote.request.customerName} ${quote.request.requestNumber}`.toLowerCase().includes(query)) &&
        (status === "ALL" || quote.status === status) &&
        (!fromDate || created >= fromDate) &&
        (!toDate || created <= toDate);
    });
    return filtered.sort((a, b) => sortBy === "oldest"
      ? a.createdAt.localeCompare(b.createdAt)
      : sortBy === "amount-high"
        ? Number(b.total) - Number(a.total)
        : sortBy === "amount-low"
          ? Number(a.total) - Number(b.total)
          : b.createdAt.localeCompare(a.createdAt));
  }, [quotes, search, status, fromDate, toDate, sortBy]);
  const pageCount = Math.max(1, Math.ceil(filteredQuotes.length / pageSize));
  const pageQuotes = filteredQuotes.slice((page - 1) * pageSize, page * pageSize);

  return <div className="mx-auto max-w-7xl">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><Heading as="h1">{t("Quotes")}</Heading><p className="mt-2 text-muted">{t("Manage proposals, share links, and track customer decisions.")}</p></div><ButtonLink to="/dashboard/requests" icon={<FileText size={16} />}>{t("Create from a request")}</ButtonLink></div>
    {(error || summaryError) && <div className="mt-5"><ErrorNotice message={error?.message ?? "Quote summary could not be loaded"} /></div>}
    <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="Total quotes" value={summaryLoading ? "—" : String(summary?.total ?? 0)} />
      <Stat label="Drafts" value={summaryLoading ? "—" : String(summary?.drafts ?? 0)} />
      <Stat label="Awaiting response" value={summaryLoading ? "—" : String(summary?.awaitingResponse ?? 0)} />
      <Stat label="Accepted" value={summaryLoading ? "—" : String(summary?.accepted ?? 0)} />
      <Stat label="Rejected / expired" value={summaryLoading ? "—" : String(summary?.rejectedOrExpired ?? 0)} />
      <Stat label="Accepted value" value={summaryLoading ? "—" : money(summary?.acceptedValue ?? 0)} />
      <Stat label="Pending value" value={summaryLoading ? "—" : money(summary?.pendingValue ?? 0)} />
      <Stat label="Acceptance rate" value={summaryLoading ? "—" : `${summary?.acceptanceRate ?? 0}%`} />
    </div>
    <Card className="mt-6 overflow-hidden">
      <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
        <div className="relative"><Search size={16} className="absolute left-3 top-3.5 text-muted" /><Input aria-label={t("Search quotes")} className="pl-9" placeholder={t("Search quote, customer, request…")} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div>
        <Select aria-label="Filter by quote status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="ALL">{t("All statuses")}</option>{Object.entries(quoteStatusLabel).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}</Select>
        <Input aria-label={t("Created from date")} type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(1); }} />
        <Input aria-label={t("Created to date")} type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(1); }} />
        <Select aria-label="Sort quotes" value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="newest">{t("Newest first")}</option><option value="oldest">{t("Oldest first")}</option><option value="amount-high">{t("Highest amount")}</option><option value="amount-low">{t("Lowest amount")}</option></Select>
      </div>
      {isLoading ? <div className="space-y-3 p-5"><div className="skeleton h-12 rounded-xl" /><div className="skeleton h-12 rounded-xl" /><div className="skeleton h-12 rounded-xl" /></div>
        : filteredQuotes.length === 0 ? <div className="p-10 text-center"><p className="font-display text-lg font-bold">{t(quotes.length ? "No quotes match these filters" : "No quotes yet")}</p><p className="mt-2 text-sm text-muted">{t(quotes.length ? "Try changing the search or filters." : "Create a quote from one of your customer requests to get started.")}</p><ButtonLink className="mt-5" to="/dashboard/requests">{t("View customer requests")}</ButtonLink></div>
          : <>
            <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[65rem] text-left text-sm"><thead className="bg-[#faf9f6] text-xs uppercase tracking-wider text-muted"><tr>{["Quote / customer", "Request", "Total", "Created", "Expires", "Status", "Updated", ""].map((label) => <th key={label} className="px-4 py-3 font-semibold">{t(label)}</th>)}</tr></thead><tbody className="divide-y divide-line">{pageQuotes.map((quote) => <tr key={quote.id} className="hover:bg-[#faf9f6]"><td className="px-4 py-4"><p className="font-bold">#{quote.quoteNumber}</p><p className="mt-1 text-xs text-muted">{quote.request.customerName}</p></td><td className="px-4 py-4"><p>{quote.request.requestType}</p><p className="mt-1 text-xs text-muted">#{quote.request.requestNumber}</p></td><td className="px-4 py-4 font-semibold">{money(quote.total)}</td><td className="px-4 py-4 text-muted">{new Date(quote.createdAt).toLocaleDateString()}</td><td className="px-4 py-4 text-muted">{new Date(quote.validUntil).toLocaleDateString()}</td><td className="px-4 py-4"><Badge tone={quoteStatusTone(quote.status)}>{t(quoteStatusLabel[quote.status])}</Badge></td><td className="px-4 py-4 text-muted">{new Date(quote.updatedAt).toLocaleDateString()}</td><td className="px-4 py-4"><ButtonLink to={`/dashboard/quotes/${quote.id}`} variant="ghost">{t("Open")} <ChevronRight size={15} /></ButtonLink></td></tr>)}</tbody></table></div>
            <div className="grid gap-3 p-4 lg:hidden">{pageQuotes.map((quote) => <article key={quote.id} className="rounded-xl border border-line p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold">#{quote.quoteNumber}</p><p className="mt-1 text-sm text-muted">{quote.request.customerName}</p></div><Badge tone={quoteStatusTone(quote.status)}>{t(quoteStatusLabel[quote.status])}</Badge></div><p className="mt-3 text-sm">{quote.request.requestType} · {quote.request.requestNumber}</p><div className="mt-3 flex items-end justify-between"><strong>{money(quote.total)}</strong><span className="text-right text-xs text-muted">{t("Created")} {new Date(quote.createdAt).toLocaleDateString()}<br />{t("Expires")} {new Date(quote.validUntil).toLocaleDateString()}</span></div><ButtonLink to={`/dashboard/quotes/${quote.id}`} variant="secondary" className="mt-4 w-full">{t("Open quote")} <ChevronRight size={15} /></ButtonLink></article>)}</div>
            <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm"><p className="text-muted">Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredQuotes.length)} of {filteredQuotes.length}</p><div className="flex gap-2"><Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t("Previous")}</Button><Button variant="secondary" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>{t("Next")}</Button></div></div>
          </>}
    </Card>
  </div>;
}

function ErrorNotice({ message }: { message: string }) {
  return <p role="alert" className="rounded-xl bg-coral-soft p-3 text-sm text-coral-dark">{message}</p>;
}

export function DashboardHome() {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const { data: user } = useCurrentUser();
  const businessInfo = user?.business;
  const { data: analytics, isLoading: analyticsLoading, isError: analyticsError, error: analyticsReason } = useBusinessAnalytics<AnalyticsRecord>(businessInfo?.id);
  const { data: requests, isLoading: requestsLoading, isError: requestsError, error: requestsReason } = useBusinessRequests<RequestRecord>(businessInfo?.id);
  const pageLink = businessInfo ? `${window.location.origin}/b/${businessInfo.slug}` : "";

  if (!businessInfo) return <Card className="mx-auto max-w-2xl p-8"><Heading as="h1">{t("Set up your business")}</Heading><p className="mt-3 text-muted">{t("Complete onboarding to create your business page.")}</p><ButtonLink to="/onboarding" className="mt-6">{t("Continue setup")}</ButtonLink></Card>;

  return <div className="mx-auto max-w-7xl">
    <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div className="min-w-0"><Badge tone={businessInfo.isPublished ? "success" : "warning"}><span className={`size-1.5 rounded-full ${businessInfo.isPublished ? "bg-success" : "bg-warning"}`} /> {businessInfo.isPublished ? t("Your page is live") : t("Your page is unpublished")}</Badge><Heading as="h1" className="mt-4">{t("Welcome")}, {user?.name.split(" ")[0]}.</Heading><p className="mt-2 text-muted">{t("Here’s how customers are engaging with")} {businessInfo.name}.</p></div><div className="flex flex-wrap gap-2"><ButtonLink to="/dashboard/billing" variant="secondary" className="flex-1 sm:flex-none" icon={<Bell size={17} />}>{t("Plans & updates")}</ButtonLink><ButtonLink to="/dashboard/requests" className="flex-1 sm:flex-none" icon={<Plus size={17} />}>{t("View requests")}</ButtonLink></div></div>
    <Card className="dashboard-public-link mt-8 overflow-hidden border-0 bg-ink p-5 text-white shadow-card sm:p-7"><div className="flex min-w-0 flex-col justify-between gap-5 md:flex-row md:items-center"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-white/50">{t("Your public business link")}</p><p className="mt-2 break-all font-display text-base font-bold sm:text-xl">{pageLink}</p><p className="mt-2 text-sm text-white/65">{t("Share it everywhere customers discover you.")}</p></div><div className="flex flex-wrap gap-2"><Button variant="white" className="flex-1 sm:flex-none" disabled={!businessInfo.isPublished} onClick={() => { void navigator.clipboard.writeText(pageLink); setCopied(true); window.setTimeout(() => setCopied(false), 1500); }} icon={copied ? <Check size={17} /> : <Copy size={17} />}>{copied ? t("Copied") : t("Copy link")}</Button><ButtonLink to={`/b/${businessInfo.slug}`} target="_blank" rel="noopener noreferrer" variant="white" className="flex-1 sm:flex-none" icon={<Eye size={17} />}>{t("View page")}</ButtonLink></div></div></Card>
    {(analyticsError || requestsError) && <div className="mt-5 space-y-2"><ErrorNotice message={analyticsReason instanceof Error ? analyticsReason.message : "Analytics could not be loaded"} />{requestsError && <ErrorNotice message={requestsReason instanceof Error ? requestsReason.message : "Requests could not be loaded"} />}</div>}
    <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4"><Stat label={t("Page views")} value={analyticsLoading ? "—" : (analytics?.pageViews ?? 0).toLocaleString()} icon={<Eye size={18} />} /><Stat label={t("Customer requests")} value={analyticsLoading ? "—" : String(analytics?.requests ?? 0)} icon={<FileText size={18} />} /><Stat label={t("Quotes sent")} value={analyticsLoading ? "—" : String(analytics?.quotes ?? 0)} icon={<Send size={18} />} /><Stat label={t("Accepted quote value")} value={analyticsLoading ? "—" : money(analytics?.quoteValue ?? 0)} icon={<TrendingUp size={18} />} /></div>
    <div className="mt-8 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]">
      <Card className="min-w-0 p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="font-display text-lg font-bold">{t("Conversion journey")}</p><p className="text-xs text-muted">{t("From page view to accepted quote")}</p></div></div><div className="mt-8 space-y-3">{(["visitors", "actions", "requests", "quotes", "acceptedQuotes"] as const).map((key, index) => { const labels = ["Visitors", "Actions", "Requests", "Quotes", "Accepted"]; const value = analytics?.funnel[key] ?? 0; const max = Math.max(analytics?.funnel.visitors ?? 0, 1); const width = Math.max(12, (value / max) * 100); return <div key={key} className="flex min-w-0 items-center gap-3"><span className="w-[4.5rem] shrink-0 text-xs text-muted sm:w-24 sm:text-sm">{t(labels[index] ?? "Visitors")}</span><div className="h-10 min-w-0 flex-1 overflow-hidden rounded-lg bg-[#f0f4ef]"><div className="h-full min-w-12 rounded-lg bg-violet-soft transition-all" style={{ width: `${Math.min(width, 100)}%` }}><span className="flex h-full items-center px-3 text-sm font-bold text-violet">{analyticsLoading ? "…" : value.toLocaleString()}</span></div></div></div>; })}</div></Card>
      <Card className="min-w-0 p-5 sm:p-6"><div className="flex items-center justify-between"><p className="font-display text-lg font-bold">{t("Customer actions")}</p><Sparkles size={18} className="text-violet" /></div><div className="mt-5 space-y-4">{([[MessageCircle, "WhatsApp clicks", analytics?.whatsappClicks ?? 0], [Phone, "Calls", analytics?.phoneClicks ?? 0], [Compass, "Directions", analytics?.directionsClicks ?? 0]] as Array<[LucideIcon, string, number]>).map(([Icon, label, value]) => <div key={label} className="flex min-w-0 items-center gap-3"><span className="icon-tile shrink-0"><Icon size={17} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-x-2 text-sm"><strong>{t(label)}</strong><span>{analyticsLoading ? "…" : value}</span></div></div></div>)}</div></Card>
    </div>
    <Card className="mt-8 overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4 sm:p-5"><div><p className="font-display font-bold">{t("Recent requests")}</p><p className="text-xs text-muted">{t("Customers waiting for your response")}</p></div><ButtonLink to="/dashboard/requests" variant="ghost">{t("View all")} <ArrowRight size={15} /></ButtonLink></div><RequestTable requests={requests ?? []} compact={true} loading={requestsLoading} /></Card>
  </div>;
}

function RequestTable({ requests, compact = false, loading = false }: { requests: RequestRecord[]; compact?: boolean; loading?: boolean }) {
  const { t } = useLanguage();
  if (loading) return <div className="p-6 text-sm text-muted">{t("Loading requests…")}</div>;
  if (!requests.length) return <div className="p-8 text-center text-sm text-muted">{t("No customer requests yet.")}</div>;
  return <div className="overflow-x-auto"><table className="w-full min-w-[44rem] text-left text-sm"><thead className="bg-[#faf9f6] text-xs uppercase tracking-wider text-muted"><tr><th className="px-5 py-3 font-semibold">{t("Customer / request")}</th><th className="px-5 py-3 font-semibold">{t("Date")}</th><th className="px-5 py-3 font-semibold">{t("Status")}</th><th className="px-5 py-3 font-semibold">{t("Estimated value")}</th><th className="px-5 py-3" /></tr></thead><tbody className="divide-y divide-line">{requests.slice(0, compact ? 3 : undefined).map((record) => <tr key={record.id} className="hover:bg-[#faf9f6]"><td className="px-5 py-4"><p className="font-bold">{record.customerName}</p><p className="mt-1 text-xs text-muted">{record.requestType} · {record.requestNumber}</p></td><td className="px-5 py-4 text-muted">{new Date(record.createdAt).toLocaleDateString()}</td><td className="px-5 py-4"><Badge tone={record.status === "NEW" ? "accent" : record.status === "ACCEPTED" ? "success" : "warning"}>{t(requestStatusLabel(record.status))}</Badge></td><td className="px-5 py-4 font-semibold">{record.quote ? money(record.quote.total) : record.budget ? money(record.budget) : "—"}</td><td className="px-5 py-4"><ButtonLink to={`/dashboard/requests/${record.id}`} variant="ghost">{t(record.status === "NEW" ? "Review" : "Open")} <ChevronRight size={15} /></ButtonLink></td></tr>)}</tbody></table></div>;
}

export function RequestsPage() {
  const { t } = useLanguage();
  const { data: user } = useCurrentUser();
  const businessId = user?.business?.id;
  const { data: requests, isLoading, isError, error } = useBusinessRequests<RequestRecord>(businessId);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const filtered = useMemo(() => (requests ?? []).filter((record) =>
    (status === "ALL" || record.status === status) &&
    `${record.customerName} ${record.requestType} ${record.requestNumber}`.toLowerCase().includes(search.toLowerCase())), [requests, search, status]);
  const statuses: RequestStatus[] = ["NEW", "REVIEWING", "QUOTE_SENT", "CUSTOMER_RESPONDED", "ACCEPTED", "REJECTED", "COMPLETED"];
  return <div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><Heading as="h1">{t("Customer requests")}</Heading><p className="mt-2 text-muted">{t("Review needs and turn requests into quotes.")}</p></div></div>{isError && <div className="mt-5"><ErrorNotice message={error instanceof Error ? error.message : t("Could not load requests")} /></div>}<div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">{statuses.slice(0, 4).map((value) => <Stat key={value} label={t(requestStatusLabel(value))} value={isLoading ? "—" : String((requests ?? []).filter((record) => record.status === value).length)} />)}</div><Card className="mt-6 overflow-hidden"><div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row"><div className="relative flex-1"><Search size={16} className="absolute left-3 top-3.5 text-muted" /><Input className="pl-9" placeholder={t("Search customers or requests...")} value={search} onChange={(event) => setSearch(event.target.value)} /></div><Select className="sm:!w-56" value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">{t("All statuses")}</option>{statuses.map((value) => <option key={value} value={value}>{t(requestStatusLabel(value))}</option>)}</Select></div><RequestTable requests={filtered} loading={isLoading} /></Card></div>;
}

export function RequestDetailPage() {
  const { t } = useLanguage();
  const { requestId = "" } = useParams();
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const { data: record, isLoading, isError, error } = useQuery<RequestRecord>({ queryKey: queryKeys.request(requestId), queryFn: () => requestService.get<RequestRecord>(requestId), enabled: Boolean(requestId) });
  const statusMutation = useMutation({ mutationFn: (status: RequestStatus) => requestService.updateStatus(requestId, status), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: queryKeys.request(requestId) }); if (user?.business?.id) void queryClient.invalidateQueries({ queryKey: queryKeys.requests(user.business.id) }); } });
  if (isLoading) return <div className="p-8 text-muted">{t("Loading request…")}</div>;
  if (isError || !record) return <div className="mx-auto max-w-3xl"><ErrorNotice message={error instanceof Error ? error.message : "Request not found"} /></div>;
  return <div className="mx-auto max-w-5xl"><ButtonLink to="/dashboard/requests" variant="ghost" className="mb-5"><ArrowRight className="rotate-180" size={16} /> {t("Back to requests")}</ButtonLink><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><Heading as="h1">Request #{record.requestNumber}</Heading><p className="mt-2 text-muted">{record.customerName} · {record.requestType}</p></div><Badge tone={record.status === "ACCEPTED" ? "success" : "warning"}>{t(requestStatusLabel(record.status))}</Badge></div>
    <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_.8fr]"><Card className="p-6"><p className="font-display text-lg font-bold">{t("Request details")}</p><div className="mt-5 space-y-4 text-sm"><div className="flex justify-between gap-4 border-b border-line pb-3"><span className="text-muted">{t("Customer")}</span><span className="font-semibold">{record.customerName}</span></div>{record.customerEmail && <div className="flex justify-between gap-4 border-b border-line pb-3"><span className="text-muted">{t("Email")}</span><a className="font-semibold text-violet" href={`mailto:${record.customerEmail}`}>{record.customerEmail}</a></div>}{(record.customerPhone || record.customerWhatsapp) && <div className="flex justify-between gap-4 border-b border-line pb-3"><span className="text-muted">{t("Phone")}</span><a className="font-semibold text-violet" href={`tel:${record.customerWhatsapp ?? record.customerPhone}`}>{record.customerWhatsapp ?? record.customerPhone}</a></div>}<div className="flex justify-between gap-4 border-b border-line pb-3"><span className="text-muted">{t("Date")}</span><span className="font-semibold">{new Date(record.createdAt).toLocaleString()}</span></div>{record.location && <div className="flex justify-between gap-4 border-b border-line pb-3"><span className="text-muted">{t("Location")}</span><span className="font-semibold">{record.location}</span></div>}{record.budget && <div className="flex justify-between gap-4 border-b border-line pb-3"><span className="text-muted">{t("Budget")}</span><span className="font-semibold">{money(record.budget)}</span></div>}<div><span className="text-muted">{t("Description")}</span><p className="mt-1 whitespace-pre-wrap font-semibold">{record.description || "No extra description."}</p></div>{record.answers.map((answer) => <div key={answer.id}><span className="text-muted">{answer.label}</span><p className="mt-1 whitespace-pre-wrap font-semibold">{Array.isArray(answer.value) ? answer.value.join(", ") : String(answer.value ?? "—")}</p></div>)}</div></Card>
      <Card className="h-fit p-6"><p className="font-display text-lg font-bold">{t("Quick actions")}</p><div className="mt-5 space-y-3">{record.quote ? <ButtonLink to={`/dashboard/quotes/${record.quote.id}`} variant="secondary" className="w-full"><FileText size={16} />{t("Open")} {record.quote.status === "DRAFT" ? t("draft quote") : t("quote")}</ButtonLink> : <ButtonLink to={`/dashboard/quotes/new?requestId=${record.id}`} className="w-full"><FileText size={16} />{t("Create quote")}</ButtonLink>}<Select aria-label={t("Update request status")} disabled={statusMutation.isPending} value={record.status} onChange={(event) => statusMutation.mutate(event.target.value as RequestStatus)}>{(["NEW", "REVIEWING", "QUOTE_SENT", "CUSTOMER_RESPONDED", "ACCEPTED", "REJECTED", "COMPLETED"] as RequestStatus[]).map((value) => <option key={value} value={value}>{t(requestStatusLabel(value))}</option>)}</Select>{statusMutation.isError && <ErrorNotice message={statusMutation.error.message} />}</div></Card></div></div>;
}

interface QuoteItemInput { name: string; description: string; quantity: number; unitPrice: number }
interface RequestSummary { id: string; requestNumber: string; customerName: string; customerEmail: string | null; customerPhone: string | null; customerWhatsapp: string | null; requestType: string; description: string; location: string | null; preferredDate: string | null; budget: number | string | null; answers: Array<{ id: string; label: string; value: unknown }> }

function quoteItemsFromOrder(description: string): QuoteItemInput[] {
  const orderBlock = description.match(/Order details:\s*([\s\S]*?)(?:\n\nCustomer note:|$)/)?.[1];
  if (!orderBlock) return [];
  return orderBlock.split("\n").flatMap((line) => {
    const match = line.match(/^(.+) × (\d+) — ([A-Z]{3}) ([\d,]+(?:\.\d+)?)$/);
    if (!match) return [];
    const quantity = Number(match[2]);
    const lineTotal = Number(match[4]?.replace(/,/g, ""));
    if (!match[1]?.trim() || !Number.isFinite(quantity) || quantity < 1 || !Number.isFinite(lineTotal)) return [];
    return [{ name: match[1].trim(), description: "", quantity, unitPrice: lineTotal / quantity }];
  });
}

export function CreateQuotePage() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editQuoteId = searchParams.get("quoteId") ?? "";
  const requestedId = searchParams.get("requestId") ?? searchParams.get("request") ?? "";
  const [items, setItems] = useState<QuoteItemInput[]>([{ name: "", description: "", quantity: 1, unitPrice: 0 }]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"FIXED" | "PERCENTAGE">("FIXED");
  const [validityDays, setValidityDays] = useState(7);
  const [notes, setNotes] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [depositAmount, setDepositAmount] = useState(0);
  const [estimatedCompletionDate, setEstimatedCompletionDate] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [draftQuoteId, setDraftQuoteId] = useState("");
  const [loadedQuoteId, setLoadedQuoteId] = useState("");
  const [loadedRequestId, setLoadedRequestId] = useState("");
  const existingQuoteQuery = useQuery<QuoteRecord>({ queryKey: ["quote", editQuoteId], queryFn: () => quoteService.get<QuoteRecord>(editQuoteId), enabled: Boolean(editQuoteId) });
  const requestId = requestedId || existingQuoteQuery.data?.request.id || "";
  const { data: record, isLoading, isError, error: loadError } = useQuery<RequestSummary>({ queryKey: queryKeys.request(requestId), queryFn: () => requestService.get<RequestSummary>(requestId), enabled: Boolean(requestId) });
  useEffect(() => {
    const quote = existingQuoteQuery.data;
    if (!quote || loadedQuoteId === quote.id) return;
    setItems(quote.items.map((item) => ({ name: item.name, description: item.description, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) })));
    setDiscount(quote.discountType === "PERCENTAGE" ? Number(quote.discountValue) : Number(quote.discount));
    setDiscountType(quote.discountType);
    setValidityDays(quote.validityDays);
    setNotes(quote.notes);
    setPaymentTerms(quote.paymentTerms);
    setDepositAmount(Number(quote.depositAmount));
    setEstimatedCompletionDate(quote.estimatedCompletionDate ? new Date(quote.estimatedCompletionDate).toISOString().slice(0, 10) : "");
    setDraftQuoteId(quote.id);
    setLoadedQuoteId(quote.id);
  }, [existingQuoteQuery.data, loadedQuoteId]);
  useEffect(() => {
    if (!record || editQuoteId || loadedRequestId === record.id || record.requestType !== "Product order") return;
    const orderItems = quoteItemsFromOrder(record.description);
    if (!orderItems.length) return;
    setItems(orderItems);
    setLoadedRequestId(record.id);
  }, [record, editQuoteId, loadedRequestId]);
  const subtotal = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
  const discountAmount = discountType === "PERCENTAGE" ? subtotal * Number(discount || 0) / 100 : Number(discount || 0);
  const total = subtotal - discountAmount;
  const itemsValid = items.every((item) => item.name.trim() && Number.isFinite(item.quantity) && item.quantity > 0 && Number.isFinite(item.unitPrice) && item.unitPrice >= 0);
  const handleCancel = () => {
    const hasChanges = items.some((item) => item.name.trim()) || Boolean(notes.trim() || paymentTerms.trim() || discount || depositAmount);
    if (!hasChanges || window.confirm("Discard this quote draft and return to the request?")) navigate(record ? `/dashboard/requests/${record.id}` : "/dashboard/quotes");
  };
  const saveQuote = async (send: boolean) => {
    if (!requestId || !itemsValid || total < 0 || depositAmount > total) return;
    setSending(true);
    setError("");
    try {
      const payload = {
        items: items.map((item, sortOrder) => ({ ...item, sortOrder })),
        discount,
        discountType,
        validityDays,
        notes,
        paymentTerms,
        depositAmount,
        estimatedCompletionDate: estimatedCompletionDate ? new Date(`${estimatedCompletionDate}T12:00:00.000Z`).toISOString() : null,
        currency: "RWF",
      };
      const result = draftQuoteId
        ? await quoteService.update<{ id: string }>(draftQuoteId, payload)
        : await quoteService.create<{ id: string }>(requestId, payload);
      setDraftQuoteId(result.id);
      if (send) await quoteService.send(result.id);
      navigate(`/dashboard/quotes/${result.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Quote could not be saved");
    } finally {
      setSending(false);
    }
  };
  if (existingQuoteQuery.isLoading || isLoading) return <div className="p-8 text-muted">{t("Loading quote details…")}</div>;
  if (existingQuoteQuery.isError) return <div className="mx-auto max-w-3xl"><ErrorNotice message={existingQuoteQuery.error.message} /><ButtonLink to="/dashboard/quotes" className="mt-5">{t("Back to quotes")}</ButtonLink></div>;
  if (isError || !record) return <div className="mx-auto max-w-3xl"><ErrorNotice message={loadError instanceof Error ? loadError.message : "Select a request before creating a quote"} /><ButtonLink to="/dashboard/requests" className="mt-5">{t("Back to requests")}</ButtonLink></div>;
  const quoteReady = itemsValid && total >= 0 && !(discountType === "PERCENTAGE" && discount > 100) && depositAmount <= total;
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <ButtonLink to={`/dashboard/requests/${record.id}`} variant="ghost" className="-ml-3">
        <ArrowRight className="rotate-180" size={16} /> Back to request
      </ButtonLink>

      <section className="overflow-hidden rounded-3xl bg-ink text-white shadow-float">
        <div className="relative px-6 py-7 sm:px-9 sm:py-9">
          <div className="absolute -right-16 -top-24 size-72 rounded-full bg-violet/30 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-white/60"><Sparkles size={14} /> {t("Quote workspace")}</p>
              <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">{draftQuoteId ? "Refine your quote" : "Create a quote"}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">Build a clear, itemized estimate for {record.customerName}. Review the total before you share it.</p>
            </div>
            <div className="self-start sm:self-auto"><Badge tone="neutral">{existingQuoteQuery.data?.status === "CHANGE_REQUESTED" ? "Revision requested" : "Draft"}</Badge></div>
          </div>
          <div className="relative mt-7 grid gap-3 border-t border-white/10 pt-5 text-sm sm:grid-cols-3">
            <div><p className="text-xs text-white/50">{t("Customer")}</p><p className="mt-1 font-semibold">{record.customerName}</p></div>
            <div><p className="text-xs text-white/50">{t("Request")}</p><p className="mt-1 font-semibold">{record.requestType}</p></div>
            <div><p className="text-xs text-white/50">{t("Reference")}</p><p className="mt-1 font-semibold">#{record.requestNumber}</p></div>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0 space-y-5">
          <Card className="overflow-hidden">
            <div className="border-b border-line bg-[#faf9f6] px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-violet-soft text-violet"><FileText size={17} /></span>
                <div><h2 className="font-display text-lg font-bold">{t("Request details")}</h2><p className="text-xs text-muted">{t("Use the customer's request to prepare an accurate estimate.")}</p></div>
              </div>
            </div>
            <div className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2 sm:p-6">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("Customer")}</p><p className="mt-1 font-semibold">{record.customerName}</p></div>
              {record.customerPhone && <div><p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("Phone")}</p><a href={`tel:${record.customerPhone}`} className="mt-1 block font-semibold text-violet">{record.customerPhone}</a></div>}
              {record.customerEmail && <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("Email")}</p><a href={`mailto:${record.customerEmail}`} className="mt-1 block break-all font-semibold text-violet">{record.customerEmail}</a></div>}
              {record.location && <div><p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("Location")}</p><p className="mt-1 font-semibold">{record.location}</p></div>}
              {record.preferredDate && <div><p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("Preferred date")}</p><p className="mt-1 font-semibold">{new Date(record.preferredDate).toLocaleDateString()}</p></div>}
              <div className="sm:col-span-2"><p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("Request summary")}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{record.description || "No additional description was provided."}</p></div>
              {record.answers.map((answer) => <div key={answer.id} className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-muted">{answer.label}</p><p className="mt-1 break-words whitespace-pre-wrap text-sm">{Array.isArray(answer.value) ? answer.value.join(", ") : String(answer.value ?? "—")}</p></div>)}
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <div className="flex flex-col justify-between gap-3 border-b border-line pb-5 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-coral-soft text-coral-dark"><Clipboard size={17} /></span>
                <div><h2 className="font-display text-lg font-bold">{t("Line items")}</h2><p className="text-xs text-muted">{t("Add each product, service, or fee as a separate item.")}</p></div>
              </div>
              <Badge tone="neutral">{items.length} {items.length === 1 ? "item" : "items"}</Badge>
            </div>

            <div className="mt-5 space-y-4">
              {items.map((item, index) => (
                <article key={index} className="min-w-0 rounded-2xl border border-line bg-[#fdfcfb] p-4 transition-colors focus-within:border-violet/40 sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-violet-soft text-sm font-bold text-violet">{String(index + 1).padStart(2, "0")}</span>
                      <p className="truncate text-sm font-bold">{item.name.trim() || `Item ${index + 1}`}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button type="button" variant="ghost" className="!size-9 !min-h-9 !p-0" aria-label={`Move item ${index + 1} up`} title="Move up" disabled={index === 0} onClick={() => setItems(items.map((entry, i) => i === index - 1 ? items[index]! : i === index ? items[index - 1]! : entry))}><ChevronUp size={16} /></Button>
                      <Button type="button" variant="ghost" className="!size-9 !min-h-9 !p-0" aria-label={`Move item ${index + 1} down`} title="Move down" disabled={index === items.length - 1} onClick={() => setItems(items.map((entry, i) => i === index ? items[index + 1]! : i === index + 1 ? items[index]! : entry))}><ChevronDown size={16} /></Button>
                      <Button type="button" variant="ghost" className="!size-9 !min-h-9 !p-0 text-coral-dark" aria-label={`Remove item ${index + 1}`} title="Remove item" disabled={items.length === 1} onClick={() => setItems(items.filter((_, i) => i !== index))}><Trash2 size={16} /></Button>
                    </div>
                  </div>
                  <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                    <div className="min-w-0 sm:col-span-2">
                      <Label htmlFor={`quote-item-name-${index}`}>{t("Item or service name")}</Label>
                      <Input id={`quote-item-name-${index}`} autoComplete="off" placeholder={t("e.g. Brake inspection, catering package")} value={item.name} onChange={(event) => setItems(items.map((entry, i) => i === index ? { ...entry, name: event.target.value } : entry))} />
                    </div>
                    <div className="min-w-0">
                      <Label htmlFor={`quote-item-quantity-${index}`}>{t("Quantity")}</Label>
                      <Input id={`quote-item-quantity-${index}`} type="number" min="0.001" step="any" inputMode="decimal" value={item.quantity} onChange={(event) => setItems(items.map((entry, i) => i === index ? { ...entry, quantity: Number(event.target.value) } : entry))} />
                    </div>
                    <div className="min-w-0">
                      <Label htmlFor={`quote-item-price-${index}`}>{t("Unit price")} <span className="font-normal text-muted">· RWF</span></Label>
                      <Input id={`quote-item-price-${index}`} type="number" min="0" step="any" inputMode="decimal" value={item.unitPrice} onChange={(event) => setItems(items.map((entry, i) => i === index ? { ...entry, unitPrice: Number(event.target.value) } : entry))} />
                    </div>
                    <div className="min-w-0 sm:col-span-2">
                      <Label htmlFor={`quote-item-description-${index}`}>{t("Description")} <span className="font-normal text-muted">(optional)</span></Label>
                      <Input id={`quote-item-description-${index}`} placeholder={t("Add useful details for your customer")} value={item.description} onChange={(event) => setItems(items.map((entry, i) => i === index ? { ...entry, description: event.target.value } : entry))} />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between rounded-xl bg-violet-soft/60 px-4 py-3">
                    <span className="text-sm font-medium text-muted">{t("Line total")}</span>
                    <span className="font-display font-bold text-ink">{money(item.quantity * item.unitPrice)}</span>
                  </div>
                </article>
              ))}
            </div>
            <Button type="button" variant="secondary" className="mt-4 w-full border-dashed sm:w-auto" icon={<Plus size={16} />} onClick={() => setItems([...items, { name: "", description: "", quantity: 1, unitPrice: 0 }])}>{t("Add another item")}</Button>
            {!itemsValid && <p className="mt-3 text-xs text-muted">{t("Each line needs an item name, a quantity above zero, and a valid unit price.")}</p>}
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="mb-5"><h2 className="font-display text-lg font-bold">{t("Terms and timing")}</h2><p className="text-xs text-muted">{t("Set expectations clearly before sending your quote.")}</p></div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div><Label htmlFor="quote-payment-terms">{t("Payment terms")} <span className="font-normal text-muted">(optional)</span></Label><Textarea id="quote-payment-terms" value={paymentTerms} onChange={(event) => setPaymentTerms(event.target.value)} placeholder="e.g. 50% deposit to begin; balance on completion" /></div>
              <div><Label htmlFor="quote-notes">{t("Notes and conditions")} <span className="font-normal text-muted">(optional)</span></Label><Textarea id="quote-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Included work, exclusions, or other useful details" /></div>
              <div><Label htmlFor="quote-completion">{t("Estimated completion")} <span className="font-normal text-muted">(optional)</span></Label><Input id="quote-completion" type="date" value={estimatedCompletionDate} onChange={(event) => setEstimatedCompletionDate(event.target.value)} /></div>
            </div>
          </Card>
        </div>

        <Card className="h-fit p-5 lg:sticky lg:top-28 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-violet-soft text-violet"><FileText size={17} /></span>
            <div><h2 className="font-display text-lg font-bold">{t("Quote summary")}</h2><p className="text-xs text-muted">{t("Live total · RWF")}</p></div>
          </div>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between text-muted"><span>Items ({items.length})</span><span>{money(subtotal)}</span></div>
            <div>
              <Label htmlFor="discount-type">{t("Discount")}</Label>
              <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
                <Input id="discount-value" aria-label={t("Discount value")} type="number" min="0" max={discountType === "PERCENTAGE" ? 100 : subtotal} inputMode="decimal" value={discount} onChange={(event) => setDiscount(Number(event.target.value))} />
                <Select id="discount-type" aria-label={t("Discount type")} value={discountType} onChange={(event) => setDiscountType(event.target.value as "FIXED" | "PERCENTAGE")}><option value="FIXED">{t("RWF")}</option><option value="PERCENTAGE">{t("Percent")}</option></Select>
              </div>
            </div>
            {discountAmount > 0 && <div className="flex justify-between text-muted"><span>{t("Discount applied")}</span><span>−{money(discountAmount)}</span></div>}
            <div className="rounded-2xl bg-ink p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/60">{t("Total quote")}</p>
              <p className="mt-2 break-words font-display text-3xl font-bold tracking-tight">{money(total)}</p>
              <p className="mt-2 text-xs text-white/55">{t("Taxes or payment are not collected here.")}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div><Label htmlFor="quote-deposit">{t("Deposit required")} <span className="font-normal text-muted">(optional)</span></Label><div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted">{t("RWF")}</span><Input id="quote-deposit" className="pl-14" type="number" min="0" max={Math.max(total, 0)} inputMode="decimal" value={depositAmount} onChange={(event) => setDepositAmount(Number(event.target.value))} /></div></div>
            <div><Label htmlFor="quote-validity">{t("Valid for")}</Label><Select id="quote-validity" value={validityDays} onChange={(event) => setValidityDays(Number(event.target.value))}><option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option></Select></div>
          </div>
          {error && <div className="mt-4"><ErrorNotice message={error} /></div>}
          <div className="mt-6 space-y-2 border-t border-line pt-5">
            <Button className="w-full" disabled={!quoteReady || sending} onClick={() => setShowPreview(true)} icon={<Eye size={17} />}>{t("Preview and send")}</Button>
            <Button variant="secondary" className="w-full" disabled={!quoteReady || sending} loading={sending} onClick={() => void saveQuote(false)}>{t("Save as draft")}</Button>
            <Button variant="ghost" className="w-full" disabled={sending} onClick={handleCancel}>{t("Cancel")}</Button>
          </div>
        </Card>
      </div>

      {showPreview && <div className="fixed inset-0 z-50 grid place-items-center bg-ink/55 p-4 backdrop-blur-sm"><Card className="max-h-[90vh] w-full max-w-xl overflow-y-auto p-6 shadow-float"><div className="flex items-start justify-between"><div><p className="eyebrow">{t("Customer preview")}</p><h2 className="font-display text-2xl font-bold">{record.requestType}</h2><p className="mt-1 text-sm text-muted">For {record.customerName} · #{record.requestNumber}</p></div><Button variant="ghost" onClick={() => setShowPreview(false)}>{t("Close")}</Button></div><div className="mt-5 space-y-3">{items.map((item, index) => <div key={index} className="flex justify-between gap-4 border-b border-line pb-3 text-sm"><span className="min-w-0">{item.name}<span className="block break-words text-xs text-muted">{item.description} · {item.quantity} × {money(item.unitPrice)}</span></span><strong className="shrink-0">{money(item.quantity * item.unitPrice)}</strong></div>)}</div><div className="mt-5 space-y-2 text-sm"><div className="flex justify-between"><span>{t("Subtotal")}</span><span>{money(subtotal)}</span></div>{discountAmount > 0 && <div className="flex justify-between text-muted"><span>{t("Discount")}</span><span>−{money(discountAmount)}</span></div>}<div className="flex justify-between border-t border-line pt-3 font-display text-xl font-bold"><span>{t("Total")}</span><span>{money(total)}</span></div></div>{paymentTerms && <p className="mt-4 whitespace-pre-wrap text-sm"><strong>{t("Payment terms:")}</strong> {paymentTerms}</p>}{notes && <p className="mt-4 whitespace-pre-wrap text-sm text-muted">{notes}</p>}{error && <div className="mt-4"><ErrorNotice message={error} /></div>}<Button className="mt-6 w-full" loading={sending} disabled={sending || !quoteReady} onClick={() => void saveQuote(true)} icon={<Send size={17} />}>{t("Send quote")}</Button><Button className="mt-2 w-full" variant="ghost" disabled={sending} onClick={() => void saveQuote(false)}>{t("Save as draft")}</Button></Card></div>}
    </div>
  );
}

export function QuoteDetailPage() {
  const { t } = useLanguage();
  const { quoteId = "" } = useParams();
  const queryClient = useQueryClient();
  const [reply, setReply] = useState("");
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState("");
  const { data: quote, isLoading, isError, error } = useQuery<QuoteRecord>({ queryKey: ["quote", quoteId], queryFn: () => quoteService.get<QuoteRecord>(quoteId), enabled: Boolean(quoteId) });
  const sendMutation = useMutation({
    mutationFn: () => quoteService.send<{ publicToken: string }>(quoteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["quote", quoteId] });
      void queryClient.invalidateQueries({ queryKey: ["quotes"] });
      void queryClient.invalidateQueries({ queryKey: ["quote-summary"] });
    },
  });
  const cancelMutation = useMutation({
    mutationFn: () => quoteService.cancel(quoteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["quote", quoteId] });
      void queryClient.invalidateQueries({ queryKey: ["quotes"] });
      void queryClient.invalidateQueries({ queryKey: ["quote-summary"] });
    },
  });
  const replyMutation = useMutation({
    mutationFn: () => quoteService.addBusinessMessage<QuoteRecord["messages"][number]>(quoteId, reply.trim()),
    onSuccess: () => {
      setReply("");
      void queryClient.invalidateQueries({ queryKey: ["quote", quoteId] });
    },
  });
  if (isLoading) return <div className="p-8 text-muted">{t("Loading quote…")}</div>;
  if (isError || !quote) return <div className="mx-auto max-w-3xl"><ErrorNotice message={error instanceof Error ? error.message : "Quote not found"} /></div>;
  const publicBaseUrl = (import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin).replace(/\/+$/, "");
  const publicUrl = `${publicBaseUrl}/q/${quote.publicToken}`;
  const customerNumber = quote.request.customerWhatsapp || quote.request.customerPhone || "";
  const customerDigits = customerNumber.replace(/\D/g, "");
  const whatsappRecipient = customerDigits.startsWith("0") ? `250${customerDigits.slice(1)}` : customerDigits;
  const whatsappMessage = `Hello ${quote.request.customerName}, your quote ${quote.quoteNumber} from ${quote.business?.name ?? "the business"} is ready. Review it securely here: ${publicUrl}`;
  const whatsappShareUrl = `https://wa.me/${whatsappRecipient}?text=${encodeURIComponent(whatsappMessage)}`;
  const copyPublicLink = async () => {
    setShareError("");
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (reason) {
      setShareError(reason instanceof Error ? reason.message : "Could not copy the customer link. Open Preview to copy it from the address bar.");
    }
  };
  const canEdit = quote.status === "DRAFT" || quote.status === "CHANGE_REQUESTED";
  return <div className="mx-auto max-w-5xl">
    <ButtonLink to="/dashboard/quotes" variant="ghost" className="mb-5"><ArrowRight className="rotate-180" size={16} /> {t("Back to quotes")}</ButtonLink>
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><Heading as="h1">Quote #{quote.quoteNumber}</Heading><p className="mt-2 text-muted">For {quote.request.customerName} · {quote.request.requestType} · Request {quote.request.requestNumber}</p></div><Badge tone={quoteStatusTone(quote.status)}>{t(quoteStatusLabel[quote.status])}</Badge></div>
    <Card className="mt-6 flex flex-col justify-between gap-5 p-6 sm:flex-row sm:items-center"><div><p className="font-display text-2xl font-bold">{money(quote.total)}</p><p className="mt-1 text-sm text-muted">Valid until {new Date(quote.validUntil).toLocaleDateString()}</p><p className="mt-1 text-xs text-muted">Last updated {new Date(quote.updatedAt).toLocaleString()}</p></div><div className="flex flex-wrap gap-2">{canEdit && <ButtonLink to={`/dashboard/quotes/new?requestId=${quote.request.id}&quoteId=${quote.id}`} variant="secondary" icon={<Pencil size={16} />}>{quote.status === "CHANGE_REQUESTED" ? "Revise quote" : "Edit draft"}</ButtonLink>}{quote.status === "DRAFT" && <Button loading={sendMutation.isPending} disabled={sendMutation.isPending} onClick={() => sendMutation.mutate()} icon={<Send size={16} />}>{t("Send quote")}</Button>}{quote.status !== "DRAFT" && quote.status !== "CANCELLED" && <><Button variant="secondary" onClick={() => window.open(whatsappShareUrl, "_blank", "noopener,noreferrer")} icon={<MessageCircle size={16} />}>{whatsappRecipient ? "Send to customer on WhatsApp" : "Share on WhatsApp"}</Button><Button variant="secondary" onClick={() => void copyPublicLink()} icon={<Copy size={16} />}>{copied ? "Link copied" : "Copy customer link"}</Button><ButtonLink to={`/q/${quote.publicToken}`} variant="ghost" icon={<Eye size={16} />}>{t("Preview")}</ButtonLink></>}{quote.status === "DRAFT" && <Button variant="ghost" disabled={cancelMutation.isPending} onClick={() => { if (window.confirm("Cancel this draft quote? This cannot be undone.")) cancelMutation.mutate(); }}>{t("Cancel draft")}</Button>}</div></Card>
    {shareError && <div className="mt-4"><ErrorNotice message={shareError} /></div>}{sendMutation.isError && <div className="mt-4"><ErrorNotice message={sendMutation.error.message} /></div>}{cancelMutation.isError && <div className="mt-4"><ErrorNotice message={cancelMutation.error.message} /></div>}{replyMutation.isError && <div className="mt-4"><ErrorNotice message={replyMutation.error.message} /></div>}
    {quote.status !== "DRAFT" && quote.status !== "CANCELLED" && <Card className="mt-6 p-6"><h2 className="font-display text-lg font-bold">{t("Customer conversation")}</h2>{quote.messages.length === 0 ? <p className="mt-3 text-sm text-muted">{t("Messages from the customer will appear here.")}</p> : <div className="mt-4 space-y-3">{quote.messages.map((message) => <div key={message.id} className={`rounded-xl p-4 ${message.senderType === "CUSTOMER" ? "bg-coral-soft/50" : "bg-violet-soft/60"}`}><div className="flex justify-between gap-3 text-xs text-muted"><strong>{message.senderType === "CUSTOMER" ? quote.request.customerName : "Your business"}</strong><time>{new Date(message.createdAt).toLocaleString()}</time></div><p className="mt-2 whitespace-pre-wrap text-sm">{message.message}</p></div>)}</div>}<div className="mt-5"><Label htmlFor="business-quote-reply">{t("Reply to customer")}</Label><Textarea id="business-quote-reply" className="mt-2" value={reply} onChange={(event) => setReply(event.target.value)} maxLength={2000} placeholder="Write a reply or clarification" /><Button className="mt-3" disabled={!reply.trim() || replyMutation.isPending} loading={replyMutation.isPending} onClick={() => replyMutation.mutate()} icon={<Send size={15} />}>{t("Send message")}</Button></div></Card>}
    <Card className="mt-6 p-6"><h2 className="font-display text-lg font-bold">{t("Quote items")}</h2><div className="mt-4 space-y-3">{quote.items.map((item) => <div key={item.id} className="flex justify-between gap-5 border-b border-line pb-3 text-sm"><span>{item.name}<span className="block text-xs text-muted">{item.description} · {item.quantity} × {money(item.unitPrice)}</span></span><strong>{money(item.total)}</strong></div>)}<div className="flex justify-between pt-2 text-sm"><span>{t("Subtotal")}</span><span>{money(quote.subtotal)}</span></div>{Number(quote.discount) > 0 && <div className="flex justify-between text-sm text-muted"><span>{t("Discount")}</span><span>−{money(quote.discount)}</span></div>}<div className="flex justify-between pt-2 font-display text-lg font-bold"><span>{t("Total")}</span><span>{money(quote.total)}</span></div>{Number(quote.depositAmount) > 0 && <div className="flex justify-between text-sm"><span>{t("Deposit required")}</span><strong>{money(quote.depositAmount)}</strong></div>}</div>{quote.paymentTerms && <p className="mt-4 text-sm"><strong>{t("Payment terms:")}</strong> {quote.paymentTerms}</p>}{quote.notes && <p className="mt-4 whitespace-pre-wrap text-sm text-muted">{quote.notes}</p>}</Card>
  </div>;
}

interface ResourceRecord {
  id: string;
  quoteNumber?: string;
  name?: string;
  title?: string;
  description?: string;
  imageUrl?: string | null;
  price?: number | string;
  startingPrice?: number | string;
  total?: number | string;
  status?: QuoteStatus;
  discountValue?: number | string;
  discountType?: "PERCENTAGE" | "FIXED";
  startsAt?: string;
  endsAt?: string;
  isActive?: boolean;
  isPublished?: boolean;
  request?: { customerName: string; requestType: string };
}

type ResourceType = "quotes" | "products" | "services" | "offers" | "settings" | "business-page";

export function ResourcePage({ type }: { type: ResourceType }) {
  const { t } = useLanguage();
  const { data: user } = useCurrentUser();
  const businessInfo = user?.business;
  const businessId = businessInfo?.id;
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", price: "", imageUrl: "", title: "", discountValue: "10", discountType: "PERCENTAGE", startsAt: new Date().toISOString().slice(0, 10), endsAt: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10) });
  const metadata: Record<ResourceType, [string, string, LucideIcon]> = {
    quotes: ["Quotes", "Create, send, and follow up on professional quotes.", FileText],
    products: ["Products", "Manage what customers can browse and order.", Package],
    services: ["Services", "Present services clearly and collect better requests.", Users],
    offers: ["Offers", "Create timely reasons for customers to act.", Gift],
    settings: ["Settings", "Manage your business and contact information.", Bell],
    "business-page": ["Business page", "Shape your public page without building a website.", Clipboard],
  };
  const [title, description, Icon] = metadata[type];
  const key: readonly unknown[] = [type, businessId];
  const quoteListQuery = useQuery<QuoteRecord[]>({
    queryKey: key,
    queryFn: () => quoteService.listByBusiness<QuoteRecord>(businessId!),
    enabled: Boolean(businessId && type === "quotes"),
  });
  const dataQuery = useQuery<ResourceRecord[]>({
    queryKey: key,
    queryFn: () => type === "products" ? productService.list<ResourceRecord>(businessId!) : type === "services" ? serviceService.list<ResourceRecord>(businessId!) : type === "offers" ? offerService.list<ResourceRecord>(businessId!) : Promise.resolve([]),
    enabled: Boolean(businessId && ["products", "services", "offers"].includes(type)),
  });
  const createMutation = useMutation({
    mutationFn: () => {
      const payload = type === "products"
        ? { name: form.name, description: form.description, price: Number(form.price), currency: "RWF", imageUrl: form.imageUrl || null }
        : type === "services"
          ? { name: form.name, description: form.description, startingPrice: Number(form.price), currency: "RWF", imageUrl: form.imageUrl || null }
          : { title: form.title, description: form.description, discountType: form.discountType, discountValue: Number(form.discountValue), startsAt: new Date(`${form.startsAt}T00:00:00.000Z`).toISOString(), endsAt: new Date(`${form.endsAt}T23:59:59.999Z`).toISOString() };
      if (editingId) return type === "products"
        ? productService.update(editingId, payload)
        : type === "services"
          ? serviceService.update(editingId, payload)
          : offerService.update(editingId, payload);
      return type === "products"
        ? productService.create(businessId!, payload)
        : type === "services"
          ? serviceService.create(businessId!, payload)
          : offerService.create(businessId!, payload);
    },
    onSuccess: () => { setShowCreate(false); setEditingId(null); setForm({ ...form, name: "", title: "", description: "", price: "", imageUrl: "" }); void queryClient.invalidateQueries({ queryKey: key }); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => type === "products" ? productService.delete(id) : type === "services" ? serviceService.delete(id) : offerService.delete(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: key }),
  });
  const publishMutation = useMutation({
    mutationFn: ({ item, active }: { item: ResourceRecord; active: boolean }) => type === "products"
      ? productService.publish(item.id, active)
      : type === "services"
        ? serviceService.publish(item.id, active)
        : offerService.setActive(item.id, active),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: key }),
  });
  const openEdit = (item: ResourceRecord) => {
    setEditingId(item.id);
    setForm({
      name: item.name ?? "",
      title: item.title ?? "",
      description: item.description ?? "",
      price: String(type === "products" ? item.price ?? "" : item.startingPrice ?? ""),
      imageUrl: item.imageUrl ?? "",
      discountValue: String(item.discountValue ?? 10),
      discountType: item.discountType ?? "PERCENTAGE",
      startsAt: item.startsAt ? new Date(item.startsAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      endsAt: item.endsAt ? new Date(item.endsAt).toISOString().slice(0, 10) : new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    });
    setShowCreate(true);
  };
  const items = dataQuery.data ?? [];
  if (type === "quotes") return <QuotesManagement businessId={businessId ?? ""} quotes={quoteListQuery.data ?? []} isLoading={quoteListQuery.isLoading} error={quoteListQuery.error} />;
  if (type === "settings" || type === "business-page") return <SettingsLike title={title} description={description} custom={type === "business-page"} />;
  return <div className="mx-auto max-w-7xl">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><Heading as="h1">{t(title)}</Heading><p className="mt-2 text-muted">{t(description)}</p></div><Button icon={<Plus size={17} />} onClick={() => { setEditingId(null); setForm({ ...form, name: "", title: "", description: "", price: "", imageUrl: "" }); setShowCreate(!showCreate); }}>{t("New")} {t(type.slice(0, -1))}</Button></div>
    {(type === "products" || type === "services") && businessInfo && (!businessInfo.canPublishProducts || !businessInfo.productAccessExpiresAt || new Date(businessInfo.productAccessExpiresAt) <= new Date()) && <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[#f0dfc8] bg-[#fff8ec] p-4 text-sm text-[#76522a]"><ShieldAlert size={18} className="mt-0.5 shrink-0 text-[#c27a26]" /><div><p><strong>{t("Publishing products and services needs an active plan.")}</strong> {t("You can prepare your catalog; listings stay private until checkout activates access.")}</p><Link className="mt-2 inline-flex items-center gap-1 font-bold text-[#075b43]" to="/dashboard/billing">{t("Choose a plan")} <ArrowRight size={14} /></Link></div></div>}
    {showCreate && <Card className="mt-6 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">{t(editingId ? "Update your catalog" : "Grow your catalog")}</p><h2 className="font-display text-xl font-bold">{`${t(editingId ? "Edit" : "Add")} ${t(type.slice(0, -1))}`}</h2><p className="mt-1 text-sm text-muted">{t(type === "offers" ? "Make the offer clear and easy for customers to understand." : "Add a photo and a few helpful details so customers know what to expect.")}</p></div><span className="icon-tile"><Icon size={18} /></span></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {type === "offers" ? <>
          <div><Label htmlFor="offer-title">{t("Title")}</Label><Input id="offer-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder={t("e.g. New customer discount")} /></div>
          <div><Label htmlFor="discount-type">{t("Discount type")}</Label><Select id="discount-type" value={form.discountType} onChange={(event) => setForm({ ...form, discountType: event.target.value })}><option value="PERCENTAGE">{t("Percentage")}</option><option value="FIXED">{t("Fixed amount")}</option></Select></div>
          <div><Label htmlFor="discount-value">{t("Discount value")}</Label><Input id="discount-value" type="number" min="0" max={form.discountType === "PERCENTAGE" ? 100 : undefined} value={form.discountValue} onChange={(event) => setForm({ ...form, discountValue: event.target.value })} /></div>
          <div><Label htmlFor="offer-end">{t("End date")}</Label><Input id="offer-end" type="date" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} /></div>
        </> : <>
          <div><Label htmlFor="item-name">{t(type === "products" ? "Product name" : "Service name")}</Label><Input id="item-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={t(type === "products" ? "e.g. Handmade ceramic pot" : "e.g. Event catering")} /></div>
          <div><Label htmlFor="item-price">{t(type === "products" ? "Price" : "Starting price")}</Label><Input id="item-price" type="number" min="0" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} placeholder="0" /></div>
        </>}
        <div className="sm:col-span-2"><Label htmlFor="item-description">{t("Description")}</Label><Textarea id="item-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder={t(type === "products" ? "What makes this product special?" : "What should customers know about this service?")} /></div>
        {(type === "products" || type === "services") && <div className="sm:col-span-2"><ImageUploadField title={t(type === "products" ? "Product image" : "Service image")} description={t("Show customers what they can expect. JPEG, PNG, WebP or GIF · up to 8 MB.")} value={form.imageUrl} onChange={(imageUrl) => setForm({ ...form, imageUrl })} /></div>}
      </div>
      {createMutation.isError && <div className="mt-4"><ErrorNotice message={createMutation.error.message} /></div>}
      {deleteMutation.isError && <div className="mt-4"><ErrorNotice message={deleteMutation.error.message} /></div>}
      {publishMutation.isError && <div className="mt-4"><ErrorNotice message={publishMutation.error.message} /></div>}
      <div className="mt-5 flex justify-end gap-2"><Button variant="secondary" onClick={() => { setShowCreate(false); setEditingId(null); }}>{t("Cancel")}</Button><Button loading={createMutation.isPending} disabled={createMutation.isPending || (type === "offers" ? !form.title.trim() : !form.name.trim())} onClick={() => createMutation.mutate()}>{t(editingId ? "Save changes" : "Save")}</Button></div>
    </Card>}
    {dataQuery.isError && <div className="mt-6"><ErrorNotice message={dataQuery.error.message} /></div>}
    {deleteMutation.isError && !showCreate && <div className="mt-5"><ErrorNotice message={deleteMutation.error.message} /></div>}
    {publishMutation.isError && !showCreate && <div className="mt-5"><ErrorNotice message={publishMutation.error.message} /></div>}
    {dataQuery.isLoading ? <p className="mt-8 text-sm text-muted">{t("Loading")} {t(title.toLowerCase())}…</p> : items.length ? <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => <Card key={item.id} className="group overflow-hidden transition hover:-translate-y-1 hover:shadow-card">
      {type !== "offers" && <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-violet-soft to-coral-soft">{item.imageUrl ? <img src={resolveAssetUrl(item.imageUrl)} alt={item.name ? `${item.name} image` : ""} className="size-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="grid size-full place-items-center text-violet/70"><Image size={30} strokeWidth={1.5} /></div>}<span className="absolute right-3 top-3"><Badge tone={item.isActive || item.isPublished ? "success" : "neutral"}>{item.isActive || item.isPublished ? "Published" : "Hidden"}</Badge></span></div>}
      <div className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-display text-lg font-bold">{item.name ?? item.title}</p><p className="mt-2 min-h-10 text-sm text-muted">{item.description}</p></div>{type === "offers" && <Badge tone={item.isActive ? "success" : "neutral"}>{item.isActive ? "Active" : "Hidden"}</Badge>}</div><div className="mt-5 flex items-center justify-between border-t border-line pt-4"><span className="font-bold">{type === "products" ? money(item.price ?? 0) : type === "services" ? `From ${money(item.startingPrice ?? 0)}` : `${item.discountType === "PERCENTAGE" ? `${item.discountValue}%` : money(item.discountValue ?? 0)} OFF`}</span></div><div className="mt-4 flex flex-wrap gap-2"><Button variant="secondary" onClick={() => openEdit(item)} icon={<Pencil size={15} />}>{t("Edit")}</Button><Button variant="ghost" disabled={type === "products" && !item.isPublished && !businessInfo?.canPublishProducts} onClick={() => publishMutation.mutate({ item, active: type === "offers" ? !item.isActive : !item.isPublished })}>{(type === "offers" ? item.isActive : item.isPublished) ? (type === "offers" ? "Deactivate" : "Unpublish") : (type === "offers" ? "Activate" : "Publish")}</Button><Button variant="ghost" aria-label={`Delete ${item.name ?? item.title ?? "item"}`} onClick={() => deleteMutation.mutate(item.id)} icon={<Trash2 size={16} />}>{t("Delete")}</Button></div></div></Card>)}</div> : <Card className="mt-8 p-10 text-center"><p className="font-display text-lg font-bold">{t("No")} {t(title.toLowerCase())} {t("yet")}</p><p className="mt-2 text-sm text-muted">{t("Add your first")} {t(type.slice(0, -1))} {t("to show it here.")}</p></Card>}
  </div>;
}

function SettingsLike({ title, description, custom }: { title: string; description: string; custom: boolean }) {
  const { t } = useLanguage();
  const { data: user } = useCurrentUser();
  const businessInfo = user?.business;
  const queryClient = useQueryClient();
  const [values, setValues] = useState({ name: businessInfo?.name ?? "", category: businessInfo?.category ?? "", email: "", description: "", phone: "", city: "", address: "" });
  const [loaded, setLoaded] = useState(false);
  const { data: business, isLoading, isError, error } = useQuery<{ name: string; category: string; description: string; email: string | null; phone: string | null; city: string | null; address: string | null }>({
    queryKey: queryKeys.business(businessInfo?.id ?? ""),
    queryFn: () => businessService.get(businessInfo!.id),
    enabled: Boolean(businessInfo?.id),
  });
  useEffect(() => {
    if (!business || loaded) return;
    setValues({ name: business.name, category: business.category, email: business.email ?? "", description: business.description, phone: business.phone ?? "", city: business.city ?? "", address: business.address ?? "" });
    setLoaded(true);
  }, [business, loaded]);
  const mutation = useMutation({
    mutationFn: () => businessService.update(businessInfo!.id, values),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: queryKeys.business(businessInfo!.id) }); void queryClient.invalidateQueries({ queryKey: queryKeys.currentUser }); },
  });
  if (isLoading) return <p className="p-6 text-muted">{t("Loading business information…")}</p>;
  return <div className="mx-auto max-w-6xl"><Heading as="h1">{title}</Heading><p className="mt-2 text-muted">{description}</p>{isError && <div className="mt-5"><ErrorNotice message={error.message} /></div>}<div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]"><Card className="p-6"><div className="grid gap-5 sm:grid-cols-2"><div><Label htmlFor="setting-name">{t("Business name")}</Label><Input id="setting-name" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} /></div><div><Label htmlFor="setting-category">{t("Category")}</Label><Input id="setting-category" value={values.category} onChange={(event) => setValues({ ...values, category: event.target.value })} /></div><div><Label htmlFor="setting-email">{t("Business email")}</Label><Input id="setting-email" type="email" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} /></div><div><Label htmlFor="setting-phone">{t("Phone")}</Label><Input id="setting-phone" type="tel" value={values.phone} onChange={(event) => setValues({ ...values, phone: event.target.value })} /></div><div><Label htmlFor="setting-city">{t("City")}</Label><Input id="setting-city" value={values.city} onChange={(event) => setValues({ ...values, city: event.target.value })} /></div><div><Label htmlFor="setting-address">{t("Address")}</Label><Input id="setting-address" value={values.address} onChange={(event) => setValues({ ...values, address: event.target.value })} /></div><div className="sm:col-span-2"><Label htmlFor="setting-description">{t("Description")}</Label><Textarea id="setting-description" value={values.description} onChange={(event) => setValues({ ...values, description: event.target.value })} /></div></div>{mutation.isError && <div className="mt-4"><ErrorNotice message={mutation.error.message} /></div>}{mutation.isSuccess && <p className="mt-4 text-sm font-semibold text-success">{t("Business information saved.")}</p>}<Button className="mt-6" loading={mutation.isPending} disabled={mutation.isPending} onClick={() => mutation.mutate()}>{t("Save changes")}</Button></Card><Card className="h-fit p-5"><p className="font-display font-bold">{t(custom ? "Page publishing" : "Workspace")}</p><p className="mt-2 text-sm text-muted">{custom ? t("Publish or unpublish the public business page.") : `${t("Owner access")} · ${business?.name ?? t("Business")}`}</p>{custom && <PublishControl businessId={businessInfo?.id} published={businessInfo?.isPublished ?? false} />}</Card></div></div>;
}

function PublishControl({ businessId, published }: { businessId: string | undefined; published: boolean }) {
  const { t } = useLanguage();
  const client = useQueryClient();
  const mutation = useMutation({ mutationFn: () => businessService.publish(businessId!, !published), onSuccess: () => { void client.invalidateQueries({ queryKey: queryKeys.currentUser }); } });
  return <div className="mt-5"><Button variant={published ? "secondary" : "primary"} disabled={!businessId || mutation.isPending} loading={mutation.isPending} onClick={() => mutation.mutate()}>{published ? t("Unpublish page") : t("Publish page")}</Button>{mutation.isError && <div className="mt-3"><ErrorNotice message={mutation.error.message} /></div>}</div>;
}

export function AnalyticsPage() {
  const { t } = useLanguage();
  const { data: user } = useCurrentUser();
  const { data: analytics, isLoading, isError, error } = useBusinessAnalytics<AnalyticsRecord>(user?.business?.id);
  const funnel: Array<[string, number]> = [["Visitors", analytics?.funnel.visitors ?? 0], ["Actions", analytics?.funnel.actions ?? 0], ["Requests", analytics?.funnel.requests ?? 0], ["Quotes", analytics?.funnel.quotes ?? 0], ["Accepted", analytics?.funnel.acceptedQuotes ?? 0]];
  const actions: Array<[LucideIcon, string, number]> = [[MessageCircle, "WhatsApp", analytics?.whatsappClicks ?? 0], [FileText, "Quote request", analytics?.requests ?? 0], [Phone, "Call", analytics?.phoneClicks ?? 0], [BarChart3, "Directions", analytics?.directionsClicks ?? 0]];
  return <div className="mx-auto max-w-7xl"><Heading as="h1">{t("Analytics")}</Heading><p className="mt-2 text-muted">{t("See how discovery becomes customer action—and where to improve.")}</p>{isError && <div className="mt-5"><ErrorNotice message={error.message} /></div>}<div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4"><Stat label={t("Page views")} value={isLoading ? "—" : String(analytics?.pageViews ?? 0)} /><Stat label={t("Total actions")} value={isLoading ? "—" : String(analytics?.funnel.actions ?? 0)} /><Stat label={t("Requests")} value={isLoading ? "—" : String(analytics?.requests ?? 0)} /><Stat label={t("Accepted quote value")} value={isLoading ? "—" : money(analytics?.quoteValue ?? 0)} /></div><div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]"><Card className="p-6"><p className="font-display text-lg font-bold">{t("Conversion journey")}</p><p className="mt-1 text-sm text-muted">{t("From page view to accepted quote")}</p><div className="mt-8 space-y-3">{funnel.map(([label, value], index) => <div key={label} className="flex items-center gap-4"><span className="w-24 text-sm text-muted">{t(label)}</span><div className="h-10 min-w-12 rounded-lg bg-violet-soft" style={{ width: `${Math.max(12, value / Math.max(analytics?.pageViews ?? 1, 1) * 100)}%` }}><span className="flex h-full items-center px-4 text-sm font-bold text-violet">{isLoading ? "…" : value.toLocaleString()}</span></div></div>)}</div></Card><Card className="p-6"><p className="font-display text-lg font-bold">{t("Top customer actions")}</p><div className="mt-6 space-y-5">{actions.map(([Icon, label, value]) => <div key={label} className="flex items-center gap-3"><span className="icon-tile"><Icon size={17} /></span><div className="flex-1"><div className="flex justify-between text-sm"><strong>{t(label)}</strong><span>{isLoading ? "…" : value}</span></div><div className="mt-2 h-1.5 rounded-full bg-line"><div className="h-full rounded-full bg-coral" style={{ width: `${Math.min(100, value / Math.max(actions[0]![2], 1) * 100)}%` }} /></div></div></div>)}</div></Card></div></div>;
}
