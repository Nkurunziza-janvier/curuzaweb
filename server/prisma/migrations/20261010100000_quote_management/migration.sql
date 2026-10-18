ALTER TYPE "QuoteStatus" ADD VALUE 'CANCELLED';
ALTER TYPE "EventType" ADD VALUE 'QUOTE_CREATED';
ALTER TYPE "EventType" ADD VALUE 'QUOTE_SENT';
ALTER TYPE "EventType" ADD VALUE 'QUOTE_VIEWED';
ALTER TYPE "EventType" ADD VALUE 'QUOTE_CHANGE_REQUESTED';
ALTER TYPE "EventType" ADD VALUE 'QUOTE_EXPIRED';

ALTER TABLE "Quote"
ADD COLUMN "publicToken" TEXT,
ADD COLUMN "discountType" "DiscountType" NOT NULL DEFAULT 'FIXED',
ADD COLUMN "discountValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "estimatedCompletionDate" TIMESTAMP(3),
ADD COLUMN "paymentTerms" TEXT NOT NULL DEFAULT '',
ADD COLUMN "depositAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "sentAt" TIMESTAMP(3),
ADD COLUMN "viewedAt" TIMESTAMP(3),
ADD COLUMN "acceptedAt" TIMESTAMP(3),
ADD COLUMN "rejectedAt" TIMESTAMP(3);

UPDATE "Quote"
SET "publicToken" = md5(random()::text || clock_timestamp()::text || "id"),
    "discountValue" = "discount",
    "sentAt" = CASE
      WHEN "status" IN ('SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'CHANGE_REQUESTED', 'EXPIRED') THEN "createdAt"
      ELSE NULL
    END,
    "viewedAt" = CASE
      WHEN "status" = 'VIEWED' THEN "createdAt"
      ELSE NULL
    END,
    "acceptedAt" = CASE WHEN "status" = 'ACCEPTED' THEN "createdAt" ELSE NULL END,
    "rejectedAt" = CASE WHEN "status" = 'REJECTED' THEN "createdAt" ELSE NULL END;

ALTER TABLE "Quote" ALTER COLUMN "publicToken" SET NOT NULL;
CREATE UNIQUE INDEX "Quote_publicToken_key" ON "Quote"("publicToken");
