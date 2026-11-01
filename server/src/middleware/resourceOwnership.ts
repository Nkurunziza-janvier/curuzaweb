import type { RequestHandler } from "express";
import { prisma } from "../config/prisma.js";
import { forbidden, notFound, unauthorized } from "../utils/errors.js";
import { getParam } from "../utils/requestParam.js";

type Resource = "product" | "service" | "offer" | "quote" | "booking" | "order" | "review";

export function requireOwnedResource(resource: Resource): RequestHandler {
  return async (request, _response, next) => {
    try {
      if (!request.user) throw unauthorized();
      const id = typeof request.params.id === "string" && request.params.id ? request.params.id : getParam(request, "orderId");
      const record = resource === "product"
        ? await prisma.product.findUnique({ where: { id }, select: { businessId: true } })
        : resource === "service"
          ? await prisma.service.findUnique({ where: { id }, select: { businessId: true } })
          : resource === "offer"
            ? await prisma.offer.findUnique({ where: { id }, select: { businessId: true } })
            : resource === "quote"
              ? await prisma.quote.findUnique({ where: { id }, select: { businessId: true } })
              : resource === "booking"
                ? await prisma.booking.findUnique({ where: { id }, select: { businessId: true } })
                : resource === "review"
                  ? await prisma.review.findUnique({ where: { id }, select: { businessId: true } })
                  : await prisma.order.findUnique({ where: { id }, select: { businessId: true } });
      if (!record) throw notFound(`${resource[0]!.toUpperCase()}${resource.slice(1)} not found`);
      const business = await prisma.business.findUnique({ where: { id: record.businessId }, select: { ownerId: true } });
      if (business?.ownerId !== request.user.id && request.user.role !== "ADMIN") throw forbidden();
      next();
    } catch (error) {
      next(error);
    }
  };
}
