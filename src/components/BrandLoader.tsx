import { ArrowUpRight, Store } from "lucide-react";

type BrandLoaderProps = {
  title?: string;
  detail?: string;
  compact?: boolean;
  brandName?: string;
  logoUrl?: string | null;
};

export default function BrandLoader({
  title = "Getting your page ready",
  detail = "Connecting you with local businesses and customers.",
  compact = false,
  brandName,
  logoUrl,
}: BrandLoaderProps) {
  if (brandName) {
    return (
      <main className="business-page-loader" role="status" aria-live="polite" aria-label={`Loading ${brandName}`}>
        <div className="business-page-loader-wash" aria-hidden="true" />
        <div className="business-page-loader-content">
          <h1>{brandName}</h1>
          <div className="business-page-loader-track" aria-hidden="true"><span /></div>
        </div>
      </main>
    );
  }

  return (
    <div className={`brand-loader${compact ? " brand-loader-compact" : ""}`} role="status" aria-live="polite" aria-label={title}>
      <div className="brand-loader-glow brand-loader-glow-one" />
      <div className="brand-loader-glow brand-loader-glow-two" />
      <section className="brand-loader-card">
        <div className="brand-loader-mark" aria-hidden="true">
          <span className="brand-loader-orbit brand-loader-orbit-one" />
          <span className="brand-loader-orbit brand-loader-orbit-two" />
          <span className="brand-loader-icon">{logoUrl ? <img src={logoUrl} alt="" className="size-full rounded-[inherit] object-cover" /> : <Store size={25} strokeWidth={2.2} />}</span>
          <span className="brand-loader-spark"><ArrowUpRight size={12} strokeWidth={3} /></span>
        </div>
        <div className="brand-loader-wordmark">{brandName || <>e-business<span>Rw</span></>}</div>
        <div className="brand-loader-copy">
          <h1>{title}</h1>
          <p>{detail}</p>
        </div>
        <div className="brand-loader-track" aria-hidden="true"><span /></div>
        <div className="brand-loader-caption"><span /> A better way to grow your business</div>
      </section>
    </div>
  );
}
