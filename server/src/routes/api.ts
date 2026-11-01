import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import multer from "multer";
import { AppError } from "../utils/errors.js";
import * as analytics from "../controllers/analyticsController.js";
import * as auth from "../controllers/authController.js";
import * as admin from "../controllers/adminController.js";
import * as billing from "../controllers/billingController.js";
import * as booking from "../controllers/bookingController.js";
import * as business from "../controllers/businessController.js";
import * as customer from "../controllers/customerController.js";
import * as dashboard from "../controllers/dashboardController.js";
import * as order from "../controllers/orderController.js";
import * as quote from "../controllers/quoteController.js";
import * as request from "../controllers/requestController.js";
import { authenticate, requireAdmin, requireBusinessOwner } from "../middleware/auth.js";
import { requireOwnedBusiness } from "../middleware/ownership.js";
import { requireOwnedResource } from "../middleware/resourceOwnership.js";
import { validate } from "../middleware/validate.js";
import { adminBusinessUpdateSchema, businessIdParamSchema, idParamSchema, loginSchema, orderPaymentParamSchema, paymentReferenceParamSchema, publicBookingTokenParamSchema, publicOrderTokenParamSchema, publicQuoteTokenParamSchema, registerSchema, requestIdParamSchema, requestNumberParamSchema, requestStatusQuerySchema, reviewPublishSchema, slugParamSchema } from "../validators/schemas.js";

const router = Router();
const rateLimitHandler = (_request: import("express").Request, response: import("express").Response) =>
  response.status(429).json({ success: false, error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." } });
const publicRequestLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: "draft-8", legacyHeaders: false, handler: rateLimitHandler });
const publicBookingLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: "draft-8", legacyHeaders: false, handler: rateLimitHandler });
const publicOrderLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: "draft-8", legacyHeaders: false, handler: rateLimitHandler });
const publicPaymentLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false, handler: rateLimitHandler });
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false, handler: rateLimitHandler });
const publicAvailabilityLimit = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false, handler: rateLimitHandler });
const publicEventLimit = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: "draft-8", legacyHeaders: false, handler: rateLimitHandler });
const uploadLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false, handler: rateLimitHandler });
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype)) return callback(new AppError(400, "INVALID_FILE_TYPE", "Only JPEG, PNG, WebP, and GIF image files are allowed"));
    callback(null, true);
  },
});

router.get("/health", (_request, response) => response.json({ success: true, data: { status: "ok" } }));

router.post("/auth/register", authLimit, validate(registerSchema), auth.register);
router.post("/auth/login", authLimit, validate(loginSchema), auth.login);
router.get("/auth/me", authenticate, auth.me);
router.get("/notifications", authenticate, billing.getNotifications);
router.patch("/notifications/read", authenticate, billing.markNotificationsRead);

