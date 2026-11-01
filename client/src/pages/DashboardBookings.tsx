import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CalendarPlus, CheckCircle2, Clock3, MapPin, MessageCircle, Phone, Search, Settings2, Trash2, X } from "lucide-react";
import { bookingService } from "../services/api";
import { queryKeys, useCurrentUser } from "../hooks/apiHooks";
import { Badge, Button, Card, Heading, Input, Label, Select, Stat, Textarea } from "../components/ui";
import { useLanguage } from "../i18n";
import { moduleByKey, moduleLabel } from "../lib/dashboardModules";
import type { AvailabilityBlock, AvailabilityWindow, BookingSettings, BookingStatus, BookingSummary, OwnerBooking } from "../types/booking";

const statusLabel: Record<BookingStatus, string> = { PENDING: "Pending", CONFIRMED: "Confirmed", REJECTED: "Rejected", COMPLETED: "Completed", CANCELLED: "Cancelled", NO_SHOW: "No-show" };
const statusTone = (status: BookingStatus) => status === "CONFIRMED" || status === "COMPLETED" ? "success" as const : status === "PENDING" ? "accent" as const : status === "CANCELLED" || status === "NO_SHOW" ? "warning" as const : "neutral" as const;
const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const money = (amount: number | string | null, currency = "RWF") => amount === null || amount === undefined ? "—" : `${currency} ${Number(amount).toLocaleString()}`;
const minutesToTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
const timeToMinutes = (value: string) => { const [hours, minutes] = value.split(":").map(Number); return (hours ?? 0) * 60 + (minutes ?? 0); };

function ErrorNotice({ message }: { message: string }) {
  return <p role="alert" className="rounded-xl bg-coral-soft p-3 text-sm text-coral-dark">{message}</p>;
}

interface SettingsResponse { settings: BookingSettings; configured: boolean; windows: AvailabilityWindow[]; blocks: AvailabilityBlock[] }
interface WindowRow { weekday: number; enabled: boolean; start: string; end: string }

