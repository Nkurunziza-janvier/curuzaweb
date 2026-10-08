import { ArrowLeft, ArrowRight, Check, MapPin, Paperclip, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { business } from "../data/mockData";
import { Badge, Brand, Button, ButtonLink, Card, Input, Label, Select, Textarea } from "../components/ui";

export default function RequestPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const question = business.requestQuestions[step];
  const setValue = (value: string) => setAnswers({ ...answers, [question.id]: value });
  const submit = () => { setLoading(true); window.setTimeout(() => { setLoading(false); setSent(true); }, 900); };

  if (sent) return <div className="grid min-h-screen place-items-center bg-cream p-4"><Card className="w-full max-w-xl p-7 text-center shadow-float sm:p-10"><span className="mx-auto grid size-16 place-items-center rounded-full bg-success-soft text-success"><Check size={30} /></span><Badge tone="warning">Waiting for quote</Badge><h1 className="mt-4 font-display text-3xl font-bold">Request sent.</h1><p className="mx-auto mt-3 max-w-md leading-relaxed text-muted">Afrinaija Pots has everything needed to prepare your catering quote. You’ll receive an update on WhatsApp.</p><div className="mt-7 rounded-2xl bg-[#f7f6f2] p-5 text-left"><div className="flex justify-between"><span className="text-sm text-muted">Request number</span><strong>#1053</strong></div><div className="mt-3 flex justify-between"><span className="text-sm text-muted">Service</span><strong>{answers.event || "Catering"}</strong></div><div className="mt-3 flex justify-between"><span className="text-sm text-muted">Status</span><strong className="text-warning">Waiting for quote</strong></div></div><ButtonLink to="/b/afrinai-ja" className="mt-7 w-full">Back to business page</ButtonLink></Card></div>;

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-line bg-white"><div className="shell flex h-16 items-center justify-between"><Brand /><Link to="/b/afrinai-ja" className="text-sm font-semibold text-muted hover:text-ink">Save & exit</Link></div></header>
      <main className="shell grid gap-10 py-8 lg:grid-cols-[1fr_20rem] lg:py-14">
        <section>
          <div className="mb-10">
            <div className="flex items-center justify-between text-xs font-semibold text-muted"><span>Request catering quote</span><span>Step {step + 1} of {business.requestQuestions.length}</span></div>
            <div className="mt-3 flex gap-2">{business.requestQuestions.map((_, i) => <div key={i} className={`h-1.5 flex-1 rounded-full transition ${i <= step ? "bg-coral" : "bg-line"}`} />)}</div>
          </div>
          <div className="page-enter max-w-2xl" key={question.id}>
            <Badge tone="violet">One quick question</Badge>
            <h1 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl">{question.label}</h1>
            {question.helper && <p className="mt-3 text-muted">{question.helper}</p>}
            <div className="mt-8">
              {question.type === "select" && <div className="grid gap-3 sm:grid-cols-2">{question.options?.map(option => <Button key={option} variant={answers[question.id] === option ? "dark" : "secondary"} className="min-h-15 justify-start px-5 text-left" onClick={() => setValue(option)}>{answers[question.id] === option && <Check size={17} />}{option}</Button>)}</div>}
              {question.type === "number" && <><Label htmlFor={question.id}>Number of guests</Label><Input id={question.id} inputMode="numeric" type="number" min="1" placeholder="e.g. 150" value={answers[question.id] || ""} onChange={e => setValue(e.target.value)} /></>}
              {question.type === "textarea" && <><Label htmlFor={question.id}>Event details</Label><Textarea id={question.id} placeholder="We’re planning a relaxed outdoor wedding and would love..." value={answers[question.id] || ""} onChange={e => setValue(e.target.value)} /><button className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line p-4 text-sm font-semibold text-muted hover:border-violet hover:text-violet"><Paperclip size={17} /> Add inspiration photos (optional)</button></>}
              {question.type === "date" && <><Label htmlFor={question.id}>Preferred date</Label><Input id={question.id} type="date" value={answers[question.id] || ""} onChange={e => setValue(e.target.value)} /></>}
              {question.type === "location" && <><Label htmlFor={question.id}>Event location</Label><div className="relative"><MapPin className="absolute left-4 top-3.5 text-muted" size={18} /><Input id={question.id} className="pl-11" placeholder="Venue or neighbourhood" value={answers[question.id] || ""} onChange={e => setValue(e.target.value)} /></div></>}
              {question.type === "text" && <><Label htmlFor={question.id}>WhatsApp number</Label><Input id={question.id} type="tel" placeholder="+250 7__ ___ ___" value={answers[question.id] || ""} onChange={e => setValue(e.target.value)} /><p className="mt-3 flex items-center gap-2 text-xs text-muted"><ShieldCheck size={14} /> Only used for updates about this request.</p></>}
            </div>
            <div className="mt-10 flex justify-between">
              <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)} icon={<ArrowLeft size={17} />}>Back</Button>
              {step < business.requestQuestions.length - 1 ? <Button disabled={!answers[question.id]} onClick={() => setStep(step + 1)}>Continue <ArrowRight size={17} /></Button> : <Button disabled={!answers[question.id]} loading={loading} onClick={submit}>{loading ? "Sending..." : "Send request"} {!loading && <ArrowRight size={17} />}</Button>}
            </div>
          </div>
        </section>
        <aside className="hidden lg:block"><Card className="sticky top-8 overflow-hidden"><img src={business.profile.coverImage} alt="" className="h-32 w-full object-cover" /><div className="p-5"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-coral text-xs font-bold text-white">AP</span><div><p className="text-sm font-bold">{business.name}</p><p className="text-xs text-muted">Usually replies in 20 min</p></div></div><div className="mt-5 border-t border-line pt-5"><p className="text-xs font-bold uppercase tracking-wider text-muted">Your request</p>{Object.entries(answers).length === 0 ? <p className="mt-3 text-sm text-muted">Your answers will appear here as you go.</p> : <div className="mt-3 space-y-3">{Object.entries(answers).map(([key,value]) => <div key={key}><p className="text-xs capitalize text-muted">{key}</p><p className="text-sm font-semibold">{value}</p></div>)}</div>}</div></div></Card></aside>
      </main>
    </div>
  );
}
