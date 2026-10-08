import { ArrowRight, BarChart3, Check, ChevronRight, CircleCheck, Compass, FileText, MessageCircle, MousePointerClick, Play, ShieldCheck, Sparkles, Store, Zap } from "lucide-react";
import { assets, business, demoBusinesses } from "../data/mockData";
import { Badge, Brand, ButtonLink, Card, Heading } from "../components/ui";

const steps = [
  ["01", "Create your business page", "Add the essentials once. Your page stays clear, current, and ready to share."],
  ["02", "Configure customer actions", "Choose what visitors can do: order, book, request, contact, pay, or visit."],
  ["03", "Turn interest into business", "Receive structured requests, send polished quotes, and see what converts."],
];

export default function LandingPage() {
  return (
    <>
      <section className="relative overflow-hidden pb-20 pt-16 sm:pt-24 lg:pb-28 lg:pt-32">
        <div className="absolute inset-x-0 top-0 -z-10 h-full opacity-60 dot-grid" />
        <div className="absolute -right-40 top-12 -z-10 size-[32rem] rounded-full bg-coral-soft blur-3xl" />
        <div className="shell-wide grid items-center gap-16 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <Badge tone="violet"><Sparkles size={12} /> One link. Every next step.</Badge>
            <Heading as="h1" className="mt-6">Turn business discovery <span className="text-coral">into action.</span></Heading>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted">Give customers one powerful link to discover your business, request what they need, get a quote, contact you, and become a customer.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink to="/register" className="min-h-13 px-6" icon={<ArrowRight size={18} />}>Create your business page</ButtonLink>
              <ButtonLink to="/b/afrinai-ja" variant="secondary" className="min-h-13 px-6" icon={<Play size={17} />}>Explore live demo</ButtonLink>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-muted">
              <span className="flex items-center gap-2"><CircleCheck size={16} className="text-success" /> 14-day free trial</span>
              <span className="flex items-center gap-2"><CircleCheck size={16} className="text-success" /> No card required</span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-2xl">
            <div className="absolute -left-6 top-16 hidden rounded-2xl bg-white p-4 shadow-float sm:block">
              <div className="flex items-center gap-3"><span className="icon-tile bg-success-soft text-success"><FileText size={18} /></span><div><p className="text-xs text-muted">New request</p><p className="text-sm font-bold">Wedding catering · 150</p></div></div>
            </div>
            <div className="ml-auto w-[88%] overflow-hidden rounded-[1.7rem] border border-line bg-white shadow-float">
              <div className="flex h-10 items-center gap-1.5 border-b border-line bg-[#f7f6f2] px-4"><i className="size-2.5 rounded-full bg-[#ff7a68]" /><i className="size-2.5 rounded-full bg-[#f2c94c]" /><i className="size-2.5 rounded-full bg-[#58c98c]" /><span className="mx-auto rounded-md bg-white px-12 py-1 text-[.55rem] text-muted">ubucuruzihub.com/b/afrinai-ja</span></div>
              <div className="relative h-48"><img src={business.profile.coverImage} alt="West African food by Afrinaija Pots" className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" /><div className="absolute bottom-4 left-5 text-white"><p className="font-display text-xl font-bold">{business.name}</p><p className="text-xs text-white/80">{business.profile.tagline}</p></div></div>
              <div className="p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">What would you like to do?</p>
                <div className="mt-3 grid grid-cols-3 gap-2">{[["Order", Store],["Catering quote", FileText],["WhatsApp", MessageCircle]].map(([name, Icon]) => <div key={String(name)} className="rounded-xl border border-line p-3"><Icon size={18} className="text-coral" /><p className="mt-2 text-xs font-bold">{String(name)}</p></div>)}</div>
              </div>
            </div>
            <div className="absolute -bottom-6 right-0 rounded-2xl bg-ink p-4 text-white shadow-float sm:right-[-1rem]">
              <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-white/10"><BarChart3 size={18} /></span><div><p className="text-xs text-white/60">Actions this week</p><p className="text-lg font-bold">+38%</p></div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-white py-8">
        <div className="shell-wide">
          <p className="text-center text-xs font-bold uppercase tracking-[.18em] text-muted">Built for the businesses people rely on every day</p>
          <div className="mt-6 flex flex-wrap justify-center gap-x-8 gap-y-3">{demoBusinesses.slice(0, 8).map(([name, category]) => <span key={name} className="text-sm font-semibold text-ink/65">{category}</span>)}</div>
        </div>
      </section>

      <section id="how-it-works" className="py-24 lg:py-32">
        <div className="shell">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <Heading eyebrow="From search to sale">A page that answers “what next?”</Heading>
              <p className="mt-5 max-w-md leading-relaxed text-muted">Most business profiles end after discovery. UbucuruziHub gives every interested customer a clear, useful next step.</p>
              <div className="mt-8 flex items-center gap-3 rounded-2xl border border-line bg-white p-4"><Compass className="text-violet" /><div><p className="text-sm font-bold">Discovery → Trust → Action</p><p className="text-xs text-muted">A simple journey designed to convert.</p></div></div>
            </div>
            <div className="grid gap-4">{steps.map(([n, title, desc]) => <Card key={n} className="group flex gap-5 p-6 transition hover:-translate-y-1 hover:shadow-card"><span className="font-display text-sm font-bold text-coral">{n}</span><div><h3 className="font-display text-xl font-bold">{title}</h3><p className="mt-2 leading-relaxed text-muted">{desc}</p></div><ChevronRight className="ml-auto shrink-0 text-muted transition group-hover:translate-x-1 group-hover:text-coral" /></Card>)}</div>
          </div>
        </div>
      </section>

      <section className="bg-ink py-24 text-white lg:py-28">
        <div className="shell-wide">
          <div className="mx-auto max-w-2xl text-center"><p className="eyebrow !text-[#ff9c88]">The product in action</p><h2 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">Customers do more than browse.</h2><p className="mt-5 text-white/60">Experience the actual customer journey with Afrinaija Pots.</p></div>
          <div className="mt-14 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
            <div className="relative min-h-96 overflow-hidden rounded-3xl"><img src={assets.foodOne} alt="West African dining spread" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" /><div className="absolute inset-x-0 bottom-0 p-7"><Badge tone="success">Open now</Badge><h3 className="mt-3 font-display text-3xl font-bold">Afrinaija Pots</h3><p className="mt-2 max-w-md text-white/70">Authentic favourites and memorable catering, made with heart in Kigali.</p></div></div>
            <div className="grid grid-cols-2 gap-3">{[["View menu", Store, "Choose a meal"],["Order now", MousePointerClick, "Pickup or delivery"],["WhatsApp", MessageCircle, "Chat directly"],["Directions", Compass, "Open in Maps"],["Catering quote", FileText, "Plan your event"],["Book a table", Sparkles, "Save your seat"]].map(([title, Icon, desc], i) => <ButtonLink key={String(title)} to={i === 4 ? "/b/afrinai-ja/request" : "/b/afrinai-ja"} variant="white" className="h-auto min-h-32 flex-col items-start rounded-2xl p-5 text-left"><Icon size={22} className="text-coral" /><span className="mt-3">{String(title)}</span><span className="text-xs font-normal text-muted">{String(desc)}</span></ButtonLink>)}</div>
          </div>
        </div>
      </section>

      <section className="py-24 lg:py-32">
        <div className="shell-wide grid gap-14 lg:grid-cols-2 lg:items-center">
          <div><Heading eyebrow="Built for confidence">Professional from first click to final quote.</Heading><p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">Every interaction is clear, branded, and easy to complete on a phone—because trust is built in the small moments.</p><div className="mt-8 grid gap-4 sm:grid-cols-2">{[[ShieldCheck,"Secure by design"],[Zap,"Fast on mobile"],[FileText,"Structured requests"],[BarChart3,"Actionable analytics"]].map(([Icon,label]) => <div className="flex items-center gap-3 text-sm font-bold" key={String(label)}><span className="icon-tile"><Icon size={18} /></span>{String(label)}</div>)}</div></div>
          <Card className="relative overflow-hidden p-8"><div className="absolute right-0 top-0 size-40 rounded-full bg-coral-soft blur-3xl" /><p className="relative font-display text-2xl font-bold leading-snug">“For the first time, customers send us exactly what we need to prepare a quote. No more ten-message WhatsApp back-and-forth.”</p><div className="relative mt-8 flex items-center gap-3"><img src={assets.ownerPhoto} alt="Demo business owner" className="size-12 rounded-full object-cover" /><div><p className="text-sm font-bold">Amina N.</p><p className="text-xs text-muted">Demo testimonial · Restaurant owner, Kigali</p></div></div></Card>
        </div>
      </section>

      <section className="shell-wide pb-12">
        <div className="overflow-hidden rounded-[2rem] bg-coral px-6 py-14 text-center text-white sm:px-12 sm:py-20"><h2 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">Your next customer is already looking.</h2><p className="mx-auto mt-5 max-w-2xl text-white/80">Give them a clear way to choose you, request what they need, and take the next step.</p><ButtonLink to="/register" variant="white" className="mt-8 min-h-13 px-6" icon={<ArrowRight size={18} />}>Start your free trial</ButtonLink></div>
      </section>

      <footer className="bg-ink py-14 text-white"><div className="shell-wide"><Brand light /><div className="mt-10 grid gap-10 border-b border-white/10 pb-10 sm:grid-cols-4"><div><p className="text-sm text-white/55">One link that turns discovery into customers.</p></div>{[["Product","Features · Pricing · Demo"],["Businesses","Dashboard · Quotes · Analytics"],["Company","About · Contact · Privacy"]].map(([h,t]) => <div key={h}><p className="text-sm font-bold">{h}</p><p className="mt-4 whitespace-pre-line text-sm leading-7 text-white/50">{t.split(" · ").join("\n")}</p></div>)}</div><p className="pt-6 text-xs text-white/40">© 2026 UbucuruziHub. Designed in Rwanda for ambitious businesses everywhere.</p></div></footer>
    </>
  );
}
