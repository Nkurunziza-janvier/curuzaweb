import { Activity, ArrowRight, Ban, Building2, Check, Clock3, Eye, EyeOff, PackageCheck, Search, ShieldAlert, ShieldCheck, Store, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Card, Heading, Input, Select, Stat } from "../components/ui";
import { adminService } from "../services/api";
import { useLanguage } from "../i18n";

interface AdminBusiness {
  id: string;
  name: string;
  slug: string;
  category: string;
  city: string | null;
  country: string;
  createdAt: string;
  isPublished: boolean;
  canPublishProducts: boolean;
  productAccessExpiresAt: string | null;
  isBlocked: boolean;
  owner: { id: string; name: string; email: string };
  _count: { products: number; requests: number };
}

interface AdminOverview {
  businessCount: number;
  publishedBusinessCount: number;
  productCount: number;
  requestCount: number;
  pendingProductApprovalCount: number;
  recentRegistrations: number;
  recentBusinesses: Array<Pick<AdminBusiness, "id" | "name" | "category" | "city" | "createdAt" | "isPublished" | "canPublishProducts" | "productAccessExpiresAt"> & { owner: Pick<AdminBusiness["owner"], "name" | "email"> }>;
}

interface AdminActivity {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  createdAt: string;
  actor: { name: string; email: string };
  business: { id: string; name: string } | null;
}

const businessQueryKey = ["admin", "businesses"] as const;
const overviewQueryKey = ["admin", "overview"] as const;
const activityQueryKey = ["admin", "activity"] as const;
const hasActiveProductAccess = (business: Pick<AdminBusiness, "canPublishProducts" | "productAccessExpiresAt">) => business.canPublishProducts && Boolean(business.productAccessExpiresAt && new Date(business.productAccessExpiresAt) > new Date());

function AdminError({ children }: { children: string }) {
  return <div role="alert" className="rounded-xl border border-[#f1cdca] bg-[#fff4f2] px-4 py-3 text-sm text-[#9a3e35]">{children}</div>;
}

function AdminLoading({ label }: { label: string }) {
  const { t } = useLanguage();
  return <Card className="mt-6 p-8 text-center text-sm text-muted">{t("Loading")} {t(label)}…</Card>;
}

function BusinessPermission({ business, onUpdate, busy }: { business: AdminBusiness; onUpdate: (payload: { isPublished?: boolean }) => void; busy: boolean }) {
  const { t } = useLanguage();
  return <div className="flex flex-wrap gap-2">
    <Link className="admin-review-link min-h-9 px-3 text-xs" to="/admin/payments"><PackageCheck size={14} /> {t("Payment review")}</Link>
    <Button variant="ghost" className="min-h-9 px-3 text-xs" disabled={busy || business.isBlocked} onClick={() => onUpdate({ isPublished: !business.isPublished })} icon={business.isPublished ? <EyeOff size={14} /> : <Eye size={14} />}>
      {business.isPublished ? t("Unpublish page") : t("Publish page")}
    </Button>
  </div>;
}

export function AdminOverviewPage() {
  const { t } = useLanguage();
  const { data, isLoading, isError, error } = useQuery<AdminOverview>({ queryKey: overviewQueryKey, queryFn: () => adminService.overview<AdminOverview>() });
  return <div className="mx-auto max-w-7xl">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="admin-eyebrow">{t("Platform control center")}</p><Heading as="h1">{t("Good to see you, admin.")}</Heading><p className="mt-2 text-muted">{t("A live view of registered businesses and platform activity.")}</p></div><Link className="admin-date-chip" to="/admin/activity"><Activity size={15} /> {t("Admin activity")} <ArrowRight size={14} /></Link></div>
    {isError && <div className="mt-6"><AdminError>{error.message}</AdminError></div>}
    {isLoading ? <AdminLoading label="platform overview" /> : data && <>
      <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Stat label={t("Registered businesses")} value={String(data.businessCount)} icon={<Building2 size={18} />} />
        <Stat label={t("Live business pages")} value={String(data.publishedBusinessCount)} icon={<Store size={18} />} />
        <Stat label={t("Payment reviews")} value={String(data.pendingProductApprovalCount)} note={t("Awaiting verification")} icon={<ShieldAlert size={18} />} />
        <Stat label={t("Catalog products")} value={String(data.productCount)} icon={<PackageCheck size={18} />} />
        <Stat label={t("Customer requests")} value={String(data.requestCount)} icon={<Users size={18} />} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_.75fr]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-6"><div><h2 className="font-display text-base font-bold">{t("Recently registered")}</h2><p className="mt-1 text-xs text-muted">{data.recentRegistrations} {t("joined in the last 30 days")}</p></div><Link className="admin-text-link" to="/admin/businesses">{t("Manage all")} <ArrowRight size={14} /></Link></div>
          {data.recentBusinesses.length ? <div className="divide-y divide-line">{data.recentBusinesses.map((business) => <div key={business.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div className="flex min-w-0 items-center gap-3"><span className="admin-business-icon"><Store size={17} /></span><div className="min-w-0"><p className="truncate text-sm font-bold">{business.name}</p><p className="mt-1 truncate text-xs text-muted">{business.owner.name} · {business.owner.email}</p></div></div><div className="flex flex-wrap items-center gap-2 sm:justify-end"><Badge tone={hasActiveProductAccess(business) ? "success" : "warning"}>{hasActiveProductAccess(business) ? t("Products enabled") : t("No active plan")}</Badge><Badge tone={business.isPublished ? "success" : "neutral"}>{business.isPublished ? t("Live") : t("Unpublished")}</Badge></div></div>)}</div> : <p className="p-6 text-sm text-muted">{t("No businesses registered yet.")}</p>}
        </Card>
        <Card className="admin-attention-card h-fit p-5 sm:p-6"><span className="admin-attention-icon"><ShieldCheck size={19} /></span><p className="mt-4 font-display text-lg font-bold">{t("Verify payment & activate")}</p><p className="mt-2 text-sm leading-relaxed text-muted">{t("Check each Mobile Money transaction, then approve the subscription to enable product publishing.")}</p><div className="mt-5 flex items-center justify-between border-t border-line pt-4"><span className="text-sm font-semibold">{t("Payments awaiting review")}</span><strong className="font-display text-2xl text-[#075b43]">{data.pendingProductApprovalCount}</strong></div><Link className="admin-review-link mt-4" to="/admin/payments">{t("Open payment reviews")} <ArrowRight size={15} /></Link></Card>
      </div>
    </>}
  </div>;
}

