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
