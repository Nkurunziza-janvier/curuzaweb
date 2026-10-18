CREATE TYPE "SubscriptionPaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "Business" ADD COLUMN "productAccessExpiresAt" TIMESTAMP(3);
ALTER TABLE "Product" ALTER COLUMN "isPublished" SET DEFAULT false;

CREATE TABLE "SubscriptionPayment" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "planCode" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RWF',
    "paymentMethod" TEXT NOT NULL DEFAULT 'MOBILE_MONEY',
    "payerPhone" TEXT NOT NULL,
    "transactionReference" TEXT NOT NULL,
    "status" "SubscriptionPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "validUntil" TIMESTAMP(3),
    "reviewedById" TEXT,
    CONSTRAINT "SubscriptionPayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "forAdmins" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubscriptionPayment_transactionReference_key" ON "SubscriptionPayment"("transactionReference");
CREATE INDEX "SubscriptionPayment_status_submittedAt_idx" ON "SubscriptionPayment"("status", "submittedAt");
CREATE INDEX "SubscriptionPayment_businessId_submittedAt_idx" ON "SubscriptionPayment"("businessId", "submittedAt");
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");
CREATE INDEX "Notification_forAdmins_readAt_createdAt_idx" ON "Notification"("forAdmins", "readAt", "createdAt");
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
