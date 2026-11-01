import { DiscountType, Prisma } from "@prisma/client";
import { randomBytes } from "node:crypto";
import type { Request } from "express";
import { prisma } from "../config/prisma.js";
import { availableCapabilityKeys, businessCatalog, capabilityError, findIndustryForCategory, getIndustry, getSubtype, normalizeCapabilities, publicIndustry, validateProfileData } from "../config/businessCatalog.js";
import { calculateProfileCompletion, publicProfileDetails } from "../config/profileCompletion.js";
import { createDefaultTemplate } from "../services/templates.js";
import { storageService } from "../services/storage.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest, conflict, forbidden, notFound, unauthorized } from "../utils/errors.js";
import { success } from "../utils/responses.js";
import { getParam } from "../utils/requestParam.js";
import { businessSchema, offerSchema, offerUpdateSchema, productSchema, serviceSchema, templateSchema } from "../validators/schemas.js";
import { z } from "zod";

const zCreateBusiness = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().max(80).optional(),
  industryKey: z.string().trim().max(80).optional(),
  subtype: z.string().trim().max(80).optional(),
});

function effectiveCapabilities(capabilities: string[]) {
  return new Set<string>(capabilities.length ? capabilities : availableCapabilityKeys);
}

function validSubtype(industryKey: string, subtype: string) {
  return industryKey === "other" ? Boolean(subtype.trim()) : Boolean(getSubtype(industryKey, subtype));
}

export const getBusinessCatalog = asyncHandler(async (_request, response) => {
  return success(response, {
    industries: businessCatalog.industries.map(publicIndustry),
    capabilities: businessCatalog.capabilities,
  });
});

