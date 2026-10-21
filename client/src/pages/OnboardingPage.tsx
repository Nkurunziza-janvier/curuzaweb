import { ArrowLeft, ArrowRight, Check, ImagePlus, MapPin, ShoppingBag } from "lucide-react";
import { BookingPhonePreview, BookingSetupStep, StorefrontPhonePreview, type BookingAvailabilityDay, type BookingDraft } from "../components/onboarding/BookingSetup";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Badge, Brand, Button, Card, Input, Label, Select } from "../components/ui";
import { LocationPicker, type Coordinates } from "../components/onboarding/LocationPicker";
import { ImageUploadField } from "../components/ImageUploadField";
import { LanguageSwitcher, useLanguage } from "../i18n";
import { useCurrentUser } from "../hooks/apiHooks";
import { bookingService, businessService, productService, requestService, serviceService } from "../services/api";

const steps = ["Business", "Category", "Location", "Contact", "Brand", "Your story", "Hours", "Products", "Booking", "Actions", "Questions", "Preview", "Publish"];
const requestTypes = ["TEXT", "TEXTAREA", "NUMBER", "SELECT", "MULTI_SELECT", "DATE", "TIME", "FILE", "LOCATION", "PHONE", "EMAIL"] as const;
const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
type OpeningDay = { closed: boolean; opens: string; closes: string };
type OpeningSchedule = Record<typeof weekdays[number], OpeningDay>;

function emptyOpeningSchedule(): OpeningSchedule {
  return Object.fromEntries(weekdays.map((day) => [day, { closed: true, opens: "09:00", closes: "17:00" }])) as OpeningSchedule;
}

function timeToInput(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return "";
  let hour = Number(match[1]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

function formatTime(value: string) {
  const [hourText, minute] = value.split(":");
  const hour = Number(hourText);
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
}

function parseOpeningSchedule(display: string): OpeningSchedule {
  const schedule = emptyOpeningSchedule();
  for (const line of display.split("\n")) {
    const match = line.match(/^(.+?):\s*(.+)$/);
    if (!match) continue;
    const [, dayText, hoursText] = match;
    const abbreviations = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const matchedDays = weekdays.filter((day, index) => new RegExp(`\\b(?:${day}|${abbreviations[index]})\\b`, "i").test(dayText));
    if (/closed/i.test(hoursText)) {
      matchedDays.forEach((day) => { schedule[day].closed = true; });
      continue;
    }
    const times = hoursText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/gi);
    if (times?.length !== 2) continue;
    const opens = timeToInput(times[0]);
    const closes = timeToInput(times[1]);
    if (!opens || !closes) continue;
    matchedDays.forEach((day) => { schedule[day] = { closed: false, opens, closes }; });
    if (/mon\w*\s*[-–]\s*fri\w*/i.test(dayText)) {
      ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].forEach((day) => { schedule[day as keyof OpeningSchedule] = { closed: false, opens, closes }; });
    }
    if (/mon\w*\s*[-–]\s*sun\w*/i.test(dayText)) weekdays.forEach((day) => { schedule[day] = { closed: false, opens, closes }; });
  }
  return schedule;
}

function formatOpeningSchedule(schedule: OpeningSchedule) {
  return weekdays.map((day) => {
    const hours = schedule[day];
    return `${day}: ${hours.closed ? "Closed" : `${formatTime(hours.opens)} – ${formatTime(hours.closes)}`}`;
  }).join("\n");
}

function timeToMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : 0;
}

function bookingWindowsFromSchedule(schedule: OpeningSchedule) {
  return weekdays.flatMap((day, index) => {
    const hours = schedule[day];
    if (hours.closed) return [];
    const startMinute = timeToMinutes(hours.opens);
    const endMinute = timeToMinutes(hours.closes);
    return endMinute > startMinute ? [{ weekday: index + 1, startMinute, endMinute, isActive: true }] : [];
  });
}

