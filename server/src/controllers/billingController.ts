import { randomBytes } from "node:crypto";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest, notFound, unauthorized } from "../utils/errors.js";
import { success } from "../utils/responses.js";
import { checkoutSchema, subscriptionPaymentSchema } from "../validators/schemas.js";
import { env, paymentMode } from "../config/env.js";
import { getParam } from "../utils/requestParam.js";

export const plans = {
  MONTHLY: { code: "MONTHLY", name: "Monthly publishing", amount: 10000, durationDays: 30, productLimit: 50 },
  YEARLY: { code: "YEARLY", name: "Annual publishing", amount: 100000, durationDays: 365, productLimit: 50 },
} as const;

export const getBilling = asyncHandler(async (request, response) => {
  if (!request.user) throw unauthorized();
  const business = await prisma.business.findUnique({ where: { ownerId: request.user.id }, select: { id: true, canPublishProducts: true, productAccessExpiresAt: true } });
  if (!business) throw notFound("Business not found");
  const payments = await prisma.subscriptionPayment.findMany({ where: { businessId: business.id }, orderBy: { submittedAt: "desc" }, take: 10 });
  const active = Boolean(business.canPublishProducts && business.productAccessExpiresAt && business.productAccessExpiresAt > new Date());
  return success(response, { plans: Object.values(plans), active, validUntil: business.productAccessExpiresAt, payments, mode: paymentMode, paymentRecipient: { name: env.PAYMENT_MOMO_NAME, number: env.PAYMENT_MOMO_NUMBER } });
});

export const checkout = asyncHandler(async (request, response) => {
  if (!request.user) throw unauthorized();
  if (paymentMode !== "DEMO") throw badRequest("Demo checkout is disabled. Submit your real payment details for verification.");
  const { planCode } = checkoutSchema.parse(request.body);
  const plan = plans[planCode];
  const business = await prisma.business.findUnique({ where: { ownerId: request.user.id }, select: { id: true, ownerId: true, name: true, productAccessExpiresAt: true } });
  if (!business) throw notFound("Business not found");

  const now = new Date();
  const currentExpiry = business.productAccessExpiresAt && business.productAccessExpiresAt > now ? business.productAccessExpiresAt : now;
  const validUntil = new Date(currentExpiry.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
  const transactionReference = `DEMO-${Date.now()}-${randomBytes(4).toString("hex").toUpperCase()}`;

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.subscriptionPayment.create({
      data: {
        businessId: business.id,
        planCode: plan.code,
        amount: plan.amount,
        payerPhone: "DEMO CHECKOUT",
        transactionReference,
        status: "APPROVED",
        reviewedAt: now,
        reviewNote: "Simulated checkout: no real payment was charged.",
        validUntil,
      },
    });
    await tx.business.update({ where: { id: business.id }, data: { canPublishProducts: true, productAccessExpiresAt: validUntil } });
    const [productsPublished, servicesPublished] = await Promise.all([
      tx.product.updateMany({ where: { businessId: business.id }, data: { isPublished: true } }),
      tx.service.updateMany({ where: { businessId: business.id }, data: { isPublished: true } }),
    ]);
    await tx.notification.createMany({ data: [
      { userId: business.ownerId, title: "Demo plan activated", message: `${plan.name} is active until ${validUntil.toLocaleDateString()}. Your saved products and services are now published. No real payment was charged.`, type: "SUCCESS", link: "/dashboard/billing" },
      { forAdmins: true, title: "Demo subscription activated", message: `${business.name} activated a simulated ${plan.name} plan.`, type: "INFO", link: "/admin/businesses" },
    ] });
    return { ...created, productsPublished: productsPublished.count, servicesPublished: servicesPublished.count };
  });
  return success(response, payment, 201);
});

export const submitPayment = asyncHandler(async (request, response) => {
  if (!request.user) throw unauthorized();
  const input = subscriptionPaymentSchema.parse(request.body);
  const business = await prisma.business.findUnique({ where: { ownerId: request.user.id }, select: { id: true, name: true } });
  if (!business) throw notFound("Business not found");
  const plan = plans[input.planCode];
  const pending = await prisma.subscriptionPayment.findFirst({ where: { businessId: business.id, status: "PENDING" } });
  if (pending) throw badRequest("You already have a payment awaiting review. Please wait for the administrator to review it.");
  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.subscriptionPayment.create({ data: { businessId: business.id, planCode: plan.code, amount: plan.amount, payerPhone: input.payerPhone, transactionReference: input.transactionReference } });
    await tx.notification.createMany({ data: [
      { userId: request.user!.id, title: "Payment submitted", message: `Your ${plan.name.toLowerCase()} payment is waiting for verification.`, type: "PAYMENT", link: "/dashboard/billing" },
      { forAdmins: true, title: "Payment needs review", message: `${business.name} submitted ${input.transactionReference} for verification.`, type: "PAYMENT", link: "/admin/payments" },
    ] });
    return created;
  });
  return success(response, payment, 201);
});

