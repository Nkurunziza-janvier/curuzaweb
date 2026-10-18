import { ImagePlus, Upload, X } from "lucide-react";
import { useState } from "react";
import { resolveAssetUrl, uploadService } from "../services/api";
import { useLanguage } from "../i18n";

export function ImageUploadField({
  title,
  description,
  value,
  onChange,
  shape = "wide",
}: {
  title: string;
  description: string;
  value: string;
  onChange: (url: string) => void;
  shape?: "square" | "wide";
}) {
  const { t } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const imageUrl = resolveAssetUrl(value);

  const chooseImage = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setError(t("Choose a JPEG, PNG, WebP, or GIF image."));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError(t("Choose an image smaller than 8 MB."));
      return;
    }
    setUploading(true);
    try {
      const result = await uploadService.upload(file);
      onChange(result.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("Image upload failed. Please try again."));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-3">
        <div><h3 className="text-sm font-bold">{title}</h3><p className="mt-1 text-xs leading-relaxed text-muted">{description}</p></div>
        {value && <button type="button" onClick={() => onChange("")} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-muted hover:text-coral"><X size={14} /> {t("Remove")}</button>}
      </div>
      <label className={`group relative flex cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#d8d3c9] bg-[#faf9f6] transition hover:border-violet hover:bg-violet-soft/30 ${shape === "square" ? "aspect-square max-h-52" : "aspect-[16/7] w-full"}`} aria-label={`Upload ${title.toLowerCase()}`}>
        {imageUrl
          ? <><img src={imageUrl} alt={`${title} ${t("preview")}`} className={`size-full ${shape === "square" ? "object-contain p-4" : "object-cover"}`} /><span className="absolute inset-0 flex items-center justify-center gap-2 bg-ink/45 text-sm font-bold text-white opacity-0 transition group-hover:opacity-100"><Upload size={16} /> {t("Change image")}</span></>
          : <span className="flex flex-col items-center text-center"><span className="grid size-11 place-items-center rounded-2xl bg-white text-violet shadow-sm"><ImagePlus size={19} /></span><span className="mt-3 text-sm font-bold text-ink">{uploading ? t("Uploading image…") : t("Choose an image")}</span><span className="mt-1 text-xs text-muted">{t("Browse files on your device")}</span></span>}
        <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploading} onChange={(event) => { void chooseImage(event.target.files?.[0]); event.currentTarget.value = ""; }} />
        {uploading && <span className="absolute inset-0 grid place-items-center bg-white/75 text-sm font-bold">{t("Uploading…")}</span>}
      </label>
      {error && <p role="alert" className="mt-2 text-xs text-coral-dark">{error}</p>}
    </div>
  );
}
