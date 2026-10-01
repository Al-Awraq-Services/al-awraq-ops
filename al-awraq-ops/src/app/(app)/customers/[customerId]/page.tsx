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
  pageTitle,
  pageSubtitle,
  sectionTitle,
  cardClass,
  tableWrap,
  table,
  thClass,
  tdClass,
  trHover,
  link,
  badgeClass,
  mutedText,
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

  const statusTone = (status: string): "green" | "blue" | "red" =>
    status === "PAID" ? "green" : status === "PARTIAL" ? "blue" : "red";

  return (
    <main className={pageWrap}>
      <div>
        <Link href="/customers" className={link}>
          ← Back to customers
        </Link>
        <div className="flex items-center gap-2 mt-2">
          <h1 className={pageTitle}>{customer.name}</h1>
          {customer.type === "BUSINESS" && <span className={badgeClass("blue")}>Business</span>}
        </div>
        {customer.type === "BUSINESS" && customer.companyName && (
          <p className={mutedText}>{customer.companyName}</p>
        )}
        <p className={pageSubtitle}>
          Customer since{" "}
          {customer.createdAt.toLocaleDateString("en-AE", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
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

      <div className={`${cardClass} max-w-xl`}>
        <h2 className={`${sectionTitle} mb-4`}>Details</h2>
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
          <dl className="flex flex-col gap-2 text-sm">
            {customer.type === "BUSINESS" && (
              <>
                {customer.companyName && (
                  <div>
                    <dt className={mutedText}>Company name</dt>
                    <dd>{customer.companyName}</dd>
                  </div>
                )}
                {customer.businessTrn && (
                  <div>
                    <dt className={mutedText}>Business TRN</dt>
                    <dd>{customer.businessTrn}</dd>
                  </div>
                )}
                {customer.contactPerson && (
                  <div>
                    <dt className={mutedText}>Contact person</dt>
                    <dd>{customer.contactPerson}</dd>
                  </div>
                )}
              </>
            )}
            <div>
              <dt className={mutedText}>Address</dt>
              <dd>{customer.address || "—"}</dd>
            </div>
            <div>
              <dt className={mutedText}>Contact</dt>
              <dd>{customer.contact || "—"}</dd>
            </div>
            {customer.email && (
              <div>
                <dt className={mutedText}>Email</dt>
                <dd>{customer.email}</dd>
              </div>
            )}
            {customer.notes && (
              <div>
                <dt className={mutedText}>Notes</dt>
                <dd>{customer.notes}</dd>
              </div>
            )}
          </dl>
        )}
      </div>

      <div>
        <h2 className={`${sectionTitle} mb-3`}>Invoices</h2>
        {invoiceRows.length === 0 ? (
          <p className={mutedText}>No invoices for this customer yet.</p>
        ) : (
          <div className={tableWrap}>
            <table className={table}>
              <thead>
                <tr>
                  <th className={thClass}>Number</th>
                  <th className={thClass}>Date</th>
                  <th className={thClass}>Total</th>
                  <th className={thClass}>Balance</th>
                  <th className={thClass}>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoiceRows.map((row) => (
                  <tr key={row.id} className={trHover}>
                    <td className={tdClass}>
                      <Link href={`/invoices/${row.id}`} className={link}>
                        {row.invoiceNumber}
                      </Link>
                    </td>
                    <td className={tdClass}>
                      {row.invoiceDate.toLocaleDateString("en-AE", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className={tdClass}>AED {formatMoney(row.grandTotal)}</td>
                    <td className={tdClass}>AED {formatMoney(row.balanceDue)}</td>
                    <td className={tdClass}>
                      <span className={badgeClass(statusTone(row.status))}>{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(user.isMainAccount || user.canViewInquiries) && (
        <div>
          <h2 className={`${sectionTitle} mb-3`}>Inquiries</h2>
          {inquiryRows.length === 0 ? (
            <p className={mutedText}>No inquiries for this customer yet.</p>
          ) : (
            <div className={tableWrap}>
              <table className={table}>
                <thead>
                  <tr>
                    <th className={thClass}>Number</th>
                    <th className={thClass}>Date</th>
                    <th className={thClass}>Total</th>
                    <th className={thClass}>Balance</th>
                    <th className={thClass}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inquiryRows.map((row) => (
                    <tr key={row.id} className={trHover}>
                      <td className={tdClass}>
                        <Link href={`/inquiries/${row.id}`} className={link}>
                          {row.inquiryNumber}
                        </Link>
                      </td>
                      <td className={tdClass}>
                        {row.inquiryDate.toLocaleDateString("en-AE", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className={tdClass}>AED {formatMoney(row.grandTotal)}</td>
                      <td className={tdClass}>AED {formatMoney(row.balanceDue)}</td>
                      <td className={tdClass}>
                        <span className={badgeClass(statusTone(row.status))}>{row.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {canManage && (
        <div className={cardClass}>
          <h2 className={`${sectionTitle} mb-3`}>Danger zone</h2>
          <p className={`${mutedText} mb-3`}>
            A customer with existing invoices or inquiries cannot be deleted.
          </p>
          <DeleteCustomerButton customerId={customer.id} />
        </div>
      )}
    </main>
  );
}
