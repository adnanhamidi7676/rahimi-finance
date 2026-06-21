import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canWrite } from "@/lib/auth";
import {
  fetchProjects,
  fetchEmployees,
  fetchClients,
} from "@/lib/db/projects";
import { ProjectsClient } from "@/components/projects/projects-client";

export const metadata: Metadata = { title: "Projects" };
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [projects, employees, clients] = await Promise.all([
    fetchProjects(supabase),
    fetchEmployees(supabase, { activeOnly: true }),
    fetchClients(supabase),
  ]);

  return (
    <ProjectsClient
      initialProjects={projects}
      employees={employees}
      clients={clients}
      canWrite={canWrite(profile)}
    />
  );
}
