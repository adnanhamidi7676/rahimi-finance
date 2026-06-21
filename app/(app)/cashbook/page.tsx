import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canWrite } from "@/lib/auth";
import { fetchCashLedger, fetchCashSummary } from "@/lib/db/cash";
import { CashBookClient } from "@/components/cashbook/cash-book-client";

export const metadata: Metadata = { title: "Cash Book" };

// Finance data must stay live — never serve a cached snapshot.
export const dynamic = "force-dynamic";

export default async function CashBookPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [entries, summary] = await Promise.all([
    fetchCashLedger(supabase),
    fetchCashSummary(supabase),
  ]);

  // Header metadata mirrors the original ledger's Station / Department.
  const station = entries[0]?.station ?? "Jalalabad Main Office";
  const department = entries[0]?.department ?? "Finance";

  return (
    <CashBookClient
      initialEntries={entries}
      initialSummary={summary}
      canWrite={canWrite(profile)}
      station={station}
      department={department}
    />
  );
}
