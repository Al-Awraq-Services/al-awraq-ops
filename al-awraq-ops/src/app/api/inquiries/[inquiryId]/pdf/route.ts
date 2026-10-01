import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentUser, userHasPermission } from "@/lib/auth/appAuth";
import { db } from "@/lib/db";
import {
  InquiryDocument,
  type BusinessProfilePlain,
  type InquiryItemPlain,
  type InquiryPlain,
} from "@/lib/pdf/InquiryDocument";

/**
 * Serves a generated PDF for a single inquiry. Covered by src/proxy.ts
 * (unauthenticated requests are redirected to /login before this handler
 * runs), but we re-check here as defense in depth — this is a file-download
 * endpoint, so an unauthenticated or under-permissioned hit gets a 401/403,
 * not a redirect.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ inquiryId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!userHasPermission(user, "canViewInquiries")) {
    return new Response("Forbidden", { status: 403 });
  }

  const { inquiryId } = await params;

  const inquiry = await db.inquiry.findUnique({
    where: { id: inquiryId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  if (!inquiry) {
    return new Response("Not found", { status: 404 });
  }

  const businessProfile = await db.businessProfile.findUnique({
    where: { id: "singleton" },
  });

  if (!businessProfile) {
    return new Response("Business profile not configured", { status: 500 });
  }

  const items: InquiryItemPlain[] = inquiry.items.map((item) => ({
    id: item.id,
    description: item.description,
    quantity: Number(item.quantity),
    unit: item.unit,
    unitPrice: Number(item.unitPrice),
    retentionAmount: item.retentionAmount === null ? null : Number(item.retentionAmount),
    sortOrder: item.sortOrder,
  }));

  const inquiryPlain: InquiryPlain = {
    id: inquiry.id,
    inquiryNumber: inquiry.inquiryNumber,
    inquiryDate: inquiry.inquiryDate,
    dueDate: inquiry.dueDate,
    poNumber: inquiry.poNumber,
    paymentMethod: inquiry.paymentMethod,
    salesperson: inquiry.salesperson,
    customerId: inquiry.customerId,
    billingName: inquiry.billingName,
    billingAddress: inquiry.billingAddress,
    billingContact: inquiry.billingContact,
    billingCompanyName: inquiry.billingCompanyName,
    billingBusinessTrn: inquiry.billingBusinessTrn,
    notes: inquiry.notes,
    taxRatePercent: Number(inquiry.taxRatePercent),
    discountAmount: inquiry.discountAmount === null ? null : Number(inquiry.discountAmount),
    shipmentAmount: inquiry.shipmentAmount === null ? null : Number(inquiry.shipmentAmount),
    stampDutyAmount:
      inquiry.stampDutyAmount === null ? null : Number(inquiry.stampDutyAmount),
    amountPaid: Number(inquiry.amountPaid),
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
    nextInquiryNumber: businessProfile.nextInquiryNumber,
    inquiryNumberPrefix: businessProfile.inquiryNumberPrefix,
    inquiryNumberPadding: businessProfile.inquiryNumberPadding,
  };

  const buffer = await renderToBuffer(
    InquiryDocument({ inquiry: inquiryPlain, businessProfile: businessProfilePlain }),
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${inquiry.inquiryNumber}.pdf"`,
    },
  });
}
