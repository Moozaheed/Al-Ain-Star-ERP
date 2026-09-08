"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Search } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";
import type { TooltipValueType } from "recharts";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import api from "@/lib/api";
import { downloadCsv } from "@/lib/downloadCsv";
import { useAuthStore } from "@/store/authStore";
import { CHART_COLORS, CHART_GRID, CHART_TEXT } from "@/lib/chartColors";
import type { AgeBucket, StockAgeingReport, StockBalanceReport } from "@/types/reporting";

function formatAed(v: number) {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", minimumFractionDigits: 2 }).format(v);
}

const BUCKET_LABEL: Record<AgeBucket, string> = {
  days_0_30: "0-30 Days",
  days_31_60: "31-60 Days",
  days_61_90: "61-90 Days",
  days_91_180: "91-180 Days",
  days_180_plus: "180+ Days",
};

export function StockReportsTab() {
  const [view, setView] = useState<"balance" | "ageing">("balance");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex w-fit gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
        {(["balance", "ageing"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
              view === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            {v === "balance" ? "Stock Balance" : "Stock Ageing"}
          </button>
        ))}
      </div>

      {view === "balance" ? <StockBalanceView /> : <StockAgeingView />}
    </div>
  );
}

function StockBalanceView() {
  const [search, setSearch] = useState("");
  const canExport = useAuthStore((s) => s.hasPermission("reporting.export"));

  const { data, isLoading } = useQuery<StockBalanceReport>({
    queryKey: ["report-stock-balance", search],
    queryFn: async () => (await api.get("/reporting/inventory/stock-balance", { params: { search: search || undefined } })).data.data,
  });

  const rows = data?.rows ?? [];

  const byCategory = useMemo(() => {
    const totals = new Map<string, number>();
    for (const r of data?.rows ?? []) {
      const key = r.category_name ?? "Uncategorized";
      totals.set(key, (totals.get(key) ?? 0) + r.value);
    }
    return Array.from(totals, ([category, value]) => ({ category, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [data]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search part number or description..."
            className="w-72 rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]"
          />
        </div>
        {data && (
          <div className="ml-auto text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Total Stock Value</p>
            <p className="text-lg font-bold text-gray-900">{formatAed(data.total_value)}</p>
          </div>
        )}
        {canExport && (
          <button
            onClick={() => downloadCsv("/reporting/inventory/stock-balance", { search: search || undefined }, "stock-balance.csv")}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:border-[#95271D] hover:text-[#95271D]"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        )}
      </div>

      {byCategory.length > 0 && (
        <Card>
          <CardContent>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Stock Value by Category</p>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCategory} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid vertical={false} stroke={CHART_GRID} />
                  <XAxis dataKey="category" tick={{ fontSize: 11, fill: CHART_TEXT }} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11, fill: CHART_TEXT }} tickFormatter={(v) => formatAed(v)} width={70} />
                  <Tooltip formatter={(v: TooltipValueType | undefined) => formatAed(Number(v))} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {byCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
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
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Branch</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Qty</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Avg Cost</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Value</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">No stock found.</td></tr>
              ) : rows.map((r, i) => (
                <tr key={`${r.part_id}-${r.branch_id}-${i}`} className="hover:bg-gray-50/50">
                  <td className="px-6 py-3">
                    <p className="font-mono text-xs font-semibold text-[#95271D]">{r.part_number}</p>
                    <p className="text-gray-600">{r.part_name}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.branch_name}</td>
                  <td className={cn("px-4 py-3 text-right font-medium", r.is_zero_stock ? "text-red-600" : "text-gray-900")}>{r.qty}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatAed(r.avg_cost)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{formatAed(r.value)}</td>
                  <td className="px-4 py-3">
                    {r.is_zero_stock ? (
                      <Badge variant="danger">Zero Stock</Badge>
                    ) : r.is_low_stock ? (
                      <Badge variant="warning">Low Stock</Badge>
                    ) : (
                      <Badge variant="success">OK</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function StockAgeingView() {
  const [minAgeDays, setMinAgeDays] = useState(0);
  const canExport = useAuthStore((s) => s.hasPermission("reporting.export"));

  const { data, isLoading } = useQuery<StockAgeingReport>({
    queryKey: ["report-stock-ageing", minAgeDays],
    queryFn: async () => (await api.get("/reporting/inventory/stock-ageing", { params: { min_age_days: minAgeDays } })).data.data,
  });

  const rows = data?.rows ?? [];
  const buckets: AgeBucket[] = ["days_0_30", "days_31_60", "days_61_90", "days_91_180", "days_180_plus"];
  const bucketChartData = buckets.map((b) => ({ bucket: BUCKET_LABEL[b], value: data?.bucket_totals[b] ?? 0, isRisk: b === "days_180_plus" }));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {buckets.map((b) => (
          <Card key={b}>
            <CardContent className="py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{BUCKET_LABEL[b]}</p>
              <p className={cn("mt-1 text-lg font-bold", b === "days_180_plus" ? "text-red-600" : "text-gray-900")}>
                {formatAed(data?.bucket_totals[b] ?? 0)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {data && (
        <Card>
          <CardContent>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Value at Risk by Age</p>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bucketChartData} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid vertical={false} stroke={CHART_GRID} />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: CHART_TEXT }} />
                  <YAxis tick={{ fontSize: 11, fill: CHART_TEXT }} tickFormatter={(v) => formatAed(v)} width={70} />
                  <Tooltip formatter={(v: TooltipValueType | undefined) => formatAed(Number(v))} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {bucketChartData.map((d, i) => <Cell key={i} fill={d.isRisk ? "#DC2626" : CHART_COLORS[0]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Minimum Age (days)</label>
          <input
            type="number" min={0} value={minAgeDays} onChange={(e) => setMinAgeDays(Number(e.target.value) || 0)}
            className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]"
          />
        </div>
        {canExport && (
          <button
            onClick={() => downloadCsv("/reporting/inventory/stock-ageing", { min_age_days: minAgeDays }, "stock-ageing.csv")}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:border-[#95271D] hover:text-[#95271D]"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        )}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Part</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Branch</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Lot Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Age</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Qty</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Value at Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">No aged stock found.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.stock_entry_id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-3">
                    <p className="font-mono text-xs font-semibold text-[#95271D]">{r.part_number}</p>
                    <p className="text-gray-600">{r.part_name}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.branch_name}</td>
                  <td className="px-4 py-3 text-gray-600">{r.lot_date}</td>
                  <td className="px-4 py-3 text-right">
                    <Badge variant={r.age_bucket === "days_180_plus" ? "danger" : r.age_bucket === "days_91_180" ? "warning" : "neutral"}>
                      {r.age_days}d
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">{r.remaining_qty}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{formatAed(r.cost_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
