import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, FileUp, LockKeyhole, Mail, MapPin, MessageCircle, Phone, ShieldCheck, Send, Store, UploadCloud, UserRound } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router";
import { businessService, requestService, resolveAssetUrl, uploadService } from "../services/api";
import { Brand, Button, ButtonLink, Card, Input, Label, Textarea } from "../components/ui";
import { LocationPicker, type Coordinates } from "../components/onboarding/LocationPicker";
import { LanguageSwitcher, useLanguage } from "../i18n";

type QuestionType = "TEXT" | "TEXTAREA" | "NUMBER" | "SELECT" | "MULTI_SELECT" | "DATE" | "TIME" | "FILE" | "LOCATION" | "PHONE" | "EMAIL";
type Answer = string | string[];
interface RequestTemplate {
  id: string;
  name: string;
  businessType: string;
  services: Array<{ id: string; name: string; description: string; startingPrice: number | string | null; currency: string; duration: string | null; imageUrl: string | null }>;
  products: Array<{ id: string; name: string; description: string; price: number | string; currency: string; imageUrl: string | null }>;
  questions: Array<{ id: string; label: string; type: QuestionType; required: boolean; options: string[] | null }>;
}
interface RequestConfirmation { requestNumber: string; status: string }
interface CustomerContact { customerName: string; customerEmail: string; customerPhone: string; customerWhatsapp: string }
interface OrderItem { id: string; name: string; quantity: number; unitPrice: number; currency: string }
interface BusinessBrand { name: string; logoUrl: string | null; coverImageUrl: string | null; category: string | null; city: string | null; country: string; tagline: string | null; address: string | null; phone: string | null; whatsapp: string | null; email: string | null; description: string | null }
type ContactMethod = "phone" | "whatsapp" | "email";

const formatPrice = (amount: number | string | null, currency: string) => amount === null ? "Price on request" : `${currency} ${Number(amount).toLocaleString()}`;

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return <span className="mb-2 block text-[13px] font-bold text-[#193c34]">{children}{required && <span className="ml-1 text-[#0b9367]">*</span>}</span>;
}

function SummaryRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3 py-3 text-xs"><span className="flex min-w-0 items-center gap-2 text-[#75867c]"><span className="shrink-0 text-[#087553]">{icon}</span><span className="truncate">{label}</span></span><strong className="max-w-[58%] truncate text-right font-bold text-[#294b3e]">{value}</strong></div>;
}

