import { useState } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, CalendarDays, CheckCircle2, Clock3, Copy, MapPin, MessageCircle, Phone, Star, XCircle } from "lucide-react";
import { bookingService } from "../services/api";
import { usePublicBooking } from "../hooks/apiHooks";
import { Button, Card, Heading, Label, Textarea } from "../components/ui";
import BrandLoader from "../components/BrandLoader";
import { LanguageSwitcher, useLanguage } from "../i18n";
import type { BookingStatus, PublicBooking } from "../types/booking";

const statusTone: Record<BookingStatus, string> = {
  PENDING: "bg-[#fff7e7] text-[#8a5a12] border-[#f3dcae]",
  CONFIRMED: "bg-[#eaf8f1] text-[#076146] border-[#c1e7d7]",
  REJECTED: "bg-[#fff0ec] text-[#963f2c] border-[#f0cabe]",
  COMPLETED: "bg-[#eef4ff] text-[#31538c] border-[#cad9f4]",
  CANCELLED: "bg-[#f2f3f5] text-[#59636c] border-[#dfe3e8]",
  NO_SHOW: "bg-[#f7f0e9] text-[#795138] border-[#e6d4c4]",
};

const statusLabel: Record<BookingStatus, string> = {
  PENDING: "Awaiting confirmation",
  CONFIRMED: "Confirmed",
  REJECTED: "Not accepted",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "Missed appointment",
};

