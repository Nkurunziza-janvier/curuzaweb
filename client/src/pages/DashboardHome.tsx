import { ArrowRight, BarChart3, CalendarDays, Check, ChevronRight, Copy, Eye, FileText, Package, ShoppingBag, ShoppingCart, Sparkles, Star, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { Badge, Button, ButtonLink, Card, Heading, Stat } from "../components/ui";
import { useCurrentUser, useProfileCompletion, useWorkspaceSummary } from "../hooks/apiHooks";
import { effectiveCapabilities } from "../lib/capabilities";
import { moduleLabel, visibleDashboardModules } from "../lib/dashboardModules";
import type { ProfileCompletion } from "../types/business";
import type { WorkspaceBooking, WorkspaceOrder, WorkspaceRequest, WorkspaceReview, WorkspaceSummary } from "../types/dashboard";
import { useLanguage } from "../i18n";

const money = (value: number | string, currency: string) => `${currency} ${Number(value).toLocaleString()}`;

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ").toLowerCase().replace(/^\w/, (letter: string) => letter.toUpperCase());
}

function statusTone(status: string) {
  if (["COMPLETED", "ACCEPTED", "PAID"].includes(status)) return "success" as const;
  if (["CANCELLED", "REJECTED", "EXPIRED"].includes(status)) return "neutral" as const;
  if (["PENDING", "NEW", "UNPAID"].includes(status)) return "warning" as const;
  return "accent" as const;
}

function ActivityCard({ title, description, href, action, empty, children }: { title: string; description: string; href: string; action: string; empty: boolean; children: ReactNode }) {
  const { t } = useLanguage();
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4 sm:p-5">
        <div>
          <p className="font-display font-bold">{t(title)}</p>
          <p className="text-xs text-muted">{t(description)}</p>
        </div>
        <ButtonLink to={href} variant="ghost">{t(action)} <ArrowRight size={15} /></ButtonLink>
      </div>
      {empty ? <div className="p-7 text-center text-sm text-muted">{t("Nothing here yet. New activity will appear as customers engage.")}</div> : <div className="divide-y divide-line">{children}</div>}
    </Card>
  );
}

function OrderRow({ order, currency }: { order: WorkspaceOrder; currency: string }) {
  return (
    <Link to="/dashboard/orders" className="flex items-center gap-3 p-4 transition hover:bg-[#faf9f6]">
      <span className="icon-tile shrink-0"><ShoppingCart size={17} /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{order.customerName}</p>
        <p className="mt-0.5 text-xs text-muted">#{order.orderNumber} · {money(order.total, order.currency || currency)}</p>
      </div>
      <Badge tone={statusTone(order.status)}>{statusLabel(order.status)}</Badge>
    </Link>
  );
}

function BookingRow({ booking }: { booking: WorkspaceBooking }) {
  return (
    <Link to="/dashboard/bookings" className="flex items-center gap-3 p-4 transition hover:bg-[#faf9f6]">
      <span className="icon-tile shrink-0"><CalendarDays size={17} /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{booking.customerName}</p>
        <p className="mt-0.5 text-xs text-muted">{booking.service.name} · {new Date(booking.startAt).toLocaleString()}</p>
      </div>
      <Badge tone={statusTone(booking.status)}>{statusLabel(booking.status)}</Badge>
    </Link>
  );
}

function RequestRow({ request }: { request: WorkspaceRequest }) {
  return (
    <Link to={`/dashboard/requests/${request.id}`} className="flex items-center gap-3 p-4 transition hover:bg-[#faf9f6]">
      <span className="icon-tile shrink-0"><FileText size={17} /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{request.customerName}</p>
        <p className="mt-0.5 truncate text-xs text-muted">{request.requestType} · #{request.requestNumber}</p>
      </div>
      <Badge tone={statusTone(request.status)}>{statusLabel(request.status)}</Badge>
    </Link>
  );
}

