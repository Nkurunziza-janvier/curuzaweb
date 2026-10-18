import { ArrowRight, BarChart3, Check, Eye, EyeOff, Globe2, LockKeyhole, Mail, Package, ShieldCheck, Store, Users } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Brand, Button, Input, Label } from "../components/ui";
import { authService } from "../services/authService";
import BrandLoader from "../components/BrandLoader";
import { LanguageSwitcher, useLanguage } from "../i18n";

function LoginShowcase() {
  const { t } = useLanguage();
  return <aside className="login-showcase relative hidden min-h-screen overflow-hidden text-white lg:flex lg:flex-col">
    <svg className="login-room-scene" viewBox="0 0 1000 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="roomNight" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#101d32" /><stop offset=".56" stopColor="#101726" /><stop offset="1" stopColor="#090d16" /></linearGradient>
        <linearGradient id="roomWindow" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#203755" /><stop offset=".55" stopColor="#131d30" /><stop offset="1" stopColor="#5e452f" /></linearGradient>
        <linearGradient id="personShirt" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#282733" /><stop offset=".52" stopColor="#121722" /><stop offset="1" stopColor="#090d14" /></linearGradient>
        <radialGradient id="warmLamp"><stop stopColor="#f6a461" stopOpacity=".9" /><stop offset="1" stopColor="#ef9650" stopOpacity="0" /></radialGradient>
        <filter id="roomBlur"><feGaussianBlur stdDeviation="18" /></filter>
        <filter id="roomSoft"><feGaussianBlur stdDeviation="7" /></filter>
      </defs>
      <rect width="1000" height="900" fill="url(#roomNight)" />
      <g opacity=".7" filter="url(#roomBlur)">
        <rect x="595" y="58" width="310" height="320" rx="20" fill="url(#roomWindow)" />
        <rect x="642" y="89" width="95" height="83" rx="18" fill="#506986" opacity=".5" />
        <rect x="761" y="76" width="118" height="44" rx="12" fill="#708298" opacity=".34" />
        <rect x="620" y="204" width="175" height="22" rx="11" fill="#c0c9d4" opacity=".26" />
        <circle cx="674" cy="365" r="80" fill="url(#warmLamp)" />
        <circle cx="936" cy="400" r="62" fill="#f28b43" opacity=".5" />
      </g>
      <path d="M0 670 Q220 610 420 690 T1000 625V900H0Z" fill="#0c111b" />
      <path d="M0 721 Q255 683 515 734 T1000 689" fill="none" stroke="#39404a" strokeOpacity=".3" strokeWidth="3" />
      <g opacity=".8">
        <path d="M598 697 Q592 574 628 497M619 700 Q646 570 680 533M627 700 Q616 565 583 541M637 703 Q689 587 716 578" stroke="#506944" strokeWidth="10" fill="none" strokeLinecap="round" />
        <ellipse cx="581" cy="536" rx="18" ry="51" fill="#526746" transform="rotate(-35 581 536)" />
        <ellipse cx="681" cy="526" rx="18" ry="53" fill="#3d5a43" transform="rotate(28 681 526)" />
        <ellipse cx="712" cy="571" rx="17" ry="46" fill="#61784c" transform="rotate(44 712 571)" />
        <path d="M590 700h76l-9 65h-57z" fill="#181c22" />
      </g>
      <ellipse cx="883" cy="370" rx="180" ry="252" fill="#070b12" opacity=".52" filter="url(#roomSoft)" />
      <path d="M795 896 Q774 745 799 604 Q812 538 854 493 L898 467 Q963 469 1000 529V900Z" fill="url(#personShirt)" />
      <path d="M876 457 Q869 423 865 397 L922 370 Q928 414 953 437 Q935 476 905 492Z" fill="#8b5944" />
      <path d="M849 226 Q870 160 936 168 Q1001 176 1013 259 L997 383 Q980 431 931 445 Q896 425 874 387 Q850 345 849 290Z" fill="#895b49" />
      <path d="M842 286 Q827 206 858 151 Q887 92 954 111 Q1019 127 1021 221 Q1018 256 999 291 Q989 229 957 216 Q928 255 866 258Z" fill="#11121a" />
      <g fill="#171821">
        <circle cx="873" cy="164" r="22" /><circle cx="900" cy="137" r="24" /><circle cx="929" cy="132" r="25" /><circle cx="960" cy="151" r="24" /><circle cx="986" cy="183" r="22" /><circle cx="870" cy="203" r="20" />
      </g>
      <path d="M944 288 Q963 278 980 290 L978 300 Q961 295 944 302Z" fill="#10151d" />
      <path d="M974 303 Q1001 316 1012 301" fill="none" stroke="#1b2430" strokeWidth="7" />
      <path d="M852 276 Q829 284 840 310 Q846 324 863 315" fill="none" stroke="#252b35" strokeWidth="5" />
      <path d="M850 279 Q828 282 836 311" fill="none" stroke="#e4a36f" strokeWidth="2" />
      <path d="M912 512 Q853 527 835 578 L752 671 Q735 697 754 720 Q779 737 803 708 L901 632 Q941 606 958 557Z" fill="#8b5944" />
      <path d="M924 545 Q893 557 865 582" fill="none" stroke="#bd8264" strokeOpacity=".35" strokeWidth="8" />
      <ellipse cx="754" cy="710" rx="39" ry="17" fill="#98644d" transform="rotate(-24 754 710)" />
      <ellipse cx="679" cy="809" rx="193" ry="17" fill="#03060b" opacity=".42" filter="url(#roomSoft)" />
      <path d="M380 832 Q521 797 680 831 L647 887 H354Z" fill="#111720" />
      <path d="M431 824 Q454 786 516 798 Q543 805 544 839 L533 860 H432Z" fill="#201a19" />
      <path d="M536 812 Q569 806 574 833 Q571 850 552 851" fill="none" stroke="#252a32" strokeWidth="8" />
      <rect x="467" y="818" width="34" height="28" rx="6" fill="#e45d3f" /><text x="484" y="837" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="800">U</text>
      <path d="M362 879 Q522 854 691 882" fill="none" stroke="#604334" strokeWidth="5" opacity=".65" />
    </svg>
    <div className="login-showcase-orbit login-showcase-orbit-one" />
    <div className="login-showcase-orbit login-showcase-orbit-two" />
    <div className="login-showcase-glow" />
    <div className="login-showcase-brand relative z-10 flex items-center justify-between">
      <Brand light />
    </div>
    <div className="login-showcase-copy relative z-10 mt-[1.8rem] max-w-[38rem]">
      <h2 className="mt-4 max-w-[34rem] font-display text-[clamp(2.45rem,3.2vw,3.4rem)] font-extrabold leading-[1.03] tracking-[-.055em]">{t("Your business deserves to be")} <span className="text-coral">{t("seen")}</span></h2>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75">{t("Bring your products online, connect with customers, and grow — all in one place.")}</p>
    </div>
    <div className="login-feature-list relative z-10 mt-[3.05rem] grid max-w-[22rem] gap-4">
      {[
        { icon: Store, title: t("Your online storefront"), text: t("Showcase products and services in one place.") },
        { icon: Users, title: t("Customer requests"), text: t("Keep every enquiry organized and easy to follow.") },
        { icon: BarChart3, title: t("Business insights"), text: t("Understand what customers are looking for.") },
      ].map(({ icon: Icon, title, text }) => <div key={title} className="flex items-center gap-3">
        <span className="login-feature-icon grid size-12 shrink-0 place-items-center rounded-full border border-white/[.2] bg-white/[.06] text-white/90"><Icon size={20} /></span>
        <span><strong className="block text-xs font-bold">{title}</strong><small className="mt-1 block max-w-56 text-[.65rem] leading-relaxed text-white/55">{text}</small></span>
      </div>)}
    </div>
    <div className="login-dashboard-art relative z-10">
      <div className="login-store-laptop">
        <div className="login-store-browserbar"><span /><span /><span /><b>e-businessRw / fresh-market</b><i>⌕</i></div>
        <div className="login-store-nav"><strong><span>e</span> e-businessRw</strong><small>{t("Home")}&nbsp;&nbsp; {t("Products")}&nbsp;&nbsp; {t("About")}</small><i>⌕　♡</i></div>
        <div className="login-store-hero"><div><small>{t("FEATURED STORE")}</small><b>{t("Fresh & natural")}</b><p>{t("Quality products from local businesses.")}</p><span>{t("Shop now")} <ArrowRight size={11} /></span></div></div>
        <div className="login-store-products"><strong>{t("Popular products")}</strong><div>{[t("Organic honey"), t("Local coffee"), t("Handmade basket")].map((item, index) => <article key={item}><i className={`login-product-photo photo-${index + 1}`} /><b>{item}</b><small>RWF {index === 0 ? "8,000" : index === 1 ? "12,000" : "15,000"}</small><span>{t("Add to cart")}</span></article>)}</div></div>
      </div>
      <div className="login-store-laptop-base" />
      <div className="login-store-phone"><div className="login-phone-notch" /><b>e-businessRw</b><div className="login-phone-hero"><small>SUPPORT LOCAL</small><strong>Shop local.<br />Grow together.</strong><span>Explore <ArrowRight size={9} /></span></div><div className="login-phone-categories"><i>🥬</i><i>☕</i><i>🧺</i></div><div className="login-phone-products"><i /><i /></div><small className="login-phone-bottom">⌂　 ◫　 ♡　 ☻</small></div>
      <div className="login-visibility-card"><span><BarChart3 size={21} /></span><div><b>{t("More visibility")}</b><small>{t("Built for local business")}</small></div><i /></div>
      <div className="login-showcase-plant"><i /><i /><i /><i /><i /><span /></div>
    </div>
  </aside>;
}