export const listPayments = asyncHandler(async (_request, response) => {
  // Keep the full payment ledger available to admins. In particular, DEMO
  // checkout creates already-approved rows which must remain auditable here.
  const payments = await prisma.subscriptionPayment.findMany({
    orderBy: { submittedAt: "desc" },
    take: 1000,
    include: {
      business: {
        select: {
          id: true, name: true, slug: true, isPublished: true, isBlocked: true,
          canPublishProducts: true, productAccessExpiresAt: true,
          owner: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
  return success(response, payments);
});

export const reviewPayment = asyncHandler(async (request, response) => {
  if (!request.user) throw unauthorized();
  const { decision, reviewNote } = request.body as { decision?: string; reviewNote?: string };
  if (decision !== "APPROVE" && decision !== "REJECT") throw badRequest("Choose approve or reject");
  const payment = await prisma.subscriptionPayment.findUnique({ where: { id: getParam(request, "paymentId") } });
  if (!payment) throw notFound("Payment not found");
  const business = await prisma.business.findUnique({ where: { id: payment.businessId }, include: { owner: true } });
  if (!business) throw notFound("Business not found");
  if (payment.status !== "PENDING") throw badRequest("This payment has already been reviewed");
  const plan = plans[payment.planCode as keyof typeof plans];
  if (!plan) throw badRequest("Unknown subscription plan");
  const now = new Date();
  const validUntil = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
  await prisma.$transaction(async (tx) => {
    await tx.subscriptionPayment.update({ where: { id: payment.id }, data: { status: decision === "APPROVE" ? "APPROVED" : "REJECTED", reviewedAt: now, reviewedById: request.user!.id, reviewNote: reviewNote?.slice(0, 500) || null, validUntil: decision === "APPROVE" ? validUntil : null } });
    if (decision === "APPROVE") {
      await tx.business.update({ where: { id: payment.businessId }, data: { canPublishProducts: true, productAccessExpiresAt: validUntil } });
      await Promise.all([
        tx.product.updateMany({ where: { businessId: payment.businessId }, data: { isPublished: true } }),
        tx.service.updateMany({ where: { businessId: payment.businessId }, data: { isPublished: true } }),
      ]);
    }
    await tx.notification.create({ data: { userId: business.ownerId, title: decision === "APPROVE" ? "Publishing access approved" : "Payment needs attention", message: decision === "APPROVE" ? `Your payment was verified. You can publish up to ${plan.productLimit} products until ${validUntil.toLocaleDateString()}.` : `Your payment could not be verified.${reviewNote ? ` ${reviewNote}` : " Please check the transaction details and submit again."}`, type: decision === "APPROVE" ? "SUCCESS" : "PAYMENT", link: "/dashboard/billing" } });
    await tx.notification.create({ data: { userId: request.user!.id, forAdmins: true, title: `Payment ${decision.toLowerCase()}d`, message: `${business.name} · ${payment.transactionReference}`, type: "PAYMENT", link: "/admin/payments" } });
    await tx.adminAuditLog.create({ data: { actorId: request.user!.id, businessId: payment.businessId, action: `PAYMENT_${decision}D`, details: { paymentId: payment.id, transactionReference: payment.transactionReference, amount: Number(payment.amount), reviewNote: reviewNote ?? null } } });
  });
  return success(response, { id: payment.id, decision, validUntil: decision === "APPROVE" ? validUntil : null });
});

export const getNotifications = asyncHandler(async (request, response) => {
  if (!request.user) throw unauthorized();
  const where = request.user.role === "ADMIN" ? { OR: [{ userId: request.user.id }, { forAdmins: true }] } : { userId: request.user.id };
  const [items, unreadCount] = await Promise.all([prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: 30 }), prisma.notification.count({ where: { ...where, readAt: null } })]);
  return success(response, { items, unreadCount });
});

export const markNotificationsRead = asyncHandler(async (request, response) => {
  if (!request.user) throw unauthorized();
  const ids = Array.isArray(request.body?.ids) ? request.body.ids.filter((id: unknown): id is string => typeof id === "string") : [];
  const where = request.user.role === "ADMIN" ? { OR: [{ userId: request.user.id }, { forAdmins: true }] } : { userId: request.user.id };
  await prisma.notification.updateMany({ where: { ...where, ...(ids.length ? { id: { in: ids } } : { readAt: null }) }, data: { readAt: new Date() } });
  return success(response, { updated: true });
});