export default function RequestPage() {
  const { t } = useLanguage();
  const location = useLocation();
  const { businessSlug } = useParams();
  const routeState = location.state as { orderItems?: OrderItem[]; selectedService?: { id: string; name: string } } | null;
  const orderItems = routeState?.orderItems ?? [];
  const selectedService = routeState?.selectedService;
  const [template, setTemplate] = useState<RequestTemplate | null>(null);
  const [businessBrand, setBusinessBrand] = useState<BusinessBrand | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [templateError, setTemplateError] = useState("");
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [contact, setContact] = useState<CustomerContact>({ customerName: "", customerEmail: "", customerPhone: "", customerWhatsapp: "" });
  const [contactMethod, setContactMethod] = useState<ContactMethod>("whatsapp");
  const [currentStep, setCurrentStep] = useState(0);
  const [orderContactMethod, setOrderContactMethod] = useState<ContactMethod>("phone");
  const [orderContact, setOrderContact] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [confirmation, setConfirmation] = useState<RequestConfirmation | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!businessSlug || orderItems.length) { setLoadingTemplate(false); return; }
    let current = true;
    void requestService.getTemplate<RequestTemplate>(businessSlug)
      .then((loaded) => {
        if (!current) return;
        setTemplate(loaded);
        if (selectedService) {
          const service = loaded.services.find((entry) => entry.id === selectedService.id);
          const serviceQuestion = loaded.questions.find((entry) => entry.label.toLowerCase().includes("what service do you need"));
          if (service && serviceQuestion) setAnswers((existing) => ({ ...existing, [serviceQuestion.id]: service.name }));
        }
      })
      .catch((reason: unknown) => { if (current) setTemplateError(reason instanceof Error ? reason.message : "Could not load the booking form."); })
      .finally(() => { if (current) setLoadingTemplate(false); });
    return () => { current = false; };
  }, [businessSlug, selectedService?.id]);

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
  const serviceQuestion = template?.questions.find((entry) => entry.label.toLowerCase().includes("what service do you need"));
  const bookingSteps = [t("Service"), t("Details"), t("Contact"), t("Review")];
  const chosenServiceName = serviceQuestion ? String(answers[serviceQuestion.id] ?? "") || selectedService?.name || "" : selectedService?.name ?? "";
  const chosenService = template?.services.find((service) => service.name === chosenServiceName);
  const dateQuestion = template?.questions.find((entry) => entry.type === "DATE");
  const locationQuestion = template?.questions.find((entry) => entry.type === "LOCATION");
  const locationAnswer = locationQuestion ? String(answerFor(locationQuestion.id)) : "";
  const locationParts = locationAnswer.split(",").map((part) => Number(part.trim()));
  const locationCoordinates: Coordinates | null = locationParts.length === 2 && locationParts.every(Number.isFinite)
    ? { latitude: locationParts[0], longitude: locationParts[1] }
    : null;
  const orderTotal = useMemo(() => orderItems.reduce((total, item) => total + item.unitPrice * item.quantity, 0), [orderItems]);
  const requestType = orderItems.length ? "Product order inquiry" : chosenServiceName || template?.name || "Business inquiry";
  const selectedContact = contactMethod === "email" ? contact.customerEmail : contactMethod === "whatsapp" ? contact.customerWhatsapp : contact.customerPhone;
  const contactMethodLabel = contactMethod === "whatsapp" ? "WhatsApp" : contactMethod === "email" ? "Email" : "Phone";
  const locationSummary = locationAnswer ? (locationCoordinates ? "Location pin added" : locationAnswer) : "Not added";

  const continueToNextStep = () => {
    setError("");
    if (currentStep === 0 && !orderItems.length && serviceQuestion?.required && !chosenServiceName.trim()) {
      setError(`Please choose a service to continue.`);
      return;
    }
    if (currentStep === 1 && !orderItems.length) {
      const missing = template?.questions.find((question) => {
        if (!question.required || question.id === serviceQuestion?.id) return false;
        const value = answers[question.id];
        return !value || (Array.isArray(value) ? value.length === 0 : !value.trim());
      });
      if (missing) { setError(`Please complete “${missing.label}” to continue.`); return; }
    }
    if (currentStep === 2) {
      const validContact = orderItems.length
        ? orderContactMethod === "email" ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(orderContact.trim()) : orderContact.trim().length >= 7
        : contactMethod === "email"
          ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(selectedContact.trim())
          : selectedContact.replace(/\D/g, "").length >= 7;
      if (contact.customerName.trim().length < 2 || !validContact) {
        setError("Add your name and a valid contact so the business can get back to you.");
        return;
      }
    }
    setCurrentStep((step) => Math.min(step + 1, bookingSteps.length - 1));
  };

  useEffect(() => {
    if (currentStep > 0) document.getElementById("booking-request-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [currentStep]);

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
    if (!businessSlug || (!template && !orderItems.length) || loading) return;
    setError("");
    if (orderItems.length) {
      const validContact = orderContactMethod === "email" ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(orderContact.trim()) : orderContact.trim().length >= 7;
      if (contact.customerName.trim().length < 2 || !validContact) { setError("Add your name and a valid contact so the business can get back to you."); return; }
    } else {
      const missing = template!.questions.find((question) => {
        if (!question.required) return false;
        const value = answers[question.id];
        return !value || (Array.isArray(value) ? value.length === 0 : !value.trim());
      });
      if (missing) { setError(`Please complete “${missing.label}” to continue.`); return; }
      const validContact = contactMethod === "email"
        ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(selectedContact.trim())
        : selectedContact.replace(/\D/g, "").length >= 7;
      if (contact.customerName.trim().length < 2 || !validContact) {
        setError("Add your name and at least one way for the business to reach you."); return;
      }
    }
    setLoading(true);
    try {
      const descriptionQuestion = template?.questions.find((entry) => entry.type === "TEXTAREA");
      const result = await requestService.submit<RequestConfirmation>(businessSlug, {
        ...(orderItems.length ? {
          customerName: contact.customerName,
          customerPhone: orderContactMethod === "phone" ? orderContact : "",
          customerWhatsapp: orderContactMethod === "whatsapp" ? orderContact : "",
          customerEmail: orderContactMethod === "email" ? orderContact : "",
          requestType: "Product order",
          orderItems: orderItems.map((item) => ({ productId: item.id, quantity: item.quantity })),
          orderNote,
        } : {
          ...contact,
          requestType,
          description: descriptionQuestion ? String(answers[descriptionQuestion.id] ?? "") : "",
        }),
        location: locationQuestion ? String(answers[locationQuestion.id] ?? "") : "",
        preferredDate: dateQuestion ? answers[dateQuestion.id] || undefined : undefined,
        answers,
      });
      setConfirmation(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your request could not be sent. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loadingTemplate) return <main className="grid min-h-screen place-items-center bg-[#f3f8f5] p-5"><div className="w-full max-w-lg animate-pulse rounded-[2rem] border border-[#e0ebe4] bg-white p-8"><div className="h-4 w-32 rounded bg-[#e7f0ea]"/><div className="mt-5 h-9 w-3/4 rounded bg-[#e7f0ea]"/><div className="mt-8 h-14 rounded-2xl bg-[#f0f5f1]"/><div className="mt-3 h-14 rounded-2xl bg-[#f0f5f1]"/></div></main>;
  if (!template && !orderItems.length) return <main className="grid min-h-screen place-items-center bg-[#f3f8f5] p-5"><Card className="max-w-lg p-8 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#fff1eb] text-[#bd573b]"><Store size={22}/></span><h1 className="mt-4 font-display text-2xl font-bold text-[#183c33]">Booking is unavailable</h1><p className="mt-2 text-sm leading-6 text-[#708078]">{templateError || "This business hasn't set up its booking form yet."}</p><ButtonLink to={`/b/${businessSlug}`} className="mt-6">Return to business</ButtonLink></Card></main>;

  const businessName = businessBrand?.name || template?.name || businessSlug || "Business";
  if (confirmation) return <main className="grid min-h-screen place-items-center bg-[radial-gradient(ellipse_at_top,#e3f4e9,#f3f8f5_55%)] p-5"><Card className="w-full max-w-lg overflow-hidden border-[#dcebe1] p-0 text-center shadow-[0_30px_100px_rgba(10,64,43,.12)]"><div className="bg-[#075b43] px-7 pb-8 pt-10 text-white"><span className="mx-auto grid size-[68px] place-items-center rounded-full border border-white/20 bg-white/10"><Check size={32}/></span><p className="mt-5 text-[10px] font-extrabold uppercase tracking-[.2em] text-emerald-200">Request received</p><h1 className="mt-2 font-display text-3xl font-extrabold">You’re on your way.</h1><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-emerald-50/80">{businessName} has your request and will be in touch to confirm the details.</p></div><div className="p-6 sm:p-8"><div className="rounded-2xl border border-[#e5eee7] bg-[#f8fbf8] p-4 text-left"><p className="text-xs font-semibold text-[#829087]">REQUEST REFERENCE</p><p className="mt-1 font-display text-xl font-bold text-[#143d32]">#{confirmation.requestNumber}</p><div className="mt-4 flex items-center justify-between border-t border-[#e4ece5] pt-3 text-sm"><span className="text-[#718078]">{requestType}</span><span className="rounded-full bg-[#e3f5e9] px-2.5 py-1 text-xs font-bold capitalize text-[#087553]">{confirmation.status.toLowerCase()}</span></div></div><ButtonLink to={`/b/${businessSlug}`} className="mt-5 w-full">Back to {businessName}</ButtonLink></div></Card></main>;

  const updateContact = (field: keyof CustomerContact, value: string) => setContact((current) => ({ ...current, [field]: value }));
  const questionControl = (question: RequestTemplate["questions"][number]) => {
    const value = answerFor(question.id);
    if (question.id === serviceQuestion?.id && (template?.services.length || template?.products.length)) return <select required={question.required} className="min-h-12 w-full rounded-xl border border-[#dce8df] bg-white px-3.5 text-sm text-[#24463a] outline-none transition focus:border-[#0b9367] focus:ring-4 focus:ring-[#0b9367]/10" value={String(value)} onChange={(event) => setAnswer(question.id, event.target.value)}><option value="">Choose a service</option>{template.services.map((service) => <option key={service.id} value={service.name}>{service.name}{service.startingPrice !== null ? ` · From ${formatPrice(service.startingPrice, service.currency)}` : ""}</option>)}{template.products.map((product) => <option key={product.id} value={product.name}>{product.name} · {formatPrice(product.price, product.currency)}</option>)}{(question.options ?? []).filter((option) => !template.services.some((service) => service.name === option) && !template.products.some((product) => product.name === option)).map((option) => <option key={option}>{option}</option>)}</select>;
    switch (question.type) {
      case "SELECT": return <select required={question.required} className="min-h-12 w-full rounded-xl border border-[#dce8df] bg-white px-3.5 text-sm text-[#24463a] outline-none transition focus:border-[#0b9367] focus:ring-4 focus:ring-[#0b9367]/10" value={String(value)} onChange={(event) => setAnswer(question.id, event.target.value)}><option value="">Choose one</option>{(question.options ?? []).map((option) => <option key={option}>{option}</option>)}</select>;
      case "MULTI_SELECT": return <div className="flex flex-wrap gap-2">{(question.options ?? []).map((option) => { const active = Array.isArray(value) && value.includes(option); return <button type="button" aria-pressed={active} key={option} onClick={() => { const current = Array.isArray(value) ? value : []; setAnswer(question.id, active ? current.filter((entry) => entry !== option) : [...current, option]); }} className={`rounded-full border px-3.5 py-2 text-xs font-bold transition ${active ? "border-[#0b9367] bg-[#e9f7ee] text-[#087553]" : "border-[#dce8df] bg-white text-[#62776b] hover:border-[#9bc8aa]"}`}>{active && <Check size={12} className="mr-1 inline"/>}{option}</button>; })}</div>;
      case "TEXTAREA": return <Textarea id={question.id} required={question.required} maxLength={3000} className="min-h-28 rounded-xl border-[#dce8df] bg-white" placeholder="Share any details that will help us make this right…" value={String(value)} onChange={(event) => setAnswer(question.id, event.target.value)} />;
      case "FILE": return <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#cbded0] bg-[#fbfdfb] px-4 text-sm font-semibold text-[#557165] transition hover:border-[#0b9367] hover:bg-[#f2faf5]"><span className="grid size-9 place-items-center rounded-xl bg-[#e8f5ec] text-[#087553]">{uploadingId === question.id ? <UploadCloud size={17} className="animate-bounce"/> : <FileUp size={17}/>}</span><span>{uploadingId === question.id ? "Uploading your file…" : value ? "Photo attached — choose another" : "Add a photo"}</span><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadFile(question.id, file); }}/></label>;
      case "LOCATION": return <div className="space-y-3"><Input id={`${question.id}-address`} required={question.required && !locationCoordinates} autoComplete="street-address" className="rounded-xl border-[#dce8df]" placeholder="Street, neighbourhood, or landmark" value={locationCoordinates ? "" : locationAnswer} onChange={(event) => setAnswer(question.id, event.target.value)}/><details className="group rounded-xl border border-[#e4ece5] bg-[#fafcfa] p-3"><summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-bold text-[#547267]"><MapPin size={14}/> Pin a precise location <span className="ml-auto text-[#83958b] group-open:rotate-180">⌄</span></summary><div className="mt-3 overflow-hidden rounded-xl"><LocationPicker coordinates={locationCoordinates} title="Choose a location" description="Tap the map to place a pin." mapHeight={240} onSelect={(coordinates) => setAnswer(question.id, `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`)} onGeolocationError={(message) => setError(message)}/></div></details></div>;
      default: return <Input id={question.id} required={question.required} type={question.type === "NUMBER" ? "number" : question.type === "DATE" ? "date" : question.type === "TIME" ? "time" : question.type === "PHONE" ? "tel" : question.type === "EMAIL" ? "email" : "text"} min={question.type === "NUMBER" ? 0 : undefined} autoComplete={question.type === "PHONE" ? "tel" : question.type === "EMAIL" ? "email" : undefined} className="rounded-xl border-[#dce8df]" placeholder={question.type === "DATE" ? "Choose a preferred date" : question.type === "TIME" ? "Choose a preferred time" : question.type === "NUMBER" ? "Enter a number" : "Type your answer"} value={String(value)} onChange={(event) => setAnswer(question.id, event.target.value)} />;
    }
  };

  return <div className="request-page min-h-screen bg-[#f3f7f5] text-[#173c32]">
    <header className="border-b border-[#0c5945] bg-[#003c30] text-white shadow-md"><div className="mx-auto flex h-[68px] max-w-[1260px] items-center justify-between px-4 sm:px-7"><Brand light/><div className="flex items-center gap-2"><LanguageSwitcher compact/><Link to={`/b/${businessSlug}`} className="inline-flex items-center gap-2 rounded-full border border-white/35 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10"><ArrowLeft size={15}/> <span className="hidden sm:inline">{t("Back to business")}</span><span className="sm:hidden">{t("Back")}</span></Link></div></div></header>
    <main className="mx-auto max-w-[1260px] px-4 pb-12 pt-5 sm:px-7 sm:pt-7">
      <nav id="booking-progress" aria-label={t("Booking progress")} className="mb-6 grid grid-cols-4 gap-2 sm:mb-7 sm:gap-4">{bookingSteps.map((title,index)=><button type="button" key={title} aria-current={currentStep===index?"step":undefined} onClick={()=>{if(index<currentStep){setError("");setCurrentStep(index);}}} className={`flex min-w-0 items-center gap-2 text-left sm:gap-3 ${index<currentStep?"cursor-pointer":"cursor-default"}`}><span className={`grid size-8 shrink-0 place-items-center rounded-full border-2 text-xs font-extrabold shadow-sm sm:size-9 ${index===currentStep?"border-[#087553] bg-[#087553] text-white":index<currentStep?"border-[#087553] bg-[#e7f5eb] text-[#087553]":"border-[#d8e7df] bg-white text-[#84958c]"}`}>{index<currentStep?<Check size={14}/>:index+1}</span><span className="min-w-0"><strong className={`block truncate text-[11px] sm:text-xs ${index===currentStep?"text-[#075b43]":"text-[#657a70]"}`}>{title}</strong><small className="hidden truncate text-[9px] text-[#84958c] sm:block">{[t("Select what you need"),t("Tell us about your request"),t("Choose how to reach you"),t("Confirm and send")][index]}</small></span>{index<bookingSteps.length-1&&<span className={`hidden h-px min-w-3 flex-1 sm:block ${index<currentStep?"bg-[#0b9367]":"bg-[#d8e5dd]"}`}/>}</button>)}</nav>
      {!orderItems.length && <Card className="mb-6 overflow-hidden border-[#dce9df] p-0 shadow-[0_16px_45px_rgba(23,70,49,.055)]"><div className="relative h-24 overflow-hidden sm:h-32" style={{ backgroundColor: "#075b43" }}>{businessBrand?.coverImageUrl && <img src={resolveAssetUrl(businessBrand.coverImageUrl)} alt="" className="absolute inset-0 size-full object-cover" style={{ opacity: 0.55 }}/>}<div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(0,45,35,.96) 0%, rgba(0,67,48,.78) 58%, rgba(4,97,67,.25) 100%)" }}/><div className="absolute bottom-4 left-5 flex items-end gap-3 sm:left-7"><span className="grid size-[68px] place-items-center overflow-hidden rounded-2xl border-2 border-white text-white shadow-lg sm:size-[76px]" style={{ backgroundColor: "#063c31" }}>{businessBrand?.logoUrl ? <img src={resolveAssetUrl(businessBrand.logoUrl)} alt={`${businessName} logo`} className="size-full object-cover"/> : <Store size={27}/>}</span><span className="pb-1 text-white"><span className="block text-[10px] font-bold uppercase tracking-[.15em] text-emerald-200">Booking with</span><span className="mt-0.5 block font-display text-xl font-extrabold sm:text-2xl">{businessName}</span></span></div><span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/15 px-2.5 py-1.5 text-[10px] font-bold text-white backdrop-blur"><ShieldCheck size={13}/> Secure request</span></div><div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 sm:px-7"><div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#708278]">{businessBrand?.category && <span className="font-bold text-[#355c4c]">{businessBrand.category}</span>}{(businessBrand?.city || businessBrand?.country) && <><span className="hidden text-[#bac8be] sm:inline">·</span><span>{[businessBrand.city, businessBrand.country].filter(Boolean).join(", ")}</span></>}</div>{businessBrand?.tagline && <p className="text-xs font-medium text-[#708278]">{businessBrand.tagline}</p>}</div></Card>}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_330px] lg:gap-5">
        <form id="booking-request-form" onSubmit={(event)=>void submit(event)} className="min-w-0">
          {currentStep===0 && (orderItems.length ? <Card className="border-[#e0eae2] p-5 shadow-[0_8px_28px_rgba(23,70,49,.05)]"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#e9f6ed] text-[#087553]"><Store size={19}/></span><div><h2 className="font-display font-extrabold">{t("Your basket")}</h2><p className="text-xs text-[#7a8b80]">{orderItems.reduce((sum,item)=>sum+item.quantity,0)} {t("items")}</p></div></div><ul className="mt-3 divide-y divide-[#edf1ed]">{orderItems.map(item=><li key={item.id} className="flex justify-between gap-3 py-3 text-sm"><span>{item.name} × {item.quantity}</span><strong>{item.currency} {(item.quantity*item.unitPrice).toLocaleString()}</strong></li>)}</ul><div className="flex justify-between border-t pt-3 text-sm"><span>{t("Estimated total")}</span><strong className="text-[#087553]">{orderItems[0]?.currency} {orderTotal.toLocaleString()}</strong></div></Card> : <div className="space-y-4"><Card className="overflow-hidden border-[#cfe5d5] bg-[linear-gradient(115deg,#e7f7ec,#f8fcf9)] p-4 shadow-[0_8px_28px_rgba(23,70,49,.05)] sm:p-5"><div className="flex items-center gap-4">{chosenService?.imageUrl?<img src={resolveAssetUrl(chosenService.imageUrl)} alt={chosenService.name} className="size-20 shrink-0 rounded-2xl object-cover"/>:<span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#087553] text-white"><Store size={20}/></span>}<div className="min-w-0"><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-[#56816b]">{t("Step 1 · Choose a service")}</p><h2 className="mt-1 font-display text-xl font-extrabold text-[#123d32]">{chosenServiceName||t("What can we help with?")}</h2>{chosenService?.description&&<p className="mt-1 line-clamp-2 text-xs leading-5 text-[#62786c]">{chosenService.description}</p>}{chosenService&&<p className="mt-2 text-xs font-bold text-[#087553]">{t("From")} {formatPrice(chosenService.startingPrice,chosenService.currency)}{chosenService.duration?` · ${chosenService.duration}`:""}</p>}</div></div></Card>{serviceQuestion&&<Card className="border-[#e0eae2] p-5 shadow-[0_8px_28px_rgba(23,70,49,.05)]"><label htmlFor={serviceQuestion.id}><FieldLabel required={serviceQuestion.required}>{serviceQuestion.label}</FieldLabel></label>{questionControl(serviceQuestion)}</Card>}</div>)}
          {currentStep===1 && (orderItems.length ? <Card className="border-[#e0eae2] p-5 shadow-[0_8px_28px_rgba(23,70,49,.05)]"><div className="mb-4"><p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#07865c]">{t("Step 2 · A little more detail")}</p><h2 className="mt-1 font-display text-lg font-extrabold">{t("Anything we should know?")}</h2><p className="mt-1 text-xs text-[#75877d]">{t("Share preferences or delivery details so")} {businessName} {t("can help.")}</p></div><label htmlFor="order-note"><FieldLabel>{t("Note for the business (optional)")}</FieldLabel></label><Textarea id="order-note" className="min-h-32 rounded-xl border-[#dce8df]" maxLength={2000} placeholder={t("Add any helpful details here…")} value={orderNote} onChange={event=>setOrderNote(event.target.value)}/></Card> : <Card className="border-[#e0eae2] p-5 shadow-[0_8px_28px_rgba(23,70,49,.05)] sm:p-6"><div className="mb-5"><p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#07865c]">{t("Step 2 · Project details")}</p><h2 className="mt-1 font-display text-lg font-extrabold">{t("Tell us what you need")}</h2><p className="mt-1 text-xs leading-5 text-[#75877d]">{t("A few details help")} {businessName} {t("prepare the right response.")}</p></div><div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">{template!.questions.filter(question=>question.id!==serviceQuestion?.id).map(question=><div key={question.id} className={question.type==="TEXTAREA"||question.type==="LOCATION"||question.type==="FILE"||question.type==="MULTI_SELECT"?"sm:col-span-2":""}><label htmlFor={question.id}><FieldLabel required={question.required}>{question.label}</FieldLabel></label>{questionControl(question)}</div>)}</div></Card>)}
          {currentStep===2 && <Card className="border-[#e0eae2] p-5 shadow-[0_8px_28px_rgba(23,70,49,.05)] sm:p-6"><div className="mb-5"><p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#07865c]">{t("Step 3 · Contact")}</p><h2 className="mt-1 font-display text-lg font-extrabold">{t("How should we reach you?")}</h2><p className="mt-1 text-xs leading-5 text-[#75877d]">{t("Choose the easiest way for")} {businessName} {t("to get back to you.")}</p></div><div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="customer-name"><FieldLabel required>{t("Your name")}</FieldLabel></label><Input id="customer-name" autoComplete="name" minLength={2} maxLength={120} required className="rounded-xl border-[#dce8df]" placeholder={t("Your full name")} value={contact.customerName} onChange={event=>updateContact("customerName",event.target.value)}/></div>{orderItems.length?<div><label htmlFor="order-contact"><FieldLabel required>{t("Best contact")}</FieldLabel></label><div className="flex gap-2"><select aria-label={t("Contact method")} value={orderContactMethod} onChange={event=>{setOrderContactMethod(event.target.value as ContactMethod);setOrderContact("");}} className="w-[7.5rem] shrink-0 rounded-xl border border-[#dce8df] bg-white px-2 text-xs font-semibold"><option value="phone">Phone</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option></select><Input id="order-contact" type={orderContactMethod==="email"?"email":"tel"} required className="min-w-0 rounded-xl border-[#dce8df]" placeholder={orderContactMethod==="email"?"you@example.com":"+250 7xx xxx xxx"} value={orderContact} onChange={event=>setOrderContact(event.target.value)}/></div></div>:<div className="sm:col-span-2"><fieldset><legend className="mb-2 text-[13px] font-bold text-[#193c34]">{t("Preferred contact method")} <span className="text-[#0b9367]">*</span></legend><div className="grid gap-2 sm:grid-cols-3">{([{id:"whatsapp",label:"WhatsApp",detail:"Fast and convenient",icon:<MessageCircle size={17}/>},{id:"phone",label:"Phone",detail:"Direct call",icon:<Phone size={17}/>},{id:"email",label:"Email",detail:"Detailed messages",icon:<Mail size={17}/>} ] as const).map(method=><button key={method.id} type="button" aria-pressed={contactMethod===method.id} onClick={()=>setContactMethod(method.id)} className={`relative flex min-h-[68px] items-center gap-3 rounded-xl border px-3 text-left transition ${contactMethod===method.id?"border-[#0b9367] bg-[#eff9f2] text-[#087553] ring-1 ring-[#0b9367]/15":"border-[#e0e9e2] bg-white text-[#60766b] hover:border-[#a9cdb3]"}`}><span className={`grid size-9 shrink-0 place-items-center rounded-xl ${contactMethod===method.id?"bg-[#d9f0e0]":"bg-[#f0f4f1]"}`}>{method.icon}</span><span><strong className="block text-xs">{method.label}</strong><span className="mt-0.5 block text-[10px] text-[#85948b]">{method.detail}</span></span>{contactMethod===method.id&&<span className="absolute right-2.5 top-2.5 grid size-4 place-items-center rounded-full bg-[#087553] text-white"><Check size={10}/></span>}</button>)}</div></fieldset><div className="mt-4 max-w-md"><label htmlFor="selected-contact"><FieldLabel required>{contactMethod==="email"?"Email address":contactMethod==="whatsapp"?"WhatsApp number":"Phone number"}</FieldLabel></label><Input id="selected-contact" required type={contactMethod==="email"?"email":"tel"} autoComplete={contactMethod==="email"?"email":"tel"} className="rounded-xl border-[#dce8df]" placeholder={contactMethod==="email"?"you@example.com":"+250 7xx xxx xxx"} value={selectedContact} onChange={event=>updateContact(contactMethod==="email"?"customerEmail":contactMethod==="whatsapp"?"customerWhatsapp":"customerPhone",event.target.value)}/></div></div>}</div><p className="mt-5 flex items-start gap-2 rounded-xl bg-[#eff8f2] px-3 py-3 text-[11px] leading-5 text-[#60796d]"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#087553]"/>{t("Your contact details will only be used to respond to this request.")}</p></Card>}
          {currentStep===3 && <Card className="border-[#e0eae2] p-5 shadow-[0_8px_28px_rgba(23,70,49,.05)] sm:p-6"><div className="mb-5"><p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#07865c]">{t("Step 4 · Final check")}</p><h2 className="mt-1 font-display text-lg font-extrabold">{t("Review your request")}</h2><p className="mt-1 text-xs leading-5 text-[#75877d]">{t("Everything look right? You can go back to make changes before sending.")}</p></div><div className="divide-y divide-[#eaf0eb] rounded-xl border border-[#e4ece6] px-4">{!orderItems.length&&<div className="flex items-start justify-between gap-4 py-3"><span className="text-xs text-[#73847a]">Service</span><strong className="text-right text-sm text-[#1d4538]">{chosenServiceName||"Not selected"}</strong></div>}{template?.questions.filter(question=>question.id!==serviceQuestion?.id&&answers[question.id]).map(question=><div key={question.id} className="flex items-start justify-between gap-4 py-3"><span className="text-xs text-[#73847a]">{question.label}</span><strong className="max-w-[60%] text-right text-xs text-[#1d4538]">{Array.isArray(answers[question.id])?(answers[question.id] as string[]).join(", "):String(answers[question.id])}</strong></div>)}{orderItems.map(item=><div key={item.id} className="flex justify-between gap-4 py-3 text-xs"><span>{item.name} × {item.quantity}</span><strong>{item.currency} {(item.quantity*item.unitPrice).toLocaleString()}</strong></div>)}<div className="flex items-start justify-between gap-4 py-3"><span className="text-xs text-[#73847a]">Your name</span><strong className="text-right text-xs text-[#1d4538]">{contact.customerName||"Not added"}</strong></div><div className="flex items-start justify-between gap-4 py-3"><span className="text-xs text-[#73847a]">Contact · {orderItems.length?orderContactMethod:contactMethodLabel}</span><strong className="text-right text-xs text-[#1d4538]">{orderItems.length?orderContact||"Not added":selectedContact||"Not added"}</strong></div></div><p className="mt-4 flex items-center gap-2 text-xs text-[#71847a]"><LockKeyhole size={14} className="text-[#087553]"/>{t("No payment is needed to send this request.")}</p></Card>}
          {error&&<p role="alert" className="mt-4 rounded-xl border border-[#f0d3c9] bg-[#fff5f1] px-4 py-3 text-sm font-medium text-[#a34932]">{error}</p>}
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#e4ece6] pt-4"><Button variant="secondary" type="button" disabled={currentStep===0||loading} onClick={()=>{setError("");setCurrentStep(step=>Math.max(step-1,0));}} className={currentStep===0?"invisible min-h-11":"min-h-11 border border-[#dce8df] bg-white text-[#355c4c] hover:bg-[#f5faf6]"} icon={<ArrowLeft size={16}/>}>{t("Back")}</Button><span className="text-[10px] font-semibold text-[#84958b]">{t("Step")} {currentStep+1} {t("of")} {bookingSteps.length}</span><Button type={currentStep===3?"submit":"button"} disabled={loading||uploadingId!==null} onClick={currentStep===3?undefined:continueToNextStep} className="lg:hidden min-h-11 min-w-32 justify-center rounded-xl bg-[#087553] font-extrabold text-white hover:bg-[#066347]" icon={currentStep===3?<Send size={15}/>:<ArrowRight size={16}/>}>{currentStep===3?(loading?t("Sending…"):t("Send request")):t("Continue")}</Button></div>
        </form>
        <aside className="space-y-4 lg:sticky lg:top-5"><Card className="overflow-hidden border-[#dce9df] p-0 shadow-[0_18px_55px_rgba(23,70,49,.07)]"><div className="relative h-32 overflow-hidden" style={{backgroundColor:"#075b43"}}>{businessBrand?.coverImageUrl && <img src={resolveAssetUrl(businessBrand.coverImageUrl)} alt="" className="absolute inset-0 size-full object-cover" style={{opacity:.5}}/>}<div className="absolute inset-0" style={{background:"linear-gradient(90deg,rgba(0,45,35,.96),rgba(0,67,48,.65))"}}/><div className="absolute inset-x-4 bottom-4 flex items-center gap-3 text-white"><span className="grid size-12 place-items-center overflow-hidden rounded-xl border border-white/50" style={{backgroundColor:"#063c31"}}>{businessBrand?.logoUrl ? <img src={resolveAssetUrl(businessBrand.logoUrl)} alt={`${businessName} logo`} className="size-full object-cover"/> : <Store size={19}/>}</span><span className="min-w-0"><span className="block text-[9px] font-bold uppercase tracking-[.15em] text-emerald-200">{t("Booking summary")}</span><span className="mt-0.5 block truncate font-display text-lg font-extrabold">{businessName}</span></span><ShieldCheck className="ml-auto shrink-0 text-emerald-200" size={17}/></div></div><div className="divide-y divide-[#edf1ed] px-4"><SummaryRow icon={<CalendarDays size={14}/>} label="Service" value={chosenServiceName || orderItems.map((item) => `${item.name} × ${item.quantity}`).join(", ") || "Choose a service"}/>{chosenService && <SummaryRow icon={<Store size={14}/>} label="Starting price" value={formatPrice(chosenService.startingPrice, chosenService.currency)}/>}<SummaryRow icon={<Clock3 size={14}/>} label="Preferred date" value={dateQuestion ? String(answerFor(dateQuestion.id)) || "Not selected" : "To be confirmed"}/>{locationQuestion && <SummaryRow icon={<MapPin size={14}/>} label="Location" value={locationSummary}/>}<SummaryRow icon={contactMethod === "whatsapp" ? <MessageCircle size={14}/> : contactMethod === "email" ? <Mail size={14}/> : <Phone size={14}/>} label="Contact method" value={orderItems.length ? orderContactMethod : contactMethodLabel}/>{template?.questions.filter((question) => answers[question.id] && question.id !== serviceQuestion?.id && question.type !== "FILE").map((question) => <SummaryRow key={question.id} icon={<Check size={14}/>} label={question.label} value={Array.isArray(answers[question.id]) ? (answers[question.id] as string[]).join(", ") : String(answers[question.id])}/>)}</div>{orderItems.length > 0 && <div className="flex justify-between border-t border-[#e7eee8] bg-[#f8fbf8] px-4 py-3 text-sm"><span className="text-[#718078]">Estimated total</span><strong className="text-[#087553]">{orderItems[0]?.currency} {orderTotal.toLocaleString()}</strong></div>}<div className="flex items-center gap-2 border-t border-[#e9efe9] bg-[#f7fbf8] px-4 py-3 text-[10px] font-medium text-[#71847a]"><LockKeyhole size={12} className="text-[#087553]"/> Free to submit · No payment required</div><div className="hidden border-t border-[#e9efe9] p-4 lg:block"><Button type={currentStep===3?"submit":"button"} form={currentStep===3?"booking-request-form":undefined} onClick={currentStep<3?continueToNextStep:undefined} loading={loading} disabled={loading || uploadingId !== null} className="min-h-12 w-full justify-center rounded-xl bg-[#087553] text-sm font-extrabold shadow-lg shadow-[#075b43]/15 hover:bg-[#066347]" icon={currentStep<3?<ArrowRight size={16}/>:!loading?<Send size={16}/>:undefined}>{currentStep<3?"Continue":loading?"Sending your request…":orderItems.length?"Send order request":"Send booking request"}</Button><p className="mt-2 text-center text-[10px] text-[#788a80]">No payment needed to send your request.</p></div></Card>

          <Card className="border-[#e0eae2] bg-white/80 p-4 shadow-[0_12px_35px_rgba(23,70,49,.035)]"><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#edf6ef] text-[#087553]"><ShieldCheck size={17}/></span><div><p className="text-xs font-bold text-[#24483c]">{t("Your information stays private")}</p><p className="mt-1 text-[11px] leading-5 text-[#7b8c81]">We only share your answers with {businessName} so they can respond to your request.</p></div></div></Card>
        </aside>
      </div>
      <footer className="bg-[#003c30] text-white"><div className="mx-auto flex max-w-[1260px] flex-wrap items-center justify-between gap-4 px-4 py-5 text-[10px] font-semibold sm:px-7"><span>e-businessrw · Discover · Connect · Grow</span><span className="text-white/70">Secure request</span><span className="text-white/60">© {new Date().getFullYear()} e-businessrw</span></div></footer>
    </main>
  </div>;
}
