import { Prisma, RequestStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest, notFound, unauthorized } from "../utils/errors.js";
import { success } from "../utils/responses.js";
import { getParam, getQuery } from "../utils/requestParam.js";
import { customerRequestSchema, requestStatusSchema } from "../validators/schemas.js";

export const createPublicRequest = asyncHandler(async (request, response) => {
  const input = customerRequestSchema.parse(request.body);
  if (!input.customerEmail && !input.customerPhone && !input.customerWhatsapp) throw badRequest("Provide an email address or phone number so the business can respond");
  const business = await prisma.business.findUnique({
    where: { slug: getParam(request, "slug") },
    select: { id: true, isPublished: true, isBlocked: true },
  });
  if (!business?.isPublished || business.isBlocked) throw notFound("Business page not found");
  const template = await prisma.requestTemplate.findFirst({
    where: { businessId: business.id, isActive: true },
    include: { questions: { orderBy: { sortOrder: "asc" } } },
  });
  const orderItems = input.orderItems ?? [];
  const isProductOrder = orderItems.length > 0;
  if (!template && !isProductOrder) throw badRequest("This business has not configured a request form");

  let orderDescription = "";
  if (isProductOrder) {
    const quantities = new Map<string, number>();
    for (const item of orderItems) quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
    const products = await prisma.product.findMany({
      where: { businessId: business.id, id: { in: [...quantities.keys()] }, isPublished: true, isAvailable: true },
      select: { id: true, name: true, price: true, currency: true },
    });
    if (products.length !== quantities.size) throw badRequest("One or more products in your basket are no longer available. Return to the business page and refresh your basket.");
    orderDescription = products.map((product) => {
      const quantity = quantities.get(product.id)!;
      return `${product.name} × ${quantity} — ${product.currency} ${(Number(product.price) * quantity).toLocaleString()}`;
    }).join("\n");
  }

  const normalizedAnswers = new Map<string, { questionId: string; label: string; value: Prisma.InputJsonValue }>();
  for (const question of template?.questions ?? []) {
    if (isProductOrder) break;
    const submitted = input.answers[question.id] ?? input.answers[question.label];
    const empty = submitted === undefined || submitted === null || submitted === "";
    if (question.required && empty) throw badRequest(`Please answer: ${question.label}`);
    if (empty) continue;
    if (typeof submitted === "object" && !Array.isArray(submitted)) throw badRequest(`Invalid answer for: ${question.label}`);
    const value = Array.isArray(submitted) ? submitted : String(submitted);
    if (question.type === "MULTI_SELECT" && !Array.isArray(submitted)) throw badRequest(`Choose one or more options for: ${question.label}`);
    if (question.type === "SELECT" && Array.isArray(submitted)) throw badRequest(`Choose a single option for: ${question.label}`);
    if ((question.type === "SELECT" || question.type === "MULTI_SELECT") && Array.isArray(question.options)) {
      const allowed = question.options as string[];
      const selected = question.type === "MULTI_SELECT" ? submitted as string[] : [String(value)];
      if (selected.some((option) => !allowed.includes(option))) throw badRequest(`Invalid selection for: ${question.label}`);
    }
    if (question.type === "NUMBER" && (!Number.isFinite(Number(value)) || Number(value) < 0)) throw badRequest(`Enter a valid non-negative number for: ${question.label}`);
    if (question.type === "EMAIL" && !zodEmail(String(value))) throw badRequest(`Enter a valid email for: ${question.label}`);
    if (question.type === "DATE" && Number.isNaN(new Date(String(value)).getTime())) throw badRequest(`Enter a valid date for: ${question.label}`);
    if (question.type === "TIME" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(value))) throw badRequest(`Enter a valid time for: ${question.label}`);
    normalizedAnswers.set(question.id, { questionId: question.id, label: question.label, value: value as Prisma.InputJsonValue });
  }

  const created = await prisma.$transaction(async (transaction) => {
    const item = await transaction.customerRequest.create({
      data: {
        requestNumber: `PENDING-${randomUUID()}`,
        businessId: business.id,
        customerName: input.customerName,
        customerEmail: input.customerEmail || null,
        customerPhone: input.customerPhone || null,
        customerWhatsapp: input.customerWhatsapp || null,
        requestType: isProductOrder ? "Product order" : input.requestType,
        description: isProductOrder
          ? `Order details:\n${orderDescription}${input.orderNote?.trim() ? `\n\nCustomer note: ${input.orderNote.trim()}` : ""}`
          : input.description ?? "",
        location: input.location || null,
        preferredDate: input.preferredDate,
        budget: input.budget === undefined ? null : new Prisma.Decimal(input.budget),
        answers: { create: [...normalizedAnswers.values()] },
      },
    });
    const requestNumber = `REQ-${String(item.sequence).padStart(6, "0")}`;
    await transaction.customerRequest.update({ where: { id: item.id }, data: { requestNumber } });
    await transaction.businessEvent.create({
      data: { businessId: business.id, eventType: "QUOTE_REQUEST", metadata: { requestNumber, requestType: input.requestType } },
    });
    return { requestNumber, status: RequestStatus.NEW };
  });
  return success(response, created, 201);
});

function zodEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export const getPublicRequest = asyncHandler(async (request, response) => {
  const record = await prisma.customerRequest.findUnique({
    where: { requestNumber: getParam(request, "requestNumber") },
    select: { requestNumber: true, requestType: true, status: true, createdAt: true, business: { select: { name: true, slug: true, phone: true, whatsapp: true, email: true } } },
  });
  if (!record) throw notFound("Request not found");
  return success(response, record);
});

export const listRequests = asyncHandler(async (request, response) => {
  const where: Prisma.CustomerRequestWhereInput = { businessId: getParam(request, "businessId") };
  const status = getQuery(request, "status");
  if (status) where.status = status as RequestStatus;
  const records = await prisma.customerRequest.findMany({
    where,
    include: { answers: true, quote: { select: { id: true, quoteNumber: true, status: true, total: true } } },
    orderBy: { createdAt: "desc" },
  });
  return success(response, records);
});

export const getRequest = asyncHandler(async (request, response) => {
  const record = await prisma.customerRequest.findUnique({
    where: { id: getParam(request, "id") },
    include: { answers: true, quote: { include: { items: true } } },
  });
  if (!record) throw notFound("Request not found");
  if (!request.user) throw unauthorized();
  const owned = await prisma.business.findFirst({ where: { id: record.businessId, ownerId: request.user.id }, select: { id: true } });
  if (!owned && request.user.role !== "ADMIN") throw notFound("Request not found");
  return success(response, record);
});

export const updateRequestStatus = asyncHandler(async (request, response) => {
  const { status } = requestStatusSchema.parse(request.body);
  const id = getParam(request, "id");
  const record = await prisma.customerRequest.findUnique({ where: { id }, select: { businessId: true } });
  if (!record) throw notFound("Request not found");
  if (!request.user) throw unauthorized();
  const owned = await prisma.business.findFirst({ where: { id: record.businessId, ownerId: request.user.id }, select: { id: true } });
  if (!owned && request.user.role !== "ADMIN") throw notFound("Request not found");
  return success(response, await prisma.customerRequest.update({ where: { id }, data: { status } }));
});
