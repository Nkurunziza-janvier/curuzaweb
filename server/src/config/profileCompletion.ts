import { getIndustry, getSubtype, type ProfileField } from "./businessCatalog.js";

export type ProfileSectionKey = "identity" | "contact" | "description" | "location" | "images" | "details";

export interface ProfileCompletionBusiness {
  name: string;
  industryKey: string;
  subtype: string;
  description: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  city: string | null;
  address: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  profileData: unknown;
}

export interface ProfileCompletionField {
  key: string;
  label: string;
  section: ProfileSectionKey;
  weight: number;
  done: boolean;
  recommendation: string;
  href: string;
}

export interface ProfileCompletionSection {
  key: ProfileSectionKey;
  label: string;
  percentage: number;
  completedWeight: number;
  applicableWeight: number;
}

export interface ProfileCompletionResult {
  percentage: number;
  completedWeight: number;
  applicableWeight: number;
  isComplete: boolean;
  fields: ProfileCompletionField[];
  recommendations: ProfileCompletionField[];
  sections: ProfileCompletionSection[];
}

const weights = {
  identity: 20,
  contact: 20,
  description: 15,
  location: 10,
  logo: 8,
  cover: 7,
  details: 20,
} as const;

const sectionLabels: Record<ProfileSectionKey, string> = {
  identity: "Business identity",
  contact: "Contact information",
  description: "Description",
  location: "Location or service area",
  images: "Logo and cover",
  details: "Business details",
};

const coreProfileFieldKeys: Record<string, string[]> = {
  accommodation: ["checkInTime", "checkOutTime", "amenities"],
  food: ["cuisine", "diningOptions"],
  retail: ["productCategories"],
  beauty: ["specialties"],
  health: ["servicesOffered"],
  professional: ["serviceArea", "portfolioFocus"],
  home_services: ["coverageAreas", "serviceMode"],
  automotive: ["vehicleTypes", "servicesOffered"],
  education: ["programs", "ageGroups"],
  fitness: ["facilities", "classTypes"],
  entertainment: ["eventTypes", "capacity"],
  real_estate: ["propertyTypes", "coverageAreas"],
  travel: ["destinations", "tripTypes"],
  agriculture: ["productsOffered"],
  technology: ["serviceOfferings", "engagementModels"],
  other: ["businessFocus", "serviceArea"],
};

const nonPhysicalIndustries = new Set(["professional", "technology"]);

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function profileRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function fieldFilled(field: ProfileField, value: unknown) {
  if (field.type === "boolean") return value === true;
  if (field.type === "multiselect") return Array.isArray(value) && value.some((item) => typeof item === "string" && item.trim().length > 0);
  return text(value).length > 0;
}

function locationLabel(industryKey: string) {
  if (industryKey === "accommodation") return "Property location";
  if (["home_services", "professional", "technology", "travel"].includes(industryKey)) return "Service area";
  return "Location";
}

function locationRecommendation(industryKey: string) {
  if (industryKey === "accommodation") return "Add the property location so guests know where to find you.";
  if (["home_services", "professional", "technology", "travel"].includes(industryKey)) return "Add your service area so customers know where you work.";
  return "Add your location so nearby customers can find you.";
}

function coreFields(industryKey: string, profileFields: ProfileField[]) {
  const keys = coreProfileFieldKeys[industryKey] ?? [];
  const selected = profileFields.filter((field) => keys.includes(field.key));
  return selected.length ? selected : profileFields.slice(0, 2);
}

function detailRecommendation(field: ProfileField) {
  return `Add ${field.label.toLowerCase()} so customers know what to expect.`;
}

function percentage(completed: number, applicable: number) {
  return applicable > 0 ? Math.round((completed / applicable) * 100) : 0;
}

