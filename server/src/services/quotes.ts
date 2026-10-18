import { DiscountType, Prisma, QuoteStatus, RequestStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { badRequest, notFound } from "../utils/errors.js";

type QuoteLine = { name: string; description?: string; quantity: number; unitPrice: number; sortOrder?: number };

export function calculateQuote(items: QuoteLine[], discount: number, discountType: DiscountType = DiscountType.FIXED) {
  if (!items.length) throw badRequest("A quote must include at least one line item");
  const subtotal = items.reduce(
    (sum, item) => sum.plus(new Prisma.Decimal(item.quantity).mul(item.unitPrice).toDecimalPlaces(2)),
    new Prisma.Decimal(0),
  );
  const discountValue = new Prisma.Decimal(discount).toDecimalPlaces(2);
  if (discountType === DiscountType.PERCENTAGE && discountValue.greaterThan(100)) {
    throw badRequest("Percentage discount cannot exceed 100");
  }
  const discountAmount = discountType === DiscountType.PERCENTAGE
    ? subtotal.mul(discountValue).div(100).toDecimalPlaces(2)
    : discountValue;
  const maximum = new Prisma.Decimal("9999999999.99");
  if (subtotal.greaterThan(maximum)) throw badRequest("Quote subtotal exceeds the supported maximum");
  if (discountAmount.greaterThan(subtotal)) throw badRequest("Discount cannot exceed the quote subtotal");
  return { subtotal, discount: discountAmount, discountValue, total: subtotal.minus(discountAmount) };
}

const publicQuoteInclude = {
  items: { orderBy: { sortOrder: "asc" as const } },
  messages: { orderBy: { createdAt: "asc" as const } },
  business: { select: { name: true, slug: true, logoUrl: true, phone: true, whatsapp: true, email: true } },
  request: {
    select: {
      requestNumber: true,
      requestType: true,
      description: true,
      location: true,
      preferredDate: true,
      answers: { select: { label: true, value: true } },
    },
  },
};

export async function findPublicQuote(publicToken: string) {
  const quote = await prisma.quote.findUnique({ where: { publicToken }, include: publicQuoteInclude });
  if (!quote || quote.status === QuoteStatus.DRAFT || quote.status === QuoteStatus.CANCELLED) throw notFound("Quote not found");
  const activeStatuses: QuoteStatus[] = [QuoteStatus.SENT, QuoteStatus.VIEWED, QuoteStatus.CHANGE_REQUESTED];
  if (activeStatuses.includes(quote.status) && quote.validUntil <= new Date()) {
    const expired = await prisma.quote.updateMany({ where: { id: quote.id, status: { in: activeStatuses }, validUntil: { lte: new Date() } }, data: { status: QuoteStatus.EXPIRED } });
    if (expired.count) await prisma.businessEvent.create({ data: { businessId: quote.businessId, eventType: "QUOTE_EXPIRED", metadata: { quoteNumber: quote.quoteNumber } } });
    return prisma.quote.findUniqueOrThrow({ where: { id: quote.id }, include: publicQuoteInclude });
  }
  if (quote.status === QuoteStatus.SENT) {
    const viewed = await prisma.quote.updateMany({ where: { id: quote.id, status: QuoteStatus.SENT }, data: { status: QuoteStatus.VIEWED, viewedAt: new Date() } });
    if (viewed.count) {
      await prisma.businessEvent.create({ data: { businessId: quote.businessId, eventType: "QUOTE_VIEWED", metadata: { quoteNumber: quote.quoteNumber } } });
    }
    return prisma.quote.findUniqueOrThrow({ where: { id: quote.id }, include: publicQuoteInclude });
  }
  return quote;
}

export async function respondToQuote(publicToken: string, response: "accept" | "reject" | "change", message?: string) {
  const existing = await prisma.quote.findUnique({ where: { publicToken } });
  if (!existing || existing.status === QuoteStatus.DRAFT || existing.status === QuoteStatus.CANCELLED) throw notFound("Quote not found");
  const activeStatuses: QuoteStatus[] = [QuoteStatus.SENT, QuoteStatus.VIEWED, QuoteStatus.CHANGE_REQUESTED];
  if (activeStatuses.includes(existing.status) && existing.validUntil <= new Date()) {
    const expired = await prisma.quote.updateMany({ where: { id: existing.id, status: { in: activeStatuses }, validUntil: { lte: new Date() } }, data: { status: QuoteStatus.EXPIRED } });
    if (expired.count) await prisma.businessEvent.create({ data: { businessId: existing.businessId, eventType: "QUOTE_EXPIRED", metadata: { quoteNumber: existing.quoteNumber } } });
    throw badRequest("This quote has expired");
  }
  if (response === "accept" && existing.status === QuoteStatus.CHANGE_REQUESTED) {
    throw badRequest("The business must send the revised quote before it can be accepted");
  }
  return prisma.$transaction(async (transaction) => {
    const allowedStatuses: QuoteStatus[] = response === "change" || response === "reject"
      ? [QuoteStatus.SENT, QuoteStatus.VIEWED, QuoteStatus.CHANGE_REQUESTED]
      : [QuoteStatus.SENT, QuoteStatus.VIEWED];
    const quoteStatus = response === "accept" ? QuoteStatus.ACCEPTED : response === "reject" ? QuoteStatus.REJECTED : QuoteStatus.CHANGE_REQUESTED;
    const requestStatus = response === "accept" ? RequestStatus.ACCEPTED : response === "reject" ? RequestStatus.REJECTED : RequestStatus.CUSTOMER_RESPONDED;
    const updated = await transaction.quote.updateMany({
      where: { id: existing.id, status: { in: allowedStatuses }, validUntil: { gt: new Date() } },
      data: {
        status: quoteStatus,
        ...(response === "accept" ? { acceptedAt: new Date() } : {}),
        ...(response === "reject" ? { rejectedAt: new Date() } : {}),
      },
    });
    if (!updated.count) throw badRequest("This quote can no longer be changed");
    await transaction.customerRequest.update({ where: { id: existing.requestId }, data: { status: requestStatus } });
    if ((response === "change" || response === "reject") && message) {
      await transaction.quoteMessage.create({ data: { quoteId: existing.id, senderType: "CUSTOMER", message } });
    }
    if (response === "change") {
      await transaction.businessEvent.create({ data: { businessId: existing.businessId, eventType: "QUOTE_CHANGE_REQUESTED", metadata: { quoteNumber: existing.quoteNumber } } });
    }
    if (response === "accept" || response === "reject") {
      await transaction.businessEvent.create({ data: { businessId: existing.businessId, eventType: response === "accept" ? "QUOTE_ACCEPTED" : "QUOTE_REJECTED", metadata: { quoteNumber: existing.quoteNumber } } });
    }
    return { quoteNumber: existing.quoteNumber, status: quoteStatus };
  });
}

export async function sendQuoteMessage(publicToken: string, message: string) {
  const quote = await prisma.quote.findUnique({ where: { publicToken }, select: { id: true, businessId: true, quoteNumber: true, status: true, validUntil: true } });
  if (!quote || quote.status === QuoteStatus.DRAFT || quote.status === QuoteStatus.CANCELLED) throw notFound("Quote not found");
  const activeStatuses: QuoteStatus[] = [QuoteStatus.SENT, QuoteStatus.VIEWED, QuoteStatus.CHANGE_REQUESTED];
  if (!activeStatuses.includes(quote.status)) {
    throw badRequest("Messages are closed for this quote");
  }
  if (quote.validUntil <= new Date()) {
    const expired = await prisma.quote.updateMany({ where: { id: quote.id, status: { in: activeStatuses }, validUntil: { lte: new Date() } }, data: { status: QuoteStatus.EXPIRED } });
    if (expired.count) await prisma.businessEvent.create({ data: { businessId: quote.businessId, eventType: "QUOTE_EXPIRED", metadata: { quoteNumber: quote.quoteNumber } } });
    throw badRequest("This quote has expired");
  }
  return prisma.quoteMessage.create({
    data: { quoteId: quote.id, senderType: "CUSTOMER", message },
    select: { id: true, senderType: true, message: true, createdAt: true },
  });
}
