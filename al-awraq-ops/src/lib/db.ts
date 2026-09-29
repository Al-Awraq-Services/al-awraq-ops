import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Prisma client singleton.
 *
 * Next.js dev mode hot-reloads server modules on every file change. Without
 * caching the client on `globalThis`, each reload would open a new database
 * connection pool and eventually exhaust available connections. This is the
 * standard Prisma recommendation for Next.js.
 *
 * Prisma 7 requires an explicit driver adapter rather than reading a
 * `datasource.url` from the schema file (confirmed against the installed
 * prisma@7.10.0 / @prisma/client@7.10.0). We use @prisma/adapter-pg for
 * PostgreSQL. The adapter does not fail if DATABASE_URL is missing — it
 * only fails when a query is actually attempted, which callers (e.g.
 * /api/health) must handle.
 *
 * This file is the ONLY place a PrismaClient is constructed. Server
 * actions, route handlers, and server components must import `db` from
 * here rather than instantiating their own client.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
