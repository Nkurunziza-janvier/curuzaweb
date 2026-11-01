import { BookingActor, BookingStatus, EventType, Prisma } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { prisma } from "../config/prisma.js";
import { availableCapabilityKeys } from "../config/businessCatalog.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError, badRequest, conflict, notFound, unauthorized } from "../utils/errors.js";
import { success } from "../utils/responses.js";
import { getParam } from "../utils/requestParam.js";
import {
  ACTIVE_BOOKING_STATUSES,
  assertSlotAvailable,
  getAvailability,
  loadBookingService,
  type BookingServiceConfig,
} from "../services/availability.js";
import { addDateDays, dateKeyFor, zonedTimeToUtc } from "../services/timezone.js";
import { generateReference } from "../utils/references.js";
import {
  availabilityBlockSchema,
  availabilityWindowsSchema,
  bookingCancelSchema,
  bookingListQuerySchema,
  bookingNoteSchema,
  bookingReviewSchema,
  bookingScheduleSchema,
  bookingSettingsSchema,
  bookingStatusSchema,
  createBookingSchema,
  publicAvailabilityQuerySchema,
} from "../validators/schemas.js";

const publicBookingInclude = {
  service: {
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      startingPrice: true,
      currency: true,
      duration: true,
      durationMinutes: true,
    },
  },
  business: {
    select: {
      id: true,
      name: true,
      slug: true,
      phone: true,
      whatsapp: true,
      email: true,
      address: true,
      city: true,
      country: true,
      bookingSettings: {
        select: { cancellationCutoffMinutes: true, requireConfirmation: true },
      },
    },
  },
  review: {
    select: { id: true, rating: true, comment: true, createdAt: true, isVerified: true },
  },
} satisfies Prisma.BookingInclude;

const ownerBookingInclude = {
  ...publicBookingInclude,
  service: {
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      startingPrice: true,
      currency: true,
      duration: true,
      durationMinutes: true,
      capacity: true,
    },
  },
} satisfies Prisma.BookingInclude;

type PublicBookingRecord = Prisma.BookingGetPayload<{ include: typeof publicBookingInclude }>;

function publicBooking(record: PublicBookingRecord) {
  const now = Date.now();
  const cutoff = record.business.bookingSettings?.cancellationCutoffMinutes ?? 120;
  const canCancel = ACTIVE_BOOKING_STATUSES.includes(record.status) &&
    record.startAt.getTime() - cutoff * 60_000 > now;
  return {
    id: record.id,
    bookingNumber: record.bookingNumber,
    publicToken: record.publicToken,
    status: record.status,
    startAt: record.startAt,
    endAt: record.endAt,
    timezone: record.timezone,
    durationMinutes: record.durationMinutes,
    startingPriceSnapshot: record.startingPriceSnapshot,
    currency: record.currency,
    customerName: record.customerName,
    customerPhone: record.customerPhone,
    customerEmail: record.customerEmail,
    customerNote: record.customerNote,
    createdAt: record.createdAt,
    confirmedAt: record.confirmedAt,
    rejectedAt: record.rejectedAt,
    completedAt: record.completedAt,
    cancelledAt: record.cancelledAt,
    cancellationReason: record.cancellationReason,
    service: record.service,
    business: {
      id: record.business.id,
      name: record.business.name,
      slug: record.business.slug,
      phone: record.business.phone,
      whatsapp: record.business.whatsapp,
      email: record.business.email,
      address: record.business.address,
      city: record.business.city,
      country: record.business.country,
    },
    review: record.review,
    policy: {
      requireConfirmation: record.business.bookingSettings?.requireConfirmation ?? true,
      cancellationCutoffMinutes: cutoff,
    },
    canCancel,
    canReview: record.status === BookingStatus.COMPLETED && !record.review,
  };
}

function publicService(service: BookingServiceConfig) {
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    imageUrl: service.imageUrl,
    startingPrice: service.startingPrice,
    currency: service.currency,
    duration: service.duration,
    durationMinutes: service.durationMinutes,
    bufferMinutes: service.bufferMinutes,
    capacity: service.capacity,
  };
}

