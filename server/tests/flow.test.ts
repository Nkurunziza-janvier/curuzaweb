import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { calculateQuote } from "../src/services/quotes.js";

interface ApiBody<T> {
  success: boolean;
  data: T;
  error?: { message: string };
}

describe("business → request → quote → acceptance flow", () => {
  const suffix = randomUUID();
  const ownerEmail = `flow-owner-${suffix}@example.com`;
  const otherEmail = `flow-other-${suffix}@example.com`;
  let ownerToken = "";
  let otherToken = "";
  let businessId = "";
  let otherBusinessId = "";
  let businessSlug = "";
  let businessProductId = "";
  let businessServiceId = "";
  let businessOfferId = "";
  let requestId = "";
  let quoteId = "";
  let quoteNumber = "";
  let quotePublicToken = "";
  let requestNumber = "";

  beforeAll(async () => {
    const owner = await request(app).post("/api/auth/register").send({
      name: "Flow Owner",
      email: ownerEmail,
      password: "secure-test-password",
      businessName: `Flow Repair ${suffix.slice(0, 6)}`,
      category: "Mechanic",
    });
    expect(owner.status).toBe(201);
    ownerToken = (owner.body as ApiBody<{ token: string; user: { business: { id: string; slug: string } } }>).data.token;
    const ownerData = (owner.body as ApiBody<{ token: string; user: { business: { id: string; slug: string } } }>).data;
    businessId = ownerData.user.business.id;
    businessSlug = ownerData.user.business.slug;

    const other = await request(app).post("/api/auth/register").send({
      name: "Other Owner",
      email: otherEmail,
      password: "secure-test-password",
      businessName: `Other Business ${suffix.slice(0, 6)}`,
    });
    expect(other.status).toBe(201);
    const otherData = (other.body as ApiBody<{ token: string; user: { business: { id: string } } }>).data;
    otherToken = otherData.token;
    otherBusinessId = otherData.user.business.id;
  });

  afterAll(async () => {
    if (businessId) await prisma.business.deleteMany({ where: { id: businessId } });
    await prisma.user.deleteMany({ where: { email: { in: [ownerEmail, otherEmail] } } });
    await prisma.$disconnect();
  });

  it("allows local Vite dev-server origins through CORS", async () => {
    const response = await request(app).get("/api/health").set("Origin", "http://localhost:8443");
    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:8443");
  });

  it("calculates fixed and percentage discounts with decimal precision", () => {
    const lines = [{ name: "Work", quantity: 3, unitPrice: 0.1 }];
    const fixed = calculateQuote(lines, 0.01);
    expect(fixed.subtotal.toNumber()).toBe(0.3);
    expect(fixed.total.toNumber()).toBe(0.29);
    const percentage = calculateQuote([{ name: "Service", quantity: 1, unitPrice: 1000 }], 10, "PERCENTAGE");
    expect(percentage.subtotal.toNumber()).toBe(1000);
    expect(percentage.discount.toNumber()).toBe(100);
    expect(percentage.total.toNumber()).toBe(900);
  });

  it("registers, creates catalog data, accepts a public request and quote, then updates analytics", async () => {
    const uploadedLogoPath = "/uploads/demo-logo.png";
    const profile = await request(app).patch(`/api/businesses/${businessId}`).set("Authorization", `Bearer ${ownerToken}`).send({ logoUrl: uploadedLogoPath });
    expect(profile.status).toBe(200);
    expect((profile.body as ApiBody<{ logoUrl: string }>).data.logoUrl).toBe(uploadedLogoPath);

    const product = await request(app)
      .post(`/api/businesses/${businessId}/products`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Brake pads", price: 80000, currency: "RWF", imageUrl: uploadedLogoPath });
    expect(product.status).toBe(201);
    expect((product.body as ApiBody<{ imageUrl: string }>).data.imageUrl).toBe(uploadedLogoPath);
    businessProductId = (product.body as ApiBody<{ id: string }>).data.id;
    const updatedProduct = await request(app).patch(`/api/products/${businessProductId}`).set("Authorization", `Bearer ${ownerToken}`).send({ description: "Premium replacement pads" });
    expect(updatedProduct.status).toBe(200);
    expect((updatedProduct.body as ApiBody<{ description: string }>).data.description).toBe("Premium replacement pads");
    expect((await request(app).post(`/api/products/${businessProductId}/unpublish`).set("Authorization", `Bearer ${ownerToken}`)).status).toBe(200);
    expect((await request(app).post(`/api/products/${businessProductId}/publish`).set("Authorization", `Bearer ${ownerToken}`)).status).toBe(200);

    const service = await request(app)
      .post(`/api/businesses/${businessId}/services`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Brake inspection", startingPrice: 20000, currency: "RWF", imageUrl: uploadedLogoPath });
    expect(service.status).toBe(201);
    expect((service.body as ApiBody<{ imageUrl: string }>).data.imageUrl).toBe(uploadedLogoPath);
    businessServiceId = (service.body as ApiBody<{ id: string }>).data.id;
    expect((await request(app).patch(`/api/services/${businessServiceId}`).set("Authorization", `Bearer ${ownerToken}`).send({ duration: "1 hour" })).status).toBe(200);
    expect((await request(app).post(`/api/services/${businessServiceId}/unpublish`).set("Authorization", `Bearer ${ownerToken}`)).status).toBe(200);
    expect((await request(app).post(`/api/services/${businessServiceId}/publish`).set("Authorization", `Bearer ${ownerToken}`)).status).toBe(200);

    const offer = await request(app)
      .post(`/api/businesses/${businessId}/offers`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ title: "Test discount", discountType: "PERCENTAGE", discountValue: 10, startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 86400000).toISOString() });
    expect(offer.status).toBe(201);
    businessOfferId = (offer.body as ApiBody<{ id: string }>).data.id;
    expect((await request(app).patch(`/api/offers/${businessOfferId}`).set("Authorization", `Bearer ${ownerToken}`).send({ title: "Updated test discount" })).status).toBe(200);
    expect((await request(app).post(`/api/offers/${businessOfferId}/deactivate`).set("Authorization", `Bearer ${ownerToken}`)).status).toBe(200);
    expect((await request(app).post(`/api/offers/${businessOfferId}/activate`).set("Authorization", `Bearer ${ownerToken}`)).status).toBe(200);

    const publish = await request(app).post(`/api/businesses/${businessId}/publish`).set("Authorization", `Bearer ${ownerToken}`);
    expect(publish.status).toBe(200);
    expect((publish.body as ApiBody<{ isPublished: boolean }>).data.isPublished).toBe(true);

    const publicBusiness = await request(app).get(`/api/public/businesses/${businessSlug}`);
    expect(publicBusiness.status).toBe(200);
    expect((publicBusiness.body as ApiBody<{ passwordHash?: string; ownerId?: string; products: Array<{ id: string }> }>).data.passwordHash).toBeUndefined();

    const foreignService = await prisma.service.create({ data: { businessId: otherBusinessId, name: "Private unrelated service" } });
    const foreignProduct = await prisma.product.create({ data: { businessId: otherBusinessId, name: "Private unrelated product", price: 123 } });
    const templateResponse = await request(app).get(`/api/public/businesses/${businessSlug}/request-template`);
    expect(templateResponse.status).toBe(200);
    const requestTemplate = (templateResponse.body as ApiBody<{
      questions: Array<{ id: string; label: string; type: string }>;
      services: Array<{ id: string; name: string }>;
      products: Array<{ id: string; name: string }>;
    }>).data;
    const questions = requestTemplate.questions;
    expect(requestTemplate.services.map(({ id }) => id)).toContain(businessServiceId);
    expect(requestTemplate.services.map(({ id }) => id)).not.toContain(foreignService.id);
    expect(requestTemplate.products.map(({ id }) => id)).toContain(businessProductId);
    expect(requestTemplate.products.map(({ id }) => id)).not.toContain(foreignProduct.id);
    const answers = Object.fromEntries(questions.map((question) => [
      question.id,
      question.type === "SELECT" ? "Repair" : question.type === "LOCATION" ? "Kigali" : question.type === "DATE" ? "2026-12-01" : question.label === "Vehicle type" ? "Car" : question.label === "Vehicle model" ? "Toyota Corolla" : "Brake noise",
    ]));

    const customerRequest = await request(app).post(`/api/public/businesses/${businessSlug}/requests`).send({
      customerName: "Customer One",
      customerPhone: "+250788000000",
      requestType: "Brake repair",
      description: "Brake inspection and replacement.",
      answers,
    });
    expect(customerRequest.status, JSON.stringify(customerRequest.body)).toBe(201);
    requestNumber = (customerRequest.body as ApiBody<{ requestNumber: string }>).data.requestNumber;
    expect(requestNumber).toMatch(/^REQ-\d{6}$/);
    const storedRequest = await prisma.customerRequest.findUnique({ where: { requestNumber } });
    expect(storedRequest).not.toBeNull();
    requestId = storedRequest!.id;

    const quote = await request(app).post(`/api/requests/${requestId}/quotes`).set("Authorization", `Bearer ${ownerToken}`).send({
      items: [
        { name: "Brake inspection", quantity: 1, unitPrice: 20000 },
        { name: "Brake pads", quantity: 1, unitPrice: 80000 },
        { name: "Labor", quantity: 1, unitPrice: 30000 },
      ],
      discount: 0,
      validityDays: 7,
      notes: "Vehicle repair estimate",
      subtotal: 1,
      total: 1,
    });
    expect(quote.status).toBe(201);
    quoteId = (quote.body as ApiBody<{ id: string }>).data.id;
    quoteNumber = (quote.body as ApiBody<{ quoteNumber: string; publicToken: string; subtotal: string }>).data.quoteNumber;
    quotePublicToken = (quote.body as ApiBody<{ publicToken: string }>).data.publicToken;
    expect(quoteNumber).toMatch(/^QUO-\d{6}$/);
    expect(quotePublicToken).toMatch(/^[A-Za-z0-9_-]{32,100}$/);
    expect(quotePublicToken).not.toBe(quoteNumber);
    expect(Number((quote.body as ApiBody<{ subtotal: string }>).data.subtotal)).toBe(130000);
    expect((await request(app).patch(`/api/quotes/${quoteId}`).set("Authorization", `Bearer ${ownerToken}`).send({ notes: "Updated draft note" })).status).toBe(200);

    expect((await request(app).post(`/api/quotes/${quoteId}/send`).set("Authorization", `Bearer ${ownerToken}`)).status).toBe(200);
    expect((await request(app).get(`/api/public/quotes/${quotePublicToken}`)).status).toBe(200);
    expect((await request(app).get(`/api/public/quotes/${quoteNumber}`)).status).toBe(422);
    expect((await request(app).post(`/api/public/quotes/${quotePublicToken}/accept`)).status).toBe(200);

    const updatedQuote = await prisma.quote.findUnique({ where: { id: quoteId } });
    const updatedRequest = await prisma.customerRequest.findUnique({ where: { id: requestId } });
    expect(updatedQuote?.status).toBe("ACCEPTED");
    expect(updatedRequest?.status).toBe("ACCEPTED");
    expect(await prisma.businessEvent.count({ where: { businessId, eventType: "QUOTE_ACCEPTED" } })).toBe(1);

    const analytics = await request(app).get(`/api/businesses/${businessId}/analytics`).set("Authorization", `Bearer ${ownerToken}`);
    expect(analytics.status).toBe(200);
    expect((analytics.body as ApiBody<{ requests: number; quotes: number; acceptedQuotes: number; quoteValue: number }>).data).toMatchObject({
      requests: 1,
      quotes: 1,
      acceptedQuotes: 1,
      quoteValue: 130000,
    });
    const quoteSummary = await request(app).get(`/api/businesses/${businessId}/quotes/summary`).set("Authorization", `Bearer ${ownerToken}`);
    expect((quoteSummary.body as ApiBody<{ accepted: number; acceptanceRate: number; acceptedValue: number }>).data).toMatchObject({
      accepted: 1,
      acceptanceRate: 100,
      acceptedValue: 130000,
    });
    expect((await request(app).post(`/api/public/businesses/${businessSlug}/events`).send({ eventType: "QUOTE_CREATED" })).status).toBe(422);
  });

  it("prevents access to another owner's business and product", async () => {
    const other = await request(app).get(`/api/businesses/${businessId}`).set("Authorization", `Bearer ${otherToken}`);
    expect(other.status).toBe(403);
    const product = await request(app).patch(`/api/products/${businessProductId}`).set("Authorization", `Bearer ${otherToken}`).send({ price: 1 });
    expect(product.status).toBe(403);
    const service = await request(app).delete(`/api/services/${businessServiceId}`).set("Authorization", `Bearer ${otherToken}`);
    expect(service.status).toBe(403);
    const requests = await request(app).get(`/api/businesses/${businessId}/requests`).set("Authorization", `Bearer ${otherToken}`);
    expect(requests.status).toBe(403);
    const quote = await request(app).get(`/api/quotes/${quoteId}`).set("Authorization", `Bearer ${otherToken}`);
    expect(quote.status).toBe(403);
    const updateQuote = await request(app).patch(`/api/quotes/${quoteId}`).set("Authorization", `Bearer ${otherToken}`).send({ notes: "Unauthorized update" });
    expect(updateQuote.status).toBe(403);
    const createQuote = await request(app).post(`/api/requests/${requestId}/quotes`).set("Authorization", `Bearer ${otherToken}`).send({
      items: [{ name: "Unauthorized", quantity: 1, unitPrice: 1 }],
    });
    expect(createQuote.status).toBe(404);
  });

  it("stores customer quote changes and rejects quotes transactionally", async () => {
    const templateResponse = await request(app).get(`/api/public/businesses/${businessSlug}/request-template`);
    const questions = (templateResponse.body as ApiBody<{ questions: Array<{ id: string; label: string; type: string }> }>).data.questions;
    const answers = Object.fromEntries(questions.map((question) => [
      question.id,
      question.type === "SELECT" ? "Repair" : question.type === "LOCATION" ? "Kigali" : question.type === "DATE" ? "2026-12-01" : question.label === "Vehicle type" ? "Car" : question.label === "Vehicle model" ? "Toyota Corolla" : "Brake noise",
    ]));
    const customerRequest = await request(app).post(`/api/public/businesses/${businessSlug}/requests`).send({
      customerName: "Customer Two",
      customerPhone: "+250788000001",
      requestType: "Brake repair",
      description: "Please revise the estimate.",
      answers,
    });
    expect(customerRequest.status).toBe(201);
    const secondRequestNumber = (customerRequest.body as ApiBody<{ requestNumber: string }>).data.requestNumber;
    const secondRequest = await prisma.customerRequest.findUniqueOrThrow({ where: { requestNumber: secondRequestNumber } });
    const createdQuote = await request(app).post(`/api/requests/${secondRequest.id}/quotes`).set("Authorization", `Bearer ${ownerToken}`).send({
      items: [{ name: "Brake inspection", quantity: 1, unitPrice: 20000 }],
      validityDays: 7,
    });
    expect(createdQuote.status).toBe(201);
    const secondQuoteNumber = (createdQuote.body as ApiBody<{ publicToken: string }>).data.publicToken;
    const secondQuoteId = (createdQuote.body as ApiBody<{ id: string }>).data.id;
    expect((await request(app).post(`/api/quotes/${secondQuoteId}/send`).set("Authorization", `Bearer ${ownerToken}`)).status).toBe(200);

    const requestedChanges = await request(app).post(`/api/public/quotes/${secondQuoteNumber}/request-changes`).send({ message: "Please include the brake pads." });
    expect(requestedChanges.status).toBe(200);
    expect((await prisma.quote.findUniqueOrThrow({ where: { id: secondQuoteId } })).status).toBe("CHANGE_REQUESTED");
    expect((await prisma.customerRequest.findUniqueOrThrow({ where: { id: secondRequest.id } })).status).toBe("CUSTOMER_RESPONDED");
    expect(await prisma.quoteMessage.count({ where: { quoteId: secondQuoteId, message: "Please include the brake pads." } })).toBe(1);

    const quoteDetail = await request(app).get(`/api/quotes/${secondQuoteId}`).set("Authorization", `Bearer ${ownerToken}`);
    expect((quoteDetail.body as ApiBody<{ messages: Array<{ message: string }> }>).data.messages.map(({ message }) => message)).toContain("Please include the brake pads.");
    expect((await request(app).post(`/api/quotes/${secondQuoteId}/messages`).set("Authorization", `Bearer ${ownerToken}`).send({ message: "We can add those pads." })).status).toBe(201);
    const publicQuote = await request(app).get(`/api/public/quotes/${secondQuoteNumber}`);
    expect((publicQuote.body as ApiBody<{ messages: Array<{ message: string }> }>).data.messages.map(({ message }) => message)).toContain("We can add those pads.");

    const revised = await request(app).patch(`/api/quotes/${secondQuoteId}`).set("Authorization", `Bearer ${ownerToken}`).send({
      items: [
        { name: "Brake inspection", quantity: 1, unitPrice: 20000 },
        { name: "Brake pads", quantity: 1, unitPrice: 80000 },
      ],
      notes: "Revised estimate with replacement pads.",
    });
    expect(revised.status).toBe(200);
    expect((revised.body as ApiBody<{ status: string; total: string }>).data.status).toBe("DRAFT");
    expect(Number((revised.body as ApiBody<{ total: string }>).data.total)).toBe(100000);
    expect((await request(app).post(`/api/quotes/${secondQuoteId}/send`).set("Authorization", `Bearer ${ownerToken}`)).status).toBe(200);

    const rejected = await request(app).post(`/api/public/quotes/${secondQuoteNumber}/reject`);
    expect(rejected.status).toBe(200);
    expect((await prisma.quote.findUniqueOrThrow({ where: { id: secondQuoteId } })).status).toBe("REJECTED");
    expect((await prisma.customerRequest.findUniqueOrThrow({ where: { id: secondRequest.id } })).status).toBe("REJECTED");
    expect(await prisma.businessEvent.count({ where: { businessId, eventType: "QUOTE_REJECTED" } })).toBe(1);
  });

  it("expires quotes and prevents a customer decision after the deadline", async () => {
    const templateResponse = await request(app).get(`/api/public/businesses/${businessSlug}/request-template`);
    const questions = (templateResponse.body as ApiBody<{ questions: Array<{ id: string; label: string; type: string }> }>).data.questions;
    const answers = Object.fromEntries(questions.map((question) => [
      question.id,
      question.type === "SELECT" ? "Repair" : question.type === "LOCATION" ? "Kigali" : question.type === "DATE" ? "2026-12-01" : question.label === "Vehicle type" ? "Car" : question.label === "Vehicle model" ? "Toyota Corolla" : "Brake noise",
    ]));
    const submitted = await request(app).post(`/api/public/businesses/${businessSlug}/requests`).send({
      customerName: "Expired Quote Customer",
      customerPhone: "+250788000009",
      requestType: "Brake repair",
      answers,
    });
    const requestNumber = (submitted.body as ApiBody<{ requestNumber: string }>).data.requestNumber;
    const customerRequest = await prisma.customerRequest.findUniqueOrThrow({ where: { requestNumber } });
    const created = await request(app).post(`/api/requests/${customerRequest.id}/quotes`).set("Authorization", `Bearer ${ownerToken}`).send({
      items: [{ name: "Inspection", quantity: 1, unitPrice: 10000 }],
    });
    expect(created.status).toBe(201);
    const quote = (created.body as ApiBody<{ id: string; publicToken: string }>).data;
    expect((await request(app).post(`/api/quotes/${quote.id}/send`).set("Authorization", `Bearer ${ownerToken}`)).status).toBe(200);
    await prisma.quote.update({ where: { id: quote.id }, data: { validUntil: new Date(Date.now() - 1000) } });
    expect((await request(app).post(`/api/public/quotes/${quote.publicToken}/accept`)).status).toBe(400);
    expect((await prisma.quote.findUniqueOrThrow({ where: { id: quote.id } })).status).toBe("EXPIRED");
  });
});