function defaultQuestions(category: string) {
  const lowered = category.toLowerCase();
  if (lowered.includes("restaurant") || lowered.includes("food")) return [
    { label: "What would you like?", type: "TEXT", required: true },
    { label: "Quantity", type: "NUMBER", required: false },
    { label: "Pickup or delivery", type: "SELECT", required: false, options: ["Pickup", "Delivery"] },
    { label: "Location", type: "LOCATION", required: false },
    { label: "Special instructions", type: "TEXTAREA", required: false },
  ];
  if (lowered.includes("photo")) return [
    { label: "Event type", type: "TEXT", required: true },
    { label: "Event date", type: "DATE", required: false },
    { label: "Event location", type: "LOCATION", required: false },
    { label: "Number of people", type: "NUMBER", required: false },
    { label: "Package", type: "TEXT", required: false },
    { label: "Budget", type: "NUMBER", required: false },
  ];
  if (lowered.includes("construction")) return [
    { label: "Project type", type: "TEXT", required: true },
    { label: "Location", type: "LOCATION", required: false },
    { label: "Property size", type: "TEXT", required: false },
    { label: "Service required", type: "TEXTAREA", required: false },
    { label: "Budget", type: "NUMBER", required: false },
    { label: "Photos", type: "FILE", required: false },
  ];
  if (lowered.includes("furniture")) return [
    { label: "Product", type: "TEXT", required: true },
    { label: "Quantity", type: "NUMBER", required: false },
    { label: "Size", type: "TEXT", required: false },
    { label: "Material", type: "TEXT", required: false },
    { label: "Customization", type: "TEXTAREA", required: false },
    { label: "Delivery location", type: "LOCATION", required: false },
  ];
  if (lowered.includes("auto") || lowered.includes("mechanic")) return [
    { label: "What do you need?", type: "SELECT", required: true, options: ["Repair", "Maintenance", "Inspection", "Other"] },
    { label: "Vehicle type", type: "TEXT", required: false },
    { label: "Vehicle model", type: "TEXT", required: false },
    { label: "Describe the problem", type: "TEXTAREA", required: false },
    { label: "Upload photo", type: "FILE", required: false },
    { label: "Location", type: "LOCATION", required: false },
    { label: "Preferred date", type: "DATE", required: false },
  ];
  return [
    { label: "What service do you need?", type: "TEXT", required: true },
    { label: "Anything that would help us prepare?", type: "TEXTAREA", required: false },
    { label: "Preferred date", type: "DATE", required: false },
    { label: "Location", type: "LOCATION", required: false },
  ];
}

interface BookingSettingsSetup {
  requireConfirmation: boolean;
  slotIntervalMinutes: number;
}

interface BusinessSetup {
  id: string;
  name: string;
  tagline: string;
  description: string;
  highlights: string[];
  openingHours: { display?: string } | null;
  category: string;
  city: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  onboardingStep: number;
}

