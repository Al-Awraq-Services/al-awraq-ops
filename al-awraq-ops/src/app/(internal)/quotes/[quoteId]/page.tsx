import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import {
  updateQuoteAction,
  addQuoteItemAction,
  updateQuoteItemAction,
  removeQuoteItemAction,
} from "@/actions/quotes";
import { QuoteForm } from "@/components/forms/QuoteForm";
import { QuoteItemForm } from "@/components/forms/QuoteItemForm";
import type { QuoteStatus } from "@/generated/prisma/enums";
import { formatInvoiceNumber } from "@/lib/ui/invoiceNumber";
import {
  pageWrap,
  pageTitle,
  cardClass,
  sectionTitle,
  badgeClass,
  mutedText,
  linkDanger,
  btnPrimary,
} from "@/lib/ui/classNames";

const STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  APPROVED: "Approved",
};

const STATUS_BADGE_TONE: Record<QuoteStatus, "neutral" | "blue" | "green"> = {
  DRAFT: "neutral",
  SENT: "blue",
  APPROVED: "green",
};

/**
 * Admin + Staff only. Editable at every status *except* Approved — see the
 * Quote model comment in schema.prisma and `requireQuoteEditable`
 * (src/actions/quotes.ts) for why the invoicing pass (2026-09-13) ended
 * Quote's earlier "no lock at any status" precedent. Once Approved, this
 * page renders a read-only summary instead of the form/item-editor below
 * (same pattern as an archived Customer or a deactivated Service), and a
 * "View Invoice" button appears next to the status badge — the "button on
 * the side" the developer asked for; there is no Job screen to put it
 * beside yet (see docs/OPEN_DECISIONS.md), so it sits here instead.
 */
export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  await requireRole(["ADMIN", "STAFF"]);

  const { quoteId } = await params;
  const [quote, customers, leads, services] = await Promise.all([
    db.quote.findUnique({
      where: { id: quoteId },
      include: {
        items: { orderBy: { createdAt: "asc" } },
        customer: true,
        lead: true,
        invoice: true,
      },
    }),
    db.customer.findMany({ orderBy: { name: "asc" } }),
    db.lead.findMany({ orderBy: { createdAt: "desc" } }),
    db.service.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!quote) notFound();

  const total = quote.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice.toNumber(),
    0,
  );
  const isApproved = quote.status === "APPROVED";

  return (
    <main className={pageWrap}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className={pageTitle}>Quote</h1>
          <span className={badgeClass(STATUS_BADGE_TONE[quote.status])}>
            {STATUS_LABELS[quote.status]}
          </span>
        </div>
        {quote.invoice && (
          <Link href={`/invoices/${quote.invoice.id}`} className={btnPrimary}>
            View invoice — {formatInvoiceNumber(quote.invoice.sequenceNumber)}
          </Link>
        )}
      </div>

      {isApproved ? (
        <div className={cardClass}>
          <p className={`${mutedText} mb-4`}>
            This quote is approved and invoiced — read-only. Fields below
            reflect its final values.
          </p>
          <dl className="text-sm flex flex-col gap-3">
            <div>
              <dt className={mutedText}>Customer</dt>
              <dd className="text-neutral-900">{quote.customer.name}</dd>
            </div>
            <div>
              <dt className={mutedText}>Originating lead</dt>
              <dd className="text-neutral-900">
                {quote.lead?.description ?? "No lead linked"}
              </dd>
            </div>
            <div>
              <dt className={mutedText}>Notes</dt>
              <dd className="text-neutral-900">{quote.notes ?? "—"}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <div className={cardClass}>
          <QuoteForm
            key={`${quote.customerId}|${quote.leadId}|${quote.notes}|${quote.status}`}
            action={updateQuoteAction.bind(null, quote.id)}
            customers={customers}
            leads={leads}
            defaultValues={{
              customerId: quote.customerId,
              leadId: quote.leadId,
              notes: quote.notes,
              status: quote.status,
            }}
            includeStatus
            submitLabel="Save changes"
          />
        </div>
      )}

      <div className={`${cardClass} flex flex-col gap-4`}>
        <h2 className={sectionTitle}>Line items</h2>

        {quote.items.length === 0 && (
          <p className={mutedText}>No line items yet.</p>
        )}

        {quote.items.length > 0 && (
          <ul className="flex flex-col divide-y divide-neutral-100 -mx-5 px-5">
            {quote.items.map((item) =>
              isApproved ? (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-3 text-sm first:pt-0"
                >
                  <span className="text-neutral-900">{item.description}</span>
                  <span className={mutedText}>
                    {item.quantity} × AED {item.unitPrice.toString()}
                  </span>
                </li>
              ) : (
                <li key={item.id} className="flex items-start gap-3 py-3 first:pt-0">
                  <div className="flex-1">
                    <QuoteItemForm
                      key={`${item.description}|${item.quantity}|${item.unitPrice}|${item.serviceId}`}
                      action={updateQuoteItemAction.bind(null, quote.id, item.id)}
                      services={services}
                      defaultValues={{
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice.toString(),
                        serviceId: item.serviceId,
                      }}
                      submitLabel="Save"
                    />
                  </div>
                  <form
                    action={removeQuoteItemAction.bind(null, quote.id, item.id)}
                    className="pt-1.5"
                  >
                    <button type="submit" className={linkDanger}>
                      Remove
                    </button>
                  </form>
                </li>
              ),
            )}
          </ul>
        )}

        {!isApproved && (
          <div className="border-t border-neutral-100 pt-4">
            <h3 className={`${mutedText} font-medium mb-2`}>Add a line</h3>
            <QuoteItemForm
              key={quote.items.length}
              action={addQuoteItemAction.bind(null, quote.id)}
              services={services}
              submitLabel="Add line"
            />
          </div>
        )}

        <div className="flex justify-end border-t border-neutral-100 pt-4">
          <p className="text-base font-semibold text-neutral-900">
            Total: AED {total.toFixed(2)}
          </p>
        </div>
      </div>
    </main>
  );
}