function ReviewRow({ review }: { review: WorkspaceReview }) {
  return (
    <Link to="/dashboard/reviews" className="flex items-center gap-3 p-4 transition hover:bg-[#faf9f6]">
      <span className="icon-tile shrink-0"><Star size={17} /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{review.customerName}</p>
        <p className="mt-0.5 truncate text-xs text-muted">{review.rating}/5 · {review.comment || "No comment"}</p>
      </div>
      <Badge tone={review.isPublished ? "success" : "neutral"}>{review.isPublished ? "Published" : "Hidden"}</Badge>
    </Link>
  );
}

export default function DashboardHome() {
  const { t } = useLanguage();
  const location = useLocation();
  const welcomeState = location.state as { registered?: boolean; published?: boolean } | null;
  const [showWelcome, setShowWelcome] = useState(Boolean(welcomeState?.registered));
  const [copied, setCopied] = useState(false);
  const [checklistDismissed, setChecklistDismissed] = useState(false);
  const { data: user } = useCurrentUser();
  const businessInfo = user?.business;
  const { data: summary, isLoading, isError, error } = useWorkspaceSummary<WorkspaceSummary>(businessInfo?.id);
  const { data: profileCompletion, isLoading: profileCompletionLoading } = useProfileCompletion<ProfileCompletion>(businessInfo?.id);
  const capabilities = effectiveCapabilities(summary?.capabilities ?? businessInfo?.capabilities);
  const canOrders = capabilities.has("product_orders");
  const canBookings = capabilities.has("appointments");
  const canRequests = capabilities.has("service_requests") || capabilities.has("contact_form");
  const canQuotes = capabilities.has("service_requests");
  const canProducts = capabilities.has("products");
  const canServices = capabilities.has("services");
  const canReviews = capabilities.has("reviews");
  const industryKey = businessInfo?.industryKey ?? "other";
  const currency = summary?.currency ?? "RWF";
  const pageLink = businessInfo ? `${window.location.origin}/b/${businessInfo.slug}` : "";
  const quickModules = visibleDashboardModules([...capabilities]).filter((module) => ["orders", "bookings", "requests", "products", "services", "customers", "reviews"].includes(module.key));

  useEffect(() => {
    if (businessInfo?.id) setChecklistDismissed(window.localStorage.getItem(`setup-checklist-dismissed:${businessInfo.id}`) === "1");
  }, [businessInfo?.id]);

  if (!businessInfo) {
    return <Card className="mx-auto max-w-2xl p-8"><Heading as="h1">{t("Set up your business")}</Heading><p className="mt-3 text-muted">{t("Complete onboarding to create your business page.")}</p><ButtonLink to="/onboarding" className="mt-6">{t("Continue setup")}</ButtonLink></Card>;
  }

  const orderQueue = summary?.orders ? summary.orders.pending + summary.orders.confirmed + summary.orders.processing + summary.orders.ready : 0;
  const newRequests = summary?.requests?.new ?? 0;
  const todayBookings = summary?.bookings?.today ?? 0;
  const awaitingQuotes = summary?.quotes?.sent ?? 0;
  const pendingProfile = profileCompletion ? 100 - profileCompletion.percentage : 0;
  const primaryAction = orderQueue > 0
    ? { label: "Review orders", href: "/dashboard/orders", icon: <ShoppingCart size={17} /> }
    : todayBookings > 0
      ? { label: "See today's appointments", href: "/dashboard/bookings", icon: <CalendarDays size={17} /> }
      : newRequests > 0
        ? { label: "Respond to inquiries", href: "/dashboard/requests", icon: <FileText size={17} /> }
        : pendingProfile > 0
          ? { label: "Complete your profile", href: "/dashboard/business-page", icon: <Sparkles size={17} /> }
          : !businessInfo.isPublished
            ? { label: "Publish your page", href: "/dashboard/settings", icon: <Eye size={17} /> }
            : { label: "Manage features", href: "/dashboard/features", icon: <Sparkles size={17} /> };

  const setupTasks: Array<{ key: string; label: string; detail: string; done: boolean; href: string }> = [
    ...(canProducts ? [{
      key: "products",
      label: industryKey === "food" ? "Add your first menu item" : industryKey === "retail" ? "Add your first product" : "Add products or extras",
      detail: "Show customers what they can browse and order.",
      done: (summary?.catalog.products.total ?? 0) > 0,
      href: "/dashboard/products",
    }] : []),
    ...(canServices ? [{
      key: "services",
      label: industryKey === "automotive" ? "Add your repair services" : industryKey === "real_estate" ? "Add your advisory services" : "Add your first service",
      detail: "Let customers see what you offer and how long it takes.",
      done: (summary?.catalog.services.total ?? 0) > 0,
      href: "/dashboard/services",
    }] : []),
    ...(canBookings ? [{
      key: "availability",
      label: industryKey === "professional" ? "Set consultation hours" : "Set booking availability",
      detail: "Choose the days and times customers can book.",
      done: Boolean(summary?.bookingSettings.configured),
      href: "/dashboard/bookings",
    }] : []),
    ...(canOrders && !capabilities.has("pickup") && !capabilities.has("delivery") ? [{
      key: "fulfilment",
      label: "Choose how orders are fulfilled",
      detail: "Turn on pickup or delivery so customers know what to expect.",
      done: false,
      href: "/dashboard/features",
    }] : []),
    {
      key: "publish",
      label: businessInfo.isPublished ? "Share your public page" : "Publish your public page",
      detail: businessInfo.isPublished ? "Send your link to customers and add it to your profiles." : "Publish when your profile is ready for customers.",
      done: businessInfo.isPublished,
      href: businessInfo.isPublished ? `/b/${businessInfo.slug}` : "/dashboard/settings",
    },
  ];
  const pendingTasks = setupTasks.filter((task) => !task.done);
  const completedTasks = setupTasks.length - pendingTasks.length;
  const setupProgress = setupTasks.length ? Math.round((completedTasks / setupTasks.length) * 100) : 0;
  const plannedNote = industryKey === "accommodation"
    ? "Room and reservation management is planned. For now, use guest services and inquiries so customers can reach you."
    : industryKey === "real_estate"
      ? "Property listing pages are planned. For now, use advisory services, inquiries, and your portfolio details."
      : industryKey === "food"
        ? "Restaurant-specific menus and table reservations are planned. You can use products and orders for your menu today."
        : industryKey === "events" || industryKey === "entertainment"
          ? "Event publishing and ticketing are planned. For now, use your services, portfolio, and inquiries to promote what is coming up."
          : "";

  const dismissChecklist = () => {
    setChecklistDismissed(true);
    if (businessInfo.id) window.localStorage.setItem(`setup-checklist-dismissed:${businessInfo.id}`, "1");
  };

  const statCards: Array<{ label: string; value: string; note?: string; href: string; icon: ReactNode }> = [];
  if (canOrders && summary?.orders) statCards.push({ label: "Orders to handle", value: String(orderQueue), note: `${summary.orders.unpaid} unpaid`, href: "/dashboard/orders", icon: <ShoppingCart size={18} /> });
  if (canBookings && summary?.bookings) statCards.push({ label: "Appointments today", value: String(todayBookings), note: `${summary.bookings.pending} awaiting confirmation`, href: "/dashboard/bookings", icon: <CalendarDays size={18} /> });
  if (canRequests && summary?.requests) statCards.push({ label: "New inquiries", value: String(newRequests), note: `${summary.requests.total} total`, href: "/dashboard/requests", icon: <FileText size={18} /> });
  if (canQuotes && summary?.quotes) statCards.push({ label: "Quotes awaiting reply", value: String(awaitingQuotes), note: summary.quotes.pendingValue ? money(summary.quotes.pendingValue, currency) : "No pending value", href: "/dashboard/quotes", icon: <Sparkles size={18} /> });
  if (canReviews && summary?.reviews) statCards.push({ label: "Average rating", value: summary.reviews.average ? `${summary.reviews.average}/5` : "No ratings", note: `${summary.reviews.published} published`, href: "/dashboard/reviews", icon: <Star size={18} /> });
  if (!statCards.length) statCards.push({ label: "Page views", value: String(summary?.analytics.pageViews ?? 0), note: "All time", href: "/dashboard/analytics", icon: <Eye size={18} /> });

  const recentOrder = canOrders ? summary?.orders?.recent ?? [] : [];
  const nextBookings = canBookings ? summary?.bookings?.next ?? [] : [];
  const recentRequests = canRequests ? summary?.requests?.recent ?? [] : [];
  const recentReviews = canReviews ? summary?.reviews?.recent ?? [] : [];
  const recentCards = [
    canRequests ? { key: "requests", title: "Recent inquiries", description: "Customers waiting for a response.", href: "/dashboard/requests", action: "View all", empty: recentRequests.length === 0, content: recentRequests.map((request) => <RequestRow key={request.id} request={request} />) } : null,
    canOrders ? { key: "orders", title: "Recent orders", description: "The latest customer orders.", href: "/dashboard/orders", action: "View all", empty: recentOrder.length === 0, content: recentOrder.map((order) => <OrderRow key={order.id} order={order} currency={currency} />) } : null,
    canBookings ? { key: "bookings", title: "Upcoming appointments", description: "Your next scheduled customers.", href: "/dashboard/bookings", action: "View all", empty: nextBookings.length === 0, content: nextBookings.map((booking) => <BookingRow key={booking.id} booking={booking} />) } : null,
    canReviews ? { key: "reviews", title: "Latest reviews", description: "Feedback from your customers.", href: "/dashboard/reviews", action: "Manage", empty: recentReviews.length === 0, content: recentReviews.map((review) => <ReviewRow key={review.id} review={review} />) } : null,
  ].filter((card): card is NonNullable<typeof card> => Boolean(card)).slice(0, 2);

  return <div className="mx-auto max-w-7xl">
    <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div className="min-w-0">
        <Badge tone={businessInfo.isPublished ? "success" : "warning"}><span className={`size-1.5 rounded-full ${businessInfo.isPublished ? "bg-success" : "bg-warning"}`} /> {businessInfo.isPublished ? t("Your page is live") : t("Your page is unpublished")}</Badge>
        <Heading as="h1" className="mt-4">{t(greeting())}, {user?.name.split(" ")[0]}.</Heading>
        <p className="mt-2 text-muted">{t("Here is what needs your attention at")} {businessInfo.name}.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <ButtonLink to={primaryAction.href} icon={primaryAction.icon}>{t(primaryAction.label)}</ButtonLink>
        {primaryAction.href !== "/dashboard/features" && <ButtonLink to="/dashboard/features" variant="secondary" icon={<Sparkles size={17} />}>{t("Manage features")}</ButtonLink>}
      </div>
    </div>

    {isError && <p role="alert" className="mt-5 rounded-xl bg-coral-soft p-3 text-sm text-coral-dark">{error instanceof Error ? error.message : t("Your workspace summary could not load. Refresh the page to try again.")}</p>}

    {showWelcome && <Card className="mt-6 border-[#c8e4d5] bg-[#f1f8f2] p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="font-display text-lg font-bold text-[#075b43]">{t("Your business is set up!")}</p><p className="mt-2 text-sm text-[#315f51]">{businessInfo.isPublished ? t("Your public page is live and ready to share. Add products, services, or photos whenever you like.") : t("Your page is saved as a draft. Publish it when you are ready to share it with customers.")}</p></div><button type="button" onClick={() => setShowWelcome(false)} className="rounded-full p-1.5 text-[#315f51] hover:bg-white" aria-label={t("Dismiss welcome message")}><X size={17} /></button></div><div className="mt-4 flex flex-wrap gap-2"><ButtonLink to={`/b/${businessInfo.slug}`} target="_blank" rel="noopener noreferrer" variant="secondary">{t("View public page")}</ButtonLink>{!businessInfo.isPublished && <ButtonLink to="/dashboard/settings">{t("Publish page")}</ButtonLink>}</div></Card>}

    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {isLoading ? <><div className="skeleton h-28 rounded-2xl" /><div className="skeleton h-28 rounded-2xl" /><div className="skeleton h-28 rounded-2xl" /><div className="skeleton h-28 rounded-2xl" /></> : statCards.map((stat) => <Link key={stat.label} to={stat.href} className="block transition hover:-translate-y-0.5"><Stat label={t(stat.label)} value={stat.value} note={stat.note} icon={stat.icon} /></Link>)}
    </div>

    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,1fr)]">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div><p className="font-display text-lg font-bold">{t("Profile completion")}</p><p className="mt-1 max-w-2xl text-sm text-muted">{t("Customers see this information on your public page. It is separate from your operational setup.")}</p></div>
          <ButtonLink to="/dashboard/business-page" variant="secondary">{t("Edit public website")}</ButtonLink>
        </div>
        {profileCompletionLoading ? <div className="skeleton mt-5 h-24 rounded-xl" /> : profileCompletion && <>
          <div className="mt-5 flex items-end justify-between gap-4"><strong className="font-display text-3xl font-bold">{profileCompletion.percentage}%</strong><span className="text-xs text-muted">{t("Based on your saved profile details")}</span></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eef1eb]"><div className="h-full rounded-full bg-success transition-all" style={{ width: `${profileCompletion.percentage}%` }} /></div>
          {profileCompletion.recommendations.length > 0 ? <div className="mt-5 grid gap-2 sm:grid-cols-2">{profileCompletion.recommendations.slice(0, 4).map((item) => <Link key={item.key} to={item.href} className="flex items-start gap-3 rounded-xl border border-line bg-white p-3 transition hover:border-violet"><span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-line text-transparent"><Check size={12} /></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="text-sm font-bold">{t(item.label)}</span><span className="text-[11px] font-bold text-muted">+{Math.round(item.weight)}%</span></span><span className="mt-0.5 block text-xs leading-5 text-muted">{t(item.recommendation)}</span></span><ChevronRight size={15} className="mt-1 shrink-0 text-muted" /></Link>)}</div> : <p className="mt-4 rounded-xl bg-[#f1f8f2] p-3 text-sm font-semibold text-[#075b43]">{t("Your public profile is complete.")}</p>}
        </>}
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><p className="font-display text-lg font-bold">{t("Your public link")}</p><p className="mt-1 text-xs text-muted">{t("Share it everywhere customers discover you.")}</p></div><Eye size={18} className="text-violet" /></div>
        <p className="mt-5 break-all rounded-xl bg-[#faf9f6] p-3 font-mono text-xs text-ink">{pageLink}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" disabled={!businessInfo.isPublished} onClick={() => { void navigator.clipboard.writeText(pageLink); setCopied(true); window.setTimeout(() => setCopied(false), 1500); }} icon={copied ? <Check size={16} /> : <Copy size={16} />}>{copied ? t("Copied") : t("Copy link")}</Button>
          <ButtonLink to={`/b/${businessInfo.slug}`} target="_blank" rel="noopener noreferrer" variant="ghost" icon={<ArrowRight size={16} />}>{t("Open page")}</ButtonLink>
        </div>
        {!businessInfo.isPublished && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#fff8e8] p-3 text-xs"><span>{t("Your public page is not published yet.")}</span><ButtonLink to="/dashboard/settings" variant="secondary">{t("Publish page")}</ButtonLink></div>}
      </Card>
    </div>

    {!checklistDismissed && pendingTasks.length > 0 && <Card className="mt-6 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4"><div><p className="font-display text-lg font-bold">{t("Set up your workspace")}</p><p className="mt-1 text-xs text-muted">{completedTasks} {t("of")} {setupTasks.length} {t("complete · based on what you actually offer")}</p></div><button type="button" onClick={dismissChecklist} className="rounded-full p-1.5 text-muted hover:bg-[#faf9f6]" aria-label={t("Dismiss setup checklist")}><X size={17} /></button></div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#eef1eb]"><div className="h-full rounded-full bg-violet transition-all" style={{ width: `${setupProgress}%` }} /></div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">{pendingTasks.slice(0, 4).map((task) => <Link key={task.key} to={task.href} className="flex items-start gap-3 rounded-xl border border-line bg-white p-3 transition hover:border-violet"><span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-line text-transparent"><Check size={12} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold">{t(task.label)}</span><span className="mt-0.5 block text-xs leading-5 text-muted">{t(task.detail)}</span></span><ChevronRight size={15} className="mt-1 shrink-0 text-muted" /></Link>)}</div>
      {plannedNote && <p className="mt-4 rounded-xl bg-[#faf9f6] p-3 text-xs leading-5 text-muted">{t(plannedNote)}</p>}
    </Card>}

    {recentCards.length > 0 && <div className="mt-8 grid gap-6 lg:grid-cols-2">{recentCards.map((card) => <ActivityCard key={card.key} title={card.title} description={card.description} href={card.href} action={card.action} empty={card.empty}>{card.content}</ActivityCard>)}</div>}

    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,1fr)]">
      <Card className="p-5 sm:p-6">
        <div className="flex items-center justify-between"><div><p className="font-display text-lg font-bold">{t("What customers can do")}</p><p className="mt-1 text-xs text-muted">{t("Active modules on your public page.")}</p></div><Sparkles size={18} className="text-violet" /></div>
        {quickModules.length > 0 ? <div className="mt-5 grid gap-2 sm:grid-cols-2">{quickModules.map((module) => { const Icon = module.icon; return <Link key={module.key} to={module.path} className="flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-violet"><span className="icon-tile shrink-0"><Icon size={16} /></span><span className="min-w-0 flex-1 text-sm font-bold">{t(moduleLabel(module, businessInfo))}</span><ChevronRight size={15} className="shrink-0 text-muted" /></Link>; })}</div> : <p className="mt-5 rounded-xl bg-[#faf9f6] p-4 text-sm text-muted">{t("No customer-facing modules are active yet. Choose a feature to let customers take action on your page.")}</p>}
        <div className="mt-4 flex flex-wrap gap-2"><ButtonLink to="/dashboard/features" variant="secondary" icon={<Sparkles size={16} />}>{t("Change features")}</ButtonLink><ButtonLink to="/dashboard/business-page" variant="ghost" icon={<Eye size={16} />}>{t("Improve public page")}</ButtonLink></div>
      </Card>
      <Card className="p-5 sm:p-6">
        <div className="flex items-center justify-between"><div><p className="font-display text-lg font-bold">{t("Page activity")}</p><p className="mt-1 text-xs text-muted">{t("How people find and use your page.")}</p></div><BarChart3 size={18} className="text-violet" /></div>
        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted">{t("Page views")}</span><strong>{summary?.analytics.pageViews ?? 0}</strong></div>
          <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted">{t("Customer actions")}</span><strong>{summary?.analytics.actions ?? 0}</strong></div>
          <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted">{t("WhatsApp clicks")}</span><strong>{summary?.analytics.whatsappClicks ?? 0}</strong></div>
          <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted">{t("Calls")}</span><strong>{summary?.analytics.phoneClicks ?? 0}</strong></div>
          <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted">{t("Directions")}</span><strong>{summary?.analytics.directionsClicks ?? 0}</strong></div>
        </div>
        <ButtonLink to="/dashboard/analytics" variant="ghost" className="mt-4" icon={<ArrowRight size={15} />}>{t("See analytics")}</ButtonLink>
      </Card>
    </div>

    <div className="mt-8 grid gap-4 sm:grid-cols-2">
      {canProducts && <Card className="flex items-center justify-between gap-4 p-5"><div><p className="text-xs font-bold uppercase tracking-wide text-muted">{t("Products")}</p><p className="mt-1 font-display text-2xl font-bold">{summary?.catalog.products.total ?? 0}</p><p className="mt-1 text-xs text-muted">{summary?.catalog.products.published ?? 0} {t("published")}</p></div><ButtonLink to="/dashboard/products" variant="secondary" icon={<Package size={16} />}>{t("Manage")}</ButtonLink></Card>}
      {canServices && <Card className="flex items-center justify-between gap-4 p-5"><div><p className="text-xs font-bold uppercase tracking-wide text-muted">{t("Services")}</p><p className="mt-1 font-display text-2xl font-bold">{summary?.catalog.services.total ?? 0}</p><p className="mt-1 text-xs text-muted">{summary?.catalog.services.bookable ?? 0} {t("bookable")}</p></div><ButtonLink to="/dashboard/services" variant="secondary" icon={<ShoppingBag size={16} />}>{t("Manage")}</ButtonLink></Card>}
    </div>
  </div>;
}
