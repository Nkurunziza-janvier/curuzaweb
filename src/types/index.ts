export type ActionType = "order" | "quote" | "book" | "question" | "contact" | "directions" | "pay";
export type RequestFieldType = "select" | "text" | "textarea" | "file" | "location" | "date" | "number";

export interface BusinessCategory {
  id: string;
  name: string;
  icon: string;
}

export interface BusinessAction {
  type: ActionType;
  title: string;
  description: string;
  enabled: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  available: boolean;
  sku?: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  startingPrice: number;
  duration?: string;
  image: string;
  category: string;
  customRequest: boolean;
}

export interface Offer {
  id: string;
  title: string;
  value: string;
  validFrom: string;
  validTo: string;
  status: "Active" | "Scheduled" | "Expired";
}

export interface Review {
  id: string;
  customer: string;
  rating: number;
  comment: string;
  date: string;
}

export interface RequestQuestion {
  id: string;
  type: RequestFieldType;
  label: string;
  helper?: string;
  options?: string[];
  required: boolean;
}

export interface RequestAnswer {
  questionId: string;
  value: string | string[];
}

export interface Request {
  id: string;
  customer: string;
  title: string;
  date: string;
  status: "New" | "Reviewing" | "Quote Sent" | "Customer Responded" | "Accepted" | "Rejected" | "Completed";
  estimatedValue: number;
  answers: RequestAnswer[];
}

export interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Quote {
  id: string;
  businessId: string;
  customer: string;
  requestTitle: string;
  createdAt: string;
  validUntil: string;
  status: "Draft" | "Sent" | "Accepted" | "Changes requested";
  items: QuoteItem[];
  discount: number;
  notes: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

export interface Analytics {
  pageViews: number;
  uniqueVisitors: number;
  returningVisitors: number;
  requests: number;
  quotes: number;
  acceptedQuotes: number;
  quoteValue: number;
  whatsappClicks: number;
  calls: number;
  directions: number;
}

export interface BusinessProfile {
  tagline: string;
  description: string;
  location: string;
  hours: string;
  isOpen: boolean;
  logo: string;
  coverImage: string;
  gallery: string[];
  rating: number;
  reviewCount: number;
  verified: boolean;
}

export interface Business {
  id: string;
  slug: string;
  name: string;
  category: BusinessCategory;
  profile: BusinessProfile;
  phone: string;
  whatsapp: string;
  email: string;
  actions: BusinessAction[];
  products: Product[];
  services: Service[];
  offers: Offer[];
  reviews: Review[];
  requestQuestions: RequestQuestion[];
}
