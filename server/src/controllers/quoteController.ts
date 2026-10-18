import { Prisma, QuoteStatus, RequestStatus } from "@prisma/client";
import { randomBytes, randomUUID } from "node:crypto";
import { prisma } from "../config/prisma.js";
import { calculateQuote, findPublicQuote, respondToQuote, sendQuoteMessage } from "../services/quotes.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest, notFound, unauthorized } from "../utils/errors.js";
import { success } from "../utils/responses.js";
import { getParam } from "../utils/requestParam.js";
import { messageSchema, quoteSchema, quoteUpdateSchema } from "../validators/schemas.js";

export const listQuotes = asyncHandler(async (request, response) => {
  return success(response, await prisma.quote.findMany({
    where: { businessId: getParam(request, "businessId") },
    include: { request: { select: { id: true, requestNumber: true, customerName: true, requestType: true } }, items: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" },
  }));
});

export const quoteSummary = asyncHandler(async (request, response) => {
  const businessId = getParam(request, "businessId");
  const [counts, accepted, pending, responseQuotes] = await Promise.all([
    prisma.quote.groupBy({ by: ["status"], where: { businessId }, _count: { _all: true } }),
    prisma.quote.aggregate({ where: { businessId, status: QuoteStatus.ACCEPTED }, _sum: { total: true } }),
    prisma.quote.aggregate({ where: { businessId, status: { in: [QuoteStatus.SENT, QuoteStatus.VIEWED, QuoteStatus.CHANGE_REQUESTED] } }, _sum: { total: true } }),
    prisma.quote.findMany({
      where: { businessId, sentAt: { not: null }, OR: [{ acceptedAt: { not: null } }, { rejectedAt: { not: null } }] },
      select: { sentAt: true, acceptedAt: true, rejectedAt: true },
    }),
  ]);
  const countByStatus = new Map(counts.map((item) => [item.status, item._count._all]));
  const durations = responseQuotes.flatMap((quote) => {
    const decidedAt = quote.acceptedAt ?? quote.rejectedAt;
    return quote.sentAt && decidedAt ? [decidedAt.getTime() - quote.sentAt.getTime()] : [];
  });
  const averageResponseTimeHours = durations.length
    ? durations.reduce((total, duration) => total + duration, 0) / durations.length / 3_600_000
    : null;
  const total = counts.reduce((sum, item) => sum + item._count._all, 0);
  return success(response, {
    total,
    drafts: countByStatus.get(QuoteStatus.DRAFT) ?? 0,
    awaitingResponse: (countByStatus.get(QuoteStatus.SENT) ?? 0) + (countByStatus.get(QuoteStatus.VIEWED) ?? 0),
    changeRequested: countByStatus.get(QuoteStatus.CHANGE_REQUESTED) ?? 0,
    accepted: countByStatus.get(QuoteStatus.ACCEPTED) ?? 0,
    rejectedOrExpired: (countByStatus.get(QuoteStatus.REJECTED) ?? 0) + (countByStatus.get(QuoteStatus.EXPIRED) ?? 0),
    acceptedValue: Number(accepted._sum.total ?? 0),
    pendingValue: Number(pending._sum.total ?? 0),
    acceptanceRate: (countByStatus.get(QuoteStatus.ACCEPTED) ?? 0) + (countByStatus.get(QuoteStatus.REJECTED) ?? 0)
      ? Math.round(((countByStatus.get(QuoteStatus.ACCEPTED) ?? 0) / ((countByStatus.get(QuoteStatus.ACCEPTED) ?? 0) + (countByStatus.get(QuoteStatus.REJECTED) ?? 0))) * 100)
      : 0,
    averageResponseTimeHours: averageResponseTimeHours === null ? null : Math.round(averageResponseTimeHours * 10) / 10,
  });
});

export const getQuote = asyncHandler(async (request, response) => {
  const record = await prisma.quote.findUnique({
    where: { id: getParam(request, "id") },
    include: { request: { include: { answers: true } }, items: { orderBy: { sortOrder: "asc" } }, messages: { orderBy: { createdAt: "asc" } }, business: { select: { name: true, slug: true, phone: true, whatsapp: true, email: true, logoUrl: true } } },
  });
  if (!record) throw notFound("Quote not found");
  if (!request.user) throw unauthorized();
  const owned = await prisma.business.findFirst({ where: { id: record.businessId, ownerId: request.user.id }, select: { id: true } });
  if (!owned && request.user.role !== "ADMIN") throw notFound("Quote not found");
  return success(response, record);
});

export const createQuote = asyncHandler(async (request, response) => {
  const input = quoteSchema.parse(request.body);
  const requestId = getParam(request, "requestId");
  const customerRequest = await prisma.customerRequest.findUnique({ where: { id: requestId } });
  if (!customerRequest) throw notFound("Request not found");
  if (!request.user) throw unauthorized();
  const business = await prisma.business.findFirst({
    where: { id: customerRequest.businessId, ...(request.user.role === "ADMIN" ? {} : { ownerId: request.user.id }) },
    select: { id: true },
  });
  if (!business) throw notFound("Request not found");
  if (await prisma.quote.findUnique({ where: { requestId: customerRequest.id }, select: { id: true } })) throw badRequest("A quote already exists for this request");

  const totals = calculateQuote(input.items, input.discount, input.discountType);
  if (new Prisma.Decimal(input.depositAmount).greaterThan(totals.total)) throw badRequest("Deposit cannot exceed the quote total");
  const record = await prisma.$transaction(async (transaction) => {
    const quote = await transaction.quote.create({
      data: {
        quoteNumber: `PENDING-${randomUUID()}`,
        publicToken: randomBytes(32).toString("base64url"),
        requestId: customerRequest.id,
        businessId: customerRequest.businessId,
        subtotal: totals.subtotal,
        discount: totals.discount,
        discountType: input.discountType,
        discountValue: totals.discountValue,
        total: totals.total,
        currency: input.currency,
        validityDays: input.validityDays,
        validUntil: new Date(Date.now() + input.validityDays * 24 * 60 * 60 * 1000),
        estimatedCompletionDate: input.estimatedCompletionDate ?? null,
        paymentTerms: input.paymentTerms ?? "",
        depositAmount: new Prisma.Decimal(input.depositAmount),
        notes: input.notes ?? "",
        items: { create: input.items.map((item, sortOrder) => ({
          name: item.name,
          description: item.description ?? "",
          quantity: new Prisma.Decimal(item.quantity),
          unitPrice: new Prisma.Decimal(item.unitPrice),
          total: new Prisma.Decimal((item.quantity * item.unitPrice).toFixed(2)),
          sortOrder: item.sortOrder ?? sortOrder,
        })) },
      },
    });
    const quoteNumber = `QUO-${String(quote.sequence).padStart(6, "0")}`;
    const updated = await transaction.quote.update({ where: { id: quote.id }, data: { quoteNumber }, include: { items: true } });
    await transaction.businessEvent.create({ data: { businessId: customerRequest.businessId, eventType: "QUOTE_CREATED", metadata: { quoteNumber } } });
    return updated;
  });
  return success(response, record, 201);
});

export const updateQuote = asyncHandler(async (request, response) => {
  const input = quoteUpdateSchema.parse(request.body);
  const quoteId = getParam(request, "id");
  const existing = await prisma.quote.findUnique({ where: { id: quoteId }, include: { items: true } });
  if (!existing) throw notFound("Quote not found");
  if (existing.status !== QuoteStatus.DRAFT && existing.status !== QuoteStatus.CHANGE_REQUESTED) throw badRequest("Only draft or change-requested quotes can be edited");
  const items = input.items ?? existing.items.map((item) => ({ name: item.name, description: item.description, quantity: item.quantity.toNumber(), unitPrice: item.unitPrice.toNumber(), sortOrder: item.sortOrder }));
  const discountType = input.discountType ?? existing.discountType;
  const discount = input.discount ?? existing.discountValue.toNumber();
  const totals = calculateQuote(items, discount, discountType);
  const validityDays = input.validityDays ?? existing.validityDays;
  const depositAmount = input.depositAmount ?? existing.depositAmount.toNumber();
  if (new Prisma.Decimal(depositAmount).greaterThan(totals.total)) throw badRequest("Deposit cannot exceed the quote total");
  const updated = await prisma.$transaction(async (transaction) => {
    const saved = await transaction.quote.updateMany({
      where: { id: existing.id, status: existing.status, updatedAt: existing.updatedAt },
      data: {
        subtotal: totals.subtotal,
        discount: totals.discount,
        discountType,
        discountValue: totals.discountValue,
        total: totals.total,
        currency: input.currency ?? existing.currency,
        validityDays,
        validUntil: new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000),
        notes: input.notes ?? existing.notes,
        estimatedCompletionDate: input.estimatedCompletionDate === undefined ? existing.estimatedCompletionDate : input.estimatedCompletionDate,
        paymentTerms: input.paymentTerms ?? existing.paymentTerms,
        depositAmount: new Prisma.Decimal(depositAmount),
        ...(existing.status === QuoteStatus.CHANGE_REQUESTED ? { status: QuoteStatus.DRAFT } : {}),
      },
    });
    if (!saved.count) throw badRequest("This quote changed while you were editing it. Reload and try again");
    if (input.items) {
      await transaction.quoteItem.deleteMany({ where: { quoteId: existing.id } });
      await transaction.quoteItem.createMany({ data: input.items.map((item, sortOrder) => ({
        quoteId: existing.id,
        name: item.name,
        description: item.description ?? "",
        quantity: new Prisma.Decimal(item.quantity),
        unitPrice: new Prisma.Decimal(item.unitPrice),
        total: new Prisma.Decimal((item.quantity * item.unitPrice).toFixed(2)),
        sortOrder: item.sortOrder ?? sortOrder,
      })) });
    }
    return transaction.quote.findUniqueOrThrow({ where: { id: existing.id }, include: { items: true } });
  });
  return success(response, updated);
});

