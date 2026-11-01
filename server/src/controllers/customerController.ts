import { OrderStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { availableCapabilityKeys } from "../config/businessCatalog.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { notFound } from "../utils/errors.js";
import { success } from "../utils/responses.js";
import { getParam } from "../utils/requestParam.js";

interface CustomerAccumulator {
  key: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  orders: number;
  bookings: number;
  requests: number;
  orderValue: number;
  lastActivityAt: Date;
  sources: Set<"orders" | "bookings" | "requests">;
}

function contactKey(contact: { name: string; email?: string | null; phone?: string | null; whatsapp?: string | null }) {
  const email = contact.email?.trim().toLowerCase();
  if (email) return `email:${email}`;
  const phone = (contact.phone || contact.whatsapp || "").replace(/\D/g, "");
  if (phone) return `phone:${phone}`;
  return `name:${contact.name.trim().toLowerCase()}`;
}

function effectiveCapabilities(capabilities: string[]) {
  return new Set<string>(capabilities.length ? capabilities : availableCapabilityKeys);
}

export const listBusinessCustomers = asyncHandler(async (request, response) => {
  const businessId = getParam(request, "businessId");
  const business = await prisma.business.findUnique({ where: { id: businessId }, select: { capabilities: true } });
  if (!business) throw notFound("Business not found");

  const capabilities = effectiveCapabilities(business.capabilities);
  const canOrders = capabilities.has("product_orders");
  const canBookings = capabilities.has("appointments");
  const canRequests = capabilities.has("service_requests") || capabilities.has("contact_form");

  const [orders, bookings, requests] = await Promise.all([
    canOrders ? prisma.order.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      take: 1000,
      select: { customerName: true, customerEmail: true, customerPhone: true, total: true, status: true, createdAt: true },
    }) : Promise.resolve([]),
    canBookings ? prisma.booking.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      take: 1000,
      select: { customerName: true, customerEmail: true, customerPhone: true, status: true, createdAt: true },
    }) : Promise.resolve([]),
    canRequests ? prisma.customerRequest.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      take: 1000,
      select: { customerName: true, customerEmail: true, customerPhone: true, customerWhatsapp: true, status: true, createdAt: true },
    }) : Promise.resolve([]),
  ]);

  const customers = new Map<string, CustomerAccumulator>();
  const upsert = (contact: { name: string; email?: string | null; phone?: string | null; whatsapp?: string | null }, at: Date) => {
    const key = contactKey(contact);
    const existing = customers.get(key);
    if (existing) {
      if (!existing.email && contact.email) existing.email = contact.email;
      if (!existing.phone && contact.phone) existing.phone = contact.phone;
      if (!existing.whatsapp && contact.whatsapp) existing.whatsapp = contact.whatsapp;
      if (at > existing.lastActivityAt) existing.lastActivityAt = at;
      return existing;
    }
    const created: CustomerAccumulator = {
      key,
      name: contact.name,
      email: contact.email ?? null,
      phone: contact.phone ?? null,
      whatsapp: contact.whatsapp ?? null,
      orders: 0,
      bookings: 0,
      requests: 0,
      orderValue: 0,
      lastActivityAt: at,
      sources: new Set(),
    };
    customers.set(key, created);
    return created;
  };

  for (const order of orders) {
    const customer = upsert({ name: order.customerName, email: order.customerEmail, phone: order.customerPhone }, order.createdAt);
    customer.orders += 1;
    customer.sources.add("orders");
    if (order.status !== OrderStatus.CANCELLED) customer.orderValue += Number(order.total);
  }
  for (const booking of bookings) {
    const customer = upsert({ name: booking.customerName, email: booking.customerEmail, phone: booking.customerPhone }, booking.createdAt);
    customer.bookings += 1;
    customer.sources.add("bookings");
  }
  for (const request of requests) {
    const customer = upsert({ name: request.customerName, email: request.customerEmail, phone: request.customerPhone, whatsapp: request.customerWhatsapp }, request.createdAt);
    customer.requests += 1;
    customer.sources.add("requests");
  }

  const search = typeof request.query.search === "string" ? request.query.search.trim().toLowerCase() : "";
  const records = [...customers.values()]
    .filter((customer) => !search || customer.name.toLowerCase().includes(search) || customer.email?.toLowerCase().includes(search) || customer.phone?.includes(search) || customer.whatsapp?.includes(search))
    .sort((left, right) => right.lastActivityAt.getTime() - left.lastActivityAt.getTime())
    .map((customer) => ({
      key: customer.key,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      whatsapp: customer.whatsapp,
      orders: customer.orders,
      bookings: customer.bookings,
      requests: customer.requests,
      orderValue: Math.round(customer.orderValue * 100) / 100,
      lastActivityAt: customer.lastActivityAt,
      sources: [...customer.sources],
    }));

  return success(response, records);
});

export const listBusinessReviews = asyncHandler(async (request, response) => {
  const businessId = getParam(request, "businessId");
  const [reviews, summary] = await Promise.all([
    prisma.review.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        customerName: true,
        rating: true,
        comment: true,
        isPublished: true,
        isVerified: true,
        createdAt: true,
        service: { select: { id: true, name: true } },
      },
    }),
    prisma.review.aggregate({ where: { businessId, isPublished: true }, _avg: { rating: true }, _count: { _all: true } }),
  ]);
  return success(response, {
    reviews,
    summary: {
      total: reviews.length,
      published: summary._count._all,
      average: Math.round((summary._avg.rating ?? 0) * 10) / 10,
    },
  });
});

export const setReviewPublished = asyncHandler(async (request, response) => {
  const review = await prisma.review.update({
    where: { id: getParam(request, "id") },
    data: { isPublished: request.body.isPublished },
    select: { id: true, isPublished: true },
  });
  return success(response, review);
});
