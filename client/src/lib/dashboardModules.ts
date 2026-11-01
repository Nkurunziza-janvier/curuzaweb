import { BarChart3, CalendarDays, CreditCard, FileText, Gift, LayoutDashboard, Package, PanelTop, Settings, ShoppingBag, ShoppingCart, Sparkles, SlidersHorizontal, Star, Users, type LucideIcon } from "lucide-react";
import { hasAnyCapability, type CapabilityKey } from "./capabilities";

export type DashboardGroupKey = "overview" | "customers" | "catalog" | "business" | "support";

export interface DashboardBusiness {
  industryKey?: string;
  subtype?: string;
  category?: string;
}

type DashboardBusinessInput = DashboardBusiness | null | undefined;

export interface DashboardModule {
  key: string;
  path: string;
  group: DashboardGroupKey;
  icon: LucideIcon;
  label: string;
  description: string;
  capabilities?: CapabilityKey[];
  anyCapabilities?: CapabilityKey[];
  industries?: string[];
  planned?: boolean;
  labelFor?: (business: DashboardBusinessInput) => string;
}

export const dashboardGroupLabels: Record<DashboardGroupKey, string> = {
  overview: "Overview",
  customers: "Customers",
  catalog: "Catalog",
  business: "Business",
  support: "Support",
};

function productLabel(business: DashboardBusinessInput) {
  if (business?.industryKey === "food") return "Menu";
  if (business?.industryKey === "automotive") return "Parts & products";
  if (business?.industryKey === "accommodation") return "Shop & extras";
  return "Products";
}

function orderLabel(business: DashboardBusinessInput) {
  if (business?.industryKey === "food") return "Food orders";
  if (business?.industryKey === "automotive") return "Parts orders";
  return "Orders";
}

function serviceLabel(business: DashboardBusinessInput) {
  if (business?.industryKey === "automotive") return "Repair services";
  if (business?.industryKey === "accommodation") return "Guest services";
  if (business?.industryKey === "real_estate") return "Advisory services";
  return "Services";
}

function bookingLabel(business: DashboardBusinessInput) {
  if (business?.industryKey === "professional") return "Consultations";
  if (business?.industryKey === "automotive") return "Scheduled jobs";
  if (business?.industryKey === "home_services") return "Visits";
  return "Appointments";
}

function requestLabel(business: DashboardBusinessInput) {
  if (business?.industryKey === "professional") return "Client inquiries";
  if (business?.industryKey === "real_estate") return "Property inquiries";
  if (business?.industryKey === "home_services" || business?.industryKey === "automotive") return "Service requests";
  if (business?.industryKey === "accommodation") return "Guest inquiries";
  return "Requests";
}

function customerLabel(business: DashboardBusinessInput) {
  if (business?.industryKey === "health") return "Patients";
  if (business?.industryKey === "beauty") return "Clients";
  if (business?.industryKey === "education") return "Students";
  if (business?.industryKey === "fitness") return "Members";
  if (business?.industryKey === "professional" || business?.industryKey === "real_estate") return "Clients";
  return "Customers";
}

