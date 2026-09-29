import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { markInvoicePaidAction } from "@/actions/invoices";
import { formatInvoiceNumber } from "@/lib/ui/invoiceNumber";
import {
  pageWrap,
  pageTitle,
  pageSubtitle,
  cardClass,
  sectionTitle,
  badgeClass,
  mutedText,
  link,
  btnPrimary,
} from "@/lib/ui/classNames";

/**
 * Admin + Staff only. Read-only except for the one "Mark as paid" action —
 * an Invoice and its InvoiceItem lines have no edit path anywhere in this
 * codebase, deliberately (see the InvoiceItem model comment in
 * schema.prisma): an invoice is a historical record of what a Quote looked
 * like the moment it was Approved, not a live-editable document.
 */
export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  await requireRole(["ADMIN", "STAFF"]);

  const { invoiceId } = await params;
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      customer: true,
      quote: true,
      createdBy: true,
      items: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!invoice) notFound();

  const total = invoice.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice.toNumber(),
    0,
  );
  const isPaid = invoice.status === "PAID";

  return (
    <main className={pageWrap}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <h1 className={pageTitle}>{formatInvoiceNumber(invoice.sequenceNumber)}</h1>
            <span className={badgeClass(isPaid ? "green" : "neutral")}>
              {isPaid ? "Paid" : "Unpaid"}
            </span>
          </div>
          <p className={pageSubtitle}>
            Issued {invoice.createdAt.toISOString().slice(0, 10)} by{" "}
            {invoice.createdBy.name} · from{" "}
            <Link href={`/quotes/${invoice.quoteId}`} className={link}>
              this quote
            </Link>
          </p>
        </div>
        {!isPaid && (
          <form action={markInvoicePaidAction.bind(null, invoice.id)}>
            <button type="submit" className={btnPrimary}>
              Mark as paid
            </button>
          </form>
        )}
      </div>

      <div className={cardClass}>
        <h2 className={`${sectionTitle} mb-4`}>Bill to</h2>
        <dl className="text-sm flex flex-col gap-2">
          <div>
            <dt className={mutedText}>Name</dt>
            <dd className="text-neutral-900">{invoice.customer.name}</dd>
          </div>
          <div>
            <dt className={mutedText}>Phone</dt>
            <dd className="text-neutral-900">{invoice.customer.phone}</dd>
          </div>
          {invoice.customer.email && (
            <div>
              <dt className={mutedText}>Email</dt>
              <dd className="text-neutral-900">{invoice.customer.email}</dd>
            </div>
          )}
          {invoice.customer.address && (
            <div>
              <dt className={mutedText}>Address</dt>
              <dd className="text-neutral-900">{invoice.customer.address}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className={`${cardClass} flex flex-col gap-4`}>
        <h2 className={sectionTitle}>Line items</h2>
        <ul className="flex flex-col divide-y divide-neutral-100 -mx-5 px-5">
          {invoice.items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 py-3 text-sm first:pt-0"
            >
              <span className="text-neutral-900">{item.description}</span>
              <span className="text-neutral-600 shrink-0">
                {item.quantity} × AED {item.unitPrice.toString()} = AED{" "}
                {(item.quantity * item.unitPrice.toNumber()).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex justify-end border-t border-neutral-100 pt-4">
          <p className="text-lg font-semibold text-neutral-900">
            Total: AED {total.toFixed(2)}
          </p>
        </div>
      </div>
    </main>
  );
}
