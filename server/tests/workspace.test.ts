import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";

interface ApiBody<T> {
  success: boolean;
  data: T;
  error?: { code?: string; message: string };
}

interface Registered {
  token: string;
  user: { business: { id: string; slug: string } };
}

describe("adaptive workspace endpoints", () => {
  const suffix = randomUUID();
  const ownerEmail = `workspace-owner-${suffix}@example.com`;
  const otherEmail = `workspace-other-${suffix}@example.com`;
  const customerEmail = `aline-${suffix}@example.com`;
  const customerPhone = `+250788${String(Math.floor(Math.random() * 900000) + 100000)}`;
  let ownerToken = "";
  let otherToken = "";
  let businessId = "";
  let otherBusinessId = "";
  let businessSlug = "";
  let productId = "";
  let serviceId = "";
  let bookingId = "";
  let reviewId = "";

  beforeAll(async () => {
    const owner = await request(app).post("/api/auth/register").send({
      name: "Workspace Owner",
      email: ownerEmail,
      password: "secure-test-password",
      businessName: `Workspace Shop ${suffix.slice(0, 6)}`,
      industryKey: "retail",
      subtype: "general",
      phone: customerPhone,
    });
    expect(owner.status).toBe(201);
    const ownerData = (owner.body as ApiBody<Registered>).data;
    ownerToken = ownerData.token;
    businessId = ownerData.user.business.id;
    businessSlug = ownerData.user.business.slug;

    const other = await request(app).post("/api/auth/register").send({
      name: "Other Workspace Owner",
      email: otherEmail,
      password: "secure-test-password",
      businessName: `Other Workspace ${suffix.slice(0, 6)}`,
      industryKey: "retail",
      subtype: "general",
      phone: "+250788999000",
    });
    expect(other.status).toBe(201);
    otherToken = ((other.body as ApiBody<Registered>).data).token;
    otherBusinessId = ((other.body as ApiBody<Registered>).data).user.business.id;

    const capabilities = ["products", "product_orders", "pickup", "services", "appointments", "service_requests", "reviews", "whatsapp_contact"];
    const update = await request(app)
      .patch(`/api/businesses/${businessId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ capabilities, description: "A test workspace for adaptive dashboard coverage." });
    expect(update.status).toBe(200);

    await prisma.business.update({
      where: { id: businessId },
      data: { isPublished: true, canPublishProducts: true, productAccessExpiresAt: new Date(Date.now() + 30 * 86400000) },
    });

    const product = await request(app)
      .post(`/api/businesses/${businessId}/products`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Workspace coffee", price: 5000, currency: "RWF", isPublished: true, isAvailable: true });
    expect(product.status).toBe(201);
    productId = (product.body as ApiBody<{ id: string }>).data.id;

    const service = await request(app)
      .post(`/api/businesses/${businessId}/services`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Workspace consultation", startingPrice: 10000, currency: "RWF", durationMinutes: 30, isBookable: true, isPublished: true });
    expect(service.status).toBe(201);
    serviceId = (service.body as ApiBody<{ id: string }>).data.id;

    const booking = await prisma.booking.create({
      data: {
        bookingNumber: `BKG-${suffix.slice(0, 8)}`,
        publicToken: `booking-${suffix}`,
        businessId,
        serviceId,
        customerName: "Aline Customer",
        customerPhone,
        customerEmail,
        status: "CONFIRMED",
        startAt: new Date(Date.now() + 86400000),
        endAt: new Date(Date.now() + 86400000 + 1800000),
        timezone: "Africa/Kigali",
        durationMinutes: 30,
        startingPriceSnapshot: 10000,
        currency: "RWF",
      },
    });
    bookingId = booking.id;

    const order = await request(app)
      .post(`/api/public/businesses/${businessSlug}/orders`)
      .send({
        items: [{ productId, quantity: 2 }],
        customerName: "Aline Customer",
        customerPhone,
        customerEmail,
        fulfillment: "PICKUP",
      });
    expect(order.status).toBe(201);

    const template = await request(app).get(`/api/public/businesses/${businessSlug}/request-template`);
    expect(template.status).toBe(200);
    const requiredQuestion = (template.body as ApiBody<{ questions: Array<{ id: string; label: string; required: boolean }> }>).data.questions.find((question) => question.required);

    const inquiry = await request(app)
      .post(`/api/public/businesses/${businessSlug}/requests`)
      .send({
        customerName: "Aline Customer",
        customerPhone,
        customerEmail,
        requestType: "Bulk order question",
        description: "Do you offer a discount for larger orders?",
        answers: requiredQuestion ? { [requiredQuestion.id]: "Bulk order" } : {},
      });
    expect(inquiry.status).toBe(201);

    const review = await prisma.review.create({
      data: { businessId, serviceId, customerName: "Aline Customer", rating: 5, comment: "Very helpful.", isPublished: true, isVerified: true },
    });
    reviewId = review.id;

    const publicPage = await request(app).get(`/api/public/businesses/${businessSlug}`);
    expect(publicPage.status).toBe(200);
  });

  afterAll(async () => {
    if (businessId) await prisma.business.deleteMany({ where: { id: { in: [businessId, otherBusinessId] } } });
    await prisma.user.deleteMany({ where: { email: { in: [ownerEmail, otherEmail] } } });
    await prisma.$disconnect();
  });

  it("returns a capability-aware workspace summary with real activity", async () => {
    const response = await request(app)
      .get(`/api/businesses/${businessId}/workspace-summary`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(response.status).toBe(200);
    const data = (response.body as ApiBody<{
      capabilities: string[];
      orders: null | { pending: number; total: number; recent: Array<{ customerName: string }> };
      bookings: null | { total: number; next: Array<{ customerName: string }> };
      requests: null | { new: number; total: number; recent: Array<{ customerName: string }> };
      reviews: null | { total: number; average: number };
      analytics: { pageViews: number };
    }>).data;
    expect(data.capabilities).toEqual(expect.arrayContaining(["products", "product_orders", "appointments", "service_requests", "reviews"]));
    expect(data.orders?.pending).toBe(1);
    expect(data.orders?.total).toBe(1);
    expect(data.orders?.recent[0]?.customerName).toBe("Aline Customer");
    expect(data.bookings?.total).toBe(1);
    expect(data.bookings?.next[0]?.customerName).toBe("Aline Customer");
    expect(data.requests?.new).toBe(1);
    expect(data.requests?.total).toBe(1);
    expect(data.reviews?.total).toBe(1);
    expect(data.reviews?.average).toBe(5);
    expect(data.analytics.pageViews).toBeGreaterThan(0);
  });

  it("aggregates the same customer across orders, bookings, and inquiries", async () => {
    const response = await request(app)
      .get(`/api/businesses/${businessId}/customers`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(response.status).toBe(200);
    const customers = (response.body as ApiBody<Array<{
      name: string;
      email: string | null;
      orders: number;
      bookings: number;
      requests: number;
      sources: string[];
    }>>).data;
    expect(customers).toHaveLength(1);
    expect(customers[0]?.name).toBe("Aline Customer");
    expect(customers[0]?.email).toBe(customerEmail);
    expect(customers[0]?.orders).toBe(1);
    expect(customers[0]?.bookings).toBe(1);
    expect(customers[0]?.requests).toBe(1);
    expect(customers[0]?.sources).toEqual(expect.arrayContaining(["orders", "bookings", "requests"]));
  });

  it("lets the owner hide and republish a review", async () => {
    const hidden = await request(app)
      .patch(`/api/reviews/${reviewId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ isPublished: false });
    expect(hidden.status).toBe(200);
    expect((hidden.body as ApiBody<{ isPublished: boolean }>).data.isPublished).toBe(false);

    const list = await request(app)
      .get(`/api/businesses/${businessId}/reviews`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(list.status).toBe(200);
    const data = (list.body as ApiBody<{ reviews: Array<{ id: string; isPublished: boolean }>; summary: { published: number } }>).data;
    expect(data.reviews.find((review) => review.id === reviewId)?.isPublished).toBe(false);
    expect(data.summary.published).toBe(0);

    const published = await request(app)
      .patch(`/api/reviews/${reviewId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ isPublished: true });
    expect(published.status).toBe(200);
  });

  it("blocks another owner from workspace, customer, and review endpoints", async () => {
    const summary = await request(app).get(`/api/businesses/${businessId}/workspace-summary`).set("Authorization", `Bearer ${otherToken}`);
    const customers = await request(app).get(`/api/businesses/${businessId}/customers`).set("Authorization", `Bearer ${otherToken}`);
    const reviews = await request(app).get(`/api/businesses/${businessId}/reviews`).set("Authorization", `Bearer ${otherToken}`);
    const publish = await request(app).patch(`/api/reviews/${reviewId}`).set("Authorization", `Bearer ${otherToken}`).send({ isPublished: false });
    expect(summary.status).toBe(403);
    expect(customers.status).toBe(403);
    expect(reviews.status).toBe(403);
    expect(publish.status).toBe(403);
  });

  it("requires confirmation before disabling a feature that has records", async () => {
    const blocked = await request(app)
      .patch(`/api/businesses/${businessId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ capabilities: ["services", "appointments", "service_requests", "reviews", "whatsapp_contact"] });
    expect(blocked.status).toBe(409);
    expect((blocked.body as ApiBody<unknown>).error?.message).toContain("without deleting");

    const confirmed = await request(app)
      .patch(`/api/businesses/${businessId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ capabilities: ["services", "appointments", "service_requests", "reviews", "whatsapp_contact"], confirmCapabilityChanges: true });
    expect(confirmed.status).toBe(200);
    const productStillExists = await prisma.product.findUnique({ where: { id: productId } });
    expect(productStillExists).not.toBeNull();

    const restored = await request(app)
      .patch(`/api/businesses/${businessId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ capabilities: ["products", "product_orders", "pickup", "services", "appointments", "service_requests", "reviews", "whatsapp_contact"], confirmCapabilityChanges: true });
    expect(restored.status).toBe(200);
    const bookingStillExists = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(bookingStillExists).not.toBeNull();

    const planned = await request(app)
      .patch(`/api/businesses/${businessId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ capabilities: ["rooms"] });
    expect(planned.status).toBe(422);

    const empty = await request(app)
      .patch(`/api/businesses/${businessId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ capabilities: [] });
    expect(empty.status).toBe(422);
  });
});
