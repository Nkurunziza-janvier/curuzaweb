const sessionKey = "ubucuruzihub_demo_session";

export const authService = {
  isAuthenticated: () => window.localStorage.getItem(sessionKey) === "active",
  signIn: () => window.localStorage.setItem(sessionKey, "active"),
  signOut: () => window.localStorage.removeItem(sessionKey),
};
