import { EventType, OrderPaymentStatus, OrderStatus, PaymentProvider, PaymentRecordStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { availableCapabilityKeys } from "../config/businessCatalog.js";
import { env, paymentMode } from "../config/env.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";
import { success } from "../utils/responses.js";
import { getParam } from "../utils/requestParam.js";
import { generateReference } from "../utils/references.js";
import {
  createOrderSchema,
  orderListQuerySchema,
  orderPaymentInitSchema,
  orderPaymentReviewSchema,
  orderStatusSchema,
} from "../validators/schemas.js";

const publicOrderInclude = {
  items: { orderBy: { createdAt: "asc" as const } },
  payments: { orderBy: { createdAt: "desc" as const } },
  business: {
    select: {
      id: true,
      name: true,
      slug: true,
      phone: true,
      whatsapp: true,
      email: true,
      address: true,
      city: true,
      country: true,
      logoUrl: true,
    },
  },
} satisfies Prisma.OrderInclude;

type PublicOrderRecord = Prisma.OrderGetPayload<{ include: typeof publicOrderInclude }>;

function paymentSummary(record: PublicOrderRecord) {
  return record.payments.map((payment) => ({
    id: payment.id,
    provider: payment.provider,
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
    reference: payment.reference,
    payerPhone: payment.payerPhone,
    instructions: payment.instructions,
    note: payment.note,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
  }));
}

function publicOrder(record: PublicOrderRecord) {
  return {
    id: record.id,
    orderNumber: record.orderNumber,
    publicToken: record.publicToken,
    status: record.status,
    paymentStatus: record.paymentStatus,
    fulfillment: record.fulfillment,
    deliveryAddress: record.deliveryAddress,
    customerName: record.customerName,
    customerPhone: record.customerPhone,
    customerEmail: record.customerEmail,
    customerNote: record.customerNote,
    subtotal: record.subtotal,
    total: record.total,
    currency: record.currency,
    items: record.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.name,
      imageUrl: item.imageUrl,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
    payments: paymentSummary(record),
    business: record.business,
    demoMode: paymentMode === "DEMO",
    canCancel: ([OrderStatus.PENDING, OrderStatus.CONFIRMED] as OrderStatus[]).includes(record.status),
    createdAt: record.createdAt,
    confirmedAt: record.confirmedAt,
    readyAt: record.readyAt,
    completedAt: record.completedAt,
    cancelledAt: record.cancelledAt,
    cancellationReason: record.cancellationReason,
  };
}

async function loadPublicOrder(publicToken: string) {
  const order = await prisma.order.findUnique({ where: { publicToken }, include: publicOrderInclude });
  if (!order) throw notFound("Order not found");
  return order;
}

export const createPublicOrder = asyncHandler(async (request, response) => {
  const input = createOrderSchema.parse(request.body);
  const business = await prisma.business.findFirst({
    where: { slug: getParam(request, "slug"), isBlocked: false, isPublished: true },
    select: { id: true, name: true, ownerId: true, capabilities: true, canPublishProducts: true, productAccessExpiresAt: true },
  });
  if (!business) throw notFound("Business page not found");
  const capabilities = new Set<string>(business.capabilities.length ? business.capabilities : availableCapabilityKeys);
  if (!capabilities.has("product_orders") || !capabilities.has("products")) {
    throw badRequest("This business is not accepting online orders right now. Send a request instead.");
  }
  if (input.fulfillment === "PICKUP" && !capabilities.has("pickup")) {
    throw badRequest("This business does not offer pickup. Choose delivery or send a request instead.");
  }
  if (input.fulfillment === "DELIVERY" && !capabilities.has("delivery")) {
    throw badRequest("This business does not offer delivery. Choose pickup or send a request instead.");
  }
  if (!business.canPublishProducts || !business.productAccessExpiresAt || business.productAccessExpiresAt <= new Date()) {
    throw badRequest("This business is not accepting online orders right now. Send a request instead.");
  }

  const quantities = new Map<string, number>();
  for (const item of input.items) quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  const products = await prisma.product.findMany({
    where: { businessId: business.id, id: { in: [...quantities.keys()] }, isPublished: true, isAvailable: true },
    select: { id: true, name: true, price: true, currency: true, imageUrl: true },
  });
  if (products.length !== quantities.size) {
    throw badRequest("One or more products in your basket are no longer available. Return to the business page and refresh your basket.");
  }
  const currencies = new Set(products.map((product) => product.currency));
  if (currencies.size > 1) throw badRequest("These products cannot be ordered together because they use different currencies.");

  const items = products.map((product) => {
    const quantity = quantities.get(product.id)!;
    return {
      productId: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      unitPrice: new Prisma.Decimal(product.price),
      quantity,
      lineTotal: new Prisma.Decimal(product.price).mul(quantity),
    };
  });
  const subtotal = items.reduce((total, item) => total.add(item.lineTotal), new Prisma.Decimal(0));
  const currency = products[0]?.currency ?? "RWF";
  const orderNumber = generateReference("ORD", 6);

  const created = await prisma.$transaction(async (transaction) => {
    const order = await transaction.order.create({
      data: {
        orderNumber,
        businessId: business.id,
        customerName: input.customerName,
        customerPhone: input.customerPhone?.trim() || null,
        customerEmail: input.customerEmail?.trim() || null,
        customerNote: input.customerNote,
        fulfillment: input.fulfillment,
        deliveryAddress: input.fulfillment === "DELIVERY" ? input.deliveryAddress?.trim() || null : null,
        subtotal,
        total: subtotal,
        currency,
        items: { create: items },
      },
    });
    await transaction.businessEvent.create({
      data: {
        businessId: business.id,
        eventType: EventType.ORDER_CREATED,
        metadata: { orderNumber, itemCount: items.reduce((count, item) => count + item.quantity, 0), total: subtotal.toString() },
      },
    });
    await transaction.notification.create({
      data: {
        userId: business.ownerId,
        title: `New order: ${orderNumber}`,
        message: `${input.customerName} placed an order worth ${currency} ${subtotal.toNumber().toLocaleString()}.`,
        type: "ORDER",
        link: `/dashboard/orders`,
      },
    });
    return transaction.order.findUniqueOrThrow({ where: { id: order.id }, include: publicOrderInclude });
  });

  return success(response, publicOrder(created), 201);
});

export const getPublicOrder = asyncHandler(async (request, response) => {
  const order = await loadPublicOrder(getParam(request, "publicToken"));
  return success(response, publicOrder(order));
});

export const cancelPublicOrder = asyncHandler(async (request, response) => {
  const order = await loadPublicOrder(getParam(request, "publicToken"));
  if (!([OrderStatus.PENDING, OrderStatus.CONFIRMED] as OrderStatus[]).includes(order.status)) {
    throw badRequest("This order can no longer be cancelled online. Please contact the business directly.");
  }
  const updated = await prisma.$transaction(async (transaction) => {
    await transaction.payment.updateMany({ where: { orderId: order.id, status: PaymentRecordStatus.PENDING }, data: { status: PaymentRecordStatus.CANCELLED } });
    const result = await transaction.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.CANCELLED, cancelledAt: new Date(), cancellationReason: "Cancelled by customer", ...(order.paymentStatus === OrderPaymentStatus.PENDING ? { paymentStatus: OrderPaymentStatus.UNPAID } : {}) },
      include: publicOrderInclude,
    });
    await transaction.businessEvent.create({
      data: { businessId: order.businessId, eventType: EventType.ORDER_CANCELLED, metadata: { orderNumber: order.orderNumber, cancelledBy: "CUSTOMER" } },
    });
    return result;
  });
  return success(response, publicOrder(updated));
});

