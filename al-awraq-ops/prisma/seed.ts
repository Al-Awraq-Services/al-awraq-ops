/**
 * One-time bootstrap: creates the singleton BusinessProfile row (pre-filled
 * with the real company details already visible on the owner's existing
 * invoice template, so Settings isn't blank on first run) plus the two
 * starting accounts — the main (Admin) account and the owner's private
 * sub-account (full invoicing access, never shown aggregate money figures
 * — see docs/CHANGE_LOG.md's 2026-10-01 entry and src/lib/auth/appAuth.ts).
 *
 * Passwords are generated here and printed once — there is no self-service
 * "set your password" flow in this app; every account after these two is
 * created by the main account through /users (src/actions/users.ts).
 *
 * Safe to re-run: does nothing for whichever rows already exist.
 */
import { db } from "../src/lib/db";
import { hash as argon2Hash } from "@node-rs/argon2";
import { randomInt } from "node:crypto";

// Duplicated from src/lib/auth/appAuth.ts deliberately, not imported — that
// module is guarded by `import "server-only"`, a real guard that stops
// argon2's native binary from ever reaching a browser bundle. The guard
// only understands Next.js's build pipeline, not this script's standalone
// `tsx` execution, so it throws unconditionally here. Keeping one small
// duplicated copy is simpler and safer than weakening the guard that
// protects real app code — see the equivalent note in git history for the
// pre-pivot version of this file.
async function hashPassword(raw: string): Promise<string> {
  return argon2Hash(raw);
}

const PASSWORD_WORDS = [
  "amber", "cedar", "delta", "ember", "flint", "grove", "haven", "ivory",
  "jolt", "karst", "lumen", "maple", "nimbus", "onyx", "pearl", "quartz",
  "ridge", "sable", "talon", "umbra",
];

function generatePassword(exclude: string[]): { password: string; words: string[] } {
  const pick = (ex: string[]) => {
    let w: string;
    do {
      w = PASSWORD_WORDS[randomInt(PASSWORD_WORDS.length)];
    } while (ex.includes(w));
    return w;
  };
  const w1 = pick(exclude);
  const w2 = pick([...exclude, w1]);
  const n = randomInt(10, 99);
  const cap = (w: string) => w[0].toUpperCase() + w.slice(1);
  return { password: `${cap(w1)}-${cap(w2)}-${n}`, words: [w1, w2] };
}

async function main() {
  const profile = await db.businessProfile.findUnique({ where: { id: "singleton" } });
  if (!profile) {
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
      },
    });
    console.log("BusinessProfile seeded.");
  } else {
    console.log("BusinessProfile already exists. Skipped.");
  }

  const existingMain = await db.user.findFirst({ where: { isMainAccount: true } });
  if (existingMain) {
    console.log(`Main account already exists (${existingMain.username}). Skipped.`);
  } else {
    const admin = generatePassword([]);
    const owner = generatePassword(admin.words);

    await db.user.create({
      data: {
        name: "Admin",
        username: "admin",
        passwordHash: await hashPassword(admin.password),
        isMainAccount: true,
      },
    });
    await db.user.create({
      data: {
        name: "Owner (private)",
        username: "owner",
        passwordHash: await hashPassword(owner.password),
        isMainAccount: false,
        canViewInvoices: true,
        canManageInvoices: true,
        canViewCustomers: true,
        canManageCustomers: true,
      },
    });

    console.log("\nTwo accounts created — save these now, they are not stored anywhere in plaintext:\n");
    console.log(`  Main account    username: admin   password: ${admin.password}`);
    console.log(`  Private account username: owner   password: ${owner.password}\n`);
  }
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
