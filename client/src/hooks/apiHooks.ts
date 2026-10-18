import { useQuery } from "@tanstack/react-query";
import { analyticsService, businessService, quoteService, requestService } from "../services/api";
import { authService, type AuthUser } from "../services/authService";

export const queryKeys = {
  currentUser: ["auth", "me"] as const,
  business: (id: string) => ["business", id] as const,
  publicBusiness: (slug: string) => ["public-business", slug] as const,
  analytics: (id: string) => ["analytics", id] as const,
  requests: (id: string) => ["requests", id] as const,
  request: (id: string) => ["request", id] as const,
  quotes: (id: string) => ["quotes", id] as const,
};

export function useCurrentUser() {
  return useQuery<AuthUser>({
    queryKey: queryKeys.currentUser,
    queryFn: authService.currentUser,
    enabled: authService.isAuthenticated(),
    retry: false,
  });
}

export function usePublicBusiness<T>(slug: string | undefined) {
  return useQuery<T>({
    queryKey: queryKeys.publicBusiness(slug ?? ""),
    queryFn: () => businessService.getPublicBusiness<T>(slug!),
    enabled: Boolean(slug),
  });
}

export function useBusinessAnalytics<T>(businessId: string | undefined) {
  return useQuery<T>({
    queryKey: queryKeys.analytics(businessId ?? ""),
    queryFn: () => analyticsService.get<T>(businessId!),
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
