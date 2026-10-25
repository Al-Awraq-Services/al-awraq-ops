/**
 * Shared visual language for the internal ops UI.
 *
 * Plain exported class-name strings/functions, not components — every page
 * here is a Server Component and every form is a Client Component; a shared
 * string module can be imported from either without pulling "use client"
 * into places that don't need it.
 *
 * Redesign (2026-10-25, "paper & ink"): the earlier passes' gradient pill
 * buttons, hover lifts, blue-tinted shadows on every card and uppercase
 * table headers were the main "AI template" tells and are gone. Surfaces
 * are now flat white sheets on a warm paper canvas, separated by hairline
 * rules; corners are tight (6–10px); page titles and headline figures use
 * the Newsreader display serif. All colors come from the semantic tokens in
 * globals.css (ink, muted, line, brand, positive, negative, …).
 *
 * Semantic color rules carried over from earlier passes (developer-directed,
 * see docs/OPEN_DECISIONS.md): Save/Create buttons are green, Sign out is
 * red, red otherwise means destructive/negative/outstanding, green means
 * successful/paid, and the brand navy is for links, focus, active nav and
 * informational states. Every export name from the previous version is
 * kept, so existing pages keep working; the new helpers below (pageHeader,
 * backLink, thNum/tdNum, dl rows, statusLabel, …) are additive.
 */

// --- Page structure ---

export const pageWrap =
  "flex-1 flex flex-col gap-8 px-5 pt-8 pb-16 sm:px-8 sm:pt-10 max-w-6xl mx-auto w-full animate-page-in";

/** Title row: title/subtitle on the left, actions on the right, hairline under. */
export const pageHeader =
  "flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-line pb-6";
export const pageActions = "flex flex-wrap items-center gap-2";

export const pageTitle =
  "font-display text-[2rem] sm:text-[2.375rem] font-normal leading-[1.08] tracking-[-0.018em] text-ink";
export const pageSubtitle = "mt-2 text-sm text-muted";
/** Small label above a page title (e.g. the record type on a detail page). */
export const eyebrow = "text-[12.5px] font-medium text-muted";
export const sectionTitle = "text-[15px] font-semibold tracking-[-0.006em] text-ink";
/** Section title row with an optional action on the right. */
export const sectionHeader = "mb-3 flex items-baseline justify-between gap-4";
export const mutedText = "text-sm text-muted";
export const hintText = "text-[12.5px] text-muted";

/** "← Invoices" style link back to the parent list. */
export const backLink =
  "inline-flex items-center gap-1 text-[13px] font-medium text-muted transition-colors hover:text-ink";

// --- Surfaces ---

export const cardClass = "rounded-[10px] border border-line bg-surface p-5 sm:p-6";

// A clickable card — same flat sheet; border darkens and the fill warms on
// hover. No lift, no glow.
export const cardInteractiveClass =
  "rounded-[10px] border border-line bg-surface p-5 sm:p-6 transition-colors duration-200 hover:border-line-strong hover:bg-surface-2";

/** Empty list / no-results panel. */
export const emptyState =
  "rounded-[10px] border border-dashed border-line-strong bg-surface/60 px-6 py-12 text-center text-sm text-muted";

// --- Buttons / action links ---

const btnBase =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out active:translate-y-px disabled:pointer-events-none disabled:opacity-50 cursor-pointer";

export const btnPrimary = `${btnBase} h-9 px-4 text-sm bg-positive text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_1px_2px_rgba(22,24,29,0.12)] hover:bg-positive-hover`;

export const btnPrimarySm = `${btnBase} h-8 px-3 text-[13px] bg-positive text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_1px_2px_rgba(22,24,29,0.12)] hover:bg-positive-hover`;

export const btnSecondary = `${btnBase} h-9 px-4 text-sm border border-line-strong bg-surface text-ink shadow-[0_1px_2px_rgba(22,24,29,0.05)] hover:border-[#c3beb2] hover:bg-surface-2`;

export const btnSecondarySm = `${btnBase} h-8 px-3 text-[13px] border border-line-strong bg-surface text-ink hover:bg-surface-2`;

/** Destructive action (Delete …) — outlined red, never a solid fill. */
export const btnDanger = `${btnBase} h-9 px-4 text-sm border border-[#ecc9c4] bg-surface text-negative hover:border-[#dfa9a2] hover:bg-negative-tint`;

// Text-style action links — inline table/detail actions. `link` = routine
// (navy), `linkDanger` = destructive (red), `linkMuted` = neutral,
// `linkSuccess` = restorative (e.g. "Reactivate").
export const link =
  "text-sm font-medium text-brand underline decoration-brand/25 underline-offset-[3px] transition-colors hover:text-brand-hover hover:decoration-brand-hover";
export const linkDanger =
  "text-sm font-medium text-negative underline decoration-negative/25 underline-offset-[3px] transition-colors hover:decoration-negative cursor-pointer";
export const linkMuted =
  "text-sm font-medium text-muted underline-offset-[3px] transition-colors hover:text-ink hover:underline cursor-pointer";
