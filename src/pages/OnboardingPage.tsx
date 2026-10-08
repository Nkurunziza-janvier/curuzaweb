import { ArrowLeft, ArrowRight, Check, Image, MapPin, Store } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Badge, Brand, Button, Card, Input, Label, Select } from "../components/ui";

const steps = ["Business", "Category", "Location", "Contact", "Brand", "Services", "Actions", "Questions", "Preview", "Publish"];

export default function OnboardingPage() {
  const [step, setStep] = useState(0); const [name, setName] = useState("Afrinaija Pots"); const navigate = useNavigate();
  return <div className="min-h-screen bg-cream"><header className="border-b border-line bg-white"><div className="shell-wide flex h-17 items-center justify-between"><Brand /><p className="text-xs font-semibold text-muted">Setup {Math.round(((step + 1) / steps.length) * 100)}% complete</p></div></header>
    <div className="h-1 bg-line"><div className="h-full bg-coral transition-all" style={{width:`${((step+1)/steps.length)*100}%`}} /></div>
    <main className="shell-wide grid gap-10 py-8 lg:grid-cols-[1fr_.8fr] lg:py-14">
      <section className="mx-auto w-full max-w-xl"><Badge tone="violet">Step {step + 1} · {steps[step]}</Badge><h1 className="mt-5 font-display text-3xl font-bold tracking-tight">{step === 0 ? "Let’s get your business online." : step === 1 ? "What kind of business is it?" : step === 2 ? "Where can customers find you?" : step === 8 ? "This is looking good." : step === 9 ? "Ready to welcome customers?" : `Set up your ${steps[step].toLowerCase()}.`}</h1><p className="mt-3 text-muted">You can update this anytime from your workspace.</p>
        <Card className="mt-8 p-6">
          {step === 0 && <div><Label htmlFor="business-name">Business name</Label><Input id="business-name" value={name} onChange={e=>setName(e.target.value)} /></div>}
          {step === 1 && <div><Label htmlFor="category">Business category</Label><Select id="category" defaultValue="restaurant"><option value="restaurant">Restaurant & catering</option><option>Beauty & wellness</option><option>Automotive services</option><option>Construction</option><option>Professional services</option></Select></div>}
          {step === 2 && <div><Label htmlFor="location">Primary location</Label><div className="relative"><MapPin className="absolute left-4 top-3.5 text-muted" size={18}/><Input className="pl-11" id="location" defaultValue="Kimihurura, Kigali" /></div></div>}
          {step > 2 && step < 8 && <div className="space-y-4">{[1,2,3].map(i=><button key={i} className="flex w-full items-center gap-4 rounded-xl border border-line p-4 text-left transition hover:border-violet"><span className="icon-tile"><Check size={16}/></span><span><strong className="block text-sm">{steps[step]} option {i}</strong><span className="text-xs text-muted">Recommended setup for your business type</span></span></button>)}</div>}
          {step >= 8 && <div className="text-center"><span className="mx-auto grid size-16 place-items-center rounded-full bg-success-soft text-success"><Check size={28}/></span><p className="mt-5 font-display text-xl font-bold">{step === 9 ? "Everything is ready to publish" : "Your customer page is ready for review"}</p><p className="mt-2 text-sm text-muted">Customers will be able to discover, order, request catering, and contact you.</p></div>}
        </Card>
        <div className="mt-8 flex justify-between"><Button variant="ghost" disabled={step === 0} onClick={()=>setStep(step-1)} icon={<ArrowLeft size={17}/>}>Back</Button><Button onClick={()=> step === 9 ? navigate("/dashboard") : setStep(step+1)}>{step === 9 ? "Publish page" : "Continue"} <ArrowRight size={17}/></Button></div>
      </section>
      <aside className="hidden lg:block"><p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-muted">Live mobile preview</p><div className="mx-auto w-72 rounded-[2rem] border-8 border-ink bg-white p-2 shadow-float"><div className="overflow-hidden rounded-[1.4rem]"><div className="h-40 bg-[url('https://images.unsplash.com/photo-1665333048952-a3ee97714c6b?auto=format&fit=crop&w=700&q=80')] bg-cover bg-center" /><div className="p-4"><div className="-mt-9 grid size-14 place-items-center rounded-xl border-4 border-white bg-coral font-bold text-white">AP</div><p className="mt-2 font-display text-lg font-bold">{name || "Your business"}</p><p className="text-xs text-muted">Restaurant · Kigali</p><div className="mt-4 grid grid-cols-2 gap-2"><span className="rounded-lg bg-coral p-2 text-center text-[.65rem] font-bold text-white">Order now</span><span className="rounded-lg bg-ink p-2 text-center text-[.65rem] font-bold text-white">WhatsApp</span></div><div className="mt-4 space-y-2">{[Store,Image,MapPin].map((Icon,i)=><div key={i} className="flex items-center gap-2 rounded-lg border border-line p-2"><Icon size={13} className="text-coral"/><i className="h-2 w-28 rounded bg-line"/></div>)}</div></div></div></div></aside>
    </main></div>;
}
