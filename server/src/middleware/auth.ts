import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { forbidden, unauthorized } from "../utils/errors.js";

export const authenticate: RequestHandler = asyncHandler(async (request, _response, next) => {
  const authorization = request.header("authorization");
  if (!authorization?.startsWith("Bearer ")) throw unauthorized();

  let payload: jwt.JwtPayload;
  try {
    const decoded = jwt.verify(authorization.slice(7), env.JWT_SECRET);
    if (typeof decoded === "string" || typeof decoded.sub !== "string") throw unauthorized("Invalid access token");
    payload = decoded;
  } catch {
    throw unauthorized("Invalid or expired access token");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, role: true, business: { select: { isBlocked: true } } } });
  if (!user) throw unauthorized("Account no longer exists");
  if (user.role === "BUSINESS_OWNER" && !user.business) throw unauthorized("This account no longer has an active business.");
  if (user.role === "BUSINESS_OWNER" && user.business?.isBlocked) throw forbidden("This business account has been blocked. Contact platform support for help.");
  request.user = user;
  next();
});

export const requireBusinessOwner: RequestHandler = (request, _response, next) => {
  if (!request.user) return next(unauthorized());
  if (request.user.role !== "BUSINESS_OWNER" && request.user.role !== "ADMIN") return next(forbidden());
  next();
};

export const requireAdmin: RequestHandler = (request, _response, next) => {
  if (!request.user) return next(unauthorized());
  if (request.user.role !== "ADMIN") return next(forbidden());
  next();
};
