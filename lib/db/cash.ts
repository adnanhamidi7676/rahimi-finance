// ============================================================================
// Cash Book queries. Both the server (initial SSR load) and the browser
// (realtime refresh) call these, so they take a Supabase client as an argument.
// The running balance comes from the cash_entries_with_balance VIEW — never
// computed here.
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  CashEntryWithBalance,
  CashBookSummary,
} from "@/types/database.types";

type Client = SupabaseClient<Database>;

/** Full ledger ordered by date then insertion, with running balance + S/No. */
export async function fetchCashLedger(
  supabase: Client,
): Promise<CashEntryWithBalance[]> {
  const { data, error } = await supabase
    .from("cash_entries_with_balance")
    .select("*")
    .order("entry_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/** Totals + current balance for the summary header / dashboard. */
export async function fetchCashSummary(
  supabase: Client,
): Promise<CashBookSummary> {
  const { data, error } = await supabase
    .from("cash_book_summary")
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
