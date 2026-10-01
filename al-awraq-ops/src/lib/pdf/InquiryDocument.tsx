import fs from "node:fs";
import path from "node:path";
import { Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer";
import { computeInvoiceTotals, formatMoney, lineSubtotal, lineTotal } from "@/lib/invoiceMath";

/**
 * The PDF's body copy uses Helvetica (one of @react-pdf/renderer's built-in
 * standard-14 fonts) throughout, per the target layout. Helvetica only
 * covers WinAnsi/Latin glyphs though, so the Arabic Dirham currency mark
 * (د.إ) printed after every money amount would render as missing-glyph
 * boxes on that font. We register a Unicode-complete Arabic font and apply
 * it only to that currency suffix (see <Money />) so the rest of the
 * document keeps the Helvetica look the layout calls for. Registration is
 * idempotent — safe to call on every module load.
 */
const ARABIC_CURRENCY_FONT = "Noto Sans Arabic";
Font.register({
  family: ARABIC_CURRENCY_FONT,
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/notosansarabic/v33/nwpxtLGrOAZMl5nJ_wfgRg3DrWFZWsnVBJ_sS6tlqHHFlhQ5l3sQWIHPqzCfyGyvuw.ttf",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/notosansarabic/v33/nwpxtLGrOAZMl5nJ_wfgRg3DrWFZWsnVBJ_sS6tlqHHFlhQ5l3sQWIHPqzCfL2uvuw.ttf",
      fontWeight: 700,
    },
  ],
});

/**
 * Plain (Decimal-free) shapes InquiryDocument expects. Callers (the PDF
 * route handler) must Number()-convert every Prisma Decimal field before
 * constructing these — @react-pdf/renderer runs server-side, but Decimal
 * objects are not `number | string` and will break invoiceMath's helpers.
 */
export type InquiryItemPlain = {
  id: string;
  description: string;
  quantity: number;
  unit: string | null;
  unitPrice: number;
  retentionAmount: number | null;
  sortOrder: number;
};

export type InquiryPlain = {
  id: string;
  inquiryNumber: string;
  inquiryDate: Date | string;
  dueDate?: Date | string | null;
  poNumber?: string | null;
  paymentMethod?: string | null;
  salesperson?: string | null;
  customerId: string;
  billingName: string;
  billingAddress?: string | null;
  billingContact?: string | null;
  /// Buyer's own company name / TRN — distinct from the seller's own TRN
  /// already shown in the header block below (businessProfile.trn).
  billingCompanyName?: string | null;
  billingBusinessTrn?: string | null;
  notes?: string | null;
  taxRatePercent: number;
  discountAmount?: number | null;
  shipmentAmount?: number | null;
  stampDutyAmount?: number | null;
  amountPaid: number;
  items: InquiryItemPlain[];
};

export type BusinessProfilePlain = {
  id: string;
  legalName: string;
  trn?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  defaultTaxRatePercent: number;
  nextInquiryNumber: number;
  inquiryNumberPrefix: string;
  inquiryNumberPadding: number;
};

const CURRENCY = " د.إ";

