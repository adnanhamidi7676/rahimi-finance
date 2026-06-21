"use server";

import { revalidatePath } from "next/cache";
import { getProfile, isAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/types/database.types";

export type ActionState = { error: string | null; success?: string };

/** Throws unless the caller is an active admin. */
async function assertAdmin() {
  const profile = await getProfile();
  if (!profile || !profile.is_active || !isAdmin(profile)) {
    throw new Error("Not authorized");
  }
}

const ROLES: UserRole[] = ["admin", "manager", "viewer"];

export async function createUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await assertAdmin();
  } catch {
    return { error: "You are not authorized to manage users." };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "manager") as UserRole;

  if (!email || !/.+@.+\..+/.test(email)) {
    return { error: "Enter a valid email." };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }
  if (!ROLES.includes(role)) {
    return { error: "Invalid role." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName || email },
  });

  if (error || !data.user) {
    return { error: error?.message ?? "Could not create user." };
  }

  // The handle_new_user trigger created the profile; set its role/name.
  const { error: profileError } = await admin
    .from("profiles")
    .update({ role, full_name: fullName || email })
    .eq("id", data.user.id);

  if (profileError) {
    return { error: profileError.message };
  }

  revalidatePath("/admin");
  return { error: null, success: `User ${email} created.` };
}

export async function updateUserRole(
  userId: string,
  role: UserRole,
): Promise<ActionState> {
  try {
    await assertAdmin();
  } catch {
    return { error: "Not authorized" };
  }
  if (!ROLES.includes(role)) return { error: "Invalid role" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role })
    .eq("id", userId);
  if (error) return { error: error.message };

  revalidatePath("/admin");
  return { error: null };
}

export async function setUserActive(
  userId: string,
  isActive: boolean,
): Promise<ActionState> {
  try {
    await assertAdmin();
  } catch {
    return { error: "Not authorized" };
  }

  // Guard: an admin cannot deactivate themselves (avoid lock-out).
  const me = await getProfile();
  if (me && me.id === userId && !isActive) {
    return { error: "You cannot deactivate your own account." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", userId);
  if (error) return { error: error.message };

  revalidatePath("/admin");
  return { error: null };
}
