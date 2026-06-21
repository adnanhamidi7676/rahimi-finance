import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { fetchDashboard } from "@/lib/db/dashboard";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireProfile();
  const supabase = await createClient();
  const data = await fetchDashboard(supabase);
  return <DashboardClient data={data} />;
}