router.post("/uploads", authenticate, requireBusinessOwner, uploadLimit, upload.single("file"), business.uploadFile);
router.get("/public/business-catalog", business.getBusinessCatalog);
router.get("/public/businesses", business.listPublicBusinesses);
router.get("/public/businesses/:slug/brand", validate(slugParamSchema, "params"), business.getPublicBusinessBrand);
router.get("/public/businesses/:slug/request-template", validate(slugParamSchema, "params"), business.getRequestTemplate);
router.get("/public/businesses/:slug/reviews", validate(slugParamSchema, "params"), analytics.getReviews);
router.get("/public/businesses/:slug/bookings/availability", publicAvailabilityLimit, validate(slugParamSchema, "params"), booking.getPublicAvailability);
router.post("/public/businesses/:slug/bookings", publicBookingLimit, validate(slugParamSchema, "params"), booking.createPublicBooking);
router.get("/public/businesses/:slug", validate(slugParamSchema, "params"), business.getPublicBusiness);
router.post("/public/businesses/:slug/requests", publicRequestLimit, validate(slugParamSchema, "params"), request.createPublicRequest);
router.post("/public/businesses/:slug/events", publicEventLimit, validate(slugParamSchema, "params"), analytics.createPublicEvent);
router.get("/public/requests/:requestNumber", validate(requestNumberParamSchema, "params"), request.getPublicRequest);
router.get("/public/quotes/:publicToken", publicEventLimit, validate(publicQuoteTokenParamSchema, "params"), quote.getPublicQuote);
router.post("/public/quotes/:publicToken/accept", publicEventLimit, validate(publicQuoteTokenParamSchema, "params"), quote.acceptQuote);
router.post("/public/quotes/:publicToken/reject", publicEventLimit, validate(publicQuoteTokenParamSchema, "params"), quote.rejectQuote);
router.post("/public/quotes/:publicToken/request-changes", publicEventLimit, validate(publicQuoteTokenParamSchema, "params"), quote.requestQuoteChanges);
router.post("/public/quotes/:publicToken/messages", publicEventLimit, validate(publicQuoteTokenParamSchema, "params"), quote.createPublicQuoteMessage);
router.get("/public/bookings/:publicToken", publicEventLimit, validate(publicBookingTokenParamSchema, "params"), booking.getPublicBooking);
router.post("/public/bookings/:publicToken/cancel", publicEventLimit, validate(publicBookingTokenParamSchema, "params"), booking.cancelPublicBooking);
router.post("/public/bookings/:publicToken/reviews", publicEventLimit, validate(publicBookingTokenParamSchema, "params"), booking.createPublicBookingReview);
router.post("/public/businesses/:slug/orders", publicOrderLimit, validate(slugParamSchema, "params"), order.createPublicOrder);
router.get("/public/orders/:publicToken", publicEventLimit, validate(publicOrderTokenParamSchema, "params"), order.getPublicOrder);
router.post("/public/orders/:publicToken/cancel", publicEventLimit, validate(publicOrderTokenParamSchema, "params"), order.cancelPublicOrder);
router.post("/public/orders/:publicToken/payments", publicPaymentLimit, validate(publicOrderTokenParamSchema, "params"), order.initiatePublicOrderPayment);
router.post("/public/payments/:reference/confirm", publicPaymentLimit, validate(paymentReferenceParamSchema, "params"), order.confirmPublicOrderPayment);

router.use(authenticate, requireBusinessOwner);
router.get("/billing", billing.getBilling);
router.post("/billing/checkout", billing.checkout);
router.post("/billing/payments", billing.submitPayment);
router.get("/businesses", business.listBusinesses);
router.post("/businesses", business.createBusiness);
router.get("/businesses/:businessId", validate(businessIdParamSchema, "params"), requireOwnedBusiness, business.getBusiness);
router.get("/businesses/:businessId/profile-completion", validate(businessIdParamSchema, "params"), requireOwnedBusiness, business.getProfileCompletion);
router.get("/businesses/:businessId/workspace-summary", validate(businessIdParamSchema, "params"), requireOwnedBusiness, dashboard.getWorkspaceSummary);
router.get("/businesses/:businessId/customers", validate(businessIdParamSchema, "params"), requireOwnedBusiness, customer.listBusinessCustomers);
router.get("/businesses/:businessId/reviews", validate(businessIdParamSchema, "params"), requireOwnedBusiness, customer.listBusinessReviews);
router.patch("/reviews/:id", validate(idParamSchema, "params"), requireOwnedResource("review"), validate(reviewPublishSchema), customer.setReviewPublished);
router.patch("/businesses/:businessId", validate(businessIdParamSchema, "params"), requireOwnedBusiness, business.updateBusiness);
router.delete("/businesses/:businessId", validate(businessIdParamSchema, "params"), requireOwnedBusiness, business.deleteBusiness);
router.post("/businesses/:businessId/publish", validate(businessIdParamSchema, "params"), requireOwnedBusiness, (request, response, next) => { request.params.state = "publish"; next(); }, business.setBusinessPublished);
router.post("/businesses/:businessId/unpublish", validate(businessIdParamSchema, "params"), requireOwnedBusiness, (request, response, next) => { request.params.state = "unpublish"; next(); }, business.setBusinessPublished);

