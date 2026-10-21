import { ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, Clock3, FileUp, LockKeyhole, Mail, MapPin, MessageCircle, Minus, Phone, Plus, Send, ShieldCheck, ShoppingBag, Store, Trash2, UploadCloud } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router";
import { businessService, requestService, resolveAssetUrl, uploadService } from "../services/api";
import { Button, ButtonLink, Card, Input, Textarea } from "../components/ui";
import { LocationPicker, type Coordinates } from "../components/onboarding/LocationPicker";
import { LanguageSwitcher, useLanguage } from "../i18n";

type QuestionType = "TEXT" | "TEXTAREA" | "NUMBER" | "SELECT" | "MULTI_SELECT" | "DATE" | "TIME" | "FILE" | "LOCATION" | "PHONE" | "EMAIL";
type Answer = string | string[];
interface RequestTemplate {
  id: string;
  name: string;
  businessType: string;
  services: Array<{ id: string; name: string; description: string; startingPrice: number | string | null; currency: string; duration: string | null; durationMinutes?: number | null; imageUrl: string | null }>;
  products: Array<{ id: string; name: string; description: string; price: number | string; currency: string; imageUrl: string | null }>;
  questions: Array<{ id: string; label: string; type: QuestionType; required: boolean; options: string[] | null }>;
}
interface RequestConfirmation { requestNumber: string; status: string }
interface OrderItem { id: string; name: string; quantity: number; unitPrice: number; currency: string }
interface BusinessBrand { name: string; logoUrl: string | null; coverImageUrl: string | null; category: string | null; city: string | null; country: string; tagline: string | null; address: string | null; phone: string | null; whatsapp: string | null; email: string | null; description: string | null }
type ContactMethod = "phone" | "whatsapp" | "email";

const formatPrice = (amount: number | string | null, currency: string) => amount === null ? "Price on request" : `${currency} ${Number(amount).toLocaleString()}`;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function FieldLabel({ children, required, hideOptional }: { children: ReactNode; required?: boolean; hideOptional?: boolean }) {
  const { t } = useLanguage();
  return <span className="mb-2 flex items-center gap-2 text-[13px] font-bold text-[#193c34]">{children}{required ? <span className="text-[#0b9367]" aria-hidden="true">*</span> : hideOptional ? null : <span className="text-[10px] font-semibold uppercase tracking-wide text-[#91a198]">{t("Optional")}</span>}</span>;
}

function StepHeading({ step, title, description }: { step: number; title: string; description: string }) {
  const { t } = useLanguage();
  return <div className="flex items-start gap-3.5 border-b border-[#edf2ee] pb-5">
    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#e8f6ee] font-display text-sm font-extrabold text-[#087553] ring-1 ring-[#d4e9dd]">0{step}</span>
    <div className="min-w-0">
      <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#07865c]">{t("Step")} {step} {t("of")} 3</p>
      <h1 className="mt-1 font-display text-[1.55rem] font-extrabold leading-tight tracking-[-.025em] sm:text-3xl">{title}</h1>
      <p className="mt-1.5 max-w-lg text-sm leading-6 text-[#75877d]">{description}</p>
    </div>
  </div>;
}

function SummaryRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3 py-3 text-xs"><span className="flex min-w-0 items-center gap-2 text-[#75867c]"><span className="shrink-0 text-[#087553]">{icon}</span><span className="truncate">{label}</span></span><strong className="max-w-[58%] truncate text-right font-bold text-[#294b3e]">{value}</strong></div>;
}

function displayQuestionLabel(label: string) {
  if (/^tell us more/i.test(label.trim())) return "Anything else that would help?";
  if (/^tell us what you need$/i.test(label.trim())) return "What would help you most?";
  return label;
}

