/**
 * Shared visual language for the internal ops UI.
 *
 * Plain exported class-name strings/functions, not components — every page
 * here is a Server Component and every form is a Client Component; a shared
 * string module can be imported from either without pulling "use client"
 * into places that don't need it.
 *
 * History: UI/Branding pass (2026-09-09) established the palette — blue as
 * the one interactive/primary accent, red reserved strictly for
 * destructive/negative/warning meaning, near-black header, white/light
 * canvas (see docs/HANDOVER_LOG.md and docs/OPEN_DECISIONS.md for the full
 * rationale and the logo-hex-values caveat — no real logo file exists to
 * sample exact colors from). Premium visual pass (2026-09-12) kept that
 * palette and rebuilt the actual surfaces on top of it: soft layered
 * shadows instead of flat borders, pill-shaped primary actions with a
 * gentle gradient + hover lift, rounder corners throughout, generous
 * spacing, and CSS-only fade-in motion (see globals.css) — no animation
 * library, since every page here is a Server Component by design and a JS
 * animation library would force converting most of them to Client
 * Components for no real gain over `@keyframes` + a couple of utility
 * classes. Layout pass (2026-09-13) added a semantic status color: green
 * for successful/approved/paid/good-standing states, red for
 * cancel/exit/unsuccessful/destructive. Also added stat-tile primitives
 * (the small KPI row shown at the top of every list page). A same-day
 * follow-up made the rule literal for the two remaining cases: `btnPrimary`
 * (every Save/Create button) is now green, not blue, and Sign Out is now
 * red — blue's remaining role is links, active nav, focus rings, and
 * informational badges (New/Sent), not primary actions. The `<details>`
 * "+ Add X" reveal from earlier the same day was replaced by real
 * `/[module]/new` pages (see docs/HANDOVER_LOG.md) — the developer found
 * the inline reveal left a large empty gap next to the narrow form.
 */

export const pageWrap =
  "flex-1 flex flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full animate-page-in";

export const pageTitle = "text-3xl font-bold text-neutral-950 tracking-tight";
export const pageSubtitle = "text-sm text-neutral-500 mt-1";
export const sectionTitle = "text-base font-semibold text-neutral-900 tracking-tight";
export const mutedText = "text-sm text-neutral-500";

export const cardClass =
  "rounded-2xl border border-neutral-200/70 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_30px_-15px_rgba(0,0,0,0.12)]";

// A clickable card (dashboard quick-links) — same surface, plus a hover
// lift and a blue-tinted glow instead of the flat shadow, so it reads as
// interactive before the cursor even reaches it.
export const cardInteractiveClass =
  "rounded-2xl border border-neutral-200/70 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_30px_-15px_rgba(0,0,0,0.12)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_40px_-20px_rgba(29,78,216,0.35)]";

// --- Buttons / action links ---

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-b from-emerald-600 to-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_4px_14px_-2px_rgba(5,150,105,0.5)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_8px_20px_-4px_rgba(5,150,105,0.55)] active:translate-y-0 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none";

export const btnPrimarySm =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-b from-emerald-600 to-emerald-700 px-4 py-1.5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_2px_8px_-2px_rgba(5,150,105,0.5)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_6px_14px_-4px_rgba(5,150,105,0.55)] active:translate-y-0 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";

export const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-800 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-neutral-400 hover:bg-neutral-50 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none";

// Text-style action links — used for inline table/detail actions instead of
// a full button, kept visually light. `link` = routine action (blue),
// `linkDanger` = destructive/negative action (red), `linkMuted` = neutral
// (e.g. "Clear" on a search filter, "Sign out").
export const link =
  "text-sm font-medium text-blue-700 underline-offset-4 transition-colors hover:text-blue-800 hover:underline";
export const linkDanger =
  "text-sm font-medium text-red-700 underline-offset-4 transition-colors hover:text-red-800 hover:underline";
export const linkMuted =
  "text-sm font-medium text-neutral-600 underline-offset-4 transition-colors hover:text-neutral-900 hover:underline";
// `linkSuccess` = a positive/restorative action (e.g. "Reactivate") —
// green, matching the badge tone for the state it leads to.
export const linkSuccess =
  "text-sm font-medium text-emerald-700 underline-offset-4 transition-colors hover:text-emerald-800 hover:underline";

// Sign Out lives in the dark header, not on a white surface — a dedicated
// style rather than reusing `linkDanger` (red-700/800), which would be
// too low-contrast against `neutral-950`.
export const navDangerLink =
  "text-sm font-medium text-red-400 transition-colors hover:text-red-300";

// --- Form fields ---

export const labelClass = "text-sm font-medium text-neutral-700";
export const inputClass =
  "block w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 shadow-sm transition-shadow duration-150 placeholder:text-neutral-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-600/10";
export const fieldWrap = "flex flex-col gap-1.5";
export const errorText = "text-sm font-medium text-red-600";

// --- Tables ---

export const tableWrap =
  "overflow-x-auto rounded-2xl border border-neutral-200/70 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_30px_-15px_rgba(0,0,0,0.12)]";
export const table = "w-full text-sm border-collapse";
export const thClass =
  "py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 bg-neutral-50/80 border-b border-neutral-200/70";
export const tdClass = "py-3.5 px-4 border-b border-neutral-100 align-top text-neutral-800";
export const trHover = "transition-colors duration-150 hover:bg-blue-50/40";

// --- Badges ---

// `green` = successful/approved/paid/good-standing (Active, Converted);
// `red` = unsuccessful/cancelled/terminal (Archived, Inactive, Lost);
// `blue` = neutral/in-progress/informational (New, Sent); `neutral` = an
// unstarted/draft state; `solid` = reserved for a strong, rare emphasis
// case, not currently used by any status badge.
type BadgeTone = "blue" | "red" | "green" | "neutral" | "solid";

const badgeTones: Record<BadgeTone, string> = {
  blue: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10",
  red: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-700/10",
  green: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-700/10",
  neutral: "bg-neutral-100 text-neutral-600 ring-1 ring-inset ring-neutral-500/10",
  solid: "bg-neutral-900 text-white",
};

export function badgeClass(tone: BadgeTone): string {
  return `inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${badgeTones[tone]}`;
}

// --- Stat tiles (the small KPI row shown at the top of every list page) ---

export const statGrid = "grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4";
export const statTile =
  "rounded-2xl border border-neutral-200/70 bg-white px-4 py-3.5 sm:px-5 sm:py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_30px_-15px_rgba(0,0,0,0.12)]";
export const statLabel = "text-xs font-medium text-neutral-500";

type StatTone = "blue" | "red" | "green" | "neutral";
const statValueTones: Record<StatTone, string> = {
  blue: "text-blue-700",
  red: "text-red-700",
  green: "text-emerald-700",
  neutral: "text-neutral-950",
};

export function statValueClass(tone: StatTone = "neutral"): string {
  return `text-2xl font-bold tracking-tight ${statValueTones[tone]}`;
}