router.get("/businesses/:businessId/request-template", validate(businessIdParamSchema, "params"), requireOwnedBusiness, business.getBusinessRequestTemplate);
router.put("/businesses/:businessId/request-template", validate(businessIdParamSchema, "params"), requireOwnedBusiness, business.saveRequestTemplate);

router.get("/businesses/:businessId/products", validate(businessIdParamSchema, "params"), requireOwnedBusiness, business.listProducts);
router.post("/businesses/:businessId/products", validate(businessIdParamSchema, "params"), requireOwnedBusiness, business.createProduct);
router.get("/products/:id", validate(idParamSchema, "params"), requireOwnedResource("product"), business.getProduct);
router.patch("/products/:id", validate(idParamSchema, "params"), requireOwnedResource("product"), business.updateProduct);
router.delete("/products/:id", validate(idParamSchema, "params"), requireOwnedResource("product"), business.deleteProduct);
router.post("/products/:id/publish", validate(idParamSchema, "params"), requireOwnedResource("product"), (request, response, next) => { request.params.state = "publish"; next(); }, business.publishProduct);
router.post("/products/:id/unpublish", validate(idParamSchema, "params"), requireOwnedResource("product"), (request, response, next) => { request.params.state = "unpublish"; next(); }, business.publishProduct);

router.get("/businesses/:businessId/services", validate(businessIdParamSchema, "params"), requireOwnedBusiness, business.listServices);
router.post("/businesses/:businessId/services", validate(businessIdParamSchema, "params"), requireOwnedBusiness, business.createService);
router.get("/services/:id", validate(idParamSchema, "params"), requireOwnedResource("service"), business.getService);
router.patch("/services/:id", validate(idParamSchema, "params"), requireOwnedResource("service"), business.updateService);
router.delete("/services/:id", validate(idParamSchema, "params"), requireOwnedResource("service"), business.deleteService);
router.post("/services/:id/publish", validate(idParamSchema, "params"), requireOwnedResource("service"), (request, response, next) => { request.params.state = "publish"; next(); }, business.publishService);
router.post("/services/:id/unpublish", validate(idParamSchema, "params"), requireOwnedResource("service"), (request, response, next) => { request.params.state = "unpublish"; next(); }, business.publishService);

router.get("/businesses/:businessId/booking-settings", validate(businessIdParamSchema, "params"), requireOwnedBusiness, booking.getBookingSettings);
router.patch("/businesses/:businessId/booking-settings", validate(businessIdParamSchema, "params"), requireOwnedBusiness, booking.updateBookingSettings);
router.put("/businesses/:businessId/availability", validate(businessIdParamSchema, "params"), requireOwnedBusiness, booking.replaceAvailabilityWindows);
router.post("/businesses/:businessId/availability-blocks", validate(businessIdParamSchema, "params"), requireOwnedBusiness, booking.createAvailabilityBlock);
router.delete("/businesses/:businessId/availability-blocks/:id", validate(businessIdParamSchema, "params"), validate(idParamSchema, "params"), requireOwnedBusiness, booking.deleteAvailabilityBlock);
router.get("/businesses/:businessId/bookings/summary", validate(businessIdParamSchema, "params"), requireOwnedBusiness, booking.getBookingSummary);
router.get("/businesses/:businessId/bookings", validate(businessIdParamSchema, "params"), requireOwnedBusiness, booking.listBusinessBookings);
router.get("/bookings/:id", validate(idParamSchema, "params"), requireOwnedResource("booking"), booking.getBooking);
router.patch("/bookings/:id/status", validate(idParamSchema, "params"), requireOwnedResource("booking"), booking.updateBookingStatus);
router.patch("/bookings/:id/schedule", validate(idParamSchema, "params"), requireOwnedResource("booking"), booking.rescheduleBooking);
router.patch("/bookings/:id/note", validate(idParamSchema, "params"), requireOwnedResource("booking"), booking.updateBookingNote);

