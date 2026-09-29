import { TriangleAlert } from "lucide-react";

/**
 * Persistent prototype-mode warning.
 *
 * Required by the approved Phase 5 UI/UX specification (§12 Content and
 * Labeling Rules) and the Phase 3 sponsor authorization: this app is a
 * private prototype, not approved for production or real customer data.
 * Rendered in the root layout so it appears on every screen without
 * exception — do not remove or conditionally hide this without updating
 * docs/OPEN_DECISIONS.md and docs/CHANGE_LOG.md first.
 */
export function PrototypeBanner() {
  return (
    <div
      role="status"
      className="flex w-full items-center justify-center gap-1.5 border-b border-red-200 bg-red-50 px-4 py-2 text-center text-sm font-medium text-red-800"
    >
      <TriangleAlert className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
      Private prototype — internal testing only. Not approved for production
      use. Do not enter real customer data.
    </div>
  );
}