function slugify(name: string) {
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function hasActiveCatalogPlan(businessId: string) {
  const business = await prisma.business.findUnique({ where: { id: businessId }, select: { canPublishProducts: true, productAccessExpiresAt: true } });
  return Boolean(business?.canPublishProducts && business.productAccessExpiresAt && business.productAccessExpiresAt > new Date());
}

async function ownedBusinessId(request: Request) {
  if (!request.user) throw unauthorized();
  const business = await prisma.business.findFirst({ where: { ownerId: request.user.id } });
  if (!business) throw notFound("Business not found");
  const requestedBusinessId = request.params.businessId;
  if (typeof requestedBusinessId === "string" && business.id !== requestedBusinessId) throw notFound("Business not found");
  return business.id;
}

export const listBusinesses = asyncHandler(async (request, response) => {
  if (!request.user) throw unauthorized();
  const records = await prisma.business.findMany({
    where: request.user.role === "ADMIN" ? undefined : { ownerId: request.user.id },
    select: { id: true, name: true, slug: true, category: true, isPublished: true, city: true, country: true },
  });
  return success(response, records);
});

export const createBusiness = asyncHandler(async (request, response) => {
  if (!request.user) throw unauthorized();
  const input = zCreateBusiness.parse(request.body);
  const existing = await prisma.business.findFirst({ where: { ownerId: request.user.id }, select: { id: true } });
  if (existing && request.user.role !== "ADMIN") throw badRequest("This account already has a business");
  let slug = slugify(input.name) || "business";
  if (await prisma.business.findUnique({ where: { slug }, select: { id: true } })) slug = `${slug}-${randomBytes(3).toString("hex")}`;
  const industry = getIndustry(input.industryKey) ?? findIndustryForCategory(input.category);
  const subtype = industry.key === "other" && input.subtype?.trim()
    ? { key: input.subtype.trim(), label: input.subtype.trim() }
    : getSubtype(industry.key, input.subtype) ?? industry.subtypes[0]!;
  const category = input.category?.trim() || subtype.label;
  const business = await prisma.business.create({
    data: {
      name: input.name,
      category,
      industryKey: industry.key,
      subtype: subtype.key,
      capabilities: industry.recommended,
      profileData: {},
      slug,
      ownerId: request.user.id,
    },
  });
  await createDefaultTemplate(business.id, business.category);
  return success(response, business, 201);
});

export const getBusiness = asyncHandler(async (request, response) => {
  const business = await prisma.business.findUnique({ where: { id: getParam(request, "businessId") } });
  if (!business) throw notFound("Business not found");
  return success(response, business);
});

export const getProfileCompletion = asyncHandler(async (request, response) => {
  const business = await prisma.business.findUnique({
    where: { id: getParam(request, "businessId") },
    select: {
      name: true,
      industryKey: true,
      subtype: true,
      description: true,
      phone: true,
      whatsapp: true,
      email: true,
      city: true,
      address: true,
      logoUrl: true,
      coverImageUrl: true,
      profileData: true,
    },
  });
  if (!business) throw notFound("Business not found");
  return success(response, calculateProfileCompletion(business));
});

export const updateBusiness = asyncHandler(async (request, response) => {
  const { confirmCapabilityChanges, ...input } = businessSchema.parse(request.body);
  const businessId = getParam(request, "businessId");
  const existing = await prisma.business.findUnique({ where: { id: businessId } });
  if (!existing) throw notFound("Business not found");

  const industryKey = input.industryKey ?? existing.industryKey;
  const industry = getIndustry(industryKey);
  if (!industry) throw badRequest("Choose a valid business industry");
  const subtypeKey = input.subtype ?? existing.subtype;
  if (!validSubtype(industryKey, subtypeKey)) throw badRequest("Choose a business subtype that matches your industry");

  let capabilities: string[] | undefined = input.capabilities;
  if (capabilities === undefined && input.industryKey && input.industryKey !== existing.industryKey) {
    capabilities = industry.recommended;
  }
  if (capabilities !== undefined) {
    const available = new Set<string>(availableCapabilityKeys);
    const unknown = capabilities.find((capability) => !available.has(capability));
    if (unknown) throw badRequest(`The capability "${unknown}" is not available yet`);
    capabilities = normalizeCapabilities(capabilities, industryKey);
    const error = capabilityError(capabilities, industryKey);
    if (error) throw badRequest(error);
    const removed = existing.capabilities.filter((capability) => !capabilities!.includes(capability));
    if (removed.length && !confirmCapabilityChanges) {
      const [products, services, orders, bookings, requests, reviews] = await Promise.all([
        prisma.product.count({ where: { businessId } }),
        prisma.service.count({ where: { businessId } }),
        prisma.order.count({ where: { businessId } }),
        prisma.booking.count({ where: { businessId } }),
        prisma.customerRequest.count({ where: { businessId } }),
        prisma.review.count({ where: { businessId } }),
      ]);
      const recordsByCapability: Record<string, number> = {
        products,
        services,
        product_orders: orders,
        appointments: bookings,
        service_requests: requests,
        contact_form: requests,
        reviews,
      };
      const affected = removed.filter((capability) => (recordsByCapability[capability] ?? 0) > 0);
      if (affected.length) {
        throw conflict(`Disabling ${affected.join(", ")} will hide existing records without deleting them. Confirm the change to continue.`);
      }
    }
  }
  const profileData = input.profileData === undefined ? existing.profileData : input.profileData;
  const profileError = validateProfileData(industryKey, profileData as Record<string, unknown> | null | undefined);
  if (profileError) throw badRequest(profileError);

  const data: Prisma.BusinessUpdateInput = {
    ...input,
    industryKey,
    subtype: subtypeKey,
    capabilities,
    websiteUrl: input.websiteUrl === "" ? null : input.websiteUrl,
    profileData: input.profileData === undefined ? undefined : input.profileData === null ? Prisma.DbNull : input.profileData as Prisma.InputJsonValue,
    socialLinks: input.socialLinks === undefined ? undefined : input.socialLinks === null ? Prisma.DbNull : input.socialLinks as Prisma.InputJsonValue,
    openingHours: input.openingHours === undefined ? undefined : input.openingHours === null ? Prisma.DbNull : input.openingHours as Prisma.InputJsonValue,
  };
  const business = await prisma.business.update({ where: { id: businessId }, data });
  return success(response, business);
});

export const deleteBusiness = asyncHandler(async (request, response) => {
  await prisma.business.delete({ where: { id: getParam(request, "businessId") } });
  return response.status(204).end();
});

export const setBusinessPublished = asyncHandler(async (request, response) => {
  const businessId = getParam(request, "businessId");
  const publish = getParam(request, "state") === "publish";
  if (publish) {
    const existing = await prisma.business.findUnique({ where: { id: businessId } });
    if (!existing) throw notFound("Business not found");
    if (!existing.name.trim()) throw badRequest("Add a business name before publishing");
    if (!getIndustry(existing.industryKey)) throw badRequest("Choose a business industry before publishing");
    if (!validSubtype(existing.industryKey, existing.subtype)) throw badRequest("Choose a business subtype before publishing");
    if (!existing.capabilities.length) throw badRequest("Choose at least one capability for your public page");
  }
  const business = await prisma.business.update({
    where: { id: businessId },
    data: publish
      ? { isPublished: true, publishedAt: new Date(), onboardingCompletedAt: new Date(), onboardingStep: 6 }
      : { isPublished: false },
  });
  return success(response, { id: business.id, slug: business.slug, isPublished: business.isPublished, publishedAt: business.publishedAt });
});

const publicBusinessInclude = {
  products: { where: { isPublished: true, isAvailable: true, business: { canPublishProducts: true, productAccessExpiresAt: { gt: new Date() } } }, orderBy: { sortOrder: "asc" as const } },
  services: { where: { isPublished: true, business: { canPublishProducts: true, productAccessExpiresAt: { gt: new Date() } } }, orderBy: { sortOrder: "asc" as const } },
  offers: { where: { isActive: true, startsAt: { lte: new Date() }, endsAt: { gte: new Date() } }, orderBy: { endsAt: "asc" as const } },
  reviews: { where: { isPublished: true }, orderBy: { createdAt: "desc" as const }, take: 20 },
  requestTemplates: { where: { isActive: true }, include: { questions: { orderBy: { sortOrder: "asc" as const } } }, take: 1 },
  bookingSettings: { select: { isEnabled: true, timezone: true, slotIntervalMinutes: true, minNoticeMinutes: true, maxAdvanceDays: true, cancellationCutoffMinutes: true, requireConfirmation: true } },
  availabilityWindows: { where: { isActive: true }, select: { weekday: true, startMinute: true, endMinute: true }, orderBy: [{ weekday: "asc" as const }, { startMinute: "asc" as const }] },
};

export const getPublicBusiness = asyncHandler(async (request, response) => {
  const business = await prisma.business.findFirst({ where: { slug: getParam(request, "slug"), isBlocked: false }, include: publicBusinessInclude });
  if (!business || !business.isPublished) throw notFound("Business page not found");
  const [ratingSummary, pageViews, customerRequests, bookingCount] = await Promise.all([
    prisma.review.aggregate({ where: { businessId: business.id, isPublished: true }, _avg: { rating: true }, _count: { _all: true } }),
    prisma.businessEvent.count({ where: { businessId: business.id, eventType: "PAGE_VIEW" } }),
    prisma.customerRequest.count({ where: { businessId: business.id } }),
    prisma.booking.count({ where: { businessId: business.id, status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] } } }),
    prisma.businessEvent.create({ data: { businessId: business.id, eventType: "PAGE_VIEW" } }),
  ]);
  const {
    ownerId: _ownerId,
    onboardingStep: _onboardingStep,
    onboardingCompletedAt: _onboardingCompletedAt,
    canPublishProducts: _canPublishProducts,
    productAccessExpiresAt: _productAccessExpiresAt,
    isBlocked: _isBlocked,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    requestTemplates,
    ...publicFields
  } = business;
  const capabilities = effectiveCapabilities(business.capabilities);
  const canProducts = capabilities.has("products");
  const canServices = capabilities.has("services");
  const canAppointments = capabilities.has("appointments");
  const canRequests = capabilities.has("service_requests") || capabilities.has("contact_form");
  const canReviews = capabilities.has("reviews");
  return success(response, {
    ...publicFields,
    products: canProducts ? business.products : [],
    services: canServices ? business.services : [],
    offers: canProducts || canServices ? business.offers : [],
    reviews: canReviews ? business.reviews : [],
    bookingSettings: canAppointments ? business.bookingSettings : null,
    availabilityWindows: canAppointments ? business.availabilityWindows : [],
    capabilities: [...capabilities],
    profileDetails: publicProfileDetails(business.industryKey, business.profileData),
    rating: canReviews ? Math.round((ratingSummary._avg.rating ?? 0) * 10) / 10 : 0,
    reviewCount: canReviews ? ratingSummary._count._all : 0,
    stats: { pageViews, customerRequests, bookings: bookingCount },
    requestTemplate: canRequests ? requestTemplates[0] ?? null : null,
  });
});

