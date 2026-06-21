import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireProfile, isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchClients } from "@/lib/db/projects";
import { AdminClient, type AdminUser } from "@/components/admin/admin-client";
import type { Profile } from "@/types/database.types";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const profile = await requireProfile();
  if (!isAdmin(profile)) redirect("/");

  const supabase = await createClient();
  const admin = createAdminClient();

  const [{ data: profiles }, authList, clients] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at"),
    admin.auth.admin.listUsers(),
    fetchClients(supabase),
  ]);

  const emailById = new Map(
    (authList.data?.users ?? []).map((u) => [u.id, u.email ?? "—"]),
  );

  const users: AdminUser[] = (profiles ?? []).map((p: Profile) => ({
    id: p.id,
    email: emailById.get(p.id) ?? "—",
    full_name: p.full_name,
    role: p.role,
    is_active: p.is_active,
  }));

  return (
    <AdminClient
      users={users}
      clients={clients}
      currentUserId={profile.id}
    />
  );
}
