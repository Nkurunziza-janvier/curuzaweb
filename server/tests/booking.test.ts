import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { dateKeyFor, zonedTimeToUtc } from "../src/services/timezone.js";

interface ApiBody<T> {
  success: boolean;
  data: T;
  error?: { message: string };
}

describe("service booking flow", () => {
  const suffix = randomUUID();
  const ownerEmail = `booking-owner-${suffix}@example.com`;
  let ownerToken = "";
  let businessId = "";
  let businessSlug = "";
  let serviceId = "";
  let dateKey = "";
  let bookingToken = "";

  beforeAll(async () => {
    const owner = await request(app).post("/api/auth/register").send({
      name: "Booking Owner",
      email: ownerEmail,
      password: "secure-test-password",
      businessName: `Booking Studio ${suffix.slice(0, 6)}`,
      category: "Beauty",
      phone: "+250788000006",
    });
    expect(owner.status).toBe(201);
    const data = (owner.body as ApiBody<{ token: string; user: { business: { id: string; slug: string } } }>).data;
    ownerToken = data.token;
    businessId = data.user.business.id;
    businessSlug = data.user.business.slug;

    await prisma.business.update({
      where: { id: businessId },
      data: {
        isPublished: true,
        canPublishProducts: true,
        productAccessExpiresAt: new Date(Date.now() + 30 * 86400000),
      },
    });

    const settings = await request(app)
      .patch(`/api/businesses/${businessId}/booking-settings`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        isEnabled: true,
        timezone: "Africa/Kigali",
        slotIntervalMinutes: 30,
        minNoticeMinutes: 0,
        maxAdvanceDays: 60,
        cancellationCutoffMinutes: 0,
        requireConfirmation: true,
      });
    expect(settings.status).toBe(200);

    const windows = await request(app)
      .put(`/api/businesses/${businessId}/availability`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        windows: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, startMinute: 540, endMinute: 1020 })),
      });
    expect(windows.status).toBe(200);

    const service = await request(app)
      .post(`/api/businesses/${businessId}/services`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        name: "Signature appointment",
        description: "A focused one-hour session.",
        startingPrice: 25000,
        durationMinutes: 60,
        bufferMinutes: 0,
        capacity: 1,
        isBookable: true,
        isPublished: true,
      });
    expect(service.status).toBe(201);
    serviceId = (service.body as ApiBody<{ id: string }>).data.id;

    dateKey = dateKeyFor(new Date(Date.now() + 5 * 86400000), "Africa/Kigali");
  });

  afterAll(async () => {
    if (businessId) {
      await prisma.booking.deleteMany({ where: { businessId } });
      await prisma.business.deleteMany({ where: { id: businessId } });
    }
    await prisma.user.deleteMany({ where: { email: ownerEmail } });
    await prisma.$disconnect();
  });

  it("publishes availability for a bookable service", async () => {
    const response = await request(app)
      .get(`/api/public/businesses/${businessSlug}/bookings/availability`)
      .query({ serviceId, from: dateKey, to: dateKey });
    expect(response.status).toBe(200);
    const data = (response.body as ApiBody<{ days: Array<{ date: string; slots: Array<{ label: string; startAt: string }> }> }>).data;
    expect(data.days[0]?.date).toBe(dateKey);
    expect(data.days[0]?.slots.length).toBeGreaterThan(8);
  });

  it("prevents two customers from taking the same single-capacity slot", async () => {
    const startAt = zonedTimeToUtc(dateKey, 600, "Africa/Kigali").toISOString();
    const payload = {
      serviceId,
      startAt,
      customerName: "Concurrent Customer",
      customerPhone: "+250788000001",
      customerNote: "Please call on arrival.",
    };
    const responses = await Promise.all([
      request(app).post(`/api/public/businesses/${businessSlug}/bookings`).send(payload),
      request(app).post(`/api/public/businesses/${businessSlug}/bookings`).send(payload),
    ]);
    const statuses = responses.map((response) => response.status).sort();
    expect(statuses).toEqual([201, 409]);
    const created = responses.find((response) => response.status === 201);
    const data = (created!.body as ApiBody<{ publicToken: string; bookingNumber: string; status: string; service: { durationMinutes: number } }>).data;
    expect(data.bookingNumber).toMatch(/^EB-[A-Z0-9]{6}$/);
    expect(data.status).toBe("PENDING");
    expect(data.service.durationMinutes).toBe(60);
    bookingToken = data.publicToken;
  });

  it("returns the private booking page by token", async () => {
    const response = await request(app).get(`/api/public/bookings/${bookingToken}`);
    expect(response.status).toBe(200);
    const data = (response.body as ApiBody<{ customerName: string; canCancel: boolean; business: { id: string } }>).data;
    expect(data.customerName).toBe("Concurrent Customer");
    expect(data.business.id).toBe(businessId);
    expect(data.canCancel).toBe(true);
  });

  it("lets the owner confirm and complete the booking, then accepts one verified review", async () => {
    const booking = (await request(app).get(`/api/public/bookings/${bookingToken}`)).body as ApiBody<{ id: string }>;
    const confirmed = await request(app)
      .patch(`/api/bookings/${booking.data.id}/status`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "CONFIRMED" });
    expect(confirmed.status).toBe(200);

    const completed = await request(app)
      .patch(`/api/bookings/${booking.data.id}/status`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "COMPLETED" });
    expect(completed.status).toBe(200);

    const reviewed = await request(app)
      .post(`/api/public/bookings/${bookingToken}/reviews`)
      .send({ rating: 5, comment: "Careful, professional, and on time." });
    expect(reviewed.status).toBe(201);
    expect((reviewed.body as ApiBody<{ isVerified: boolean }>).data.isVerified).toBe(true);

    const duplicate = await request(app)
      .post(`/api/public/bookings/${bookingToken}/reviews`)
      .send({ rating: 4, comment: "Trying to review twice." });
    expect(duplicate.status).toBe(409);
  });

  it("allows a customer to cancel a future booking through the private token", async () => {
    const startAt = zonedTimeToUtc(dateKey, 780, "Africa/Kigali").toISOString();
    const created = await request(app)
      .post(`/api/public/businesses/${businessSlug}/bookings`)
      .send({ serviceId, startAt, customerName: "Cancel Customer", customerPhone: "+250788000002" });
    expect(created.status).toBe(201);
    const token = (created.body as ApiBody<{ publicToken: string }>).data.publicToken;

    const cancelled = await request(app)
      .post(`/api/public/bookings/${token}/cancel`)
      .send({ reason: "Plans changed" });
    expect(cancelled.status).toBe(200);
    expect((cancelled.body as ApiBody<{ status: string; canCancel: boolean }>).data.status).toBe("CANCELLED");
    expect((cancelled.body as ApiBody<{ status: string; canCancel: boolean }>).data.canCancel).toBe(false);
  });
});
