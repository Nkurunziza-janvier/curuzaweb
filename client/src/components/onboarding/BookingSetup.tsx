import { ArrowRight, BellRing, CalendarDays, Check, Clock3, Link2, ShieldCheck, Sparkles, Store, Zap } from "lucide-react";
import { ImageUploadField } from "../ImageUploadField";
import { resolveAssetUrl } from "../../services/api";
import { useLanguage } from "../../i18n";

export interface BookingDraft {
  name: string;
  description: string;
  price: string;
  duration: string;
  imageUrl: string;
  bookable: boolean;
  requireConfirmation: boolean;
  slotInterval: string;
}

export interface BookingAvailabilityDay {
  day: string;
  closed: boolean;
  hours: string;
}

interface Branding {
  businessName: string;
  category: string;
  city: string;
  logoUrl: string;
  coverImageUrl: string;
}

interface BookingSetupStepProps {
  draft: BookingDraft;
  onUpdate: (patch: Partial<BookingDraft>) => void;
  availability: BookingAvailabilityDay[];
  usingFallbackHours: boolean;
  onEditHours: () => void;
}

const durationPresets = ["30", "45", "60", "90"];

function durationLabel(duration: string, emptyLabel: string) {
  const value = Number(duration);
  return value > 0 ? `${value} min` : emptyLabel;
}

function priceLabel(price: string, emptyLabel: string) {
  const value = Number(price);
  return value > 0 ? `RWF ${value.toLocaleString()}` : emptyLabel;
}