export const getPublicAvailability = asyncHandler(async (request, response) => {
  const input = publicAvailabilityQuerySchema.parse(request.query);
  const business = await prisma.business.findFirst({
    where: { slug: getParam(request, "slug"), isBlocked: false },
    select: { id: true, isPublished: true, capabilities: true },
  });
  if (!business?.isPublished) throw notFound("Business page not found");
  const capabilities = new Set<string>(business.capabilities.length ? business.capabilities : availableCapabilityKeys);
  if (!capabilities.has("appointments") || !capabilities.has("services")) throw badRequest("This business is not accepting online bookings right now.");
  const service = await loadBookingService(prisma, business.id, input.serviceId);
  const timezone = service.business.bookingSettings?.timezone ?? "Africa/Kigali";
  const today = dateKeyFor(new Date(), timezone);
  const from = input.from ?? today;
  const to = input.to ?? addDateDays(from, 13);
  const availability = await getAvailability({ service, from, to });
  return success(response, {
    timezone: availability.timezone,
    from,
    to,
    service: publicService(service),
    policy: {
      minNoticeMinutes: service.business.bookingSettings?.minNoticeMinutes ?? 60,
      maxAdvanceDays: service.business.bookingSettings?.maxAdvanceDays ?? 60,
      requireConfirmation: service.business.bookingSettings?.requireConfirmation ?? true,
      cancellationCutoffMinutes: service.business.bookingSettings?.cancellationCutoffMinutes ?? 120,
    },
    days: availability.days,
  });
});

