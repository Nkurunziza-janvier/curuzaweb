import { DiscountType, EventType, QuestionType, RequestStatus } from "@prisma/client";
import { z } from "zod";

const imageUrlSchema = z.union([
  z.url(),
  z.string().regex(/^\/uploads\/[A-Za-z0-9._-]+$/),
]).nullable().optional();

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email(),
  password: z.string().min(8).max(128),
  businessName: z.string().trim().min(2).max(120),
  category: z.string().trim().max(80).optional(),
});

export const loginSchema = z.object({ email: z.email(), password: z.string().min(1).max(128) });

export const businessSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().max(5000).optional(),
  tagline: z.string().trim().max(180).optional(),
  highlights: z.array(z.string().trim().min(1).max(100)).max(8).optional(),
  category: z.string().trim().max(80).optional(),
  logoUrl: imageUrlSchema,
  coverImageUrl: imageUrlSchema,
  phone: z.string().max(40).nullable().optional(),
  whatsapp: z.string().max(40).nullable().optional(),
  email: z.email().nullable().optional(),
  address: z.string().max(250).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  country: z.string().max(100).optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  openingHours: z.record(z.string(), z.unknown()).nullable().optional(),
  // 13 marks completion after the final publish step in the onboarding flow.
  onboardingStep: z.number().int().min(0).max(13).optional(),
});

export const adminBusinessUpdateSchema = z.object({
  isPublished: z.boolean().optional(),
  canPublishProducts: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
}).refine((input) => input.isPublished !== undefined || input.canPublishProducts !== undefined || input.isBlocked !== undefined, {
  message: "Choose at least one business setting to update",
});

export const subscriptionPaymentSchema = z.object({
  planCode: z.enum(["MONTHLY", "YEARLY"]),
  payerPhone: z.string().trim().min(9).max(30),
  transactionReference: z.string().trim().min(4).max(100),
});

export const checkoutSchema = z.object({ planCode: z.enum(["MONTHLY", "YEARLY"]) });

export const productSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().max(2000).optional(),
  price: z.coerce.number().finite().min(0).max(9999999999),
  currency: z.string().length(3).default("RWF"),
  imageUrl: imageUrlSchema,
  category: z.string().max(100).optional(),
  isAvailable: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const serviceSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().max(2000).optional(),
  startingPrice: z.coerce.number().finite().min(0).max(9999999999).optional(),
  currency: z.string().length(3).default("RWF"),
  duration: z.string().max(100).nullable().optional(),
  imageUrl: imageUrlSchema,
  category: z.string().max(100).optional(),
  customRequestEnabled: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const offerFields = {
  title: z.string().trim().min(1).max(160),
  description: z.string().max(2000).optional(),
  discountType: z.nativeEnum(DiscountType),
  discountValue: z.coerce.number().finite().positive().max(9999999999),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  isActive: z.boolean().optional(),
};

export const offerSchema = z.object(offerFields)
  .refine((offer) => offer.endsAt > offer.startsAt, { path: ["endsAt"], message: "End date must be after the start date" })
  .refine((offer) => offer.discountType !== DiscountType.PERCENTAGE || offer.discountValue <= 100, { path: ["discountValue"], message: "Percentage discount cannot exceed 100" });

export const questionSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(1).max(200),
  type: z.nativeEnum(QuestionType),
  required: z.boolean().default(false),
  options: z.array(z.string().max(120)).optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export const templateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  businessType: z.string().trim().min(1).max(80),
  questions: z.array(questionSchema).max(40),
});

export const customerRequestSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.email().optional().or(z.literal("")),
  customerPhone: z.string().max(40).optional(),
  customerWhatsapp: z.string().max(40).optional(),
  requestType: z.string().trim().min(1).max(120),
  description: z.string().max(5000).optional(),
  orderNote: z.string().max(2000).optional(),
  orderItems: z.array(z.object({ productId: z.string().uuid(), quantity: z.coerce.number().int().min(1).max(1000) })).max(50).optional(),
  location: z.string().max(250).optional(),
  preferredDate: z.coerce.date().optional(),
  budget: z.coerce.number().finite().min(0).max(9999999999).optional(),
  answers: z.record(z.string(), z.unknown()).default({}),
});

