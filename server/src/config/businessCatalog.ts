export const availableCapabilityKeys = [
  "products",
  "product_orders",
  "services",
  "appointments",
  "service_requests",
  "portfolio",
  "reviews",
  "whatsapp_contact",
  "contact_form",
  "delivery",
  "pickup",
] as const;

export const plannedCapabilityKeys = [
  "inventory",
  "rooms",
  "accommodation_bookings",
  "food_menu",
  "food_orders",
  "table_reservations",
  "properties",
  "property_inquiries",
  "events",
  "ticketing",
] as const;

export type CapabilityKey = typeof availableCapabilityKeys[number];
export type PlannedCapabilityKey = typeof plannedCapabilityKeys[number];

export interface CapabilityDefinition {
  key: CapabilityKey | PlannedCapabilityKey;
  label: string;
  description: string;
  status: "available" | "planned";
  dependsOn?: CapabilityKey[];
  requiresFulfillment?: boolean;
}

export const capabilityDefinitions: Record<CapabilityKey | PlannedCapabilityKey, CapabilityDefinition> = {
  products: {
    key: "products",
    label: "Product catalog",
    description: "Show a browsable list of products with photos, prices, and descriptions.",
    status: "available",
  },
  product_orders: {
    key: "product_orders",
    label: "Online orders",
    description: "Let customers build a basket and send an order for pickup or delivery.",
    status: "available",
    dependsOn: ["products"],
    requiresFulfillment: true,
  },
  services: {
    key: "services",
    label: "Services",
    description: "Present the services you offer with descriptions, prices, and photos.",
    status: "available",
  },
  appointments: {
    key: "appointments",
    label: "Appointments",
    description: "Publish available times and let customers book a service online.",
    status: "available",
    dependsOn: ["services"],
  },
  service_requests: {
    key: "service_requests",
    label: "Customer requests and quotes",
    description: "Collect detailed requests and respond with a professional quote.",
    status: "available",
  },
  portfolio: {
    key: "portfolio",
    label: "Portfolio and gallery",
    description: "Showcase work through a gallery built from your catalog images.",
    status: "available",
  },
  reviews: {
    key: "reviews",
    label: "Reviews",
    description: "Display verified customer reviews and your average rating.",
    status: "available",
  },
  whatsapp_contact: {
    key: "whatsapp_contact",
    label: "WhatsApp contact",
    description: "Show a WhatsApp chat button on your public page.",
    status: "available",
  },
  contact_form: {
    key: "contact_form",
    label: "Contact and request form",
    description: "Give customers a simple way to send a message or request.",
    status: "available",
  },
  delivery: {
    key: "delivery",
    label: "Delivery",
    description: "Offer delivery as a fulfillment option for product orders.",
    status: "available",
    dependsOn: ["products", "product_orders"],
  },
  pickup: {
    key: "pickup",
    label: "Pickup",
    description: "Offer pickup as a fulfillment option for product orders.",
    status: "available",
    dependsOn: ["products", "product_orders"],
  },
  inventory: {
    key: "inventory",
    label: "Inventory tracking",
    description: "Stock counts, low-stock alerts, and automatic availability. Planned for a future release.",
    status: "planned",
  },
  rooms: {
    key: "rooms",
    label: "Rooms",
    description: "Room types, rates, and availability. Planned for a future release.",
    status: "planned",
  },
  accommodation_bookings: {
    key: "accommodation_bookings",
    label: "Accommodation bookings",
    description: "Nightly stays with check-in and check-out dates. Planned for a future release.",
    status: "planned",
  },
  food_menu: {
    key: "food_menu",
    label: "Food menu",
    description: "A dedicated menu with dishes, options, and modifiers. Planned for a future release.",
    status: "planned",
  },
  food_orders: {
    key: "food_orders",
    label: "Food orders",
    description: "Kitchen-ready food ordering with preparation states. Planned for a future release.",
    status: "planned",
  },
  table_reservations: {
    key: "table_reservations",
    label: "Table reservations",
    description: "Reserve tables by party size and time slot. Planned for a future release.",
    status: "planned",
  },
  properties: {
    key: "properties",
    label: "Property listings",
    description: "List properties for sale or rent with structured details. Planned for a future release.",
    status: "planned",
  },
  property_inquiries: {
    key: "property_inquiries",
    label: "Property inquiries",
    description: "Capture structured inquiries and schedule viewings. Planned for a future release.",
    status: "planned",
  },
  events: {
    key: "events",
    label: "Events",
    description: "Publish upcoming events and manage attendance. Planned for a future release.",
    status: "planned",
  },
  ticketing: {
    key: "ticketing",
    label: "Ticketing",
    description: "Sell and validate event tickets. Planned for a future release.",
    status: "planned",
  },
};

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

