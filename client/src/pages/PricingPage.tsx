import PricingSection from "./PricingSection";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { useLanguage } from "../i18n";

export default function PricingPage() {
  const { t } = useLanguage();
  useDocumentMeta({
    title: `${t("Simple publishing plans")} | e-businessRw`,
    description: t("Keep your business page and customer enquiries ready. Choose a plan to publish products and services."),
  });

  return (
    <div className="lz-page lz-pg">
      <PricingSection />
    </div>
  );
}