export const sendQuote = asyncHandler(async (request, response) => {
  const quoteId = getParam(request, "id");
  const record = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!record) throw notFound("Quote not found");
  if (record.status !== QuoteStatus.DRAFT) throw badRequest("Only a draft quote can be sent");
  const result = await prisma.$transaction(async (transaction) => {
    const sent = await transaction.quote.updateMany({ where: { id: record.id, status: QuoteStatus.DRAFT }, data: { status: QuoteStatus.SENT, sentAt: new Date(), viewedAt: null } });
    if (!sent.count) throw badRequest("This quote has already been sent or cancelled");
    await transaction.customerRequest.update({ where: { id: record.requestId }, data: { status: RequestStatus.QUOTE_SENT } });
    await transaction.businessEvent.create({ data: { businessId: record.businessId, eventType: "QUOTE_SENT", metadata: { quoteNumber: record.quoteNumber } } });
    return transaction.quote.findUniqueOrThrow({ where: { id: record.id } });
  });
  return success(response, result);
});

export const getPublicQuote = asyncHandler(async (request, response) => {
  const quote = await findPublicQuote(getParam(request, "publicToken"));
  return success(response, quote);
});

export const acceptQuote = asyncHandler(async (request, response) => success(response, await respondToQuote(getParam(request, "publicToken"), "accept")));
export const rejectQuote = asyncHandler(async (request, response) => {
  const reason = request.body && typeof request.body === "object" && "message" in request.body ? messageSchema.parse(request.body).message : undefined;
  return success(response, await respondToQuote(getParam(request, "publicToken"), "reject", reason));
});
export const requestQuoteChanges = asyncHandler(async (request, response) => {
  const input = messageSchema.parse(request.body);
  return success(response, await respondToQuote(getParam(request, "publicToken"), "change", input.message));
});