export const getPublicBusinessBrand = asyncHandler(async (request, response) => {
  const business = await prisma.business.findFirst({
    where: { slug: getParam(request, "slug"), isBlocked: false, isPublished: true },
    select: { name: true, logoUrl: true, coverImageUrl: true, category: true, industryKey: true, subtype: true, capabilities: true, city: true, country: true, tagline: true, address: true, phone: true, whatsapp: true, email: true, description: true },
  });
  if (!business) throw notFound("Business page not found");
  return success(response, { ...business, capabilities: [...effectiveCapabilities(business.capabilities)] });
});

export const listPublicBusinesses = asyncHandler(async (_request, response) => {
  const records = await prisma.business.findMany({
    where: { isPublished: true, isBlocked: false },
    select: { id: true, name: true, slug: true, category: true, industryKey: true, subtype: true, capabilities: true, logoUrl: true, coverImageUrl: true },
    orderBy: { name: "asc" },
    take: 30,
  });
  return success(response, records);
});

export const getRequestTemplate = asyncHandler(async (request, response) => {
  const business = await prisma.business.findFirst({
    where: { slug: getParam(request, "slug"), isBlocked: false },
    select: { id: true, isPublished: true, capabilities: true },
  });
  if (!business?.isPublished) throw notFound("Business page not found");
  const capabilities = effectiveCapabilities(business.capabilities);
  if (!capabilities.has("service_requests") && !capabilities.has("contact_form")) throw notFound("Request form not available");
  const template = await prisma.requestTemplate.findFirst({
    where: { businessId: business.id, isActive: true },
    include: { questions: { orderBy: { sortOrder: "asc" } } },
  });
  if (!template) throw notFound("Request template not configured");
  const services = capabilities.has("services") ? await prisma.service.findMany({
    where: { businessId: business.id, isPublished: true },
    select: { id: true, name: true, description: true, startingPrice: true, currency: true, duration: true, imageUrl: true },
    orderBy: { sortOrder: "asc" },
  }) : [];
  const products = capabilities.has("products") ? await prisma.product.findMany({
    where: { businessId: business.id, isPublished: true, isAvailable: true },
    select: { id: true, name: true, description: true, price: true, currency: true, imageUrl: true },
    orderBy: { sortOrder: "asc" },
  }) : [];
  return success(response, { ...template, services, products });
});

