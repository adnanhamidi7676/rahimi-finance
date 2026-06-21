"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  TrendingUp,
  Wallet,
  AlertCircle,
  Building2,
  UserCog,
  BookOpen,
} from "lucide-react";
import { formatMoney, toNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardData } from "@/lib/db/dashboard";

const SPLIT_COLORS = ["#10b981", "#3b82f6", "#f59e0b"]; // emp / office / manager

export function DashboardClient({ data }: { data: DashboardData }) {
  const { projectTotals: pt, cashSummary, officeTotal, managerTotal } = data;

  const incomeByMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of data.projectsForChart) {
      const key = p.entry_date.slice(0, 7); // YYYY-MM
      map.set(key, (map.get(key) ?? 0) + toNumber(p.total_amount));
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({
        month: new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        }),
        total,
      }));
  }, [data.projectsForChart]);

  const splitData = useMemo(
    () => [
      { name: "Employees", value: toNumber(pt.total_employee_share) },
      { name: "Office", value: toNumber(pt.total_office_share) },
      { name: "Manager", value: toNumber(pt.total_manager_share) },
    ],
    [pt],
  );

  const hasSplit = splitData.some((s) => s.value > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat
          icon={TrendingUp}
          label="Total Income"
          value={formatMoney(pt.total_amount, "USD")}
        />
        <Stat
          icon={Wallet}
          label="Total Paid"
          value={formatMoney(pt.total_amount_paid, "USD")}
          tone="good"
        />
        <Stat
          icon={AlertCircle}
          label="Outstanding"
          value={formatMoney(pt.total_remaining, "USD")}
          tone={toNumber(pt.total_remaining) > 0 ? "bad" : "good"}
        />
        <Stat
          icon={Building2}
          label="Office Account"
          value={formatMoney(officeTotal, "USD")}
        />
        <Stat
          icon={UserCog}
          label="Manager Account"
          value={formatMoney(managerTotal, "USD")}
        />
        <Stat
          icon={BookOpen}
          label="Cash Book Balance"
          value={formatMoney(cashSummary.current_balance, "AFN")}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Income by month</CardTitle>
          </CardHeader>
          <CardContent>
            {incomeByMonth.length === 0 ? (
              <Empty />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={incomeByMonth}>
                  <XAxis
                    dataKey="month"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                  />
                  <Tooltip
                    formatter={(value) =>
                      formatMoney(toNumber(value as number), "USD")
                    }
                    cursor={{ fill: "rgba(0,0,0,0.04)" }}
                  />
                  <Bar
                    dataKey="total"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    name="Income"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profit split</CardTitle>
          </CardHeader>
          <CardContent>
            {!hasSplit ? (
              <Empty />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={splitData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {splitData.map((_, i) => (
                      <Cell key={i} fill={SPLIT_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) =>
                      formatMoney(toNumber(value as number), "USD")
                    }
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  return (
    <Card>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="size-4" />
          <span className="text-xs sm:text-sm">{label}</span>
        </div>
        <p
          className={cn(
            "tabular mt-1.5 text-lg font-semibold sm:text-2xl",
            tone === "good" && "text-emerald-600 dark:text-emerald-400",
            tone === "bad" && "text-rose-600 dark:text-rose-400",
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function Empty() {
  return (
    <div className="flex h-65 items-center justify-center text-sm text-muted-foreground">
      No data yet
    </div>
  );
}