export function calculateProfileCompletion(business: ProfileCompletionBusiness): ProfileCompletionResult {
  const industry = getIndustry(business.industryKey);
  const industryKey = industry?.key ?? "other";
  const data = profileRecord(business.profileData);
  const fields: ProfileCompletionField[] = [];

  const identityComplete = Boolean(
    business.name.trim()
    && industry
    && (industryKey === "other" ? business.subtype.trim() : getSubtype(industryKey, business.subtype)),
  );
  fields.push({
    key: "identity",
    label: "Business name and type",
    section: "identity",
    weight: weights.identity,
    done: identityComplete,
    recommendation: "Add your business name and choose the business type that fits you best.",
    href: "/dashboard/business-page?section=basics",
  });

  const contactComplete = Boolean(text(business.phone) || text(business.whatsapp) || text(business.email));
  fields.push({
    key: "contact",
    label: "Customer contact information",
    section: "contact",
    weight: weights.contact,
    done: contactComplete,
    recommendation: "Add a phone or WhatsApp number so customers can reach you.",
    href: "/dashboard/business-page?section=contact",
  });

  const descriptionComplete = text(business.description).length > 0;
  fields.push({
    key: "description",
    label: "Business description",
    section: "description",
    weight: weights.description,
    done: descriptionComplete,
    recommendation: "Add a description to help customers understand what you offer.",
    href: "/dashboard/business-page?section=description",
  });

  if (!nonPhysicalIndustries.has(industryKey)) {
    const area = text(data.serviceArea) || text(data.coverageAreas) || text(data.deliveryAreas) || text(data.destinations);
    fields.push({
      key: "location",
      label: locationLabel(industryKey),
      section: "location",
      weight: weights.location,
      done: Boolean(text(business.city) || text(business.address) || area),
      recommendation: locationRecommendation(industryKey),
      href: "/dashboard/business-page?section=location",
    });
  }

  fields.push({
    key: "logo",
    label: "Business logo",
    section: "images",
    weight: weights.logo,
    done: Boolean(text(business.logoUrl)),
    recommendation: "Upload a logo to make your business easier to recognise.",
    href: "/dashboard/business-page?section=images",
  });

  fields.push({
    key: "cover",
    label: "Cover image",
    section: "images",
    weight: weights.cover,
    done: Boolean(text(business.coverImageUrl)),
    recommendation: "Add a cover image to make your public page stand out.",
    href: "/dashboard/business-page?section=images",
  });

  const details = coreFields(industryKey, industry?.profileFields ?? []);
  if (details.length) {
    const detailWeight = weights.details / details.length;
    for (const field of details) {
      fields.push({
        key: `detail:${field.key}`,
        label: field.label,
        section: "details",
        weight: detailWeight,
        done: fieldFilled(field, data[field.key]),
        recommendation: detailRecommendation(field),
        href: "/dashboard/business-page?section=details",
      });
    }
  }

  const applicableWeight = fields.reduce((total, field) => total + field.weight, 0);
  const completedWeight = fields.filter((field) => field.done).reduce((total, field) => total + field.weight, 0);
  const sectionKeys = [...new Set(fields.map((field) => field.section))];
  const sections = sectionKeys.map((key) => {
    const sectionFields = fields.filter((field) => field.section === key);
    const sectionApplicable = sectionFields.reduce((total, field) => total + field.weight, 0);
    const sectionCompleted = sectionFields.filter((field) => field.done).reduce((total, field) => total + field.weight, 0);
    return {
      key,
      label: sectionLabels[key],
      percentage: percentage(sectionCompleted, sectionApplicable),
      completedWeight: sectionCompleted,
      applicableWeight: sectionApplicable,
    };
  });
  const recommendations = fields
    .filter((field) => !field.done)
    .sort((a, b) => b.weight - a.weight);
  const value = percentage(completedWeight, applicableWeight);

  return {
    percentage: value,
    completedWeight,
    applicableWeight,
    isComplete: value === 100,
    fields,
    recommendations,
    sections,
  };
}

export function publicProfileDetails(industryKey: string | null | undefined, profileData: unknown) {
  const industry = getIndustry(industryKey);
  if (!industry) return [];
  const data = profileRecord(profileData);
  return industry.profileFields.flatMap((field) => {
    const value = data[field.key];
    if (field.type === "boolean") return value === true ? [{ key: field.key, label: field.label, value: "Yes" }] : [];
    if (field.type === "multiselect") {
      const values = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
      return values.length ? [{ key: field.key, label: field.label, value: values.join(", ") }] : [];
    }
    const textValue = text(value);
    return textValue ? [{ key: field.key, label: field.label, value: textValue }] : [];
  });
}
