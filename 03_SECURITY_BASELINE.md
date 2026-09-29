# Security Baseline for Claude Code Projects

## Purpose
This file defines the minimum acceptable security standard for small-to-medium business web applications.

## Core Principles
- Security is enforced at the real boundary, not just the UI.
- Sensitive operations require server-side authorization checks.
- Input validation is mandatory on every write path.
- Production secrets must never appear in client code.
- Security fixes are not complete until verified.

## Minimum Controls
- Role-based authorization enforced server-side.
- Database access rules enforced at the database layer where supported.
- Password policy defined and enforced consistently.
- Rate limiting on login, password reset, and abuse-prone endpoints.
- Environment secrets kept server-side only.
- File upload type and size restrictions enforced server-side.
- Security headers configured in production.
- Audit logging for sensitive admin and data-changing actions.
- Soft delete / archival preferred over destructive deletion for critical records.
- Production deployment checklist required before go-live.

## Authentication
- No public sign-up unless the business model requires it.
- Admin creation should be tightly controlled.
- Password reset flows must be thought through operationally, not just technically.
- MFA should be required for admins in sensitive systems.
- Session invalidation strategy must be defined for deactivated users or compromised accounts.

## Authorization
- Never rely only on hidden buttons or route guards.
- Re-check role and ownership server-side on every mutation.
- Prevent mass-assignment and forbidden field updates.
- Confirm update policies are as strict as insert policies.

## Data Handling
- Classify the project as low, medium, or high sensitivity.
- Identify whether it stores customer, student, financial, medical, or identity data.
- Avoid collecting data that is not operationally needed.
- Define retention and deletion/archive rules early.

## File Storage
- Public buckets only for truly public assets.
- Sensitive files must use protected/private access patterns.
- Signed URL patterns should be controlled server-side where relevant.

## Logging
Log at minimum:
- Sign-in and sign-in failure events where appropriate.
- Admin account actions.
- Permission-sensitive changes.
- Record archival/deactivation.
- Password/admin-reset operations.

## Verification Standard
A security fix is complete only when:
1. The code or migration exists.
2. The change is applied to the actual target environment if relevant.
3. The vulnerable path is actively re-tested.
4. The result is documented.

## Deployment Checks
Before go-live, verify:
- Production env vars
- Redirect/auth URLs
- Secure headers
- File access rules
- Backups or export strategy
- Rollback plan
- Test accounts cleanup
- Repository visibility / secret exposure risks