const commonContactFields: ProfileField[] = [
  { key: "serviceArea", label: "Service area", type: "text", placeholder: "e.g. Kigali and surrounding areas" },
  { key: "availabilityNote", label: "Availability note", type: "text", placeholder: "e.g. Monday to Saturday, 8:00 to 18:00" },
];

export const businessIndustries: BusinessIndustry[] = [
  {
    key: "accommodation",
    label: "Accommodation",
    description: "Hotels, guest houses, lodges, and stays.",
    examples: "Hotels, guest houses, lodges, villas, hostels",
    subtypes: [
      { key: "hotel", label: "Hotel" },
      { key: "guest_house", label: "Guest house" },
      { key: "lodge", label: "Lodge" },
      { key: "villa", label: "Villa" },
      { key: "hostel", label: "Hostel" },
      { key: "apartment", label: "Serviced apartment" },
    ],
    recommended: ["services", "appointments", "service_requests", "portfolio", "reviews", "whatsapp_contact", "contact_form"],
    optional: ["products", "product_orders", "pickup", "delivery"],
    profileFields: [
      { key: "checkInTime", label: "Check-in time", type: "text", placeholder: "e.g. 14:00" },
      { key: "checkOutTime", label: "Check-out time", type: "text", placeholder: "e.g. 11:00" },
      { key: "amenities", label: "Amenities", type: "multiselect", options: ["Wi-Fi", "Breakfast", "Parking", "Pool", "Air conditioning", "Airport pickup", "Laundry", "Restaurant"] },
      { key: "houseRules", label: "House rules", type: "textarea", placeholder: "Share anything guests should know before booking." },
    ],
  },
  {
    key: "food",
    label: "Food and beverage",
    description: "Restaurants, cafes, bakeries, and catering.",
    examples: "Restaurants, cafes, bakeries, caterers, takeaway",
    subtypes: [
      { key: "restaurant", label: "Restaurant" },
      { key: "cafe", label: "Cafe" },
      { key: "bakery", label: "Bakery" },
      { key: "catering", label: "Catering" },
      { key: "takeaway", label: "Takeaway" },
    ],
    recommended: ["products", "product_orders", "pickup", "delivery", "services", "service_requests", "reviews", "whatsapp_contact", "contact_form"],
    optional: ["appointments", "portfolio"],
    profileFields: [
      { key: "cuisine", label: "Cuisine or specialties", type: "text", placeholder: "e.g. Rwandan, Italian, vegan" },
      { key: "diningOptions", label: "Dining options", type: "multiselect", options: ["Dine-in", "Takeaway", "Delivery", "Catering", "Private events"] },
      { key: "reservationPolicy", label: "Reservation or catering notes", type: "textarea", placeholder: "Minimum notice, group sizes, or special requests." },
    ],
  },
  {
    key: "retail",
    label: "Retail and shops",
    description: "Stores selling physical products.",
    examples: "Clothing, electronics, supermarkets, pharmacies, furniture",
    subtypes: [
      { key: "clothing", label: "Clothing and fashion" },
      { key: "electronics", label: "Electronics" },
      { key: "supermarket", label: "Supermarket" },
      { key: "pharmacy", label: "Pharmacy" },
      { key: "furniture", label: "Furniture and home" },
      { key: "general", label: "General retail" },
    ],
    recommended: ["products", "product_orders", "pickup", "delivery", "reviews", "whatsapp_contact", "contact_form"],
    optional: ["services", "service_requests", "portfolio"],
    profileFields: [
      { key: "productCategories", label: "Main product categories", type: "text", placeholder: "e.g. phones, accessories, repairs" },
      { key: "deliveryAreas", label: "Delivery areas", type: "text", placeholder: "e.g. Kigali city center and Nyarugenge" },
      { key: "returnPolicy", label: "Returns and exchanges", type: "textarea", placeholder: "Explain your return window and conditions." },
    ],
  },
  {
    key: "beauty",
    label: "Beauty and personal care",
    description: "Salons, barbers, spas, and personal care.",
    examples: "Barbershops, hair salons, spas, nail salons, makeup artists",
    subtypes: [
      { key: "barbershop", label: "Barbershop" },
      { key: "hair_salon", label: "Hair salon" },
      { key: "beauty_salon", label: "Beauty salon" },
      { key: "spa", label: "Spa" },
      { key: "nail_salon", label: "Nail salon" },
      { key: "makeup_artist", label: "Makeup artist" },
    ],
    recommended: ["services", "appointments", "service_requests", "portfolio", "reviews", "whatsapp_contact", "contact_form"],
    optional: ["products", "product_orders", "pickup"],
    profileFields: [
      { key: "specialties", label: "Specialties", type: "text", placeholder: "e.g. braids, bridal makeup, skincare" },
      { key: "staff", label: "Team or staff names", type: "text", placeholder: "e.g. Alice, Diane, and Eric" },
      { key: "appointmentPolicy", label: "Appointment policy", type: "textarea", placeholder: "Cancellation, lateness, deposits, or preparation notes." },
    ],
  },
  {
    key: "health",
    label: "Health and wellness",
    description: "Clinics, therapists, and wellness practices.",
    examples: "Clinics, physiotherapy, dental, optical, wellness centers",
    subtypes: [
      { key: "clinic", label: "Clinic" },
      { key: "wellness_center", label: "Wellness center" },
      { key: "physiotherapy", label: "Physiotherapy" },
      { key: "dental", label: "Dental practice" },
      { key: "optical", label: "Optical practice" },
    ],
    recommended: ["services", "appointments", "service_requests", "reviews", "whatsapp_contact", "contact_form"],
    optional: ["products", "product_orders", "portfolio"],
    profileFields: [
      { key: "servicesOffered", label: "Services offered", type: "textarea", placeholder: "List the main consultations, treatments, or programs." },
      { key: "appointmentPolicy", label: "Appointment policy", type: "textarea", placeholder: "Insurance, cancellations, preparation, or referrals." },
      { key: "emergencyContact", label: "Emergency or after-hours contact", type: "text", placeholder: "Phone number or instructions" },
    ],
  },
  {
    key: "professional",
    label: "Professional services",
    description: "Consultants, agencies, lawyers, accountants, and creatives.",
    examples: "Consultants, agencies, lawyers, accountants, photographers",
    subtypes: [
      { key: "consultant", label: "Consultant" },
      { key: "agency", label: "Agency" },
      { key: "lawyer", label: "Lawyer" },
      { key: "accountant", label: "Accountant" },
      { key: "freelancer", label: "Freelancer" },
      { key: "photographer", label: "Photographer" },
      { key: "videographer", label: "Videographer" },
    ],
    recommended: ["services", "service_requests", "portfolio", "appointments", "reviews", "whatsapp_contact", "contact_form"],
    optional: ["products", "product_orders", "pickup", "delivery"],
    profileFields: [
      ...commonContactFields,
      { key: "portfolioFocus", label: "Portfolio focus", type: "textarea", placeholder: "Describe the work or projects customers should see first." },
    ],
  },
  {
    key: "home_services",
    label: "Home and field services",
    description: "Repairs, cleaning, construction, and on-site services.",
    examples: "Plumbers, electricians, cleaners, contractors, repair services",
    subtypes: [
      { key: "plumber", label: "Plumber" },
      { key: "electrician", label: "Electrician" },
      { key: "cleaner", label: "Cleaning service" },
      { key: "contractor", label: "Contractor" },
      { key: "repair", label: "Repair service" },
    ],
    recommended: ["services", "service_requests", "appointments", "reviews", "whatsapp_contact", "contact_form"],
    optional: ["products", "product_orders", "portfolio", "pickup", "delivery"],
    profileFields: [
      { key: "coverageAreas", label: "Coverage areas", type: "text", placeholder: "e.g. Gasabo, Kicukiro, and Nyarugenge" },
      { key: "serviceMode", label: "How you deliver service", type: "multiselect", options: ["On-site", "Remote", "At customer location", "At my workshop"] },
      { key: "emergencyService", label: "Emergency or same-day service", type: "boolean" },
      { key: "projectNotes", label: "Project notes", type: "textarea", placeholder: "Typical project sizes, lead times, or guarantees." },
    ],
  },
  {
    key: "automotive",
    label: "Automotive",
    description: "Garages, mechanics, car rentals, and vehicle services.",
    examples: "Garages, mechanics, car rentals, car washes, spare parts",
    subtypes: [
      { key: "garage", label: "Garage" },
      { key: "mechanic", label: "Mechanic" },
      { key: "car_rental", label: "Car rental" },
      { key: "car_wash", label: "Car wash" },
      { key: "spare_parts", label: "Spare parts" },
    ],
    recommended: ["products", "product_orders", "pickup", "services", "appointments", "service_requests", "reviews", "whatsapp_contact", "contact_form"],
    optional: ["delivery", "portfolio"],
    profileFields: [
      { key: "vehicleTypes", label: "Vehicle types", type: "text", placeholder: "e.g. cars, motorcycles, light trucks" },
      { key: "servicesOffered", label: "Services offered", type: "textarea", placeholder: "Repairs, maintenance, inspections, rentals, or parts." },
      { key: "serviceArea", label: "Service area", type: "text", placeholder: "e.g. Kigali and nearby districts" },
    ],
  },
  {
    key: "education",
    label: "Education and training",
    description: "Schools, tutors, and training centers.",
    examples: "Schools, tutors, training centers, language schools",
    subtypes: [
      { key: "school", label: "School" },
      { key: "tutor", label: "Tutor" },
      { key: "training_center", label: "Training center" },
      { key: "language_school", label: "Language school" },
    ],
    recommended: ["services", "appointments", "service_requests", "reviews", "whatsapp_contact", "contact_form"],
    optional: ["products", "product_orders", "portfolio", "pickup"],
    profileFields: [
      { key: "programs", label: "Programs and courses", type: "textarea", placeholder: "List the programs, levels, or subjects you teach." },
      { key: "ageGroups", label: "Age groups or levels", type: "text", placeholder: "e.g. ages 6-12, beginners, professionals" },
      { key: "enrollmentNotes", label: "Enrollment notes", type: "textarea", placeholder: "Terms, schedules, fees, or requirements." },
    ],
  },
  {
    key: "fitness",
    label: "Fitness and sports",
    description: "Gyms, studios, and sports clubs.",
    examples: "Gyms, fitness centers, yoga studios, sports clubs",
    subtypes: [
      { key: "gym", label: "Gym" },
      { key: "fitness_center", label: "Fitness center" },
      { key: "yoga_studio", label: "Yoga studio" },
      { key: "sports_club", label: "Sports club" },
    ],
    recommended: ["services", "appointments", "service_requests", "reviews", "whatsapp_contact", "contact_form"],
    optional: ["products", "product_orders", "portfolio", "pickup"],
    profileFields: [
      { key: "facilities", label: "Facilities", type: "multiselect", options: ["Weights", "Cardio", "Studio", "Pool", "Changing rooms", "Parking", "Outdoor space"] },
      { key: "classTypes", label: "Classes and programs", type: "text", placeholder: "e.g. yoga, HIIT, personal training" },
      { key: "membershipNotes", label: "Membership notes", type: "textarea", placeholder: "Membership options, class passes, or trial sessions." },
    ],
  },
  {
    key: "entertainment",
    label: "Entertainment and events",
    description: "Venues, event services, and entertainment.",
    examples: "Event venues, planners, decor, entertainment",
    subtypes: [
      { key: "event_venue", label: "Event venue" },
      { key: "event_planner", label: "Event planner" },
      { key: "decor", label: "Decor and styling" },
      { key: "entertainment", label: "Entertainment" },
    ],
    recommended: ["services", "service_requests", "portfolio", "reviews", "whatsapp_contact", "contact_form"],
    optional: ["appointments", "products", "product_orders", "pickup", "delivery"],
    profileFields: [
      { key: "eventTypes", label: "Event types", type: "text", placeholder: "e.g. weddings, corporate events, birthdays" },
      { key: "capacity", label: "Capacity or coverage", type: "text", placeholder: "e.g. up to 250 guests" },
      { key: "bookingNotes", label: "Booking notes", type: "textarea", placeholder: "Lead time, deposits, or what is included." },
    ],
  },
  {
    key: "real_estate",
    label: "Real estate",
    description: "Agents, property managers, and developers.",
    examples: "Agents, property managers, owners, developers",
    subtypes: [
      { key: "agent", label: "Real estate agent" },
      { key: "property_manager", label: "Property manager" },
      { key: "property_owner", label: "Property owner" },
      { key: "developer", label: "Developer" },
    ],
    recommended: ["services", "service_requests", "portfolio", "reviews", "whatsapp_contact", "contact_form"],
    optional: ["appointments"],
    profileFields: [
      { key: "propertyTypes", label: "Property types", type: "multiselect", options: ["Houses", "Apartments", "Land", "Commercial", "Short stays"] },
      { key: "coverageAreas", label: "Coverage areas", type: "text", placeholder: "e.g. Kigali, Musanze, Rubavu" },
      { key: "viewingPolicy", label: "Viewing policy", type: "textarea", placeholder: "How customers can arrange a viewing or inspection." },
    ],
  },
  {
    key: "travel",
    label: "Travel and tourism",
    description: "Travel agencies, tour operators, and safari companies.",
    examples: "Travel agencies, tour operators, safari operators",
    subtypes: [
      { key: "travel_agency", label: "Travel agency" },
      { key: "tour_operator", label: "Tour operator" },
      { key: "safari_operator", label: "Safari operator" },
    ],
    recommended: ["services", "service_requests", "portfolio", "reviews", "whatsapp_contact", "contact_form"],
    optional: ["appointments", "products", "product_orders"],
    profileFields: [
      { key: "destinations", label: "Destinations", type: "text", placeholder: "e.g. Rwanda, Uganda, Tanzania" },
      { key: "tripTypes", label: "Trip types", type: "text", placeholder: "e.g. safaris, city tours, honeymoons" },
      { key: "bookingPolicy", label: "Booking policy", type: "textarea", placeholder: "Deposits, cancellation terms, or group sizes." },
    ],
  },
  {
    key: "agriculture",
    label: "Agriculture",
    description: "Farms, agribusinesses, and agricultural suppliers.",
    examples: "Farms, livestock, agro-dealers, agribusiness",
    subtypes: [
      { key: "farm", label: "Farm" },
      { key: "agribusiness", label: "Agribusiness" },
      { key: "livestock", label: "Livestock" },
      { key: "agro_dealer", label: "Agro-dealer" },
    ],
    recommended: ["products", "product_orders", "pickup", "delivery", "services", "service_requests", "reviews", "whatsapp_contact", "contact_form"],
    optional: ["portfolio"],
    profileFields: [
      { key: "productsOffered", label: "Products offered", type: "text", placeholder: "e.g. maize, beans, seedlings, animal feed" },
      { key: "deliveryAreas", label: "Delivery areas", type: "text", placeholder: "e.g. Kigali wholesale markets" },
      { key: "seasonality", label: "Seasonality or minimum order", type: "textarea", placeholder: "Harvest windows, order minimums, or bulk pricing." },
    ],
  },
  {
    key: "technology",
    label: "Technology",
    description: "Software companies, IT services, and digital agencies.",
    examples: "Software companies, IT services, web design, digital marketing",
    subtypes: [
      { key: "software_company", label: "Software company" },
      { key: "it_services", label: "IT services" },
      { key: "web_design", label: "Web design" },
      { key: "digital_marketing", label: "Digital marketing" },
    ],
    recommended: ["services", "service_requests", "portfolio", "reviews", "whatsapp_contact", "contact_form"],
    optional: ["products", "product_orders", "appointments", "delivery"],
    profileFields: [
      { key: "serviceOfferings", label: "Service offerings", type: "textarea", placeholder: "Describe the products or services you provide." },
      { key: "engagementModels", label: "Engagement models", type: "multiselect", options: ["Fixed project", "Retainer", "Hourly", "Subscription", "Support contract"] },
      { key: "coverage", label: "Coverage or timezone", type: "text", placeholder: "e.g. Rwanda and East Africa, CAT timezone" },
    ],
  },
  {
    key: "other",
    label: "Other",
    description: "A business that does not fit the listed industries.",
    examples: "Any other legitimate local business",
    subtypes: [{ key: "general", label: "General business" }],
    recommended: ["services", "service_requests", "reviews", "whatsapp_contact", "contact_form"],
    optional: ["products", "product_orders", "appointments", "portfolio", "pickup", "delivery"],
    profileFields: [
      { key: "businessFocus", label: "What your business does", type: "textarea", placeholder: "Describe your main offer in a sentence or two." },
      { key: "serviceArea", label: "Service area", type: "text", placeholder: "e.g. Kigali" },
    ],
  },
];

