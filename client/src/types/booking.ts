export type BookingStatus = "PENDING" | "CONFIRMED" | "REJECTED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export interface BookingSettings {
  businessId: string;
  isEnabled: boolean;
  timezone: string;
  slotIntervalMinutes: number;
  minNoticeMinutes: number;
  maxAdvanceDays: number;
  cancellationCutoffMinutes: number;
  requireConfirmation: boolean;
}

export interface AvailabilityWindow {
  id?: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
  isActive?: boolean;
}

export interface AvailabilityBlock {
  id: string;
  serviceId: string | null;
  startsAt: string;
  endsAt: string;
  reason: string;
}

export interface BookingSlot {
  startAt: string;
  endAt: string;
  label: string;
}

export interface AvailabilityDay {
  date: string;
  slots: BookingSlot[];
}

export interface PublicBookingService {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  startingPrice: number | string;
  currency: string;
  duration: string | null;
  durationMinutes: number;
  bufferMinutes: number;
  capacity: number;
}

export interface PublicBookingAvailability {
  timezone: string;
  from: string;
  to: string;
  service: PublicBookingService;
  policy: {
    minNoticeMinutes: number;
    maxAdvanceDays: number;
    requireConfirmation: boolean;
    cancellationCutoffMinutes: number;
  };
  days: AvailabilityDay[];
}

export interface PublicBooking {
  id: string;
  bookingNumber: string;
  publicToken: string;
  status: BookingStatus;
  startAt: string;
  endAt: string;
  timezone: string;
  durationMinutes: number;
  startingPriceSnapshot: number | string | null;
  currency: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  customerNote: string;
  createdAt: string;
  confirmedAt: string | null;
  rejectedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  service: PublicBookingService;
  business: {
    id: string;
    name: string;
    slug: string;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    country: string;
  };
  review: { id: string; rating: number; comment: string; createdAt: string; isVerified: boolean } | null;
  policy: { requireConfirmation: boolean; cancellationCutoffMinutes: number };
  canCancel: boolean;
  canReview: boolean;
}

export interface OwnerBooking extends PublicBooking {
  ownerNote: string;
  cancelledBy: "CUSTOMER" | "BUSINESS" | "SYSTEM" | null;
  service: PublicBookingService & { capacity: number };
}

export interface BookingSummary {
  today: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  rejected: number;
  timezone: string;
}
