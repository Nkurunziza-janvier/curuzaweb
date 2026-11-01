import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock3, Globe2, ImagePlus, LayoutGrid, MessageCircle, Package, Save, Search, Sparkles, Star, Users, XCircle } from "lucide-react";
import { Badge, Button, Card, Heading, Input, Label, Select, Textarea } from "../components/ui";
import { ImageUploadField } from "../components/ImageUploadField";
import { ProfileFieldInput } from "../components/ProfileFieldInput";
import { LocationPicker, type Coordinates } from "../components/onboarding/LocationPicker";
import { useBusinessCatalog, useCurrentUser, queryKeys } from "../hooks/apiHooks";
import { useLanguage } from "../i18n";
import { bookingService, businessService, productService, serviceService } from "../services/api";
import type { BusinessCatalog, BusinessIndustry, BusinessSetup, CapabilityDefinition, CapabilityKey, ProfileField } from "../types/business";

const steps = [
  { key: "type", label: "Business type", description: "Choose the industry that fits best." },
  { key: "details", label: "Details", description: "Tell customers who you are and how to reach you." },
  { key: "capabilities", label: "Features", description: "Pick what customers can do on your page." },
  { key: "setup", label: "Industry setup", description: "Add the details that matter for your business." },
  { key: "preview", label: "Preview", description: "See the page customers will get." },
  { key: "publish", label: "Publish", description: "Review and make your page live." },
] as const;

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
type Weekday = typeof weekdays[number];
type OpeningDay = { closed: boolean; opens: string; closes: string };
type OpeningSchedule = Record<Weekday, OpeningDay>;

function defaultSchedule(): OpeningSchedule {
  return Object.fromEntries(weekdays.map((day, index) => [day, { closed: index > 4, opens: "09:00", closes: "17:00" }])) as OpeningSchedule;
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
  const schedule = defaultSchedule();
  for (const line of display.split("\n")) {
    const match = line.match(/^(.+?):\s*(.+)$/);
    if (!match) continue;
    const [, dayText, hoursText] = match;
    const abbreviations = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const matchedDays = weekdays.filter((day, index) => new RegExp(`\\b(?:${day}|${abbreviations[index]})\\b`, "i").test(dayText));
    if (!matchedDays.length) continue;
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
    if (/mon\w*\s*[-\u2013\u2014]\s*fri\w*/i.test(dayText)) {
      ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].forEach((day) => { schedule[day as Weekday] = { closed: false, opens, closes }; });
    }
    if (/mon\w*\s*[-\u2013\u2014]\s*sun\w*/i.test(dayText)) weekdays.forEach((day) => { schedule[day] = { closed: false, opens, closes }; });
  }
  return schedule;
}

