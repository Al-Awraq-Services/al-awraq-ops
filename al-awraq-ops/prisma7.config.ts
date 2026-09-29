// Prisma CLI configuration (prisma@7.10.0).
//
// This file is read by the `prisma` CLI (generate, migrate, studio) — it is
// NOT used by the running Next.js app at runtime. The app's own database
// connection is constructed in src/lib/db.ts using a driver adapter, which
// is the pattern Prisma 7 requires (schema `datasource.url` is no longer
// supported — see prisma/schema.prisma).
//
// The CLI does not auto-load .env files the way Next.js does, so this file
// loads it explicitly via the `dotenv` package (dev dependency only).
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Runs on `prisma db seed` (and once automatically after the very
    // first `prisma migrate dev`, if the DB has no migrations applied
    // yet). Uses `tsx` rather than plain `node --experimental-strip-types`
    // — tested directly: Node's native TS stripping cannot resolve the
    // Prisma 7 generated client's internal extensionless imports
    // (`ERR_MODULE_NOT_FOUND` on `./enums`), tsx resolves them correctly.
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