export const getBusinessRequestTemplate = asyncHandler(async (request, response) => {
  const businessId = await ownedBusinessId(request);
  const template = await prisma.requestTemplate.findFirst({
    where: { businessId, isActive: true },
    include: { questions: { orderBy: { sortOrder: "asc" } } },
  });
  if (!template) throw notFound("Request template not configured");
  return success(response, template);
});

export const saveRequestTemplate = asyncHandler(async (request, response) => {
  const input = templateSchema.parse(request.body);
  const businessId = await ownedBusinessId(request);
  const template = await prisma.$transaction(async (transaction) => {
    const previous = await transaction.requestTemplate.findFirst({ where: { businessId, isActive: true } });
    if (previous) {
      await transaction.requestTemplate.update({ where: { id: previous.id }, data: { isActive: false } });
    }
    return transaction.requestTemplate.create({
      data: {
        businessId,
        name: input.name,
        businessType: input.businessType,
        questions: { create: input.questions.map(({ id: _id, ...question }) => ({ ...question, options: question.options ?? Prisma.JsonNull })) },
      },
      include: { questions: { orderBy: { sortOrder: "asc" } } },
    });
  });
  return success(response, template, 201);
});

export const listProducts = asyncHandler(async (request, response) => {
  const businessId = getParam(request, "businessId");
  const records = await prisma.product.findMany({ where: { businessId }, orderBy: { sortOrder: "asc" } });
  return success(response, records);
});