export default function RequestPage() {
  const { t } = useLanguage();
  const location = useLocation();
  const { businessSlug } = useParams();
  const routeState = location.state as { orderItems?: OrderItem[]; selectedService?: { id: string; name: string } } | null;
  const isOrder = Boolean(routeState?.orderItems?.length);
  const [orderItems, setOrderItems] = useState<OrderItem[]>(() => routeState?.orderItems ?? []);
  const selectedService = routeState?.selectedService;
  const [template, setTemplate] = useState<RequestTemplate | null>(null);
  const [businessBrand, setBusinessBrand] = useState<BusinessBrand | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [templateError, setTemplateError] = useState("");
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [customerName, setCustomerName] = useState("");
  const [contactMethod, setContactMethod] = useState<ContactMethod>("whatsapp");
  const [contactValue, setContactValue] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState(selectedService?.id ?? "");
  const [notes, setNotes] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [confirmation, setConfirmation] = useState<RequestConfirmation | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const stepTitles = isOrder ? [t("Your order"), t("Contact"), t("Review")] : [t("Service"), t("Details"), t("Contact")];
  const stepHints = isOrder ? [t("Check your items"), t("How to reach you"), t("Send your order")] : [t("Choose what you need"), t("Only the essentials"), t("Review and send")];

  useEffect(() => {
    if (!businessSlug || isOrder) { setLoadingTemplate(false); return; }
    let current = true;
    void requestService.getTemplate<RequestTemplate>(businessSlug)
      .then((loaded) => {
        if (!current) return;
        setTemplate(loaded);
        setSelectedServiceId((existing) => existing || selectedService?.id || loaded.services[0]?.id || "");
      })
      .catch((reason: unknown) => { if (current) setTemplateError(reason instanceof Error ? reason.message : "Could not load the request form."); })
      .finally(() => { if (current) setLoadingTemplate(false); });
    return () => { current = false; };
  }, [businessSlug, isOrder, selectedService?.id]);

  useEffect(() => {
    if (!businessSlug) return;
    let current = true;
    void businessService.getPublicBusinessBrand<BusinessBrand>(businessSlug)
      .then((brand) => { if (current) setBusinessBrand(brand); })
      .catch(() => { /* The request template remains a usable fallback. */ });
    return () => { current = false; };
  }, [businessSlug]);

  const setAnswer = (id: string, value: Answer) => setAnswers((existing) => ({ ...existing, [id]: value }));
  const answerFor = (id: string): Answer => answers[id] ?? "";
  const serviceQuestion = template?.services.length ? template.questions.find((entry) => entry.label.toLowerCase().includes("what service do you need")) : undefined;
  const detailQuestions = useMemo(() => (template?.questions ?? []).filter((question) => question.id !== serviceQuestion?.id), [template?.questions, serviceQuestion?.id]);
  const textareaQuestion = detailQuestions.find((question) => question.type === "TEXTAREA");
  const dateQuestion = detailQuestions.find((entry) => entry.type === "DATE");
  const locationQuestion = detailQuestions.find((entry) => entry.type === "LOCATION");
  const locationAnswer = locationQuestion ? String(answerFor(locationQuestion.id)) : "";
  const locationParts = locationAnswer.split(",").map((part) => Number(part.trim()));
  const locationCoordinates: Coordinates | null = locationParts.length === 2 && locationParts.every(Number.isFinite)
    ? { latitude: locationParts[0], longitude: locationParts[1] }
    : null;
  const selectedServiceRecord = template?.services.find((service) => service.id === selectedServiceId) ?? null;
  const chosenServiceName = selectedServiceRecord?.name || selectedService?.name || "";
  const orderTotal = orderItems.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  const requestType = isOrder ? "Product order" : chosenServiceName || template?.name || "Service request";
  const contactMethodLabel = contactMethod === "whatsapp" ? "WhatsApp" : contactMethod === "email" ? "Email" : "Phone";

  const updateQuantity = (id: string, amount: number) => {
    setOrderItems((items) => items.map((item) => item.id === id ? { ...item, quantity: Math.max(1, item.quantity + amount) } : item));
  };
  const removeItem = (id: string) => setOrderItems((items) => items.filter((item) => item.id !== id));

  useEffect(() => {
    if (currentStep > 0) document.getElementById("request-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [currentStep]);

  const contactError = () => {
    if (customerName.trim().length < 2) return t("Add your name so the business knows who is contacting them.");
    if (contactMethod === "email" && !emailPattern.test(contactValue.trim())) return t("Enter a valid email address.");
    if (contactMethod !== "email" && contactValue.replace(/\D/g, "").length < 7) return t("Enter a valid phone or WhatsApp number.");
    return "";
  };

  const validateStep = () => {
    if (currentStep === 0) {
      if (!isOrder && template?.services.length && !selectedServiceId) return t("Choose a service to continue.");
      if (!isOrder && !template?.services.length && serviceQuestion?.required && !String(answerFor(serviceQuestion.id)).trim()) return t("Tell the business what you need to continue.");
    }
    if (currentStep === 1) {
      if (isOrder) return contactError();
      const missing = detailQuestions.find((question) => {
        if (!question.required) return false;
        const value = answers[question.id];
        return !value || (Array.isArray(value) ? value.length === 0 : !String(value).trim());
      });
      if (missing) return `${t("Please complete")} “${displayQuestionLabel(missing.label)}”.`;
    }
    if (currentStep === 2) return contactError();
    return "";
  };

  const nextStep = () => {
    const message = validateStep();
    if (message) { setError(message); return; }
    setError("");
    setCurrentStep((step) => Math.min(step + 1, stepTitles.length - 1));
  };

  const uploadFile = async (questionId: string, file: File) => {
    setUploadingId(questionId);
    setError("");
    try {
      const uploaded = await uploadService.upload(file);
      setAnswer(questionId, uploaded.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "That file could not be uploaded. Please try again.");
    } finally {
      setUploadingId(null);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!businessSlug || (!template && !isOrder) || loading) return;
    const contactMessage = contactError();
    if (contactMessage) { setError(contactMessage); return; }
    if (!isOrder && !selectedServiceId && template?.services.length) { setError(t("Choose a service to continue.")); return; }
    const missing = isOrder ? undefined : detailQuestions.find((question) => {
      if (!question.required) return false;
      const value = answers[question.id];
      return !value || (Array.isArray(value) ? value.length === 0 : !String(value).trim());
    });
    if (missing) { setError(`${t("Please complete")} “${displayQuestionLabel(missing.label)}”.`); return; }
    setError("");
    setLoading(true);
    try {
      const finalAnswers = { ...answers };
      if (serviceQuestion && chosenServiceName) finalAnswers[serviceQuestion.id] = chosenServiceName;
      const serviceDescription = !isOrder ? String(textareaQuestion ? answerFor(textareaQuestion.id) : notes) : "";
      const result = await requestService.submit<RequestConfirmation>(businessSlug, {
        customerName: customerName.trim(),
        customerPhone: contactMethod === "phone" ? contactValue.trim() : "",
        customerWhatsapp: contactMethod === "whatsapp" ? contactValue.trim() : "",
        customerEmail: contactMethod === "email" ? contactValue.trim() : "",
        requestType,
        ...(isOrder ? {
          orderItems: orderItems.map((item) => ({ productId: item.id, quantity: item.quantity })),
          orderNote: notes.trim(),
        } : {
          description: serviceDescription.trim(),
        }),
        location: locationQuestion ? String(answerFor(locationQuestion.id)) : "",
        preferredDate: dateQuestion ? answers[dateQuestion.id] || undefined : undefined,
        answers: isOrder ? {} : finalAnswers,
      });
      setConfirmation(result);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your request could not be sent. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const questionControl = (question: RequestTemplate["questions"][number]) => {
    const value = answerFor(question.id);
    const label = displayQuestionLabel(question.label);
    switch (question.type) {
      case "SELECT": return <select required={question.required} aria-label={label} className="min-h-12 w-full rounded-xl border border-[#dce8df] bg-white px-3.5 text-sm text-[#24463a] shadow-sm outline-none transition focus:border-[#0b9367] focus:ring-4 focus:ring-[#0b9367]/10" value={String(value)} onChange={(event) => setAnswer(question.id, event.target.value)}><option value="">{t("Choose one")}</option>{(question.options ?? []).map((option) => <option key={option}>{option}</option>)}</select>;
      case "MULTI_SELECT": return <div className="flex flex-wrap gap-2">{(question.options ?? []).map((option) => { const active = Array.isArray(value) && value.includes(option); return <button type="button" aria-pressed={active} key={option} onClick={() => { const current = Array.isArray(value) ? value : []; setAnswer(question.id, active ? current.filter((entry) => entry !== option) : [...current, option]); }} className={`rounded-full border px-3.5 py-2 text-xs font-bold transition ${active ? "border-[#0b9367] bg-[#e9f7ee] text-[#087553]" : "border-[#dce8df] bg-white text-[#62776b] hover:border-[#9bc8aa]"}`}>{active && <Check size={12} className="mr-1 inline" />}{option}</button>; })}</div>;
      case "TEXTAREA": return <div className="space-y-2"><div className="relative"><Textarea id={question.id} required={question.required} maxLength={3000} className="field w-full min-h-36 resize-y rounded-2xl border-[#d9e5dd] bg-[#fcfdfc] px-4 py-3.5 pb-8 text-[15px] leading-7 text-[#233f35] placeholder:text-[#9aa9a0] shadow-[inset_0_1px_2px_rgba(20,55,38,.025)] transition focus:border-[#0b9367] focus:bg-white focus:ring-4 focus:ring-[#0b9367]/10" placeholder={t("Share a short note, preference, or question. You can leave this blank.")} value={String(value)} onChange={(event) => setAnswer(question.id, event.target.value)} /><span aria-live="polite" className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-white/90 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-[#819188]">{String(value).length}/3000</span></div></div>;
      case "FILE": return <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#cbded0] bg-[#fbfdfb] px-4 text-sm font-semibold text-[#557165] transition hover:border-[#0b9367] hover:bg-[#f2faf5]"><span className="grid size-9 place-items-center rounded-xl bg-[#e8f5ec] text-[#087553]">{uploadingId === question.id ? <UploadCloud size={17} className="animate-bounce" /> : <FileUp size={17} />}</span><span>{uploadingId === question.id ? t("Uploading your file…") : value ? t("Photo attached. Choose another") : t("Add a photo")}</span><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadFile(question.id, file); }} /></label>;
      case "LOCATION": return <div className="space-y-3"><Input id={`${question.id}-address`} required={question.required && !locationCoordinates} autoComplete="street-address" className="field w-full rounded-xl border-[#dce8df] bg-white shadow-sm transition placeholder:text-[#91a198] focus:border-[#0b9367] focus:ring-4 focus:ring-[#0b9367]/10" placeholder={t("Street, neighbourhood, or landmark")} value={locationCoordinates ? "" : locationAnswer} onChange={(event) => setAnswer(question.id, event.target.value)} /><details className="group rounded-xl border border-[#e4ece5] bg-[#fafcfa] p-3"><summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-bold text-[#547267]"><MapPin size={14} />{t("Pin a precise location")} <span className="ml-auto text-[#83958b] transition group-open:rotate-180">▾</span></summary><div className="mt-3 overflow-hidden rounded-xl"><LocationPicker coordinates={locationCoordinates} title={t("Choose a location")} description={t("Tap the map to place a pin.")} mapHeight={240} onSelect={(coordinates) => setAnswer(question.id, `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`)} onGeolocationError={(message) => setError(message)} /></div></details></div>;
      default: return <Input id={question.id} required={question.required} type={question.type === "NUMBER" ? "number" : question.type === "DATE" ? "date" : question.type === "TIME" ? "time" : question.type === "PHONE" ? "tel" : question.type === "EMAIL" ? "email" : "text"} min={question.type === "NUMBER" ? 0 : question.type === "DATE" ? new Date().toISOString().slice(0, 10) : undefined} autoComplete={question.type === "PHONE" ? "tel" : question.type === "EMAIL" ? "email" : undefined} className="field w-full rounded-xl border-[#dce8df] bg-white shadow-sm transition placeholder:text-[#91a198] focus:border-[#0b9367] focus:ring-4 focus:ring-[#0b9367]/10" placeholder={question.type === "DATE" ? t("Choose a preferred date") : question.type === "TIME" ? t("Choose a preferred time") : question.type === "NUMBER" ? t("Enter a number") : t("Type your answer")} value={String(value)} onChange={(event) => setAnswer(question.id, event.target.value)} />;
    }
  };

  if (loadingTemplate) return <main className="grid min-h-screen place-items-center bg-[#f3f8f5] p-5"><div className="w-full max-w-lg animate-pulse rounded-[2rem] border border-[#e0ebe4] bg-white p-8"><div className="h-4 w-32 rounded bg-[#e7f0ea]" /><div className="mt-5 h-9 w-3/4 rounded bg-[#e7f0ea]" /><div className="mt-8 h-14 rounded-2xl bg-[#f0f5f1]" /><div className="mt-3 h-14 rounded-2xl bg-[#f0f5f1]" /></div></main>;
  if (!template && !isOrder) return <main className="grid min-h-screen place-items-center bg-[#f3f8f5] p-5"><Card className="max-w-lg p-8 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#fff1eb] text-[#bd573b]"><Store size={22} /></span><h1 className="mt-4 font-display text-2xl font-bold text-[#183c33]">{t("Requests are unavailable")}</h1><p className="mt-2 text-sm leading-6 text-[#708078]">{templateError || t("This business has not set up its request form yet.")}</p><ButtonLink to={`/b/${businessSlug}`} className="mt-6">{t("Return to business")}</ButtonLink></Card></main>;

  const businessName = businessBrand?.name || template?.name || businessSlug || "Business";
  if (confirmation) {
    const whatsappDigits = businessBrand?.whatsapp?.replace(/\D/g, "");
    return <main className="grid min-h-screen place-items-center bg-[radial-gradient(ellipse_at_top,#e3f4e9,#f3f8f5_55%)] p-5"><Card className="w-full max-w-lg overflow-hidden border-[#dcebe1] p-0 text-center shadow-[0_30px_100px_rgba(10,64,43,.12)]"><div className="bg-[#075b43] px-7 pb-8 pt-10 text-white"><span className="mx-auto grid size-[68px] place-items-center rounded-full border border-white/20 bg-white/10"><CheckCircle2 size={32} /></span><p className="mt-5 text-[10px] font-extrabold uppercase tracking-[.2em] text-emerald-200">{isOrder ? t("Order request sent") : t("Request received")}</p><h1 className="mt-2 font-display text-3xl font-extrabold">{t("Sent to the business")}</h1><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-emerald-50/80">{isOrder ? `${businessName} ${t("will confirm availability and the final price using your contact details.")}` : `${businessName} ${t("has your request and will get back to you to confirm the details.")}`}</p></div><div className="p-6 sm:p-8"><div className="rounded-2xl border border-[#e5eee7] bg-[#f8fbf8] p-4 text-left"><p className="text-xs font-semibold text-[#829087]">{isOrder ? t("ORDER REFERENCE") : t("REQUEST REFERENCE")}</p><p className="mt-1 font-display text-xl font-bold text-[#143d32]">#{confirmation.requestNumber}</p><div className="mt-4 flex items-center justify-between border-t border-[#e4ece5] pt-3 text-sm"><span className="min-w-0 truncate text-[#718078]">{requestType}</span><span className="ml-3 shrink-0 rounded-full bg-[#e3f5e9] px-2.5 py-1 text-xs font-bold capitalize text-[#087553]">{confirmation.status.toLowerCase()}</span></div></div><div className="mt-5 rounded-2xl border border-[#e5eee7] p-4 text-left"><p className="text-xs font-bold text-[#234f49]">{t("What happens next")}</p><ol className="mt-3 space-y-2.5 text-xs leading-5 text-[#667b70]"><li className="flex gap-2"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#e7f5eb] text-[10px] font-bold text-[#087553]">1</span>{t("The business reviews your request.")}</li><li className="flex gap-2"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#e7f5eb] text-[10px] font-bold text-[#087553]">2</span>{t("They confirm the details using your preferred contact.")}</li><li className="flex gap-2"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#e7f5eb] text-[10px] font-bold text-[#087553]">3</span>{isOrder ? t("You agree on pickup or delivery.") : t("You agree on the time and next steps.")}</li></ol></div><div className="mt-5 flex flex-wrap gap-2">{whatsappDigits && <a href={`https://wa.me/${whatsappDigits}`} target="_blank" rel="noreferrer" className="btn btn-secondary inline-flex flex-1 items-center justify-center gap-2"><MessageCircle size={16} />{t("Contact on WhatsApp")}</a>}<ButtonLink to={`/b/${businessSlug}`} className="flex-1">{t("Back to")} {businessName}</ButtonLink></div><p className="mt-4 text-[10px] leading-4 text-[#829087]">{t("Keep your reference number. No payment was collected.")}</p></div></Card></main>;
  }

  const orderSummaryLabel = orderItems.map((item) => `${item.name} × ${item.quantity}`).join(", ");
  const serviceSummary = chosenServiceName || t("Choose a service");
  const detailSummary = detailQuestions.filter((question) => answers[question.id]).map((question) => `${displayQuestionLabel(question.label)}: ${Array.isArray(answers[question.id]) ? (answers[question.id] as string[]).join(", ") : String(answers[question.id])}`).join(" · ");
  const contactSummary = `${contactMethodLabel} · ${contactValue || t("Not added")}`;
  const stepComplete = (index: number) => index < currentStep;

  return <div className="request-page min-h-screen bg-[#eef3ef] text-[#173c32]">
    <header className="relative z-20 border-b border-white/10 bg-[#052f25] text-white">
      <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between gap-3 px-4 sm:px-7">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/10 text-emerald-200"><ShieldCheck size={16} /></span>
          <span className="hidden min-w-0 sm:block">
            <span className="block text-[9px] font-extrabold uppercase tracking-[.18em] text-emerald-200/70">{t("Secure request")}</span>
            <span className="block truncate text-xs font-bold text-white/90">{businessName}</span>
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <LanguageSwitcher compact />
          <Link to={`/b/${businessSlug}`} className="inline-flex items-center gap-2 rounded-full border border-white/25 px-3 py-2 text-xs font-bold text-white transition hover:border-white/45 hover:bg-white/10 sm:px-4"><ArrowLeft size={15} /> <span className="hidden sm:inline">{t("Back to business")}</span><span className="sm:hidden">{t("Back")}</span></Link>
        </div>
      </div>
    </header>

    <main className="mx-auto max-w-[1180px] px-4 pb-14 pt-5 sm:px-7 sm:pt-7">
      <section className="relative overflow-hidden rounded-[1.8rem] border border-[#135b47] bg-[#063c2f] text-white shadow-[0_26px_70px_rgba(7,62,50,.18)] sm:rounded-[2rem]">
        {businessBrand?.coverImageUrl && <img src={resolveAssetUrl(businessBrand.coverImageUrl)} alt="" className="absolute inset-0 size-full object-cover opacity-25 mix-blend-luminosity" />}
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(110deg,rgba(2,38,29,.98)_0%,rgba(4,59,45,.9)_46%,rgba(4,70,52,.45)_100%)]" />
        <div aria-hidden="true" className="absolute -right-20 -top-28 size-80 rounded-full border border-white/10" />
        <div aria-hidden="true" className="absolute -right-7 -top-10 size-52 rounded-full border border-white/10" />
        <div aria-hidden="true" className="absolute bottom-0 left-1/3 h-32 w-72 -translate-x-1/2 rounded-full bg-emerald-300/10 blur-3xl" />
        <div className="relative grid gap-7 px-5 py-7 sm:px-8 sm:py-9 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-end lg:px-10 lg:py-11">
          <div className="min-w-0">
            <div className="flex items-center gap-4">
              <span className="grid size-[68px] shrink-0 place-items-center overflow-hidden rounded-[1.35rem] border border-white/25 bg-white/10 text-emerald-200 shadow-lg backdrop-blur sm:size-20">{businessBrand?.logoUrl ? <img src={resolveAssetUrl(businessBrand.logoUrl)} alt={`${businessName} logo`} className="size-full object-cover" /> : <Store size={28} />}</span>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-emerald-200/80">{isOrder ? t("Ordering from") : t("Requesting from")}</p>
                <h1 className="mt-1 break-words font-display text-3xl font-extrabold leading-[1.05] tracking-[-.035em] sm:text-4xl lg:text-[2.7rem]">{businessName}</h1>
              </div>
            </div>
            <p className="mt-5 max-w-lg text-sm leading-6 text-emerald-50/80">{businessBrand?.tagline || (isOrder ? t("Review your items, add delivery notes, and send a direct order request.") : t("Choose a service, share only what is useful, and the business will reply with the next step."))}</p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {[isOrder ? t("Product order") : t("Service request"), businessBrand?.category && businessBrand.category !== "Other" ? businessBrand.category : null, businessBrand?.city || businessBrand?.country, t("Private by default")].filter(Boolean).map((item) => <span key={item} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[.07] px-3 py-1.5 text-[10px] font-bold text-emerald-50/85 backdrop-blur"><Check size={11} className="text-emerald-300" />{item}</span>)}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[{ icon: <ShieldCheck size={15} />, label: t("Free to send"), detail: isOrder ? t("No payment now") : t("No payment online") }, { icon: <LockKeyhole size={15} />, label: t("Private"), detail: t("Only shared with them") }, { icon: <MessageCircle size={15} />, label: t("Direct reply"), detail: t("By your contact choice") }].map((item) => <div key={item.label} className="rounded-2xl border border-white/12 bg-white/[.07] p-3 backdrop-blur-sm"><span className="grid size-7 place-items-center rounded-lg bg-emerald-300/15 text-emerald-200">{item.icon}</span><strong className="mt-2.5 block text-[10px] font-extrabold text-white">{item.label}</strong><span className="mt-0.5 block text-[9px] leading-4 text-emerald-50/65">{item.detail}</span></div>)}
          </div>
        </div>
      </section>

      <nav aria-label={t("Request progress")} className="relative z-10 my-5 rounded-[1.35rem] border border-[#dce8df] bg-white/95 p-3 shadow-[0_12px_35px_rgba(23,70,49,.06)] backdrop-blur sm:p-4">
        <div className="relative grid grid-cols-3">
          <div aria-hidden="true" className="absolute left-[16.66%] right-[16.66%] top-4 h-px bg-[#d9e6dd] sm:top-5" />
          {stepTitles.map((title, index) => <button type="button" key={title} aria-current={currentStep === index ? "step" : undefined} disabled={index > currentStep} onClick={() => { if (index < currentStep) { setError(""); setCurrentStep(index); } }} className={`relative z-10 flex min-w-0 flex-col items-center rounded-xl px-1 text-center transition sm:px-2 ${index < currentStep ? "cursor-pointer hover:bg-[#f2faf5]" : index === currentStep ? "cursor-default" : "cursor-default opacity-65"}`}><span className={`grid size-8 place-items-center rounded-full border text-[11px] font-extrabold transition sm:size-10 sm:text-xs ${index === currentStep ? "border-[#075b43] bg-[#075b43] text-white shadow-[0_0_0_5px_rgba(8,117,83,.1)]" : index < currentStep ? "border-[#b7dcc8] bg-[#e7f5eb] text-[#087553]" : "border-[#d5e3db] bg-white text-[#8a9b92]"}`}>{stepComplete(index) ? <Check size={14} /> : index + 1}</span><strong className={`mt-2 block max-w-full truncate text-[10px] font-extrabold sm:text-xs ${index === currentStep ? "text-[#075b43]" : index < currentStep ? "text-[#46695a]" : "text-[#84958c]"}`}>{title}</strong><small className="mt-0.5 hidden max-w-full truncate text-[9px] font-medium text-[#8a9b92] sm:block">{stepHints[index]}</small></button>)}
        </div>
      </nav>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(310px,.8fr)]">
        <form id="request-form" onSubmit={(event) => void submit(event)} className="min-w-0 space-y-4">
          {currentStep === 0 && (isOrder ? <Card className="overflow-hidden rounded-[1.75rem] border-[#e0eae2] bg-white p-5 shadow-[0_18px_55px_rgba(23,70,49,.06)] sm:p-7"><StepHeading step={1} title={t("Check your items")} description={t("Adjust quantities before sending. The business will confirm availability and the final price.")} />{orderItems.length ? <div className="space-y-3">{orderItems.map((item) => <article key={item.id} className="flex gap-3 rounded-2xl border border-[#e4ede7] bg-[#fbfdfc] p-3.5"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#eaf5f1] text-[#087553]"><ShoppingBag size={20} /></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate text-sm font-bold">{item.name}</h2><p className="mt-0.5 text-xs text-[#75877d]">{item.currency} {item.unitPrice.toLocaleString()} {t("each")}</p></div><button type="button" onClick={() => removeItem(item.id)} aria-label={`${t("Remove")} ${item.name}`} className="grid size-8 shrink-0 place-items-center rounded-lg text-[#95a69c] transition hover:bg-[#fff1eb] hover:text-[#b15035]"><Trash2 size={15} /></button></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><div className="inline-flex items-center rounded-xl border border-[#dce8df] bg-white"><button type="button" onClick={() => updateQuantity(item.id, -1)} className="grid size-9 place-items-center text-[#496b5e] transition hover:bg-[#f1f8f4]" aria-label={`${t("Remove one")} ${item.name}`}><Minus size={14} /></button><span className="min-w-8 text-center text-sm font-bold">{item.quantity}</span><button type="button" onClick={() => updateQuantity(item.id, 1)} className="grid size-9 place-items-center text-[#496b5e] transition hover:bg-[#f1f8f4]" aria-label={`${t("Add one")} ${item.name}`}><Plus size={14} /></button></div><strong className="text-sm text-[#087553]">{item.currency} {(item.unitPrice * item.quantity).toLocaleString()}</strong></div></div></article>)}</div> : <div className="rounded-2xl bg-[#f6faf7] p-6 text-center"><ShoppingBag size={24} className="mx-auto text-[#82a094]" /><p className="mt-2 text-sm font-bold">{t("Your order is empty")}</p><p className="mt-1 text-xs text-[#75877d]">{t("Return to the business page to add products.")}</p><Link to={`/b/${businessSlug}`} className="mt-3 inline-flex text-xs font-bold text-[#087553]">{t("Back to catalog")}</Link></div>}<div className="mt-5 border-t border-[#edf2ef] pt-5"><label htmlFor="order-note"><FieldLabel>{t("Delivery or pickup notes")}</FieldLabel></label><Textarea id="order-note" className="field w-full min-h-24 rounded-xl border-[#dce8df] bg-[#fcfdfc]" maxLength={2000} placeholder={t("For example: deliver to Kimironko, or I will pick up on Saturday.")} value={notes} onChange={(event) => setNotes(event.target.value)} /><p className="mt-2 text-[11px] leading-5 text-[#829188]">{t("Leave this blank if you want the business to ask you first.")}</p></div></Card> : <Card className="overflow-hidden rounded-[1.75rem] border-[#e0eae2] bg-white p-5 shadow-[0_18px_55px_rgba(23,70,49,.06)] sm:p-7"><StepHeading step={1} title={t("What can we help with?")} description={t("Pick the service you need. You can still add details on the next step.")} />{template?.services.length ? <div className={template.services.length === 1 ? "grid gap-3" : "grid gap-3 sm:grid-cols-2"}>{template.services.map((service) => { const active = selectedServiceId === service.id; return <button key={service.id} type="button" onClick={() => setSelectedServiceId(service.id)} aria-pressed={active} className={`group relative w-full overflow-hidden rounded-[1.3rem] border p-4 text-left transition ${active ? "border-[#087553] bg-[#f4fbf7] ring-1 ring-[#087553] shadow-[0_10px_30px_rgba(7,85,62,.08)]" : "border-[#dfeae3] bg-white hover:border-[#9bcebb] hover:shadow-[0_12px_30px_rgba(23,70,49,.07)]"}`}><span className="flex items-start gap-3.5 sm:gap-4">{service.imageUrl ? <img src={resolveAssetUrl(service.imageUrl)} alt="" className={`${template.services.length === 1 ? "size-20" : "size-16"} shrink-0 rounded-2xl object-cover shadow-sm`} /> : <span className={`${template.services.length === 1 ? "size-20" : "size-16"} grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#e8f6ee] to-[#f6f2e8] text-[#087553]`}><Store size={24} /></span>}<span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-3"><span className="min-w-0"><strong className={`block ${template.services.length === 1 ? "text-base sm:text-lg" : "text-sm"} leading-5 text-[#173c32]`}>{service.name}</strong>{service.description && <span className="mt-1 line-clamp-2 block text-[11px] leading-4 text-[#71857b]">{service.description}</span>}</span><span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition ${active ? "border-[#087553] bg-[#087553] text-white" : "border-[#bfd5c8] bg-white text-transparent group-hover:border-[#8dbfa7]"}`}><Check size={12} /></span></span><span className="mt-3 flex flex-wrap items-center gap-2">{service.startingPrice !== null && <span className="inline-flex items-center rounded-full bg-[#e9f6ee] px-2.5 py-1 text-[10px] font-extrabold text-[#087553]">{t("From")} {formatPrice(service.startingPrice, service.currency)}</span>}{(service.durationMinutes || service.duration) && <span className="inline-flex items-center gap-1 rounded-full bg-[#f1f4ef] px-2.5 py-1 text-[10px] font-bold text-[#64796e]"><Clock3 size={10} />{service.durationMinutes ? `${service.durationMinutes} ${t("min")}` : service.duration}</span>}{active && <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-[#087553]">{t("Selected")} <Check size={11} /></span>}</span></span></span></button>; })}</div> : serviceQuestion ? <div><label htmlFor={serviceQuestion.id}><FieldLabel required={serviceQuestion.required}>{displayQuestionLabel(serviceQuestion.label)}</FieldLabel></label>{questionControl(serviceQuestion)}</div> : <div className="rounded-2xl bg-[#f6faf7] p-5 text-sm leading-6 text-[#667b70]">{t("Tell the business what you need on the next step.")}</div>}</Card>)}

          {currentStep === 1 && (isOrder ? <Card className="overflow-hidden rounded-[1.75rem] border-[#e0eae2] bg-white p-5 shadow-[0_18px_55px_rgba(23,70,49,.06)] sm:p-7"><StepHeading step={2} title={t("How should we reach you?")} description={t("We only need a name and one contact method. The business will use it to confirm your order.")} /><div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><label htmlFor="customer-name"><FieldLabel required>{t("Your name")}</FieldLabel></label><Input id="customer-name" autoComplete="name" minLength={2} maxLength={120} required className="field w-full rounded-xl border-[#dce8df] bg-white shadow-sm transition placeholder:text-[#91a198] focus:border-[#0b9367] focus:ring-4 focus:ring-[#0b9367]/10" placeholder={t("Your full name")} value={customerName} onChange={(event) => setCustomerName(event.target.value)} /></div><div className="sm:col-span-2"><label htmlFor="customer-contact"><FieldLabel required>{contactMethod === "email" ? t("Email address") : contactMethod === "whatsapp" ? t("WhatsApp number") : t("Phone number")}</FieldLabel></label><Input id="customer-contact" required type={contactMethod === "email" ? "email" : "tel"} autoComplete={contactMethod === "email" ? "email" : "tel"} className="field w-full rounded-xl border-[#dce8df] bg-white shadow-sm transition placeholder:text-[#91a198] focus:border-[#0b9367] focus:ring-4 focus:ring-[#0b9367]/10" placeholder={contactMethod === "email" ? "you@example.com" : "+250 7xx xxx xxx"} value={contactValue} onChange={(event) => setContactValue(event.target.value)} /></div></div><div className="mt-4"><label><FieldLabel hideOptional>{t("Preferred contact method")}</FieldLabel></label><ContactMethods value={contactMethod} onChange={(method) => { setContactMethod(method); setContactValue(""); }} t={t} /></div><p className="mt-4 flex items-start gap-2 rounded-xl bg-[#eff8f2] px-3 py-3 text-[11px] leading-5 text-[#60796d]"><LockKeyhole size={14} className="mt-0.5 shrink-0 text-[#087553]" />{t("Your contact details are only shared with")} {businessName} {t("to respond to this order.")}</p></Card> : <Card className="overflow-hidden rounded-[1.75rem] border-[#e0eae2] bg-white p-5 shadow-[0_18px_55px_rgba(23,70,49,.06)] sm:p-7"><StepHeading step={2} title={t("Anything the business should know?")} description={t("Share the essentials below. Optional fields help the business prepare, but you can skip them.")} />{detailQuestions.length ? <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">{detailQuestions.map((question) => { const label = displayQuestionLabel(question.label); return <div key={question.id} className={question.type === "TEXTAREA" || question.type === "LOCATION" || question.type === "FILE" || question.type === "MULTI_SELECT" ? "sm:col-span-2" : ""}><label htmlFor={question.id}><FieldLabel required={question.required}>{label}</FieldLabel></label>{questionControl(question)}</div>; })}</div> : <div><label htmlFor="service-note"><FieldLabel>{t("Anything that would help?")}</FieldLabel></label><Textarea id="service-note" className="field w-full min-h-32 rounded-xl border-[#dce8df] bg-[#fcfdfc]" maxLength={2000} placeholder={t("For example: preferred time, size, or a question about the service.")} value={notes} onChange={(event) => setNotes(event.target.value)} /></div>}<p className="mt-5 flex items-center gap-2 text-[11px] text-[#829188]"><CheckCircle2 size={14} className="text-[#0b9367]" />{t("You can leave optional details blank and still send your request.")}</p></Card>)}

          {currentStep === 2 && (isOrder ? <Card className="overflow-hidden rounded-[1.75rem] border-[#e0eae2] bg-white p-5 shadow-[0_18px_55px_rgba(23,70,49,.06)] sm:p-7"><StepHeading step={3} title={t("Ready to send?")} description={t("Check your details. You can go back to change anything before sending.")} /><ReviewBlock t={t} rows={[{ label: t("Items"), value: `${orderItems.reduce((sum, item) => sum + item.quantity, 0)} ${t("items")}` }, { label: t("Estimated total"), value: `${orderItems[0]?.currency ?? "RWF"} ${orderTotal.toLocaleString()}` }, { label: t("Your name"), value: customerName || t("Not added") }, { label: contactMethodLabel, value: contactValue || t("Not added") }, ...(notes.trim() ? [{ label: t("Delivery or pickup notes"), value: notes.trim() }] : [])]} /><p className="mt-4 flex items-center gap-2 text-xs text-[#71847a]"><LockKeyhole size={14} className="text-[#087553]" />{t("No payment is needed to send this order request.")}</p></Card> : <Card className="overflow-hidden rounded-[1.75rem] border-[#e0eae2] bg-white p-5 shadow-[0_18px_55px_rgba(23,70,49,.06)] sm:p-7"><StepHeading step={3} title={t("Almost done")} description={t("Add your name and one contact method. The business will reply with the next step.")} /><div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><label htmlFor="customer-name"><FieldLabel required>{t("Your name")}</FieldLabel></label><Input id="customer-name" autoComplete="name" minLength={2} maxLength={120} required className="field w-full rounded-xl border-[#dce8df] bg-white shadow-sm transition placeholder:text-[#91a198] focus:border-[#0b9367] focus:ring-4 focus:ring-[#0b9367]/10" placeholder={t("Your full name")} value={customerName} onChange={(event) => setCustomerName(event.target.value)} /></div><div className="sm:col-span-2"><label htmlFor="customer-contact"><FieldLabel required>{contactMethod === "email" ? t("Email address") : contactMethod === "whatsapp" ? t("WhatsApp number") : t("Phone number")}</FieldLabel></label><Input id="customer-contact" required type={contactMethod === "email" ? "email" : "tel"} autoComplete={contactMethod === "email" ? "email" : "tel"} className="field w-full rounded-xl border-[#dce8df] bg-white shadow-sm transition placeholder:text-[#91a198] focus:border-[#0b9367] focus:ring-4 focus:ring-[#0b9367]/10" placeholder={contactMethod === "email" ? "you@example.com" : "+250 7xx xxx xxx"} value={contactValue} onChange={(event) => setContactValue(event.target.value)} /></div></div><div className="mt-4"><label><FieldLabel hideOptional>{t("Preferred contact method")}</FieldLabel></label><ContactMethods value={contactMethod} onChange={(method) => { setContactMethod(method); setContactValue(""); }} t={t} /></div><div className="mt-5 rounded-2xl border border-[#e5eee7] bg-[#fbfdfc] p-4"><p className="text-[11px] font-bold text-[#355c4c]">{t("Your request")}</p><ReviewBlock t={t} compact rows={[{ label: t("Service"), value: serviceSummary }, ...(detailSummary ? [{ label: t("Details"), value: detailSummary }] : []), { label: t("Contact"), value: contactSummary }]} /></div><p className="mt-4 flex items-start gap-2 rounded-xl bg-[#eff8f2] px-3 py-3 text-[11px] leading-5 text-[#60796d]"><LockKeyhole size={14} className="mt-0.5 shrink-0 text-[#087553]" />{t("Your contact details are only shared with")} {businessName} {t("to respond to this request.")}</p></Card>)}

          {error && <p role="alert" className="rounded-xl border border-[#f0d3c9] bg-[#fff5f1] px-4 py-3 text-sm font-medium text-[#a34932]">{error}</p>}
          <div className="mt-1 flex items-center justify-between gap-2 rounded-[1.2rem] border border-[#e0ebe3] bg-white/95 p-2.5 shadow-[0_10px_30px_rgba(23,70,49,.06)] backdrop-blur sm:gap-3 sm:p-3"><Button variant="secondary" type="button" disabled={currentStep === 0 || loading} onClick={() => { setError(""); setCurrentStep((step) => Math.max(step - 1, 0)); }} className={currentStep === 0 ? "invisible min-h-11" : "min-h-11 border border-[#dce8df] bg-white text-[#355c4c] hover:bg-[#f5faf6]"} icon={<ArrowLeft size={16} />}>{t("Back")}</Button><span className="text-[10px] font-semibold text-[#84958b]">{t("Step")} {currentStep + 1} {t("of")} {stepTitles.length}</span><Button type={currentStep === stepTitles.length - 1 ? "submit" : "button"} disabled={loading || uploadingId !== null || (isOrder && !orderItems.length)} onClick={currentStep === stepTitles.length - 1 ? undefined : nextStep} loading={loading} className="min-h-11 min-w-32 justify-center rounded-xl bg-[#087553] font-extrabold text-white hover:bg-[#066347]" icon={currentStep === stepTitles.length - 1 ? <Send size={15} /> : <ArrowRight size={16} />}>{currentStep === stepTitles.length - 1 ? (loading ? t("Sending…") : isOrder ? t("Send order request") : t("Send request")) : t("Continue")}</Button></div>
        </form>

                <aside className="space-y-4 lg:sticky lg:top-5">
          <Card className="overflow-hidden rounded-[1.75rem] border-0 bg-white p-0 shadow-[0_24px_70px_rgba(23,70,49,.1)]">
            <div className="relative overflow-hidden bg-[#073e32] px-5 pb-5 pt-6 text-white">
              <div aria-hidden="true" className="absolute -right-10 -top-12 size-36 rounded-full border border-white/10" />
              <div aria-hidden="true" className="absolute -right-2 top-2 size-20 rounded-full border border-white/10" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0"><p className="text-[9px] font-extrabold uppercase tracking-[.18em] text-emerald-200/80">{isOrder ? t("Order summary") : t("Request summary")}</p><h2 className="mt-1 truncate font-display text-lg font-extrabold">{businessName}</h2></div>
                <span className="shrink-0 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide text-emerald-100">{t("Draft")}</span>
              </div>
              <div className="relative mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.06] px-3 py-2 text-[10px] font-medium text-emerald-50/75"><ShieldCheck size={13} className="shrink-0 text-emerald-200" />{t("Only visible to you and")} {businessName}</div>
            </div>
            <div className="bg-white px-5">
              {isOrder ? <div className="py-4">
                <p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-[#8a9b92]">{t("Items")}</p>
                <div className="mt-2.5 space-y-2.5">{orderItems.map((item) => <div key={item.id} className="flex items-start justify-between gap-3 text-xs"><span className="min-w-0 truncate text-[#49695b]"><strong className="mr-1.5 text-[#173c32]">{item.quantity}×</strong>{item.name}</span><strong className="shrink-0 text-[#294b3e]">{item.currency} {(item.unitPrice * item.quantity).toLocaleString()}</strong></div>)}</div>
              </div> : <>
                <SummaryRow icon={<Store size={14} />} label={t("Service")} value={serviceSummary} />
                {selectedServiceRecord && <SummaryRow icon={<Clock3 size={14} />} label={t("Starting price")} value={formatPrice(selectedServiceRecord.startingPrice, selectedServiceRecord.currency)} />}
                <SummaryRow icon={<CalendarDays size={14} />} label={t("Preferred date")} value={dateQuestion ? String(answerFor(dateQuestion.id)) || t("Not selected") : t("To be confirmed")} />
                {locationQuestion && <SummaryRow icon={<MapPin size={14} />} label={t("Location")} value={locationAnswer ? (locationCoordinates ? t("Location pin added") : locationAnswer) : t("Not added")} />}
                {detailSummary && <SummaryRow icon={<Check size={14} />} label={t("Details")} value={detailSummary} />}
              </>}
              <SummaryRow icon={contactMethod === "whatsapp" ? <MessageCircle size={14} /> : contactMethod === "email" ? <Mail size={14} /> : <Phone size={14} />} label={t("Contact")} value={contactValue ? `${contactMethodLabel} · ${contactValue}` : t("Add on the contact step")} />
            </div>
            {isOrder && <div className="flex items-center justify-between border-t border-[#e7eee8] bg-[#f6faf7] px-5 py-4 text-sm"><span className="font-semibold text-[#718078]">{t("Estimated total")}</span><strong className="font-display text-lg text-[#087553]">{orderItems[0]?.currency ?? "RWF"} {orderTotal.toLocaleString()}</strong></div>}
            <div className="flex items-center gap-2 border-t border-[#e9efe9] bg-[#f7fbf8] px-5 py-3 text-[10px] font-medium text-[#71847a]"><LockKeyhole size={12} className="text-[#087553]" />{isOrder ? t("No payment required now") : t("Free to submit")} · {t("Your details stay private")}</div>
          </Card>

          <Card className="rounded-[1.75rem] border-[#e0eae2] bg-white p-5 shadow-[0_14px_40px_rgba(23,70,49,.045)]">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#edf6ef] text-[#087553]"><ShieldCheck size={18} /></span>
              <div><p className="text-sm font-extrabold text-[#24483c]">{t("What happens after you send?")}</p><p className="mt-1 text-[11px] leading-5 text-[#7b8c81]">{t("A simple, direct hand-off to the business.")}</p></div>
            </div>
            <ol className="relative mt-4 space-y-4 before:absolute before:bottom-2 before:left-[13px] before:top-2 before:w-px before:bg-[#e0ebe3]">
              {[{ title: isOrder ? t("The business checks stock and confirms the final price.") : t("The business reviews your request and confirms availability.") }, { title: t("They contact you using your preferred method.") }, { title: isOrder ? t("You agree on pickup or delivery.") : t("You agree on the time and next steps.") }].map((item, index) => <li key={item.title} className="relative flex gap-3"><span className="relative z-10 grid size-[27px] shrink-0 place-items-center rounded-full border border-[#d7e9de] bg-[#f3faf6] text-[10px] font-extrabold text-[#087553]">{index + 1}</span><p className="pt-0.5 text-[11px] leading-5 text-[#71847a]">{item.title}</p></li>)}
            </ol>
            {businessBrand?.whatsapp && <a href={`https://wa.me/${businessBrand.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="mt-5 flex items-center justify-between gap-2 rounded-xl border border-[#e0ebe3] bg-[#f8fbf8] px-3 py-2.5 text-[11px] font-bold text-[#355c4c] transition hover:border-[#a9cdb3] hover:bg-[#f1faf4]"><span className="inline-flex items-center gap-2"><MessageCircle size={13} className="text-[#087553]" />{t("Prefer to chat first?")}</span><span className="inline-flex items-center gap-1 text-[#087553]">{t("WhatsApp")} <ArrowRight size={12} /></span></a>}
          </Card>
        </aside>
      </div>
      <footer className="mt-8 border-t border-[#e2ece5] pt-5 text-center text-[10px] font-semibold text-[#8a9a91]">{t("Secure request · Your details are only shared with")} {businessName}.</footer>
    </main>
  </div>;
}

function ContactMethods({ value, onChange, t }: { value: ContactMethod; onChange: (method: ContactMethod) => void; t: (text: string) => string }) {
  const methods = [{ id: "whatsapp" as const, label: "WhatsApp", detail: t("Fast and convenient"), icon: <MessageCircle size={17} /> }, { id: "phone" as const, label: t("Phone"), detail: t("Direct call"), icon: <Phone size={17} /> }, { id: "email" as const, label: t("Email"), detail: t("Detailed messages"), icon: <Mail size={17} /> }];
  return <div className="grid gap-2 sm:grid-cols-3">{methods.map((method) => <button key={method.id} type="button" aria-pressed={value === method.id} onClick={() => onChange(method.id)} className={`relative flex min-h-[68px] items-center gap-3 rounded-xl border px-3 text-left transition ${value === method.id ? "border-[#0b9367] bg-[#eff9f2] text-[#087553] ring-1 ring-[#0b9367]/15" : "border-[#e0e9e2] bg-white text-[#60766b] hover:border-[#a9cdb3]"}`}><span className={`grid size-9 shrink-0 place-items-center rounded-xl ${value === method.id ? "bg-[#d9f0e0]" : "bg-[#f0f4f1]"}`}>{method.icon}</span><span><strong className="block text-xs">{method.label}</strong><span className="mt-0.5 block text-[10px] text-[#85948b]">{method.detail}</span></span>{value === method.id && <span className="absolute right-2.5 top-2.5 grid size-4 place-items-center rounded-full bg-[#087553] text-white"><Check size={10} /></span>}</button>)}</div>;
}

function ReviewBlock({ rows, t, compact }: { rows: Array<{ label: string; value: string }>; t: (text: string) => string; compact?: boolean }) {
  return <div className={`divide-y divide-[#eaf0eb] rounded-xl border border-[#e4ece6] px-4 ${compact ? "mt-2" : ""}`}>{rows.length ? rows.map((row) => <div key={row.label} className="flex items-start justify-between gap-4 py-3"><span className="text-xs text-[#73847a]">{row.label}</span><strong className="max-w-[62%] break-words text-right text-xs text-[#1d4538]">{row.value}</strong></div>) : <p className="py-3 text-xs text-[#73847a]">{t("Nothing added yet.")}</p>}</div>;
}
