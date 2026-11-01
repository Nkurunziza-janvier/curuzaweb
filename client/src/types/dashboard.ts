export interface WorkspaceOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  paymentStatus: string;
  fulfillment: string;
  total: number | string;
  currency: string;
  createdAt: string;
}

export interface WorkspaceBooking {
  id: string;
  bookingNumber: string;
  customerName: string;
  status: string;
  startAt: string;
  endAt: string;
  timezone: string;
  service: { name: string };
}

export interface WorkspaceRequest {
  id: string;
  requestNumber: string;
  customerName: string;
  requestType: string;
  status: string;
  createdAt: string;
}

export interface WorkspaceQuote {
  id: string;
  quoteNumber: string;
  status: string;
  total: number | string;
  currency: string;
  createdAt: string;
  request: { customerName: string };
}

export interface WorkspaceReview {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  isPublished: boolean;
  createdAt: string;
}

export interface WorkspaceSummary {
  capabilities: string[];
  currency: string;
  catalog: {
    products: { total: number; published: number; available: number };
    services: { total: number; published: number; bookable: number };
  };
  bookingSettings: { configured: boolean; enabled: boolean; timezone: string };
  requestTemplate: { configured: boolean };
  orders: null | {
    pending: number;
    confirmed: number;
    processing: number;
    ready: number;
    completed: number;
    cancelled: number;
    unpaid: number;
    paidValue: number;
    recent: WorkspaceOrder[];
    total: number;
  };
  bookings: null | {
    today: number;
    pending: number;
    upcoming: number;
    completed: number;
    next: WorkspaceBooking[];
    total: number;
    timezone: string;
  };
  requests: null | {
    new: number;
    reviewing: number;
    quoteSent: number;
    customerResponded: number;
    accepted: number;
    total: number;
    recent: WorkspaceRequest[];
  };
  quotes: null | {
    draft: number;
    sent: number;
    accepted: number;
    pendingValue: number;
    recent: WorkspaceQuote[];
  };
  reviews: null | {
    total: number;
    published: number;
    average: number;
    recent: WorkspaceReview[];
  };
  analytics: {
    pageViews: number;
    actions: number;
    whatsappClicks: number;
    phoneClicks: number;
    directionsClicks: number;
  };
}

export interface CustomerRecord {
  key: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  orders: number;
  bookings: number;
  requests: number;
  orderValue: number;
  lastActivityAt: string;
  sources: Array<"orders" | "bookings" | "requests">;
}

export interface BusinessReviewRecord {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  isPublished: boolean;
  isVerified: boolean;
  createdAt: string;
  service: { id: string; name: string } | null;
}

export interface BusinessReviewsResponse {
  reviews: BusinessReviewRecord[];
  summary: { total: number; published: number; average: number };
}