export default function BookingsPage() {
  const { t } = useLanguage();
  const { data: user } = useCurrentUser();
  const business = user?.business;
  const businessId = business?.id;
  const appointmentsModule = moduleByKey("appointments");
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"bookings" | "availability">("bookings");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [rescheduleAt, setRescheduleAt] = useState("");

  const bookingsQuery = useQuery<OwnerBooking[]>({ queryKey: queryKeys.bookings(businessId ?? ""), queryFn: () => bookingService.listByBusiness<OwnerBooking>(businessId!), enabled: Boolean(businessId) });
  const summaryQuery = useQuery<BookingSummary>({ queryKey: queryKeys.bookingSummary(businessId ?? ""), queryFn: () => bookingService.summary<BookingSummary>(businessId!), enabled: Boolean(businessId) });
  const settingsQuery = useQuery<SettingsResponse>({ queryKey: queryKeys.bookingSettings(businessId ?? ""), queryFn: () => bookingService.getSettings<SettingsResponse>(businessId!), enabled: Boolean(businessId) });

  const bookings = bookingsQuery.data ?? [];
  const selected = bookings.find((booking) => booking.id === selectedId) ?? null;
  useEffect(() => { setNote(selected?.ownerNote ?? ""); setRescheduleAt(""); }, [selected?.id, selected?.ownerNote]);
  const refresh = () => {
    if (!businessId) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.bookings(businessId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.bookingSummary(businessId) });
  };
  const statusMutation = useMutation({ mutationFn: ({ id, next }: { id: string; next: BookingStatus }) => bookingService.updateStatus<OwnerBooking>(id, next), onSuccess: refresh });
  const noteMutation = useMutation({ mutationFn: () => bookingService.updateNote<OwnerBooking>(selected!.id, note), onSuccess: (updated) => { if (businessId) queryClient.setQueryData<OwnerBooking[]>(queryKeys.bookings(businessId), (current) => current?.map((booking) => booking.id === updated.id ? updated : booking)); refresh(); } });
  const rescheduleMutation = useMutation({ mutationFn: () => bookingService.reschedule<OwnerBooking>(selected!.id, new Date(rescheduleAt).toISOString()), onSuccess: (updated) => { if (businessId) queryClient.setQueryData<OwnerBooking[]>(queryKeys.bookings(businessId), (current) => current?.map((booking) => booking.id === updated.id ? updated : booking)); refresh(); setRescheduleAt(""); } });

  const filtered = useMemo(() => bookings.filter((booking) => {
    const query = search.trim().toLowerCase();
    return (status === "ALL" || booking.status === status) && (!query || `${booking.bookingNumber} ${booking.customerName} ${booking.customerPhone ?? ""} ${booking.service.name}`.toLowerCase().includes(query));
  }), [bookings, search, status]);

  const nextActions: Partial<Record<BookingStatus, Array<{ status: BookingStatus; label: string }>>> = {
    PENDING: [{ status: "CONFIRMED", label: "Confirm" }, { status: "REJECTED", label: "Reject" }, { status: "CANCELLED", label: "Cancel" }],
    CONFIRMED: [{ status: "COMPLETED", label: "Complete" }, { status: "NO_SHOW", label: "No-show" }, { status: "CANCELLED", label: "Cancel" }],
  };

  return <div className="mx-auto max-w-7xl">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><Heading as="h1">{t(appointmentsModule ? moduleLabel(appointmentsModule, business) : "Bookings")}</Heading><p className="mt-2 text-muted">{t("Manage appointments and the times customers can book.")}</p></div><div className="flex gap-2"><Button variant={tab === "bookings" ? "primary" : "secondary"} onClick={() => setTab("bookings")} icon={<CalendarDays size={16} />}>{t("Appointments")}</Button><Button variant={tab === "availability" ? "primary" : "secondary"} onClick={() => setTab("availability")} icon={<Settings2 size={16} />}>{t("Availability")}</Button></div></div>
    {(bookingsQuery.isError || summaryQuery.isError || statusMutation.isError) && <div className="mt-5"><ErrorNotice message={bookingsQuery.error?.message ?? summaryQuery.error?.message ?? statusMutation.error?.message ?? t("Bookings could not be loaded")} /></div>}

    {tab === "bookings" ? <>
      <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-5"><Stat label={t("Today")} value={String(summaryQuery.data?.today ?? 0)} /><Stat label={t("Pending")} value={String(summaryQuery.data?.pending ?? 0)} /><Stat label={t("Upcoming")} value={String(summaryQuery.data?.confirmed ?? 0)} /><Stat label={t("Completed")} value={String(summaryQuery.data?.completed ?? 0)} /><Stat label={t("Cancelled")} value={String((summaryQuery.data?.cancelled ?? 0) + (summaryQuery.data?.rejected ?? 0))} /></div>
      <Card className="mt-6 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row"><div className="relative flex-1"><Search size={16} className="absolute left-3 top-3.5 text-muted" /><Input aria-label={t("Search bookings")} className="pl-9" placeholder={t("Search booking, customer, service…")} value={search} onChange={(event) => setSearch(event.target.value)} /></div><Select className="sm:!w-56" aria-label={t("Filter by status")} value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">{t("All statuses")}</option>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}</Select></div>
        {bookingsQuery.isLoading ? <div className="space-y-3 p-5"><div className="skeleton h-16 rounded-xl" /><div className="skeleton h-16 rounded-xl" /></div>
          : filtered.length === 0 ? <div className="p-10 text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#eef4ef] text-[#5c7f74]"><CalendarDays size={24} /></span><p className="mt-4 font-display text-lg font-bold">{t(bookings.length ? "No bookings match these filters" : "No bookings yet")}</p><p className="mt-2 text-sm text-muted">{t(bookings.length ? "Try changing the search or filters." : "Appointments booked on your public page will appear here.")}</p></div>
            : <div className="divide-y divide-line">{filtered.map((booking) => <article key={booking.id} className="flex flex-wrap items-center justify-between gap-3 p-4 transition hover:bg-[#faf9f6] sm:p-5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-display font-bold">#{booking.bookingNumber}</p><Badge tone={statusTone(booking.status)}>{t(statusLabel[booking.status])}</Badge></div><p className="mt-1 text-sm text-muted">{booking.customerName} · {booking.service.name}</p><p className="mt-1 text-xs text-muted">{new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: booking.timezone }).format(new Date(booking.startAt))} · {booking.durationMinutes} {t("min")}</p></div><div className="flex items-center gap-3"><span className="text-sm font-semibold">{money(booking.startingPriceSnapshot, booking.currency)}</span><Button variant="secondary" onClick={() => setSelectedId(booking.id)}>{t("Open")}</Button></div></article>)}</div>}
      </Card>
    </> : <AvailabilityEditor businessId={businessId} data={settingsQuery.data} isLoading={settingsQuery.isLoading} isError={settingsQuery.isError} error={settingsQuery.error} />}

    {selected && <div className="fixed inset-0 z-50 grid place-items-center bg-ink/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`${t("Booking")} ${selected.bookingNumber}`}>
      <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto p-5 shadow-float sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">{t("Appointment")}</p><h2 className="font-display text-2xl font-bold">#{selected.bookingNumber}</h2><div className="mt-2 flex flex-wrap gap-2"><Badge tone={statusTone(selected.status)}>{t(statusLabel[selected.status])}</Badge><Badge tone="neutral">{selected.service.name}</Badge></div></div><Button variant="ghost" onClick={() => setSelectedId(null)} icon={<X size={18} />}>{t("Close")}</Button></div>
        <div className="mt-5 grid gap-3 rounded-2xl bg-[#f7faf8] p-4 text-sm sm:grid-cols-2"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#6b8d82]">{t("When")}</p><p className="mt-1 font-semibold">{new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: selected.timezone }).format(new Date(selected.startAt))}</p><p className="mt-1 text-xs text-muted">{selected.timezone} · {selected.durationMinutes} {t("minutes")}</p></div><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#6b8d82]">{t("Customer")}</p><p className="mt-1 font-semibold">{selected.customerName}</p>{selected.customerPhone && <a href={`tel:${selected.customerPhone}`} className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-[#087553]"><Phone size={12} />{selected.customerPhone}</a>}{selected.customerEmail && <a href={`mailto:${selected.customerEmail}`} className="mt-1 block break-all text-xs text-[#087553]">{selected.customerEmail}</a>}</div></div>
        <div className="mt-4 flex flex-wrap gap-2">{nextActions[selected.status]?.map((action) => <Button key={action.status} variant={action.status === "CANCELLED" || action.status === "REJECTED" ? "secondary" : "primary"} loading={statusMutation.isPending} disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: selected.id, next: action.status })}>{t(action.label)}</Button>)}{selected.business.whatsapp && <a className="btn btn-secondary" target="_blank" rel="noreferrer" href={`https://wa.me/${selected.business.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello ${selected.customerName}, regarding your booking ${selected.bookingNumber}…`)}`}><MessageCircle size={16} />{t("WhatsApp customer")}</a>}</div>
        {(selected.status === "PENDING" || selected.status === "CONFIRMED") && <div className="mt-5 rounded-xl border border-line p-4"><Label htmlFor="reschedule-at">{t("Reschedule")}</Label><div className="flex flex-col gap-2 sm:flex-row"><Input id="reschedule-at" type="datetime-local" value={rescheduleAt} onChange={(event) => setRescheduleAt(event.target.value)} /><Button variant="secondary" disabled={!rescheduleAt || rescheduleMutation.isPending} loading={rescheduleMutation.isPending} onClick={() => rescheduleMutation.mutate()} icon={<CalendarPlus size={15} />}>{t("Move booking")}</Button></div>{rescheduleMutation.isError && <div className="mt-2"><ErrorNotice message={rescheduleMutation.error.message} /></div>}</div>}
        <div className="mt-4"><Label htmlFor="owner-note">{t("Internal note")}</Label><Textarea id="owner-note" className="min-h-20" value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} placeholder={t("Add a note for your team. The customer does not see this.")} />{noteMutation.isError && <div className="mt-2"><ErrorNotice message={noteMutation.error.message} /></div>}{noteMutation.isSuccess && <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-success"><CheckCircle2 size={14} />{t("Note saved")}</p>}<Button variant="secondary" className="mt-2" disabled={noteMutation.isPending || note === selected.ownerNote} loading={noteMutation.isPending} onClick={() => noteMutation.mutate()}>{t("Save note")}</Button></div>
        {selected.customerNote && <p className="mt-4 whitespace-pre-wrap rounded-xl bg-[#fffaf0] p-3 text-xs leading-5 text-[#76522a]"><strong>{t("Customer note")}:</strong> {selected.customerNote}</p>}
        {statusMutation.isError && <div className="mt-3"><ErrorNotice message={statusMutation.error.message} /></div>}
      </Card>
    </div>}
  </div>;
}

function AvailabilityEditor({ businessId, data, isLoading, isError, error }: { businessId?: string; data?: SettingsResponse; isLoading: boolean; isError: boolean; error: Error | null }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState({ isEnabled: false, timezone: "Africa/Kigali", slotIntervalMinutes: 30, minNoticeMinutes: 60, maxAdvanceDays: 60, cancellationCutoffMinutes: 120, requireConfirmation: true });
  const [windows, setWindows] = useState<WindowRow[]>(weekdays.map((_, index) => ({ weekday: index + 1, enabled: index < 5, start: "09:00", end: "17:00" })));
  const [loaded, setLoaded] = useState(false);
  const [block, setBlock] = useState({ startsAt: "", endsAt: "", reason: "", serviceId: "" });

  useEffect(() => {
    if (!data || loaded) return;
    setSettings({
      isEnabled: data.settings.isEnabled,
      timezone: data.settings.timezone,
      slotIntervalMinutes: data.settings.slotIntervalMinutes,
      minNoticeMinutes: data.settings.minNoticeMinutes,
      maxAdvanceDays: data.settings.maxAdvanceDays,
      cancellationCutoffMinutes: data.settings.cancellationCutoffMinutes,
      requireConfirmation: data.settings.requireConfirmation,
    });
    setWindows(weekdays.map((_, index) => {
      const existing = data.windows.find((window) => window.weekday === index + 1 && window.isActive !== false);
      return { weekday: index + 1, enabled: Boolean(existing), start: minutesToTime(existing?.startMinute ?? 540), end: minutesToTime(existing?.endMinute ?? 1020) };
    }));
    setLoaded(true);
  }, [data, loaded]);

  const refresh = () => { if (businessId) void queryClient.invalidateQueries({ queryKey: queryKeys.bookingSettings(businessId) }); };
  const saveMutation = useMutation({
    mutationFn: async () => {
      await bookingService.updateSettings(businessId!, settings);
      await bookingService.replaceWindows(businessId!, windows.filter((window) => window.enabled).map((window) => ({ weekday: window.weekday, startMinute: timeToMinutes(window.start), endMinute: timeToMinutes(window.end) })));
    },
    onSuccess: refresh,
  });
  const blockMutation = useMutation({ mutationFn: () => bookingService.createBlock(businessId!, { startsAt: new Date(block.startsAt).toISOString(), endsAt: new Date(block.endsAt).toISOString(), reason: block.reason, serviceId: block.serviceId || null }), onSuccess: () => { setBlock({ startsAt: "", endsAt: "", reason: "", serviceId: "" }); refresh(); } });
  const deleteBlockMutation = useMutation({ mutationFn: (id: string) => bookingService.deleteBlock(businessId!, id), onSuccess: refresh });

  if (isLoading) return <p className="mt-8 text-sm text-muted">{t("Loading availability…")}</p>;
  if (isError) return <div className="mt-6"><ErrorNotice message={error?.message ?? t("Availability could not be loaded")} /></div>;

  return <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
    <div className="space-y-5">
      <Card className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-lg font-bold">{t("Online booking")}</h2><p className="mt-1 text-xs leading-5 text-muted">{t("Turn booking on and choose how much notice you need.")}</p></div><label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={settings.isEnabled} onChange={(event) => setSettings({ ...settings, isEnabled: event.target.checked })} className="size-4 accent-[#087553]" />{settings.isEnabled ? t("Enabled") : t("Disabled")}</label></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div><Label htmlFor="booking-timezone">{t("Timezone")}</Label><Input id="booking-timezone" value={settings.timezone} onChange={(event) => setSettings({ ...settings, timezone: event.target.value })} placeholder="Africa/Kigali" /></div>
          <div><Label htmlFor="booking-confirmation">{t("Confirmation")}</Label><Select id="booking-confirmation" value={settings.requireConfirmation ? "manual" : "auto"} onChange={(event) => setSettings({ ...settings, requireConfirmation: event.target.value === "manual" })}><option value="manual">{t("Review each request")}</option><option value="auto">{t("Confirm instantly")}</option></Select></div>
          <div><Label htmlFor="booking-interval">{t("Slot interval (minutes)")}</Label><Input id="booking-interval" type="number" min="5" max="240" value={settings.slotIntervalMinutes} onChange={(event) => setSettings({ ...settings, slotIntervalMinutes: Number(event.target.value) })} /></div>
          <div><Label htmlFor="booking-notice">{t("Minimum notice (minutes)")}</Label><Input id="booking-notice" type="number" min="0" max="20160" value={settings.minNoticeMinutes} onChange={(event) => setSettings({ ...settings, minNoticeMinutes: Number(event.target.value) })} /></div>
          <div><Label htmlFor="booking-advance">{t("Book up to (days ahead)")}</Label><Input id="booking-advance" type="number" min="1" max="365" value={settings.maxAdvanceDays} onChange={(event) => setSettings({ ...settings, maxAdvanceDays: Number(event.target.value) })} /></div>
          <div><Label htmlFor="booking-cutoff">{t("Cancellation cutoff (minutes)")}</Label><Input id="booking-cutoff" type="number" min="0" max="20160" value={settings.cancellationCutoffMinutes} onChange={(event) => setSettings({ ...settings, cancellationCutoffMinutes: Number(event.target.value) })} /></div>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <div><h2 className="font-display text-lg font-bold">{t("Weekly opening hours")}</h2><p className="mt-1 text-xs text-muted">{t("Customers can only book slots that fall inside these windows.")}</p></div>
        <div className="mt-4 space-y-2">{windows.map((window, index) => <div key={window.weekday} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-line p-3 sm:grid-cols-[8rem_1fr_auto_1fr]"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={window.enabled} onChange={(event) => setWindows(windows.map((row, i) => i === index ? { ...row, enabled: event.target.checked } : row))} className="size-4 accent-[#087553]" />{t(weekdays[index]!)}</label><Input aria-label={`${weekdays[index]} opening`} type="time" disabled={!window.enabled} value={window.start} onChange={(event) => setWindows(windows.map((row, i) => i === index ? { ...row, start: event.target.value } : row))} /><span className="hidden text-xs text-muted sm:block">{t("to")}</span><Input aria-label={`${weekdays[index]} closing`} type="time" disabled={!window.enabled} value={window.end} onChange={(event) => setWindows(windows.map((row, i) => i === index ? { ...row, end: event.target.value } : row))} /></div>)}</div>
        {saveMutation.isError && <div className="mt-3"><ErrorNotice message={saveMutation.error.message} /></div>}
        {saveMutation.isSuccess && <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-success"><CheckCircle2 size={14} />{t("Availability saved")}</p>}
        <Button className="mt-4" loading={saveMutation.isPending} disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>{t("Save availability")}</Button>
      </Card>
    </div>

    <Card className="p-5">
      <h2 className="font-display text-lg font-bold">{t("Time off")}</h2><p className="mt-1 text-xs leading-5 text-muted">{t("Block holidays or busy periods so customers cannot book them.")}</p>
      <div className="mt-4 space-y-3"><div><Label htmlFor="block-start">{t("Starts")}</Label><Input id="block-start" type="datetime-local" value={block.startsAt} onChange={(event) => setBlock({ ...block, startsAt: event.target.value })} /></div><div><Label htmlFor="block-end">{t("Ends")}</Label><Input id="block-end" type="datetime-local" value={block.endsAt} onChange={(event) => setBlock({ ...block, endsAt: event.target.value })} /></div><div><Label htmlFor="block-reason">{t("Reason")}</Label><Input id="block-reason" value={block.reason} onChange={(event) => setBlock({ ...block, reason: event.target.value })} maxLength={300} placeholder={t("e.g. Public holiday")} /></div><Button className="w-full" variant="secondary" icon={<Clock3 size={15} />} loading={blockMutation.isPending} disabled={!block.startsAt || !block.endsAt || blockMutation.isPending} onClick={() => blockMutation.mutate()}>{t("Add time off")}</Button>{blockMutation.isError && <ErrorNotice message={blockMutation.error.message} />}</div>
      <div className="mt-5 border-t border-line pt-4"><p className="text-xs font-bold uppercase tracking-wide text-muted">{t("Scheduled blocks")}</p>{data?.blocks.length ? <div className="mt-2 space-y-2">{data.blocks.map((entry) => <div key={entry.id} className="flex items-start justify-between gap-2 rounded-xl border border-line p-3 text-xs"><div><p className="font-semibold">{new Date(entry.startsAt).toLocaleString()} → {new Date(entry.endsAt).toLocaleString()}</p>{entry.reason && <p className="mt-0.5 text-muted">{entry.reason}</p>}</div><button type="button" onClick={() => deleteBlockMutation.mutate(entry.id)} aria-label={t("Remove time off")} className="text-[#a24934] hover:text-[#7d3524]"><Trash2 size={14} /></button></div>)}</div> : <p className="mt-2 text-xs text-muted">{t("No time off scheduled.")}</p>}</div>
    </Card>
  </div>;
}
