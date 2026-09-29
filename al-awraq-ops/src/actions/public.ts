"use server";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { publicLeadRequestSchema } from "@/lib/validation/publicLeadRequest";
import { writeAuditLog } from "@/lib/audit/log";
import {
  checkPublicFormRateLimit,
  recordPublicFormSubmission,
} from "@/lib/security/publicFormRateLimit";

/**
 * The app's first and only unauthenticated write path: a public visitor
 * submits "Request a Quote" (src/app/request-a-quote/page.tsx) with no
 * session, no role check — by design, since the whole point is that a
 * customer isn't a User in this schema and has no account (see
 * docs/OPEN_DECISIONS.md "Public request-a-quote pass" for the scope
 * decision behind this and the standing business-owner-approval flag).
 *
 * It creates a Lead, exactly like a phone/WhatsApp lead a Staff member
 * would log by hand — `source: "WEBSITE"`, `status: "NEW"`,
 * `createdByUserId: null` (no staff member created it; see the Lead model
 * comment in schema.prisma for why that field is nullable at all).
 * Nothing about status, customerId, or source is ever taken from form
 * input — every written field is fixed here or comes from validated data,
 * matching every other create action's "build the write object field by
 * field" discipline (see e.g. src/actions/services.ts toWriteValues).
 *
 * Contact details (name/phone/email) and the optional service-of-interest
 * label are folded into the Lead's existing free-text `description` field
 * rather than a schema change to Lead itself — the same field an
 * internal-facing PHONE/WHATSAPP lead's description already holds
 * freeform inquiry text, so this fits the existing shape rather than
 * inventing new columns for what is, to every other part of the app,
 * still just an inbound inquiry description.
 */

export type PublicLeadRequestState =
  | { error?: string; success?: false }
  | { success: true }
  | undefined;

function clientIp(headerList: Headers): string {
  // Works behind a reverse proxy that sets X-Forwarded-For; in raw local
  // dev (no proxy) this header is absent, so every request falls into one
  // "unknown" bucket — documented, not a bug: rate limiting is real code,
  // just not meaningfully exercised outside a deployed-behind-a-proxy
  // environment, which this prototype isn't (see docs/OPEN_DECISIONS.md).
  const forwarded = headerList.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export async function createPublicLeadRequestAction(
  _prevState: PublicLeadRequestState,
  formData: FormData,
): Promise<PublicLeadRequestState> {
  const ip = clientIp(await headers());

  const rateLimit = checkPublicFormRateLimit(ip);
  if (!rateLimit.allowed) {
    return {
      error: `Too many requests. Please try again in ${Math.ceil(
        (rateLimit.retryAfterSeconds ?? 0) / 60,
      )} minute(s).`,
    };
  }

  const parsed = publicLeadRequestSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    serviceOfInterest: formData.get("serviceOfInterest"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  recordPublicFormSubmission(ip);

  const { name, phone, email, serviceOfInterest, message } = parsed.data;
  const contactLine = `Website request from ${name} (${phone}${email ? `, ${email}` : ""})${
    serviceOfInterest ? ` — interested in: ${serviceOfInterest}` : ""
  }`;
  const description = `${contactLine}\n\n${message}`;

  await db.$transaction(async (tx) => {
    const lead = await tx.lead.create({
      data: {
        source: "WEBSITE",
        description,
        createdByUserId: null,
      },
    });
    await writeAuditLog(
      {
        actorUserId: null,
        action: "LEAD_CREATED",
        targetType: "Lead",
        targetId: lead.id,
        metadata: { source: lead.source, viaPublicForm: true },
      },
      tx,
    );
  });

  // No revalidatePath("/leads") — this visitor never has access to that
  // page, and the internal Leads list already re-fetches fresh data on its
  // own next load (Server Component, no client-side cache to invalidate
  // for a page this actor can't reach).
  return { success: true };
}