export const initiatePublicOrderPayment = asyncHandler(async (request, response) => {
  const input = orderPaymentInitSchema.parse(request.body);
  const order = await loadPublicOrder(getParam(request, "publicToken"));
  if (order.status === OrderStatus.CANCELLED) throw badRequest("This order was cancelled and cannot be paid online.");
  if (order.paymentStatus === OrderPaymentStatus.PAID) throw conflict("This order has already been paid.");
  const existing = order.payments.find((payment) => payment.status === PaymentRecordStatus.PENDING);
  if (existing) {
    return success(response, {
      payment: paymentSummary({ ...order, payments: [existing] })[0],
      demoMode: paymentMode === "DEMO",
      recipient: { name: env.PAYMENT_MOMO_NAME, number: env.PAYMENT_MOMO_NUMBER },
    });
  }
  const reference = generateReference("PAY", 8);
  const instructions = paymentMode === "DEMO"
    ? `This is a simulated payment. Use the reference ${reference} to confirm the test payment. No real money will be charged.`
    : `Send ${order.currency} ${Number(order.total).toLocaleString()} to ${env.PAYMENT_MOMO_NAME}${env.PAYMENT_MOMO_NUMBER ? ` (${env.PAYMENT_MOMO_NUMBER})` : ""} and submit the reference ${reference}. The business will verify your payment.`;
  const payment = await prisma.$transaction(async (transaction) => {
    const created = await transaction.payment.create({
      data: {
        orderId: order.id,
        provider: input.provider,
        status: PaymentRecordStatus.PENDING,
        amount: order.total,
        currency: order.currency,
        reference,
        payerPhone: input.payerPhone?.trim() || null,
        instructions,
      },
    });
    await transaction.order.update({ where: { id: order.id }, data: { paymentStatus: OrderPaymentStatus.PENDING } });
    return created;
  });
  return success(response, {
    payment: {
      id: payment.id,
      provider: payment.provider,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      reference: payment.reference,
      payerPhone: payment.payerPhone,
      instructions: payment.instructions,
      note: payment.note,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
    },
    demoMode: paymentMode === "DEMO",
    recipient: { name: env.PAYMENT_MOMO_NAME, number: env.PAYMENT_MOMO_NUMBER },
  }, 201);
});