export const businessCatalog = {
  industries: businessIndustries,
  capabilities: [...availableCapabilityKeys, ...plannedCapabilityKeys].map((key) => capabilityDefinitions[key]),
};

export function getIndustry(industryKey: string | null | undefined) {
  return businessIndustries.find((industry) => industry.key === industryKey);
}

export function getSubtype(industryKey: string | null | undefined, subtypeKey: string | null | undefined) {
  return getIndustry(industryKey)?.subtypes.find((subtype) => subtype.key === subtypeKey);
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function findIndustryForCategory(category: string | null | undefined) {
  const value = normalize(category ?? "");
  if (!value) return getIndustry("other")!;
  for (const industry of businessIndustries) {
    if (normalize(industry.key) === value || normalize(industry.label) === value) return industry;
    const subtype = industry.subtypes.find((candidate) => normalize(candidate.key) === value || normalize(candidate.label) === value);
    if (subtype) return industry;
  }
  const alias: Record<string, string> = {
    restaurant: "food",
    cafe: "food",
    food: "food",
    bakery: "food",
    catering: "food",
    retail: "retail",
    shop: "retail",
    furniture: "retail",
    pharmacy: "retail",
    electronics: "retail",
    beauty: "beauty",
    salon: "beauty",
    spa: "beauty",
    barber: "beauty",
    mechanic: "automotive",
    auto: "automotive",
    garage: "automotive",
    "car rental": "automotive",
    construction: "home_services",
    contractor: "home_services",
    cleaning: "home_services",
    "home services": "home_services",
    plumber: "home_services",
    electrician: "home_services",
    photographer: "professional",
    photo: "professional",
    consultant: "professional",
    lawyer: "professional",
    accountant: "professional",
    agency: "professional",
    events: "entertainment",
    event: "entertainment",
    decor: "entertainment",
    "real estate": "real_estate",
    property: "real_estate",
    clinic: "health",
    health: "health",
    gym: "fitness",
    fitness: "fitness",
    school: "education",
    tutor: "education",
    travel: "travel",
    tour: "travel",
    farm: "agriculture",
    agriculture: "agriculture",
    technology: "technology",
    software: "technology",
    it: "technology",
  };
  const key = Object.keys(alias).find((candidate) => value.includes(candidate));
  return getIndustry(key ? alias[key] : "other")!;
}

export function defaultCapabilitiesForCategory(category: string | null | undefined) {
  return [...findIndustryForCategory(category).recommended];
}

export function normalizeCapabilities(capabilities: string[], industryKey: string | null | undefined) {
  const available = new Set<string>(availableCapabilityKeys);
  const result = new Set(capabilities.filter((key) => available.has(key)));
  const add = (key: CapabilityKey) => result.add(key);
  if (result.has("product_orders")) {
    add("products");
    if (!result.has("pickup") && !result.has("delivery")) add("pickup");
  }
  if (result.has("delivery") || result.has("pickup")) {
    add("products");
    add("product_orders");
  }
  if (result.has("appointments")) add("services");
  return [...result];
}

export function capabilityError(capabilities: string[], industryKey: string | null | undefined) {
  const industry = getIndustry(industryKey);
  if (!industry) return "Choose a valid business industry";
  const available = new Set<string>(availableCapabilityKeys);
  const unknown = capabilities.find((key) => !available.has(key));
  if (unknown) return `The capability "${unknown}" is not available yet`;
  if (capabilities.includes("product_orders") && !capabilities.some((key) => key === "pickup" || key === "delivery")) {
    return "Online orders need at least one fulfillment option: pickup or delivery";
  }
  return null;
}

export function validateProfileData(industryKey: string | null | undefined, data: Record<string, unknown> | null | undefined, enforceRequired = false) {
  if (data === undefined || data === null) return null;
  if (typeof data !== "object" || Array.isArray(data)) return "Business profile details must be an object";
  const industry = getIndustry(industryKey);
  if (!industry) return "Choose a valid business industry";
  const fields = new Map(industry.profileFields.map((field) => [field.key, field]));
  for (const [key, value] of Object.entries(data)) {
    const field = fields.get(key);
    if (!field) return `The profile field "${key}" is not valid for this industry`;
    if (value === null || value === undefined || value === "") continue;
    if (field.type === "boolean") {
      if (typeof value !== "boolean") return `${field.label} must be true or false`;
      continue;
    }
    if (field.type === "multiselect") {
      if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) return `${field.label} must be a list of choices`;
      if (field.options && value.some((item) => !field.options!.includes(item as string))) return `${field.label} contains an unsupported choice`;
      continue;
    }
    if (typeof value !== "string") return `${field.label} must be text`;
    if (value.length > 5000) return `${field.label} is too long`;
    if (field.type === "select" && field.options && !field.options.includes(value)) return `${field.label} contains an unsupported choice`;
  }
  if (enforceRequired) {
    for (const field of industry.profileFields) {
      const value = data[field.key];
      if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
        return `${field.label} is required`;
      }
    }
  }
  return null;
}

export function publicIndustry(industry: BusinessIndustry) {
  return {
    key: industry.key,
    label: industry.label,
    description: industry.description,
    examples: industry.examples,
    subtypes: industry.subtypes,
    recommended: industry.recommended,
    optional: industry.optional,
    profileFields: industry.profileFields,
  };
}
