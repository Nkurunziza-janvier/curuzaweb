export const allAvailableCapabilities = [
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

export type CapabilityKey = typeof allAvailableCapabilities[number];

export function effectiveCapabilities(capabilities: string[] | null | undefined) {
  return new Set<string>(capabilities?.length ? capabilities : allAvailableCapabilities);
}

export function hasCapability(capabilities: string[] | null | undefined, key: CapabilityKey) {
  return effectiveCapabilities(capabilities).has(key);
}

export function hasAnyCapability(capabilities: string[] | null | undefined, keys: CapabilityKey[]) {
  const set = effectiveCapabilities(capabilities);
  return keys.some((key) => set.has(key));
}