export function AuthPage({ register = false }: { register?: boolean }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [recoveryNotice, setRecoveryNotice] = useState(false);
  const [values, setValues] = useState({ name: "", email: "", password: "", businessName: "" });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setRecoveryNotice(false);
    setLoading(true);
    const loadingStartedAt = Date.now();
    const action = register
      ? authService.register(values)
      : authService.signIn(values.email, values.password);
    void action
      .then(async (user) => {
        if (!register) {
          const remainingLoadingTime = Math.max(0, 7000 - (Date.now() - loadingStartedAt));
          if (remainingLoadingTime > 0) await new Promise((resolve) => window.setTimeout(resolve, remainingLoadingTime));
        }
        queryClient.setQueryData(["auth", "me"], user);
        const destination = (location.state as { from?: string } | null)?.from;
        navigate(register ? "/onboarding" : destination ?? (user.role === "ADMIN" ? "/admin" : "/dashboard"), { replace: true });
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to sign in"))
      .finally(() => setLoading(false));
  };

  if (!register) {
    return <main className="login-page">
      <section className="login-form-side">
        <div className="login-form-decoration login-form-decoration-top" />
        <div className="login-form-decoration login-form-decoration-bottom" />
        <div className="login-card">
          <div className="flex items-center justify-between"><Brand /><LanguageSwitcher compact /></div>
          <div className="mt-8">
            <p className="login-eyebrow"><span>{t("Welcome back")}</span><i /></p>
            <h1 className="mt-2 font-display text-[2rem] font-extrabold leading-tight tracking-[-.045em] text-ink sm:text-[2.35rem]">{t("Welcome back")} <span aria-hidden="true">👋</span></h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t("Log in to manage your business and customer requests.")}</p>
          </div>
          <form className="mt-6 space-y-4.5" onSubmit={submit}>
            <div>
              <Label htmlFor="email">{t("Email address")}</Label>
              <div className="login-input-wrap"><Mail size={17} aria-hidden="true" /><Input id="email" required type="email" autoComplete="email" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} placeholder={t("you@business.com")} /></div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between"><Label htmlFor="password">{t("Password")}</Label><button type="button" className="text-xs font-bold text-coral-dark transition hover:text-coral" onClick={() => setRecoveryNotice(true)}>{t("Forgot password?")}</button></div>
              <div className="login-input-wrap"><LockKeyhole size={17} aria-hidden="true" /><Input id="password" required autoComplete="current-password" type={showPassword ? "text" : "password"} value={values.password} onChange={(event) => setValues({ ...values, password: event.target.value })} placeholder={t("Enter your password")} /><button type="button" className="login-password-toggle" aria-label={showPassword ? t("Hide password") : t("Show password")} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
            </div>
            {recoveryNotice && <p role="status" className="rounded-lg border border-[#f7d9ce] bg-[#fff7f2] p-3 text-xs leading-relaxed text-[#9b452d]">{t("Password reset isn’t available yet. Please contact your business administrator for help signing in.")}</p>}
            {error && <p role="alert" className="rounded-lg border border-[#f4c5c5] bg-[#fff2f2] p-3 text-sm text-[#b42318]">{error}</p>}
            <Button type="submit" loading={loading} className="login-submit">{loading ? t("Please wait...") : t("Log in")} {!loading && <ArrowRight size={18} />}</Button>
          </form>
          <div className="login-divider"><span />{t("or continue with")}<span /></div>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" className="login-provider" disabled title={t("Google sign-in is not configured")}><span className="login-google-mark">G</span>{t("Continue with Google")}</button>
            <button type="button" className="login-provider" disabled title={t("Microsoft sign-in is not configured")}><span className="login-microsoft-mark"><i /><i /><i /><i /></span>{t("Continue with Microsoft")}</button>
          </div>
          <p className="mt-5 text-center text-sm text-muted">{t("Don’t have an account?")} <Link className="ml-1 font-bold text-coral-dark hover:text-coral" to="/register">{t("Sign up")}</Link></p>
          <p className="login-security-note"><ShieldCheck size={17} aria-hidden="true" /> {t("Your information is secure. We never share your data.")}</p>
        </div>
        <p className="login-mobile-caption">{t("Simple tools to help your business grow.")}</p>
      </section>
      <LoginShowcase />
      {loading && <BrandLoader title={register ? t("Creating your account") : t("Signing you in")} detail={register ? t("Setting up your business workspace securely.") : t("Verifying your account and opening your workspace.")} />}
    </main>;
  }

  return <main className="register-page">
    <section className="register-form-side">
      <header className="register-topbar"><Brand /><LanguageSwitcher compact /><p>{t("Already have an account?")} <Link to="/login">{t("Log in")}</Link></p></header>
      <div className="register-main">
        <div className="register-heading"><span className="register-step"><span>01</span> {t("CREATE YOUR ACCOUNT")}</span><h1>{t("Put your business")}<br /><em>{t("on the map.")}</em></h1><p>{t("Start with the essentials. We’ll help you build your business page next.")}</p></div>
        <form className="register-form" onSubmit={submit}>
          <div className="register-form-grid">
            <div><Label htmlFor="business">{t("Business name")}</Label><Input id="business" required autoComplete="organization" value={values.businessName} onChange={(event) => setValues({ ...values, businessName: event.target.value })} placeholder={t("e.g. Imizi Home")} /></div>
            <div><Label htmlFor="owner">{t("Your full name")}</Label><Input id="owner" required autoComplete="name" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} placeholder={t("e.g. Aline Uwimana")} /></div>
            <div className="register-field-wide"><Label htmlFor="register-email">{t("Work email")}</Label><div className="register-input-wrap"><Mail size={17} aria-hidden="true" /><Input id="register-email" required type="email" autoComplete="email" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} placeholder={t("you@business.com")} /></div></div>
            <div className="register-field-wide"><div className="mb-2 flex items-center justify-between"><Label htmlFor="register-password">{t("Create a password")}</Label><span className="register-hint">{t("8 characters minimum")}</span></div><div className="register-input-wrap"><LockKeyhole size={17} aria-hidden="true" /><Input id="register-password" required minLength={8} autoComplete="new-password" type={showPassword ? "text" : "password"} value={values.password} onChange={(event) => setValues({ ...values, password: event.target.value })} placeholder={t("Choose a secure password")} /><button type="button" className="register-password-toggle" aria-label={showPassword ? t("Hide password") : t("Show password")} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div>
          </div>
          {error && <p role="alert" className="register-error">{error}</p>}
          <Button type="submit" loading={loading} className="register-submit">{loading ? t("Creating your account…") : t("Create your account")} {!loading && <ArrowRight size={18} />}</Button>
          <p className="register-terms"><ShieldCheck size={16} /> {t("Your details are protected. By continuing, you agree to our Terms and Privacy Policy.")}</p>
        </form>
      </div>
      <footer className="register-footer"><span>© {new Date().getFullYear()} e-businessRw</span><span>{t("Made for businesses ready to grow")}</span></footer>
    </section>
    <aside className="register-showcase">
      <div className="register-showcase-orb register-showcase-orb-a" /><div className="register-showcase-orb register-showcase-orb-b" />
      <div className="register-showcase-top"><span className="register-live-dot" /> {t("YOUR BUSINESS, MORE VISIBLE")}</div>
      <div className="register-showcase-content"><p className="register-showcase-eyebrow">{t("A simpler way to grow")}</p><h2>{t("Everything your business needs to")} <span>{t("get discovered.")}</span></h2><p className="register-showcase-copy">{t("Create a page for your business, share what you offer, and make it easier for customers to reach you.")}</p>
        <div className="register-benefits"><div><span><Globe2 size={18} /></span><div><b>{t("Your own business page")}</b><small>{t("A shareable home for your business online.")}</small></div></div><div><span><Package size={18} /></span><div><b>{t("Products and services")}</b><small>{t("Show customers what you have to offer.")}</small></div></div><div><span><Users size={18} /></span><div><b>{t("Customer enquiries")}</b><small>{t("Keep requests and conversations organized.")}</small></div></div></div>
      </div>
      <div className="register-preview" aria-hidden="true"><div className="register-preview-bar"><span className="register-preview-logo"><Store size={15} /></span><b>Imizi Home</b><span className="register-preview-status">● Published</span></div><div className="register-preview-cover"><div className="register-preview-copy"><small>HOME · LIVING · STYLE</small><b>Make room for<br />what matters.</b><i>Explore collection <ArrowRight size={12} /></i></div><div className="register-preview-vase register-vase-one" /><div className="register-preview-vase register-vase-two" /><div className="register-preview-leaf" /></div><div className="register-preview-bottom"><span><i /><i /><i /></span><small><strong>Products</strong> &nbsp; Services &nbsp; About</small></div></div>
      <div className="register-showcase-foot"><span><Check size={15} /> {t("Simple to set up")}</span><span><Check size={15} /> {t("Built for local business")}</span></div>
    </aside>
    {loading && <BrandLoader title="Creating your account" detail="Setting up your business workspace securely." />}
  </main>;
}
