import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canWrite } from "@/lib/auth";
import { fetchEmployees } from "@/lib/db/projects";
import { fetchEmployeeEarnings } from "@/lib/db/dashboard";
import { EmployeesClient } from "@/components/employees/employees-client";

export const metadata: Metadata = { title: "Employees" };
export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [earnings, employees] = await Promise.all([
    fetchEmployeeEarnings(supabase),
    fetchEmployees(supabase),
  ]);

  return (
    <EmployeesClient
      initialEarnings={earnings}
      initialEmployees={employees}
      canWrite={canWrite(profile)}
    />
  );
}