export const createProduct = asyncHandler(async (request, response) => {
  const input = productSchema.parse(request.body);
  const businessId = getParam(request, "businessId");
  const business = await prisma.business.findUnique({ where: { id: businessId }, select: { canPublishProducts: true, productAccessExpiresAt: true } });
  if (!business) throw notFound("Business not found");
  const hasAccess = business.canPublishProducts && business.productAccessExpiresAt && business.productAccessExpiresAt > new Date();
  const count = await prisma.product.count({ where: { businessId } });
  if (count >= 50) throw badRequest("Your plan includes up to 50 products. Remove a catalog item or contact support to discuss a larger plan.");
  const product = await prisma.product.create({ data: { ...input, isPublished: Boolean(hasAccess && input.isPublished), businessId, price: new Prisma.Decimal(input.price), description: input.description ?? "", category: input.category ?? "" } });
  return success(response, product, 201);
});

export const getProduct = asyncHandler(async (request, response) => {
  const product = await prisma.product.findUnique({ where: { id: getParam(request, "id") } });
  if (!product) throw notFound("Product not found");
  return success(response, product);
});

export const updateProduct = asyncHandler(async (request, response) => {
  const input = productSchema.partial().parse(request.body);
  if (input.isPublished === true) {
    const product = await prisma.product.findUnique({ where: { id: getParam(request, "id") }, select: { businessId: true } });
    if (!product) throw notFound("Product not found");
    const business = await prisma.business.findUnique({ where: { id: product.businessId }, select: { canPublishProducts: true, productAccessExpiresAt: true } });
    if (!business?.canPublishProducts || !business.productAccessExpiresAt || business.productAccessExpiresAt <= new Date()) throw forbidden("An active paid plan and administrator approval are required to publish products. Visit Billing to submit your payment details.");
  }
  const product = await prisma.product.update({ where: { id: getParam(request, "id") }, data: input.price === undefined ? input : { ...input, price: new Prisma.Decimal(input.price) } });
  return success(response, product);
});

export const deleteProduct = asyncHandler(async (request, response) => {
  await prisma.product.delete({ where: { id: getParam(request, "id") } });
  return response.status(204).end();
});

export const publishProduct = asyncHandler(async (request, response) => {
  const id = getParam(request, "id");
  const publish = getParam(request, "state") === "publish";
  if (publish) {
    const product = await prisma.product.findUnique({ where: { id }, select: { businessId: true } });
    if (!product) throw notFound("Product not found");
    const business = await prisma.business.findUnique({ where: { id: product.businessId }, select: { canPublishProducts: true, productAccessExpiresAt: true } });
    if (!business?.canPublishProducts || !business.productAccessExpiresAt || business.productAccessExpiresAt <= new Date()) throw forbidden("An active paid plan and administrator approval are required to publish products. Visit Billing to submit your payment details.");
  }
  const product = await prisma.product.update({ where: { id }, data: { isPublished: publish } });
  return success(response, product);
});

export const listServices = asyncHandler(async (request, response) => {
  return success(response, await prisma.service.findMany({ where: { businessId: getParam(request, "businessId") }, orderBy: { sortOrder: "asc" } }));
});

