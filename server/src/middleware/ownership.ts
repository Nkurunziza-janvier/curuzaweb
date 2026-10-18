import type { RequestHandler } from "express";
import { prisma } from "../config/prisma.js";
import { forbidden, notFound, unauthorized } from "../utils/errors.js";
import { getParam } from "../utils/requestParam.js";

export const requireOwnedBusiness: RequestHandler = async (request, _response, next) => {
  try {
    if (!request.user) throw unauthorized();
    const business = await prisma.business.findUnique({ where: { id: getParam(request, "businessId") }, select: { id: true, ownerId: true } });
    if (!business) throw notFound("Business not found");
    if (business.ownerId !== request.user.id && request.user.role !== "ADMIN") throw forbidden();
    next();
  } catch (error) {
    next(error);
  }
};
