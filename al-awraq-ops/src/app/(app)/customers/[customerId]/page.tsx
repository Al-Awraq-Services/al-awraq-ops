import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/appAuth";
import { updateCustomerAction } from "@/actions/customers";
import { CustomerForm } from "@/components/forms/CustomerForm";
import { DeleteCustomerButton } from "@/components/forms/DeleteCustomerButton";
import { computeInvoiceTotals, formatMoney, toNum } from "@/lib/invoiceMath";
import {
  pageWrap,
  pageHeader,
  pageTitle,
  pageSubtitle,
  eyebrow,
  backLink,
  sectionTitle,
  sectionHeader,
  hintText,
  cardClass,
  tableWrap,
  table,
  thClass,
  thNum,
  tdClass,
  tdNum,
  trHover,
  rowLink,
  badgeClass,
  statusLabel,
  emptyState,
  dlList,
  dlRow,
  dlTerm,
  dlValue,
  statGrid,
  statTile,
  statLabel,
  statValueClass,
} from "@/lib/ui/classNames";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const user = await requirePermission("canViewCustomers");
  const canManage = user.isMainAccount || user.canManageCustomers;
  const { customerId } = await params;

  const customer = await db.customer.findUnique({
    where: { id: customerId },
    include: {
      invoices: {
        include: { items: true },
        orderBy: { invoiceDate: "desc" },
      },
      inquiries: {
        include: { items: true },
        orderBy: { inquiryDate: "desc" },
      },
    },
  });

  if (!customer) {
    notFound();
  }

  const invoiceRows = customer.invoices.map((invoice) => {
    const totals = computeInvoiceTotals(
      invoice.items.map((item) => ({
        quantity: toNum(item.quantity),
        unitPrice: toNum(item.unitPrice),
        retentionAmount: item.retentionAmount ? toNum(item.retentionAmount) : null,
      })),
      {
        taxRatePercent: toNum(invoice.taxRatePercent),
        discountAmount: invoice.discountAmount ? toNum(invoice.discountAmount) : null,
        shipmentAmount: invoice.shipmentAmount ? toNum(invoice.shipmentAmount) : null,
        stampDutyAmount: invoice.stampDutyAmount ? toNum(invoice.stampDutyAmount) : null,
        amountPaid: toNum(invoice.amountPaid),
      },
    );
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      grandTotal: totals.grandTotal,
      balanceDue: totals.balanceDue,
      status: totals.status,
    };
  });

  const inquiryRows = customer.inquiries.map((inquiry) => {
    const totals = computeInvoiceTotals(
      inquiry.items.map((item) => ({
        quantity: toNum(item.quantity),
        unitPrice: toNum(item.unitPrice),
        retentionAmount: item.retentionAmount ? toNum(item.retentionAmount) : null,
      })),
      {
        taxRatePercent: toNum(inquiry.taxRatePercent),
        discountAmount: inquiry.discountAmount ? toNum(inquiry.discountAmount) : null,
        shipmentAmount: inquiry.shipmentAmount ? toNum(inquiry.shipmentAmount) : null,
        stampDutyAmount: inquiry.stampDutyAmount ? toNum(inquiry.stampDutyAmount) : null,
        amountPaid: toNum(inquiry.amountPaid),
      },
    );
    return {
      id: inquiry.id,
      inquiryNumber: inquiry.inquiryNumber,
      inquiryDate: inquiry.inquiryDate,
      grandTotal: totals.grandTotal,
      balanceDue: totals.balanceDue,
      status: totals.status,
    };
  });

  const totalBalance =
    invoiceRows.reduce((sum, row) => sum + row.balanceDue, 0) +
    inquiryRows.reduce((sum, row) => sum + row.balanceDue, 0);

  const statusTone = (status: string): "green" | "amber" | "neutral" =>
    status === "PAID" ? "green" : status === "PARTIAL" ? "amber" : "neutral";

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-AE", { year: "numeric", month: "short", day: "numeric" });

  return (
    <main className={pageWrap}>
      <div className="flex flex-col gap-4">
        <Link href="/customers" className={`${backLink} self-start`}>
          ← Customers
        </Link>
        <div className={pageHeader}>
          <div>
            <p className={eyebrow}>Customer</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className={pageTitle}>{customer.name}</h1>
              {customer.type === "BUSINESS" && (
                <span className={badgeClass("blue")}>Business</span>
              )}
            </div>
            <p className={pageSubtitle}>
              {customer.type === "BUSINESS" && customer.companyName
                ? `${customer.companyName} · `
                : ""}
              Customer since {formatDate(customer.createdAt)}
            </p>
          </div>
        </div>
      </div>

      <div className={statGrid}>
        <div className={statTile}>
          <div className={statLabel}>Invoices</div>
          <div className={statValueClass()}>{invoiceRows.length}</div>
        </div>
        <div className={statTile}>
          <div className={statLabel}>Inquiries</div>
          <div className={statValueClass()}>{inquiryRows.length}</div>
        </div>
        {user.isMainAccount && (
          <div className={statTile}>
            <div className={statLabel}>Outstanding balance</div>
            <div className={statValueClass(totalBalance > 0 ? "red" : "green")}>
              AED {formatMoney(totalBalance)}
            </div>
          </div>
        )}
      </div>

      <section className={`${cardClass} max-w-2xl`}>
        <h2 className={`${sectionTitle} mb-5`}>Details</h2>
        {canManage ? (
          <CustomerForm
            mode="edit"
            action={updateCustomerAction.bind(null, customer.id)}
            defaultValues={{
              name: customer.name,
              address: customer.address ?? "",
              contact: customer.contact ?? "",
              email: customer.email ?? "",
              notes: customer.notes ?? "",
              type: customer.type,
              companyName: customer.companyName ?? "",
              businessTrn: customer.businessTrn ?? "",
              contactPerson: customer.contactPerson ?? "",
            }}
          />
        ) : (
          <dl className={dlList}>
            {customer.type === "BUSINESS" && (
              <>
                {customer.companyName && (
                  <div className={dlRow}>
                    <dt className={dlTerm}>Company name</dt>
                    <dd className={dlValue}>{customer.companyName}</dd>
                  </div>
                )}
                {customer.businessTrn && (
                  <div className={dlRow}>
                    <dt className={dlTerm}>Business TRN</dt>
                    <dd className={dlValue}>{customer.businessTrn}</dd>
                  </div>
                )}
                {customer.contactPerson && (
                  <div className={dlRow}>
                    <dt className={dlTerm}>Contact person</dt>
                    <dd className={dlValue}>{customer.contactPerson}</dd>
                  </div>
                )}
              </>
            )}
            <div className={dlRow}>
              <dt className={dlTerm}>Address</dt>
              <dd className={dlValue}>{customer.address || "—"}</dd>
            </div>
            <div className={dlRow}>
              <dt className={dlTerm}>Contact</dt>
              <dd className={dlValue}>{customer.contact || "—"}</dd>
            </div>
            {customer.email && (
              <div className={dlRow}>
                <dt className={dlTerm}>Email</dt>
                <dd className={dlValue}>{customer.email}</dd>
              </div>
            )}
            {customer.notes && (
              <div className={dlRow}>
                <dt className={dlTerm}>Notes</dt>
                <dd className={`${dlValue} whitespace-pre-line`}>{customer.notes}</dd>
              </div>
            )}
          </dl>
        )}
      </section>

      <section>
        <div className={sectionHeader}>
          <h2 className={sectionTitle}>Invoices</h2>
        </div>
        {invoiceRows.length === 0 ? (
          <div className={emptyState}>No invoices for this customer yet.</div>
        ) : (
          <div className={tableWrap}>
            <table className={table}>
              <thead>
                <tr>
                  <th className={thClass}>Number</th>
                  <th className={thClass}>Date</th>
                  <th className={thNum}>Total</th>
                  <th className={thNum}>Balance</th>
                  <th className={thClass}>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoiceRows.map((row) => (
                  <tr key={row.id} className={trHover}>
                    <td className={tdClass}>
                      <Link href={`/invoices/${row.id}`} className={rowLink}>
                        {row.invoiceNumber}
                      </Link>
                    </td>
                    <td className={tdClass}>{formatDate(row.invoiceDate)}</td>
                    <td className={tdNum}>AED {formatMoney(row.grandTotal)}</td>
                    <td className={tdNum}>AED {formatMoney(row.balanceDue)}</td>
                    <td className={tdClass}>
                      <span className={badgeClass(statusTone(row.status))}>
                        {statusLabel(row.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {(user.isMainAccount || user.canViewInquiries) && (
        <section>
          <div className={sectionHeader}>
            <h2 className={sectionTitle}>Inquiries</h2>
          </div>
          {inquiryRows.length === 0 ? (
            <div className={emptyState}>No inquiries for this customer yet.</div>
          ) : (
            <div className={tableWrap}>
              <table className={table}>
                <thead>
                  <tr>
                    <th className={thClass}>Number</th>
                    <th className={thClass}>Date</th>
                    <th className={thNum}>Total</th>
                    <th className={thNum}>Balance</th>
                    <th className={thClass}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inquiryRows.map((row) => (
                    <tr key={row.id} className={trHover}>
                      <td className={tdClass}>
                        <Link href={`/inquiries/${row.id}`} className={rowLink}>
                          {row.inquiryNumber}
                        </Link>
                      </td>
                      <td className={tdClass}>{formatDate(row.inquiryDate)}</td>
                      <td className={tdNum}>AED {formatMoney(row.grandTotal)}</td>
                      <td className={tdNum}>AED {formatMoney(row.balanceDue)}</td>
                      <td className={tdClass}>
                        <span className={badgeClass(statusTone(row.status))}>
                          {statusLabel(row.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {canManage && (
        <section
          className={`${cardClass} flex max-w-2xl flex-wrap items-center justify-between gap-4`}
        >
          <div>
            <h2 className={sectionTitle}>Delete customer</h2>
            <p className={`${hintText} mt-1`}>
              Only possible while the customer has no invoices or inquiries.
            </p>
          </div>
          <DeleteCustomerButton customerId={customer.id} />
        </section>
      )}
    </main>
  );
}
