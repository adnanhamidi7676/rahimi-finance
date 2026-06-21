// ============================================================================
// Project Finance queries. The split columns (employee/office/manager share,
// remaining balance) are DB-generated — these helpers only read them, never
// compute them. Used by both the server (SSR) and the browser (realtime).
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  Project,
  ProjectTotals,
  Employee,
  Client,
} from "@/types/database.types";

type Client_ = SupabaseClient<Database>;

export async function fetchProjects(supabase: Client_): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchProjectTotals(
  supabase: Client_,
): Promise<ProjectTotals> {
  const { data, error } = await supabase
    .from("project_totals")
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function fetchEmployees(
  supabase: Client_,
  { activeOnly = false } = {},
): Promise<Employee[]> {
  let query = supabase.from("employees").select("*").order("name");
  if (activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchClients(supabase: Client_): Promise<Client[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("name");
  if (error) throw error;
  return data ?? [];
}