export const createPublicBooking = asyncHandler(async (request, response) => {
  const input = createBookingSchema.parse(request.body);
  const business = await prisma.business.findFirst({
    where: { slug: getParam(request, "slug"), isBlocked: false },
    select: { id: true, isPublished: true, capabilities: true },
  });
  if (!business?.isPublished) throw notFound("Business page not found");
  const capabilities = new Set<string>(business.capabilities.length ? business.capabilities : availableCapabilityKeys);
  if (!capabilities.has("appointments") || !capabilities.has("services")) throw badRequest("This business is not accepting online bookings right now.");

  const created = await prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.serviceId}))`;
    const slot = await assertSlotAvailable(transaction, business.id, input.serviceId, input.startAt);
    const status = slot.settings.requireConfirmation ? BookingStatus.PENDING : BookingStatus.CONFIRMED;
    const now = new Date();
    const bookingNumber = generateReference("EB", 6);
    const booking = await transaction.booking.create({
      data: {
        bookingNumber,
        publicToken: randomBytes(32).toString("base64url"),
        businessId: business.id,
        serviceId: slot.service.id,
        customerName: input.customerName,
        customerPhone: input.customerPhone?.trim() || null,
        customerEmail: input.customerEmail?.trim() || null,
        customerNote: input.customerNote,
        status,
        startAt: slot.startAt,
        endAt: slot.endAt,
        timezone: slot.settings.timezone,
        durationMinutes: slot.service.durationMinutes!,
        startingPriceSnapshot: slot.service.startingPrice,
        currency: slot.service.currency,
        confirmedAt: status === BookingStatus.CONFIRMED ? now : null,
      },
    });
    await transaction.businessEvent.create({
      data: {
        businessId: business.id,
        eventType: EventType.BOOKING_CREATED,
        metadata: {
          bookingNumber,
          serviceId: slot.service.id,
          serviceName: slot.service.name,
          startAt: slot.startAt.toISOString(),
          status,
        },
      },
    });
    if (status === BookingStatus.CONFIRMED) {
      await transaction.businessEvent.create({
        data: { businessId: business.id, eventType: EventType.BOOKING_CONFIRMED, metadata: { bookingNumber } },
      });
    }
    await transaction.notification.create({
      data: {
        userId: slot.service.business.ownerId,
        title: status === BookingStatus.CONFIRMED ? `Booking confirmed: ${bookingNumber}` : `New booking request: ${bookingNumber}`,
        message: `${input.customerName} · ${slot.service.name} · ${slot.startAt.toISOString()}`,
        type: "BOOKING",
        link: `/dashboard/bookings`,
      },
    });
    return transaction.booking.findUniqueOrThrow({
      where: { id: booking.id },
      include: publicBookingInclude,
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });

  return success(response, publicBooking(created), 201);
});

export const getPublicBooking = asyncHandler(async (request, response) => {
  const booking = await prisma.booking.findUnique({
    where: { publicToken: getParam(request, "publicToken") },
    include: publicBookingInclude,
  });
  if (!booking) throw notFound("Booking not found");
  return success(response, publicBooking(booking));
});

export const cancelPublicBooking = asyncHandler(async (request, response) => {
  const input = bookingCancelSchema.parse(request.body ?? {});
  const token = getParam(request, "publicToken");
  const booking = await prisma.booking.findUnique({
    where: { publicToken: token },
    include: { business: { select: { ownerId: true, bookingSettings: { select: { cancellationCutoffMinutes: true } } } } },
  });
  if (!booking) throw notFound("Booking not found");
  if (!ACTIVE_BOOKING_STATUSES.includes(booking.status)) {
    throw badRequest("This booking can no longer be cancelled online.");
  }
  const cutoff = booking.business.bookingSettings?.cancellationCutoffMinutes ?? 120;
  if (booking.startAt.getTime() - cutoff * 60_000 <= Date.now()) {
    throw badRequest("This appointment is too close to cancel online. Please contact the business directly.");
  }
  const updated = await prisma.booking.updateMany({
    where: { id: booking.id, status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] } },
    data: {
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelledBy: BookingActor.CUSTOMER,
      cancellationReason: input.reason || "Cancelled by customer",
    },
  });
  if (!updated.count) throw conflict("This booking was already updated. Refresh the page to see its current status.");
  await prisma.businessEvent.create({
    data: {
      businessId: booking.businessId,
      eventType: EventType.BOOKING_CANCELLED,
      metadata: { bookingNumber: booking.bookingNumber, cancelledBy: "CUSTOMER" },
    },
  });
  await prisma.notification.create({
    data: {
      userId: booking.business.ownerId,
      title: `Booking cancelled: ${booking.bookingNumber}`,
      message: `${booking.customerName} cancelled their appointment.`,
      type: "BOOKING",
      link: `/dashboard/bookings`,
    },
  });
  const result = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id }, include: publicBookingInclude });
  return success(response, publicBooking(result));
});

export const createPublicBookingReview = asyncHandler(async (request, response) => {
  const input = bookingReviewSchema.parse(request.body);
  const token = getParam(request, "publicToken");
  const booking = await prisma.booking.findUnique({
    where: { publicToken: token },
    include: { review: { select: { id: true } }, business: { select: { ownerId: true } } },
  });
  if (!booking) throw notFound("Booking not found");
  if (booking.status !== BookingStatus.COMPLETED) throw badRequest("Reviews are available after the booking is completed.");
  if (booking.review) throw conflict("A review has already been submitted for this booking.");
  try {
    const review = await prisma.$transaction(async (transaction) => {
      const created = await transaction.review.create({
        data: {
          businessId: booking.businessId,
          serviceId: booking.serviceId,
          bookingId: booking.id,
          customerName: booking.customerName,
          rating: input.rating,
          comment: input.comment,
          isVerified: true,
        },
      });
      await transaction.businessEvent.create({
        data: {
          businessId: booking.businessId,
          eventType: EventType.REVIEW_SUBMITTED,
          metadata: { bookingNumber: booking.bookingNumber, rating: input.rating, serviceId: booking.serviceId },
        },
      });
      await transaction.notification.create({
        data: {
          userId: booking.business.ownerId,
          title: `New verified review: ${input.rating}/5`,
          message: `${booking.customerName} reviewed ${booking.bookingNumber}.`,
          type: "REVIEW",
          link: `/dashboard/bookings`,
        },
      });
      return created;
    });
    return success(response, review, 201);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw conflict("A review has already been submitted for this booking.");
    }
    throw error;
  }
});

export const getBookingSettings = asyncHandler(async (request, response) => {
  const businessId = getParam(request, "businessId");
  const [settings, windows, blocks] = await Promise.all([
    prisma.bookingSettings.findUnique({ where: { businessId } }),
    prisma.availabilityWindow.findMany({ where: { businessId }, orderBy: [{ weekday: "asc" }, { startMinute: "asc" }] }),
    prisma.availabilityBlock.findMany({ where: { businessId }, orderBy: { startsAt: "asc" } }),
  ]);
  return success(response, {
    settings: settings ?? {
      businessId,
      isEnabled: false,
      timezone: "Africa/Kigali",
      slotIntervalMinutes: 30,
      minNoticeMinutes: 60,
      maxAdvanceDays: 60,
      cancellationCutoffMinutes: 120,
      requireConfirmation: true,
    },
    configured: Boolean(settings),
    windows,
    blocks,
  });
});

export const updateBookingSettings = asyncHandler(async (request, response) => {
  const input = bookingSettingsSchema.parse(request.body);
  const businessId = getParam(request, "businessId");
  const settings = await prisma.bookingSettings.upsert({
    where: { businessId },
    update: input,
    create: {
      businessId,
      isEnabled: input.isEnabled ?? false,
      timezone: input.timezone ?? "Africa/Kigali",
      slotIntervalMinutes: input.slotIntervalMinutes ?? 30,
      minNoticeMinutes: input.minNoticeMinutes ?? 60,
      maxAdvanceDays: input.maxAdvanceDays ?? 60,
      cancellationCutoffMinutes: input.cancellationCutoffMinutes ?? 120,
      requireConfirmation: input.requireConfirmation ?? true,
    },
  });
  return success(response, settings);
});

export const replaceAvailabilityWindows = asyncHandler(async (request, response) => {
  const input = availabilityWindowsSchema.parse(request.body);
  const businessId = getParam(request, "businessId");
  const windows = await prisma.$transaction(async (transaction) => {
    await transaction.availabilityWindow.deleteMany({ where: { businessId } });
    if (input.windows.length) {
      await transaction.availabilityWindow.createMany({
        data: input.windows.map((window) => ({ ...window, businessId })),
      });
    }
    return transaction.availabilityWindow.findMany({ where: { businessId }, orderBy: [{ weekday: "asc" }, { startMinute: "asc" }] });
  });
  return success(response, windows);
});

export const createAvailabilityBlock = asyncHandler(async (request, response) => {
  const input = availabilityBlockSchema.parse(request.body);
  const businessId = getParam(request, "businessId");
  if (input.endsAt <= new Date()) throw badRequest("Choose a block that ends in the future.");
  if (input.serviceId) {
    const service = await prisma.service.findFirst({ where: { id: input.serviceId, businessId }, select: { id: true } });
    if (!service) throw notFound("Service not found");
  }
  const block = await prisma.availabilityBlock.create({ data: { ...input, businessId } });
  return success(response, block, 201);
});

export const deleteAvailabilityBlock = asyncHandler(async (request, response) => {
  const block = await prisma.availabilityBlock.findFirst({
    where: { id: getParam(request, "id"), businessId: getParam(request, "businessId") },
    select: { id: true },
  });
  if (!block) throw notFound("Availability block not found");
  await prisma.availabilityBlock.delete({ where: { id: block.id } });
  return response.status(204).end();
});

export const listBusinessBookings = asyncHandler(async (request, response) => {
  const businessId = getParam(request, "businessId");
  const input = bookingListQuerySchema.parse(request.query);
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { bookingSettings: { select: { timezone: true } } },
  });
  const timezone = business?.bookingSettings?.timezone ?? "Africa/Kigali";
  const where: Prisma.BookingWhereInput = { businessId };
  if (input.status) where.status = input.status;
  if (input.from || input.to) {
    where.startAt = {
      ...(input.from ? { gte: zonedTimeToUtc(input.from, 0, timezone) } : {}),
      ...(input.to ? { lt: zonedTimeToUtc(addDateDays(input.to, 1), 0, timezone) } : {}),
    };
  }
  if (input.search) {
    where.OR = [
      { bookingNumber: { contains: input.search, mode: "insensitive" } },
      { customerName: { contains: input.search, mode: "insensitive" } },
      { customerPhone: { contains: input.search, mode: "insensitive" } },
      { service: { name: { contains: input.search, mode: "insensitive" } } },
    ];
  }
  const bookings = await prisma.booking.findMany({
    where,
    include: ownerBookingInclude,
    orderBy: { startAt: "desc" },
  });
  return success(response, bookings);
});

export const getBookingSummary = asyncHandler(async (request, response) => {
  const businessId = getParam(request, "businessId");
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { bookingSettings: { select: { timezone: true } } },
  });
  const timezone = business?.bookingSettings?.timezone ?? "Africa/Kigali";
  const now = new Date();
  const todayStart = zonedTimeToUtc(dateKeyFor(now, timezone), 0, timezone);
  const tomorrowStart = zonedTimeToUtc(addDateDays(dateKeyFor(now, timezone), 1), 0, timezone);
  const [today, pending, confirmed, completed, cancelled, rejected] = await Promise.all([
    prisma.booking.count({ where: { businessId, startAt: { gte: todayStart, lt: tomorrowStart }, status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] } } }),
    prisma.booking.count({ where: { businessId, status: BookingStatus.PENDING } }),
    prisma.booking.count({ where: { businessId, status: BookingStatus.CONFIRMED, startAt: { gte: now } } }),
    prisma.booking.count({ where: { businessId, status: BookingStatus.COMPLETED } }),
    prisma.booking.count({ where: { businessId, status: BookingStatus.CANCELLED } }),
    prisma.booking.count({ where: { businessId, status: BookingStatus.REJECTED } }),
  ]);
  return success(response, { today, pending, confirmed, completed, cancelled, rejected, timezone });
});

export const getBooking = asyncHandler(async (request, response) => {
  const booking = await prisma.booking.findUnique({
    where: { id: getParam(request, "id") },
    include: ownerBookingInclude,
  });
  if (!booking) throw notFound("Booking not found");
  return success(response, booking);
});

const allowedTransitions: Partial<Record<BookingStatus, BookingStatus[]>> = {
  [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.REJECTED, BookingStatus.CANCELLED],
  [BookingStatus.CONFIRMED]: [BookingStatus.COMPLETED, BookingStatus.NO_SHOW, BookingStatus.CANCELLED],
};

const statusEvents: Partial<Record<BookingStatus, EventType>> = {
  [BookingStatus.CONFIRMED]: EventType.BOOKING_CONFIRMED,
  [BookingStatus.REJECTED]: EventType.BOOKING_CANCELLED,
  [BookingStatus.CANCELLED]: EventType.BOOKING_CANCELLED,
  [BookingStatus.COMPLETED]: EventType.BOOKING_COMPLETED,
  [BookingStatus.NO_SHOW]: EventType.BOOKING_COMPLETED,
};

export const updateBookingStatus = asyncHandler(async (request, response) => {
  const { status } = bookingStatusSchema.parse(request.body);
  const id = getParam(request, "id");
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw notFound("Booking not found");
  if (booking.status === status) {
    return success(response, await prisma.booking.findUniqueOrThrow({ where: { id }, include: ownerBookingInclude }));
  }
  if (!allowedTransitions[booking.status]?.includes(status)) {
    throw badRequest(`A ${booking.status.toLowerCase()} booking cannot be changed to ${status.toLowerCase()}.`);
  }
  const now = new Date();
  const data: Prisma.BookingUpdateInput = { status };
  if (status === BookingStatus.CONFIRMED) data.confirmedAt = now;
  if (status === BookingStatus.REJECTED) data.rejectedAt = now;
  if (status === BookingStatus.COMPLETED) data.completedAt = now;
  if (status === BookingStatus.CANCELLED) {
    data.cancelledAt = now;
    data.cancelledBy = BookingActor.BUSINESS;
    data.cancellationReason = "Cancelled by business";
  }

  const updated = await prisma.$transaction(async (transaction) => {
    if (status === BookingStatus.CONFIRMED) {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${booking.serviceId}))`;
      await assertSlotAvailable(transaction, booking.businessId, booking.serviceId, booking.startAt, { excludeBookingId: booking.id });
    }
    const result = await transaction.booking.update({ where: { id }, data, include: ownerBookingInclude });
    await transaction.businessEvent.create({
      data: {
        businessId: booking.businessId,
        eventType: statusEvents[status] ?? EventType.BOOKING_CANCELLED,
        metadata: { bookingNumber: booking.bookingNumber, status },
      },
    });
    return result;
  });
  return success(response, updated);
});

