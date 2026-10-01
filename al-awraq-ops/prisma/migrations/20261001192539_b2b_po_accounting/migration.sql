-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('INDIVIDUAL', 'BUSINESS');

-- AlterTable
ALTER TABLE "business_profile" ADD COLUMN     "inquiryNumberPadding" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "inquiryNumberPrefix" TEXT NOT NULL DEFAULT 'INQ-',
ADD COLUMN     "nextInquiryNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "nextPoNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "poNumberPadding" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "poNumberPrefix" TEXT NOT NULL DEFAULT 'PO-';

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "businessTrn" TEXT,
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "contactPerson" TEXT,
ADD COLUMN     "type" "CustomerType" NOT NULL DEFAULT 'INDIVIDUAL';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "canManageInquiries" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManagePurchaseOrders" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canViewInquiries" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canViewPurchaseOrders" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "inquiries" (
    "id" TEXT NOT NULL,
    "inquiryNumber" TEXT NOT NULL,
    "inquiryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "poNumber" TEXT,
    "paymentMethod" TEXT,
    "salesperson" TEXT,
    "customerId" TEXT NOT NULL,
    "billingName" TEXT NOT NULL,
    "billingAddress" TEXT,
    "billingContact" TEXT,
    "billingCompanyName" TEXT,
    "billingBusinessTrn" TEXT,
    "notes" TEXT DEFAULT 'This is a VAT invoice.',
    "taxRatePercent" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "discountAmount" DECIMAL(10,2),
    "shipmentAmount" DECIMAL(10,2),
    "stampDutyAmount" DECIMAL(10,2),
    "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiry_items" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "unit" TEXT,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "retentionAmount" DECIMAL(10,2),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inquiry_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "contact" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDate" TIMESTAMP(3),
    "vendorId" TEXT NOT NULL,
    "billingVendorName" TEXT NOT NULL,
    "billingVendorAddress" TEXT,
    "billingVendorContact" TEXT,
    "notes" TEXT,
    "taxRatePercent" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "discountAmount" DECIMAL(10,2),
    "shipmentAmount" DECIMAL(10,2),
    "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "unit" TEXT,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inquiries_inquiryNumber_key" ON "inquiries"("inquiryNumber");

-- CreateIndex
CREATE INDEX "inquiries_customerId_idx" ON "inquiries"("customerId");

-- CreateIndex
CREATE INDEX "inquiries_inquiryDate_idx" ON "inquiries"("inquiryDate");

-- CreateIndex
CREATE INDEX "inquiry_items_inquiryId_idx" ON "inquiry_items"("inquiryId");

-- CreateIndex
CREATE INDEX "vendors_name_idx" ON "vendors"("name");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_poNumber_key" ON "purchase_orders"("poNumber");

-- CreateIndex
CREATE INDEX "purchase_orders_vendorId_idx" ON "purchase_orders"("vendorId");

-- CreateIndex
CREATE INDEX "purchase_orders_orderDate_idx" ON "purchase_orders"("orderDate");

-- CreateIndex
CREATE INDEX "purchase_order_items_purchaseOrderId_idx" ON "purchase_order_items"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "expenses_date_idx" ON "expenses"("date");

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiry_items" ADD CONSTRAINT "inquiry_items_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "inquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

