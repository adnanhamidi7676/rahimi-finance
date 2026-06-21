# Rahimi Finance

A web-based financial management system for **Rahimi Tech Solution**. It replaces
two Excel files — the **Project Finance** workbook (profit-split per project) and
the **Cash Book** ledger (running cash balance) — with a real-time, cloud-synced,
installable app.

- **Backend:** Supabase (Postgres + Auth + Row Level Security + Realtime)
- **Frontend:** Next.js 16 (App Router, TypeScript) + Tailwind + shadcn/ui
- **Charts/Tables:** Recharts, TanStack Table primitives
- **Installable:** PWA — install from Chrome on desktop & Android, or "Add to
  Home Screen" on iOS
- **Live & shared:** every active admin sees the same data; edits propagate in
  real time across devices

> **Money is computed by the database, never in the browser.** The four project
> split fields and the cash running balance come from Postgres generated columns
> and views, so the figures can never drift.

---

## 1. Prerequisites

- Node.js 20+
- A free [Supabase](https://supabase.com) account
- (For deploy) a [Vercel](https://vercel.com) account

---

## 2. Create the Supabase project

1. Go to **supabase.com → New project**. Pick a name, a strong database
   password, and a region close to your users.
2. Once provisioned, open **Project Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** secret → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ server-only — never
     expose to the browser)

### Run the migrations + seed

Open **SQL Editor** in the Supabase dashboard and run each file in order:

1. `supabase/migrations/0001_core_schema.sql`
2. `supabase/migrations/0002_views.sql`
3. `supabase/migrations/0003_rls.sql`
4. `supabase/migrations/0004_realtime.sql`
5. `supabase/seed.sql` *(optional — loads the four sample projects, employees,
   clients and cash entries)*

> Or, with the [Supabase CLI](https://supabase.com/docs/guides/cli): link the
> project and run `supabase db push`, then paste `seed.sql` in the SQL editor.

### Enable Realtime

Migration `0004` already adds `projects` and `cash_entries` to the realtime
publication. Confirm under **Database → Replication → supabase_realtime** that
both tables are listed.

---

## 3. Create the first admin

There is **no public sign-up** — accounts are created by an admin.

1. **Authentication → Users → Add user** → enter an email + password →
   **Auto Confirm User**.
2. A `profiles` row is created automatically by a trigger, defaulting to role
   `admin`. To be sure, run in the SQL editor:
   ```sql
   update public.profiles set role = 'admin', is_active = true
   where id = (select id from auth.users where email = 'you@example.com');
   ```
3. After signing in, you can create all other users from the in-app **Admin**
   page — no dashboard needed.

---

## 4. Local development

```bash
npm install
cp .env.local.example .env.local   # then fill in the three values from step 2
npm run dev
```

Open <http://localhost:3000> and sign in.

`.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret
```

---

## 5. Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, **Add New → Project**, import the repo.
3. Under **Environment Variables**, add the same three keys from `.env.local`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`).
4. Deploy. Vercel serves over HTTPS, which the PWA install prompt requires.

> **Supabase Auth redirect:** under **Supabase → Authentication → URL
> Configuration**, add your Vercel URL to **Site URL** / redirect allow-list.

---

## 6. Install it as an app

Because the site is a PWA served over HTTPS, it can be installed:

- **Desktop Chrome/Edge:** click the **Install** icon in the address bar (or the
  in-app *Install* button), then **Install**.
- **Android Chrome:** menu **⋮ → Install app / Add to Home screen**.
- **iPhone/iPad (Safari):** **Share ⎋ → Add to Home Screen**. (Chrome on iOS uses
  Safari's engine, so use Safari to install.)

Once installed it opens in its own window like a native app, and all admins share
the same live data.

---

## 7. How the numbers work

- **Project split** (per project), computed by Postgres:
  - Employee Share = Total × Employee %
  - Office Share = Total × Office %
  - Manager Share = Total − Employee Share − Office Share
  - Remaining = Total − Amount Paid
- **Cash Book balance** = running total of (Debit − Credit) ordered by date, from
  the `cash_entries_with_balance` view.
- **Currency is explicit and never auto-converted.** Projects default to **USD**,
  the Cash Book defaults to **AFN**. Project-level aggregate totals (dashboard,
  employee earnings) are shown in USD, matching the original USD-only Project
  Finance spreadsheet.

---

## 8. Roles

| Role | Projects / Cash / Clients / Employees | User management |
|------|----------------------------------------|-----------------|
| `admin` | read + write | yes |
| `manager` | read + write | no |
| `viewer` | read-only | no |

Row Level Security enforces these rules in the database, not just the UI.

---

## 9. Project structure

```
app/
  (app)/            protected, shell-wrapped pages (dashboard, projects, …)
  login/            public sign-in
  offline/          PWA offline fallback
  manifest.ts       web app manifest
lib/
  supabase/         server / client / proxy / admin Supabase helpers
  db/               typed query functions (cash, projects, dashboard)
  auth.ts           session + role guards
  format.ts         money / date display helpers (display only)
  validations.ts    Zod schemas
components/         UI (nav, cashbook, projects, employees, admin, dashboard)
supabase/migrations + seed.sql
public/sw.js        conservative service worker (never caches API/auth)
```

See **[docs/USAGE.md](docs/USAGE.md)** for a non-technical guide to adding
projects and cash entries.
