/**
 * Formats an Invoice's `sequenceNumber` (a plain autoincrementing int) as a
 * human-readable invoice number — e.g. `INV-000123`. Pure formatting, no
 * dependency on Prisma types, safe to import from either a Server or
 * Client Component.
 */
export function formatInvoiceNumber(sequenceNumber: number): string {
  return `INV-${sequenceNumber.toString().padStart(6, "0")}`;
}
