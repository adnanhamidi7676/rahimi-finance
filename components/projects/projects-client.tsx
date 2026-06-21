"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MoreVertical, Pencil, Plus, Search, Trash2, Wifi } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { fetchProjects } from "@/lib/db/projects";
import { formatMoney, formatDate, formatPct, toNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect } from "@/components/forms/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjectSheet } from "./project-sheet";
import type {
  Project,
  Employee,
  Client,
  Currency,
} from "@/types/database.types";

type PaidFilter = "all" | "paid" | "unpaid";

const COMPUTED = "bg-muted/50"; // grey cue for DB-calculated columns

export function ProjectsClient({
  initialProjects,
  employees,
  clients,
  canWrite,
}: {
  initialProjects: Project[];
  employees: Employee[];
  clients: Client[];
  canWrite: boolean;
}) {
  const [projects, setProjects] = useState(initialProjects);
  const [live, setLive] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [clientId, setClientId] = useState("");
  const [paid, setPaid] = useState<PaidFilter>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Add/edit sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Project | undefined>(undefined);

  const employeeName = useMemo(
    () => new Map(employees.map((e) => [e.id, e.name])),
    [employees],
  );

  const refresh = useCallback(async () => {
    const supabase = createClient();
    setProjects(await fetchProjects(supabase));
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("projects_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        () => void refresh(),
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (q) {
        const hay = `${p.project_name} ${p.client_name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (employeeId === "unassigned" && p.employee_id) return false;
      if (employeeId && employeeId !== "unassigned" && p.employee_id !== employeeId)
        return false;
      if (clientId === "none" && p.client_id) return false;
      if (clientId && clientId !== "none" && p.client_id !== clientId)
        return false;
      if (paid === "paid" && toNumber(p.remaining_balance) > 0) return false;
      if (paid === "unpaid" && toNumber(p.remaining_balance) <= 0) return false;
      if (from && p.entry_date < from) return false;
      if (to && p.entry_date > to) return false;
      return true;
    });
  }, [projects, search, employeeId, clientId, paid, from, to]);

  // Totals grouped by currency (never mix currencies). Summing stored DB values
  // is fine — we are not recomputing the split here.
  const totalsByCurrency = useMemo(() => {
    const map = new Map<
      Currency,
      {
        total: number;
        emp: number;
        office: number;
        mgr: number;
        paid: number;
        remaining: number;
      }
    >();
    for (const p of filtered) {
      const cur = p.currency;
      const t =
        map.get(cur) ??
        { total: 0, emp: 0, office: 0, mgr: 0, paid: 0, remaining: 0 };
      t.total += toNumber(p.total_amount);
      t.emp += toNumber(p.employee_share);
      t.office += toNumber(p.office_share);
      t.mgr += toNumber(p.manager_share);
      t.paid += toNumber(p.amount_paid);
      t.remaining += toNumber(p.remaining_balance);
      map.set(cur, t);
    }
    return map;
  }, [filtered]);

  function openAdd() {
    setEditing(undefined);
    setSheetOpen(true);
  }
  function openEdit(p: Project) {
    setEditing(p);
    setSheetOpen(true);
  }

  async function handleDelete(p: Project) {
    if (!window.confirm(`Delete project "${p.project_name}"? This cannot be undone.`))
      return;
    const supabase = createClient();
    const { error } = await supabase.from("projects").delete().eq("id", p.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Project deleted");
    void refresh();
  }

  const hasFilters =
    search || employeeId || clientId || paid !== "all" || from || to;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Wifi
              className={cn(
                "size-3.5",
                live ? "text-emerald-500" : "text-muted-foreground",
              )}
            />
            {live ? "Live" : "Connecting…"}
          </span>
          {canWrite ? (
            <Button size="sm" onClick={openAdd}>
              <Plus className="size-4" />
              Add Project
            </Button>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <div className="relative col-span-2 sm:col-span-3 lg:col-span-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search project or client"
              className="pl-9"
            />
          </div>
          <NativeSelect
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            aria-label="Filter by employee"
          >
            <option value="">All employees</option>
            <option value="unassigned">Unassigned</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            aria-label="Filter by client"
          >
            <option value="">All clients</option>
            <option value="none">No client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            value={paid}
            onChange={(e) => setPaid(e.target.value as PaidFilter)}
            aria-label="Filter by payment status"
          >
            <option value="all">All statuses</option>
            <option value="paid">Fully paid</option>
            <option value="unpaid">Outstanding</option>
          </NativeSelect>
          <div className="flex items-center gap-1">
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              aria-label="From date"
              className="px-2"
            />
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              aria-label="To date"
              className="px-2"
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState canWrite={canWrite} filtered={Boolean(hasFilters)} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-lg border lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Date</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Emp %</TableHead>
                  <TableHead className={cn("text-right", COMPUTED)}>
                    Emp Share
                  </TableHead>
                  <TableHead className="text-right">Off %</TableHead>
                  <TableHead className={cn("text-right", COMPUTED)}>
                    Office Share
                  </TableHead>
                  <TableHead className={cn("text-right", COMPUTED)}>
                    Mgr Share
                  </TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className={cn("text-right", COMPUTED)}>
                    Remaining
                  </TableHead>
                  {canWrite ? <TableHead className="w-10" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(p.entry_date)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {p.project_name}
                    </TableCell>
                    <TableCell dir="auto" className="font-arabic">
                      {p.client_name ?? "—"}
                    </TableCell>
                    <TableCell className="tabular text-right">
                      {formatMoney(p.total_amount, p.currency)}
                    </TableCell>
                    <TableCell>
                      {p.employee_id ? (
                        employeeName.get(p.employee_id) ?? "—"
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="tabular text-right text-muted-foreground">
                      {formatPct(p.employee_pct)}
                    </TableCell>
                    <TableCell className={cn("tabular text-right", COMPUTED)}>
                      {formatMoney(p.employee_share, p.currency)}
                    </TableCell>
                    <TableCell className="tabular text-right text-muted-foreground">
                      {formatPct(p.office_pct)}
                    </TableCell>
                    <TableCell className={cn("tabular text-right", COMPUTED)}>
                      {formatMoney(p.office_share, p.currency)}
                    </TableCell>
                    <TableCell
                      className={cn("tabular text-right font-medium", COMPUTED)}
                    >
                      {formatMoney(p.manager_share, p.currency)}
                    </TableCell>
                    <TableCell className="tabular text-right">
                      {formatMoney(p.amount_paid, p.currency)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "tabular text-right font-medium",
                        COMPUTED,
                        toNumber(p.remaining_balance) > 0
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-emerald-600 dark:text-emerald-400",
                      )}
                    >
                      {formatMoney(p.remaining_balance, p.currency)}
                    </TableCell>
                    {canWrite ? (
                      <TableCell className="p-1">
                        <RowActions
                          onEdit={() => openEdit(p)}
                          onDelete={() => handleDelete(p)}
                        />
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                {[...totalsByCurrency.entries()].map(([cur, t]) => (
                  <TableRow key={cur}>
                    <TableCell colSpan={3} className="font-semibold">
                      Totals ({cur})
                    </TableCell>
                    <TableCell className="tabular text-right font-semibold">
                      {formatMoney(t.total, cur)}
                    </TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell
                      className={cn("tabular text-right font-semibold", COMPUTED)}
                    >
                      {formatMoney(t.emp, cur)}
                    </TableCell>
                    <TableCell />
                    <TableCell
                      className={cn("tabular text-right font-semibold", COMPUTED)}
                    >
                      {formatMoney(t.office, cur)}
                    </TableCell>
                    <TableCell
                      className={cn("tabular text-right font-semibold", COMPUTED)}
                    >
                      {formatMoney(t.mgr, cur)}
                    </TableCell>
                    <TableCell className="tabular text-right font-semibold">
                      {formatMoney(t.paid, cur)}
                    </TableCell>
                    <TableCell
                      className={cn("tabular text-right font-semibold", COMPUTED)}
                    >
                      {formatMoney(t.remaining, cur)}
                    </TableCell>
                    {canWrite ? <TableCell /> : null}
                  </TableRow>
                ))}
              </TableFooter>
            </Table>
          </div>

          {/* Mobile / tablet cards */}
          <ul className="space-y-3 lg:hidden">
            {filtered.map((p) => (
              <li key={p.id}>
                <ProjectCard
                  project={p}
                  employeeName={
                    p.employee_id ? employeeName.get(p.employee_id) : undefined
                  }
                  canWrite={canWrite}
                  onEdit={() => openEdit(p)}
                  onDelete={() => handleDelete(p)}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      {canWrite ? (
        <ProjectSheet
          key={editing?.id ?? "new"}
          employees={employees}
          clients={clients}
          project={editing}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          onSaved={refresh}
        />
      ) : null}
    </div>
  );
}

function RowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Row actions">
            <MoreVertical className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="mr-2 size-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProjectCard({
  project: p,
  employeeName,
  canWrite,
  onEdit,
  onDelete,
}: {
  project: Project;
  employeeName?: string;
  canWrite: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const remaining = toNumber(p.remaining_balance);
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold">{p.project_name}</p>
            <p dir="auto" className="font-arabic truncate text-sm text-muted-foreground">
              {p.client_name ?? "No client"} · {formatDate(p.entry_date)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={remaining > 0 ? "destructive" : "secondary"}>
              {remaining > 0 ? "Outstanding" : "Paid"}
            </Badge>
            {canWrite ? <RowActions onEdit={onEdit} onDelete={onDelete} /> : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          <Field label="Total" value={formatMoney(p.total_amount, p.currency)} />
          <Field label="Paid" value={formatMoney(p.amount_paid, p.currency)} />
          <Field
            label="Employee"
            value={`${employeeName ?? "—"} (${formatPct(p.employee_pct)})`}
          />
          <Field
            label="Emp share"
            value={formatMoney(p.employee_share, p.currency)}
            muted
          />
          <Field
            label="Office share"
            value={formatMoney(p.office_share, p.currency)}
            muted
          />
          <Field
            label="Manager share"
            value={formatMoney(p.manager_share, p.currency)}
            muted
          />
        </div>

        <div className="flex items-center justify-between border-t pt-2">
          <span className="text-sm text-muted-foreground">Remaining</span>
          <span
            className={cn(
              "tabular font-semibold",
              remaining > 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-emerald-600 dark:text-emerald-400",
            )}
          >
            {formatMoney(p.remaining_balance, p.currency)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular text-right", muted && "text-muted-foreground")}>
        {value}
      </span>
    </div>
  );
}

function EmptyState({
  canWrite,
  filtered,
}: {
  canWrite: boolean;
  filtered: boolean;
}) {
  return (
    <div className="rounded-lg border border-dashed p-10 text-center">
      <p className="font-medium">
        {filtered ? "No projects match your filters" : "No projects yet"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {filtered
          ? "Try clearing the search or filters."
          : canWrite
            ? "Add your first project to get started."
            : "Projects will appear here once an admin adds them."}
      </p>
    </div>
  );
}
