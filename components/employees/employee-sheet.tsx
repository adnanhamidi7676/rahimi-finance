"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { employeeSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Employee } from "@/types/database.types";

type Props = {
  employee?: Employee;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

export function EmployeeSheet({ employee, open, onOpenChange, onSaved }: Props) {
  const isEdit = Boolean(employee);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState(employee?.name ?? "");
  const [pct, setPct] = useState(
    employee ? String(Math.round(employee.default_share_pct * 1000) / 10) : "10",
  );
  const [active, setActive] = useState(employee?.is_active ?? true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = employeeSchema.safeParse({
      name,
      default_share_pct: Number(pct) / 100,
      is_active: active,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }

    setPending(true);
    const supabase = createClient();
    let error;
    if (isEdit && employee) {
      ({ error } = await supabase
        .from("employees")
        .update(parsed.data)
        .eq("id", employee.id));
    } else {
      ({ error } = await supabase.from("employees").insert(parsed.data));
    }
    setPending(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(isEdit ? "Employee updated" : "Employee added");
    onOpenChange(false);
    onSaved?.();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl p-5"
      >
        <SheetHeader className="px-0">
          <SheetTitle>{isEdit ? "Edit employee" : "Add employee"}</SheetTitle>
          <SheetDescription>
            The default share % is suggested when this employee is assigned to a
            new project.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emp_name">Name</Label>
            <Input
              id="emp_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Adnan"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emp_pct">Default share %</Label>
            <div className="relative w-32">
              <Input
                id="emp_pct"
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                max="100"
                value={pct}
                onChange={(e) => setPct(e.target.value)}
                className="tabular pr-7"
              />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                %
              </span>
            </div>
          </div>

          {isEdit ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="size-4"
              />
              Active (available for new projects)
            </label>
          ) : null}

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
              {pending ? "Saving…" : isEdit ? "Save changes" : "Add employee"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
