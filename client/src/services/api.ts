import axios, { type AxiosRequestConfig } from "axios";

export interface ApiEnvelope<T> {
  success: true;
  data: T;
}

// Use the Vite same-origin proxy by default. This keeps the browser independent
// of whether `localhost` resolves to the same machine as the API process.
const apiBaseUrl = import.meta.env.VITE_API_URL ?? "/api";
const apiOrigin = apiBaseUrl.replace(/\/api\/?$/, "");

export function resolveAssetUrl(url: string | null | undefined) {
  if (!url) return undefined;
  return url.startsWith("/") ? `${apiOrigin}${url}` : url;
}

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  const token = window.sessionStorage.getItem("ubucuruzihub_access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError<{ error?: { message?: string } }>(error)) {
      if (error.code === "ERR_NETWORK") {
        return Promise.reject(new Error(`Could not reach the API at ${apiBaseUrl}. Make sure the backend is running and the Vite /api proxy points to it.`));
      }
      const message = error.response?.data?.error?.message ?? error.message ?? "The request could not be completed";
      return Promise.reject(new Error(message));
    }
    return Promise.reject(error);
  },
);

async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.request<ApiEnvelope<T> | T>(config);
  const payload = response.data;
  return typeof payload === "object" && payload !== null && "data" in payload
    ? (payload.data as T)
    : payload as T;
}

const encoded = (value: string) => encodeURIComponent(value);

export const api = {
  get: <T>(path: string) => request<T>({ method: "GET", url: path }),
  post: <T>(path: string, body?: unknown) => request<T>({ method: "POST", url: path, data: body ?? {} }),
  patch: <T>(path: string, body?: unknown) => request<T>({ method: "PATCH", url: path, data: body ?? {} }),
  put: <T>(path: string, body?: unknown) => request<T>({ method: "PUT", url: path, data: body ?? {} }),
  del: <T>(path: string) => request<T>({ method: "DELETE", url: path }),
};

export const businessService = {
  getPublicBusinessBrand: <T>(slug: string) => api.get<T>(`/public/businesses/${encoded(slug)}/brand`),
  getPublicBusiness: <T>(slug: string) => api.get<T>(`/public/businesses/${encoded(slug)}`),
  getPublicBusinesses: <T>() => api.get<T[]>("/public/businesses"),
  getBusinesses: <T>() => api.get<T[]>("/businesses"),
  get: <T>(businessId: string) => api.get<T>(`/businesses/${encoded(businessId)}`),
  update: <T>(businessId: string, payload: unknown) => api.patch<T>(`/businesses/${encoded(businessId)}`, payload),
  publish: <T>(businessId: string, published: boolean) => api.post<T>(`/businesses/${encoded(businessId)}/${published ? "publish" : "unpublish"}`),
};

export const requestService = {
  submit: <T>(slug: string, payload: unknown) => api.post<T>(`/public/businesses/${encoded(slug)}/requests`, payload),
  getByNumber: <T>(requestNumber: string) => api.get<T>(`/public/requests/${encoded(requestNumber)}`),
  listByBusiness: <T>(businessId: string) => api.get<T[]>(`/businesses/${encoded(businessId)}/requests`),
  get: <T>(id: string) => api.get<T>(`/requests/${encoded(id)}`),
  updateStatus: <T>(id: string, status: string) => api.patch<T>(`/requests/${encoded(id)}/status`, { status }),
  getTemplate: <T>(slug: string) => api.get<T>(`/public/businesses/${encoded(slug)}/request-template`),
  saveTemplate: <T>(businessId: string, payload: unknown) => api.put<T>(`/businesses/${encoded(businessId)}/request-template`, payload),
};

export const quoteService = {
  create: <T>(requestId: string, payload: unknown) => api.post<T>(`/requests/${encoded(requestId)}/quotes`, payload),
  getPublic: <T>(publicToken: string) => api.get<T>(`/public/quotes/${encoded(publicToken)}`),
  get: <T>(id: string) => api.get<T>(`/quotes/${encoded(id)}`),
  listByBusiness: <T>(businessId: string) => api.get<T[]>(`/businesses/${encoded(businessId)}/quotes`),
  summary: <T>(businessId: string) => api.get<T>(`/businesses/${encoded(businessId)}/quotes/summary`),
  update: <T>(id: string, payload: unknown) => api.patch<T>(`/quotes/${encoded(id)}`, payload),
  send: <T>(id: string) => api.post<T>(`/quotes/${encoded(id)}/send`),
  cancel: <T>(id: string) => api.post<T>(`/quotes/${encoded(id)}/cancel`),
  addBusinessMessage: <T>(id: string, message: string) => api.post<T>(`/quotes/${encoded(id)}/messages`, { message }),
  accept: <T>(publicToken: string) => api.post<T>(`/public/quotes/${encoded(publicToken)}/accept`),
  reject: <T>(publicToken: string, message?: string) => api.post<T>(`/public/quotes/${encoded(publicToken)}/reject`, message ? { message } : {}),
  requestChanges: <T>(publicToken: string, message: string) => api.post<T>(`/public/quotes/${encoded(publicToken)}/request-changes`, { message }),
  addCustomerMessage: <T>(publicToken: string, message: string) => api.post<T>(`/public/quotes/${encoded(publicToken)}/messages`, { message }),
};

export const productService = {
  list: <T>(businessId: string) => api.get<T[]>(`/businesses/${encoded(businessId)}/products`),
  create: <T>(businessId: string, payload: unknown) => api.post<T>(`/businesses/${encoded(businessId)}/products`, payload),
  update: <T>(id: string, payload: unknown) => api.patch<T>(`/products/${encoded(id)}`, payload),
  delete: <T>(id: string) => api.del<T>(`/products/${encoded(id)}`),
  publish: <T>(id: string, published: boolean) => api.post<T>(`/products/${encoded(id)}/${published ? "publish" : "unpublish"}`),
};

