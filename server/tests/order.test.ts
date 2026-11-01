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

describe("product ordering and payment flow", () => {
  const suffix = randomUUID();
  const ownerEmail = `order-owner-${suffix}@example.com`;
  const otherEmail = `order-other-${suffix}@example.com`;
  let ownerToken = "";
  let otherToken = "";
  let businessId = "";
  let otherBusinessId = "";
  let businessSlug = "";
  let productId = "";
  let orderId = "";
  let orderToken = "";
  let paymentReference = "";

  beforeAll(async () => {
    const owner = await request(app).post("/api/auth/register").send({
      name: "Order Owner",
      email: ownerEmail,
      password: "secure-test-password",
      businessName: `Order Shop ${suffix.slice(0, 6)}`,
      category: "Retail",
      phone: "+250788000001",
    });
    expect(owner.status).toBe(201);
    const ownerData = (owner.body as ApiBody<{ token: string; user: { business: { id: string; slug: string } } }>).data;
    ownerToken = ownerData.token;
    businessId = ownerData.user.business.id;
    businessSlug = ownerData.user.business.slug;

    const other = await request(app).post("/api/auth/register").send({
      name: "Other Order Owner",
      email: otherEmail,
      password: "secure-test-password",
      businessName: `Other Order Shop ${suffix.slice(0, 6)}`,
      category: "Retail",
      whatsapp: "+250788000002",
    });
    expect(other.status).toBe(201);
    const otherData = (other.body as ApiBody<{ token: string; user: { business: { id: string } } }>).data;
    otherToken = otherData.token;
    otherBusinessId = otherData.user.business.id;

    await prisma.business.update({
      where: { id: businessId },
      data: { isPublished: true, canPublishProducts: true, productAccessExpiresAt: new Date(Date.now() + 30 * 86400000) },
    });

    const product = await request(app)
      .post(`/api/businesses/${businessId}/products`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Test coffee beans", description: "Fresh roast", price: 5000, currency: "RWF", isPublished: true, isAvailable: true });
    expect(product.status).toBe(201);
    productId = (product.body as ApiBody<{ id: string }>).data.id;
  });

  afterAll(async () => {
    if (businessId) await prisma.business.deleteMany({ where: { id: { in: [businessId, otherBusinessId] } } });
    await prisma.user.deleteMany({ where: { email: { in: [ownerEmail, otherEmail] } } });
    await prisma.$disconnect();
  });

  it("creates an order with server-side pricing and merged quantities", async () => {
    const response = await request(app)
      .post(`/api/public/businesses/${businessSlug}/orders`)
      .send({
        items: [{ productId, quantity: 2 }, { productId, quantity: 3 }],
        customerName: "Test Customer",
        customerPhone: "+250788111222",
        fulfillment: "PICKUP",
        customerNote: "Please pack separately.",
      });
    expect(response.status).toBe(201);
    const data = (response.body as ApiBody<{ id: string; publicToken: string; orderNumber: string; items: Array<{ quantity: number; unitPrice: string; lineTotal: string }>; subtotal: string; total: string; demoMode: boolean }>).data;
    expect(data.orderNumber).toMatch(/^ORD-[A-Z0-9]{6}$/);
    expect(data.items).toHaveLength(1);
    expect(data.items[0]?.quantity).toBe(5);
    expect(Number(data.items[0]?.unitPrice)).toBe(5000);
    expect(Number(data.items[0]?.lineTotal)).toBe(25000);
    expect(Number(data.total)).toBe(25000);
    expect(data.demoMode).toBe(true);
    orderId = data.id;
    orderToken = data.publicToken;
  });

  it("rejects unavailable products instead of trusting client prices", async () => {
    await prisma.product.update({ where: { id: productId }, data: { isAvailable: false } });
    const response = await request(app)
      .post(`/api/public/businesses/${businessSlug}/orders`)
      .send({
        items: [{ productId, quantity: 1 }],
        customerName: "Unavailable Customer",
        customerPhone: "+250788111333",
        fulfillment: "PICKUP",
      });
    expect(response.status).toBe(400);
    expect((response.body as ApiBody<unknown>).error?.message).toContain("no longer available");
    await prisma.product.update({ where: { id: productId }, data: { isAvailable: true } });
  });

  it("protects the private order page and owner endpoints from other businesses", async () => {
    const wrongToken = await request(app).get(`/api/public/orders/${randomUUID().replace(/-/g, "")}x`);
    expect(wrongToken.status).toBe(404);

    const foreignRead = await request(app).get(`/api/orders/${orderId}`).set("Authorization", `Bearer ${otherToken}`);
    expect(foreignRead.status).toBe(403);

    const foreignStatus = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ status: "CONFIRMED" });
    expect(foreignStatus.status).toBe(403);

    const publicRead = await request(app).get(`/api/public/orders/${orderToken}`);
    expect(publicRead.status).toBe(200);
    expect((publicRead.body as ApiBody<{ customerName: string }>).data.customerName).toBe("Test Customer");
  });

  it("lets the owner progress the order through allowed states", async () => {
    for (const status of ["CONFIRMED", "PROCESSING", "READY", "COMPLETED"]) {
      const response = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ status });
      expect(response.status).toBe(200);
      expect((response.body as ApiBody<{ status: string }>).data.status).toBe(status);
    }
    const invalid = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "PENDING" });
    expect(invalid.status).toBe(400);
  });

  it("creates one reusable pending payment and confirms it once in demo mode", async () => {
    const initiated = await request(app)
      .post(`/api/public/orders/${orderToken}/payments`)
      .send({ provider: "MOBILE_MONEY", payerPhone: "+250788111222" });
    expect(initiated.status).toBe(201);
    const first = (initiated.body as ApiBody<{ payment: { reference: string; status: string }; demoMode: boolean }>).data;
    expect(first.demoMode).toBe(true);
    expect(first.payment.reference).toMatch(/^PAY-[A-Z0-9]{8}$/);
    expect(first.payment.status).toBe("PENDING");
    paymentReference = first.payment.reference;

    const duplicate = await request(app)
      .post(`/api/public/orders/${orderToken}/payments`)
      .send({ provider: "MOBILE_MONEY", payerPhone: "+250788111222" });
    expect(duplicate.status).toBe(200);
    expect((duplicate.body as ApiBody<{ payment: { reference: string } }>).data.payment.reference).toBe(paymentReference);

    const confirmed = await request(app).post(`/api/public/payments/${paymentReference}/confirm`);
    expect(confirmed.status).toBe(200);
    const order = (confirmed.body as ApiBody<{ paymentStatus: string; payments: Array<{ status: string }> }>).data;
    expect(order.paymentStatus).toBe("PAID");
    expect(order.payments[0]?.status).toBe("PAID");

    const again = await request(app).post(`/api/public/payments/${paymentReference}/confirm`);
    expect(again.status).toBe(200);
    expect((again.body as ApiBody<{ paymentStatus: string }>).data.paymentStatus).toBe("PAID");
  });

  it("cancels pending payments when an order is cancelled", async () => {
    const created = await request(app)
      .post(`/api/public/businesses/${businessSlug}/orders`)
      .send({ items: [{ productId, quantity: 1 }], customerName: "Cancel Customer", customerPhone: "+250788111444", fulfillment: "PICKUP" });
    expect(created.status).toBe(201);
    const token = (created.body as ApiBody<{ publicToken: string }>).data.publicToken;

    const initiated = await request(app)
      .post(`/api/public/orders/${token}/payments`)
      .send({ provider: "MOBILE_MONEY", payerPhone: "+250788111444" });
    expect(initiated.status).toBe(201);
    const reference = (initiated.body as ApiBody<{ payment: { reference: string } }>).data.payment.reference;

    const cancelled = await request(app).post(`/api/public/orders/${token}/cancel`);
    expect(cancelled.status).toBe(200);
    const order = (cancelled.body as ApiBody<{ paymentStatus: string; payments: Array<{ status: string }> }>).data;
    expect(order.paymentStatus).toBe("UNPAID");
    expect(order.payments[0]?.status).toBe("CANCELLED");

    const confirmation = await request(app).post(`/api/public/payments/${reference}/confirm`);
    expect(confirmation.status).toBe(400);
  });

  it("returns owner summaries and filters by payment status", async () => {
    const summary = await request(app).get(`/api/businesses/${businessId}/orders/summary`).set("Authorization", `Bearer ${ownerToken}`);
    expect(summary.status).toBe(200);
    const data = (summary.body as ApiBody<{ completed: number; paidValue: number; paidOrders: number }>).data;
    expect(data.completed).toBe(1);
    expect(data.paidOrders).toBe(1);
    expect(data.paidValue).toBe(25000);

    const filtered = await request(app)
      .get(`/api/businesses/${businessId}/orders`)
      .query({ paymentStatus: "PAID" })
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(filtered.status).toBe(200);
    expect((filtered.body as ApiBody<Array<{ id: string }>>).data.map((order) => order.id)).toContain(orderId);
  });
});
