-- AlterEnum
ALTER TYPE "LeadSource" ADD VALUE 'WEBSITE';

-- DropForeignKey
ALTER TABLE "leads" DROP CONSTRAINT "leads_createdByUserId_fkey";

-- AlterTable
ALTER TABLE "leads" ALTER COLUMN "createdByUserId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