export const confirmPublicOrderPayment = asyncHandler(async (request, response) => {
  if (paymentMode !== "DEMO") throw badRequest("Payment confirmation is handled by the business once your transfer is verified.");
  const reference = getParam(request, "reference");
  const payment = await prisma.payment.findUnique({ where: { reference }, include: { order: true } });
  if (!payment) throw notFound("Payment not found");
  if (payment.status === PaymentRecordStatus.PAID) {
    const order = await loadPublicOrder(payment.order.publicToken);
    return success(response, publicOrder(order));
  }
  if (payment.status !== PaymentRecordStatus.PENDING) throw badRequest("This payment can no longer be confirmed.");
  if (payment.order.status === OrderStatus.CANCELLED) throw badRequest("This order was cancelled.");

  const updated = await prisma.$transaction(async (transaction) => {
    await transaction.payment.update({ where: { id: payment.id }, data: { status: PaymentRecordStatus.PAID, paidAt: new Date() } });
    await transaction.order.update({ where: { id: payment.orderId }, data: { paymentStatus: OrderPaymentStatus.PAID } });
    await transaction.businessEvent.create({
      data: {
        businessId: payment.order.businessId,
        eventType: EventType.PAYMENT_RECEIVED,
        metadata: { orderNumber: payment.order.orderNumber, amount: payment.amount.toString(), reference: payment.reference, mode: "DEMO" },
      },
    });
    await transaction.notification.create({
      data: {
        userId: (await transaction.business.findUniqueOrThrow({ where: { id: payment.order.businessId }, select: { ownerId: true } })).ownerId,
        title: `Payment received: ${payment.order.orderNumber}`,
        message: `A simulated payment of ${payment.currency} ${payment.amount.toNumber().toLocaleString()} was confirmed.`,
        type: "PAYMENT",
        link: `/dashboard/orders`,
      },
    });
    return transaction.order.findUniqueOrThrow({ where: { id: payment.orderId }, include: publicOrderInclude });
  });
  return success(response, publicOrder(updated));
});

