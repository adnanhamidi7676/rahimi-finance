"use client";

import { useState } from "react";
import { Pencil, Plus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchEmployees } from "@/lib/db/projects";
import { fetchEmployeeEarnings } from "@/lib/db/dashboard";
import { formatMoney, formatPct, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmployeeSheet } from "./employee-sheet";
import type { Employee, EmployeeEarning } from "@/types/database.types";

export function EmployeesClient({
  initialEarnings,
  initialEmployees,
  canWrite,
}: {
  initialEarnings: EmployeeEarning[];
  initialEmployees: Employee[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [earnings, setEarnings] = useState(initialEarnings);
  const [employees, setEmployees] = useState(initialEmployees);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | undefined>(undefined);

  async function refresh() {
    const supabase = createClient();
    const [e, emps] = await Promise.all([
      fetchEmployeeEarnings(supabase),
      fetchEmployees(supabase),
    ]);
    setEarnings(e);
    setEmployees(emps);
    router.refresh();
  }

  function openAdd() {
    setEditing(undefined);
    setOpen(true);
  }
  function openEdit(id: string) {
    setEditing(employees.find((e) => e.id === id));
    setOpen(true);
  }

  const grandTotal = earnings.reduce((s, e) => s + Number(e.total_earned), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Total employee shares</p>
          <p className="tabular text-2xl font-semibold">
            {formatMoney(grandTotal, "USD")}
          </p>
        </div>
        {canWrite ? (
          <Button size="sm" onClick={openAdd}>
            <Plus className="size-4" />
            Add Employee
          </Button>
        ) : null}
      </div>

      {earnings.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Users className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-2 font-medium">No employees yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {canWrite
              ? "Add an employee to start tracking their share."
              : "Employees will appear here once an admin adds them."}
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {earnings.map((e) => (
            <li key={e.employee_id}>
              <Card className={cn(!e.is_active && "opacity-60")}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
                        {e.name.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <p className="font-semibold">{e.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Default {formatPct(e.default_share_pct)}
                          {!e.is_active ? " · inactive" : ""}
                        </p>
                      </div>
                    </div>
                    {canWrite ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${e.name}`}
                        onClick={() => openEdit(e.employee_id)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    ) : null}
                  </div>

                  <div className="flex items-end justify-between border-t pt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Total earned
                      </p>
                      <p className="tabular text-xl font-semibold">
                        {formatMoney(e.total_earned, "USD")}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {formatNumber(e.project_count).replace(".00", "")} project
                      {Number(e.project_count) === 1 ? "" : "s"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {canWrite ? (
        <EmployeeSheet
          key={editing?.id ?? "new"}
          employee={editing}
          open={open}
          onOpenChange={setOpen}
          onSaved={refresh}
        />
      ) : null}
    </div>
  );
}
