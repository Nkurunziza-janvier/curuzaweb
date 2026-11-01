-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "capabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'RWF',
ADD COLUMN     "industryKey" TEXT NOT NULL DEFAULT 'other',
ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "profileData" JSONB,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "socialLinks" JSONB,
ADD COLUMN     "subtype" TEXT NOT NULL DEFAULT 'general',
ADD COLUMN     "websiteUrl" TEXT;
