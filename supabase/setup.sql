-- ============================================================================
-- Rahimi Finance — COMPLETE database setup (run once in Supabase SQL Editor)
-- Combines migrations 0001-0004 + seed data. Safe on a fresh project.
-- ============================================================================

-- ============================================================================
-- Rahimi Tech Solution — Finance System
-- Migration 0001: core schema (tables, generated columns, triggers)
-- ----------------------------------------------------------------------------
-- Money is stored as numeric(14,2). Percentages as numeric(5,4) (e.g. 0.1000).
-- The four project split fields and the cash running balance are computed by
-- the database — they are never written by the application. Generated columns
-- here guarantee the project math can never drift; the running balance is
-- computed on read (see 0002_views.sql).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helpers
-- ----------------------------------------------------------------------------

-- Generic updated_at maintenance.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- profiles  (1:1 with auth.users)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text,
  role       text not null default 'admin'
             check (role in ('admin', 'manager', 'viewer')),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile the first time a user is created in auth.users.
-- Role defaults to 'admin' (single-org app, all invited users are trusted);
-- an admin can downgrade roles afterwards from the /admin page.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- clients
-- ----------------------------------------------------------------------------
create table if not exists public.clients (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  contact    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- employees  (developers who receive a share)
-- ----------------------------------------------------------------------------
create table if not exists public.employees (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  default_share_pct numeric(5, 4) not null default 0.1000
                    check (default_share_pct >= 0 and default_share_pct <= 1),
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references auth.users (id) on delete set null
);

create trigger employees_set_updated_at
  before update on public.employees
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- projects  (Project Finance — profit-split model)
-- ----------------------------------------------------------------------------
create table if not exists public.projects (
  id            uuid primary key default gen_random_uuid(),
  entry_date    date not null default current_date,
  project_name  text not null,
  client_id     uuid references public.clients (id) on delete set null,
  client_name   text,                      -- denormalized for quick display
  total_amount  numeric(14, 2) not null default 0
                check (total_amount >= 0),
  currency      text not null default 'USD'
                check (currency in ('USD', 'AFN')),
  employee_id   uuid references public.employees (id) on delete set null,
  employee_pct  numeric(5, 4) not null default 0.1000
                check (employee_pct >= 0 and employee_pct <= 1),
  office_pct    numeric(5, 4) not null default 0.0500
                check (office_pct >= 0 and office_pct <= 1),
  amount_paid   numeric(14, 2) not null default 0
                check (amount_paid >= 0),

  -- Computed split — enforced by the database, never written by the app.
  -- Generated columns may only reference base columns, so manager_share
  -- recomputes the shares inline rather than referencing the generated ones.
  employee_share numeric(14, 2)
    generated always as (round(total_amount * employee_pct, 2)) stored,
  office_share numeric(14, 2)
    generated always as (round(total_amount * office_pct, 2)) stored,
  manager_share numeric(14, 2)
    generated always as (
      round(total_amount
            - round(total_amount * employee_pct, 2)
            - round(total_amount * office_pct, 2), 2)
    ) stored,
  remaining_balance numeric(14, 2)
    generated always as (round(total_amount - amount_paid, 2)) stored,

  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

create index if not exists projects_entry_date_idx on public.projects (entry_date);
create index if not exists projects_employee_id_idx on public.projects (employee_id);
create index if not exists projects_client_id_idx on public.projects (client_id);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- cash_entries  (Cash Book — running ledger)
-- ----------------------------------------------------------------------------
-- The running balance is NOT stored here (it would go stale); it is computed
-- on read via the cash_entries_with_balance view (see 0002_views.sql).
create table if not exists public.cash_entries (
  id          uuid primary key default gen_random_uuid(),
  entry_date  date not null default current_date,
  description text not null,                 -- may contain RTL (Pashto/Dari)
  debit       numeric(14, 2) not null default 0 check (debit >= 0),   -- cash in
  credit      numeric(14, 2) not null default 0 check (credit >= 0),  -- cash out
  currency    text not null default 'AFN' check (currency in ('USD', 'AFN')),
  station     text not null default 'Jalalabad Main Office',
  department  text not null default 'Finance',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null
);

create index if not exists cash_entries_order_idx
  on public.cash_entries (entry_date, created_at);

create trigger cash_entries_set_updated_at
  before update on public.cash_entries
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Migration 0002: dashboard & ledger views
-- ----------------------------------------------------------------------------
-- Views inherit the RLS of their underlying tables when created with
-- security_invoker = true (Postgres 15+ / Supabase). This keeps row access
-- governed by the same policies as the base tables.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Cash Book ledger with running balance.
-- Balance = cumulative (debit - credit) ordered by date then insertion time.
-- S/No. is a 1-based sequence in the same order.
-- ----------------------------------------------------------------------------
create or replace view public.cash_entries_with_balance
with (security_invoker = true) as
select
  c.*,
  row_number() over w as seq_no,
  sum(c.debit - c.credit) over w as balance
from public.cash_entries c
window w as (order by c.entry_date, c.created_at, c.id);

-- ----------------------------------------------------------------------------
-- Cash book summary — totals and current balance.
-- ----------------------------------------------------------------------------
create or replace view public.cash_book_summary
with (security_invoker = true) as
select
  coalesce(sum(debit), 0)           as total_debit,
  coalesce(sum(credit), 0)          as total_credit,
  coalesce(sum(debit - credit), 0)  as current_balance,
  count(*)                          as entry_count
from public.cash_entries;

-- ----------------------------------------------------------------------------
-- Employee earnings — total earned per employee across all projects.
-- LEFT JOIN so employees with no projects still appear (total 0).
-- ----------------------------------------------------------------------------
create or replace view public.employee_earnings
with (security_invoker = true) as
select
  e.id                                  as employee_id,
  e.name,
  e.default_share_pct,
  e.is_active,
  coalesce(sum(p.employee_share), 0)    as total_earned,
  count(p.id)                           as project_count
from public.employees e
left join public.projects p on p.employee_id = e.id
group by e.id, e.name, e.default_share_pct, e.is_active;

-- ----------------------------------------------------------------------------
-- Office / Manager account totals.
-- ----------------------------------------------------------------------------
create or replace view public.office_account_total
with (security_invoker = true) as
select coalesce(sum(office_share), 0) as total from public.projects;

create or replace view public.manager_account_total
with (security_invoker = true) as
select coalesce(sum(manager_share), 0) as total from public.projects;

-- ----------------------------------------------------------------------------
-- Project totals — the spreadsheet "Totals" row.
-- ----------------------------------------------------------------------------
create or replace view public.project_totals
with (security_invoker = true) as
select
  coalesce(sum(total_amount), 0)      as total_amount,
  coalesce(sum(employee_share), 0)    as total_employee_share,
  coalesce(sum(office_share), 0)      as total_office_share,
  coalesce(sum(manager_share), 0)     as total_manager_share,
  coalesce(sum(amount_paid), 0)       as total_amount_paid,
  coalesce(sum(remaining_balance), 0) as total_remaining,
  count(*)                            as project_count
from public.projects;

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

-- ============================================================================
-- Migration 0004: Realtime
-- ----------------------------------------------------------------------------
-- Add the live finance tables to the supabase_realtime publication so edits by
-- one admin propagate to all connected clients. RLS still applies to realtime
-- payloads, so only active users receive changes.
-- ============================================================================

alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.cash_entries;

-- REPLICA IDENTITY FULL lets realtime deliver the previous row on UPDATE/DELETE,
-- which the client uses to reconcile optimistic edits.
alter table public.projects     replica identity full;
alter table public.cash_entries replica identity full;

-- ============================================================================
-- SEED DATA (sample employees, clients, projects, cash entries)
-- ============================================================================
-- ============================================================================
-- Seed data — sample employees, clients, projects and cash entries.
-- ----------------------------------------------------------------------------
-- Safe to run once on a fresh database. Re-running will create duplicates, so
-- only run on an empty dataset (or truncate first). created_by is left null
-- because the seed runs outside of any auth session.
-- ============================================================================

-- Employees -----------------------------------------------------------------
insert into public.employees (name, default_share_pct) values
  ('Adnan',  0.1000),
  ('AB',     0.1000),
  ('Shabir', 0.1000);

-- Clients -------------------------------------------------------------------
insert into public.clients (name) values
  ('Royani Poultry'),
  ('Taif High School'),
  ('Dar al Baraka'),
  ('Anas Hadi');

-- Projects ------------------------------------------------------------------
-- entry_date, name, client, total, currency, employee, emp%, office%, paid
insert into public.projects
  (entry_date, project_name, client_id, client_name, total_amount, currency,
   employee_id, employee_pct, office_pct, amount_paid)
select
  v.entry_date, v.project_name, c.id, v.client_name, v.total_amount, 'USD',
  e.id, v.employee_pct, v.office_pct, v.amount_paid
from (values
  (date '2026-01-15', 'Poultry Management System', 'Royani Poultry',   300, 'Adnan',  0.10, 0.05, 300),
  (date '2026-02-03', 'School Management System',  'Taif High School', 350, 'Adnan',  0.10, 0.05, 200),
  (date '2026-02-20', 'Travel agency website',     'Dar al Baraka',    400, 'AB',     0.10, 0.05,   0),
  (date '2026-03-10', 'Poultry Management System',  'Anas Hadi',       200, 'Shabir', 0.10, 0.05, 170)
) as v(entry_date, project_name, client_name, total_amount, emp_name,
       employee_pct, office_pct, amount_paid)
left join public.clients   c on c.name = v.client_name
left join public.employees e on e.name = v.emp_name;

-- Cash Book entries ---------------------------------------------------------
-- entry_date, description, debit (in), credit (out), currency
insert into public.cash_entries
  (entry_date, description, debit, credit, currency) values
  (date '2026-01-10', '200$ Royani',                       12400,     0, 'AFN'),
  (date '2026-01-11', 'Given to Monshe',                       0, 12400, 'AFN'),
  (date '2026-01-12', 'Watchman',                              0,   400, 'AFN'),
  (date '2026-01-12', 'Imam',                                  0,   100, 'AFN'),
  (date '2026-01-15', '11000 afg borrowed from Obaid',     11000,     0, 'AFN'),
  (date '2026-01-18', 'For rent to Monshe',                    0,  1000, 'AFN');
