import fs from "node:fs";
import path from "node:path";
import { Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer";
import { computeInvoiceTotals, formatMoney, lineSubtotal, lineTotal } from "@/lib/invoiceMath";

/**
 * Mirrors src/lib/pdf/InvoiceDocument.tsx's @react-pdf/renderer structure
 * and styles (same header/logo block from the same BusinessProfile-shaped
 * prop, same general layout rhythm), adapted for the buying side: titled
 * "Purchase Order" rather than "Tax Invoice", the billing block is
 * labeled "Vendor" and shows the PO's snapshotted vendor details instead
 * of a customer's, the items table has no Retention column, and the
 * footer summary has no Stamp Duty line (PurchaseOrder has neither field
 * — see the task brief and prisma/schema.prisma).
 *
 * See InvoiceDocument.tsx for why the Arabic Dirham currency mark needs
 * its own registered font alongside the document's base Helvetica.
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
 * Plain (Decimal-free) shapes PurchaseOrderDocument expects. Callers (the
 * PDF route handler) must Number()-convert every Prisma Decimal field
 * before constructing these — @react-pdf/renderer runs server-side, but
 * Decimal objects are not `number | string` and will break invoiceMath's
 * helpers.
 */
export type PurchaseOrderItemPlain = {
  id: string;
  description: string;
  quantity: number;
  unit: string | null;
  unitPrice: number;
  sortOrder: number;
};

export type PurchaseOrderPlain = {
  id: string;
  poNumber: string;
  orderDate: Date | string;
  expectedDate?: Date | string | null;
  vendorId: string;
  billingVendorName: string;
  billingVendorAddress?: string | null;
  billingVendorContact?: string | null;
  notes?: string | null;
  taxRatePercent: number;
  discountAmount?: number | null;
  shipmentAmount?: number | null;
  amountPaid: number;
  items: PurchaseOrderItemPlain[];
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
  docTitle: {
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
  colDescription: { width: "35%", textAlign: "left", paddingRight: 4 },
  colQuantity: { width: "12%", textAlign: "right" },
  colUnits: { width: "10%", textAlign: "right" },
  colUnitPrice: { width: "15%", textAlign: "right" },
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
  closingLine: {
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

export function PurchaseOrderDocument({
  purchaseOrder,
  businessProfile,
}: {
  purchaseOrder: PurchaseOrderPlain;
  businessProfile: BusinessProfilePlain;
}) {
  const logoBuffer = readLogoBuffer();
  const totals = computeInvoiceTotals(purchaseOrder.items, {
    taxRatePercent: purchaseOrder.taxRatePercent,
    discountAmount: purchaseOrder.discountAmount,
    shipmentAmount: purchaseOrder.shipmentAmount,
    amountPaid: purchaseOrder.amountPaid,
  });

  const sortedItems = [...purchaseOrder.items].sort((a, b) => a.sortOrder - b.sortOrder);

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
            <Text style={styles.docTitle}>Purchase Order</Text>
            <Text style={styles.headerRightLine}>PO Number: {purchaseOrder.poNumber}</Text>
            <Text style={styles.headerRightLine}>
              Order Date: {formatDate(purchaseOrder.orderDate)}
            </Text>
            {purchaseOrder.expectedDate ? (
              <Text style={styles.headerRightLine}>
                Expected: {formatDate(purchaseOrder.expectedDate)}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Vendor */}
        <View style={styles.billingSection}>
          <Text style={styles.billingLabel}>Vendor</Text>
          <Text style={styles.billingName}>{purchaseOrder.billingVendorName}</Text>
          {purchaseOrder.billingVendorAddress ? (
            <Text style={styles.billingLine}>{purchaseOrder.billingVendorAddress}</Text>
          ) : null}
          {purchaseOrder.billingVendorContact ? (
            <Text style={styles.billingLine}>Contact : {purchaseOrder.billingVendorContact}</Text>
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
              <Text style={[styles.cell, styles.colSubtotal]}>
                {formatMoney(lineSubtotal(item))}
              </Text>
              <Text style={[styles.cell, styles.colTotal]}>
                {formatMoney(lineTotal(item, purchaseOrder.taxRatePercent))}
              </Text>
            </View>
          ))}
        </View>

        {/* Footer: notes + summary */}
        <View style={styles.footerRow}>
          <View style={styles.notesBlock}>
            {purchaseOrder.notes ? (
              <Text style={styles.notesText}>{purchaseOrder.notes}</Text>
            ) : null}
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
              <Text style={styles.summaryLabel}>VAT {purchaseOrder.taxRatePercent}%</Text>
              <Money value={totals.taxAmount} />
            </View>
            {totals.shipment !== 0 ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Shipment</Text>
                <Money value={totals.shipment} />
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

        <Text style={styles.closingLine}>Please confirm receipt of this order.</Text>
      </Page>
    </Document>
  );
}

export default PurchaseOrderDocument;