function formatDate(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Resolve the bundled logo to a Buffer so @react-pdf/renderer's <Image>
 * doesn't need to re-resolve a filesystem path at render time. Read once
 * per module load; if the file is missing (e.g. a dev checkout without
 * public/logo.jpg) we simply omit the logo rather than throwing.
 */
function readLogoBuffer(): Buffer | null {
  try {
    const logoPath = path.join(process.cwd(), "public", "logo.jpg");
    return fs.readFileSync(logoPath);
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 45,
    paddingBottom: 45,
    paddingHorizontal: 45,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#111111",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  headerLeft: {
    flexDirection: "column",
  },
  logo: {
    width: 70,
    height: 70,
    objectFit: "contain",
    marginBottom: 6,
  },
  legalName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  headerLine: {
    fontSize: 9,
    marginBottom: 1,
  },
  headerRight: {
    flexDirection: "column",
    alignItems: "flex-end",
  },
  taxInvoiceTitle: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  headerRightLine: {
    fontSize: 9,
    marginBottom: 2,
    textAlign: "right",
  },
  billingSection: {
    marginBottom: 16,
  },
  billingLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginBottom: 3,
  },
  billingCompanyName: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginBottom: 1,
  },
  billingName: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginBottom: 1,
  },
  billingLine: {
    fontSize: 9,
    marginBottom: 1,
  },
  table: {
    marginTop: 4,
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#111111",
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#dddddd",
  },
  cell: {
    fontSize: 9,
  },
  colSrNo: { width: "6%", textAlign: "left" },
  colDescription: { width: "30%", textAlign: "left", paddingRight: 4 },
  colQuantity: { width: "10%", textAlign: "right" },
  colUnits: { width: "8%", textAlign: "right" },
  colUnitPrice: { width: "13%", textAlign: "right" },
  colRetention: { width: "11%", textAlign: "right" },
  colSubtotal: { width: "11%", textAlign: "right" },
  colTotal: { width: "11%", textAlign: "right" },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 18,
  },
  notesBlock: {
    maxWidth: "55%",
  },
  notesText: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  summaryBox: {
    width: 190,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  summaryRowTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 4,
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: "#111111",
  },
  summaryLabel: {
    fontSize: 9,
  },
  summaryLabelBold: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  summaryValue: {
    fontSize: 9,
    textAlign: "right",
  },
  summaryValueBold: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  currencyMark: {
    fontFamily: ARABIC_CURRENCY_FONT,
  },
  currencyMarkBold: {
    fontFamily: ARABIC_CURRENCY_FONT,
    fontWeight: 700,
  },
  thankYou: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginTop: 36,
  },
});

/**
 * Renders a formatted amount followed by the Arabic Dirham mark, splitting
 * the two into separate inline <Text> runs so the digits stay on Helvetica
 * (matching the rest of the document) while only the Arabic glyphs switch
 * to a font that actually has them.
 */
function Money({ value, bold = false }: { value: number; bold?: boolean }) {
  return (
    <Text style={bold ? styles.summaryValueBold : styles.summaryValue}>
      {formatMoney(value)}
      <Text style={bold ? styles.currencyMarkBold : styles.currencyMark}>{CURRENCY}</Text>
    </Text>
  );
}

function DescriptionCell({ description }: { description: string }) {
  const lines = description.split("\n");
  return (
    <View style={[styles.colDescription]}>
      {lines.map((line, i) => (
        <Text key={i} style={styles.cell}>
          {line}
        </Text>
      ))}
    </View>
  );
}

