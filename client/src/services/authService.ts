import { api } from "./api";

const tokenKey = "ubucuruzihub_access_token";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "BUSINESS_OWNER" | "ADMIN";
  business: null | {
    id: string;
    name: string;
    slug: string;
    category: string;
    industryKey: string;
    subtype: string;
    capabilities: string[];
    currency: string;
    onboardingStep: number;
    onboardingCompletedAt: string | null;
    publishedAt: string | null;
    isPublished: boolean;
    canPublishProducts: boolean;
    productAccessExpiresAt: string | null;
  };
}

export interface AuthResult {
  token: string;
  user: AuthUser;
}

export const authService = {
  isAuthenticated: () => window.sessionStorage.getItem(tokenKey) !== null,
  token: () => window.sessionStorage.getItem(tokenKey),
  async signIn(email: string, password: string) {
    const result = await api.post<AuthResult>("/auth/login", { email, password });
    window.sessionStorage.setItem(tokenKey, result.token);
    return result.user;
  },
  async register(input: { name: string; email: string; password: string; businessName: string; category?: string; industryKey?: string; subtype?: string; phone?: string; whatsapp?: string; description?: string; city?: string; address?: string }) {
    const result = await api.post<AuthResult>("/auth/register", input);
    window.sessionStorage.setItem(tokenKey, result.token);
    return result.user;
  },
  currentUser: () => api.get<AuthUser>("/auth/me"),
  signOut: () => window.sessionStorage.removeItem(tokenKey),
};
