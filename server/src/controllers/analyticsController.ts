import { EventType, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { notFound } from "../utils/errors.js";
import { success } from "../utils/responses.js";
import { getParam } from "../utils/requestParam.js";
import { eventSchema } from "../validators/schemas.js";

export const createPublicEvent = asyncHandler(async (request, response) => {
  const input = eventSchema.parse(request.body);
  const business = await prisma.business.findFirst({ where: { slug: getParam(request, "slug"), isBlocked: false }, select: { id: true, isPublished: true } });
  if (!business?.isPublished) throw notFound("Business page not found");
  const event = await prisma.businessEvent.create({
    data: { businessId: business.id, eventType: input.eventType, metadata: (input.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue },
  });
  return success(response, { id: event.id }, 201);
});

export const getAnalytics = asyncHandler(async (request, response) => {
  const businessId = getParam(request, "businessId");
  const business = await prisma.business.findUnique({ where: { id: businessId }, select: { id: true } });
  if (!business) throw notFound("Business not found");

  const [eventCounts, requests, quotes, acceptedQuotes, quoteValue, bookings, completedBookings, upcomingBookings] = await Promise.all([
    prisma.businessEvent.groupBy({ by: ["eventType"], where: { businessId }, _count: { _all: true } }),
    prisma.customerRequest.count({ where: { businessId } }),
    prisma.quote.count({ where: { businessId } }),
    prisma.quote.count({ where: { businessId, status: "ACCEPTED" } }),
    prisma.quote.aggregate({ where: { businessId, status: "ACCEPTED" }, _sum: { total: true } }),
    prisma.booking.count({ where: { businessId, status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] } } }),
    prisma.booking.count({ where: { businessId, status: "COMPLETED" } }),
    prisma.booking.count({ where: { businessId, status: "CONFIRMED", startAt: { gte: new Date() } } }),
  ]);
  const counts = new Map<EventType, number>(eventCounts.map((event) => [event.eventType, event._count?._all ?? 0]));
  const pageViews = counts.get(EventType.PAGE_VIEW) ?? 0;
  const whatsappClicks = counts.get(EventType.WHATSAPP_CLICK) ?? 0;
  const phoneClicks = counts.get(EventType.PHONE_CLICK) ?? 0;
  const directionsClicks = counts.get(EventType.DIRECTIONS_CLICK) ?? 0;
  const actionCount = whatsappClicks + phoneClicks + directionsClicks +
    (counts.get(EventType.ORDER_CLICK) ?? 0) + (counts.get(EventType.BOOKING_CLICK) ?? 0) +
    (counts.get(EventType.PAYMENT_CLICK) ?? 0) + (counts.get(EventType.QUOTE_REQUEST) ?? 0);
  return success(response, {
    pageViews,
    requests,
    quotes,
    acceptedQuotes,
    whatsappClicks,
    phoneClicks,
    directionsClicks,
    calls: phoneClicks,
    directions: directionsClicks,
    quoteValue: Number(quoteValue._sum.total ?? 0),
    bookingClicks: counts.get(EventType.BOOKING_CLICK) ?? 0,
    bookings,
    completedBookings,
    upcomingBookings,
    reviewsSubmitted: counts.get(EventType.REVIEW_SUBMITTED) ?? 0,
    funnel: { visitors: pageViews, actions: actionCount, requests, quotes, acceptedQuotes, bookings, completedBookings },
  });
});

export const getAnalyticsEvents = asyncHandler(async (request, response) => {
  const records = await prisma.businessEvent.findMany({
    where: { businessId: getParam(request, "businessId") },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return success(response, records);
});

export const getReviews = asyncHandler(async (request, response) => {
  const business = await prisma.business.findFirst({ where: { slug: getParam(request, "slug"), isBlocked: false }, select: { id: true, isPublished: true } });
  if (!business?.isPublished) throw notFound("Business page not found");
  return success(response, await prisma.review.findMany({ where: { businessId: business.id, isPublished: true }, orderBy: { createdAt: "desc" } }));
});
