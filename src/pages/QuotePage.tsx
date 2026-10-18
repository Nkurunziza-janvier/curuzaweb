import { BadgeCheck, Check, Download, MessageCircle, Send, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { quoteService, resolveAssetUrl } from "../services/api";
import { Badge, Brand, Button, Card } from "../components/ui";
import { LanguageSwitcher, useLanguage } from "../i18n";

type QuoteStatus = "SENT" | "VIEWED" | "ACCEPTED" | "REJECTED" | "CHANGE_REQUESTED" | "EXPIRED";
interface QuoteMessage {
  id: string;
  senderType: "CUSTOMER" | "BUSINESS";
  message: string;
  createdAt: string;
}
interface PublicQuote {
  quoteNumber: string;
  subtotal: number | string;
  discount: number | string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number | string;
  depositAmount: number | string;
  total: number | string;
  currency: string;
  validUntil: string;
  estimatedCompletionDate: string | null;
  paymentTerms: string;
  notes: string;
  status: QuoteStatus;
  createdAt: string;
  acceptedAt: string | null;
  rejectedAt: string | null;
  items: Array<{ id: string; name: string; description: string; quantity: number | string; unitPrice: number | string; total: number | string }>;
  messages: QuoteMessage[];
  business: { name: string; slug: string; logoUrl: string | null; phone: string | null; whatsapp: string | null; email: string | null };
  request: { requestNumber: string; requestType: string; description: string; location: string | null; preferredDate: string | null; answers: Array<{ label: string; value: unknown }> };
}

const money = (amount: number | string, currency: string) => `${currency} ${Number(amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function QuotePage() {
  const { t } = useLanguage();
  const { publicToken = "" } = useParams();
  const [quote, setQuote] = useState<PublicQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [messageMode, setMessageMode] = useState<"changes" | "question" | null>(null);
  const [confirmAction, setConfirmAction] = useState<"accept" | "reject" | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!publicToken) return;
    void quoteService.getPublic<PublicQuote>(publicToken)
      .then(setQuote)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Quote could not be loaded"))
      .finally(() => setLoading(false));
  }, [publicToken]);

  const respond = async (action: "accept" | "reject" | "changes") => {
    if (!publicToken) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (action === "accept" || action === "reject") {
        const result = action === "accept"
          ? await quoteService.accept<{ status: QuoteStatus }>(publicToken)
          : await quoteService.reject<{ status: QuoteStatus }>(publicToken, message.trim() || undefined);
        setQuote((current) => current ? { ...current, status: result.status } : current);
        setNotice(action === "accept" ? "Your acceptance has been recorded." : "Your decision has been sent to the business.");
        setConfirmAction(null);
      } else {
        const result = await quoteService.requestChanges<{ status: QuoteStatus }>(publicToken, message);
        setQuote((current) => current ? {
          ...current,
          status: result.status,
          messages: [...current.messages, { id: crypto.randomUUID(), senderType: "CUSTOMER", message, createdAt: new Date().toISOString() }],
        } : current);
        setNotice("Your change request has been sent to the business.");
        setMessageMode(null);
        setMessage("");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your response could not be submitted");
    } finally {
      setBusy(false);
    }
  };

  const sendQuestion = async () => {
    if (!publicToken || !message.trim()) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const saved = await quoteService.addCustomerMessage<QuoteMessage>(publicToken, message.trim());
      setQuote((current) => current ? { ...current, messages: [...current.messages, saved] } : current);
      setMessage("");
      setMessageMode(null);
      setNotice("Your message has been sent to the business.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your message could not be sent");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#f4f1eb]"><div className="skeleton h-12 w-48 rounded-2xl" aria-label="Loading quote" /></div>;
  if (!quote) return <main className="grid min-h-screen place-items-center bg-[#f4f1eb] p-5"><Card className="max-w-lg p-8 text-center"><h1 className="font-display text-2xl font-bold">Quote unavailable</h1><p className="mt-3 text-muted">{error || "This quote was not found or is no longer available."}</p></Card></main>;

  const canRespond = quote.status === "SENT" || quote.status === "VIEWED" || quote.status === "CHANGE_REQUESTED";
  const awaitingRevision = quote.status === "CHANGE_REQUESTED";
  const successful = quote.status === "ACCEPTED";
  const statusLabel: Record<QuoteStatus, string> = {
    SENT: "Ready for review", VIEWED: "Ready for review", ACCEPTED: "Accepted",
    REJECTED: "Rejected", CHANGE_REQUESTED: "Changes requested", EXPIRED: "Expired",
  };
  const whatsapp = quote.business.whatsapp?.replace(/\D/g, "");
  const attachments = quote.request.answers.flatMap((answer, index) =>
    typeof answer.value === "string" && answer.value.startsWith("/uploads/")
      ? [{ key: `${answer.label}-${index}`, label: answer.label, url: resolveAssetUrl(answer.value) }]
      : [],
  );

  return (
    <div className="min-h-screen bg-[#f4f1eb] py-4 sm:py-10">
      <div className="shell max-w-4xl">
        <div className="mb-5 flex items-center justify-between"><Brand /><LanguageSwitcher compact /><Button variant="ghost" onClick={() => window.print()} icon={<Download size={16} />}>{t("Print quote")}</Button></div>
        <Card className="overflow-hidden shadow-float">
          <header className="bg-ink p-7 text-white sm:p-10">
            <div className="flex flex-col justify-between gap-8 sm:flex-row">
              <div>
                <div className="flex items-center gap-3"><span className="grid size-12 place-items-center overflow-hidden rounded-xl bg-coral font-bold">{quote.business.logoUrl ? <img src={resolveAssetUrl(quote.business.logoUrl)} alt="" className="size-full object-cover" /> : quote.business.name.slice(0, 2).toUpperCase()}</span><div><p className="font-display font-bold">{quote.business.name}</p><p className="text-xs text-white/60">{t("Prepared for you")} <BadgeCheck size={12} className="inline" /></p></div></div>
                <h1 className="mt-9 font-display text-3xl font-bold sm:text-4xl">{t("Price quotation")}</h1>
                <p className="mt-2 text-white/70">{quote.request.requestType}</p>
              </div>
              <div className="sm:text-right"><Badge tone={successful ? "success" : canRespond ? "warning" : "neutral"}>{statusLabel[quote.status]}</Badge><p className="mt-5 text-sm text-white/60">{t("Quote number")}</p><p className="font-display text-xl font-bold">#{quote.quoteNumber}</p><p className="mt-3 text-xs text-white/55">Issued {new Date(quote.createdAt).toLocaleDateString()}</p><p className="mt-1 text-xs text-white/55">Valid until {new Date(quote.validUntil).toLocaleDateString()}</p></div>
            </div>
          </header>
          <div className="space-y-8 p-5 sm:p-10">
            <section className="grid gap-5 rounded-2xl border border-line bg-[#faf9f6] p-5 sm:grid-cols-2">
              <div><p className="text-xs font-bold uppercase tracking-wider text-muted">{t("Request")}</p><p className="mt-2 font-semibold">{quote.request.requestType} · #{quote.request.requestNumber}</p>{quote.request.description && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">{quote.request.description}</p>}</div>
              <div className="space-y-2 text-sm"><p className="text-xs font-bold uppercase tracking-wider text-muted">{t("Business contact")}</p>{quote.business.phone && <a className="block font-semibold text-violet" href={`tel:${quote.business.phone}`}>{quote.business.phone}</a>}{quote.business.email && <a className="block break-all font-semibold text-violet" href={`mailto:${quote.business.email}`}>{quote.business.email}</a>}{whatsapp && <a className="inline-flex items-center gap-1 font-semibold text-violet" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a>}</div>
              {(quote.request.location || quote.request.preferredDate || quote.estimatedCompletionDate) && <div className="text-sm sm:col-span-2"><div className="flex flex-wrap gap-x-6 gap-y-2">{quote.request.location && <span><strong>{t("Location")}:</strong> {quote.request.location}</span>}{quote.request.preferredDate && <span><strong>{t("Requested date")}:</strong> {new Date(quote.request.preferredDate).toLocaleDateString()}</span>}{quote.estimatedCompletionDate && <span><strong>{t("Estimated completion")}:</strong> {new Date(quote.estimatedCompletionDate).toLocaleDateString()}</span>}</div></div>}
            </section>
            {attachments.length > 0 && <section><h2 className="font-display text-lg font-bold">{t("Customer attachments")}</h2><div className="mt-3 flex flex-wrap gap-3">{attachments.map((attachment) => <a key={attachment.key} href={attachment.url} target="_blank" rel="noreferrer" className="rounded-xl border border-line px-4 py-3 text-sm font-semibold text-violet hover:bg-violet-soft">{attachment.label} · View attachment</a>)}</div></section>}
            <section>
              <h2 className="mb-4 font-display text-lg font-bold">{t("Itemized estimate")}</h2>
              <div className="hidden overflow-x-auto sm:block"><table className="w-full text-left"><thead><tr className="border-b border-line text-xs uppercase tracking-wider text-muted"><th className="pb-3 font-semibold">{t("Description")}</th><th className="pb-3 text-right font-semibold">{t("Quantity")}</th><th className="pb-3 text-right font-semibold">{t("Unit price")}</th><th className="pb-3 text-right font-semibold">{t("Amount")}</th></tr></thead><tbody>{quote.items.map((item) => <tr key={item.id} className="border-b border-line"><td className="py-4 font-semibold">{item.name}{item.description && <span className="mt-1 block text-sm font-normal text-muted">{item.description}</span>}</td><td className="py-4 text-right text-muted">{Number(item.quantity).toLocaleString()}</td><td className="py-4 text-right text-muted">{money(item.unitPrice, quote.currency)}</td><td className="py-4 text-right font-semibold">{money(item.total, quote.currency)}</td></tr>)}</tbody></table></div>
              <div className="space-y-3 sm:hidden">{quote.items.map((item) => <article key={item.id} className="rounded-xl border border-line p-4"><div className="flex justify-between gap-3"><strong>{item.name}</strong><strong>{money(item.total, quote.currency)}</strong></div>{item.description && <p className="mt-1 text-sm text-muted">{item.description}</p>}<p className="mt-2 text-xs text-muted">{Number(item.quantity).toLocaleString()} × {money(item.unitPrice, quote.currency)}</p></article>)}</div>
              <div className="mt-6 ml-auto w-full max-w-sm space-y-2">
                <div className="flex justify-between text-sm text-muted"><span>{t("Subtotal")}</span><span>{money(quote.subtotal, quote.currency)}</span></div>
                {Number(quote.discount) > 0 && <div className="flex justify-between text-sm text-muted"><span>Discount {quote.discountType === "PERCENTAGE" ? `(${Number(quote.discountValue)}%)` : ""}</span><span>−{money(quote.discount, quote.currency)}</span></div>}
                <div className="mt-3 border-t border-ink pt-4"><div className="flex items-end justify-between"><span className="font-bold">{t("Total")}</span><span className="font-display text-3xl font-bold">{money(quote.total, quote.currency)}</span></div></div>
                {Number(quote.depositAmount) > 0 && <div className="flex justify-between text-sm"><span>{t("Deposit required")}</span><strong>{money(quote.depositAmount, quote.currency)}</strong></div>}
              </div>
            </section>
            {(quote.paymentTerms || quote.notes) && <section className="grid gap-4 sm:grid-cols-2">{quote.paymentTerms && <div className="rounded-xl bg-[#f7f6f2] p-5"><h2 className="text-sm font-bold">{t("Payment terms")}</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">{quote.paymentTerms}</p></div>}{quote.notes && <div className="rounded-xl bg-[#f7f6f2] p-5"><h2 className="text-sm font-bold">{t("Notes and conditions")}</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">{quote.notes}</p></div>}</section>}
            {quote.messages.length > 0 && <section><h2 className="font-display text-lg font-bold">{t("Conversation")}</h2><div className="mt-3 space-y-3">{quote.messages.map((entry) => <div key={entry.id} className={`rounded-xl p-4 ${entry.senderType === "BUSINESS" ? "bg-violet-soft/60" : "bg-[#f7f6f2]"}`}><div className="flex justify-between gap-3 text-xs text-muted"><strong>{entry.senderType === "BUSINESS" ? quote.business.name : "You"}</strong><time>{new Date(entry.createdAt).toLocaleString()}</time></div><p className="mt-2 whitespace-pre-wrap text-sm">{entry.message}</p></div>)}</div></section>}
            {notice && <p role="status" className="rounded-xl bg-success-soft p-4 text-sm font-semibold text-success">{notice}</p>}
            {error && <p role="alert" className="rounded-xl bg-coral-soft p-4 text-sm text-coral-dark">{error}</p>}
            {messageMode && canRespond && <section className="rounded-2xl border border-line p-5"><label htmlFor="quote-message" className="block text-sm font-semibold">{messageMode === "changes" ? "What would you like changed?" : "Ask the business a question"}</label><textarea id="quote-message" className="field mt-2 min-h-28 resize-y" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} /><div className="mt-3 flex flex-wrap justify-end gap-2"><Button variant="ghost" disabled={busy} onClick={() => { setMessageMode(null); setMessage(""); }}>{t("Cancel")}</Button><Button disabled={!message.trim() || busy} loading={busy} onClick={() => void (messageMode === "changes" ? respond("changes") : sendQuestion())} icon={<Send size={16} />}>{messageMode === "changes" ? "Send change request" : "Send question"}</Button></div></section>}
            <footer className="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:justify-end">
              {successful ? <div className="flex items-center gap-3 rounded-xl bg-success-soft px-5 py-3 font-bold text-success"><Check /> Quote accepted — thank you</div>
                : quote.status === "REJECTED" ? <p className="rounded-xl bg-[#f7f6f2] px-5 py-3 text-sm font-semibold text-muted">You declined this quote.</p>
                  : canRespond ? <>{awaitingRevision && <p className="w-full text-sm text-muted">The business is preparing a revised quote.</p>}<Button variant="secondary" disabled={busy} onClick={() => { setMessageMode("question"); setMessage(""); }} icon={<MessageCircle size={17} />}>Ask a question</Button><Button variant="secondary" disabled={busy} onClick={() => { setMessageMode("changes"); setMessage(""); }}>Request changes</Button><Button variant="secondary" disabled={busy} onClick={() => setConfirmAction("reject")}>Decline quote</Button>{!awaitingRevision && <Button disabled={busy} onClick={() => setConfirmAction("accept")} icon={<Check size={17} />}>Accept quote</Button>}</>
                    : <p className="text-sm text-muted">{quote.status === "EXPIRED" ? "This quote has expired. Contact the business if you need an updated estimate." : "This quote is no longer accepting responses."}</p>}
            </footer>
            <p className="flex items-center justify-center gap-2 text-center text-xs text-muted"><ShieldCheck size={14} /> Acceptance confirms agreement to the quoted work and price; it does not record a payment.</p>
          </div>
        </Card>
      </div>
      {confirmAction && <div className="fixed inset-0 z-[1000] grid place-items-center bg-ink/55 p-4" role="presentation"><div role="dialog" aria-modal="true" aria-labelledby="quote-confirm-title" className="w-full max-w-md"><Card className="p-6"><h2 id="quote-confirm-title" className="font-display text-xl font-bold">{confirmAction === "accept" ? "Accept this quote?" : "Decline this quote?"}</h2><p className="mt-2 text-sm leading-relaxed text-muted">{confirmAction === "accept" ? "Your acceptance will be recorded and shared with the business. This does not process a payment." : "The business will be notified that you declined this proposal."}</p>{confirmAction === "reject" && <div className="mt-4"><label htmlFor="decline-reason" className="text-sm font-semibold">Reason (optional)</label><textarea id="decline-reason" className="field mt-2 min-h-20 resize-y" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} /></div>}<div className="mt-6 flex justify-end gap-2"><Button variant="secondary" disabled={busy} onClick={() => setConfirmAction(null)}>Go back</Button><Button variant={confirmAction === "reject" ? "secondary" : "primary"} loading={busy} disabled={busy} onClick={() => void respond(confirmAction)}>{confirmAction === "accept" ? "Yes, accept quote" : "Yes, decline quote"}</Button></div></Card></div></div>}
    </div>
  );
}
