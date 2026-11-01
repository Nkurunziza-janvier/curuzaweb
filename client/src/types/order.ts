export type OrderStatus = "PENDING" | "CONFIRMED" | "PROCESSING" | "READY" | "COMPLETED" | "CANCELLED";
export type OrderPaymentStatus = "UNPAID" | "PENDING" | "PAID" | "REFUNDED";
export type FulfillmentType = "PICKUP" | "DELIVERY";
export type PaymentProvider = "MANUAL" | "CASH" | "MOBILE_MONEY" | "CARD";
export type PaymentRecordStatus = "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "REFUNDED";

export interface OrderPayment {
  id: string;
  provider: PaymentProvider;
  status: PaymentRecordStatus;
  amount: number | string;
  currency: string;
  reference: string;
  payerPhone: string | null;
  instructions: string;
  note: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  productId: string | null;
  name: string;
  imageUrl: string | null;
  unitPrice: number | string;
  quantity: number;
  lineTotal: number | string;
}

export interface PublicOrder {
  id: string;
  orderNumber: string;
  publicToken: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  fulfillment: FulfillmentType;
  deliveryAddress: string | null;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  customerNote: string;
  subtotal: number | string;
  total: number | string;
  currency: string;
  items: OrderItem[];
  payments: OrderPayment[];
  business: {
    id: string;
    name: string;
    slug: string;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    country: string;
    logoUrl: string | null;
  };
  demoMode: boolean;
  canCancel: boolean;
  createdAt: string;
  confirmedAt: string | null;
  readyAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
}

export interface OrderSummary {
  pending: number;
  confirmed: number;
  processing: number;
  ready: number;
  completed: number;
  cancelled: number;
  unpaid: number;
  paidOrders: number;
  paidValue: number;
}
