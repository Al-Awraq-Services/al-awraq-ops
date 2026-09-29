# Al Awraq Services — Project Status Summary
*Generated 2026-09-15*

## What this project is
A private internal-operations prototype (`al-awraq-ops`) built for the sponsor's father's AC duct-cleaning/maintenance/repair business in Dubai (Al Awraq Services). It is **not yet reviewed or approved by the business owner** — it's a surprise-build MVP meant to prove out a Lead → Customer → Quote → Invoice workflow before involving him. No production deployment exists; everything runs on a local machine against a local PostgreSQL database.

Two top-level folders:
- `/` — planning/framework docs (master framework, security baseline template, business brief, handover/change-log templates).
- `/al-awraq-ops` — the actual Next.js application (this is what's summarized below).

## Tech stack
| Layer | Choice |
|---|---|
| Framework | Next.js **16.3.3** (App Router), React **19.2.8**, TypeScript |
| Styling | Tailwind CSS **v4** (no component library — hand-rolled `classNames.ts` design system) |
| Database | **PostgreSQL** (local instance, PostgreSQL 18.6), via **Prisma ORM 7.10.0** using the new driver-adapter pattern (`@prisma/adapter-pg` + `pg`, not the classic `datasource.url` connection) |
| Auth | Hand-rolled, **not** Auth.js — DB-backed opaque session tokens (SHA-256 hashed at rest), `@node-rs/argon2` for password hashing (argon2id) |
| Validation | `zod` |
| Icons | `lucide-react` |
| Tooling | ESLint 9, `tsx` (for seed script), no test framework/tests currently written (`tests/` folder exists but is empty) |

Notably **not used**: no ORM alternative, no state-management library, no UI kit, no auth-as-a-service, no test suite yet, no CI/CD, no hosting/deployment configured.

## Codebase size
~**5,780 lines** of TypeScript/TSX/CSS across `src/` + `prisma/` (excludes generated Prisma client, `node_modules`, `.next` build output):

| Area | Lines |
|---|---|
| `src/app` (pages/routes) | 2,286 |
| `src/actions` (Server Actions) | 1,422 |
| `src/components` (forms/UI) | 1,052 |
| `src/lib` (auth, validation, audit, security, UI helpers) | 916 |
| `prisma` (schema + seed) | 101 |

No automated tests exist yet — all verification to date has been manual, live browser walkthroughs documented in the handover log.

## Database schema (PostgreSQL via Prisma)
9 models, 5 migrations applied so far:
- **User, Session, PasswordResetToken, AuditLog** — auth & accountability (append-only audit trail; DB-backed sessions so deactivation invalidates access immediately)
- **Customer, Lead, Service** — core CRM data (Lead can exist without a Customer; Service is an Admin-only priced catalog)
- **Quote, QuoteItem** — quotations with live-computed totals (never stored, so they can't drift)
- **Invoice, InvoiceItem** — auto-generated the moment a Quote is Approved; frozen line-item snapshots, immutable once created

Roles: `ADMIN`, `STAFF`, `TECHNICIAN` (plain enum, not a separate table — deliberate simplification for the prototype scale).

## Feature status (what actually works today)
| Module | Status |
|---|---|
| Auth (login, sessions, roles, rate-limited lockout, Admin-issued password reset) | ✅ Built & fully verified |
| Customers (CRUD, archive, search by name/phone) | ✅ Built & fully verified |
| Leads (CRUD, status lifecycle, search) | ✅ Built & fully verified |
| Services (Admin-only catalog, placeholder pricing + source/date rule) | ✅ Built & fully verified |
| Quotes (line items, live totals, status DRAFT→SENT→APPROVED) | ✅ Built & fully verified |
| Invoicing (auto-generated on Quote approval, mark-as-paid) | ✅ Built & fully verified — but deliberately minimal (see below) |
| Public "Request a Quote" form (unauthenticated lead capture) | ✅ Working prototype — **explicitly not approved for real use** |
| Job tracking, technician assignment, scheduling | ❌ Not built at all (Phase D2/D3, skipped so far) |
| File/photo uploads | ❌ Not built (planned Phase E) |
| Reporting/analytics dashboard | ⚠️ Only simple live counts on the dashboard, nothing deeper |
| WhatsApp integration, payments, notifications | ❌ Not built |
| Arabic/RTL support | ❌ Not built (English-only) |

A five-role security matrix (Dashboard/Customers/Leads/Services/Users/Quotes/Invoices × Admin/Staff/Technician) has been built and live-verified server-side at every phase — this has been treated as a first-class concern throughout, not an afterthought.

## Known gaps & risks (self-disclosed in project docs)
- **No git repository** — the codebase has no version control at all right now.
- Login/public-form rate limiting is **in-memory, per-process** — resets on restart, won't work if ever run across multiple instances.
- No MFA.
- Invoicing has no "undo pay," no partial payments, no PDF export, no notifications.
- The public request-a-quote form has no CAPTCHA/bot protection beyond a basic IP rate limiter.
- Several **test/placeholder accounts and records remain live** in the database (`Test Staff`, `Test Technician`, various regression-test customers/leads/services) — flagged for cleanup before any real deployment.
- The Admin password has been reset multiple times during development via the app's own reset-token mechanism (fully disclosed each time) — the developer should ensure they hold the current one.
- A PostgreSQL local credential was briefly exposed in process listings/diffs during troubleshooting — rotation recommended.
- Real business facts (actual service catalog, real pricing model, real staffing, whether a public customer-facing surface should exist at all) are **still unvalidated** — everything is built on documented assumptions pending the actual business owner's input.

## Overall read
This is a well-documented, disciplined prototype — every phase, deviation, bug, and assumption is logged in `docs/CHANGE_LOG.md`, `docs/HANDOVER_LOG.md`, and `docs/OPEN_DECISIONS.md` in unusual detail. The core CRM loop (Lead → Customer → Quote → Invoice) is functionally complete and manually verified end-to-end with real server-side authorization checks. What's missing is mostly *scope*, not *quality*: no Job/scheduling module, no automated tests, no version control, no deployment story, and several product decisions still waiting on the actual business owner.
