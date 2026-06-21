"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cashEntrySchema } from "@/lib/validations";
import { todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Currency } from "@/types/database.types";

type Direction = "debit" | "credit";

const DEFAULTS = {
  station: "Jalalabad Main Office",
  department: "Finance",
};

export function CashEntrySheet({ onSaved }: { onSaved?: () => void }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const [entryDate, setEntryDate] = useState(todayISO);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<Direction>("debit");
  const [currency, setCurrency] = useState<Currency>("AFN");

  function reset() {
    setEntryDate(todayISO());
    setDescription("");
    setAmount("");
    setDirection("debit");
    setCurrency("AFN");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    const candidate = {
      entry_date: entryDate,
      description,
      debit: direction === "debit" ? value : 0,
      credit: direction === "credit" ? value : 0,
      currency,
      station: DEFAULTS.station,
      department: DEFAULTS.department,
    };

    const parsed = cashEntrySchema.safeParse(candidate);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("cash_entries")
      .insert({ ...parsed.data, created_by: user?.id ?? null });
    setPending(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Cash entry added");
    reset();
    setOpen(false);
    onSaved?.();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button size="sm">
            <Plus className="size-4" />
            Add Entry
          </Button>
        }
      />
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl p-5"
      >
        <SheetHeader className="px-0">
          <SheetTitle>Add cash entry</SheetTitle>
          <SheetDescription>
            Record money received (cash in) or paid out (cash out).
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Direction */}
          <div className="grid grid-cols-2 gap-2">
            <DirectionButton
              active={direction === "debit"}
              tone="in"
              onClick={() => setDirection("debit")}
            >
              Cash In (Debit)
            </DirectionButton>
            <DirectionButton
              active={direction === "credit"}
              tone="out"
              onClick={() => setDirection("credit")}
            >
              Cash Out (Credit)
            </DirectionButton>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="flex gap-2">
              <Input
                id="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="tabular text-lg"
                required
              />
              <div className="flex shrink-0 overflow-hidden rounded-md border">
                {(["AFN", "USD"] as Currency[]).map((c) => (
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
            <Label htmlFor="description">Description (تفصیل)</Label>
            <Input
              id="description"
              dir="auto"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was the cash for?"
              className="font-arabic"
              required
            />
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

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={pending}>
              {pending ? "Saving…" : "Save entry"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function DirectionButton({
  active,
  tone,
  onClick,
  children,
}: {
  active: boolean;
  tone: "in" | "out";
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border px-3 py-2.5 text-sm font-medium transition-colors",
        !active && "bg-background text-muted-foreground hover:bg-accent",
        active && tone === "in" && "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        active && tone === "out" && "border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-400",
      )}
    >
      {children}
    </button>
  );
}
