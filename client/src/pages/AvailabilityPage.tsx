import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CalendarOff, Check, Clock3, LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import { bookingService } from "../services/api";
import { useCurrentUser } from "../hooks/apiHooks";
import { Badge, Button, Card, Heading, Input, Label, Select, Stat } from "../components/ui";
import { useLanguage } from "../i18n";
import type { AvailabilityBlock, AvailabilityWindow, BookingSettings } from "../types/booking";

interface SettingsResponse {
  settings: BookingSettings;
  configured: boolean;
  windows: AvailabilityWindow[];
  blocks: AvailabilityBlock[];
}

const weekdays = [
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
  { value: 7, label: "Sunday", short: "Sun" },
];

const toLabel = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
const toMinutes = (value: string) => {
  const [hour, minute] = value.split(":").map(Number);
  return (hour ?? 0) * 60 + (minute ?? 0);
};

export default function AvailabilityPage() {
  const { t, locale } = useLanguage();
  const { data: user } = useCurrentUser();
  const businessId = user?.business?.id ?? "";
  const queryClient = useQueryClient();
  const queryKey = ["booking-settings", businessId];
  const query = useQuery<SettingsResponse>({
    queryKey,
    queryFn: () => bookingService.getSettings<SettingsResponse>(businessId),
    enabled: Boolean(businessId),
  });
  const [settings, setSettings] = useState<Omit<BookingSettings, "businessId">>({
    isEnabled: false,
    timezone: "Africa/Kigali",
    slotIntervalMinutes: 30,
    minNoticeMinutes: 120,
    maxAdvanceDays: 60,
    cancellationCutoffMinutes: 240,
    requireConfirmation: true,
  });
  const [windows, setWindows] = useState<AvailabilityWindow[]>([]);
  const [blockForm, setBlockForm] = useState({ startsAt: "", endsAt: "", reason: "" });

  useEffect(() => {
    if (!query.data) return;
    const { settings: saved, windows: savedWindows } = query.data;
    setSettings({
      isEnabled: saved.isEnabled,
      timezone: saved.timezone,
      slotIntervalMinutes: saved.slotIntervalMinutes,
      minNoticeMinutes: saved.minNoticeMinutes,
      maxAdvanceDays: saved.maxAdvanceDays,
      cancellationCutoffMinutes: saved.cancellationCutoffMinutes,
      requireConfirmation: saved.requireConfirmation,
    });
    setWindows(savedWindows.length ? savedWindows.map((window) => ({ weekday: window.weekday, startMinute: window.startMinute, endMinute: window.endMinute })) : [1, 2, 3, 4, 5].map((weekday) => ({ weekday, startMinute: 540, endMinute: 1020 })));
  }, [query.data]);

  const settingsMutation = useMutation({
    mutationFn: () => bookingService.updateSettings<BookingSettings>(businessId, settings),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
  });
  const windowsMutation = useMutation({
    mutationFn: () => bookingService.replaceWindows<AvailabilityWindow[]>(businessId, windows),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
  });
  const blockMutation = useMutation({
    mutationFn: () => bookingService.createBlock<AvailabilityBlock>(businessId, {
      startsAt: new Date(blockForm.startsAt).toISOString(),
      endsAt: new Date(blockForm.endsAt).toISOString(),
      reason: blockForm.reason.trim(),
    }),
    onSuccess: () => {
      setBlockForm({ startsAt: "", endsAt: "", reason: "" });
      void queryClient.invalidateQueries({ queryKey });
    },
  });
  const deleteBlockMutation = useMutation({
    mutationFn: (blockId: string) => bookingService.deleteBlock(businessId, blockId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
  });

  const totalWeeklyHours = useMemo(() => (windows.reduce((total, window) => total + Math.max(0, window.endMinute - window.startMinute), 0) / 60).toFixed(1), [windows]);
  const addWindow = (weekday: number) => {
    const existing = windows.filter((window) => window.weekday === weekday);
    const last = existing[existing.length - 1];
    const startMinute = last ? Math.min(last.endMinute + 60, 1380) : 540;
    setWindows([...windows, { weekday, startMinute, endMinute: Math.min(startMinute + 480, 1440) }]);
  };
  const updateWindow = (index: number, updates: Partial<AvailabilityWindow>) => setWindows(windows.map((window, current) => current === index ? { ...window, ...updates } : window));
  const removeWindow = (index: number) => setWindows(windows.filter((_, current) => current !== index));
  const toggleDay = (weekday: number, enabled: boolean) => setWindows(enabled ? [...windows, { weekday, startMinute: 540, endMinute: 1020 }] : windows.filter((window) => window.weekday !== weekday));

  if (!businessId) return <Card className="p-8">{t("Business information is still loading.")}</Card>;

  return <div className="mx-auto max-w-6xl">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">{t("Appointments")}</p><Heading as="h1">{t("Availability")}</Heading><p className="mt-2 max-w-2xl text-muted">{t("Set weekly booking hours, control how customers book, and block time for holidays or personal commitments.")}</p></div><Badge tone={settings.isEnabled ? "success" : "neutral"}>{settings.isEnabled ? t("Online booking is on") : t("Online booking is off")}</Badge></div>

    {query.isLoading ? <div className="mt-8 flex items-center gap-2 text-sm text-muted"><LoaderCircle size={16} className="animate-spin" />{t("Loading availability.")}</div> : query.isError ? <p className="mt-6 rounded-2xl bg-[#fff3ef] p-4 text-sm text-[#9a3d2c]">{query.error.message}</p> : <>
      <div className="mt-6 grid gap-4 sm:grid-cols-3"><Stat label={t("Bookable days")} value={`${new Set(windows.map((window) => window.weekday)).size} / 7`} icon={<CalendarClock size={19} />} /><Stat label={t("Weekly hours")} value={`${totalWeeklyHours} h`} icon={<Clock3 size={19} />} /><Stat label={t("Upcoming blocks")} value={String((query.data?.blocks ?? []).filter((block) => new Date(block.endsAt) > new Date()).length)} icon={<CalendarOff size={19} />} /></div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,.75fr)]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-lg font-bold">{t("Weekly booking hours")}</h2><p className="mt-1 text-xs leading-5 text-muted">{t("Customers can start appointments inside these hours. Existing appointments are never removed when you change your hours.")}</p></div><Button variant="secondary" loading={windowsMutation.isPending} onClick={() => windowsMutation.mutate()} icon={<Save size={15} />}>{t("Save hours")}</Button></div>
          {windowsMutation.isError && <p className="mt-3 rounded-xl bg-[#fff3ef] p-3 text-xs text-[#9a3d2c]">{windowsMutation.error.message}</p>}
          {windowsMutation.isSuccess && <p className="mt-3 flex items-center gap-2 rounded-xl bg-[#eef9f3] p-3 text-xs font-semibold text-[#076146]"><Check size={14} />{t("Weekly hours saved.")}</p>}
          <div className="mt-4 divide-y divide-[#eef3f0]">{weekdays.map((day) => {
            const dayWindows = windows.map((window, index) => ({ window, index })).filter(({ window }) => window.weekday === day.value);
            const date = new Date();
            const current = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
            return <div key={day.value} className="py-3"><div className="flex flex-wrap items-center justify-between gap-2"><button type="button" onClick={() => toggleDay(day.value, dayWindows.length === 0)} className={`inline-flex items-center gap-2 text-sm font-bold ${dayWindows.length ? "text-[#17453d]" : "text-[#8a9a95]"}`}><span className={`grid size-5 place-items-center rounded-md border ${dayWindows.length ? "border-[#087553] bg-[#087553] text-white" : "border-[#cadbd4]"}`}>{dayWindows.length > 0 && <Check size={12} />}</span>{t(day.label)}{day.value === current && <span className="rounded-full bg-[#eef5f1] px-2 py-0.5 text-[9px] font-bold text-[#658077]">{t("today")}</span>}</button>{dayWindows.length > 0 && <button type="button" onClick={() => addWindow(day.value)} className="inline-flex items-center gap-1 text-[10px] font-bold text-[#087553] hover:underline"><Plus size={12} />{t("Add hours")}</button>}</div>{dayWindows.length > 0 && <div className="mt-2 space-y-2">{dayWindows.map(({ window, index }) => <div key={index} className="flex flex-wrap items-center gap-2 pl-7"><Input aria-label={`${day.label} opening time`} type="time" value={toLabel(window.startMinute)} onChange={(event) => updateWindow(index, { startMinute: toMinutes(event.target.value) })} className="!min-h-9 !w-32 !text-xs" /><span className="text-[11px] text-[#7a9089]">{t("to")}</span><Input aria-label={`${day.label} closing time`} type="time" value={toLabel(window.endMinute)} onChange={(event) => updateWindow(index, { endMinute: toMinutes(event.target.value) })} className="!min-h-9 !w-32 !text-xs" /><button type="button" onClick={() => removeWindow(index)} aria-label={`${t("Remove")} ${day.label}`} className="grid size-8 place-items-center rounded-lg text-[#9a6b5f] hover:bg-[#fff2ee]"><Trash2 size={14} /></button></div>)}</div>}</div>;
          })}</div>
        </Card>

        <div className="space-y-5">
          <Card className="p-5 sm:p-6"><h2 className="font-display text-lg font-bold">{t("Booking rules")}</h2><p className="mt-1 text-xs leading-5 text-muted">{t("These settings apply to every bookable service.")}</p><div className="mt-4 space-y-4">
            <label className="flex items-start justify-between gap-3 rounded-xl border border-[#e5eeea] p-3"><span><span className="block text-sm font-bold">{t("Enable online booking")}</span><span className="mt-0.5 block text-[11px] leading-4 text-muted">{t("Show booking buttons and availability on your public page.")}</span></span><input type="checkbox" checked={settings.isEnabled} onChange={(event) => setSettings({ ...settings, isEnabled: event.target.checked })} className="mt-1 size-4 accent-[#087553]" /></label>
            <label className="flex items-start justify-between gap-3 rounded-xl border border-[#e5eeea] p-3"><span><span className="block text-sm font-bold">{t("Require confirmation")}</span><span className="mt-0.5 block text-[11px] leading-4 text-muted">{t("New bookings stay pending until you confirm them.")}</span></span><input type="checkbox" checked={settings.requireConfirmation} onChange={(event) => setSettings({ ...settings, requireConfirmation: event.target.checked })} className="mt-1 size-4 accent-[#087553]" /></label>
            <div><Label htmlFor="booking-timezone">{t("Timezone")}</Label><Select id="booking-timezone" value={settings.timezone} onChange={(event) => setSettings({ ...settings, timezone: event.target.value })}><option value="Africa/Kigali">Africa/Kigali (CAT)</option><option value="Africa/Nairobi">Africa/Nairobi (EAT)</option><option value="Africa/Lagos">Africa/Lagos (WAT)</option><option value="Africa/Johannesburg">Africa/Johannesburg (SAST)</option><option value="Europe/London">Europe/London</option><option value="UTC">UTC</option></Select></div>
            <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="slot-interval">{t("Time slot every")}</Label><Select id="slot-interval" value={settings.slotIntervalMinutes} onChange={(event) => setSettings({ ...settings, slotIntervalMinutes: Number(event.target.value) })}><option value={15}>15 {t("min")}</option><option value={30}>30 {t("min")}</option><option value={60}>60 {t("min")}</option></Select></div><div><Label htmlFor="min-notice">{t("Minimum notice")}</Label><Select id="min-notice" value={settings.minNoticeMinutes} onChange={(event) => setSettings({ ...settings, minNoticeMinutes: Number(event.target.value) })}><option value={0}>{t("No minimum")}</option><option value={60}>1 {t("hour")}</option><option value={120}>2 {t("hours")}</option><option value={240}>4 {t("hours")}</option><option value={1440}>1 {t("day")}</option></Select></div><div><Label htmlFor="advance-days">{t("Book up to")}</Label><Select id="advance-days" value={settings.maxAdvanceDays} onChange={(event) => setSettings({ ...settings, maxAdvanceDays: Number(event.target.value) })}><option value={14}>14 {t("days")}</option><option value={30}>30 {t("days")}</option><option value={60}>60 {t("days")}</option><option value={90}>90 {t("days")}</option></Select></div><div><Label htmlFor="cancel-cutoff">{t("Cancel up to")}</Label><Select id="cancel-cutoff" value={settings.cancellationCutoffMinutes} onChange={(event) => setSettings({ ...settings, cancellationCutoffMinutes: Number(event.target.value) })}><option value={0}>{t("Any time")}</option><option value={60}>1 {t("hour")} {t("before")}</option><option value={240}>4 {t("hours")} {t("before")}</option><option value={1440}>1 {t("day")} {t("before")}</option><option value={2880}>2 {t("days")} {t("before")}</option></Select></div></div>
            {settingsMutation.isError && <p className="rounded-xl bg-[#fff3ef] p-3 text-xs text-[#9a3d2c]">{settingsMutation.error.message}</p>}
            {settingsMutation.isSuccess && <p className="flex items-center gap-2 rounded-xl bg-[#eef9f3] p-3 text-xs font-semibold text-[#076146]"><Check size={14} />{t("Booking rules saved.")}</p>}
            <Button loading={settingsMutation.isPending} onClick={() => settingsMutation.mutate()} icon={<Save size={15} />} className="w-full">{t("Save booking rules")}</Button>
          </div></Card>
        </div>
      </div>

      <Card className="mt-5 p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-display text-lg font-bold">{t("Time off & blocked time")}</h2><p className="mt-1 text-xs leading-5 text-muted">{t("Block holidays, training, or personal time. Customers will not see slots inside a block.")}</p></div></div><div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_1.2fr_auto]"><div><Label htmlFor="block-start">{t("Starts")}</Label><Input id="block-start" type="datetime-local" value={blockForm.startsAt} onChange={(event) => setBlockForm({ ...blockForm, startsAt: event.target.value })} className="!min-h-10 text-xs" /></div><div><Label htmlFor="block-end">{t("Ends")}</Label><Input id="block-end" type="datetime-local" value={blockForm.endsAt} onChange={(event) => setBlockForm({ ...blockForm, endsAt: event.target.value })} className="!min-h-10 text-xs" /></div><div><Label htmlFor="block-reason">{t("Reason")}</Label><Input id="block-reason" value={blockForm.reason} onChange={(event) => setBlockForm({ ...blockForm, reason: event.target.value })} placeholder={t("e.g. Public holiday")} className="!min-h-10 text-xs" /></div><div className="flex items-end"><Button loading={blockMutation.isPending} disabled={!blockForm.startsAt || !blockForm.endsAt || new Date(blockForm.endsAt) <= new Date(blockForm.startsAt)} onClick={() => blockMutation.mutate()} icon={<Plus size={15} />}>{t("Add block")}</Button></div></div>{blockMutation.isError && <p className="mt-3 rounded-xl bg-[#fff3ef] p-3 text-xs text-[#9a3d2c]">{blockMutation.error.message}</p>}
        <div className="mt-4 divide-y divide-[#eef3f0]">{(query.data?.blocks ?? []).length ? (query.data?.blocks ?? []).map((block) => <div key={block.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><div><p className="text-sm font-bold">{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: settings.timezone }).format(new Date(block.startsAt))} – {new Intl.DateTimeFormat(locale, { timeStyle: "short", timeZone: settings.timezone }).format(new Date(block.endsAt))}</p><p className="mt-0.5 text-xs text-muted">{block.reason || t("Blocked time")}</p></div><Button variant="ghost" onClick={() => deleteBlockMutation.mutate(block.id)} icon={<Trash2 size={15} />}>{t("Remove")}</Button></div>) : <p className="py-5 text-sm text-muted">{t("No blocked time. Your weekly hours apply.")}</p>}</div>
      </Card>
    </>}
  </div>;
}

