import { Input, Label, Select, Textarea } from "./ui";
import { useLanguage } from "../i18n";
import type { ProfileField } from "../types/business";

export function ProfileFieldInput({ field, value, onChange }: { field: ProfileField; value: unknown; onChange: (value: unknown) => void }) {
  const { t } = useLanguage();
  const id = `profile-${field.key}`;
  if (field.type === "boolean") return <label className="flex items-center gap-3 rounded-xl border border-line bg-white p-3 text-sm font-semibold sm:col-span-2"><input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-[#087553]" />{field.label}</label>;
  if (field.type === "textarea") return <div className="sm:col-span-2"><Label htmlFor={id}>{field.label}</Label><Textarea id={id} value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder} rows={3} /></div>;
  if (field.type === "select") return <div><Label htmlFor={id}>{field.label}</Label><Select id={id} value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)}><option value="">{t("Choose one")}</option>{(field.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}</Select></div>;
  if (field.type === "multiselect") {
    const selected = Array.isArray(value) ? value.map(String) : [];
    return <div className="sm:col-span-2"><p className="mb-2 text-sm font-bold">{field.label}</p><div className="flex flex-wrap gap-2">{(field.options ?? []).map((option) => {
      const checked = selected.includes(option);
      return <button key={option} type="button" onClick={() => onChange(checked ? selected.filter((item) => item !== option) : [...selected, option])} className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${checked ? "border-violet bg-violet text-white" : "border-line bg-white text-ink hover:border-violet"}`}>{option}</button>;
    })}</div></div>;
  }
  return <div><Label htmlFor={id}>{field.label}</Label><Input id={id} value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder} /></div>;
}