export const listBusinessOrders = asyncHandler(async (request, response) => {
  const businessId = getParam(request, "businessId");
  const input = orderListQuerySchema.parse(request.query);
  const where: Prisma.OrderWhereInput = { businessId };
  if (input.status) where.status = input.status;
  if (input.paymentStatus) where.paymentStatus = input.paymentStatus;
  if (input.search) {
    where.OR = [
      { orderNumber: { contains: input.search, mode: "insensitive" } },
      { customerName: { contains: input.search, mode: "insensitive" } },
      { customerPhone: { contains: input.search, mode: "insensitive" } },
    ];
  }
  const orders = await prisma.order.findMany({ where, include: publicOrderInclude, orderBy: { createdAt: "desc" }, take: 250 });
  return success(response, orders.map(publicOrder));
});

export const getOrderSummary = asyncHandler(async (request, response) => {
  const businessId = getParam(request, "businessId");
  const [pending, confirmed, processing, ready, completed, cancelled, unpaid, paidValue, paidOrders] = await Promise.all([
    prisma.order.count({ where: { businessId, status: OrderStatus.PENDING } }),
    prisma.order.count({ where: { businessId, status: OrderStatus.CONFIRMED } }),
    prisma.order.count({ where: { businessId, status: OrderStatus.PROCESSING } }),
    prisma.order.count({ where: { businessId, status: OrderStatus.READY } }),
    prisma.order.count({ where: { businessId, status: OrderStatus.COMPLETED } }),
    prisma.order.count({ where: { businessId, status: OrderStatus.CANCELLED } }),
    prisma.order.count({ where: { businessId, paymentStatus: { in: [OrderPaymentStatus.UNPAID, OrderPaymentStatus.PENDING] }, status: { not: OrderStatus.CANCELLED } } }),
    prisma.order.aggregate({ where: { businessId, paymentStatus: OrderPaymentStatus.PAID }, _sum: { total: true } }),
    prisma.order.count({ where: { businessId, paymentStatus: OrderPaymentStatus.PAID } }),
  ]);
  return success(response, { pending, confirmed, processing, ready, completed, cancelled, unpaid, paidOrders, paidValue: Number(paidValue._sum.total ?? 0) });
});

export const getBusinessOrder = asyncHandler(async (request, response) => {
  const order = await prisma.order.findUnique({ where: { id: getParam(request, "id") }, include: publicOrderInclude });
  if (!order) throw notFound("Order not found");
  return success(response, publicOrder(order));
});

const allowedTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.READY, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [OrderStatus.COMPLETED],
};

const statusEvents: Partial<Record<OrderStatus, EventType>> = {
  [OrderStatus.CONFIRMED]: EventType.ORDER_CONFIRMED,
  [OrderStatus.COMPLETED]: EventType.ORDER_COMPLETED,
  [OrderStatus.CANCELLED]: EventType.ORDER_CANCELLED,
};

export const updateOrderStatus = asyncHandler(async (request, response) => {
  const { status } = orderStatusSchema.parse(request.body);
  const id = getParam(request, "id");
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw notFound("Order not found");
  if (order.status === status) {
    return success(response, publicOrder(await prisma.order.findUniqueOrThrow({ where: { id }, include: publicOrderInclude })));
  }
  if (!allowedTransitions[order.status]?.includes(status)) {
    throw badRequest(`A ${order.status.toLowerCase()} order cannot be changed to ${status.toLowerCase()}.`);
  }
  const now = new Date();
  const data: Prisma.OrderUpdateInput = { status };
  if (status === OrderStatus.CONFIRMED) data.confirmedAt = now;
  if (status === OrderStatus.READY) data.readyAt = now;
  if (status === OrderStatus.COMPLETED) data.completedAt = now;
  if (status === OrderStatus.CANCELLED) {
    data.cancelledAt = now;
    if (order.paymentStatus === OrderPaymentStatus.PENDING) data.paymentStatus = OrderPaymentStatus.UNPAID;
  }
  const updated = await prisma.$transaction(async (transaction) => {
    if (status === OrderStatus.CANCELLED) {
      await transaction.payment.updateMany({ where: { orderId: id, status: PaymentRecordStatus.PENDING }, data: { status: PaymentRecordStatus.CANCELLED } });
    }
    const result = await transaction.order.update({ where: { id }, data, include: publicOrderInclude });
    const eventType = statusEvents[status];
    if (eventType) {
      await transaction.businessEvent.create({
        data: { businessId: order.businessId, eventType, metadata: { orderNumber: order.orderNumber, status } },
      });
    }
    return result;
  });
  return success(response, publicOrder(updated));
});

