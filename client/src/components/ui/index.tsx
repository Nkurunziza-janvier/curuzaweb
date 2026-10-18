import { LoaderCircle, Store } from "lucide-react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Link, type LinkProps } from "react-router";

export function Brand({ light = false, onClick }: { light?: boolean; onClick?: LinkProps["onClick"] }) {
  return (
    <Link to="/" onClick={onClick} aria-label="e-businessRw home" className={`inline-flex items-center gap-2.5 font-display text-lg font-bold tracking-tight ${light ? "text-white" : "text-ink"}`}>
      <span className="relative grid size-9 place-items-center rounded-xl bg-[#075b43] text-sm text-white shadow-sm"><span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-md bg-[#f18838] text-[9px] font-extrabold">e</span><Store size={18} strokeWidth={2.2} /></span>
      <span>e-business<span className={light ? "text-emerald-300" : "text-[#087553]"}>Rw</span></span>
    </Link>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "dark" | "white";
  icon?: ReactNode;
  loading?: boolean;
};
export function Button({ variant = "primary", icon, loading, className = "", children, ...props }: ButtonProps) {
  return (
    <button className={`btn btn-${variant} ${className}`} {...props}>
      {loading ? <LoaderCircle size={17} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}

type ButtonLinkProps = LinkProps & { variant?: ButtonProps["variant"]; icon?: ReactNode };
export function ButtonLink({ variant = "primary", icon, className = "", children, ...props }: ButtonLinkProps) {
  return <Link className={`btn btn-${variant} ${className}`} {...props}>{icon}{children}</Link>;
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function Heading({ as = "h2", eyebrow, children, className = "" }: { as?: "h1" | "h2" | "h3" | "h4"; eyebrow?: string; children: ReactNode; className?: string }) {
  const Tag = as;
  return <div className={className}>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<Tag className={`heading heading-${as}`}>{children}</Tag></div>;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "accent" | "violet" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`field ${props.className ?? ""}`} {...props} />;
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`field min-h-32 resize-none ${props.className ?? ""}`} {...props} />;
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`field ${props.className ?? ""}`} {...props} />;
}
export function Label({ children, htmlFor }: { children: ReactNode; htmlFor: string }) {
  return <label htmlFor={htmlFor} className="mb-2 block text-sm font-semibold text-ink">{children}</label>;
}

export function Stat({ label, value, note, icon }: { label: string; value: string; note?: string; icon?: ReactNode }) {
  return <Card className="p-5"><div className="flex items-start justify-between"><div><p className="text-sm text-muted">{label}</p><p className="mt-2 text-2xl font-bold tracking-tight text-ink">{value}</p>{note && <p className="mt-2 text-xs font-medium text-success">{note}</p>}</div>{icon && <span className="icon-tile">{icon}</span>}</div></Card>;
}