export const createPublicQuoteMessage = asyncHandler(async (request, response) => {
  const input = messageSchema.parse(request.body);
  return success(response, await sendQuoteMessage(getParam(request, "publicToken"), input.message), 201);
});

export const createBusinessQuoteMessage = asyncHandler(async (request, response) => {
  const input = messageSchema.parse(request.body);
  const quoteId = getParam(request, "id");
  const quote = await prisma.quote.findUnique({ where: { id: quoteId }, select: { id: true, businessId: true, status: true } });
  if (!quote) throw notFound("Quote not found");
  if (!request.user) throw unauthorized();
  const business = await prisma.business.findFirst({ where: { id: quote.businessId, ownerId: request.user.id }, select: { id: true } });
  if (!business && request.user.role !== "ADMIN") throw notFound("Quote not found");
  if (quote.status === QuoteStatus.DRAFT || quote.status === QuoteStatus.CANCELLED) throw badRequest("Messages are unavailable for this quote");
  const saved = await prisma.quoteMessage.create({ data: { quoteId, senderType: "BUSINESS", message: input.message }, select: { id: true, senderType: true, message: true, createdAt: true } });
  return success(response, saved, 201);
});

export const cancelQuote = asyncHandler(async (request, response) => {
  const quoteId = getParam(request, "id");
  const quote = await prisma.quote.findUnique({ where: { id: quoteId }, select: { id: true, requestId: true, status: true } });
  if (!quote) throw notFound("Quote not found");
  if (quote.status !== QuoteStatus.DRAFT) throw badRequest("Only a draft quote can be cancelled");
  const cancelled = await prisma.quote.updateMany({ where: { id: quoteId, status: QuoteStatus.DRAFT }, data: { status: QuoteStatus.CANCELLED } });
  if (!cancelled.count) throw badRequest("This quote can no longer be cancelled");
  return success(response, { id: quoteId, status: QuoteStatus.CANCELLED });
});
