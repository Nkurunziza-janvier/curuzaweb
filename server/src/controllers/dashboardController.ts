import { BookingStatus, EventType, OrderPaymentStatus, OrderStatus, QuoteStatus, RequestStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { availableCapabilityKeys } from "../config/businessCatalog.js";
import { addDateDays, dateKeyFor, zonedTimeToUtc } from "../services/timezone.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { notFound } from "../utils/errors.js";
import { success } from "../utils/responses.js";
import { getParam } from "../utils/requestParam.js";

function effectiveCapabilities(capabilities: string[]) {
  return new Set<string>(capabilities.length ? capabilities : availableCapabilityKeys);
}

export const getWorkspaceSummary = asyncHandler(async (request, response) => {
  const businessId = getParam(request, "businessId");
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      id: true,
      currency: true,
      capabilities: true,
      bookingSettings: { select: { isEnabled: true, timezone: true } },
    },
  });
  if (!business) throw notFound("Business not found");

  const capabilities = effectiveCapabilities(business.capabilities);
  const now = new Date();
  const timezone = business.bookingSettings?.timezone ?? "Africa/Kigali";
  const todayStart = zonedTimeToUtc(dateKeyFor(now, timezone), 0, timezone);
  const tomorrowStart = zonedTimeToUtc(addDateDays(dateKeyFor(now, timezone), 1), 0, timezone);

  const canOrders = capabilities.has("product_orders");
  const canBookings = capabilities.has("appointments");
  const canRequests = capabilities.has("service_requests") || capabilities.has("contact_form");
  const canQuotes = capabilities.has("service_requests");
  const canReviews = capabilities.has("reviews");

  const [
    eventCounts,
    productCount,
    productPublishedCount,
    productAvailableCount,
    serviceCount,
    servicePublishedCount,
    serviceBookableCount,
    availabilityWindowCount,
    requestTemplateCount,
    orderData,
    bookingData,
    requestData,
    quoteData,
    reviewData,
  ] = await Promise.all([
    prisma.businessEvent.groupBy({ by: ["eventType"], where: { businessId }, _count: { _all: true } }),
    capabilities.has("products") ? prisma.product.count({ where: { businessId } }) : Promise.resolve(0),
    capabilities.has("products") ? prisma.product.count({ where: { businessId, isPublished: true } }) : Promise.resolve(0),
    capabilities.has("products") ? prisma.product.count({ where: { businessId, isAvailable: true } }) : Promise.resolve(0),
    capabilities.has("services") ? prisma.service.count({ where: { businessId } }) : Promise.resolve(0),
    capabilities.has("services") ? prisma.service.count({ where: { businessId, isPublished: true } }) : Promise.resolve(0),
    capabilities.has("services") ? prisma.service.count({ where: { businessId, isBookable: true } }) : Promise.resolve(0),
    canBookings ? prisma.availabilityWindow.count({ where: { businessId, isActive: true } }) : Promise.resolve(0),
    canRequests ? prisma.requestTemplate.count({ where: { businessId, isActive: true } }) : Promise.resolve(0),
    canOrders ? Promise.all([
      prisma.order.count({ where: { businessId, status: OrderStatus.PENDING } }),
      prisma.order.count({ where: { businessId, status: OrderStatus.CONFIRMED } }),
      prisma.order.count({ where: { businessId, status: OrderStatus.PROCESSING } }),
      prisma.order.count({ where: { businessId, status: OrderStatus.READY } }),
      prisma.order.count({ where: { businessId, status: OrderStatus.COMPLETED } }),
      prisma.order.count({ where: { businessId, status: OrderStatus.CANCELLED } }),
      prisma.order.count({ where: { businessId, status: { not: OrderStatus.CANCELLED }, paymentStatus: { in: [OrderPaymentStatus.UNPAID, OrderPaymentStatus.PENDING] } } }),
      prisma.order.aggregate({ where: { businessId, paymentStatus: OrderPaymentStatus.PAID }, _sum: { total: true } }),
      prisma.order.findMany({
        where: { businessId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, orderNumber: true, customerName: true, status: true, paymentStatus: true, fulfillment: true, total: true, currency: true, createdAt: true },
      }),
      prisma.order.count({ where: { businessId } }),
    ]) : Promise.resolve(null),
    canBookings ? Promise.all([
      prisma.booking.count({ where: { businessId, startAt: { gte: todayStart, lt: tomorrowStart }, status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] } } }),
      prisma.booking.count({ where: { businessId, status: BookingStatus.PENDING } }),
      prisma.booking.count({ where: { businessId, status: BookingStatus.CONFIRMED, startAt: { gte: now } } }),
      prisma.booking.count({ where: { businessId, status: BookingStatus.COMPLETED } }),
      prisma.booking.findMany({
        where: { businessId, status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] }, startAt: { gte: now } },
        orderBy: { startAt: "asc" },
        take: 5,
        select: { id: true, bookingNumber: true, customerName: true, status: true, startAt: true, endAt: true, timezone: true, service: { select: { name: true } } },
      }),
      prisma.booking.count({ where: { businessId } }),
    ]) : Promise.resolve(null),
    canRequests ? Promise.all([
      prisma.customerRequest.count({ where: { businessId, status: RequestStatus.NEW } }),
      prisma.customerRequest.count({ where: { businessId, status: RequestStatus.REVIEWING } }),
      prisma.customerRequest.count({ where: { businessId, status: RequestStatus.QUOTE_SENT } }),
      prisma.customerRequest.count({ where: { businessId, status: RequestStatus.CUSTOMER_RESPONDED } }),
      prisma.customerRequest.count({ where: { businessId, status: RequestStatus.ACCEPTED } }),
      prisma.customerRequest.count({ where: { businessId } }),
      prisma.customerRequest.findMany({
        where: { businessId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, requestNumber: true, customerName: true, requestType: true, status: true, createdAt: true },
      }),
    ]) : Promise.resolve(null),
    canQuotes ? Promise.all([
      prisma.quote.count({ where: { businessId, status: QuoteStatus.DRAFT } }),
      prisma.quote.count({ where: { businessId, status: { in: [QuoteStatus.SENT, QuoteStatus.VIEWED] } } }),
      prisma.quote.count({ where: { businessId, status: QuoteStatus.ACCEPTED } }),
      prisma.quote.aggregate({ where: { businessId, status: { in: [QuoteStatus.SENT, QuoteStatus.VIEWED, QuoteStatus.CHANGE_REQUESTED] } }, _sum: { total: true } }),
      prisma.quote.findMany({
        where: { businessId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, quoteNumber: true, status: true, total: true, currency: true, createdAt: true, request: { select: { customerName: true } } },
      }),
    ]) : Promise.resolve(null),
    canReviews ? Promise.all([
      prisma.review.count({ where: { businessId } }),
      prisma.review.count({ where: { businessId, isPublished: true } }),
      prisma.review.aggregate({ where: { businessId, isPublished: true }, _avg: { rating: true } }),
      prisma.review.findMany({ where: { businessId }, orderBy: { createdAt: "desc" }, take: 3, select: { id: true, customerName: true, rating: true, comment: true, isPublished: true, createdAt: true } }),
    ]) : Promise.resolve(null),
  ]);

  const eventCount = (type: EventType) => eventCounts.find((entry) => entry.eventType === type)?._count._all ?? 0;
  const pageViews = eventCount(EventType.PAGE_VIEW);
  const whatsappClicks = eventCount(EventType.WHATSAPP_CLICK);
  const phoneClicks = eventCount(EventType.PHONE_CLICK);
  const directionsClicks = eventCount(EventType.DIRECTIONS_CLICK);
  const actions = whatsappClicks + phoneClicks + directionsClicks +
    eventCount(EventType.ORDER_CLICK) + eventCount(EventType.BOOKING_CLICK) +
    eventCount(EventType.PAYMENT_CLICK) + eventCount(EventType.QUOTE_REQUEST);

  return success(response, {
    capabilities: [...capabilities],
    currency: business.currency,
    catalog: {
      products: { total: productCount, published: productPublishedCount, available: productAvailableCount },
      services: { total: serviceCount, published: servicePublishedCount, bookable: serviceBookableCount },
    },
    bookingSettings: {
      configured: availabilityWindowCount > 0,
      enabled: Boolean(business.bookingSettings?.isEnabled),
      timezone,
    },
    requestTemplate: { configured: requestTemplateCount > 0 },
    orders: orderData ? {
      pending: orderData[0],
      confirmed: orderData[1],
      processing: orderData[2],
      ready: orderData[3],
      completed: orderData[4],
      cancelled: orderData[5],
      unpaid: orderData[6],
      paidValue: Number(orderData[7]._sum.total ?? 0),
      recent: orderData[8],
      total: orderData[9],
    } : null,
    bookings: bookingData ? {
      today: bookingData[0],
      pending: bookingData[1],
      upcoming: bookingData[2],
      completed: bookingData[3],
      next: bookingData[4],
      total: bookingData[5],
      timezone,
    } : null,
    requests: requestData ? {
      new: requestData[0],
      reviewing: requestData[1],
      quoteSent: requestData[2],
      customerResponded: requestData[3],
      accepted: requestData[4],
      total: requestData[5],
      recent: requestData[6],
    } : null,
    quotes: quoteData ? {
      draft: quoteData[0],
      sent: quoteData[1],
      accepted: quoteData[2],
      pendingValue: Number(quoteData[3]._sum.total ?? 0),
      recent: quoteData[4],
    } : null,
    reviews: reviewData ? {
      total: reviewData[0],
      published: reviewData[1],
      average: Math.round((reviewData[2]._avg.rating ?? 0) * 10) / 10,
      recent: reviewData[3],
    } : null,
    analytics: { pageViews, actions, whatsappClicks, phoneClicks, directionsClicks },
  });
});