export function AdminBusinessesPage() {
  const { t } = useLanguage();
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get("search") ?? "");
  const [filter, setFilter] = useState(new URLSearchParams(window.location.search).get("filter") ?? "all");
  const [actionError, setActionError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { data = [], isLoading, isError, error } = useQuery<AdminBusiness[]>({ queryKey: businessQueryKey, queryFn: () => adminService.businesses<AdminBusiness>() });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { canPublishProducts?: boolean; isPublished?: boolean; isBlocked?: boolean } }) => adminService.updateBusiness(id, payload),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: businessQueryKey }); void queryClient.invalidateQueries({ queryKey: overviewQueryKey }); void queryClient.invalidateQueries({ queryKey: activityQueryKey }); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminService.deleteBusiness(id),
    onSuccess: () => { setActionError(null); void queryClient.invalidateQueries({ queryKey: businessQueryKey }); void queryClient.invalidateQueries({ queryKey: overviewQueryKey }); void queryClient.invalidateQueries({ queryKey: activityQueryKey }); },
    onError: (error: Error) => setActionError(error.message),
  });
  const filtered = useMemo(() => data.filter((business) => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || [business.name, business.owner.name, business.owner.email, business.category, business.city ?? ""].some((value) => value.toLowerCase().includes(term));
    const matchesFilter = filter === "all" || (filter === "pending" && !hasActiveProductAccess(business)) || (filter === "live" && business.isPublished) || (filter === "unpublished" && !business.isPublished) || (filter === "blocked" && business.isBlocked);
    return matchesSearch && matchesFilter;
  }), [data, filter, search]);

  return <div className="mx-auto max-w-7xl">
    <div><p className="admin-eyebrow">{t("Access & visibility")}</p><Heading as="h1">{t("Business management")}</Heading><p className="mt-2 text-muted">{t("Review registered businesses, approve product publishing, and control public pages.")}</p></div>
    {updateMutation.isError && <div className="mt-5"><AdminError>{updateMutation.error.message}</AdminError></div>}
    {actionError && <div className="mt-5"><AdminError>{actionError}</AdminError></div>}
    <Card className="mt-6 p-4 sm:p-5"><div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem_auto] md:items-center"><label className="admin-search-field"><Search size={17} /><Input aria-label={t("Search businesses")} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Search name, owner, email, city…")} /></label><Select aria-label={t("Filter businesses")} value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">{t("All businesses")}</option><option value="pending">{t("No active product plan")}</option><option value="live">{t("Published pages")}</option><option value="unpublished">{t("Unpublished pages")}</option><option value="blocked">{t("Blocked businesses")}</option></Select><span className="px-1 text-sm text-muted">{filtered.length} {t("businesses")}</span></div></Card>
    {isError && <div className="mt-5"><AdminError>{error.message}</AdminError></div>}
    {isLoading ? <AdminLoading label="businesses" /> : filtered.length ? <div className="mt-5 grid gap-4">{filtered.map((business) => {
      const busy = updateMutation.isPending && updateMutation.variables?.id === business.id;
      return <Card key={business.id} className="p-4 sm:p-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div className="flex min-w-0 items-start gap-3"><span className="admin-business-icon mt-0.5"><Store size={18} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-display font-bold">{business.name}</h2><Badge tone={business.isBlocked ? "warning" : business.isPublished ? "success" : "neutral"}>{business.isBlocked ? t("Blocked") : business.isPublished ? t("Page live") : t("Page hidden")}</Badge><Badge tone={business.canPublishProducts ? "success" : "warning"}>{business.canPublishProducts ? t("Products enabled") : t("Approval needed")}</Badge></div><p className="mt-1 break-all text-sm text-muted">{business.owner.name} · {business.owner.email}</p><p className="mt-1 text-xs text-muted">{business.category} · {[business.city, business.country].filter(Boolean).join(", ")} · {t("Joined")} {new Date(business.createdAt).toLocaleDateString()}</p><p className="mt-2 text-xs font-medium text-[#526a5d]">{business._count.products} {t("catalog products")} <span className="px-1 text-[#c0c9c1]">·</span> {business._count.requests} {t("customer requests")}</p></div></div><div className="flex flex-wrap gap-2"><BusinessPermission business={business} busy={busy || deleteMutation.isPending} onUpdate={(payload) => updateMutation.mutate({ id: business.id, payload })} /><Button variant={business.isBlocked ? "secondary" : "ghost"} className="min-h-9 px-3 text-xs" disabled={busy || deleteMutation.isPending} onClick={() => updateMutation.mutate({ id: business.id, payload: { isBlocked: !business.isBlocked } })} icon={<Ban size={14} />}>{business.isBlocked ? t("Unblock business") : t("Block business")}</Button><Button variant="ghost" className="min-h-9 px-3 text-xs text-[#a33d35] hover:bg-[#fff4f2]" disabled={deleteMutation.isPending} onClick={() => { if (window.confirm(`Permanently delete ${business.name}, its data, and the owner's login account? The owner will no longer be able to sign in. This cannot be undone.`)) deleteMutation.mutate(business.id); }} icon={<Trash2 size={14} />}>{t("Delete")}</Button></div></div></Card>;
    })}</div> : <Card className="mt-5 p-10 text-center"><p className="font-display font-bold">{t("No matching businesses")}</p><p className="mt-2 text-sm text-muted">{t("Try a different search or filter.")}</p></Card>}
  </div>;
}