function formatOpeningSchedule(schedule: OpeningSchedule) {
  return weekdays.map((day) => {
    const hours = schedule[day];
    return `${day}: ${hours.closed ? "Closed" : `${formatTime(hours.opens)} - ${formatTime(hours.closes)}`}`;
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

function normalizeCapabilities(keys: string[]) {
  const next = new Set(keys);
  if (next.has("product_orders")) {
    next.add("products");
    if (!next.has("pickup") && !next.has("delivery")) next.add("pickup");
  }
  if (next.has("delivery") || next.has("pickup")) {
    next.add("products");
    next.add("product_orders");
  }
  if (next.has("appointments")) next.add("services");
  return [...next];
}

function capabilityLabel(catalog: BusinessCatalog | undefined, key: string) {
  return catalog?.capabilities.find((capability) => capability.key === key)?.label ?? key;
}

function industryLabel(catalog: BusinessCatalog | undefined, key: string) {
  return catalog?.industries.find((industry) => industry.key === key)?.label ?? key;
}

export default function OnboardingPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const businessId = user?.business?.id;
  const catalogQuery = useBusinessCatalog<BusinessCatalog>();
  const businessQuery = useQuery<BusinessSetup>({
    queryKey: queryKeys.business(businessId ?? ""),
    queryFn: () => businessService.get<BusinessSetup>(businessId!),
    enabled: Boolean(businessId),
  });
  const catalog = catalogQuery.data;
  const business = businessQuery.data;

  const [step, setStep] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const [industryKey, setIndustryKey] = useState("other");
  const [subtype, setSubtype] = useState("general");
  const [category, setCategory] = useState("");
  const [industrySearch, setIndustrySearch] = useState("");
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("en");
  const [currency, setCurrency] = useState("RWF");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("Rwanda");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [locationError, setLocationError] = useState("");
  const [openingSchedule, setOpeningSchedule] = useState<OpeningSchedule>(() => defaultSchedule());
  const [logoUrl, setLogoUrl] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [profileData, setProfileData] = useState<Record<string, unknown>>({});
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [productImageUrl, setProductImageUrl] = useState("");
  const [createdProductId, setCreatedProductId] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceImageUrl, setServiceImageUrl] = useState("");
  const [serviceDuration, setServiceDuration] = useState("60");
  const [createdServiceId, setCreatedServiceId] = useState("");
  const [bookingRequireConfirmation, setBookingRequireConfirmation] = useState(true);
  const [bookingSlotInterval, setBookingSlotInterval] = useState("30");

  const industry = useMemo(() => catalog?.industries.find((item) => item.key === industryKey), [catalog, industryKey]);
  const capabilitySet = useMemo(() => new Set(capabilities), [capabilities]);
  const progress = Math.round(((step + 1) / steps.length) * 100);
  const hasProducts = capabilitySet.has("products");
  const hasOrders = capabilitySet.has("product_orders");
  const hasServices = capabilitySet.has("services");
  const hasAppointments = capabilitySet.has("appointments");
  const hasRequests = capabilitySet.has("service_requests") || capabilitySet.has("contact_form");
  const hasPortfolio = capabilitySet.has("portfolio");
  const hasReviews = capabilitySet.has("reviews");
  const hasWhatsApp = capabilitySet.has("whatsapp_contact");

  useEffect(() => {
    if (!business || initialized) return;
    const loadedIndustry = catalog?.industries.find((item) => item.key === business.industryKey) ?? catalog?.industries.find((item) => item.key === "other");
    const loadedCapabilities = business.capabilities.length ? business.capabilities : loadedIndustry?.recommended ?? [];
    setIndustryKey(loadedIndustry?.key ?? "other");
    setSubtype(business.subtype || loadedIndustry?.subtypes[0]?.key || "general");
    setCategory(business.category || "");
    setName(business.name);
    setTagline(business.tagline ?? "");
    setDescription(business.description ?? "");
    setPhone(business.phone ?? "");
    setWhatsapp(business.whatsapp ?? "");
    setEmail(business.email ?? "");
    setWebsiteUrl(business.websiteUrl ?? "");
    setInstagram(business.socialLinks?.instagram ?? "");
    setFacebook(business.socialLinks?.facebook ?? "");
    setPreferredLanguage(business.preferredLanguage || "en");
    setCurrency(business.currency || "RWF");
    setCity(business.city ?? "");
    setAddress(business.address ?? "");
    setCountry(business.country || "Rwanda");
    setCoordinates(business.latitude !== null && business.longitude !== null ? { latitude: business.latitude, longitude: business.longitude } : null);
    setOpeningSchedule(business.openingHours?.display ? parseOpeningSchedule(business.openingHours.display) : defaultSchedule());
    setLogoUrl(business.logoUrl ?? "");
    setCoverImageUrl(business.coverImageUrl ?? "");
    setCapabilities(normalizeCapabilities(loadedCapabilities));
    setProfileData((business.profileData as Record<string, unknown> | null) ?? {});
    setStep(Math.min(business.onboardingStep, steps.length - 1));
    setInitialized(true);
  }, [business, catalog, initialized]);

  useEffect(() => {
    if (!businessId) return;
    void bookingService.getSettings<{ requireConfirmation: boolean; slotIntervalMinutes: number }>(businessId).then((settings) => {
      setBookingRequireConfirmation(settings.requireConfirmation);
      setBookingSlotInterval(String(settings.slotIntervalMinutes));
    }).catch(() => { /* Booking settings are created when appointments are enabled. */ });
  }, [businessId]);

  const selectIndustry = (next: BusinessIndustry) => {
    const nextSubtype = next.subtypes[0]?.key ?? "general";
    setIndustryKey(next.key);
    setSubtype(nextSubtype);
    setCategory(next.key === "other" ? "" : next.subtypes[0]?.label ?? next.label);
    setCapabilities(normalizeCapabilities(next.recommended));
    setProfileData({});
  };

  const toggleCapability = (definition: CapabilityDefinition) => {
    if (definition.status === "planned") return;
    const key = definition.key as CapabilityKey;
    const next = new Set(capabilities);
    if (next.has(key)) {
      next.delete(key);
      if (key === "products") ["product_orders", "delivery", "pickup"].forEach((dependent) => next.delete(dependent));
      if (key === "product_orders") ["delivery", "pickup"].forEach((dependent) => next.delete(dependent));
      if (key === "services") next.delete("appointments");
      if (key === "pickup" || key === "delivery") {
        const other = key === "pickup" ? "delivery" : "pickup";
        if (!next.has(other)) next.delete("product_orders");
      }
    } else {
      next.add(key);
      if (key === "product_orders" || key === "delivery" || key === "pickup") {
        next.add("products");
        next.add("product_orders");
        if (!next.has("pickup") && !next.has("delivery")) next.add("pickup");
      }
      if (key === "appointments") next.add("services");
    }
    setCapabilities(normalizeCapabilities([...next]));
  };

  const updateProfileField = (field: ProfileField, value: unknown) => {
    setProfileData((current) => ({ ...current, [field.key]: value }));
  };

  const updateOpeningDay = (day: Weekday, patch: Partial<OpeningDay>) => {
    setOpeningSchedule((current) => ({ ...current, [day]: { ...current[day], ...patch } }));
  };

  const saveStep = async (stepIndex: number, moveTo?: number) => {
    if (!businessId) {
      setError("Your account does not have a business yet.");
      return false;
    }
    setSaving(true);
    setError("");
    setSaved("");
    try {
      if (stepIndex === 0) {
        if (!industry) throw new Error("Choose a business type to continue");
        const nextSubtype = industryKey === "other" ? subtype.trim() : subtype;
        if (!nextSubtype) throw new Error("Describe your business type to continue");
        await businessService.update(businessId, {
          industryKey,
          subtype: nextSubtype,
          category: category.trim() || industryLabel(catalog, industryKey),
          capabilities: normalizeCapabilities(capabilities),
        });
      }
      if (stepIndex === 1) {
        if (!name.trim()) throw new Error("Add your business name to continue");
        await businessService.update(businessId, {
          name: name.trim(),
          tagline: tagline.trim(),
          description: description.trim(),
          phone: phone.trim() || null,
          whatsapp: whatsapp.trim() || null,
          email: email.trim() || null,
          websiteUrl: websiteUrl.trim() || "",
          socialLinks: {
            ...(instagram.trim() ? { instagram: instagram.trim() } : {}),
            ...(facebook.trim() ? { facebook: facebook.trim() } : {}),
          },
          preferredLanguage,
          currency,
          city: city.trim() || null,
          address: address.trim() || null,
          country: country.trim() || "Rwanda",
          latitude: coordinates?.latitude ?? null,
          longitude: coordinates?.longitude ?? null,
          logoUrl: logoUrl || null,
          coverImageUrl: coverImageUrl || null,
          openingHours: { display: formatOpeningSchedule(openingSchedule) },
        });
      }
      if (stepIndex === 2) {
        if (!capabilities.length) throw new Error("Choose at least one feature for your page");
        await businessService.update(businessId, { capabilities: normalizeCapabilities(capabilities) });
      }
      if (stepIndex === 3) {
        await businessService.update(businessId, {
          profileData,
          capabilities: normalizeCapabilities(capabilities),
          openingHours: { display: formatOpeningSchedule(openingSchedule) },
        });
        if (hasProducts && productName.trim()) {
          const payload = {
            name: productName.trim(),
            description: productDescription.trim(),
            price: Number(productPrice || 0),
            currency,
            category: productCategory.trim(),
            imageUrl: productImageUrl || null,
          };
          if (createdProductId) await productService.update(createdProductId, payload);
          else {
            const created = await productService.create<{ id: string }>(businessId, payload);
            setCreatedProductId(created.id);
          }
        }
        if (hasServices && serviceName.trim()) {
          const durationMinutes = Number(serviceDuration);
          const bookable = hasAppointments && durationMinutes > 0;
          const payload = {
            name: serviceName.trim(),
            description: serviceDescription.trim(),
            startingPrice: Number(servicePrice || 0),
            currency,
            imageUrl: serviceImageUrl || null,
            duration: bookable ? `${durationMinutes} minutes` : null,
            durationMinutes: bookable ? durationMinutes : null,
            bufferMinutes: 15,
            capacity: 1,
            isBookable: bookable,
            isPublished: true,
          };
          if (createdServiceId) await serviceService.update(createdServiceId, payload);
          else {
            const created = await serviceService.create<{ id: string }>(businessId, payload);
            setCreatedServiceId(created.id);
          }
        }
        if (hasAppointments) {
          await bookingService.updateSettings(businessId, {
            isEnabled: true,
            timezone: "Africa/Kigali",
            slotIntervalMinutes: Number(bookingSlotInterval) || 30,
            minNoticeMinutes: 120,
            maxAdvanceDays: 60,
            cancellationCutoffMinutes: 240,
            requireConfirmation: bookingRequireConfirmation,
          });
          const scheduled = bookingWindowsFromSchedule(openingSchedule);
          const windows = scheduled.length ? scheduled : [1, 2, 3, 4, 5].map((weekday) => ({ weekday, startMinute: 9 * 60, endMinute: 17 * 60, isActive: true }));
          await bookingService.replaceWindows(businessId, windows);
        }
      }
      const nextStep = moveTo ?? Math.min(stepIndex + 1, steps.length - 1);
      if (nextStep !== stepIndex) {
        await businessService.update(businessId, { onboardingStep: nextStep });
        setStep(nextStep);
      } else {
        await businessService.update(businessId, { onboardingStep: stepIndex });
      }
      setSaved("Progress saved");
      void queryClient.invalidateQueries({ queryKey: queryKeys.business(businessId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your progress could not be saved");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveAndExit = async () => {
    const ok = await saveStep(step, step);
    if (ok) navigate("/dashboard", { replace: true });
  };

  const publish = async () => {
    if (!businessId) return;
    setSaving(true);
    setError("");
    try {
      await businessService.update(businessId, {
        capabilities: normalizeCapabilities(capabilities),
        profileData,
      });
      await businessService.publish(businessId, true);
      await queryClient.invalidateQueries({ queryKey: queryKeys.business(businessId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
      navigate("/dashboard", { replace: true, state: { registered: true, published: true } });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your page could not be published");
    } finally {
      setSaving(false);
    }
  };

  const issues = useMemo(() => {
    const result: string[] = [];
    if (!name.trim()) result.push("Add a business name.");
    if (!industryKey) result.push("Choose a business type.");
    if (!subtype.trim()) result.push("Choose or describe a business subtype.");
    if (!capabilities.length) result.push("Choose at least one customer feature.");
    if (hasOrders && !capabilitySet.has("pickup") && !capabilitySet.has("delivery")) result.push("Choose pickup or delivery for online orders.");
    return result;
  }, [name, industryKey, subtype, capabilities.length, hasOrders, capabilitySet]);

  const warnings = useMemo(() => {
    const result: string[] = [];
    if ((hasWhatsApp || hasRequests) && !phone.trim() && !whatsapp.trim() && !email.trim()) result.push("Add a phone, WhatsApp number, or email so customers can reach you.");
    if (hasAppointments && !serviceName.trim()) result.push("Add a bookable service or add one later from the dashboard.");
    return result;
  }, [hasWhatsApp, hasRequests, hasAppointments, phone, whatsapp, email, serviceName]);

  const visibleIndustries = useMemo(() => {
    const term = industrySearch.trim().toLowerCase();
    return (catalog?.industries ?? []).filter((item) => !term || `${item.label} ${item.description} ${item.examples}`.toLowerCase().includes(term));
  }, [catalog, industrySearch]);

  const recommendedDefinitions = useMemo(() => {
    if (!catalog || !industry) return [];
    const keys = new Set([...industry.recommended, ...industry.optional]);
    return catalog.capabilities.filter((capability) => keys.has(capability.key as CapabilityKey));
  }, [catalog, industry]);
  const moreDefinitions = useMemo(() => {
    if (!catalog || !industry) return [];
    const keys = new Set([...industry.recommended, ...industry.optional]);
    return catalog.capabilities.filter((capability) => capability.status === "available" && !keys.has(capability.key as CapabilityKey));
  }, [catalog, industry]);

  if (!businessId) return <main className="grid min-h-screen place-items-center bg-[#fafaf6] p-5"><Card className="max-w-lg p-8 text-center"><Heading as="h1">{t("No business found")}</Heading><p className="mt-3 text-muted">{t("Sign in with a business owner account to continue.")}</p></Card></main>;
  if (catalogQuery.isLoading || businessQuery.isLoading || !initialized) return <main className="grid min-h-screen place-items-center bg-[#fafaf6] p-5"><p className="text-sm font-semibold text-muted">{t("Loading your setup...")}</p></main>;
  if (catalogQuery.isError || businessQuery.isError) return <main className="grid min-h-screen place-items-center bg-[#fafaf6] p-5"><Card className="max-w-lg p-8 text-center"><Heading as="h1">{t("Setup could not load")}</Heading><p className="mt-3 text-muted">{catalogQuery.error instanceof Error ? catalogQuery.error.message : businessQuery.error instanceof Error ? businessQuery.error.message : t("Try refreshing the page.")}</p></Card></main>;

  return <main className="min-h-screen bg-[#fafaf6] pb-24">
    <div className="border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="eyebrow">{t("Business setup")}</p>
          <p className="font-display text-lg font-bold">{business?.name || t("Your business")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={() => void saveAndExit()} disabled={saving} icon={<Save size={16} />}>{t("Save and exit")}</Button>
          {business?.isPublished && business.slug && <a href={`/b/${business.slug}`} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold text-ink hover:border-violet hover:text-violet"><Globe2 size={16} /> {t("View page")}</a>}
        </div>
      </div>
    </div>

    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-[15rem_1fr]">
        <aside className="h-fit lg:sticky lg:top-6">
          <div className="mb-4 hidden items-center justify-between text-xs font-semibold text-muted lg:flex"><span>{t("Step")} {step + 1} / {steps.length}</span><span>{progress}%</span></div>
          <div className="mb-6 h-2 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-violet transition-all" style={{ width: `${progress}%` }} /></div>
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {steps.map((item, index) => <li key={item.key}>
              <button type="button" onClick={() => { if (index <= step) setStep(index); }} className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition ${index === step ? "border-violet bg-violet-soft/40" : index < step ? "border-line bg-white" : "border-transparent bg-transparent opacity-60"}`}>
                <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${index < step ? "bg-violet text-white" : index === step ? "bg-violet text-white" : "bg-line text-muted"}`}>{index < step ? <Check size={14} /> : index + 1}</span>
                <span><span className="block text-sm font-bold">{t(item.label)}</span><span className="mt-0.5 block text-xs text-muted">{t(item.description)}</span></span>
              </button>
            </li>)}
          </ol>
        </aside>

        <section>
          <Card className="p-5 sm:p-7">
            {error && <div role="alert" className="mb-5 rounded-xl border border-coral/30 bg-coral-soft/40 p-3 text-sm text-coral-dark">{error}</div>}
            {saved && <p className="mb-5 text-sm font-semibold text-success">{saved}</p>}

            {step === 0 && <div>
              <Heading as="h1" eyebrow={t("Step 1")}>{t("What kind of business do you run?")}</Heading>
              <p className="mt-2 text-muted">{t("We use this to recommend the right features, fields, and customer actions.")}</p>
              <div className="relative mt-6"><Search size={17} className="absolute left-3 top-3.5 text-muted" /><Input className="pl-10" value={industrySearch} onChange={(event) => setIndustrySearch(event.target.value)} placeholder={t("Search industries...")} /></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visibleIndustries.map((item) => <button key={item.key} type="button" onClick={() => selectIndustry(item)} className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-card ${industryKey === item.key ? "border-violet bg-violet-soft/40" : "border-line bg-white"}`}>
                  <div className="flex items-start justify-between gap-2"><span className="grid size-10 place-items-center rounded-xl bg-white text-violet shadow-sm"><LayoutGrid size={18} /></span>{industryKey === item.key && <CheckCircle2 size={19} className="text-violet" />}</div>
                  <p className="mt-3 font-display text-base font-bold">{item.label}</p>
                  <p className="mt-1 text-xs leading-5 text-muted">{item.description}</p>
                  <p className="mt-2 text-[11px] font-semibold text-violet">{item.examples}</p>
                </button>)}
              </div>
              {industry && <div className="mt-6 rounded-2xl border border-line bg-[#faf9f6] p-4">
                <p className="text-sm font-bold">{t("Choose a subtype")}</p>
                <div className="mt-3 flex flex-wrap gap-2">{industry.subtypes.map((item) => <button key={item.key} type="button" onClick={() => { setSubtype(item.key); setCategory(item.label); }} className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${subtype === item.key ? "border-violet bg-violet text-white" : "border-line bg-white text-ink hover:border-violet"}`}>{item.label}</button>)}</div>
                {industryKey === "other" && <div className="mt-4 grid gap-3 sm:grid-cols-2"><div><Label htmlFor="custom-subtype">{t("Your business type")}</Label><Input id="custom-subtype" value={subtype === "general" ? "" : subtype} onChange={(event) => { setSubtype(event.target.value); setCategory(event.target.value); }} placeholder={t("e.g. Print studio")} /></div><div><Label htmlFor="custom-category">{t("Public category label")}</Label><Input id="custom-category" value={category} onChange={(event) => setCategory(event.target.value)} placeholder={t("e.g. Print and design")} /></div></div>}
                <div className="mt-4 flex flex-wrap gap-2"><Badge tone="violet">{t("Recommended features")}</Badge>{industry.recommended.map((key) => <span key={key} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-muted ring-1 ring-line">{capabilityLabel(catalog, key)}</span>)}</div>
              </div>}
            </div>}

            {step === 1 && <div>
              <Heading as="h1" eyebrow={t("Step 2")}>{t("Business details")}</Heading>
              <p className="mt-2 text-muted">{t("This is what customers see first. You can change it any time.")}</p>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2"><Label htmlFor="business-name">{t("Business name")}</Label><Input id="business-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} /></div>
                <div className="sm:col-span-2"><Label htmlFor="business-tagline">{t("Tagline")}</Label><Input id="business-tagline" value={tagline} onChange={(event) => setTagline(event.target.value)} maxLength={180} placeholder={t("One clear line about what you offer")} /></div>
                <div className="sm:col-span-2"><Label htmlFor="business-description">{t("Description")}</Label><Textarea id="business-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={5} placeholder={t("Tell customers what makes your business special.")} /></div>
                <div><Label htmlFor="business-phone">{t("Phone")}</Label><Input id="business-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+250 78..." /></div>
                <div><Label htmlFor="business-whatsapp">{t("WhatsApp number")}</Label><Input id="business-whatsapp" type="tel" value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} placeholder="+250 78..." /></div>
                <div><Label htmlFor="business-email">{t("Business email")}</Label><Input id="business-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
                <div><Label htmlFor="business-website">{t("Website")}</Label><Input id="business-website" type="url" value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://" /></div>
                <div><Label htmlFor="business-instagram">{t("Instagram")}</Label><Input id="business-instagram" value={instagram} onChange={(event) => setInstagram(event.target.value)} placeholder="https://instagram.com/..." /></div>
                <div><Label htmlFor="business-facebook">{t("Facebook")}</Label><Input id="business-facebook" value={facebook} onChange={(event) => setFacebook(event.target.value)} placeholder="https://facebook.com/..." /></div>
                <div><Label htmlFor="business-language">{t("Preferred language")}</Label><Select id="business-language" value={preferredLanguage} onChange={(event) => setPreferredLanguage(event.target.value)}><option value="en">English</option><option value="rw">Kinyarwanda</option><option value="fr">Francais</option></Select></div>
                <div><Label htmlFor="business-currency">{t("Currency")}</Label><Select id="business-currency" value={currency} onChange={(event) => setCurrency(event.target.value)}><option value="RWF">RWF</option><option value="USD">USD</option><option value="EUR">EUR</option></Select></div>
                <div><Label htmlFor="business-city">{t("City")}</Label><Input id="business-city" value={city} onChange={(event) => setCity(event.target.value)} /></div>
                <div><Label htmlFor="business-country">{t("Country")}</Label><Input id="business-country" value={country} onChange={(event) => setCountry(event.target.value)} /></div>
                <div className="sm:col-span-2"><Label htmlFor="business-address">{t("Address")}</Label><Input id="business-address" value={address} onChange={(event) => setAddress(event.target.value)} /></div>
                <div className="sm:col-span-2"><LocationPicker coordinates={coordinates} onSelect={setCoordinates} onGeolocationError={setLocationError} /></div>
                {locationError && <p className="sm:col-span-2 text-xs text-coral-dark">{locationError}</p>}
                <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2"><ImageUploadField title={t("Logo")} description={t("Square logo shown beside your business name.")} value={logoUrl} onChange={setLogoUrl} shape="square" /><ImageUploadField title={t("Cover image")} description={t("Wide image used at the top of your public page.")} value={coverImageUrl} onChange={setCoverImageUrl} /></div>
                <div className="sm:col-span-2"><p className="text-sm font-bold">{t("Opening hours")}</p><p className="mt-1 text-xs text-muted">{t("These hours are shown to customers and used for appointments.")}</p><div className="mt-3 overflow-hidden rounded-2xl border border-line">{weekdays.map((day) => <div key={day} className="flex flex-wrap items-center gap-3 border-b border-line px-3 py-2.5 last:border-b-0"><label className="flex min-w-28 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={!openingSchedule[day].closed} onChange={(event) => updateOpeningDay(day, { closed: !event.target.checked })} className="size-4 accent-[#087553]" />{day}</label>{openingSchedule[day].closed ? <span className="text-xs text-muted">{t("Closed")}</span> : <div className="flex items-center gap-2"><input type="time" value={openingSchedule[day].opens} onChange={(event) => updateOpeningDay(day, { opens: event.target.value })} className="rounded-lg border border-line px-2 py-1.5 text-sm" /><span className="text-xs text-muted">{t("to")}</span><input type="time" value={openingSchedule[day].closes} onChange={(event) => updateOpeningDay(day, { closes: event.target.value })} className="rounded-lg border border-line px-2 py-1.5 text-sm" /></div>}</div>)}</div></div>
              </div>
            </div>}

            {step === 2 && <div>
              <Heading as="h1" eyebrow={t("Step 3")}>{t("Choose what customers can do")}</Heading>
              <p className="mt-2 text-muted">{t("Only the features you enable appear on your public page and dashboard.")}</p>
              <div className="mt-6 space-y-6">
                <CapabilityGroup title={t("Recommended for") + " " + (industry?.label ?? t("your business"))} definitions={recommendedDefinitions} selected={capabilitySet} onToggle={toggleCapability} />
                <CapabilityGroup title={t("More options")} definitions={moreDefinitions} selected={capabilitySet} onToggle={toggleCapability} />
                <CapabilityGroup title={t("Planned for a future release")} definitions={(catalog?.capabilities ?? []).filter((capability) => capability.status === "planned")} selected={capabilitySet} onToggle={toggleCapability} planned />
              </div>
              <div className="mt-6 rounded-2xl border border-[#dcebe5] bg-[#f7fbf9] p-4 text-sm text-muted"><p className="font-bold text-ink">{t("How these work together")}</p><p className="mt-1">{t("Online orders need a product catalog and pickup or delivery. Appointments need services. Inventory, rooms, property listings, and ticketing are not available yet and are never presented as live features.")}</p></div>
            </div>}

            {step === 3 && <div>
              <Heading as="h1" eyebrow={t("Step 4")}>{t("Set up") + " " + (industry?.label ?? t("your business"))}</Heading>
              <p className="mt-2 text-muted">{t("Add the details that help customers understand and buy from you.")}</p>
              {industry?.profileFields.length ? <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {industry.profileFields.map((field) => <ProfileFieldInput key={field.key} field={field} value={profileData[field.key]} onChange={(value) => updateProfileField(field, value)} />)}
              </div> : null}

              {(industryKey === "accommodation" || industryKey === "food" || industryKey === "real_estate") && <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#f0dfc8] bg-[#fff8ec] p-4 text-sm text-[#76522a]"><Sparkles size={18} className="mt-0.5 shrink-0 text-[#c27a26]" /><p>{industryKey === "accommodation" ? t("Room inventory and accommodation bookings are planned for a future release. For now, use services and requests to describe stays and take inquiries.") : industryKey === "food" ? t("A dedicated food menu and table reservations are planned. For now, products can hold your menu and requests can handle catering and large orders.") : t("Property listings and structured property inquiries are planned. For now, use services, portfolio images, and requests to capture interest.")}</p></div>}

              {hasProducts && <div className="mt-8 rounded-2xl border border-line p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3"><div><p className="font-display text-lg font-bold">{t("Add your first product")}</p><p className="mt-1 text-sm text-muted">{hasOrders ? t("This item will be ready for online orders once your plan is active.") : t("This item will appear in your product catalog.")}</p></div><Package size={20} className="text-violet" /></div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2"><div><Label htmlFor="product-name">{t("Product name")}</Label><Input id="product-name" value={productName} onChange={(event) => setProductName(event.target.value)} placeholder={t("e.g. Signature gift box")} /></div><div><Label htmlFor="product-price">{t("Price")}</Label><Input id="product-price" type="number" min="0" value={productPrice} onChange={(event) => setProductPrice(event.target.value)} placeholder="0" /></div><div><Label htmlFor="product-category">{t("Category")}</Label><Input id="product-category" value={productCategory} onChange={(event) => setProductCategory(event.target.value)} /></div><div><Label htmlFor="product-description">{t("Description")}</Label><Input id="product-description" value={productDescription} onChange={(event) => setProductDescription(event.target.value)} /></div><div className="sm:col-span-2"><ImageUploadField title={t("Product image")} description={t("Show customers what they can expect.")} value={productImageUrl} onChange={setProductImageUrl} /></div></div>
                <p className="mt-3 text-xs text-muted">{t("Optional. You can add more products from the dashboard.")}</p>
              </div>}

              {hasServices && <div className="mt-6 rounded-2xl border border-line p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3"><div><p className="font-display text-lg font-bold">{t("Add your first service")}</p><p className="mt-1 text-sm text-muted">{hasAppointments ? t("Bookable services appear in your appointment calendar.") : t("Services appear on your public page and can be requested.")}</p></div><Users size={20} className="text-violet" /></div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2"><div><Label htmlFor="service-name">{t("Service name")}</Label><Input id="service-name" value={serviceName} onChange={(event) => setServiceName(event.target.value)} placeholder={t("e.g. Consultation")} /></div><div><Label htmlFor="service-price">{t("Starting price")}</Label><Input id="service-price" type="number" min="0" value={servicePrice} onChange={(event) => setServicePrice(event.target.value)} placeholder="0" /></div><div><Label htmlFor="service-duration">{t("Duration (minutes)")}</Label><Input id="service-duration" type="number" min="5" max="720" value={serviceDuration} onChange={(event) => setServiceDuration(event.target.value)} /></div><div><Label htmlFor="service-description">{t("Description")}</Label><Input id="service-description" value={serviceDescription} onChange={(event) => setServiceDescription(event.target.value)} /></div><div className="sm:col-span-2"><ImageUploadField title={t("Service image")} description={t("A helpful photo for this service.")} value={serviceImageUrl} onChange={setServiceImageUrl} /></div></div>
                {hasAppointments && <div className="mt-4 grid gap-4 rounded-xl bg-[#f7fbf9] p-4 sm:grid-cols-2"><div><Label htmlFor="slot-interval">{t("Appointment slot interval")}</Label><Select id="slot-interval" value={bookingSlotInterval} onChange={(event) => setBookingSlotInterval(event.target.value)}><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="60">60 minutes</option></Select></div><label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={bookingRequireConfirmation} onChange={(event) => setBookingRequireConfirmation(event.target.checked)} className="size-4 accent-[#087553]" />{t("Confirm each booking manually")}</label></div>}
                <p className="mt-3 text-xs text-muted">{t("Optional. You can add more services from the dashboard.")}</p>
              </div>}

              {!hasProducts && !hasServices && <div className="mt-8 rounded-2xl border border-line bg-[#faf9f6] p-5 text-sm text-muted"><p className="font-bold text-ink">{t("Your public page will focus on conversations")}</p><p className="mt-1">{t("You can add products or services later by enabling those features.")}</p></div>}
            </div>}

            {step === 4 && <div>
              <Heading as="h1" eyebrow={t("Step 5")}>{t("Preview your page")}</Heading>
              <p className="mt-2 text-muted">{t("This is a preview of the sections customers will see.")}</p>
              <div className="mt-6 overflow-hidden rounded-3xl border border-line bg-white shadow-card">
                <div className="relative min-h-48 bg-gradient-to-br from-[#062820] to-[#0c4a38] p-6 text-white">
                  {coverImageUrl && <img src={coverImageUrl} alt="" className="absolute inset-0 size-full object-cover opacity-45" />}
                  <div className="relative flex min-h-36 flex-col justify-end">
                    <div className="flex items-end gap-3">{logoUrl && <img src={logoUrl} alt="" className="size-14 rounded-2xl border-2 border-white bg-white object-cover" />}<div><p className="font-display text-2xl font-bold">{name || t("Your business")}</p><p className="mt-1 text-sm text-white/80">{tagline || category || t("Your tagline")}</p></div></div>
                    <div className="mt-3 flex flex-wrap gap-2">{capabilities.map((key) => <span key={key} className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white">{capabilityLabel(catalog, key)}</span>)}</div>
                  </div>
                </div>
                <div className="space-y-4 p-5">
                  <p className="text-sm leading-6 text-muted">{description || t("Your business description appears here.")}</p>
                  <div className="flex flex-wrap gap-2">
                    {hasAppointments && <span className="rounded-xl bg-violet px-3 py-2 text-sm font-bold text-white">{t("Book an appointment")}</span>}
                    {hasOrders && <span className="rounded-xl bg-[#087553] px-3 py-2 text-sm font-bold text-white">{t("Order online")}</span>}
                    {hasWhatsApp && <span className="rounded-xl border border-line px-3 py-2 text-sm font-bold">{t("Chat on WhatsApp")}</span>}
                    {hasRequests && <span className="rounded-xl border border-line px-3 py-2 text-sm font-bold">{t("Send a request")}</span>}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {hasProducts && <PreviewSection icon={<Package size={17} />} title={t("Products")} text={productName || t("Your product catalog")} />}
                    {hasServices && <PreviewSection icon={<Users size={17} />} title={t("Services")} text={serviceName || t("Your services")} />}
                    {hasAppointments && <PreviewSection icon={<Clock3 size={18} />} title={t("Book online")} text={t("Customers choose an available time.")} />}
                    {hasRequests && <PreviewSection icon={<MessageCircle size={17} />} title={t("Requests")} text={t("Customers send details and you reply with a quote.")} />}
                    {hasPortfolio && <PreviewSection icon={<ImagePlus size={17} />} title={t("Gallery")} text={t("Images from your products and services.")} />}
                    {hasReviews && <PreviewSection icon={<Star size={17} />} title={t("Reviews")} text={t("Verified customer feedback.")} />}
                  </div>
                  <div className="flex flex-wrap gap-3 border-t border-line pt-4 text-xs font-semibold text-muted">{phone && <span>{phone}</span>}{email && <span>{email}</span>}{city && <span>{city}, {country}</span>}</div>
                </div>
              </div>
            </div>}

            {step === 5 && <div>
              <Heading as="h1" eyebrow={t("Step 6")}>{t("Review and publish")}</Heading>
              <p className="mt-2 text-muted">{t("Check the essentials, then make your page live.")}</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Summary label={t("Business")} value={name || t("Not set")} />
                <Summary label={t("Industry")} value={industry?.label ?? industryLabel(catalog, industryKey)} />
                <Summary label={t("Subtype")} value={subtype || t("Not set")} />
                <Summary label={t("Category")} value={category || t("Not set")} />
                <Summary label={t("Contact")} value={[phone, whatsapp, email].filter(Boolean).join(" / ") || t("Not set")} />
                <Summary label={t("Location")} value={[city, country].filter(Boolean).join(", ") || t("Not set")} />
              </div>
              <div className="mt-5 rounded-2xl border border-line p-4"><p className="text-sm font-bold">{t("Customer features")}</p><div className="mt-2 flex flex-wrap gap-2">{capabilities.length ? capabilities.map((key) => <Badge key={key} tone="violet">{capabilityLabel(catalog, key)}</Badge>) : <span className="text-sm text-muted">{t("None selected")}</span>}</div></div>
              {issues.length ? <div className="mt-5 rounded-2xl border border-coral/30 bg-coral-soft/30 p-4"><p className="text-sm font-bold text-coral-dark">{t("Finish these before publishing")}</p><ul className="mt-2 space-y-1 text-sm text-coral-dark">{issues.map((issue) => <li key={issue} className="flex items-start gap-2"><XCircle size={15} className="mt-0.5 shrink-0" />{issue}</li>)}</ul></div> : <div className="mt-5 rounded-2xl border border-[#dcebe5] bg-[#f7fbf9] p-4 text-sm text-[#075b43]"><p className="flex items-center gap-2 font-bold"><CheckCircle2 size={17} /> {t("Ready to publish")}</p><p className="mt-1">{t("Your public page will be available at its own link.")}</p></div>}
              {warnings.length ? <div className="mt-4 rounded-2xl border border-[#f0dfc8] bg-[#fff8ec] p-4 text-sm text-[#76522a]"><p className="font-bold">{t("Good to know")}</p><ul className="mt-2 space-y-1">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div> : null}
              {business?.isPublished && business.slug && <a href={`/b/${business.slug}`} target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-4 text-sm font-bold text-ink hover:border-violet hover:text-violet"><Globe2 size={16} /> {t("Open your live page")}</a>}
            </div>}
          </Card>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0 || saving} icon={<ArrowLeft size={16} />}>{t("Back")}</Button>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => void saveAndExit()} loading={saving} disabled={saving} icon={<Save size={16} />}>{t("Save draft")}</Button>
              {step < steps.length - 1
                ? <Button onClick={() => void saveStep(step)} loading={saving} disabled={saving}>{t("Continue")} <ArrowRight size={16} /></Button>
                : <Button onClick={() => void publish()} loading={saving} disabled={saving || issues.length > 0} icon={<Globe2 size={16} />}>{t("Publish page")}</Button>}
            </div>
          </div>
        </section>
      </div>
    </div>
  </main>;
}

function CapabilityGroup({ title, definitions, selected, onToggle, planned = false }: { title: string; definitions: CapabilityDefinition[]; selected: Set<string>; onToggle: (definition: CapabilityDefinition) => void; planned?: boolean }) {
  const { t } = useLanguage();
  if (!definitions.length) return null;
  return <div>
    <p className="text-sm font-bold">{title}</p>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      {definitions.map((definition) => {
        const isSelected = selected.has(definition.key);
        return <button key={definition.key} type="button" disabled={planned} onClick={() => onToggle(definition)} className={`rounded-2xl border p-4 text-left transition ${planned ? "cursor-not-allowed border-dashed border-line bg-[#faf9f6] opacity-70" : isSelected ? "border-violet bg-violet-soft/40" : "border-line bg-white hover:border-violet"}`}>
          <div className="flex items-start justify-between gap-3"><span className="font-bold">{definition.label}</span>{planned ? <Badge tone="neutral">{t("Planned")}</Badge> : isSelected ? <CheckCircle2 size={19} className="shrink-0 text-violet" /> : <span className="size-[19px] shrink-0 rounded-full border border-line" />}</div>
          <p className="mt-2 text-xs leading-5 text-muted">{definition.description}</p>
        </button>;
      })}
    </div>
  </div>;
}

function PreviewSection({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="rounded-xl border border-line bg-[#faf9f6] p-3"><div className="flex items-center gap-2 text-violet">{icon}<span className="text-sm font-bold text-ink">{title}</span></div><p className="mt-1 text-xs text-muted">{text}</p></div>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-line bg-white p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p><p className="mt-1 text-sm font-bold">{value}</p></div>;
}