router.get("/businesses/:businessId/orders/summary", validate(businessIdParamSchema, "params"), requireOwnedBusiness, order.getOrderSummary);
router.get("/businesses/:businessId/orders", validate(businessIdParamSchema, "params"), requireOwnedBusiness, order.listBusinessOrders);
router.get("/orders/:id", validate(idParamSchema, "params"), requireOwnedResource("order"), order.getBusinessOrder);
router.patch("/orders/:id/status", validate(idParamSchema, "params"), requireOwnedResource("order"), order.updateOrderStatus);
router.post("/orders/:id/mark-paid", validate(idParamSchema, "params"), requireOwnedResource("order"), order.markOrderPaid);
router.patch("/orders/:orderId/payments/:paymentId", validate(orderPaymentParamSchema, "params"), requireOwnedResource("order"), order.reviewOrderPayment);

router.get("/businesses/:businessId/offers", validate(businessIdParamSchema, "params"), requireOwnedBusiness, business.listOffers);
router.post("/businesses/:businessId/offers", validate(businessIdParamSchema, "params"), requireOwnedBusiness, business.createOffer);
router.patch("/offers/:id", validate(idParamSchema, "params"), requireOwnedResource("offer"), business.updateOffer);
router.delete("/offers/:id", validate(idParamSchema, "params"), requireOwnedResource("offer"), business.deleteOffer);
router.post("/offers/:id/activate", validate(idParamSchema, "params"), requireOwnedResource("offer"), (request, response, next) => { request.params.state = "activate"; next(); }, business.publishOffer);
router.post("/offers/:id/deactivate", validate(idParamSchema, "params"), requireOwnedResource("offer"), (request, response, next) => { request.params.state = "deactivate"; next(); }, business.publishOffer);

router.get("/businesses/:businessId/requests", validate(businessIdParamSchema, "params"), validate(requestStatusQuerySchema, "query"), requireOwnedBusiness, request.listRequests);
router.get("/requests/:id", validate(idParamSchema, "params"), request.getRequest);
router.patch("/requests/:id/status", validate(idParamSchema, "params"), request.updateRequestStatus);
router.get("/businesses/:businessId/quotes/summary", validate(businessIdParamSchema, "params"), requireOwnedBusiness, quote.quoteSummary);
router.get("/businesses/:businessId/quotes", validate(businessIdParamSchema, "params"), requireOwnedBusiness, quote.listQuotes);
router.post("/requests/:requestId/quotes", validate(requestIdParamSchema, "params"), quote.createQuote);
router.get("/quotes/:id", validate(idParamSchema, "params"), requireOwnedResource("quote"), quote.getQuote);
router.patch("/quotes/:id", validate(idParamSchema, "params"), requireOwnedResource("quote"), quote.updateQuote);
router.post("/quotes/:id/send", validate(idParamSchema, "params"), requireOwnedResource("quote"), quote.sendQuote);
router.post("/quotes/:id/cancel", validate(idParamSchema, "params"), requireOwnedResource("quote"), quote.cancelQuote);
router.post("/quotes/:id/messages", validate(idParamSchema, "params"), requireOwnedResource("quote"), quote.createBusinessQuoteMessage);
router.get("/businesses/:businessId/analytics", validate(businessIdParamSchema, "params"), requireOwnedBusiness, analytics.getAnalytics);
router.get("/businesses/:businessId/analytics/events", validate(businessIdParamSchema, "params"), requireOwnedBusiness, analytics.getAnalyticsEvents);

router.get("/admin/health", requireAdmin, (_request, response) => response.json({ success: true, data: { status: "ok" } }));
router.get("/admin/overview", requireAdmin, admin.getOverview);
router.get("/admin/payments", requireAdmin, billing.listPayments);
router.post("/admin/payments/:paymentId/review", requireAdmin, billing.reviewPayment);
router.get("/admin/businesses", requireAdmin, admin.listBusinesses);
router.patch("/admin/businesses/:businessId", requireAdmin, validate(businessIdParamSchema, "params"), validate(adminBusinessUpdateSchema), admin.updateBusiness);
router.delete("/admin/businesses/:businessId", requireAdmin, validate(businessIdParamSchema, "params"), admin.deleteBusiness);
router.get("/admin/audit-log", requireAdmin, admin.listAuditLog);

export default router;
