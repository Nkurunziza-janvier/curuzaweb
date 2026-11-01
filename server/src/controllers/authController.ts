import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { findIndustryForCategory, getIndustry, getSubtype } from "../config/businessCatalog.js";
import { createDefaultTemplate } from "../services/templates.js";
import { conflict, notFound, unauthorized } from "../utils/errors.js";
import { success } from "../utils/responses.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { registerSchema, loginSchema } from "../validators/schemas.js";

function slugify(name: string) {
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function tokenFor(userId: string) {
  return jwt.sign({}, env.JWT_SECRET, { subject: userId, expiresIn: "1d" });
}

const currentUser = {
  id: true,
  name: true,
  email: true,
  role: true,
  business: { select: { id: true, name: true, slug: true, category: true, industryKey: true, subtype: true, capabilities: true, currency: true, onboardingStep: true, onboardingCompletedAt: true, publishedAt: true, isPublished: true, canPublishProducts: true, productAccessExpiresAt: true } },
} as const;

export const register = asyncHandler(async (request, response) => {
  const input = registerSchema.parse(request.body);
  const email = input.email.toLowerCase();
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) throw conflict("An account with this email already exists");

  const passwordHash = await bcrypt.hash(input.password, 12);
  let slug = slugify(input.businessName) || "business";
  if (await prisma.business.findUnique({ where: { slug }, select: { id: true } })) slug = `${slug}-${randomBytes(3).toString("hex")}`;

  const industry = getIndustry(input.industryKey) ?? findIndustryForCategory(input.category);
  const subtype = industry.key === "other" && input.subtype?.trim()
    ? { key: input.subtype.trim(), label: input.subtype.trim() }
    : getSubtype(industry.key, input.subtype) ?? industry.subtypes[0]!;
  const category = input.category?.trim() || subtype.label;

  const user = await prisma.$transaction(async (transaction) => {
    const createdUser = await transaction.user.create({
      data: {
        name: input.name,
        email,
        passwordHash,
        business: {
          create: {
            name: input.businessName,
            slug,
            category,
            industryKey: input.industryKey ?? industry.key,
            subtype: subtype.key,
            capabilities: industry.recommended,
            profileData: {},
            description: input.description ?? "",
            phone: input.phone || null,
            whatsapp: input.whatsapp || null,
            city: input.city || null,
            address: input.address || null,
            preferredLanguage: "en",
            currency: "RWF",
          },
        },
      },
      select: currentUser,
    });
    if (createdUser.business) await createDefaultTemplate(createdUser.business.id, createdUser.business.category, transaction);
    return createdUser;
  });
  return success(response, { token: tokenFor(user.id), user }, 201);
});

export const login = asyncHandler(async (request, response) => {
  const input = loginSchema.parse(request.body);
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) throw unauthorized("Email or password is incorrect");
  const businessStatus = await prisma.business.findUnique({ where: { ownerId: user.id }, select: { isBlocked: true } });
  if (user.role === "BUSINESS_OWNER" && !businessStatus) throw unauthorized("This account no longer has an active business.");
  if (businessStatus?.isBlocked) throw unauthorized("This business account has been blocked. Contact platform support for help.");
  const safeUser = await prisma.user.findUnique({ where: { id: user.id }, select: currentUser });
  if (!safeUser) throw notFound("Account not found");
  return success(response, { token: tokenFor(user.id), user: safeUser });
});

export const me = asyncHandler(async (request, response) => {
  if (!request.user) throw unauthorized();
  const user = await prisma.user.findUnique({ where: { id: request.user.id }, select: currentUser });
  if (!user) throw notFound("Account not found");
  return success(response, user);
});