export const dashboardModules: DashboardModule[] = [
  {
    key: "overview",
    path: "/dashboard",
    group: "overview",
    icon: LayoutDashboard,
    label: "Overview",
    description: "Your priorities, activity, and next steps.",
  },
  {
    key: "analytics",
    path: "/dashboard/analytics",
    group: "overview",
    icon: BarChart3,
    label: "Analytics",
    description: "See how customers discover and act on your page.",
  },
  {
    key: "orders",
    path: "/dashboard/orders",
    group: "customers",
    icon: ShoppingCart,
    label: "Orders",
    labelFor: orderLabel,
    description: "Manage incoming orders and fulfilment.",
    capabilities: ["product_orders"],
  },
  {
    key: "bookings",
    path: "/dashboard/bookings",
    group: "customers",
    icon: CalendarDays,
    label: "Bookings",
    labelFor: bookingLabel,
    description: "Manage scheduled appointments and availability.",
    capabilities: ["appointments"],
  },
  {
    key: "requests",
    path: "/dashboard/requests",
    group: "customers",
    icon: FileText,
    label: "Requests",
    labelFor: requestLabel,
    description: "Review inquiries and follow up with customers.",
    anyCapabilities: ["service_requests", "contact_form"],
  },
  {
    key: "quotes",
    path: "/dashboard/quotes",
    group: "customers",
    icon: Sparkles,
    label: "Quotes",
    description: "Create and track proposals for customer requests.",
    capabilities: ["service_requests"],
  },
  {
    key: "customers",
    path: "/dashboard/customers",
    group: "customers",
    icon: Users,
    label: "Customers",
    labelFor: customerLabel,
    description: "See everyone who has ordered, booked, or inquired.",
    anyCapabilities: ["product_orders", "appointments", "service_requests", "contact_form"],
  },
  {
    key: "reviews",
    path: "/dashboard/reviews",
    group: "customers",
    icon: Star,
    label: "Reviews",
    description: "Publish, hide, and respond to customer feedback.",
    capabilities: ["reviews"],
  },
  {
    key: "products",
    path: "/dashboard/products",
    group: "catalog",
    icon: Package,
    label: "Products",
    labelFor: productLabel,
    description: "Manage what customers can browse and order.",
    capabilities: ["products"],
  },
  {
    key: "services",
    path: "/dashboard/services",
    group: "catalog",
    icon: ShoppingBag,
    label: "Services",
    labelFor: serviceLabel,
    description: "Manage services, pricing, and booking details.",
    capabilities: ["services"],
  },
  {
    key: "offers",
    path: "/dashboard/offers",
    group: "catalog",
    icon: Gift,
    label: "Offers",
    description: "Run promotions for your products and services.",
    anyCapabilities: ["products", "services"],
  },
  {
    key: "business-page",
    path: "/dashboard/business-page",
    group: "business",
    icon: PanelTop,
    label: "Public website",
    description: "Edit the profile, contact details, and images customers see.",
  },
  {
    key: "features",
    path: "/dashboard/features",
    group: "business",
    icon: SlidersHorizontal,
    label: "Features & modules",
    description: "Choose which customer experiences are active.",
  },
  {
    key: "billing",
    path: "/dashboard/billing",
    group: "business",
    icon: CreditCard,
    label: "Plans & billing",
    description: "Manage your plan and subscription payments.",
  },
  {
    key: "settings",
    path: "/dashboard/settings",
    group: "business",
    icon: Settings,
    label: "Business profile",
    description: "Update your public business profile and publishing settings.",
  },
  {
    key: "assistant",
    path: "/dashboard/assistant",
    group: "support",
    icon: Sparkles,
    label: "AI Assistant",
    description: "Ask for help with publishing, quotes, and more.",
  },
];

export const plannedDashboardModules: DashboardModule[] = [
  {
    key: "rooms",
    path: "/dashboard/rooms",
    group: "customers",
    icon: CalendarDays,
    label: "Rooms & reservations",
    description: "Room inventory, availability, and accommodation reservations.",
    industries: ["accommodation"],
    planned: true,
  },
  {
    key: "food-menu",
    path: "/dashboard/food-menu",
    group: "catalog",
    icon: Package,
    label: "Restaurant menu",
    description: "Menus, table service, and food-specific ordering.",
    industries: ["food"],
    planned: true,
  },
  {
    key: "properties",
    path: "/dashboard/properties",
    group: "catalog",
    icon: PanelTop,
    label: "Property listings",
    description: "Property inventory, listing pages, and viewing requests.",
    industries: ["real_estate"],
    planned: true,
  },
  {
    key: "events",
    path: "/dashboard/events",
    group: "customers",
    icon: Sparkles,
    label: "Events & ticketing",
    description: "Event pages, ticket types, and attendee management.",
    industries: ["events", "entertainment"],
    planned: true,
  },
];

export function moduleLabel(module: DashboardModule, business: DashboardBusinessInput) {
  return module.labelFor?.(business) ?? module.label;
}

export function moduleByKey(key: string) {
  return dashboardModules.find((module) => module.key === key);
}

export function moduleIsVisible(module: DashboardModule, capabilities: string[] | null | undefined) {
  if (module.planned) return false;
  if (module.capabilities?.length && !hasAnyCapability(capabilities, module.capabilities)) return false;
  if (module.anyCapabilities?.length && !hasAnyCapability(capabilities, module.anyCapabilities)) return false;
  return true;
}

export function visibleDashboardModules(capabilities: string[] | null | undefined) {
  return dashboardModules.filter((module) => moduleIsVisible(module, capabilities));
}

export function visibleDashboardGroups(capabilities: string[] | null | undefined) {
  const modules = visibleDashboardModules(capabilities);
  return (Object.keys(dashboardGroupLabels) as DashboardGroupKey[])
    .map((group) => ({ group, label: dashboardGroupLabels[group], modules: modules.filter((module) => module.group === group) }))
    .filter((entry) => entry.modules.length > 0);
}

export function moduleForPath(pathname: string) {
  return dashboardModules
    .filter((module) => pathname === module.path || pathname.startsWith(`${module.path}/`))
    .sort((left, right) => right.path.length - left.path.length)[0];
}

export function plannedModulesForBusiness(business: DashboardBusinessInput) {
  return plannedDashboardModules.filter((module) => !module.industries?.length || module.industries.includes(business?.industryKey ?? ""));
}