export default function BookingStatusPage() {
  const { t, locale } = useLanguage();
  const { publicToken } = useParams();
  const queryClient = useQueryClient();
  const { data: booking, isLoading, isError, error } = usePublicBooking<PublicBooking>(publicToken);
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState("");
  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const cancelMutation = useMutation({
    mutationFn: () => bookingService.cancelPublic<PublicBooking>(publicToken!, reason.trim() || undefined),
    onSuccess: (updated) => {
      queryClient.setQueryData(["public-booking", publicToken], updated);
      setShowCancel(false);
    },
  });
  const reviewMutation = useMutation({
    mutationFn: () => bookingService.reviewPublic<{ id: string; rating: number; comment: string; isVerified: boolean }>(publicToken!, rating, comment.trim()),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["public-booking", publicToken] }),
  });

  if (isLoading) return <BrandLoader />;
  if (isError || !booking) return <main className="grid min-h-screen place-items-center bg-[#f3f8f5] p-5"><div className="absolute right-5 top-5"><LanguageSwitcher compact /></div><Card className="max-w-lg p-8 text-center"><span className="mx-auto grid size-14 place-items-center rounded-full bg-[#fff0ec] text-[#b04a33]"><XCircle size={25} /></span><Heading as="h1" className="mt-4">{t("Booking link unavailable")}</Heading><p className="mt-3 text-sm text-muted">{error?.message ?? t("This private link is invalid or the booking no longer exists.")}</p><Link to="/" className="btn btn-secondary mt-6">{t("Back to e-businessRw")}</Link></Card></main>;

  const whatsappDigits = booking.business.whatsapp?.replace(/\D/g, "");
  const when = new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: booking.timezone }).format(new Date(booking.startAt));
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { setCopied(false); }
  };

  return <div className="min-h-screen bg-[#f3f8f5] pb-12 text-[#143d38]">
    <header className="border-b border-[#dce9e4] bg-white/90 backdrop-blur-xl"><div className="mx-auto flex min-h-16 max-w-4xl items-center justify-between gap-3 px-4 sm:px-6"><Link to={`/b/${booking.business.slug}`} className="inline-flex min-w-0 items-center gap-2 text-sm font-bold text-[#2b5b53] hover:text-[#087553]"><ArrowLeft size={16} /><span className="truncate">{booking.business.name}</span></Link><LanguageSwitcher compact /></div></header>

    <main className="mx-auto max-w-4xl px-4 py-7 sm:px-6 sm:py-10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#4a8b78]">{t("Private booking")} · {booking.bookingNumber}</p><Heading as="h1" className="mt-1">{t("Your appointment")}</Heading></div><span className={`rounded-full border px-3 py-1.5 text-[11px] font-extrabold ${statusTone[booking.status]}`}>{t(statusLabel[booking.status])}</span></div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Card className="p-5 sm:p-6">
            <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#eaf7f1] text-[#087553]"><CalendarDays size={21} /></span><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#6b8d82]">{t("When")}</p><p className="mt-1 font-display text-lg font-bold leading-6">{when}</p><p className="mt-1 text-xs text-muted">{booking.timezone} · {booking.durationMinutes} {t("minutes")}</p></div></div>
            <div className="mt-4 grid gap-3 border-t border-[#eef3f0] pt-4 sm:grid-cols-2"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#6b8d82]">{t("Service")}</p><p className="mt-1 text-sm font-bold">{booking.service.name}</p>{booking.service.description && <p className="mt-1 text-xs leading-5 text-muted">{booking.service.description}</p>}</div><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#6b8d82]">{t("Booking reference")}</p><p className="mt-1 text-sm font-bold">{booking.bookingNumber}</p><p className="mt-1 text-xs text-muted">{booking.status === "PENDING" ? t("The business has been notified in their dashboard.") : booking.status === "CONFIRMED" ? t("Bring this reference if you need help.") : ""}</p></div></div>
            {booking.customerNote && <div className="mt-4 rounded-xl bg-[#f7faf8] p-3 text-xs leading-5 text-[#58716d]"><strong className="text-[#315c56]">{t("Your note")}:</strong> {booking.customerNote}</div>}
            {booking.cancellationReason && <p className="mt-3 rounded-xl bg-[#f7f2ef] p-3 text-xs text-[#795138]">{booking.cancellationReason}</p>}
          </Card>

          {booking.review && <Card className="p-5 sm:p-6"><p className="flex items-center gap-2 text-sm font-bold"><BadgeCheck size={17} className="text-[#0a8a63]" />{t("Your verified review")}</p><div className="mt-3 flex text-amber-400">{Array.from({ length: 5 }).map((_, index) => <Star key={index} size={17} className={index < booking.review!.rating ? "fill-current" : "opacity-25"} />)}</div>{booking.review.comment && <p className="mt-2 text-sm leading-6 text-[#4f6a64]">{booking.review.comment}</p>}<p className="mt-2 text-[10px] text-muted">{t("Submitted")} {new Date(booking.review.createdAt).toLocaleDateString()}</p></Card>}

          {booking.canReview && <Card className="border-[#c9e9db] p-5 sm:p-6"><p className="flex items-center gap-2 text-sm font-bold"><Star size={17} className="text-[#d49224]" />{t("How was your appointment?")}</p><p className="mt-1 text-xs leading-5 text-muted">{t("Your review will show a verified badge because it is linked to this completed booking.")}</p><div className="mt-3 flex gap-1">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} stars`} className="grid size-10 place-items-center rounded-lg hover:bg-[#fff8e8]"><Star size={24} className={value <= rating ? "fill-amber-400 text-amber-400" : "text-[#cabf9f]"} /></button>)}</div><div className="mt-3"><Label htmlFor="review-comment">{t("Comment")}</Label><Textarea id="review-comment" value={comment} onChange={(event) => setComment(event.target.value)} maxLength={2000} className="min-h-24" placeholder={t("Tell other customers about your experience (optional)")} /></div>{reviewMutation.isError && <p className="mt-3 rounded-xl bg-[#fff3ef] p-3 text-xs text-[#9a3d2c]">{reviewMutation.error.message}</p>}{reviewMutation.isSuccess && <p className="mt-3 flex items-center gap-2 rounded-xl bg-[#eef9f3] p-3 text-xs font-semibold text-[#076146]"><CheckCircle2 size={15} />{t("Thank you. Your verified review is now published.")}</p>}<Button className="mt-4" loading={reviewMutation.isPending} disabled={reviewMutation.isPending || reviewMutation.isSuccess} onClick={() => reviewMutation.mutate()}>{t("Submit review")}</Button></Card>}

          {booking.canCancel && <Card className="p-5 sm:p-6"><p className="text-sm font-bold">{t("Need to change your plans?")}</p><p className="mt-1 text-xs leading-5 text-muted">{t("You can cancel online up to the business's cancellation cutoff. After that, contact them directly.")}</p>{showCancel ? <div className="mt-4"><Label htmlFor="cancel-reason">{t("Reason (optional)")}</Label><Textarea id="cancel-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} className="min-h-20" placeholder={t("Let the business know why you need to cancel.")} />{cancelMutation.isError && <p className="mt-3 rounded-xl bg-[#fff3ef] p-3 text-xs text-[#9a3d2c]">{cancelMutation.error.message}</p>}<div className="mt-3 flex gap-2"><Button variant="secondary" onClick={() => setShowCancel(false)}>{t("Keep booking")}</Button><Button loading={cancelMutation.isPending} onClick={() => cancelMutation.mutate()} className="!bg-[#a24934] hover:!bg-[#8d3d2a]">{t("Confirm cancellation")}</Button></div></div> : <Button variant="secondary" className="mt-4" onClick={() => setShowCancel(true)}>{t("Cancel appointment")}</Button>}</Card>}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card className="p-5"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#6b8d82]">{t("Business")}</p><h2 className="mt-1 font-display text-lg font-bold">{booking.business.name}</h2><div className="mt-3 space-y-2 text-xs text-[#4e6a63]">{[booking.business.address, booking.business.city, booking.business.country].filter(Boolean).length > 0 && <p className="flex items-start gap-2"><MapPin size={14} className="mt-0.5 shrink-0 text-[#0b8661]" />{[booking.business.address, booking.business.city, booking.business.country].filter(Boolean).join(", ")}</p>}{booking.business.phone && <a href={`tel:${booking.business.phone}`} className="flex items-center gap-2 hover:text-[#087553]"><Phone size={14} className="text-[#0b8661]" />{booking.business.phone}</a>}</div><div className="mt-4 grid gap-2">{whatsappDigits && <a href={`https://wa.me/${whatsappDigits}`} target="_blank" rel="noreferrer" className="btn btn-secondary !min-h-10 text-xs"><MessageCircle size={15} />{t("Contact on WhatsApp")}</a>}{booking.business.phone && <a href={`tel:${booking.business.phone}`} className="btn btn-ghost !min-h-10 text-xs"><Phone size={15} />{t("Call business")}</a>}</div></Card>
          <div className="rounded-2xl border border-[#dbeae4] bg-white p-4"><p className="flex items-center gap-2 text-xs font-bold text-[#234f49]"><Clock3 size={14} className="text-[#0b8661]" />{t("Keep this link")}</p><p className="mt-2 text-[11px] leading-5 text-[#6b817a]">{t("Bookmark this private page to check updates. Anyone with the link can view this booking, so do not share it publicly.")}</p><Button variant="secondary" className="mt-3 !min-h-9 w-full text-[11px]" onClick={() => void copyLink()} icon={<Copy size={13} />}>{copied ? t("Copied") : t("Copy private link")}</Button></div>
        </aside>
      </div>
    </main>
  </div>;
}
