import { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError, badRequest, notFound } from "../utils/errors.js";
import {
  addDateDays,
  addMinutes,
  dateKeyFor,
  eachDateKey,
  localTimeFor,
  slotLabel,
  weekdayForDateKey,
  zonedTimeToUtc,
} from "./timezone.js";

export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [BookingStatus.PENDING, BookingStatus.CONFIRMED];

type Db = Prisma.TransactionClient | typeof prisma;

export interface Slot {
  startAt: string;
  endAt: string;
  label: string;
}

export interface AvailabilityDay {
  date: string;
  slots: Slot[];
}

export interface BookingServiceConfig {
  id: string;
  businessId: string;
  name: string;
  description: string;
  imageUrl: string | null;
  startingPrice: Prisma.Decimal;
  currency: string;
  duration: string | null;
  durationMinutes: number | null;
  bufferMinutes: number;
  capacity: number;
  isBookable: boolean;
  isPublished: boolean;
  business: {
    id: string;
    ownerId: string;
    name: string;
    slug: string;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    city: string | null;
    address: string | null;
    timezone: string | null;
    isPublished: boolean;
    isBlocked: boolean;
    canPublishProducts: boolean;
    productAccessExpiresAt: Date | null;
    bookingSettings: {
      isEnabled: boolean;
      timezone: string;
      slotIntervalMinutes: number;
      minNoticeMinutes: number;
      maxAdvanceDays: number;
      cancellationCutoffMinutes: number;
      requireConfirmation: boolean;
    } | null;
    availabilityWindows: Array<{ weekday: number; startMinute: number; endMinute: number; isActive: boolean }>;
  };
}

export function assertPublicBusinessCanBook(service: Pick<BookingServiceConfig, "isPublished" | "isBookable" | "durationMinutes" | "business">) {
  const business = service.business;
  if (!business.isPublished || business.isBlocked) throw notFound("Business page not found");
  if (!business.canPublishProducts || !business.productAccessExpiresAt || business.productAccessExpiresAt <= new Date()) {
    throw badRequest("Online booking is not available because this business does not have an active publishing plan.");
  }
  if (!business.bookingSettings?.isEnabled) throw badRequest("Online booking has not been enabled by this business.");
  if (!service.isPublished) throw notFound("Service not found");
  if (!service.isBookable) throw badRequest("This service is not available for online booking yet.");
  if (!service.durationMinutes || service.durationMinutes < 5) throw badRequest("This service has not been configured with a booking duration.");
  if (!business.availabilityWindows.some((window) => window.isActive)) throw badRequest("This business has not configured available booking hours yet.");
}

export async function loadBookingService(db: Db, businessId: string, serviceId: string): Promise<BookingServiceConfig> {
  const service = await db.service.findFirst({
    where: { id: serviceId, businessId },
    select: {
      id: true,
      businessId: true,
      name: true,
      description: true,
      imageUrl: true,
      startingPrice: true,
      currency: true,
      duration: true,
      durationMinutes: true,
      bufferMinutes: true,
      capacity: true,
      isBookable: true,
      isPublished: true,
      business: {
        select: {
          id: true,
          ownerId: true,
          name: true,
          slug: true,
          phone: true,
          whatsapp: true,
          email: true,
          city: true,
          address: true,
          isPublished: true,
          isBlocked: true,
          canPublishProducts: true,
          productAccessExpiresAt: true,
          bookingSettings: {
            select: {
              isEnabled: true,
              timezone: true,
              slotIntervalMinutes: true,
              minNoticeMinutes: true,
              maxAdvanceDays: true,
              cancellationCutoffMinutes: true,
              requireConfirmation: true,
            },
          },
          availabilityWindows: {
            where: { isActive: true },
            select: { weekday: true, startMinute: true, endMinute: true, isActive: true },
            orderBy: [{ weekday: "asc" }, { startMinute: "asc" }],
          },
        },
      },
    },
  });
  if (!service) throw notFound("Service not found");
  return {
    ...service,
    business: {
      ...service.business,
      timezone: service.business.bookingSettings?.timezone ?? "Africa/Kigali",
    },
  };
}

