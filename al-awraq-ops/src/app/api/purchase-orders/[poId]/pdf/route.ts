import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentUser, userHasPermission } from "@/lib/auth/appAuth";
import { db } from "@/lib/db";
import {
  PurchaseOrderDocument,
  type BusinessProfilePlain,
  type PurchaseOrderItemPlain,
  type PurchaseOrderPlain,
} from "@/lib/pdf/PurchaseOrderDocument";

/**
 * Serves a generated PDF for a single purchase order. Covered by
 * src/proxy.ts (unauthenticated requests are redirected to /login before
 * this handler runs), but we re-check here as defense in depth — this is
 * a file-download endpoint, so an unauthenticated or under-permissioned
 * hit gets a 401/403, not a redirect. Mirrors
 * src/app/api/invoices/[invoiceId]/pdf/route.ts.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ poId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!userHasPermission(user, "canViewPurchaseOrders")) {
    return new Response("Forbidden", { status: 403 });
  }

  const { poId } = await params;

  const purchaseOrder = await db.purchaseOrder.findUnique({
    where: { id: poId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  if (!purchaseOrder) {
    return new Response("Not found", { status: 404 });
  }

  const businessProfile = await db.businessProfile.findUnique({
    where: { id: "singleton" },
  });

  if (!businessProfile) {
    return new Response("Business profile not configured", { status: 500 });
  }

  const items: PurchaseOrderItemPlain[] = purchaseOrder.items.map((item) => ({
    id: item.id,
    description: item.description,
    quantity: Number(item.quantity),
    unit: item.unit,
    unitPrice: Number(item.unitPrice),
    sortOrder: item.sortOrder,
  }));

  const purchaseOrderPlain: PurchaseOrderPlain = {
    id: purchaseOrder.id,
    poNumber: purchaseOrder.poNumber,
    orderDate: purchaseOrder.orderDate,
    expectedDate: purchaseOrder.expectedDate,
    vendorId: purchaseOrder.vendorId,
    billingVendorName: purchaseOrder.billingVendorName,
    billingVendorAddress: purchaseOrder.billingVendorAddress,
    billingVendorContact: purchaseOrder.billingVendorContact,
    notes: purchaseOrder.notes,
    taxRatePercent: Number(purchaseOrder.taxRatePercent),
    discountAmount:
      purchaseOrder.discountAmount === null ? null : Number(purchaseOrder.discountAmount),
    shipmentAmount:
      purchaseOrder.shipmentAmount === null ? null : Number(purchaseOrder.shipmentAmount),
    amountPaid: Number(purchaseOrder.amountPaid),
    items,
  };

  const businessProfilePlain: BusinessProfilePlain = {
    id: businessProfile.id,
    legalName: businessProfile.legalName,
    trn: businessProfile.trn,
    address: businessProfile.address,
    phone: businessProfile.phone,
    email: businessProfile.email,
    website: businessProfile.website,
    logoUrl: businessProfile.logoUrl,
  };

  const buffer = await renderToBuffer(
    PurchaseOrderDocument({
      purchaseOrder: purchaseOrderPlain,
      businessProfile: businessProfilePlain,
    }),
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${purchaseOrder.poNumber}.pdf"`,
    },
  });
}
