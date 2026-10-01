-- AlterTable
ALTER TABLE "business_profile" DROP COLUMN "passwordHash",
ALTER COLUMN "logoUrl" SET DEFAULT '/logo.jpg';

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isMainAccount" BOOLEAN NOT NULL DEFAULT false,
    "canViewInvoices" BOOLEAN NOT NULL DEFAULT false,
    "canManageInvoices" BOOLEAN NOT NULL DEFAULT false,
    "canViewCustomers" BOOLEAN NOT NULL DEFAULT false,
    "canManageCustomers" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

