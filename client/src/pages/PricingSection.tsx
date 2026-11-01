import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, BadgeCheck, CalendarCheck, Check, Clock3, MessageCircle, ShieldCheck, Smartphone, Sparkles, Store, type LucideIcon } from "lucide-react";
import { Link } from "react-router";
import { useLanguage } from "../i18n";

const plans: Array<{
  code: string;
  name: string;
  price: string;
  period: string;
  detail: string;
  popular: boolean;
  ribbon?: string;
  save?: string;
  features: string[];
}> = [
  {
    code: "MONTHLY",
    name: "Monthly publishing",
    price: "10,000",
    period: "30 days",
    detail: "Flexible access for businesses getting started.",
    popular: false,
    features: ["Publish up to 50 products", "Business storefront and customer requests", "Admin-verified Mobile Money payment", "Renew when your access is ending"],
  },
  {
    code: "YEARLY",
    name: "Annual publishing",
    price: "100,000",
    period: "365 days",
    detail: "One payment for a full year of product visibility.",
    popular: true,
    ribbon: "Best value",
    save: "Save RWF 20,000 vs monthly",
    features: ["Everything in Monthly", "Publish up to 50 products", "Save RWF 20,000 vs monthly", "One annual renewal"],
  },
];

const priceFaq = [
  {
    q: "How does payment work?",
    a: "You pay with Mobile Money — MTN or Airtel. Your payment is submitted from the billing page, then an administrator verifies it and your access activates.",
  },
  {
    q: "What happens when my access ends?",
    a: "Your page pauses and your link stops accepting new requests until you renew. Your content is never deleted, so a renewal brings everything straight back.",
  },
  {
    q: "Can I switch between monthly and annual?",
    a: "Yes. Let your month run out and choose the annual plan at renewal, or renew annually at any time to save the difference.",
  },
];

function PriceFaqItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div className={`lz-faq-item${open ? " is-open" : ""}`}>
      <button type="button" className="lz-faq-q" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span>{question}</span>
        <span className="lz-faq-icon" aria-hidden="true">+</span>
      </button>
      <div className="lz-faq-a" aria-hidden={!open}>
        <div><p>{answer}</p></div>
      </div>
    </div>
  );
}

export default function PricingSection() {
  const { t } = useLanguage();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("lz-in"));
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("lz-in");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.16, rootMargin: "0px 0px -44px 0px" },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="lz-pricing" ref={rootRef}>
      {/* ---------------- plans ---------------- */}
      <div className="lz-shell lz-pricing-top">
        <div className="lz-pricing-intro" data-reveal>
          <span className="lz-tag">{t("Simple publishing plans")}</span>
          <h2 id="lz-pricing-title" className="lz-display lz-h2">
            {t("Publication is the only thing you pay for.")}
          </h2>
          <p className="lz-lede">
            {t("Creating your page and receiving requests is free. Publish products and services when you are ready for customers to find you.")}
          </p>
        </div>
        <div className="lz-pricing-grid">
          {plans.map((plan, index) => (
            <article
              className={`lz-plan${plan.popular ? " lz-plan--featured" : ""}`}
              key={plan.code}
              data-reveal
              style={{ "--lz-d": `${index * 110}ms` } as CSSProperties}
            >
              {plan.popular && (
                <span className="lz-plan-ribbon">
                  <Sparkles size={12} aria-hidden="true" /> {t(plan.ribbon!)}
                </span>
              )}
              <header className="lz-plan-head">
                <span className="lz-plan-icon">{plan.popular ? <Sparkles size={16} /> : <Store size={16} />}</span>
                <div>
                  <h3>{t(plan.name)}</h3>
                  <p>{t(plan.detail)}</p>
                </div>
              </header>
              <div className="lz-plan-price">
                <span className="lz-plan-amount"><small>RWF</small> {plan.price}</span>
                <span className="lz-plan-period">/ {t(plan.period)}</span>
              </div>
              {plan.save && <p className="lz-plan-save"><BadgeCheck size={13} /> {t(plan.save)}</p>}
              <Link to="/register" className={`lz-btn ${plan.popular ? "lz-btn-primary" : "lz-btn-ghost"} lz-plan-cta`}>
                {t("Get started")} <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <ul className="lz-plan-features">
                {plan.features.map((feature) => (
                  <li key={feature}><Check size={15} /> {t(feature)}</li>
                ))}
              </ul>
            </article>
          ))}
          <article className="lz-plan lz-plan--help" data-reveal style={{ "--lz-d": "220ms" } as CSSProperties}>
            <span className="lz-plan-icon"><MessageCircle size={16} /></span>
            <h3>{t("How billing works")}</h3>
            <ol className="lz-plan-steps">
              <li><span>1</span> {t("Register and shape your page — the demo checkout activates instantly.")}</li>
              <li><span>2</span> {t("Submit your Mobile Money payment from the billing screen.")}</li>
              <li><span>3</span> {t("An administrator verifies the payment and your access stays live.")}</li>
            </ol>
            <p className="lz-plan-help-note">
              {t("On this development preview, checkout is simulated and activates immediately; production payments require a configured payment method.")}
            </p>
            <Link to="/register" className="lz-text-link">
              {t("See it for yourself")} <ArrowRight size={15} />
            </Link>
          </article>
        </div>
        <div className="lz-pricing-assure" data-reveal>
          {([
            [ShieldCheck, "Admin-verified Mobile Money payment"],
            [CalendarCheck, "30 or 365 days of access"],
            [BadgeCheck, "50 published products"],
            [Smartphone, "Mobile Money payments"],
            [Clock3, "30 or 365 days of access"],
          ] as Array<[LucideIcon, string]>).slice(0, 4).map(([Icon, label]) => (
            <span key={label}><Icon size={15} /> {t(label)}</span>
          ))}
        </div>
      </div>

      {/* ---------------- pricing faq ---------------- */}
      <div className="lz-shell lz-pricing-faq" data-reveal>
        <div className="lz-faq-list">
          {priceFaq.map((faq, index) => (
            <PriceFaqItem key={faq.q} question={t(faq.q)} answer={t(faq.a)} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
