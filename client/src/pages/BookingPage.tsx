import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BadgeCheck, CalendarDays, Check, ChevronRight, Clock3, Copy, LoaderCircle, MessageCircle, ShieldCheck, Store } from "lucide-react";
import { bookingService, resolveAssetUrl } from "../services/api";
import { useBookingAvailability, usePublicBusiness } from "../hooks/apiHooks";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { Button, Card, Heading, Input, Label, Textarea } from "../components/ui";
import BrandLoader from "../components/BrandLoader";
import { LanguageSwitcher, useLanguage } from "../i18n";
import type { PublicBusiness } from "./PublicBusinessPage";
import type { PublicBooking, PublicBookingAvailability, BookingSlot } from "../types/booking";

const money = (amount: number | string, currency: string) => `${currency} ${Number(amount).toLocaleString()}`;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function dateKeyInZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateLabel(dateKey: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${dateKey}T12:00:00.000Z`));
}

function longDateLabel(dateKey: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${dateKey}T12:00:00.000Z`));
}

function timeLabel(value: string, timeZone: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone }).format(new Date(value));
}

export default function BookingPage() {
  const { t, locale } = useLanguage();
  const { businessSlug } = useParams();
  const [params] = useSearchParams();
  const requestedService = params.get("service") ?? "";
  const { data: business, isLoading, isError } = usePublicBusiness<PublicBusiness>(businessSlug);
  const timezone = business?.bookingSettings?.timezone ?? "Africa/Kigali";
  const today = useMemo(() => dateKeyInZone(new Date(), timezone), [timezone]);
  const rangeEnd = useMemo(() => addDays(today, 20), [today]);
  const bookableServices = useMemo(() => (business?.services ?? []).filter((service) => service.isBookable && service.durationMinutes), [business?.services]);
  const [serviceId, setServiceId] = useState(requestedService);
  const [selectedDate, setSelectedDate] = useState("");
  const [slot, setSlot] = useState<BookingSlot | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [created, setCreated] = useState<PublicBooking | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ customerName: "", customerPhone: "", customerEmail: "", customerNote: "" });

  useEffect(() => {
    if (!bookableServices.length) return;
    if (!bookableServices.some((service) => service.id === serviceId)) {
      setServiceId(bookableServices[0]!.id);
      setSlot(null);
      setSelectedDate("");
    }
  }, [bookableServices, serviceId]);

  const selectedService = bookableServices.find((service) => service.id === serviceId) ?? null;
  const availabilityQuery = useBookingAvailability<PublicBookingAvailability>(businessSlug, selectedService?.id, today, rangeEnd);
  const availableDays = useMemo(() => (availabilityQuery.data?.days ?? []).filter((day) => day.slots.length > 0), [availabilityQuery.data?.days]);

  useEffect(() => {
    if (availableDays.length && !availableDays.some((day) => day.date === selectedDate)) {
      setSelectedDate(availableDays[0]!.date);
      setSlot(null);
    }
  }, [availableDays, selectedDate]);

  const activeDay = availabilityQuery.data?.days.find((day) => day.date === selectedDate);
  const createMutation = useMutation({
    mutationFn: () => bookingService.create<PublicBooking>(businessSlug!, {
      serviceId,
      startAt: slot!.startAt,
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.trim(),
      customerEmail: form.customerEmail.trim(),
      customerNote: form.customerNote.trim(),
    }),
    onSuccess: (booking) => {
      setCreated(booking);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  });

  useDocumentMeta({
    title: business ? `Book ${business.name} · e-businessRw` : "Book an appointment · e-businessRw",
    description: business?.tagline || business?.description || (business ? `Book an appointment with ${business.name}.` : undefined),
    image: business?.coverImageUrl ?? business?.logoUrl,
  });

  if (isLoading) return <BrandLoader />;
  if (isError || !business) return <main className="grid min-h-screen place-items-center bg-[#f3f8f5] p-5"><div className="absolute right-5 top-5"><LanguageSwitcher compact /></div><Card className="max-w-lg p-8 text-center"><Heading as="h1">{t("Booking is unavailable")}</Heading><p className="mt-3 text-muted">{t("This business page could not be loaded.")}</p><Link to="/" className="mt-6 inline-flex font-bold text-[#087553]">{t("Back to e-businessRw")}</Link></Card></main>;

  const bookingEnabled = Boolean(business.bookingSettings?.isEnabled && business.availabilityWindows?.length);
  const phoneInvalid = Boolean(form.customerPhone.trim() && form.customerPhone.replace(/\D/g, "").length < 7);
  const emailInvalid = Boolean(form.customerEmail.trim() && !emailPattern.test(form.customerEmail.trim()));
  const hasContact = Boolean(form.customerPhone.trim() || form.customerEmail.trim());
  const canSubmit = Boolean(slot && form.customerName.trim().length >= 2 && hasContact && !phoneInvalid && !emailInvalid);
  const privateLink = created ? `${window.location.origin}/bookings/${created.publicToken}` : "";
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(privateLink); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { setCopied(false); }
  };

  return <div className="min-h-screen bg-[#f3f8f5] text-[#143d38]">
    <header className="border-b border-[#dce9e4] bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to={`/b/${business.slug}`} className="inline-flex min-w-0 items-center gap-2 text-sm font-bold text-[#2b5b53] hover:text-[#087553]"><ArrowLeft size={16} /><span className="truncate">{business.name}</span></Link>
        <LanguageSwitcher compact />
      </div>
    </header>

    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      {created ? <SuccessPanel booking={created} business={business} privateLink={privateLink} copied={copied} onCopy={() => void copyLink()} /> : !bookingEnabled ? <Card className="mx-auto max-w-2xl p-8 text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#edf6f2] text-[#087553]"><CalendarDays size={24} /></span><Heading as="h1" className="mt-4">{t("Online booking is not available yet")}</Heading><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">{t("This business has not opened online booking. You can still send a request and they will get back to you.")}</p><div className="mt-6 flex flex-wrap justify-center gap-2"><Link to={`/b/${business.slug}/request`} className="btn btn-primary">{t("Send a request")}</Link><Link to={`/b/${business.slug}`} className="btn btn-secondary">{t("Back to business page")}</Link></div></Card> : !bookableServices.length ? <Card className="mx-auto max-w-2xl p-8 text-center"><Heading as="h1">{t("No services can be booked online yet")}</Heading><p className="mt-3 text-sm text-muted">{t("Send a request and the business will help you arrange a time.")}</p><Link to={`/b/${business.slug}/request`} className="btn btn-primary mt-6">{t("Send a request")}</Link></Card> : <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#4a8b78]">{t("Book with")} {business.name}</p>
            <Heading as="h1" className="mt-1">{t("Choose a time that works for you")}</Heading>
            <p className="mt-2 text-sm leading-6 text-muted">{t("Select a service, pick an available slot, and share your contact details. No account is needed.")}</p>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-bold">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ${step === 1 ? "bg-[#075b43] text-white" : "bg-[#dff2e9] text-[#087553]"}`}>{step === 1 ? "1" : <Check size={12} />} {t("Service & time")}</span>
            <ChevronRight size={14} className="text-[#9ab4ab]" />
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ${step === 2 ? "bg-[#075b43] text-white" : "bg-white text-[#6c817b]"}`}>2 {t("Your details")}</span>
          </div>

          {step === 1 ? <>
            <Card className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3"><div><h2 className="font-display text-lg font-bold">{t("Service")}</h2><p className="mt-1 text-xs text-muted">{t("Durations include the time reserved for your appointment.")}</p></div><CalendarDays size={20} className="text-[#0b8661]" /></div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">{bookableServices.map((service) => <button key={service.id} type="button" onClick={() => { setServiceId(service.id); setSlot(null); setSelectedDate(""); }} className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${serviceId === service.id ? "border-[#087553] bg-[#f0faf5] ring-1 ring-[#087553]" : "border-[#e0ece7] bg-white hover:border-[#9bcebb]"}`}><span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${serviceId === service.id ? "border-[#087553] bg-[#087553] text-white" : "border-[#c8dcd4]"}`}>{serviceId === service.id && <Check size={12} />}</span><span className="min-w-0"><strong className="block text-sm">{service.name}</strong><span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#6c817b]"><span className="inline-flex items-center gap-1"><Clock3 size={11} />{service.durationMinutes} {t("min")}</span><span>{money(service.startingPrice, service.currency)}</span></span>{service.description && <span className="mt-1.5 line-clamp-2 block text-[11px] leading-4 text-[#6c817b]">{service.description}</span>}</span></button>)}</div>
            </Card>

            <Card className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3"><div><h2 className="font-display text-lg font-bold">{t("Date & time")}</h2><p className="mt-1 text-xs text-muted">{t("Times are shown in")} {timezone}.</p></div><Clock3 size={20} className="text-[#0b8661]" /></div>
              {availabilityQuery.isLoading ? <div className="mt-5 flex items-center gap-2 text-sm text-muted"><LoaderCircle className="animate-spin" size={16} />{t("Finding available times.")}</div> : availabilityQuery.isError ? <p className="mt-4 rounded-xl bg-[#fff5ee] p-4 text-sm text-[#8b4b22]">{availabilityQuery.error.message}</p> : !availableDays.length ? <div className="mt-4 rounded-xl bg-[#f7faf8] p-5 text-sm text-muted"><p className="font-bold text-[#335c56]">{t("No open times in the next three weeks.")}</p><p className="mt-1">{t("Send a request and the business will suggest an alternative.")}</p><Link to={`/b/${business.slug}/request`} state={{ selectedService: selectedService ? { id: selectedService.id, name: selectedService.name } : undefined }} className="btn btn-secondary mt-4">{t("Request a different time")}</Link></div> : <>
                <div className="mt-4 flex gap-2 overflow-x-auto pb-1">{availableDays.map((day) => <button key={day.date} type="button" onClick={() => { setSelectedDate(day.date); setSlot(null); }} className={`min-w-[104px] shrink-0 rounded-xl border px-3 py-2.5 text-center transition ${selectedDate === day.date ? "border-[#087553] bg-[#075b43] text-white" : "border-[#e0ece7] bg-white text-[#456b63] hover:border-[#9bcebb]"}`}><span className="block text-[11px] font-bold">{dateLabel(day.date, locale)}</span><span className={`mt-0.5 block text-[9px] ${selectedDate === day.date ? "text-emerald-100" : "text-[#8aa099]"}`}>{day.slots.length} {t("times")}</span></button>)}</div>
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">{activeDay?.slots.map((item) => <button key={item.startAt} type="button" onClick={() => setSlot(item)} className={`min-h-10 rounded-xl border text-xs font-bold transition ${slot?.startAt === item.startAt ? "border-[#087553] bg-[#087553] text-white" : "border-[#dce9e4] bg-[#fbfdfc] text-[#315c57] hover:border-[#0b8661]"}`}>{item.label}</button>)}</div>
              </>}
            </Card>

            <div className="flex justify-end"><Button disabled={!slot} onClick={() => setStep(2)} icon={<ArrowRight size={16} />}>{t("Continue")}</Button></div>
          </> : <>
            <Card className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f1faf5] p-4"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#6b8d82]">{t("Your appointment")}</p><p className="mt-1 font-display font-bold text-[#123d37]">{selectedService?.name}</p><p className="mt-1 text-xs text-[#58716d]">{selectedDate && longDateLabel(selectedDate, locale)} · {slot?.label} ({timezone})</p></div><button type="button" onClick={() => setStep(1)} className="text-xs font-bold text-[#087553] hover:underline">{t("Change")}</button></div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><Label htmlFor="booking-name">{t("Your name")} <span className="text-[#0b9367]">*</span></Label><Input id="booking-name" value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} autoComplete="name" maxLength={120} placeholder={t("e.g. Aline Uwimana")} /></div>
                <div><Label htmlFor="booking-phone">{t("Phone or WhatsApp")} <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{t("or email")}</span></Label><Input id="booking-phone" value={form.customerPhone} onChange={(event) => setForm({ ...form, customerPhone: event.target.value })} autoComplete="tel" inputMode="tel" maxLength={40} aria-invalid={phoneInvalid} placeholder="+250 78..." className={phoneInvalid ? "border-[#d9826b]" : ""} />{phoneInvalid && <p className="mt-1 text-[11px] font-medium text-[#a34932]">{t("Enter a valid phone number.")}</p>}</div>
                <div><Label htmlFor="booking-email">{t("Email")} <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{t("or phone")}</span></Label><Input id="booking-email" type="email" value={form.customerEmail} onChange={(event) => setForm({ ...form, customerEmail: event.target.value })} autoComplete="email" maxLength={180} aria-invalid={emailInvalid} placeholder={t("you@example.com")} className={emailInvalid ? "border-[#d9826b]" : ""} />{emailInvalid && <p className="mt-1 text-[11px] font-medium text-[#a34932]">{t("Enter a valid email address.")}</p>}</div>
                <div className="sm:col-span-2"><Label htmlFor="booking-note">{t("Anything the business should know?")} <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{t("optional")}</span></Label><Textarea id="booking-note" value={form.customerNote} onChange={(event) => setForm({ ...form, customerNote: event.target.value })} maxLength={1000} placeholder={t("Preferences, access needs, or a question. You can skip this.")} className="min-h-24" /></div>
              </div>
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#f2faf6] px-3 py-2.5 text-[11px] leading-5 text-[#54716a]"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-[#0b8661]" />{t("Add one way to reach you. We will not ask you to create an account.")}</p>
              {createMutation.isError && <p className="mt-4 rounded-xl bg-[#fff3ef] p-3 text-sm text-[#9a3d2c]">{createMutation.error.message}</p>}
              <div className="mt-5 flex flex-wrap justify-between gap-2"><Button variant="secondary" onClick={() => setStep(1)} icon={<ArrowLeft size={15} />}>{t("Back")}</Button><Button loading={createMutation.isPending} disabled={!canSubmit || createMutation.isPending} onClick={() => createMutation.mutate()} icon={<CalendarDays size={16} />}>{business.bookingSettings?.requireConfirmation ? t("Request appointment") : t("Confirm appointment")}</Button></div>
            </Card>
          </>}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card className="overflow-hidden">
            {business.coverImageUrl ? <img src={resolveAssetUrl(business.coverImageUrl)} alt="" className="h-32 w-full object-cover" /> : <div className="grid h-24 place-items-center bg-[#075b43] text-emerald-200"><Store size={30} /></div>}
            <div className="p-5"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#6b8d82]">{business.category || t("Business")}</p><h2 className="mt-1 font-display text-lg font-bold">{business.name}</h2>{business.tagline && <p className="mt-1 text-xs leading-5 text-muted">{business.tagline}</p>}<div className="mt-4 space-y-2 border-t border-[#edf2ef] pt-4 text-xs text-[#4e6a63]">{[business.address, business.city].filter(Boolean).length > 0 && <p className="flex items-start gap-2"><Store size={14} className="mt-0.5 shrink-0 text-[#0b8661]" />{[business.address, business.city].filter(Boolean).join(", ")}</p>}{selectedService && <p className="flex items-start gap-2"><Clock3 size={14} className="mt-0.5 shrink-0 text-[#0b8661]" />{selectedService.durationMinutes} {t("minutes")} · {money(selectedService.startingPrice, selectedService.currency)}</p>}</div></div>
          </Card>
          <div className="rounded-2xl border border-[#dbeae4] bg-white p-4 text-xs leading-5 text-[#54716a]"><p className="flex items-center gap-2 font-bold text-[#234f49]"><ShieldCheck size={15} className="text-[#0b8661]" />{t("How booking works")}</p><ul className="mt-3 space-y-2"><li className="flex gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#12a878]" />{business.bookingSettings?.requireConfirmation ? t("The business reviews and confirms your request.") : t("Your appointment is confirmed immediately.")}</li><li className="flex gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#12a878]" />{t("You receive a private link to view or cancel your booking.")}</li><li className="flex gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#12a878]" />{t("No payment is collected on this page.")}</li></ul></div>
        </aside>
      </div>}
    </main>
  </div>;
}

function SuccessPanel({ booking, business, privateLink, copied, onCopy }: { booking: PublicBooking; business: PublicBusiness; privateLink: string; copied: boolean; onCopy: () => void }) {
  const { t, locale } = useLanguage();
  const whatsappDigits = business.whatsapp?.replace(/\D/g, "");
  return <Card className="mx-auto max-w-2xl overflow-hidden">
    <div className="bg-[linear-gradient(135deg,#063f34,#0a7d5d)] p-7 text-center text-white sm:p-9"><span className="mx-auto grid size-16 place-items-center rounded-full bg-[#c9f36a] text-[#174331]"><BadgeCheck size={30} /></span><p className="mt-4 text-[10px] font-extrabold uppercase tracking-[.2em] text-emerald-100/80">{booking.status === "CONFIRMED" ? t("Appointment confirmed") : t("Request received")}</p><h1 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">{booking.status === "CONFIRMED" ? t("You're booked.") : t("Your time is reserved.")}</h1><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-emerald-50/85">{booking.status === "CONFIRMED" ? t("The business has confirmed this appointment.") : t("The business will review your request and contact you using the details you provided.")}</p></div>
    <div className="p-6 sm:p-8">
      <div className="grid gap-3 rounded-2xl bg-[#f4faf7] p-4 text-sm sm:grid-cols-2"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#6b8d82]">{t("Booking")}</p><p className="mt-1 font-bold">{booking.bookingNumber}</p></div><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#6b8d82]">{t("Service")}</p><p className="mt-1 font-bold">{booking.service.name}</p></div><div className="sm:col-span-2"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#6b8d82]">{t("When")}</p><p className="mt-1 font-bold">{new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: booking.timezone }).format(new Date(booking.startAt))}</p><p className="mt-0.5 text-xs text-[#6b8d82]">{booking.timezone}</p></div></div>
      <div className="mt-5 rounded-xl border border-[#cfe5dc] bg-[#fbfefc] p-4"><p className="text-xs font-bold text-[#234f49]">{t("Save your private booking link")}</p><p className="mt-1 text-[11px] leading-5 text-[#6b817a]">{t("Use this link to check the status, cancel, or leave a review after your appointment. Keep it private.")}</p><div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" onClick={onCopy} icon={<Copy size={15} />}>{copied ? t("Copied") : t("Copy link")}</Button><Link to={`/bookings/${booking.publicToken}`} className="btn btn-primary">{t("View booking")} <ArrowRight size={15} /></Link></div></div>
      <div className="mt-5 flex flex-wrap gap-2">{whatsappDigits && <a href={`https://wa.me/${whatsappDigits}?text=${encodeURIComponent(`Hello ${business.name}, I booked ${booking.bookingNumber} for ${new Intl.DateTimeFormat(locale, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: booking.timezone }).format(new Date(booking.startAt))}.`)}`} target="_blank" rel="noreferrer" className="btn btn-secondary"><MessageCircle size={16} />{t("Contact on WhatsApp")}</a>}<Link to={`/b/${business.slug}`} className="btn btn-ghost">{t("Back to business page")}</Link></div>
      <p className="mt-4 text-center text-[10px] leading-4 text-muted">{privateLink}</p>
    </div>
  </Card>;
}
