import { useQuery } from "@tanstack/react-query";
import { analyticsService, bookingService, businessService, customerService, dashboardService, orderService, quoteService, requestService } from "../services/api";
import { authService, type AuthUser } from "../services/authService";

export const queryKeys = {
  currentUser: ["auth", "me"] as const,
  businessCatalog: ["business-catalog"] as const,
  business: (id: string) => ["business", id] as const,
  profileCompletion: (id: string) => ["profile-completion", id] as const,
  publicBusinesses: ["public-businesses"] as const,
  publicBusiness: (slug: string) => ["public-business", slug] as const,
  analytics: (id: string) => ["analytics", id] as const,
  workspaceSummary: (id: string) => ["workspace-summary", id] as const,
  customers: (id: string, search = "") => ["customers", id, search] as const,
  businessReviews: (id: string) => ["business-reviews", id] as const,
  requests: (id: string) => ["requests", id] as const,
  request: (id: string) => ["request", id] as const,
  quotes: (id: string) => ["quotes", id] as const,
  bookings: (id: string) => ["bookings", id] as const,
  bookingSummary: (id: string) => ["booking-summary", id] as const,
  bookingSettings: (id: string) => ["booking-settings", id] as const,
  availability: (slug: string, serviceId: string, from: string, to: string) => ["availability", slug, serviceId, from, to] as const,
  publicBooking: (token: string) => ["public-booking", token] as const,
  orders: (id: string) => ["orders", id] as const,
  orderSummary: (id: string) => ["order-summary", id] as const,
  publicOrder: (token: string) => ["public-order", token] as const,
};

export function useCurrentUser() {
  return useQuery<AuthUser>({
    queryKey: queryKeys.currentUser,
    queryFn: authService.currentUser,
    enabled: authService.isAuthenticated(),
    retry: false,
  });
}

export function useBusinessCatalog<T>() {
  return useQuery<T>({
    queryKey: queryKeys.businessCatalog,
    queryFn: () => businessService.getCatalog<T>(),
    staleTime: 30 * 60_000,
  });
}

export function usePublicBusiness<T>(slug: string | undefined) {
  return useQuery<T>({
    queryKey: queryKeys.publicBusiness(slug ?? ""),
    queryFn: () => businessService.getPublicBusiness<T>(slug!),
    enabled: Boolean(slug),
  });
}

export function usePublicBusinessList<T>() {
  return useQuery<T[]>({
    queryKey: queryKeys.publicBusinesses,
    queryFn: () => businessService.getPublicBusinesses<T>(),
    staleTime: 10 * 60_000,
  });
}

export function useProfileCompletion<T>(businessId: string | undefined) {
  return useQuery<T>({
    queryKey: queryKeys.profileCompletion(businessId ?? ""),
    queryFn: () => businessService.getProfileCompletion<T>(businessId!),
    enabled: Boolean(businessId),
  });
}

export function useBusinessAnalytics<T>(businessId: string | undefined) {
  return useQuery<T>({
    queryKey: queryKeys.analytics(businessId ?? ""),
    queryFn: () => analyticsService.get<T>(businessId!),
    enabled: Boolean(businessId),
  });
}

export function useWorkspaceSummary<T>(businessId: string | undefined) {
  return useQuery<T>({
    queryKey: queryKeys.workspaceSummary(businessId ?? ""),
    queryFn: () => dashboardService.getSummary<T>(businessId!),
    enabled: Boolean(businessId),
  });
}

export function useBusinessCustomers<T>(businessId: string | undefined, search = "") {
  return useQuery<T>({
    queryKey: queryKeys.customers(businessId ?? "", search),
    queryFn: () => customerService.list<T>(businessId!, search || undefined),
    enabled: Boolean(businessId),
  });
}

export function useBusinessReviews<T>(businessId: string | undefined) {
  return useQuery<T>({
    queryKey: queryKeys.businessReviews(businessId ?? ""),
    queryFn: () => customerService.listReviews<T>(businessId!),
    enabled: Boolean(businessId),
  });
}

export function useBusinessRequests<T>(businessId: string | undefined) {
  return useQuery<T[]>({
    queryKey: queryKeys.requests(businessId ?? ""),
    queryFn: () => requestService.listByBusiness<T>(businessId!),
    enabled: Boolean(businessId),
  });
}

export function useBusinessQuotes<T>(businessId: string | undefined) {
  return useQuery<T[]>({
    queryKey: queryKeys.quotes(businessId ?? ""),
    queryFn: () => quoteService.listByBusiness<T>(businessId!),
    enabled: Boolean(businessId),
  });
}

export function useBookingAvailability<T>(slug: string | undefined, serviceId: string | undefined, from: string, to: string) {
  return useQuery<T>({
    queryKey: queryKeys.availability(slug ?? "", serviceId ?? "", from, to),
    queryFn: () => bookingService.getAvailability<T>(slug!, serviceId!, from, to),
    enabled: Boolean(slug && serviceId),
    staleTime: 30_000,
  });
}

export function usePublicBooking<T>(publicToken: string | undefined) {
  return useQuery<T>({
    queryKey: queryKeys.publicBooking(publicToken ?? ""),
    queryFn: () => bookingService.getPublic<T>(publicToken!),
    enabled: Boolean(publicToken),
    retry: false,
  });
}

export function useBusinessOrders<T>(businessId: string | undefined) {
  return useQuery<T[]>({
    queryKey: queryKeys.orders(businessId ?? ""),
    queryFn: () => orderService.listByBusiness<T>(businessId!),
    enabled: Boolean(businessId),
  });
}

export function usePublicOrder<T>(publicToken: string | undefined) {
  return useQuery<T>({
    queryKey: queryKeys.publicOrder(publicToken ?? ""),
    queryFn: () => orderService.getPublic<T>(publicToken!),
    enabled: Boolean(publicToken),
    retry: false,
  });
}
