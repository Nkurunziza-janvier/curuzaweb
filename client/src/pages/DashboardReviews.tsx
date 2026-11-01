import { Eye, EyeOff, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Card, Heading, Select, Stat } from "../components/ui";
import { queryKeys, useBusinessReviews, useCurrentUser } from "../hooks/apiHooks";
import { customerService } from "../services/api";
import type { BusinessReviewRecord, BusinessReviewsResponse } from "../types/dashboard";
import { useLanguage } from "../i18n";

function Stars({ rating }: { rating: number }) {
  return <span className="inline-flex items-center gap-0.5 text-[#f18838]" aria-label={`${rating} out of 5`}>{[1, 2, 3, 4, 5].map((value) => <Star key={value} size={14} fill={value <= rating ? "currentColor" : "none"} strokeWidth={1.8} />)}</span>;
}

export default function DashboardReviews() {
  const { t } = useLanguage();
  const { data: user } = useCurrentUser();
  const businessId = user?.business?.id;
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useBusinessReviews<BusinessReviewsResponse>(businessId);
  const [filter, setFilter] = useState<"ALL" | "PUBLISHED" | "HIDDEN">("ALL");

  const mutation = useMutation({
    mutationFn: ({ review, isPublished }: { review: BusinessReviewRecord; isPublished: boolean }) => customerService.setReviewPublished<BusinessReviewRecord>(review.id, isPublished),
    onSuccess: () => {
      if (businessId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.businessReviews(businessId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceSummary(businessId) });
        if (user?.business?.slug) void queryClient.invalidateQueries({ queryKey: queryKeys.publicBusiness(user.business.slug) });
      }
    },
  });

  const reviews = useMemo(() => (data?.reviews ?? []).filter((review) => filter === "ALL" || (filter === "PUBLISHED" ? review.isPublished : !review.isPublished)), [data?.reviews, filter]);

  return <div className="mx-auto max-w-6xl">
    <div><Heading as="h1">{t("Reviews")}</Heading><p className="mt-2 text-muted">{t("Manage the customer feedback shown on your public page.")}</p></div>
    {isError && <p role="alert" className="mt-5 rounded-xl bg-coral-soft p-3 text-sm text-coral-dark">{error instanceof Error ? error.message : t("Reviews could not be loaded")}</p>}
    {mutation.isError && <p role="alert" className="mt-5 rounded-xl bg-coral-soft p-3 text-sm text-coral-dark">{mutation.error instanceof Error ? mutation.error.message : t("The review could not be updated")}</p>}

    <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-3">
      <Stat label={t("Average rating")} value={isLoading ? "—" : data?.summary.average ? `${data.summary.average}/5` : "—"} icon={<Star size={18} />} />
      <Stat label={t("Published")} value={isLoading ? "—" : String(data?.summary.published ?? 0)} note={t("Visible on your page")} />
      <Stat label={t("Total reviews")} value={isLoading ? "—" : String(data?.summary.total ?? 0)} />
    </div>

    <Card className="mt-6 overflow-hidden">
      <div className="flex flex-col justify-between gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:p-5">
        <div><p className="font-display font-bold">{t("Customer feedback")}</p><p className="text-xs text-muted">{t("Hide a review to remove it from your public page without deleting it.")}</p></div>
        <Select className="sm:!w-52" value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} aria-label={t("Filter reviews")}>
          <option value="ALL">{t("All reviews")}</option>
          <option value="PUBLISHED">{t("Published")}</option>
          <option value="HIDDEN">{t("Hidden")}</option>
        </Select>
      </div>

      {isLoading ? <div className="space-y-3 p-5"><div className="skeleton h-24 rounded-xl" /><div className="skeleton h-24 rounded-xl" /></div>
        : !reviews.length ? <div className="p-10 text-center"><span className="mx-auto grid size-12 place-items-center rounded-full bg-[#f0f4ef] text-violet"><Star size={20} /></span><p className="mt-4 font-display text-lg font-bold">{t(filter === "ALL" ? "No reviews yet" : "No reviews match this filter")}</p><p className="mt-2 text-sm text-muted">{t("Customers can leave a review after a completed booking.")}</p></div>
          : <div className="divide-y divide-line">{reviews.map((review) => <article key={review.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><strong>{review.customerName}</strong><Stars rating={review.rating} />{review.isVerified && <Badge tone="success">{t("Verified")}</Badge>}{!review.isPublished && <Badge tone="neutral">{t("Hidden")}</Badge>}</div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{review.comment || t("No written comment.")}</p>
              <p className="mt-2 text-xs text-muted">{review.service?.name ? `${review.service.name} · ` : ""}{new Date(review.createdAt).toLocaleDateString()}</p>
            </div>
            <Button variant="secondary" className="shrink-0" loading={mutation.isPending && mutation.variables?.review.id === review.id} onClick={() => mutation.mutate({ review, isPublished: !review.isPublished })} icon={review.isPublished ? <EyeOff size={16} /> : <Eye size={16} />}>{review.isPublished ? t("Hide review") : t("Publish review")}</Button>
          </article>)}</div>}
    </Card>
  </div>;
}
