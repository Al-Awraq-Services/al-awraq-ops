import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Local operational health check for the prototype.
 *
 * Not part of the approved screen/route map (Phase 5) — this is an
 * infrastructure utility used to verify the server boots and the database
 * is reachable, per the Phase 6 Phase A verification steps. It returns no
 * business data and no secret values, so it does not need role protection.
 */
export async function GET() {
  const result = {
    server: "ok" as const,
    database: "not_configured" as "ok" | "unreachable" | "not_configured",
    timestamp: new Date().toISOString(),
  };

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(result);
  }

  try {
    await db.$queryRaw`SELECT 1`;
    result.database = "ok";
  } catch {
    result.database = "unreachable";
  }

  return NextResponse.json(result);
}
