import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CalendarCheck2, CalendarClock, CalendarDays, Check, CheckCircle2, Clock3, MessageCircle, Phone, Search, UserRound, XCircle } from "lucide-react";
import { bookingService } from "../services/api";
import { useCurrentUser } from "../hooks/apiHooks";
import { Badge, Button, Card, Heading, Input, Label, Stat, Textarea } from "../components/ui";
import { useLanguage } from "../i18n";
import { dateTimeInputValue, formatBookingDate, zonedInputToIso } from "../utils/datetime";
import type { BookingStatus, BookingSummary, OwnerBooking } from "../types/booking";

const statusTone: Record<BookingStatus, "neutral" | "success" | "warning" | "accent" | "violet"> = {
  PENDING: "warning",
  CONFIRMED: "success",
  REJECTED: "accent",
  COMPLETED: "violet",
  CANCELLED: "neutral",
  NO_SHOW: "neutral",
};

const labels: Record<BookingStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
};

const filters: Array<{ value: "" | BookingStatus; label: string }> = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REJECTED", label: "Rejected" },
  { value: "NO_SHOW", label: "No-show" },
];

export function BookingsPage() {
  const { t, locale } = useLanguage();
  const { data: user } = useCurrentUser();
  const businessId = user?.business?.id ?? "";
  const [filter, setFilter] = useState<"" | BookingStatus>("");
  const [search, setSearch] = useState("");
  const bookingsQuery = useQuery<OwnerBooking[]>({
    queryKey: ["bookings", businessId],
    queryFn: () => bookingService.listByBusiness<OwnerBooking>(businessId),
    enabled: Boolean(businessId),
  });
  const summaryQuery = useQuery<BookingSummary>({
    queryKey: ["booking-summary", businessId],
    queryFn: () => bookingService.summary<BookingSummary>(businessId),
    enabled: Boolean(businessId),
  });
  const timezone = summaryQuery.data?.timezone ?? "Africa/Kigali";
  const bookings = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (bookingsQuery.data ?? []).filter((booking) => (!filter || booking.status === filter) && (!term || `${booking.bookingNumber} ${booking.customerName} ${booking.customerPhone ?? ""} ${booking.service.name}`.toLowerCase().includes(term)));
  }, [bookingsQuery.data, filter, search]);
  const upcoming = useMemo(() => (bookingsQuery.data ?? []).filter((booking) => ["PENDING", "CONFIRMED"].includes(booking.status) && new Date(booking.startAt) > new Date()).slice(0, 3), [bookingsQuery.data]);

  return <div className="mx-auto max-w-7xl">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">{t("Appointments")}</p><Heading as="h1">{t("Bookings")}</Heading><p className="mt-2 max-w-2xl text-muted">{t("Review booking requests, confirm appointments, and keep your schedule organized.")}</p></div><Link to="/dashboard/availability" className="btn btn-secondary"><CalendarClock size={16} />{t("Manage availability")}</Link></div>

    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label={t("Today")} value={String(summaryQuery.data?.today ?? 0)} icon={<CalendarCheck2 size={18} />} /><Stat label={t("Pending")} value={String(summaryQuery.data?.pending ?? 0)} icon={<Clock3 size={18} />} /><Stat label={t("Upcoming confirmed")} value={String(summaryQuery.data?.confirmed ?? 0)} icon={<CalendarDays size={18} />} /><Stat label={t("Completed")} value={String(summaryQuery.data?.completed ?? 0)} icon={<CheckCircle2 size={18} />} /></div>

    {upcoming.length > 0 && <div className="mt-5 flex gap-3 overflow-x-auto pb-1">{upcoming.map((booking) => <Link key={booking.id} to={`/dashboard/bookings/${booking.id}`} className="flex min-w-[260px] flex-1 items-center gap-3 rounded-2xl border border-[#dce9e4] bg-white p-4 transition hover:border-[#a9d4c2] hover:shadow-sm"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eef8f3] text-[#087553]"><CalendarClock size={19} /></span><span className="min-w-0"><strong className="block truncate text-sm">{booking.customerName}</strong><span className="mt-0.5 block truncate text-[11px] text-muted">{booking.service.name} · {formatBookingDate(booking.startAt, timezone, locale)}</span></span><Badge tone={statusTone[booking.status]}>{t(labels[booking.status])}</Badge></Link>)}</div>}

    <Card className="mt-5 p-4 sm:p-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex gap-1 overflow-x-auto">{filters.map((item) => <button key={item.value} type="button" onClick={() => setFilter(item.value)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition ${filter === item.value ? "bg-[#075b43] text-white" : "text-[#5b716b] hover:bg-[#f1f7f4]"}`}>{t(item.label)}{item.value === "" ? ` (${bookingsQuery.data?.length ?? 0})` : ` (${(bookingsQuery.data ?? []).filter((booking) => booking.status === item.value).length})`}</button>)}</div><label className="flex min-h-10 items-center gap-2 rounded-xl border border-[#dce8e3] bg-white px-3 text-[#6f867f] lg:w-72"><Search size={15} /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Search bookings or customers")} className="!min-h-8 !border-0 !p-0 !shadow-none focus:!ring-0" /></label></div></Card>

    {bookingsQuery.isLoading ? <p className="mt-8 text-sm text-muted">{t("Loading bookings.")}</p> : bookingsQuery.isError ? <p className="mt-6 rounded-2xl bg-[#fff3ef] p-4 text-sm text-[#9a3d2c]">{bookingsQuery.error.message}</p> : bookings.length ? <div className="mt-5 overflow-hidden rounded-2xl border border-[#e0ece7] bg-white"><div className="hidden grid-cols-[1.5fr_1.2fr_1fr_.8fr_auto] gap-3 border-b border-[#eaf1ee] px-4 py-3 text-[10px] font-bold uppercase tracking-[.12em] text-[#7a918a] lg:grid"><span>{t("Customer")}</span><span>{t("Service")}</span><span>{t("When")}</span><span>{t("Status")}</span><span /></div>{bookings.map((booking) => <Link key={booking.id} to={`/dashboard/bookings/${booking.id}`} className="grid gap-2 border-b border-[#eef3f0] px-4 py-3.5 transition last:border-0 hover:bg-[#f8fcfa] lg:grid-cols-[1.5fr_1.2fr_1fr_.8fr_auto] lg:items-center"><div className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#eef8f3] text-[11px] font-bold text-[#087553]">{booking.customerName.slice(0, 2).toUpperCase()}</span><span className="min-w-0"><strong className="block truncate text-sm">{booking.customerName}</strong><span className="block truncate text-[10px] text-muted">{booking.bookingNumber}{booking.customerPhone ? ` · ${booking.customerPhone}` : ""}</span></span></div><span className="truncate text-xs font-semibold text-[#385f58]">{booking.service.name}</span><span className="text-xs text-[#4c6a63]">{formatBookingDate(booking.startAt, timezone, locale, "medium")}<span className="mt-0.5 block text-[10px] text-muted">{booking.durationMinutes} {t("min")}</span></span><span><Badge tone={statusTone[booking.status]}>{t(labels[booking.status])}</Badge></span><ArrowRight size={15} className="hidden text-[#8ba79e] lg:block" /></Link>)}</div> : <Card className="mt-5 p-8 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#eef8f3] text-[#087553]"><CalendarDays size={22} /></span><p className="mt-3 font-display text-lg font-bold">{t("No bookings match this view")}</p><p className="mt-1 text-sm text-muted">{t("New online bookings will appear here. You can also share your public page to start receiving appointments.")}</p></Card>}
  </div>;
}

export function BookingDetailPage() {
  const { t, locale } = useLanguage();
  const { bookingId } = useParams();
  const { data: user } = useCurrentUser();
  const businessId = user?.business?.id ?? "";
  const queryClient = useQueryClient();
  const queryKey = ["booking", bookingId];
  const bookingQuery = useQuery<OwnerBooking>({
    queryKey,
    queryFn: () => bookingService.get<OwnerBooking>(bookingId!),
    enabled: Boolean(bookingId),
  });
  const booking = bookingQuery.data;
  const timezone = booking?.timezone ?? "Africa/Kigali";
  const [schedule, setSchedule] = useState("");
  const [note, setNote] = useState("");
  const [loaded, setLoaded] = useState(false);

  if (booking && !loaded) {
    setSchedule(dateTimeInputValue(booking.startAt, timezone));
    setNote(booking.ownerNote);
    setLoaded(true);
  }

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey });
    void queryClient.invalidateQueries({ queryKey: ["bookings", businessId] });
    void queryClient.invalidateQueries({ queryKey: ["booking-summary", businessId] });
  };
  const statusMutation = useMutation({
    mutationFn: (status: BookingStatus) => bookingService.updateStatus<OwnerBooking>(bookingId!, status),
    onSuccess: invalidate,
  });
  const scheduleMutation = useMutation({
    mutationFn: () => bookingService.reschedule<OwnerBooking>(bookingId!, zonedInputToIso(schedule, timezone)),
    onSuccess: () => { setLoaded(false); invalidate(); },
  });
  const noteMutation = useMutation({
    mutationFn: () => bookingService.updateNote<OwnerBooking>(bookingId!, note),
    onSuccess: invalidate,
  });

  if (bookingQuery.isLoading) return <p className="text-sm text-muted">{t("Loading booking.")}</p>;
  if (bookingQuery.isError || !booking) return <Card className="p-8 text-center"><p className="font-display text-lg font-bold">{t("Booking not found")}</p><p className="mt-2 text-sm text-muted">{bookingQuery.error?.message ?? t("This booking may have been removed.")}</p><Link to="/dashboard/bookings" className="btn btn-secondary mt-5">{t("Back to bookings")}</Link></Card>;

  const canCancel = ["PENDING", "CONFIRMED"].includes(booking.status);
  const canConfirm = booking.status === "PENDING";
  const canComplete = booking.status === "CONFIRMED";
  const whatsappDigits = booking.business.whatsapp?.replace(/\D/g, "");
  const actionError = statusMutation.error?.message ?? scheduleMutation.error?.message ?? noteMutation.error?.message;

  return <div className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><Link to="/dashboard/bookings" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#648078] hover:text-[#087553]"><ArrowLeft size={14} />{t("All bookings")}</Link><div className="mt-2 flex flex-wrap items-center gap-3"><Heading as="h1">{booking.bookingNumber}</Heading><Badge tone={statusTone[booking.status]}>{t(labels[booking.status])}</Badge></div><p className="mt-1 text-sm text-muted">{t("Created")} {new Date(booking.createdAt).toLocaleString(locale)}</p></div><div className="flex flex-wrap gap-2">{canConfirm && <Button loading={statusMutation.isPending} onClick={() => statusMutation.mutate("CONFIRMED")} icon={<Check size={16} />}>{t("Confirm")}</Button>}{canComplete && <Button loading={statusMutation.isPending} onClick={() => statusMutation.mutate("COMPLETED")} icon={<CheckCircle2 size={16} />}>{t("Mark completed")}</Button>}</div></div>

    {actionError && <p className="mt-4 rounded-2xl bg-[#fff3ef] p-4 text-sm text-[#9a3d2c]">{actionError}</p>}

    <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <Card className="p-5 sm:p-6"><div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#eef8f3] text-[#087553]"><CalendarDays size={21} /></span><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#7a918a]">{t("Appointment")}</p><p className="mt-1 font-display text-xl font-bold">{formatBookingDate(booking.startAt, timezone, locale, "full", "short")}</p><p className="mt-1 text-xs text-muted">{booking.durationMinutes} {t("minutes")} · {timezone}</p></div></div><div className="mt-5 grid gap-3 border-t border-[#eef3f0] pt-4 sm:grid-cols-2"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#7a918a]">{t("Service")}</p><p className="mt-1 text-sm font-bold">{booking.service.name}</p><p className="mt-1 text-xs text-muted">{booking.currency} {Number(booking.startingPriceSnapshot ?? 0).toLocaleString()}</p></div><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#7a918a]">{t("Customer")}</p><p className="mt-1 text-sm font-bold">{booking.customerName}</p><div className="mt-1 flex flex-wrap gap-3 text-xs text-[#42655e]">{booking.customerPhone && <a href={`tel:${booking.customerPhone}`} className="inline-flex items-center gap-1 hover:text-[#087553]"><Phone size={12} />{booking.customerPhone}</a>}{booking.customerEmail && <a href={`mailto:${booking.customerEmail}`} className="hover:text-[#087553]">{booking.customerEmail}</a>}</div></div></div>{booking.customerNote && <div className="mt-4 rounded-xl bg-[#f7faf8] p-3 text-xs leading-5 text-[#4f6a64]"><strong className="text-[#315c56]">{t("Customer note")}:</strong> {booking.customerNote}</div>}</Card>

        <Card className="p-5 sm:p-6"><h2 className="font-display text-lg font-bold">{t("Reschedule")}</h2><p className="mt-1 text-xs leading-5 text-muted">{t("Move this booking to another available time. The change is checked against your weekly hours and other bookings.")}</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><div className="flex-1"><Label htmlFor="booking-schedule">{t("New date & time")}</Label><Input id="booking-schedule" type="datetime-local" value={schedule} onChange={(event) => setSchedule(event.target.value)} /></div><div className="flex items-end"><Button loading={scheduleMutation.isPending} disabled={!schedule || scheduleMutation.isPending} onClick={() => scheduleMutation.mutate()} icon={<CalendarClock size={15} />}>{t("Update time")}</Button></div></div>{scheduleMutation.isSuccess && <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-[#076146]"><Check size={14} />{t("Appointment time updated.")}</p>}</Card>

        <Card className="p-5 sm:p-6"><h2 className="font-display text-lg font-bold">{t("Internal note")}</h2><p className="mt-1 text-xs text-muted">{t("Only your team can see this note.")}</p><div className="mt-3"><Textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} className="min-h-24" placeholder={t("Add preparation notes or reminders")} /></div><div className="mt-3 flex justify-end"><Button variant="secondary" loading={noteMutation.isPending} onClick={() => noteMutation.mutate()}>{t("Save note")}</Button></div>{noteMutation.isSuccess && <p className="mt-3 text-right text-xs font-semibold text-[#076146]">{t("Note saved.")}</p>}</Card>
      </div>

      <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
        <Card className="p-5"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#7a918a]">{t("Booking actions")}</p><div className="mt-3 grid gap-2">{canConfirm && <><Button onClick={() => statusMutation.mutate("CONFIRMED")}>{t("Confirm appointment")}</Button><Button variant="secondary" onClick={() => statusMutation.mutate("REJECTED")} icon={<XCircle size={15} />}>{t("Reject request")}</Button></>}{canComplete && <><Button onClick={() => statusMutation.mutate("COMPLETED")}>{t("Mark completed")}</Button><Button variant="secondary" onClick={() => statusMutation.mutate("NO_SHOW")}>{t("Mark no-show")}</Button></>}{canCancel && <Button variant="ghost" onClick={() => statusMutation.mutate("CANCELLED")}>{t("Cancel booking")}</Button>}{!canConfirm && !canComplete && <p className="text-xs leading-5 text-muted">{t("This booking is closed. Its history remains available below.")}</p>}</div></Card>

        <Card className="p-5"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#7a918a]">{t("Customer contact")}</p><div className="mt-3 space-y-2">{booking.customerPhone && <a href={`tel:${booking.customerPhone}`} className="btn btn-secondary !min-h-10 w-full text-xs"><Phone size={14} />{booking.customerPhone}</a>}{whatsappDigits && <a href={`https://wa.me/${whatsappDigits}`} target="_blank" rel="noreferrer" className="btn btn-secondary !min-h-10 w-full text-xs"><MessageCircle size={14} />{t("WhatsApp business number")}</a>}<Link to={`/b/${booking.business.slug}`} target="_blank" className="btn btn-ghost !min-h-9 w-full text-[11px]"><UserRound size={13} />{t("Open public page")}</Link></div></Card>

        <Card className="p-5"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#7a918a]">{t("History")}</p><div className="mt-3 space-y-2 text-xs text-[#58716d]"><p>{t("Requested")}: {new Date(booking.createdAt).toLocaleString(locale)}</p>{booking.confirmedAt && <p>{t("Confirmed")}: {new Date(booking.confirmedAt).toLocaleString(locale)}</p>}{booking.completedAt && <p>{t("Completed")}: {new Date(booking.completedAt).toLocaleString(locale)}</p>}{booking.rejectedAt && <p>{t("Rejected")}: {new Date(booking.rejectedAt).toLocaleString(locale)}</p>}{booking.cancelledAt && <p>{t("Cancelled")}: {new Date(booking.cancelledAt).toLocaleString(locale)}</p>}{booking.cancelledBy && <p>{t("Cancelled by")}: {booking.cancelledBy.toLowerCase()}</p>}{booking.review && <p className="flex items-center gap-1 font-semibold text-[#076146]"><CheckCircle2 size={13} />{t("Verified review")}: {booking.review.rating}/5</p>}</div></Card>
      </aside>
    </div>
  </div>;
}

