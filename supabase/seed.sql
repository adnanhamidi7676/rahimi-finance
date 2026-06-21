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
