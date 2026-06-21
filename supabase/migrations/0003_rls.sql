-- ============================================================================
-- Migration 0003: Row Level Security
-- ----------------------------------------------------------------------------
-- Access rules (single-org, all rows shared by every active user):
--   * Any access requires an active profile (profiles.is_active = true).
--   * admin + manager  : full read + write on finance data.
--   * viewer           : read-only on finance data.
--   * Only admin can modify profiles (manage other users).
-- Helper functions are SECURITY DEFINER to avoid recursive RLS evaluation
-- when policies on `profiles` need to read `profiles`.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Auth helper functions
-- ----------------------------------------------------------------------------
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid() and is_active
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and is_active
  )
$$;

create or replace function public.can_write_finance()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('admin', 'manager')
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'admin'
$$;

-- ----------------------------------------------------------------------------
-- Enable RLS on every table
-- ----------------------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.clients      enable row level security;
alter table public.employees    enable row level security;
alter table public.projects     enable row level security;
alter table public.cash_entries enable row level security;

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
-- Every active user can read all profiles (needed to show "created by",
-- assignees, the admin user list, etc.).
create policy profiles_select on public.profiles
  for select using (public.is_active_user());

-- A user may always update their own non-privileged fields. Admins may update
-- anyone. (Role/active escalation is additionally guarded in the app; for full
-- DB-level lockdown of self role-changes, route writes through the service
-- role in a server action — see lib/db and /admin.)
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- Reusable policy shape for finance tables:
--   SELECT  -> any active user
--   WRITE   -> admin or manager
-- ----------------------------------------------------------------------------

-- clients
create policy clients_select on public.clients
  for select using (public.is_active_user());
create policy clients_write on public.clients
  for all using (public.can_write_finance())
  with check (public.can_write_finance());

-- employees
create policy employees_select on public.employees
  for select using (public.is_active_user());
create policy employees_write on public.employees
  for all using (public.can_write_finance())
  with check (public.can_write_finance());

-- projects
create policy projects_select on public.projects
  for select using (public.is_active_user());
create policy projects_write on public.projects
  for all using (public.can_write_finance())
  with check (public.can_write_finance());

-- cash_entries
create policy cash_entries_select on public.cash_entries
  for select using (public.is_active_user());
create policy cash_entries_write on public.cash_entries
  for all using (public.can_write_finance())
  with check (public.can_write_finance());