export const serviceService = {
  list: <T>(businessId: string) => api.get<T[]>(`/businesses/${encoded(businessId)}/services`),
  create: <T>(businessId: string, payload: unknown) => api.post<T>(`/businesses/${encoded(businessId)}/services`, payload),
  update: <T>(id: string, payload: unknown) => api.patch<T>(`/services/${encoded(id)}`, payload),
  delete: <T>(id: string) => api.del<T>(`/services/${encoded(id)}`),
  publish: <T>(id: string, published: boolean) => api.post<T>(`/services/${encoded(id)}/${published ? "publish" : "unpublish"}`),
};

export const offerService = {
  list: <T>(businessId: string) => api.get<T[]>(`/businesses/${encoded(businessId)}/offers`),
  create: <T>(businessId: string, payload: unknown) => api.post<T>(`/businesses/${encoded(businessId)}/offers`, payload),
  update: <T>(id: string, payload: unknown) => api.patch<T>(`/offers/${encoded(id)}`, payload),
  delete: <T>(id: string) => api.del<T>(`/offers/${encoded(id)}`),
  setActive: <T>(id: string, active: boolean) => api.post<T>(`/offers/${encoded(id)}/${active ? "activate" : "deactivate"}`),
};

export const bookingService = {
  getAvailability: <T>(slug: string, serviceId: string, from: string, to: string) =>
    api.get<T>(`/public/businesses/${encoded(slug)}/bookings/availability?serviceId=${encoded(serviceId)}&from=${encoded(from)}&to=${encoded(to)}`),
  create: <T>(slug: string, payload: unknown) => api.post<T>(`/public/businesses/${encoded(slug)}/bookings`, payload),
  getPublic: <T>(publicToken: string) => api.get<T>(`/public/bookings/${encoded(publicToken)}`),
  cancelPublic: <T>(publicToken: string, reason?: string) => api.post<T>(`/public/bookings/${encoded(publicToken)}/cancel`, { reason }),
  reviewPublic: <T>(publicToken: string, rating: number, comment: string) => api.post<T>(`/public/bookings/${encoded(publicToken)}/reviews`, { rating, comment }),
  getSettings: <T>(businessId: string) => api.get<T>(`/businesses/${encoded(businessId)}/booking-settings`),
  updateSettings: <T>(businessId: string, payload: unknown) => api.patch<T>(`/businesses/${encoded(businessId)}/booking-settings`, payload),
  replaceWindows: <T>(businessId: string, windows: unknown) => api.put<T>(`/businesses/${encoded(businessId)}/availability`, { windows }),
  createBlock: <T>(businessId: string, payload: unknown) => api.post<T>(`/businesses/${encoded(businessId)}/availability-blocks`, payload),
  deleteBlock: <T>(businessId: string, blockId: string) => api.del<T>(`/businesses/${encoded(businessId)}/availability-blocks/${encoded(blockId)}`),
  listByBusiness: <T>(businessId: string) => api.get<T[]>(`/businesses/${encoded(businessId)}/bookings`),
  summary: <T>(businessId: string) => api.get<T>(`/businesses/${encoded(businessId)}/bookings/summary`),
  get: <T>(id: string) => api.get<T>(`/bookings/${encoded(id)}`),
  updateStatus: <T>(id: string, status: string) => api.patch<T>(`/bookings/${encoded(id)}/status`, { status }),
  reschedule: <T>(id: string, startAt: string) => api.patch<T>(`/bookings/${encoded(id)}/schedule`, { startAt }),
  updateNote: <T>(id: string, ownerNote: string) => api.patch<T>(`/bookings/${encoded(id)}/note`, { ownerNote }),
};

export const analyticsService = {
  get: <T>(businessId: string) => api.get<T>(`/businesses/${encoded(businessId)}/analytics`),
  getEvents: <T>(businessId: string) => api.get<T[]>(`/businesses/${encoded(businessId)}/analytics/events`),
  track: <T>(slug: string, eventType: string, metadata?: Record<string, unknown>) =>
    api.post<T>(`/public/businesses/${encoded(slug)}/events`, { eventType, metadata }),
};

export const adminService = {
  overview: <T>() => api.get<T>("/admin/overview"),
  businesses: <T>() => api.get<T[]>("/admin/businesses"),
  updateBusiness: <T>(businessId: string, payload: { canPublishProducts?: boolean; isPublished?: boolean; isBlocked?: boolean }) => api.patch<T>(`/admin/businesses/${encoded(businessId)}`, payload),
  deleteBusiness: <T>(businessId: string) => api.del<T>(`/admin/businesses/${encoded(businessId)}`),
  activity: <T>() => api.get<T[]>("/admin/audit-log"),
  payments: <T>() => api.get<T[]>("/admin/payments"),
  reviewPayment: <T>(id: string, decision: "APPROVE" | "REJECT", reviewNote?: string) => api.post<T>(`/admin/payments/${encoded(id)}/review`, { decision, reviewNote }),
};

export const billingService = {
  get: <T>() => api.get<T>("/billing"),
  checkout: <T>(planCode: string) => api.post<T>("/billing/checkout", { planCode }),
  submit: <T>(payload: { planCode: string; payerPhone: string; transactionReference: string }) => api.post<T>("/billing/payments", payload),
};

export const notificationService = {
  get: <T>() => api.get<T>("/notifications"),
  markRead: <T>(ids?: string[]) => api.patch<T>("/notifications/read", { ids }),
};

export const uploadService = {
  async upload(file: File) {
    const form = new FormData();
    form.append("file", file);
    return request<{ url: string }>({ method: "POST", url: "/uploads", data: form });
  },
};