export function AdminActivityPage() {
  const { t } = useLanguage();
  const { data = [], isLoading, isError, error } = useQuery<AdminActivity[]>({ queryKey: activityQueryKey, queryFn: () => adminService.activity<AdminActivity>() });
  return <div className="mx-auto max-w-6xl">
    <div><p className="admin-eyebrow">{t("Accountability")}</p><Heading as="h1">{t("Admin activity")}</Heading><p className="mt-2 text-muted">{t("A record of platform access and visibility changes made by administrators.")}</p></div>
    {isError && <div className="mt-6"><AdminError>{error.message}</AdminError></div>}
    {isLoading ? <AdminLoading label="admin activity" /> : <Card className="mt-6 overflow-hidden">
          {data.length ? <div className="divide-y divide-line">{data.map((entry) => <article key={entry.id} className="flex gap-3 p-4 sm:gap-4 sm:p-5"><span className="admin-activity-icon"><Clock3 size={16} /></span><div className="min-w-0 flex-1"><p className="text-sm font-bold">{entry.business?.name ?? (typeof entry.details?.businessName === "string" ? entry.details.businessName : t("Business removed"))}</p><p className="mt-1 text-sm text-muted">{entry.actor.name} ({entry.actor.email}) {entry.action === "BUSINESS_DELETED" ? t("deleted this business and its data.") : entry.action === "BUSINESS_SETTINGS_UPDATED" ? t("updated business access and visibility.") : entry.action.toLowerCase().replace(/_/g, " ") + "."}</p>{entry.details && <div className="mt-3 flex flex-wrap gap-2">{Object.entries(entry.details).map(([key, value]) => { if (value && typeof value === "object" && "from" in value && "to" in value) { const change = value as { from: boolean; to: boolean }; const label = key === "canPublishProducts" ? t("Product access") : key === "isBlocked" ? t("Blocked") : t("Page visibility"); return <span key={key} className="admin-audit-chip"><strong>{label}</strong> {change.from ? t("on") : t("off")} → {change.to ? t("on") : t("off")}</span>; } return null; })}</div>}<time className="mt-2 block text-xs text-muted">{new Date(entry.createdAt).toLocaleString()}</time></div></article>)}</div> : <div className="p-10 text-center"><Activity className="mx-auto text-muted" size={23} /><p className="mt-3 font-display font-bold">{t("No admin changes yet")}</p><p className="mt-1 text-sm text-muted">{t("Business approval and publishing actions will appear here.")}</p></div>}
    </Card>}
  </div>;
}