export const requestStatusSchema = z.object({ status: z.nativeEnum(RequestStatus) });

const quoteItemSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().max(1000).optional(),
  quantity: z.coerce.number().finite().positive().max(1000000),
  unitPrice: z.coerce.number().finite().min(0).max(9999999999),
  sortOrder: z.number().int().min(0).optional(),
});

const quoteFields = {
  items: z.array(quoteItemSchema).min(1).max(100),
  discount: z.coerce.number().finite().min(0).max(9999999999).default(0),
  discountType: z.nativeEnum(DiscountType).default(DiscountType.FIXED),
  currency: z.string().length(3).default("RWF"),
  validityDays: z.number().int().min(1).max(365).default(7),
  notes: z.string().max(5000).optional(),
  estimatedCompletionDate: z.coerce.date().nullable().optional(),
  paymentTerms: z.string().max(3000).optional(),
  depositAmount: z.coerce.number().finite().min(0).max(9999999999).default(0),
};

export const quoteSchema = z.object(quoteFields).superRefine((quote, context) => {
  if (quote.discountType === DiscountType.PERCENTAGE && quote.discount > 100) {
    context.addIssue({ code: "custom", path: ["discount"], message: "Percentage discount cannot exceed 100" });
  }
});

export const offerUpdateSchema = z.object({
  title: offerFields.title.optional(),
  description: offerFields.description,
  discountType: offerFields.discountType.optional(),
  discountValue: offerFields.discountValue.optional(),
  startsAt: offerFields.startsAt.optional(),
  endsAt: offerFields.endsAt.optional(),
  isActive: offerFields.isActive,
}).refine((offer) => offer.endsAt === undefined || offer.startsAt === undefined || offer.endsAt > offer.startsAt, { path: ["endsAt"], message: "End date must be after the start date" })
  .refine((offer) => offer.discountType !== DiscountType.PERCENTAGE || offer.discountValue === undefined || offer.discountValue <= 100, { path: ["discountValue"], message: "Percentage discount cannot exceed 100" });

export const quoteUpdateSchema = z.object({
  items: quoteFields.items.optional(),
  discount: quoteFields.discount.optional(),
  discountType: quoteFields.discountType.optional(),
  currency: quoteFields.currency.optional(),
  validityDays: quoteFields.validityDays.optional(),
  notes: quoteFields.notes,
  estimatedCompletionDate: quoteFields.estimatedCompletionDate,
  paymentTerms: quoteFields.paymentTerms,
  depositAmount: quoteFields.depositAmount.optional(),
}).superRefine((quote, context) => {
  if (quote.discountType === DiscountType.PERCENTAGE && quote.discount !== undefined && quote.discount > 100) {
    context.addIssue({ code: "custom", path: ["discount"], message: "Percentage discount cannot exceed 100" });
  }
});
export const messageSchema = z.object({ message: z.string().trim().min(1).max(2000) });
export const eventSchema = z.object({
  eventType: z.nativeEnum(EventType).refine((type) =>
    type !== EventType.PAGE_VIEW &&
    type !== EventType.QUOTE_REQUEST &&
    type !== EventType.QUOTE_ACCEPTED &&
    type !== EventType.QUOTE_REJECTED &&
    type !== EventType.QUOTE_CREATED &&
    type !== EventType.QUOTE_SENT &&
    type !== EventType.QUOTE_VIEWED &&
    type !== EventType.QUOTE_CHANGE_REQUESTED &&
    type !== EventType.QUOTE_EXPIRED,
  "This event is recorded by the server"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export const idParamSchema = z.object({ id: z.string().uuid() });
export const businessIdParamSchema = z.object({ businessId: z.string().uuid() });
export const requestIdParamSchema = z.object({ requestId: z.string().uuid() });
export const slugParamSchema = z.object({ slug: z.string().min(1).max(180) });
export const requestNumberParamSchema = z.object({ requestNumber: z.string().regex(/^REQ-\d{6}$/) });
export const publicQuoteTokenParamSchema = z.object({ publicToken: z.string().regex(/^[A-Za-z0-9_-]{32,100}$/) });
export const requestStatusQuerySchema = z.object({ status: z.nativeEnum(RequestStatus).optional() });