export const rescheduleBooking = asyncHandler(async (request, response) => {
  const input = bookingScheduleSchema.parse(request.body);
  const id = getParam(request, "id");
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw notFound("Booking not found");
  if (!ACTIVE_BOOKING_STATUSES.includes(booking.status)) {
    throw badRequest("Only pending or confirmed bookings can be rescheduled.");
  }
  const updated = await prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${booking.serviceId}))`;
    const slot = await assertSlotAvailable(transaction, booking.businessId, booking.serviceId, input.startAt, { excludeBookingId: booking.id });
    const result = await transaction.booking.update({
      where: { id },
      data: { startAt: slot.startAt, endAt: slot.endAt, timezone: slot.settings.timezone },
      include: ownerBookingInclude,
    });
    await transaction.businessEvent.create({
      data: {
        businessId: booking.businessId,
        eventType: EventType.BOOKING_RESCHEDULED,
        metadata: {
          bookingNumber: booking.bookingNumber,
          previousStartAt: booking.startAt.toISOString(),
          startAt: slot.startAt.toISOString(),
        },
      },
    });
    return result;
  });
  return success(response, updated);
});

export const updateBookingNote = asyncHandler(async (request, response) => {
  const input = bookingNoteSchema.parse(request.body);
  const booking = await prisma.booking.update({
    where: { id: getParam(request, "id") },
    data: { ownerNote: input.ownerNote },
    include: ownerBookingInclude,
  });
  return success(response, booking);
});
