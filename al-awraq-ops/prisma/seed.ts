/**
 * One-time bootstrap: creates the first Admin account.
 *
 * Run via `npm run db:seed` (or `npx prisma db seed`), never automatically
 * against any environment that already has an Admin — this script checks
 * for one first and exits without changes if it finds one.
 *
 * Consistent with every other account creation path in this app: the new
 * Admin gets an unusable password hash and a one-time setup token, printed
 * once to the console. Nobody, including this script, ever sets or knows
 * a real password directly.
 */
import { db } from "../src/lib/db";
import { hash as argon2Hash } from "@node-rs/argon2";
import { randomBytes, createHash } from "node:crypto";

const SETUP_TOKEN_LIFETIME_MS = 60 * 60 * 1000; // 1 hour

/**
 * Duplicated from src/lib/auth/password.ts and src/lib/auth/tokens.ts,
 * deliberately, rather than imported. Both of those files are guarded by
 * `import "server-only"` — a real, load-bearing guard that stops their
 * native/crypto code from ever being pulled into a browser bundle (see the
 * Phase B bug writeup in docs/HANDOVER_LOG.md). That guard only works
 * inside Next.js's build pipeline; this seed script runs standalone under
 * `tsx`, which the guard can't distinguish from a browser context, so it
 * throws unconditionally. Rather than weaken the guard (which protects real
 * app code) or route the app through an unguarded module, this script
 * keeps its own minimal copies of just the three functions it needs. If
 * these ever drift from the guarded originals, that's a sign this file
 * needs another look — not a reason to import the guarded modules directly.
 */
async function unusablePasswordHash(): Promise<string> {
  return argon2Hash(randomBytes(32).toString("hex"));
}
function generateRawToken(): string {
  return randomBytes(32).toString("hex");
}
function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

async function main() {
  const existingAdmin = await db.user.findFirst({ where: { role: "ADMIN" } });
  if (existingAdmin) {
    console.log(
      `An Admin account already exists (${existingAdmin.email}). Nothing to do.`,
    );
    return;
  }

  const name = process.env.SEED_ADMIN_NAME?.trim() || "Admin";
  const email = process.env.SEED_ADMIN_EMAIL?.trim();
  if (!email) {
    throw new Error(
      "SEED_ADMIN_EMAIL is not set. Add it to your .env before running the seed script — see .env.example.",
    );
  }

  const passwordHash = await unusablePasswordHash();
  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);

  const admin = await db.user.create({
    data: { name, email, role: "ADMIN", passwordHash },
  });

  // Self-issued at bootstrap — there is no other Admin to issue it. Every
  // later token issuance goes through issueResetTokenAction instead.
  await db.passwordResetToken.create({
    data: {
      userId: admin.id,
      tokenHash,
      expiresAt: new Date(Date.now() + SETUP_TOKEN_LIFETIME_MS),
      issuedById: admin.id,
    },
  });

  await db.auditLog.create({
    data: {
      actorUserId: admin.id,
      action: "USER_CREATED",
      targetType: "User",
      targetId: admin.id,
      metadata: { email: admin.email, role: admin.role, source: "seed" },
    },
  });

  console.log("First Admin account created:", admin.email);
  console.log("Set the initial password at (valid for 1 hour):");
  console.log(`  http://localhost:3000/reset-password?token=${rawToken}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
