"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { projectSchema } from "@/lib/validations";
import { todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/forms/native-select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Project, Employee, Client, Currency } from "@/types/database.types";

type Props = {
  employees: Employee[];
  clients: Client[];
  project?: Project; // present => edit mode
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

// UI keeps percentages as whole numbers (10, 5); the DB stores fractions.
const toPctInput = (frac: number) => String(Math.round(frac * 1000) / 10);

export function ProjectSheet({
  employees,
  clients,
  project,
  open,
  onOpenChange,
  onSaved,
}: Props) {
  const isEdit = Boolean(project);
  const [pending, setPending] = useState(false);

  const [entryDate, setEntryDate] = useState(project?.entry_date ?? todayISO());
  const [name, setName] = useState(project?.project_name ?? "");
  const [clientId, setClientId] = useState(project?.client_id ?? "");
  const [totalAmount, setTotalAmount] = useState(
    project ? String(project.total_amount) : "",
  );
  const [currency, setCurrency] = useState<Currency>(project?.currency ?? "USD");
  const [employeeId, setEmployeeId] = useState(project?.employee_id ?? "");
  const [employeePct, setEmployeePct] = useState(
    project ? toPctInput(project.employee_pct) : "10",
  );
  const [officePct, setOfficePct] = useState(
    project ? toPctInput(project.office_pct) : "5",
  );
  const [amountPaid, setAmountPaid] = useState(
    project ? String(project.amount_paid) : "0",
  );
  const [notes, setNotes] = useState(project?.notes ?? "");

  function onEmployeeChange(id: string) {
    setEmployeeId(id);
    const emp = employees.find((e) => e.id === id);
    if (emp && !isEdit) setEmployeePct(toPctInput(emp.default_share_pct));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const client = clients.find((c) => c.id === clientId);
    const candidate = {
      entry_date: entryDate,
      project_name: name,
      client_id: clientId || null,
      client_name: client?.name ?? null,
      total_amount: Number(totalAmount),
      currency,
      employee_id: employeeId || null,
      employee_pct: Number(employeePct) / 100,
      office_pct: Number(officePct) / 100,
      amount_paid: Number(amountPaid || 0),
      notes: notes.trim() || null,
    };

    const parsed = projectSchema.safeParse(candidate);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }

    setPending(true);
    const supabase = createClient();

    let error;
    if (isEdit && project) {
      ({ error } = await supabase
        .from("projects")
        .update(parsed.data)
        .eq("id", project.id));
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      ({ error } = await supabase
        .from("projects")
        .insert({ ...parsed.data, created_by: user?.id ?? null }));
    }
    setPending(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(isEdit ? "Project updated" : "Project added");
    onOpenChange(false);
    onSaved?.();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl p-5"
      >
        <SheetHeader className="px-0">
          <SheetTitle>{isEdit ? "Edit project" : "Add project"}</SheetTitle>
          <SheetDescription>
            Enter project details. Shares and remaining balance are calculated
            automatically.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project_name">Project name</Label>
            <Input
              id="project_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Poultry Management System"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              <NativeSelect
                id="client"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                <option value="">— None —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label htmlFor="entry_date">Date</Label>
              <Input
                id="entry_date"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="total_amount">Total amount</Label>
            <div className="flex gap-2">
              <Input
                id="total_amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="tabular text-lg"
                required
              />
              <div className="flex shrink-0 overflow-hidden rounded-md border">
                {(["USD", "AFN"] as Currency[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrency(c)}
                    className={cn(
                      "px-3 text-sm font-medium",
                      currency === c
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="employee">Employee</Label>
            <NativeSelect
              id="employee"
              value={employeeId}
              onChange={(e) => onEmployeeChange(e.target.value)}
            >
              <option value="">— Unassigned —</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="employee_pct">Employee %</Label>
              <PctInput
                id="employee_pct"
                value={employeePct}
                onChange={setEmployeePct}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="office_pct">Office %</Label>
              <PctInput
                id="office_pct"
                value={officePct}
                onChange={setOfficePct}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount_paid">Amount paid</Label>
              <Input
                id="amount_paid"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="tabular"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              dir="auto"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
              className="font-arabic"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Add project"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function PctInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        step="0.1"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="tabular pr-7"
      />
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        %
      </span>
    </div>
  );
}
