import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentUser, userHasPermission } from "@/lib/auth/appAuth";
import { db } from "@/lib/db";
import {
  InvoiceDocument,
  type BusinessProfilePlain,
  type InvoiceItemPlain,
  type InvoicePlain,
} from "@/lib/pdf/InvoiceDocument";

/**
 * Serves a generated PDF for a single invoice. Covered by src/proxy.ts
 * (unauthenticated requests are redirected to /login before this handler
 * runs), but we re-check here as defense in depth — this is a file-download
 * endpoint, so an unauthenticated or under-permissioned hit gets a 401/403,
 * not a redirect.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!userHasPermission(user, "canViewInvoices")) {
    return new Response("Forbidden", { status: 403 });
  }

  const { invoiceId } = await params;

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  if (!invoice) {
    return new Response("Not found", { status: 404 });
  }

  const businessProfile = await db.businessProfile.findUnique({
    where: { id: "singleton" },
  });

  if (!businessProfile) {
    return new Response("Business profile not configured", { status: 500 });
  }

  const items: InvoiceItemPlain[] = invoice.items.map((item) => ({
    id: item.id,
    description: item.description,
    quantity: Number(item.quantity),
    unit: item.unit,
    unitPrice: Number(item.unitPrice),
    retentionAmount: item.retentionAmount === null ? null : Number(item.retentionAmount),
    sortOrder: item.sortOrder,
  }));

  const invoicePlain: InvoicePlain = {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    poNumber: invoice.poNumber,
    paymentMethod: invoice.paymentMethod,
    salesperson: invoice.salesperson,
    customerId: invoice.customerId,
    billingName: invoice.billingName,
    billingAddress: invoice.billingAddress,
    billingContact: invoice.billingContact,
    notes: invoice.notes,
    taxRatePercent: Number(invoice.taxRatePercent),
    discountAmount: invoice.discountAmount === null ? null : Number(invoice.discountAmount),
    shipmentAmount: invoice.shipmentAmount === null ? null : Number(invoice.shipmentAmount),
    stampDutyAmount:
      invoice.stampDutyAmount === null ? null : Number(invoice.stampDutyAmount),
    amountPaid: Number(invoice.amountPaid),
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
    defaultTaxRatePercent: Number(businessProfile.defaultTaxRatePercent),
    nextInvoiceNumber: businessProfile.nextInvoiceNumber,
    invoiceNumberPrefix: businessProfile.invoiceNumberPrefix,
    invoiceNumberPadding: businessProfile.invoiceNumberPadding,
  };

  const buffer = await renderToBuffer(
    InvoiceDocument({ invoice: invoicePlain, businessProfile: businessProfilePlain }),
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
    },
  });
}
