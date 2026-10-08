import { ArrowRight, BadgeCheck, CalendarDays, Clock3, Compass, CreditCard, FileQuestion, FileText, MapPin, MessageCircle, Phone, ShoppingBag, Star, UtensilsCrossed } from "lucide-react";
import { business } from "../data/mockData";
import { Badge, Brand, ButtonLink, Card, Heading } from "../components/ui";

const icons = { order: ShoppingBag, quote: FileText, book: CalendarDays, question: FileQuestion, contact: Phone, directions: Compass, pay: CreditCard };

export default function PublicBusinessPage() {
  return (
    <div className="min-h-screen bg-white pb-22 md:pb-0">
      <header className="border-b border-line bg-white"><div className="shell-wide flex h-16 items-center justify-between"><Brand /><span className="text-xs text-muted">Powered business page</span></div></header>
      <section className="relative">
        <div className="h-72 sm:h-96 lg:h-[27rem]"><img src={business.profile.coverImage} alt="Afrinaija Pots signature dining spread" className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" /></div>
        <div className="shell relative -mt-16">
          <Card className="relative p-5 shadow-float sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
              <div className="grid size-20 shrink-0 place-items-center rounded-2xl border-4 border-white bg-coral font-display text-2xl font-bold text-white shadow-card">{business.profile.logo}</div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2"><h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{business.name}</h1><BadgeCheck size={21} className="fill-violet text-white" aria-label="Verified business" /></div>
                <p className="mt-1 text-sm text-muted">{business.category.name} · {business.profile.tagline}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-muted"><span className="flex items-center gap-1 text-ink"><Star size={14} className="fill-[#f6b83f] text-[#f6b83f]" /> {business.profile.rating} ({business.profile.reviewCount})</span><span className="flex items-center gap-1"><MapPin size={14} /> Kimihurura, Kigali</span><span className="flex items-center gap-1 text-success"><Clock3 size={14} /> Open · until 22:00</span></div>
              </div>
              <div className="hidden gap-2 sm:flex"><ButtonLink to="/b/afrinai-ja/order" icon={<UtensilsCrossed size={17} />}>Order now</ButtonLink><ButtonLink to="/b/afrinai-ja/contact" variant="secondary" icon={<MessageCircle size={17} />}>WhatsApp</ButtonLink></div>
            </div>
          </Card>
        </div>
      </section>

      <main className="shell py-16">
        <section>
          <Heading eyebrow="Your next step">What would you like to do?</Heading>
          <p className="mt-4 max-w-2xl text-muted">Choose an action and we’ll guide you through it. No long forms, no guessing.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{business.actions.map((action) => { const Icon = icons[action.type]; return <ButtonLink key={action.type} to={action.type === "quote" ? "/b/afrinai-ja/request" : `/b/afrinai-ja/${action.type}`} variant="secondary" className="group h-auto min-h-40 flex-col items-start rounded-2xl p-6 text-left"><span className="icon-tile bg-coral-soft text-coral"><Icon size={20} /></span><span className="mt-4 font-display text-lg">{action.title}</span><span className="font-normal leading-relaxed text-muted">{action.description}</span><ArrowRight size={16} className="mt-auto text-coral transition group-hover:translate-x-1" /></ButtonLink>})}</div>
        </section>

        <section className="mt-24"><div className="flex items-end justify-between gap-4"><Heading eyebrow="Popular today">Food worth coming back for</Heading><ButtonLink to="/b/afrinai-ja/order" variant="ghost">View full menu <ArrowRight size={16} /></ButtonLink></div><div className="mt-8 grid gap-5 md:grid-cols-3">{business.products.map(product => <Card key={product.id} className="group overflow-hidden"><div className="h-48 overflow-hidden"><img src={product.image} alt={product.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /></div><div className="p-5"><p className="font-display text-lg font-bold">{product.name}</p><p className="mt-2 min-h-10 text-sm leading-relaxed text-muted">{product.description}</p><div className="mt-4 flex items-center justify-between"><p className="font-bold">RWF {product.price.toLocaleString()}</p><ButtonLink to="/b/afrinai-ja/order" variant="secondary">Add</ButtonLink></div></div></Card>)}</div></section>

        <section className="mt-24 grid gap-8 lg:grid-cols-[1.2fr_.8fr]"><div><Heading eyebrow="About">Food made for sharing.</Heading><p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{business.profile.description}</p><div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">{business.profile.gallery.map((image, i) => <img key={image} src={image} alt={`Afrinaija Pots gallery ${i + 1}`} loading="lazy" className={`h-44 w-full rounded-2xl object-cover ${i === 0 ? "col-span-2 sm:col-span-1" : ""}`} />)}</div></div><Card className="h-fit p-6"><Badge tone="accent">{business.offers[0].value}</Badge><h3 className="mt-4 font-display text-xl font-bold">{business.offers[0].title}</h3><p className="mt-2 text-sm text-muted">Gather the family this Sunday and enjoy more around the table.</p><ButtonLink to="/b/afrinai-ja/order" className="mt-5 w-full">Claim offer</ButtonLink><div className="mt-6 border-t border-line pt-5"><p className="text-sm font-bold">Visit us</p><p className="mt-2 text-sm text-muted">{business.profile.location}</p><p className="mt-1 text-sm text-muted">{business.profile.hours}</p></div></Card></section>

        <section className="mt-24"><Heading eyebrow="Customer stories">Trusted for the moments that matter</Heading><div className="mt-8 grid gap-4 md:grid-cols-2">{business.reviews.map(review => <Card key={review.id} className="p-6"><div className="flex gap-1 text-[#f6b83f]">{Array.from({length: review.rating}).map((_,i)=><Star key={i} size={15} className="fill-current" />)}</div><p className="mt-4 font-display text-lg font-semibold leading-relaxed">“{review.comment}”</p><p className="mt-5 text-sm font-bold">{review.customer} <span className="font-normal text-muted">· {review.date}</span></p></Card>)}</div></section>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-line bg-white/95 p-3 backdrop-blur-xl sm:hidden"><ButtonLink to="/b/afrinai-ja/order" icon={<ShoppingBag size={18} />}>Order now</ButtonLink><ButtonLink to="/b/afrinai-ja/contact" variant="dark" icon={<MessageCircle size={18} />}>WhatsApp</ButtonLink></div>
    </div>
  );
}
