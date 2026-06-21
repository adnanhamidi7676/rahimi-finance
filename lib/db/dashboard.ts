// ============================================================================
// Dashboard & Employee-account queries — all read from the summary VIEWS so the
// numbers always match the projects/cash_entries source of truth.
//
// Note on currency: project aggregates (shares, totals, employee earnings) are
// treated as USD, matching the original Project Finance spreadsheet which was
// USD-only. The Cash Book is AFN. The app never auto-converts between them.
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  EmployeeEarning,
  ProjectTotals,
  CashBookSummary,
  Project,
} from "@/types/database.types";

type Client = SupabaseClient<Database>;

export async function fetchEmployeeEarnings(
  supabase: Client,
): Promise<EmployeeEarning[]> {
  const { data, error } = await supabase
    .from("employee_earnings")
    .select("*")
    .order("total_earned", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function fetchSingleNumber(
  supabase: Client,
  view: "office_account_total" | "manager_account_total",
): Promise<number> {
  const { data, error } = await supabase.from(view).select("total").single();
  if (error) throw error;
  return Number(data?.total ?? 0);
}

export type DashboardData = {
  projectTotals: ProjectTotals;
  cashSummary: CashBookSummary;
  officeTotal: number;
  managerTotal: number;
  /** Lightweight project rows for the "income by month" chart. */
  projectsForChart: Pick<
    Project,
    "entry_date" | "total_amount" | "currency" | "amount_paid"
  >[];
};

export async function fetchDashboard(
  supabase: Client,
): Promise<DashboardData> {
  const [projectTotals, cashSummary, officeTotal, managerTotal, projects] =
    await Promise.all([
      supabase.from("project_totals").select("*").single(),
      supabase.from("cash_book_summary").select("*").single(),
      fetchSingleNumber(supabase, "office_account_total"),
      fetchSingleNumber(supabase, "manager_account_total"),
      supabase
        .from("projects")
        .select("entry_date, total_amount, currency, amount_paid")
        .order("entry_date", { ascending: true }),
    ]);

  if (projectTotals.error) throw projectTotals.error;
  if (cashSummary.error) throw cashSummary.error;
  if (projects.error) throw projects.error;

  return {
    projectTotals: projectTotals.data,
    cashSummary: cashSummary.data,
    officeTotal,
    managerTotal,
    projectsForChart: projects.data ?? [],
  };
}