export const reviewOrderPayment = asyncHandler(async (request, response) => {
  const input = orderPaymentReviewSchema.parse(request.body);
  const orderId = getParam(request, "orderId");
  const paymentId = getParam(request, "paymentId");
  const payment = await prisma.payment.findFirst({ where: { id: paymentId, orderId }, include: { order: true } });
  if (!payment) throw notFound("Payment not found");
  if (payment.status === input.status) {
    return success(response, publicOrder(await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: publicOrderInclude })));
  }
  const now = new Date();
  const updated = await prisma.$transaction(async (transaction) => {
    await transaction.payment.update({
      where: { id: payment.id },
      data: { status: input.status, note: input.note?.trim() || null, paidAt: input.status === PaymentRecordStatus.PAID ? now : payment.paidAt },
    });
    if (input.status === PaymentRecordStatus.PAID) {
      await transaction.order.update({ where: { id: orderId }, data: { paymentStatus: OrderPaymentStatus.PAID } });
    } else if (input.status === PaymentRecordStatus.REFUNDED) {
      await transaction.order.update({ where: { id: orderId }, data: { paymentStatus: OrderPaymentStatus.REFUNDED } });
    } else {
      await transaction.order.update({ where: { id: orderId }, data: { paymentStatus: OrderPaymentStatus.UNPAID } });
    }
    if (input.status === PaymentRecordStatus.PAID) {
      await transaction.businessEvent.create({
        data: {
          businessId: payment.order.businessId,
          eventType: EventType.PAYMENT_RECEIVED,
          metadata: { orderNumber: payment.order.orderNumber, amount: payment.amount.toString(), reference: payment.reference, mode: "MANUAL" },
        },
      });
    }
    return transaction.order.findUniqueOrThrow({ where: { id: orderId }, include: publicOrderInclude });
  });
  return success(response, publicOrder(updated));
});

export const markOrderPaid = asyncHandler(async (request, response) => {
  const orderId = getParam(request, "id");
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, orderNumber: true, total: true, currency: true, paymentStatus: true, businessId: true, status: true } });
  if (!order) throw notFound("Order not found");
  if (order.status === OrderStatus.CANCELLED) throw badRequest("A cancelled order cannot be marked as paid.");
  if (order.paymentStatus === OrderPaymentStatus.PAID) {
    return success(response, publicOrder(await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: publicOrderInclude })));
  }
  const updated = await prisma.$transaction(async (transaction) => {
    await transaction.payment.create({
      data: {
        orderId,
        provider: PaymentProvider.MANUAL,
        status: PaymentRecordStatus.PAID,
        amount: order.total,
        currency: order.currency,
        reference: generateReference("PAY", 8),
        note: "Marked as paid by the business",
        instructions: "Recorded manually by the business.",
        paidAt: new Date(),
      },
    });
    await transaction.order.update({ where: { id: orderId }, data: { paymentStatus: OrderPaymentStatus.PAID } });
    await transaction.businessEvent.create({
      data: {
        businessId: order.businessId,
        eventType: EventType.PAYMENT_RECEIVED,
        metadata: { orderNumber: order.orderNumber, amount: order.total.toString(), mode: "MANUAL" },
      },
    });
    return transaction.order.findUniqueOrThrow({ where: { id: orderId }, include: publicOrderInclude });
  });
  return success(response, publicOrder(updated));
});