export const createService = asyncHandler(async (request, response) => {
  const input = serviceSchema.parse(request.body);
  const businessId = getParam(request, "businessId");
  if (input.isBookable && !input.durationMinutes) throw badRequest("Add an appointment duration before enabling online booking for this service.");
  const hasAccess = await hasActiveCatalogPlan(businessId);
  return success(response, await prisma.service.create({
    data: { ...input, isPublished: hasAccess && input.isPublished !== false, businessId, startingPrice: new Prisma.Decimal(input.startingPrice ?? 0), description: input.description ?? "", category: input.category ?? "" },
  }), 201);
});

export const getService = asyncHandler(async (request, response) => {
  const record = await prisma.service.findUnique({ where: { id: getParam(request, "id") } });
  if (!record) throw notFound("Service not found");
  return success(response, record);
});

export const updateService = asyncHandler(async (request, response) => {
  const input = serviceSchema.partial().parse(request.body);
  const id = getParam(request, "id");
  const service = await prisma.service.findUnique({ where: { id }, select: { businessId: true, durationMinutes: true, isBookable: true } });
  if (!service) throw notFound("Service not found");
  if (input.isPublished === true && !await hasActiveCatalogPlan(service.businessId)) throw forbidden("An active publishing plan is required to publish services. Visit Billing to activate a plan.");
  const nextBookable = input.isBookable ?? service.isBookable;
  const nextDuration = input.durationMinutes === undefined ? service.durationMinutes : input.durationMinutes;
  if (nextBookable && !nextDuration) throw badRequest("Add an appointment duration before enabling online booking for this service.");
  return success(response, await prisma.service.update({
    where: { id },
    data: input.startingPrice === undefined ? input : { ...input, startingPrice: new Prisma.Decimal(input.startingPrice) },
  }));
});

export const deleteService = asyncHandler(async (request, response) => {
  const id = getParam(request, "id");
  const bookings = await prisma.booking.count({ where: { serviceId: id } });
  if (bookings) throw badRequest("This service has bookings. Disable online booking instead of deleting it.");
  await prisma.service.delete({ where: { id } });
  return response.status(204).end();
});

export const publishService = asyncHandler(async (request, response) => {
  const id = getParam(request, "id");
  const publish = getParam(request, "state") === "publish";
  if (publish) {
    const service = await prisma.service.findUnique({ where: { id }, select: { businessId: true } });
    if (!service) throw notFound("Service not found");
    if (!await hasActiveCatalogPlan(service.businessId)) throw forbidden("An active publishing plan is required to publish services. Visit Billing to activate a plan.");
  }
  return success(response, await prisma.service.update({ where: { id }, data: { isPublished: publish } }));
});

export const listOffers = asyncHandler(async (request, response) => {
  return success(response, await prisma.offer.findMany({ where: { businessId: getParam(request, "businessId") }, orderBy: { startsAt: "desc" } }));
});

export const createOffer = asyncHandler(async (request, response) => {
  const input = offerSchema.parse(request.body);
  return success(response, await prisma.offer.create({
    data: { ...input, businessId: getParam(request, "businessId"), discountValue: new Prisma.Decimal(input.discountValue), description: input.description ?? "" },
  }), 201);
});

export const updateOffer = asyncHandler(async (request, response) => {
  const input = offerUpdateSchema.parse(request.body);
  return success(response, await prisma.offer.update({
    where: { id: getParam(request, "id") },
    data: input.discountValue === undefined ? input : { ...input, discountValue: new Prisma.Decimal(input.discountValue) },
  }));
});

export const deleteOffer = asyncHandler(async (request, response) => {
  await prisma.offer.delete({ where: { id: getParam(request, "id") } });
  return response.status(204).end();
});

export const publishOffer = asyncHandler(async (request, response) => {
  return success(response, await prisma.offer.update({ where: { id: getParam(request, "id") }, data: { isActive: getParam(request, "state") === "activate" } }));
});

export const uploadFile = asyncHandler(async (request, response) => {
  if (!request.file) throw badRequest("Choose a file to upload");
  const url = await storageService.save(request.file);
  return success(response, { url }, 201);
});
