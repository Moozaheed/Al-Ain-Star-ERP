"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import type { TooltipValueType } from "recharts";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import api from "@/lib/api";
import { downloadCsv } from "@/lib/downloadCsv";
import { useAuthStore } from "@/store/authStore";
import { CHART_COLORS, CHART_GRID, CHART_TEXT } from "@/lib/chartColors";
import type { DailySalesSummary, SalesByPartRow } from "@/types/reporting";
import type { Branch } from "@/types/auth";

function formatAed(v: number) {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", minimumFractionDigits: 2 }).format(v);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
function firstOfMonth() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

// Only Super Admin / Manager may pick a specific branch or view consolidated
// (all branches) — Branch Manager is always forced to their own branch by
// the backend regardless of what's sent here, so the selector is hidden for
// them entirely rather than shown-but-ignored.
function BranchFilter({ branchId, onChange }: { branchId: number | ""; onChange: (v: number | "") => void }) {
  const roleSlug = useAuthStore((s) => s.user?.role_slug);
  const canPickBranch = roleSlug === "super_admin" || roleSlug === "manager";

  const { data } = useQuery<{ data: Branch[] }>({
    queryKey: ["branches-all"],
    queryFn: async () => (await api.get("/branches", { params: { per_page: 100 } })).data,
    enabled: canPickBranch,
  });

  if (!canPickBranch) return null;

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-700">Branch</label>
      <select
        value={branchId} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]"
      >
        <option value="">All Branches (Consolidated)</option>
        {data?.data.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>
    </div>
  );
}

export function SalesReportsTab() {
  const [view, setView] = useState<"daily" | "by-part">("daily");
  const [branchId, setBranchId] = useState<number | "">("");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-fit gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
          {(["daily", "by-part"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
                view === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {v === "daily" ? "Daily Summary" : "Sales by Part"}
            </button>
          ))}
        </div>
        <BranchFilter branchId={branchId} onChange={setBranchId} />
      </div>

      {view === "daily" ? <DailySummaryView branchId={branchId} /> : <SalesByPartView branchId={branchId} />}
    </div>
  );
}

function DailySummaryView({ branchId }: { branchId: number | "" }) {
  const [date, setDate] = useState(today());

  const { data, isLoading } = useQuery<DailySalesSummary>({
    queryKey: ["report-sales-daily", date, branchId],
    queryFn: async () => (await api.get("/reporting/sales/daily", { params: { date, branch_id: branchId || undefined } })).data.data,
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">Date</label>
        <input
          type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]"
        />
      </div>

      {isLoading || !data ? (
        <Card><CardContent><p className="py-8 text-center text-sm text-gray-400">Loading...</p></CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Kpi label="Invoices" value={String(data.invoice_count)} />
            <Kpi label="Total Ex-VAT" value={formatAed(data.total_ex_vat)} />
            <Kpi label="Total Inc-VAT" value={formatAed(data.total_inc_vat)} />
            <Kpi label="Gross Profit" value={formatAed(data.gross_profit)} accent={data.gross_profit >= 0 ? "green" : "red"} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <BreakdownDonut title="By Payment Mode" data={data.by_payment_mode} formatLabel={(k) => k.replace("_", " ")} />
            <BreakdownDonut title="By Channel" data={data.by_channel} />
          </div>
        </>
      )}
    </div>
  );
}

function BreakdownDonut({ title, data, formatLabel }: { title: string; data: Record<string, number>; formatLabel?: (k: string) => string }) {
  const entries = Object.entries(data);
  const chartData = entries.map(([name, value]) => ({ name: formatLabel ? formatLabel(name) : name, value }));

  return (
    <Card>
      <CardContent>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</p>
        {entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No sales on this date.</p>
        ) : (
          <div className="flex flex-col items-center gap-2 sm:flex-row">
            <div className="h-44 w-full sm:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
                    {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: TooltipValueType | undefined) => formatAed(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex w-full flex-col gap-1.5 sm:w-1/2">
              {chartData.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 capitalize text-gray-600">
                    <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    {d.name}
                  </span>
                  <span className="font-medium text-gray-900">{formatAed(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SalesByPartView({ branchId }: { branchId: number | "" }) {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [sort, setSort] = useState<"total_revenue_ex_vat" | "qty_sold" | "gross_margin_pct">("total_revenue_ex_vat");
  const canExport = useAuthStore((s) => s.hasPermission("reporting.export"));

  const { data, isLoading } = useQuery<{ rows: SalesByPartRow[] }>({
    queryKey: ["report-sales-by-part", from, to, sort, branchId],
    queryFn: async () => (await api.get("/reporting/sales/by-part", { params: { from, to, sort, direction: "desc", top: 50, branch_id: branchId || undefined } })).data.data,
  });

  const rows = data?.rows ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Sort by</label>
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]">
            <option value="total_revenue_ex_vat">Revenue</option>
            <option value="qty_sold">Quantity Sold</option>
            <option value="gross_margin_pct">Margin %</option>
          </select>
        </div>
        {canExport && (
          <button
            onClick={() => downloadCsv("/reporting/sales/by-part", { from, to, sort, direction: "desc", top: 50, branch_id: branchId || undefined }, `sales-by-part_${from}_${to}.csv`)}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:border-[#95271D] hover:text-[#95271D]"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        )}
      </div>

      {rows.length > 0 && (
        <Card>
          <CardContent>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Top 10 by {sort === "qty_sold" ? "Quantity" : sort === "gross_margin_pct" ? "Margin" : "Revenue"}</p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows.slice(0, 10)} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <CartesianGrid horizontal={false} stroke={CHART_GRID} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: CHART_TEXT }} tickFormatter={(v) => sort === "qty_sold" ? String(v) : sort === "gross_margin_pct" ? `${v}%` : formatAed(v)} />
                  <YAxis type="category" dataKey="part_number" width={90} tick={{ fontSize: 11, fill: CHART_TEXT }} />
                  <Tooltip
                    formatter={(v: TooltipValueType | undefined) => sort === "qty_sold" ? Number(v) : sort === "gross_margin_pct" ? `${Number(v)}%` : formatAed(Number(v))}
                    labelFormatter={(label) => rows.find((r) => r.part_number === label)?.part_name ?? label}
                  />
                  <Bar dataKey={sort} fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Part</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Qty Sold</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Revenue</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">COGS</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Gross Profit</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">No sales in this period.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.part_id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-3">
                    <p className="font-mono text-xs font-semibold text-[#95271D]">{r.part_number}</p>
                    <p className="text-gray-600">{r.part_name}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">{r.qty_sold}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{formatAed(r.total_revenue_ex_vat)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatAed(r.total_cogs)}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{formatAed(r.gross_profit)}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{r.gross_margin_pct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: "green" | "red" }) {
  return (
    <Card>
      <CardContent className="py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
        <p className={cn("mt-1 text-lg font-bold", accent === "green" && "text-green-700", accent === "red" && "text-red-700", !accent && "text-gray-900")}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
