export type CapabilityKey =
  | "products"
  | "product_orders"
  | "services"
  | "appointments"
  | "service_requests"
  | "portfolio"
  | "reviews"
  | "whatsapp_contact"
  | "contact_form"
  | "delivery"
  | "pickup";

export type PlannedCapabilityKey =
  | "inventory"
  | "rooms"
  | "accommodation_bookings"
  | "food_menu"
  | "food_orders"
  | "table_reservations"
  | "properties"
  | "property_inquiries"
  | "events"
  | "ticketing";

export interface CapabilityDefinition {
  key: CapabilityKey | PlannedCapabilityKey;
  label: string;
  description: string;
  status: "available" | "planned";
  dependsOn?: CapabilityKey[];
  requiresFulfillment?: boolean;
}

export type ProfileFieldType = "text" | "textarea" | "select" | "multiselect" | "boolean";

export interface ProfileField {
  key: string;
  label: string;
  type: ProfileFieldType;
  placeholder?: string;
  options?: string[];
  help?: string;
}

export interface BusinessSubtype {
  key: string;
  label: string;
}

export interface BusinessIndustry {
  key: string;
  label: string;
  description: string;
  examples: string;
  subtypes: BusinessSubtype[];
  recommended: CapabilityKey[];
  optional: CapabilityKey[];
  profileFields: ProfileField[];
}

export interface BusinessCatalog {
  industries: BusinessIndustry[];
  capabilities: CapabilityDefinition[];
}

export interface BusinessSetup {
  id: string;
  name: string;
  slug: string;
  description: string;
  tagline: string;
  highlights: string[];
  category: string;
  industryKey: string;
  subtype: string;
  capabilities: string[];
  profileData: Record<string, unknown> | null;
  websiteUrl: string | null;
  socialLinks: Record<string, string> | null;
  preferredLanguage: string;
  currency: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  openingHours: { display?: string } | null;
  onboardingStep: number;
  onboardingCompletedAt: string | null;
  publishedAt: string | null;
  isPublished: boolean;
  canPublishProducts: boolean;
  productAccessExpiresAt: string | null;
}

export type ProfileSectionKey = "identity" | "contact" | "description" | "location" | "images" | "details";

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

export interface ProfileCompletion {
  percentage: number;
  completedWeight: number;
  applicableWeight: number;
  isComplete: boolean;
  fields: ProfileCompletionField[];
  recommendations: ProfileCompletionField[];
  sections: ProfileCompletionSection[];
}

export interface PublicProfileDetail {
  key: string;
  label: string;
  value: string;
}

export const capabilityLabels: Record<string, string> = {
  products: "Product catalog",
  product_orders: "Online orders",
  services: "Services",
  appointments: "Appointments",
  service_requests: "Requests and quotes",
  portfolio: "Portfolio and gallery",
  reviews: "Reviews",
  whatsapp_contact: "WhatsApp contact",
  contact_form: "Contact form",
  delivery: "Delivery",
  pickup: "Pickup",
};
