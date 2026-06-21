"use client";

import { useCallback, useEffect, useState } from "react";
import { Wifi } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchCashLedger, fetchCashSummary } from "@/lib/db/cash";
import { formatMoney, formatDate, formatNumber, toNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { CashEntrySheet } from "./cash-entry-sheet";
import type {
  CashEntryWithBalance,
  CashBookSummary,
} from "@/types/database.types";

type Props = {
  initialEntries: CashEntryWithBalance[];
  initialSummary: CashBookSummary;
  canWrite: boolean;
  station: string;
  department: string;
};

export function CashBookClient({
  initialEntries,
  initialSummary,
  canWrite,
  station,
  department,
}: Props) {
  const [entries, setEntries] = useState(initialEntries);
  const [summary, setSummary] = useState(initialSummary);
  const [live, setLive] = useState(false);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const [ledger, sum] = await Promise.all([
      fetchCashLedger(supabase),
      fetchCashSummary(supabase),
    ]);
    setEntries(ledger);
    setSummary(sum);
  }, []);

  // Realtime: any change to cash_entries (from any admin/device) refreshes the
  // ledger so the running balance stays correct for everyone.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("cash_entries_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cash_entries" },
        () => {
          void refresh();
        },
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  const balanceCurrency = entries.at(-1)?.currency ?? "AFN";

  return (
    <div className="space-y-4">
      {/* Header meta */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:flex sm:gap-6">
          <Meta label="Station" value={station} />
          <Meta label="Department" value={department} />
          <Meta
            label="Status"
            value={
              <span className="inline-flex items-center gap-1">
                <Wifi
                  className={cn(
                    "size-3.5",
                    live ? "text-emerald-500" : "text-muted-foreground",
                  )}
                />
                {live ? "Live" : "Connecting…"}
              </span>
            }
          />
        </dl>
        {canWrite ? <CashEntrySheet onSaved={refresh} /> : null}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard
          label="Total In"
          value={formatNumber(summary.total_debit)}
          tone="in"
        />
        <SummaryCard
          label="Total Out"
          value={formatNumber(summary.total_credit)}
          tone="out"
        />
        <SummaryCard
          label="Balance"
          value={formatMoney(summary.current_balance, balanceCurrency)}
          tone="balance"
        />
      </div>

      {entries.length === 0 ? (
        <EmptyState canWrite={canWrite} />
      ) : (
        <>
          {/* Desktop / tablet table */}
          <div className="hidden overflow-x-auto rounded-lg border sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">S/No.</TableHead>
                  <TableHead className="w-28">Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit (In)</TableHead>
                  <TableHead className="text-right">Credit (Out)</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-muted-foreground">
                      {e.seq_no}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(e.entry_date)}
                    </TableCell>
                    <TableCell dir="auto" className="font-arabic max-w-xs">
                      {e.description}
                    </TableCell>
                    <TableCell className="tabular text-right text-emerald-600 dark:text-emerald-400">
                      {toNumber(e.debit) > 0 ? formatNumber(e.debit) : "—"}
                    </TableCell>
                    <TableCell className="tabular text-right text-rose-600 dark:text-rose-400">
                      {toNumber(e.credit) > 0 ? formatNumber(e.credit) : "—"}
                    </TableCell>
                    <TableCell className="tabular text-right font-medium">
                      {formatMoney(e.balance, e.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-2 sm:hidden">
            {[...entries].reverse().map((e) => (
              <li key={e.id}>
                <Card>
                  <CardContent className="flex items-start justify-between gap-3 p-3">
                    <div className="min-w-0 space-y-1">
                      <p
                        dir="auto"
                        className="font-arabic truncate font-medium"
                      >
                        {e.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        #{e.seq_no} · {formatDate(e.entry_date)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={cn(
                          "tabular font-semibold",
                          toNumber(e.debit) > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400",
                        )}
                      >
                        {toNumber(e.debit) > 0
                          ? `+${formatNumber(e.debit)}`
                          : `−${formatNumber(e.credit)}`}
                      </p>
                      <p className="tabular text-xs text-muted-foreground">
                        {formatMoney(e.balance, e.currency)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Meta({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "in" | "out" | "balance";
}) {
  return (
    <Card>
      <CardContent className="p-3 sm:p-4">
        <p className="text-xs text-muted-foreground sm:text-sm">{label}</p>
        <p
          className={cn(
            "tabular mt-1 text-base font-semibold sm:text-xl",
            tone === "in" && "text-emerald-600 dark:text-emerald-400",
            tone === "out" && "text-rose-600 dark:text-rose-400",
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function EmptyState({ canWrite }: { canWrite: boolean }) {
  return (
    <div className="rounded-lg border border-dashed p-10 text-center">
      <p className="font-medium">No cash entries yet</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {canWrite
          ? "Add your first entry to start the ledger."
          : "Entries will appear here once an admin adds them."}
      </p>
    </div>
  );
}
