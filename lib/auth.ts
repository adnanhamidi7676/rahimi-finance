// ============================================================================
// Server-side auth/session helpers. Use from Server Components, layouts and
// Server Actions to read the current user and their profile (role/active).
// ============================================================================

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database.types";

/** The authenticated user, or null. Cached per request. */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** The current user's profile row, or null. Cached per request. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data;
});

/**
 * Guard for protected pages: ensures there is an authenticated, ACTIVE profile.
 * Redirects to /login otherwise. Returns the profile so callers can branch on
 * role.
 */
export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile || !profile.is_active) {
    redirect("/login");
  }
  return profile;
}

export function canWrite(profile: Pick<Profile, "role">): boolean {
  return profile.role === "admin" || profile.role === "manager";
}

export function isAdmin(profile: Pick<Profile, "role">): boolean {
  return profile.role === "admin";
}
