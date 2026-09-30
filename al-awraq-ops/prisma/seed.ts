/**
 * One-time bootstrap: creates the singleton BusinessProfile row, pre-filled
 * with the real company details already visible on the owner's existing
 * invoice template, so Settings isn't blank on first run.
 *
 * `passwordHash` is deliberately left null — the app's one-time "Set your
 * password" screen (src/app/(app)/login/page.tsx) fills it in on first
 * visit. Nobody, including this script, sets a real password directly.
 *
 * Safe to re-run: does nothing if the singleton row already exists.
 */
import { db } from "../src/lib/db";

async function main() {
  const existing = await db.businessProfile.findUnique({
    where: { id: "singleton" },
  });
  if (existing) {
    console.log("BusinessProfile already seeded. Nothing to do.");
    return;
  }

  await db.businessProfile.create({
    data: {
      id: "singleton",
      legalName: "AL AWRAQ TECHNICAL SERVICES EST.",
      trn: "104041465600003",
      address: "Hor Al Anz Dubai UAE.",
      phone: "971564015003",
      email: "alawraqtech@gmail.com",
      website: "www.alawraqservices.com",
      logoUrl: "/logo.jpg",
      defaultTaxRatePercent: 5,
      nextInvoiceNumber: 1064,
      invoiceNumberPrefix: "",
      invoiceNumberPadding: 5,
      passwordHash: null,
    },
  });

  console.log("BusinessProfile seeded. Visit /login to set the app password.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