export async function getAvailability({
  service,
  from,
  to,
  excludeBookingId,
  now = new Date(),
}: {
  service: BookingServiceConfig;
  from: string;
  to: string;
  excludeBookingId?: string;
  now?: Date;
}): Promise<{ timezone: string; days: AvailabilityDay[] }> {
  assertPublicBusinessCanBook(service);
  const settings = service.business.bookingSettings!;
  if (to < from) throw badRequest("The availability date range is invalid.");
  if (eachDateKey(from, to, 32).length > 31) throw badRequest("Choose an availability range of 31 days or less.");

  const timezone = settings.timezone;
  const rangeStart = zonedTimeToUtc(from, 0, timezone);
  const rangeEnd = zonedTimeToUtc(addDateDays(to, 1), 0, timezone);
  const [blocks, bookings] = await Promise.all([
    prisma.availabilityBlock.findMany({
      where: {
        businessId: service.businessId,
        OR: [{ serviceId: null }, { serviceId: service.id }],
        startsAt: { lt: rangeEnd },
        endsAt: { gt: rangeStart },
      },
      select: { startsAt: true, endsAt: true },
    }),
    prisma.booking.findMany({
      where: {
        serviceId: service.id,
        status: { in: ACTIVE_BOOKING_STATUSES },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
        startAt: { lt: rangeEnd },
        endAt: { gt: rangeStart },
      },
      select: { startAt: true, endAt: true },
    }),
  ]);

  const todayKey = dateKeyFor(now, timezone);
  const noticeThreshold = addMinutes(now, settings.minNoticeMinutes);
  const advanceThreshold = addMinutes(now, settings.maxAdvanceDays * 24 * 60);
  const duration = service.durationMinutes!;
  const interval = settings.slotIntervalMinutes;
  const days: AvailabilityDay[] = [];

  for (const date of eachDateKey(from, to)) {
    if (date < todayKey) continue;
    const weekday = weekdayForDateKey(date);
    const windows = service.business.availabilityWindows.filter((window) => window.weekday === weekday && window.isActive);
    const slots: Slot[] = [];

    for (const window of windows) {
      for (let startMinute = window.startMinute; startMinute + duration <= window.endMinute; startMinute += interval) {
        const startAt = zonedTimeToUtc(date, startMinute, timezone);
        const endAt = addMinutes(startAt, duration);
        if (startAt < noticeThreshold || startAt > advanceThreshold) continue;
        if (blocks.some((block) => block.startsAt < endAt && block.endsAt > startAt)) continue;
        const conflicts = bookings.filter((booking) =>
          booking.startAt < addMinutes(endAt, service.bufferMinutes) &&
          booking.endAt > addMinutes(startAt, -service.bufferMinutes)
        ).length;
        if (conflicts >= Math.max(1, service.capacity)) continue;
        slots.push({ startAt: startAt.toISOString(), endAt: endAt.toISOString(), label: slotLabel(startAt, timezone) });
      }
    }

    const unique = [...new Map(slots.map((slot) => [slot.startAt, slot])).values()].sort((left, right) => left.startAt.localeCompare(right.startAt));
    days.push({ date, slots: unique });
  }

  return { timezone, days };
}

export async function assertSlotAvailable(
  db: Prisma.TransactionClient,
  businessId: string,
  serviceId: string,
  startAt: Date,
  options: { excludeBookingId?: string; now?: Date } = {},
) {
  const service = await loadBookingService(db, businessId, serviceId);
  assertPublicBusinessCanBook(service);
  if (startAt.getSeconds() !== 0 || startAt.getMilliseconds() !== 0) throw badRequest("Choose a valid appointment time.");
  const settings = service.business.bookingSettings!;
  const timezone = settings.timezone;
  const local = localTimeFor(startAt, timezone);
  const weekday = weekdayForDateKey(local.dateKey);
  const duration = service.durationMinutes!;
  const matchingWindow = service.business.availabilityWindows.find((window) =>
    window.weekday === weekday &&
    window.isActive &&
    local.minutes >= window.startMinute &&
    local.minutes + duration <= window.endMinute &&
    (local.minutes - window.startMinute) % settings.slotIntervalMinutes === 0
  );
  if (!matchingWindow) throw new AppError(409, "SLOT_UNAVAILABLE", "That appointment time is no longer available. Choose another slot.");
  const now = options.now ?? new Date();
  const endAt = addMinutes(startAt, duration);
  if (startAt < addMinutes(now, settings.minNoticeMinutes)) throw badRequest("This appointment time is too soon. Choose a later slot.");
  if (startAt > addMinutes(now, settings.maxAdvanceDays * 24 * 60)) throw badRequest("This appointment is too far in the future.");

  const [blocks, conflicts] = await Promise.all([
    db.availabilityBlock.findMany({
      where: {
        businessId: service.businessId,
        OR: [{ serviceId: null }, { serviceId: service.id }],
        startsAt: { lt: endAt },
        endsAt: { gt: startAt },
      },
      select: { id: true },
    }),
    db.booking.count({
      where: {
        serviceId: service.id,
        status: { in: ACTIVE_BOOKING_STATUSES },
        ...(options.excludeBookingId ? { id: { not: options.excludeBookingId } } : {}),
        startAt: { lt: addMinutes(endAt, service.bufferMinutes) },
        endAt: { gt: addMinutes(startAt, -service.bufferMinutes) },
      },
    }),
  ]);
  if (blocks.length) throw new AppError(409, "SLOT_UNAVAILABLE", "That appointment time is blocked. Choose another slot.");
  if (conflicts >= Math.max(1, service.capacity)) throw new AppError(409, "SLOT_UNAVAILABLE", "That appointment time was just booked. Choose another slot.");
  return { service, settings, startAt, endAt };
}
