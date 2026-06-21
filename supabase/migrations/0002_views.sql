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