export default function OnboardingPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const businessId = user?.business?.id;
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [highlights, setHighlights] = useState("");
  const [openingSchedule, setOpeningSchedule] = useState<OpeningSchedule>(() => emptyOpeningSchedule());
  const [appointmentOnly, setAppointmentOnly] = useState(true);
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [productImageUrl, setProductImageUrl] = useState("");
  const [category, setCategory] = useState("Other");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [locationError, setLocationError] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceImageUrl, setServiceImageUrl] = useState("");
  const [serviceDuration, setServiceDuration] = useState("60");
  const [serviceBookable, setServiceBookable] = useState(true);
  const [bookingRequireConfirmation, setBookingRequireConfirmation] = useState(true);
  const [bookingSlotInterval, setBookingSlotInterval] = useState("30");
  const [createdProductId, setCreatedProductId] = useState("");
  const [createdServiceId, setCreatedServiceId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [businessLoaded, setBusinessLoaded] = useState(false);
  const progress = Math.round(((step + 1) / steps.length) * 100);

  useEffect(() => {
    if (!businessId) return;
    void bookingService.getSettings<BookingSettingsSetup>(businessId).then((settings) => {
      setBookingRequireConfirmation(settings.requireConfirmation);
      setBookingSlotInterval(String(settings.slotIntervalMinutes));
    }).catch(() => { /* Booking settings are optional until the first service is created. */ });
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;
    void businessService.get<BusinessSetup>(businessId).then((business) => {
      setName(business.name);
      setTagline(business.tagline ?? "");
      setDescription(business.description ?? "");
      setHighlights((business.highlights ?? []).join("\n"));
      const hoursDisplay = business.openingHours?.display ?? "";
      setOpeningSchedule(parseOpeningSchedule(hoursDisplay));
      setAppointmentOnly(!hoursDisplay.trim());
      setCategory(business.category);
      setCity(business.city ?? "");
      setAddress(business.address ?? "");
      setCoordinates(business.latitude !== null && business.longitude !== null ? { latitude: business.latitude, longitude: business.longitude } : null);
      setPhone(business.phone ?? "");
      setWhatsapp(business.whatsapp ?? "");
      setEmail(business.email ?? "");
      setLogoUrl(business.logoUrl ?? "");
      setCoverImageUrl(business.coverImageUrl ?? "");
      setStep(Math.min(business.onboardingStep, steps.length - 1));
      setBusinessLoaded(true);
    }).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "Could not load onboarding details");
      setBusinessLoaded(true);
    });
  }, [businessId]);

  const saveAndContinue = async () => {
    if (!businessId) {
      setError("Your account does not have a business yet.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (step === 0) await businessService.update(businessId, { name });
      if (step === 1) {
        await businessService.update(businessId, { category });
        const questions = defaultQuestions(category).map((question, sortOrder) => ({
          ...question,
          type: question.type as typeof requestTypes[number],
          sortOrder,
        }));
        await requestService.saveTemplate(businessId, { name: `${category} request`, businessType: category, questions });
      }
      if (step === 2) await businessService.update(businessId, { city, address, latitude: coordinates?.latitude ?? null, longitude: coordinates?.longitude ?? null });
      if (step === 3) await businessService.update(businessId, { phone, whatsapp, email: email || null });
      if (step === 4) await businessService.update(businessId, { logoUrl: logoUrl || null, coverImageUrl: coverImageUrl || null });
      if (step === 5) await businessService.update(businessId, { tagline: tagline.trim(), description: description.trim(), highlights: highlights.split("\n").map((item) => item.trim()).filter(Boolean) });
      if (step === 6) {
        const display = appointmentOnly ? "" : formatOpeningSchedule(openingSchedule);
        await businessService.update(businessId, { openingHours: display ? { display } : null });
      }
      if (step === 7 && productName.trim()) {
        const payload = { name: productName.trim(), description: productDescription.trim(), price: Number(productPrice || 0), currency: "RWF", category: productCategory.trim(), imageUrl: productImageUrl || null };
        if (createdProductId) await productService.update(createdProductId, payload);
        else {
          const created = await productService.create<{ id: string }>(businessId, payload);
          setCreatedProductId(created.id);
        }
      }
      if (step === 8 && serviceName.trim()) {
        const durationMinutes = Number(serviceDuration);
        const payload = {
          name: serviceName.trim(),
          description: serviceDescription.trim(),
          startingPrice: Number(servicePrice || 0),
          currency: "RWF",
          imageUrl: serviceImageUrl || null,
          duration: serviceBookable && durationMinutes > 0 ? `${durationMinutes} minutes` : null,
          durationMinutes: serviceBookable && durationMinutes > 0 ? durationMinutes : null,
          bufferMinutes: 15,
          capacity: 1,
          isBookable: serviceBookable && durationMinutes > 0,
        };
        if (createdServiceId) await serviceService.update(createdServiceId, payload);
        else {
          const created = await serviceService.create<{ id: string }>(businessId, { ...payload, isPublished: true });
          setCreatedServiceId(created.id);
        }
        if (serviceBookable && durationMinutes > 0) {
          await bookingService.updateSettings(businessId, {
            isEnabled: true,
            timezone: "Africa/Kigali",
            slotIntervalMinutes: Number(bookingSlotInterval),
            minNoticeMinutes: 120,
            maxAdvanceDays: 60,
            cancellationCutoffMinutes: 240,
            requireConfirmation: bookingRequireConfirmation,
          });
          const scheduledWindows = bookingWindowsFromSchedule(openingSchedule);
          const windows = scheduledWindows.length ? scheduledWindows : [1, 2, 3, 4, 5].map((weekday) => ({ weekday, startMinute: 9 * 60, endMinute: 17 * 60, isActive: true }));
          await bookingService.replaceWindows(businessId, windows);
        }
      }
      if (step === 12) {
        await businessService.publish(businessId, true);
        await businessService.update(businessId, { onboardingStep: steps.length });
        navigate("/dashboard", { replace: true });
        return;
      }
      const nextStep = Math.min(step + 1, steps.length - 1);
      await businessService.update(businessId, { onboardingStep: nextStep });
      setStep(nextStep);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your progress could not be saved");
    } finally {
      setSaving(false);
    }
  };

  const scheduledBookingWindows = bookingWindowsFromSchedule(openingSchedule);
  const usingFallbackBookingHours = scheduledBookingWindows.length === 0;
  const bookingAvailability: BookingAvailabilityDay[] = weekdays.map((day, index) => {
    const configured = scheduledBookingWindows.find((window) => window.weekday === index + 1);
    const closed = configured ? false : usingFallbackBookingHours ? index > 4 : true;
    const startMinute = configured?.startMinute ?? 9 * 60;
    const endMinute = configured?.endMinute ?? 17 * 60;
    const toTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    return { day, closed, hours: `${formatTime(toTime(startMinute))} – ${formatTime(toTime(endMinute))}` };
  });
  const bookingDraft: BookingDraft = {
    name: serviceName,
    description: serviceDescription,
    price: servicePrice,
    duration: serviceDuration,
    imageUrl: serviceImageUrl,
    bookable: serviceBookable,
    requireConfirmation: bookingRequireConfirmation,
    slotInterval: bookingSlotInterval,
  };
  const updateBookingDraft = (patch: Partial<BookingDraft>) => {
    if (patch.name !== undefined) setServiceName(patch.name);
    if (patch.description !== undefined) setServiceDescription(patch.description);
    if (patch.price !== undefined) setServicePrice(patch.price);
    if (patch.duration !== undefined) setServiceDuration(patch.duration);
    if (patch.imageUrl !== undefined) setServiceImageUrl(patch.imageUrl);
    if (patch.bookable !== undefined) setServiceBookable(patch.bookable);
    if (patch.requireConfirmation !== undefined) setBookingRequireConfirmation(patch.requireConfirmation);
    if (patch.slotInterval !== undefined) setBookingSlotInterval(patch.slotInterval);
  };

  if (!businessLoaded) return <div className="grid min-h-screen place-items-center bg-cream"><div className="skeleton h-12 w-48 rounded-2xl" aria-label="Loading onboarding" /></div>;

  return <div className="min-h-screen bg-cream"><header className="border-b border-line bg-white"><div className="shell-wide flex h-17 items-center justify-between"><Brand /><LanguageSwitcher compact /><p className="text-xs font-semibold text-muted">{t("Setup")} {progress}% {t("complete")}</p></div></header>
    <div className="h-1 bg-line"><div className="h-full bg-coral transition-all" style={{ width: `${progress}%` }} /></div>
    <main className="shell-wide grid gap-10 py-8 lg:grid-cols-[1fr_.8fr] lg:py-14">
      <section className={`mx-auto w-full ${step === 8 ? "max-w-2xl" : "max-w-xl"}`}><Badge tone="violet">{t("Step")} {step + 1} · {t(steps[step])}</Badge><h1 className="mt-5 font-display text-3xl font-bold tracking-tight">{step === 0 ? t("Let’s get your business online.") : step === 1 ? t("What kind of business is it?") : step === 2 ? t("Where can customers find you?") : step === 8 ? t("Make booking feel effortless.") : step === 11 ? t("This is looking good.") : step === 12 ? t("Ready to welcome customers?") : `${t("Set up your")} ${t(steps[step]).toLowerCase()}.`}</h1><p className="mt-3 text-muted">{step === 8 ? t("Set your first service, booking rules, and availability. Customers will see a simple, mobile-friendly booking experience.") : t("Every step is saved to your business profile so you can return later.")}</p>
        <Card className={`mt-8 ${step === 8 ? "p-2.5 sm:p-4" : "p-6"}`}>
          {step === 0 && <div><Label htmlFor="business-name">{t("Business name")}</Label><Input id="business-name" required value={name} onChange={(event) => setName(event.target.value)} /></div>}
          {step === 1 && <div><Label htmlFor="category">{t("Business category")}</Label><Select id="category" value={category} onChange={(event) => setCategory(event.target.value)}><option>Restaurant</option><option>Mechanic</option><option>Beauty</option><option>Construction</option><option>Furniture</option><option>Photographer</option><option>Professional services</option><option>Other</option></Select></div>}
          {step === 2 && <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="city">{t("City")}</Label><Input id="city" autoComplete="address-level2" value={city} onChange={(event) => setCity(event.target.value)} placeholder="e.g. Kigali" /></div><div><Label htmlFor="location">Street or neighbourhood</Label><div className="relative"><MapPin className="absolute left-4 top-3.5 text-muted" size={18} /><Input className="pl-11" id="location" autoComplete="street-address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="e.g. KG 7 Ave, Kimihurura" /></div></div></div><LocationPicker coordinates={coordinates} onSelect={(next) => { setCoordinates(next); setLocationError(""); }} onGeolocationError={setLocationError} />{locationError && <p role="alert" className="text-sm text-coral-dark">{locationError}</p>}<p className="text-xs leading-relaxed text-muted">Your pin helps customers find the right place. The interactive picker uses OpenStreetMap; you can open your selected pin in Google Maps.</p></div>}
          {step === 3 && <div className="space-y-4"><div><Label htmlFor="contact-phone">{t("Business phone")}</Label><Input id="contact-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></div><div><Label htmlFor="contact-whatsapp">WhatsApp</Label><Input id="contact-whatsapp" type="tel" value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} /></div><div><Label htmlFor="contact-email">{t("Business email")}</Label><Input id="contact-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div></div>}
          {step === 4 && <div className="space-y-5"><ImageUploadField title="Business logo" description="A square image works best. JPG, PNG, WebP or GIF · up to 8 MB." value={logoUrl} onChange={setLogoUrl} shape="square" /><ImageUploadField title="Cover photo" description="A wide photo makes a strong first impression. JPG, PNG, WebP or GIF · up to 8 MB." value={coverImageUrl} onChange={setCoverImageUrl} shape="wide" /><div className="flex gap-3 rounded-xl bg-violet-soft/60 p-4 text-sm leading-relaxed text-ink"><ImagePlus className="mt-0.5 shrink-0 text-violet" size={18} /><p>Your images appear on your public business page. You can change them at any time.</p></div></div>}
          {step === 5 && <div className="space-y-4"><div><Label htmlFor="business-tagline">Short headline</Label><Input id="business-tagline" maxLength={180} value={tagline} onChange={(event) => setTagline(event.target.value)} placeholder="e.g. Fresh food, made with care" /><p className="mt-1 text-xs text-muted">A short line shown beside your business name.</p></div><div><Label htmlFor="business-description">About your business</Label><textarea id="business-description" maxLength={5000} rows={4} className="field min-h-28 resize-y" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What do you offer, who do you serve, and what makes your business special?" /></div><div><Label htmlFor="business-highlights">Why customers choose you</Label><textarea id="business-highlights" rows={4} className="field min-h-24 resize-y" value={highlights} onChange={(event) => setHighlights(event.target.value)} placeholder={"One highlight per line\nFresh ingredients\nFast and reliable service\nLocally owned"} /><p className="mt-1 text-xs text-muted">Add up to 8 genuine highlights. Each line becomes a point on your business page.</p></div></div>}
          {step === 6 && <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-ink">{t("Opening hours")}</p>
              <p className="mt-1 text-sm text-muted">Choose the days you are open, then set your opening and closing times.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="min-h-11 rounded-xl border border-line px-2 py-2 text-xs font-semibold leading-tight text-ink transition hover:border-success hover:bg-success-soft/40 hover:text-success sm:px-3 sm:text-sm" onClick={() => { setAppointmentOnly(false); setOpeningSchedule(Object.fromEntries(weekdays.map((day) => [day, { closed: !["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].includes(day), opens: "09:00", closes: "17:00" }])) as OpeningSchedule); }}><span className="block">{t("Weekdays")}</span><span className="mt-0.5 block text-[11px] font-normal text-muted">9:00 AM – 5:00 PM</span></button>
              <button type="button" className="min-h-11 rounded-xl border border-line px-2 py-2 text-xs font-semibold leading-tight text-ink transition hover:border-success hover:bg-success-soft/40 hover:text-success sm:px-3 sm:text-sm" onClick={() => { setAppointmentOnly(false); setOpeningSchedule(Object.fromEntries(weekdays.map((day) => [day, { closed: false, opens: "09:00", closes: "17:00" }])) as OpeningSchedule); }}><span className="block">{t("Every day")}</span><span className="mt-0.5 block text-[11px] font-normal text-muted">9:00 AM – 5:00 PM</span></button>
            </div>
            <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
              {weekdays.map((day) => {
                const hours = openingSchedule[day];
                return <div key={day} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 p-3 sm:grid-cols-[minmax(105px,.8fr)_auto_1fr_1fr] sm:items-center sm:gap-4 sm:px-4">
                  <span className="min-w-0 self-center text-sm font-semibold text-ink">{day}</span>
                  <label className="flex min-h-9 cursor-pointer items-center justify-end gap-2 whitespace-nowrap text-sm text-muted sm:justify-start"><input type="checkbox" checked={!hours.closed} onChange={(event) => { setAppointmentOnly(false); setOpeningSchedule((current) => ({ ...current, [day]: { ...current[day], closed: !event.target.checked } })); }} />Open</label>
                  <div className="col-span-2 grid min-w-0 grid-cols-2 gap-2 sm:contents">
                    <label className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-1.5 text-xs text-muted sm:gap-2">From<input aria-label={`${day} opening time`} className="field h-10 min-w-0 px-2 text-sm" type="time" value={hours.opens} disabled={hours.closed || appointmentOnly} onChange={(event) => setOpeningSchedule((current) => ({ ...current, [day]: { ...current[day], opens: event.target.value } }))} /></label>
                    <label className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-1.5 text-xs text-muted sm:gap-2">Until<input aria-label={`${day} closing time`} className="field h-10 min-w-0 px-2 text-sm" type="time" value={hours.closes} disabled={hours.closed || appointmentOnly} onChange={(event) => setOpeningSchedule((current) => ({ ...current, [day]: { ...current[day], closes: event.target.value } }))} /></label>
                  </div>
                </div>;
              })}
            </div>
            <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl bg-cream p-3 text-sm sm:p-4"><input className="size-4 shrink-0" type="checkbox" checked={appointmentOnly} onChange={(event) => setAppointmentOnly(event.target.checked)} /><span className="min-w-0"><strong className="block text-ink">By appointment only</strong><span className="mt-0.5 block text-xs leading-relaxed text-muted sm:text-sm">Don’t show set hours on your business page.</span></span></label>
            <p className="text-xs text-muted">You can change these hours any time from your dashboard.</p>
          </div>}
          {step === 7 && <div className="space-y-4"><div className="flex items-start gap-3 rounded-2xl border border-[#dcebe5] bg-[#f4faf7] p-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e4f4eb] text-[#087553]"><ShoppingBag size={19} /></span><div><p className="text-sm font-bold text-[#24483c]">Products are ordered, not booked</p><p className="mt-1 text-xs leading-5 text-[#6d8178]">Customers add products to an order request. You confirm availability, the final price, and pickup or delivery. No payment is collected online.</p></div></div><ImageUploadField title="Product photo (optional)" description="A clear photo helps customers choose. You can add products later from your dashboard." value={productImageUrl} onChange={setProductImageUrl} shape="wide" /><div><Label htmlFor="product-name">First product (optional)</Label><Input id="product-name" value={productName} onChange={(event) => setProductName(event.target.value)} placeholder="e.g. Fresh juice" /></div>{productName && <><div><Label htmlFor="product-description">Product description</Label><textarea id="product-description" rows={3} className="field min-h-20 resize-y" value={productDescription} onChange={(event) => setProductDescription(event.target.value)} placeholder="Describe what customers are buying" /></div><div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="product-price">Price (RWF)</Label><Input id="product-price" type="number" min="0" value={productPrice} onChange={(event) => setProductPrice(event.target.value)} /></div><div><Label htmlFor="product-category">Category</Label><Input id="product-category" value={productCategory} onChange={(event) => setProductCategory(event.target.value)} placeholder="e.g. Drinks" /></div></div></>}<p className="text-xs leading-5 text-muted">Products become visible after publishing is approved. You can add more from the dashboard.</p></div>}
          {step === 8 && <BookingSetupStep draft={bookingDraft} onUpdate={updateBookingDraft} availability={bookingAvailability} usingFallbackHours={usingFallbackBookingHours} onEditHours={() => setStep(6)} />}
          {step === 9 && <div className="space-y-4">{[["Request a quote", "Collect a tailored customer request"], ["WhatsApp", "Let customers message your team"], ["Phone", "Let customers call your business"]].map(([title, desc]) => <div key={title} className="flex items-center gap-4 rounded-xl border border-line p-4"><span className="icon-tile"><Check size={16} /></span><span><strong className="block text-sm">{title}</strong><span className="text-xs text-muted">{desc}</span></span></div>)}<p className="text-xs text-muted">Request and contact actions are enabled on your public page when contact details are available.</p></div>}
          {step === 10 && <div className="space-y-3"><p className="text-sm text-muted">A {category.toLowerCase()} request form is ready. Its questions are saved to the server and can be changed later.</p>{defaultQuestions(category).map((question, index) => <div key={question.label} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm"><span>{index + 1}. {question.label}</span><span className="text-xs text-muted">{question.required ? "Required" : "Optional"}</span></div>)}</div>}
          {step >= 11 && <div className="text-center"><span className="mx-auto grid size-16 place-items-center rounded-full bg-success-soft text-success"><Check size={28} /></span><p className="mt-5 font-display text-xl font-bold">{step === 12 ? "Everything is ready to publish" : "Your customer page is ready for review"}</p><p className="mt-2 text-sm text-muted">{name} · {category} · {city || "Location not set"}.</p><p className="mt-2 text-sm text-muted">Customers will see your story, opening hours, contact details, services, and approved products.</p></div>}
        </Card>
        {error && <p role="alert" className="mt-4 rounded-xl bg-coral-soft p-3 text-sm text-coral-dark">{error}</p>}
        <div className="mt-8 flex justify-between"><Button variant="ghost" disabled={step === 0 || saving} onClick={() => setStep(step - 1)} icon={<ArrowLeft size={17} />}>{t("Back")}</Button><Button disabled={!name.trim() || saving || (step === 8 && Boolean(serviceName.trim()) && serviceBookable && !(Number(serviceDuration) > 0))} loading={saving} onClick={() => void saveAndContinue()}>{step === 12 ? t("Publish page") : t("Save & continue")} <ArrowRight size={17} /></Button></div>
      </section>
      <aside className="hidden lg:block"><p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-muted">{t("Live mobile preview")}</p>{step === 8 ? <BookingPhonePreview branding={{ businessName: name, category, city, logoUrl, coverImageUrl }} draft={bookingDraft} availability={bookingAvailability} /> : <StorefrontPhonePreview branding={{ businessName: name, category, city, logoUrl, coverImageUrl }} />}</aside>
    </main></div>;
}