export const linkSuccess =
  "text-sm font-medium text-positive underline decoration-positive/25 underline-offset-[3px] transition-colors hover:decoration-positive cursor-pointer";
/** A table cell's primary link (record number/name) — ink, not blue. */
export const rowLink =
  "font-medium text-ink underline decoration-transparent underline-offset-[3px] transition-colors hover:decoration-ink/40";

// Sign out in the app header (light header now, so plain red text).
export const navDangerLink =
  "text-[13px] font-medium text-negative/90 transition-colors hover:text-negative cursor-pointer";

// --- Form fields ---

export const labelClass = "text-[13px] font-medium text-ink-2";
export const inputClass =
  "block w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink shadow-[inset_0_1px_1px_rgba(22,24,29,0.03)] transition-[border-color,box-shadow] duration-150 placeholder:text-faint hover:border-[#c3beb2] focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/15 disabled:bg-surface-2 disabled:text-muted";
export const fieldWrap = "flex flex-col gap-1.5";
export const errorText = "text-[13px] font-medium text-negative";
/** A group of related fields inside a form, separated by a hairline. */
export const fieldset = "flex flex-col gap-4 border-t border-line pt-6 first:border-t-0 first:pt-0";

// --- Tables ---

export const tableWrap =
  "overflow-x-auto rounded-[10px] border border-line bg-surface [&_tbody_tr:last-child_td]:border-b-0";
export const table = "w-full text-sm border-collapse";
const thBase =
  "h-10 px-4 text-[12.5px] font-medium text-muted bg-surface-2 border-b border-line whitespace-nowrap";
export const thClass = `${thBase} text-left`;
/** Right-aligned header for money/quantity columns. */
export const thNum = `${thBase} text-right`;
const tdBase = "px-4 py-3 border-b border-line/70 align-top text-ink-2";
export const tdClass = `${tdBase} text-left`;
/** Right-aligned, tabular, non-wrapping cell for money/quantity columns. */
export const tdNum = `${tdBase} text-right tabular-nums whitespace-nowrap text-ink`;
export const trHover = "transition-colors duration-150 hover:bg-surface-2";
/** Tighter cells for editable line-item tables (inputs inside the cells). */
export const tdInput = "border-b border-line/70 px-2 py-2 align-middle first:pl-4 last:pr-4";
export const tdInputNum = `${tdInput} text-right tabular-nums whitespace-nowrap text-ink`;

// --- Definition lists (label/value rows on detail pages) ---

export const dlList = "flex flex-col text-sm";
export const dlRow =
  "flex items-baseline justify-between gap-4 border-b border-line/70 py-2 last:border-b-0";
export const dlTerm = "text-muted";
export const dlValue = "text-right font-medium text-ink tabular-nums";
/** Emphasised total row (Grand total / Balance due). */
export const dlTotalRow =
  "mt-1 flex items-baseline justify-between gap-4 border-t border-ink/80 pt-3 text-[15px] font-semibold text-ink";

// --- Badges ---

// `green` = successful/approved/paid/good-standing; `red` =
// unsuccessful/cancelled/outstanding; `blue` = in-progress/informational
// (navy); `amber` = waiting/partial attention; `neutral` = draft/unstarted;
// `solid` = rare strong emphasis.
type BadgeTone = "blue" | "red" | "green" | "amber" | "neutral" | "solid";

const badgeTones: Record<BadgeTone, string> = {
  blue: "bg-brand-tint text-brand",
  red: "bg-negative-tint text-negative",
  green: "bg-positive-tint text-positive",
  amber: "bg-caution-tint text-caution",
  neutral: "bg-surface-3 text-muted",
  solid: "bg-ink text-white",
};

/** Square-cornered status chip with a leading dot (drawn by ::before). */
export function badgeClass(tone: BadgeTone): string {
  return `inline-flex items-center gap-1.5 whitespace-nowrap rounded-[5px] px-2 py-0.5 text-[12px] font-medium leading-5 before:size-1.5 before:shrink-0 before:rounded-full before:bg-current before:content-[''] ${badgeTones[tone]}`;
}

/** "PARTIALLY_PAID" → "Partially paid" — status enums shown in sentence case. */
export function statusLabel(status: string): string {
  const words = status.toLowerCase().replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// --- Stat tiles (the KPI row at the top of list/detail pages) ---

export const statGrid = "grid grid-cols-2 gap-3 sm:grid-cols-3";
export const statTile = "rounded-[10px] border border-line bg-surface px-4 py-4 sm:px-5 sm:py-5";
export const statLabel = "text-[12.5px] font-medium text-muted";

type StatTone = "blue" | "red" | "green" | "neutral";
const statValueTones: Record<StatTone, string> = {
  blue: "text-brand",
  red: "text-negative",
  green: "text-positive",
  neutral: "text-ink",
};

// Display serif, lining tabular figures. On a narrow 2-up mobile tile a long
// figure breaks after "AED", never mid-number.
export function statValueClass(tone: StatTone = "neutral"): string {
  return `mt-2 font-display text-[1.45rem] sm:text-[1.85rem] font-normal leading-[1.05] tracking-[-0.01em] figures ${statValueTones[tone]}`;
}
