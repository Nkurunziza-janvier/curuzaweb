import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest, notFound, unauthorized } from "../utils/errors.js";
import { getParam } from "../utils/requestParam.js";
import { success } from "../utils/responses.js";
import { adminBusinessUpdateSchema } from "../validators/schemas.js";

export const getOverview = asyncHandler(async (_request, response) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [businessCount, publishedBusinessCount, productCount, requestCount, pendingProductApprovalCount, recentRegistrations, recentBusinesses] = await Promise.all([
    prisma.business.count(),
    prisma.business.count({ where: { isPublished: true, isBlocked: false } }),
    prisma.product.count(),
    prisma.customerRequest.count(),
    prisma.subscriptionPayment.count({ where: { status: "PENDING" } }),
    prisma.business.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.business.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, category: true, city: true, createdAt: true, isPublished: true, canPublishProducts: true, productAccessExpiresAt: true, isBlocked: true, owner: { select: { name: true, email: true } } },
    }),
  ]);
  return success(response, { businessCount, publishedBusinessCount, productCount, requestCount, pendingProductApprovalCount, recentRegistrations, recentBusinesses });
});

export const listBusinesses = asyncHandler(async (_request, response) => {
  const businesses = await prisma.business.findMany({
    orderBy: { createdAt: "desc" },
    take: 1000,
    select: {
      id: true, name: true, slug: true, category: true, city: true, country: true,
      createdAt: true, isPublished: true, canPublishProducts: true, productAccessExpiresAt: true, isBlocked: true,
      owner: { select: { id: true, name: true, email: true } },
      _count: { select: { products: true, requests: true } },
    },
  });
  return success(response, businesses);
});

export const updateBusiness = asyncHandler(async (request, response) => {
  if (!request.user) throw unauthorized();
  const businessId = getParam(request, "businessId");
  const input = adminBusinessUpdateSchema.parse(request.body);
  const current = await prisma.business.findUnique({ where: { id: businessId }, select: { id: true, isPublished: true, canPublishProducts: true, isBlocked: true } });
  if (!current) throw notFound("Business not found");
  if (input.canPublishProducts === true) throw badRequest("Product publishing access is granted only after a subscription payment is verified.");

  const changes: Record<string, { from: boolean; to: boolean }> = {};
  const nextPublished = input.isBlocked === true ? false : input.isPublished ?? current.isPublished;
  if (nextPublished !== current.isPublished) changes.isPublished = { from: current.isPublished, to: nextPublished };
  if (input.canPublishProducts !== undefined && input.canPublishProducts !== current.canPublishProducts) changes.canPublishProducts = { from: current.canPublishProducts, to: input.canPublishProducts };
  if (input.isBlocked !== undefined && input.isBlocked !== current.isBlocked) changes.isBlocked = { from: current.isBlocked, to: input.isBlocked };
  const updated = await prisma.$transaction(async (transaction) => {
    const business = await transaction.business.update({ where: { id: businessId }, data: { ...input, isPublished: nextPublished } });
    if (Object.keys(changes).length) {
      await transaction.adminAuditLog.create({
        data: {
          actorId: request.user!.id,
          businessId,
          action: "BUSINESS_SETTINGS_UPDATED",
          details: changes,
        },
      });
    }
    return business;
  });
  return success(response, { id: updated.id, isPublished: updated.isPublished, canPublishProducts: updated.canPublishProducts, isBlocked: updated.isBlocked });
});

export const deleteBusiness = asyncHandler(async (request, response) => {
  if (!request.user) throw unauthorized();
  const businessId = getParam(request, "businessId");
  const current = await prisma.business.findUnique({ where: { id: businessId }, select: { id: true, name: true, ownerId: true, owner: { select: { name: true, email: true } } } });
  if (!current) throw notFound("Business not found");
  await prisma.$transaction(async (transaction) => {
    await transaction.business.delete({ where: { id: businessId } });
    await transaction.user.delete({ where: { id: current.ownerId } });
    await transaction.adminAuditLog.create({
      data: {
        actorId: request.user!.id,
        action: "BUSINESS_DELETED",
        details: { businessId: current.id, businessName: current.name, ownerName: current.owner.name, ownerEmail: current.owner.email, ownerAccountDeleted: true },
      },
    });
  });
  return success(response, { id: businessId, deleted: true });
});

export const listAuditLog = asyncHandler(async (_request, response) => {
  const records = await prisma.adminAuditLog.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { name: true, email: true } }, business: { select: { id: true, name: true } } },
  });
  return success(response, records);
});