export function InquiryDocument({
  inquiry,
  businessProfile,
}: {
  inquiry: InquiryPlain;
  businessProfile: BusinessProfilePlain;
}) {
  const logoBuffer = readLogoBuffer();
  const totals = computeInvoiceTotals(inquiry.items, {
    taxRatePercent: inquiry.taxRatePercent,
    discountAmount: inquiry.discountAmount,
    shipmentAmount: inquiry.shipmentAmount,
    stampDutyAmount: inquiry.stampDutyAmount,
    amountPaid: inquiry.amountPaid,
  });

  const sortedItems = [...inquiry.items].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            {/* @react-pdf/renderer's Image, not an HTML <img> — no alt prop exists on this component. */}
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            {logoBuffer ? <Image src={logoBuffer} style={styles.logo} /> : null}
            <Text style={styles.legalName}>{businessProfile.legalName}</Text>
            {businessProfile.trn ? (
              <Text style={styles.headerLine}>TRN: {businessProfile.trn}</Text>
            ) : null}
            {businessProfile.address ? (
              <Text style={styles.headerLine}>{businessProfile.address}</Text>
            ) : null}
            {businessProfile.phone ? (
              <Text style={styles.headerLine}>Contact: {businessProfile.phone}</Text>
            ) : null}
            {businessProfile.email ? (
              <Text style={styles.headerLine}>Email:{businessProfile.email}</Text>
            ) : null}
            {businessProfile.website ? (
              <Text style={styles.headerLine}>Web : {businessProfile.website}</Text>
            ) : null}
          </View>
          <View style={styles.headerRight}>
            {/* This stays "Tax Invoice" — that is the real document type
                under UAE VAT law. "Inquiry" is only this app's internal
                name for the B2B workflow and never belongs on the legal
                document itself. */}
            <Text style={styles.taxInvoiceTitle}>Tax Invoice</Text>
            <Text style={styles.headerRightLine}>
              Invoice Number: {inquiry.inquiryNumber}
            </Text>
            <Text style={styles.headerRightLine}>
              Invoice Date: {formatDate(inquiry.inquiryDate)}
            </Text>
          </View>
        </View>

        {/* Billing address — UAE B2B VAT invoices conventionally print the
            buyer's own TRN alongside the seller's (shown in the header
            block above), so show the buyer's company name + TRN here when
            present. */}
        <View style={styles.billingSection}>
          <Text style={styles.billingLabel}>Billing Address</Text>
          {inquiry.billingCompanyName ? (
            <Text style={styles.billingCompanyName}>{inquiry.billingCompanyName}</Text>
          ) : null}
          <Text style={styles.billingName}>{inquiry.billingName}</Text>
          {inquiry.billingBusinessTrn ? (
            <Text style={styles.billingLine}>TRN: {inquiry.billingBusinessTrn}</Text>
          ) : null}
          {inquiry.billingAddress ? (
            <Text style={styles.billingLine}>{inquiry.billingAddress}</Text>
          ) : null}
          {inquiry.billingContact ? (
            <Text style={styles.billingLine}>Contact : {inquiry.billingContact}</Text>
          ) : null}
        </View>

        {/* Items table */}
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, styles.colSrNo]}>Sr No</Text>
            <Text style={[styles.tableHeaderCell, styles.colDescription]}>Description</Text>
            <Text style={[styles.tableHeaderCell, styles.colQuantity]}>Quantity</Text>
            <Text style={[styles.tableHeaderCell, styles.colUnits]}>Units</Text>
            <Text style={[styles.tableHeaderCell, styles.colUnitPrice]}>Unit price</Text>
            <Text style={[styles.tableHeaderCell, styles.colRetention]}>Retention</Text>
            <Text style={[styles.tableHeaderCell, styles.colSubtotal]}>Subtotal</Text>
            <Text style={[styles.tableHeaderCell, styles.colTotal]}>Total</Text>
          </View>

          {sortedItems.map((item, index) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={[styles.cell, styles.colSrNo]}>{index + 1}</Text>
              <DescriptionCell description={item.description} />
              <Text style={[styles.cell, styles.colQuantity]}>{item.quantity}</Text>
              <Text style={[styles.cell, styles.colUnits]}>{item.unit ?? ""}</Text>
              <Text style={[styles.cell, styles.colUnitPrice]}>
                {formatMoney(item.unitPrice)}
              </Text>
              <Text style={[styles.cell, styles.colRetention]}>
                {formatMoney(item.retentionAmount ?? 0)}
              </Text>
              <Text style={[styles.cell, styles.colSubtotal]}>
                {formatMoney(lineSubtotal(item))}
              </Text>
              <Text style={[styles.cell, styles.colTotal]}>
                {formatMoney(lineTotal(item, inquiry.taxRatePercent))}
              </Text>
            </View>
          ))}
        </View>

        {/* Footer: notes + summary */}
        <View style={styles.footerRow}>
          <View style={styles.notesBlock}>
            {inquiry.notes ? <Text style={styles.notesText}>{inquiry.notes}</Text> : null}
          </View>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Money value={totals.itemsSubtotal} />
            </View>
            {totals.discount !== 0 ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount</Text>
                <Money value={totals.discount} />
              </View>
            ) : null}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>VAT {inquiry.taxRatePercent}%</Text>
              <Money value={totals.taxAmount} />
            </View>
            {totals.shipment !== 0 ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Shipment</Text>
                <Money value={totals.shipment} />
              </View>
            ) : null}
            {totals.stampDuty !== 0 ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Stamp Duty</Text>
                <Money value={totals.stampDuty} />
              </View>
            ) : null}
            <View style={styles.summaryRowTotal}>
              <Text style={styles.summaryLabelBold}>Total</Text>
              <Money value={totals.grandTotal} bold />
            </View>
            {totals.amountPaid > 0 ? (
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Paid</Text>
                  <Money value={totals.amountPaid} />
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Balance Due</Text>
                  <Money value={totals.balanceDue} />
                </View>
              </>
            ) : null}
          </View>
        </View>

        <Text style={styles.thankYou}>Thank you for your business!</Text>
      </Page>
    </Document>
  );
}

export default InquiryDocument;
