import { ArrowRight, Check, Eye, LockKeyhole } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Brand, Button, Card, Input, Label } from "../components/ui";
import { authService } from "../services/authService";

export function AuthPage({ register = false }: { register?: boolean }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    window.setTimeout(() => { authService.signIn(); setLoading(false); navigate(register ? "/onboarding" : "/dashboard"); }, 700);
  };
  return <div className="grid min-h-screen bg-cream lg:grid-cols-2">
    <div className="flex min-h-screen flex-col p-5 sm:p-10"><Brand /><div className="mx-auto my-auto w-full max-w-md py-12"><p className="eyebrow">{register ? "Start your free trial" : "Welcome back"}</p><h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{register ? "Build the page that moves customers." : "Good to see you again."}</h1><p className="mt-3 text-muted">{register ? "Create your account in less than two minutes." : "Log in to manage your business and customer requests."}</p>
      <form className="mt-8 space-y-5" onSubmit={submit}>
        {register && <><div><Label htmlFor="business">Business name</Label><Input id="business" required placeholder="e.g. Afrinaija Pots" /></div><div><Label htmlFor="owner">Your name</Label><Input id="owner" required placeholder="Your full name" /></div></>}
        <div><Label htmlFor="email">Email address</Label><Input id="email" required type="email" placeholder="you@business.com" /></div>
        <div><div className="flex justify-between"><Label htmlFor="password">Password</Label>{!register && <Link className="text-xs font-semibold text-violet" to="/login">Forgot password?</Link>}</div><div className="relative"><Input id="password" required minLength={6} type="password" placeholder={register ? "At least 6 characters" : "Your password"} /><Eye size={17} className="absolute right-4 top-3.5 text-muted" /></div></div>
        {error && <p role="alert" className="rounded-xl bg-coral-soft p-3 text-sm text-coral-dark">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">{loading ? "Please wait..." : register ? "Create account" : "Log in"} {!loading && <ArrowRight size={17} />}</Button>
      </form>
      <div className="my-6 flex items-center gap-4 text-xs text-muted"><i className="h-px flex-1 bg-line" />or continue with<i className="h-px flex-1 bg-line" /></div>
      <Button variant="secondary" className="w-full"><span className="font-bold text-[#4285F4]">G</span> Google</Button>
      <p className="mt-7 text-center text-sm text-muted">{register ? "Already have an account?" : "New to UbucuruziHub?"} <Link className="font-bold text-violet" to={register ? "/login" : "/register"}>{register ? "Log in" : "Create an account"}</Link></p>
    </div></div>
    <div className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between"><div className="absolute inset-0 subtle-grid opacity-20" /><div className="relative"><span className="grid size-12 place-items-center rounded-2xl bg-white/10"><LockKeyhole /></span><h2 className="mt-8 max-w-lg font-display text-5xl font-bold leading-tight">One place to turn interest into income.</h2></div><Card className="relative border-white/10 bg-white/10 p-7 text-white backdrop-blur"><p className="font-display text-xl font-semibold">“We know which services customers want before we even reply.”</p><div className="mt-6 flex items-center gap-2 text-sm text-white/60"><Check size={16} className="text-[#6ee7b7]" /> Structured requests, clear quotes, better follow-up.</div></Card></div>
  </div>;
}
