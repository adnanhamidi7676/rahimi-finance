// ============================================================================
// Display formatting helpers.
//
// IMPORTANT: this module only FORMATS values for display. It never computes the
// project split or the cash running balance — those come from the database
// (generated columns / views) and must never be re-derived in JS.
// ============================================================================

import type { Currency } from "@/types/database.types";

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  USD: "$",
  AFN: "؋",
};

export const CURRENCIES: Currency[] = ["USD", "AFN"];

/**
 * Format a money amount with thousands separators and 2 decimals, prefixed
 * with the currency symbol. e.g. formatMoney(12400, "AFN") -> "؋12,400.00".
 */
export function formatMoney(
  amount: number | string | null | undefined,
  currency: Currency = "USD",
): string {
  const n = toNumber(amount);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return `${CURRENCY_SYMBOL[currency]}${formatted}`;
}

/** Plain number with thousands separators and 2 decimals (no symbol). */
export function formatNumber(amount: number | string | null | undefined): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(amount));
}

/** A numeric percentage (0.10) as a label ("10%"). */
export function formatPct(pct: number | string | null | undefined): string {
  return `${(toNumber(pct) * 100).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })}%`;
}

/** ISO date (yyyy-mm-dd) -> "21 Jun 2026" for display. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Today's date as an ISO yyyy-mm-dd string (local time). */
export function todayISO(): string {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10);
}

/** Supabase numeric columns arrive as strings; coerce safely to a number. */
export function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}