export function BookingSetupStep({ draft, onUpdate, availability, usingFallbackHours, onEditHours }: BookingSetupStepProps) {
  const { t } = useLanguage();
  const openDays = availability.filter((day) => !day.closed);

  return <div className="space-y-4">
    <section className="relative overflow-hidden rounded-[1.4rem] border border-[#195e4a] bg-[#073e32] text-white shadow-[0_18px_45px_rgba(7,62,50,.16)]">
      <div aria-hidden="true" className="absolute -right-16 -top-20 size-56 rounded-full border border-white/10" />
      <div aria-hidden="true" className="absolute -right-6 -top-10 size-36 rounded-full border border-white/10" />
      <div className="relative p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/10 text-emerald-200"><CalendarDays size={21} /></span>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-emerald-200/80">{t("Online booking")}</p>
              <h2 className="mt-1 font-display text-xl font-extrabold leading-tight sm:text-[1.35rem]">{t("Let customers reserve your time.")}</h2>
              <p className="mt-1.5 max-w-md text-xs leading-5 text-emerald-50/75">{t("Turn this service into appointments. Customers choose an open time and receive a private booking link.")}</p>
            </div>
          </div>
          <button type="button" role="switch" aria-checked={draft.bookable} aria-label={t("Accept online bookings")} onClick={() => onUpdate({ bookable: !draft.bookable })} className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full border transition ${draft.bookable ? "border-emerald-300/50 bg-emerald-400" : "border-white/20 bg-white/15"}`}>
            <span className={`absolute top-1 size-5 rounded-full bg-white shadow-sm transition-all ${draft.bookable ? "left-6" : "left-1"}`} />
          </button>
        </div>
        <div className="mt-5 grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-3.5 text-center">
          {[{ icon: <Link2 size={13} />, label: t("Private link") }, { icon: <ShieldCheck size={13} />, label: t("No payment") }, { icon: <Clock3 size={13} />, label: t("Uses your hours") }].map((item) => <span key={item.label} className="flex min-w-0 flex-col items-center gap-1 px-1 text-[9px] font-bold text-emerald-50/70 sm:flex-row sm:justify-center sm:gap-1.5 sm:text-[10px]"><span className="text-emerald-200">{item.icon}</span><span className="truncate">{item.label}</span></span>)}
        </div>
      </div>
    </section>

    <section className="rounded-[1.4rem] border border-line bg-white p-5 shadow-[0_6px_24px_rgba(25,20,45,.035)] sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#e7f4ed] text-[11px] font-extrabold text-[#087553]">1</span>
        <div><h3 className="font-display text-base font-bold">{t("What can customers book?")}</h3><p className="mt-0.5 text-xs leading-5 text-muted">{t("Add your first service now. You can create more from your dashboard.")}</p></div>
      </div>

      <div className="mt-5 grid gap-4">
        <div>
          <label htmlFor="service-name" className="mb-2 flex items-center gap-2 text-[13px] font-bold text-ink">{t("Service name")} <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{t("optional")}</span></label>
          <input id="service-name" className="field" value={draft.name} onChange={(event) => onUpdate({ name: event.target.value })} maxLength={160} placeholder={t("e.g. Signature facial, home repair, portrait session")} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="service-price" className="mb-2 block text-[13px] font-bold text-ink">{t("Starting price (RWF)")}</label>
            <div className="relative"><span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">RWF</span><input id="service-price" type="number" min="0" className="field pl-14" value={draft.price} onChange={(event) => onUpdate({ price: event.target.value })} placeholder="0" /></div>
          </div>
          <div>
            <label htmlFor="service-duration" className="mb-2 block text-[13px] font-bold text-ink">{t("Appointment length")}</label>
            <div className="relative"><input id="service-duration" type="number" min="5" max="720" className="field pr-16" value={draft.duration} onChange={(event) => onUpdate({ duration: event.target.value })} /><span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted">{t("minutes")}</span></div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {durationPresets.map((preset) => <button key={preset} type="button" onClick={() => onUpdate({ duration: preset })} className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${draft.duration === preset ? "border-[#087553] bg-[#e7f4ed] text-[#087553]" : "border-line bg-white text-muted hover:border-[#a9cdb9]"}`}>{preset} {t("min")}</button>)}
        </div>

        <div>
          <label htmlFor="service-description" className="mb-2 flex items-center gap-2 text-[13px] font-bold text-ink">{t("Description")} <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{t("optional")}</span></label>
          <textarea id="service-description" rows={3} maxLength={2000} className="field min-h-20 resize-y" value={draft.description} onChange={(event) => onUpdate({ description: event.target.value })} placeholder={t("What is included, who it is for, and what customers should expect.")} />
        </div>

        <ImageUploadField title={t("Service photo (optional)")} description={t("A clear photo helps customers choose with confidence.")} value={draft.imageUrl} onChange={(imageUrl) => onUpdate({ imageUrl })} shape="wide" />
      </div>
    </section>

    {draft.bookable && <>
      <section className="rounded-[1.4rem] border border-line bg-white p-5 shadow-[0_6px_24px_rgba(25,20,45,.035)] sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#e7f4ed] text-[11px] font-extrabold text-[#087553]">2</span>
          <div><h3 className="font-display text-base font-bold">{t("Choose how bookings work.")}</h3><p className="mt-0.5 text-xs leading-5 text-muted">{t("You stay in control of every appointment.")}</p></div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button type="button" aria-pressed={draft.requireConfirmation} onClick={() => onUpdate({ requireConfirmation: true })} className={`relative rounded-2xl border p-4 text-left transition ${draft.requireConfirmation ? "border-[#087553] bg-[#f1faf5] ring-1 ring-[#087553]" : "border-line bg-white hover:border-[#b8d4c4]"}`}>
            <span className="grid size-9 place-items-center rounded-xl bg-[#e4f4eb] text-[#087553]"><BellRing size={17} /></span>
            <strong className="mt-3 block text-[13px]">{t("Review each request")}</strong>
            <span className="mt-1 block text-[11px] leading-5 text-muted">{t("Approve, reschedule, or decline before the time is held.")}</span>
            {draft.requireConfirmation && <span className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-[#087553] text-white"><Check size={12} /></span>}
          </button>
          <button type="button" aria-pressed={!draft.requireConfirmation} onClick={() => onUpdate({ requireConfirmation: false })} className={`relative rounded-2xl border p-4 text-left transition ${!draft.requireConfirmation ? "border-[#087553] bg-[#f1faf5] ring-1 ring-[#087553]" : "border-line bg-white hover:border-[#b8d4c4]"}`}>
            <span className="grid size-9 place-items-center rounded-xl bg-[#fff2e7] text-[#b4662e]"><Zap size={17} /></span>
            <strong className="mt-3 block text-[13px]">{t("Confirm instantly")}</strong>
            <span className="mt-1 block text-[11px] leading-5 text-muted">{t("The time is reserved as soon as the customer books.")}</span>
            {!draft.requireConfirmation && <span className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-[#087553] text-white"><Check size={12} /></span>}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#faf9f5] px-4 py-3">
          <div><p className="text-xs font-bold text-ink">{t("Time between booking options")}</p><p className="mt-0.5 text-[11px] text-muted">{t("How often customers can start an appointment.")}</p></div>
          <select aria-label={t("Time between booking options")} className="field h-10 min-h-0 w-auto py-0 text-xs font-semibold" value={draft.slotInterval} onChange={(event) => onUpdate({ slotInterval: event.target.value })}>
            <option value="15">15 {t("min")}</option>
            <option value="30">30 {t("min")}</option>
            <option value="45">45 {t("min")}</option>
            <option value="60">60 {t("min")}</option>
          </select>
        </div>
      </section>

      <section className="rounded-[1.4rem] border border-line bg-white p-5 shadow-[0_6px_24px_rgba(25,20,45,.035)] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#e7f4ed] text-[11px] font-extrabold text-[#087553]">3</span>
            <div><h3 className="font-display text-base font-bold">{t("When can customers book?")}</h3><p className="mt-0.5 text-xs leading-5 text-muted">{t("Availability follows your opening hours.")}</p></div>
          </div>
          <button type="button" onClick={onEditHours} className="shrink-0 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[10px] font-bold text-[#087553] transition hover:border-[#9bc8aa] hover:bg-[#f4faf7]">{t("Edit hours")}</button>
        </div>
        <div className="mt-4 divide-y divide-[#eef2ed] overflow-hidden rounded-2xl border border-[#e8eee8]">
          {availability.map((day) => <div key={day.day} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs">
            <span className="flex items-center gap-2 font-semibold text-ink"><span className={`grid size-5 place-items-center rounded-full ${day.closed ? "bg-[#f0f0ec] text-[#a3a29a]" : "bg-[#e3f4ea] text-[#087553]"}`}>{day.closed ? <span className="size-1.5 rounded-full bg-current" /> : <Check size={11} />}</span>{day.day}</span>
            <span className={day.closed ? "text-muted" : "font-semibold text-[#3f6154]"}>{day.closed ? t("Closed") : day.hours}</span>
          </div>)}
        </div>
        {usingFallbackHours && <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#fff8e8] px-3 py-2.5 text-[11px] leading-5 text-[#7c6124]"><Sparkles size={14} className="mt-0.5 shrink-0" />{t("No opening hours are set, so booking will start with Monday–Friday, 9:00 AM–5:00 PM. You can change this any time.")}</p>}
      </section>

      <section className="rounded-[1.4rem] border border-[#dce9e1] bg-[#f7faf6] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#4b7a67]">{t("Customer preview")}</p><h3 className="mt-1 font-display text-base font-bold">{t("This is what customers will see.")}</h3></div><span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#087553] shadow-sm">{t("Live")}</span></div>
        <div className="mt-4 rounded-2xl border border-[#dce9e1] bg-white p-3.5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#e7f4ed] text-[#087553]">{draft.imageUrl ? <img src={resolveAssetUrl(draft.imageUrl)} alt="" className="size-full object-cover" /> : <CalendarDays size={20} />}</span>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{draft.name || t("Your first service")}</p><p className="mt-1 flex items-center gap-2 text-[11px] text-muted"><Clock3 size={12} />{durationLabel(draft.duration, t("Set a duration"))} <span className="size-1 rounded-full bg-[#b9c6bf]" /> {priceLabel(draft.price, t("Price on request"))}</p></div>
          </div>
          <div className="mt-3 grid grid-cols-5 gap-1.5">
            {!openDays.length && <p className="col-span-5 rounded-lg bg-[#f6f8f4] px-3 py-2 text-center text-[10px] text-muted">{t("Add opening hours to show bookable days.")}</p>}
            {openDays.slice(0, 5).map((day, index) => <div key={day.day} className={`rounded-lg border px-1 py-2 text-center ${index === 0 ? "border-[#087553] bg-[#075b43] text-white" : "border-[#e0e9e1] bg-white text-[#537066]"}`}><span className="block text-[9px] font-bold uppercase tracking-wide">{day.day.slice(0, 3)}</span><span className={`mt-0.5 block text-[9px] ${index === 0 ? "text-emerald-100" : "text-muted"}`}>{index === 0 ? day.hours.split("–")[0]?.trim() : "—"}</span></div>)}
          </div>
          <div className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-[#087553] px-3 py-2.5 text-xs font-bold text-white">{draft.requireConfirmation ? t("Request appointment") : t("Confirm appointment")} <ArrowRight size={13} /></div>
        </div>
      </section>
    </>}
  </div>;
}

export function BookingPhonePreview({ branding, draft, availability }: { branding: Branding; draft: BookingDraft; availability: BookingAvailabilityDay[] }) {
  const { t } = useLanguage();
  const openDays = availability.filter((day) => !day.closed);
  return <div className="mx-auto w-72 rounded-[2rem] border-8 border-ink bg-white p-2 shadow-float">
    <div className="overflow-hidden rounded-[1.4rem]">
      <div className="relative h-36 bg-[#eef3ed]">
        {branding.coverImageUrl ? <img src={resolveAssetUrl(branding.coverImageUrl)} alt="" className="size-full object-cover" /> : <div className="grid size-full place-items-center bg-gradient-to-br from-[#dcefe3] to-[#f6f3e9] text-[#087553]"><CalendarDays size={28} /></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-[#062a22]/65 to-transparent" />
        <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide text-[#087553]">{t("Book online")}</span>
      </div>
      <div className="p-4">
        <div className="-mt-10 grid size-14 place-items-center overflow-hidden rounded-2xl border-4 border-white bg-[#075b43] font-bold text-white shadow-card">{branding.logoUrl ? <img src={resolveAssetUrl(branding.logoUrl)} alt="" className="size-full object-cover" /> : <Store size={20} />}</div>
        <p className="mt-2 font-display text-lg font-bold">{branding.businessName || t("Your business")}</p>
        <p className="text-[11px] text-muted">{branding.category} · {branding.city || t("Your city")}</p>
        <div className="mt-4 rounded-2xl border border-[#e2ece4] bg-[#fbfdfb] p-3">
          <p className="text-[9px] font-extrabold uppercase tracking-[.16em] text-[#6b8b7c]">{t("Book an appointment")}</p>
          <p className="mt-1 truncate text-sm font-bold">{draft.name || t("Your first service")}</p>
          <p className="mt-1 flex items-center gap-1.5 text-[10px] text-muted"><Clock3 size={11} />{durationLabel(draft.duration, t("Set a duration"))} · {priceLabel(draft.price, t("Price on request"))}</p>
          <div className="mt-3 grid grid-cols-5 gap-1">
            {!openDays.length && <p className="col-span-5 rounded-lg bg-[#f6f8f4] px-2 py-1.5 text-center text-[8px] text-muted">{t("Add opening hours to show bookable days.")}</p>}
            {openDays.slice(0, 5).map((day, index) => <span key={day.day} className={`rounded-md border py-1.5 text-center text-[8px] font-bold ${index === 0 ? "border-[#087553] bg-[#075b43] text-white" : "border-[#e0e9e1] bg-white text-[#537066]"}`}>{day.day.slice(0, 3)}</span>)}
          </div>
          <div className="mt-2 rounded-lg bg-[#087553] py-2 text-center text-[10px] font-bold text-white">{draft.requireConfirmation ? t("Request appointment") : t("Confirm appointment")}</div>
        </div>
        <p className="mt-3 text-center text-[9px] leading-4 text-muted">{t("A private link is created after booking. No account or payment is needed.")}</p>
      </div>
    </div>
  </div>;
}

export function StorefrontPhonePreview({ branding }: { branding: Branding }) {
  const { t } = useLanguage();
  return <div className="mx-auto w-72 rounded-[2rem] border-8 border-ink bg-white p-2 shadow-float">
    <div className="overflow-hidden rounded-[1.4rem]">
      <div className="relative h-40 bg-[#f0eee9]">
        {branding.coverImageUrl ? <img src={resolveAssetUrl(branding.coverImageUrl)} alt="" className="size-full object-cover" /> : <div className="grid size-full place-items-center bg-gradient-to-br from-violet-soft to-coral-soft text-violet"><Store size={30} /></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/40 to-transparent" />
      </div>
      <div className="p-4">
        <div className="-mt-9 grid size-14 place-items-center overflow-hidden rounded-xl border-4 border-white bg-coral font-bold text-white shadow-card">{branding.logoUrl ? <img src={resolveAssetUrl(branding.logoUrl)} alt="" className="size-full object-cover" /> : <Store size={20} />}</div>
        <p className="mt-2 font-display text-lg font-bold">{branding.businessName || t("Your business")}</p>
        <p className="text-xs text-muted">{branding.category} · {branding.city || t("Your city")}</p>
        <div className="mt-4 grid grid-cols-2 gap-2"><span className="rounded-lg bg-coral p-2 text-center text-[.65rem] font-bold text-white">{t("Request quote")}</span><span className="rounded-lg bg-ink p-2 text-center text-[.65rem] font-bold text-white">WhatsApp</span></div>
        <div className="mt-4 space-y-2">{[Store, CalendarDays, ShieldCheck].map((Icon, index) => <div key={index} className="flex items-center gap-2 rounded-lg border border-line p-2"><Icon size={13} className="text-coral" /><i className="h-2 w-28 rounded bg-line" /></div>)}</div>
      </div>
    </div>
  </div>;
}
