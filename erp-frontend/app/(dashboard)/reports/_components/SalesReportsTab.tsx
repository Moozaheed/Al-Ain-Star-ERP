"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import api from "@/lib/api";
import { downloadCsv } from "@/lib/downloadCsv";
import { useAuthStore } from "@/store/authStore";
import type { DailySalesSummary, SalesByPartRow } from "@/types/reporting";

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

export function SalesReportsTab() {
  const [view, setView] = useState<"daily" | "by-part">("daily");

  return (
    <div className="flex flex-col gap-4">
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

      {view === "daily" ? <DailySummaryView /> : <SalesByPartView />}
    </div>
  );
}

function DailySummaryView() {
  const [date, setDate] = useState(today());

  const { data, isLoading } = useQuery<DailySalesSummary>({
    queryKey: ["report-sales-daily", date],
    queryFn: async () => (await api.get("/reporting/sales/daily", { params: { date } })).data.data,
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
            <Card>
              <CardContent>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">By Payment Mode</p>
                {Object.keys(data.by_payment_mode).length === 0 ? (
                  <p className="text-sm text-gray-400">No sales on this date.</p>
                ) : Object.entries(data.by_payment_mode).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between py-1.5 text-sm">
                    <span className="capitalize text-gray-600">{k.replace("_", " ")}</span>
                    <span className="font-medium text-gray-900">{formatAed(v)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">By Channel</p>
                {Object.keys(data.by_channel).length === 0 ? (
                  <p className="text-sm text-gray-400">No sales on this date.</p>
                ) : Object.entries(data.by_channel).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between py-1.5 text-sm">
                    <span className="capitalize text-gray-600">{k}</span>
                    <span className="font-medium text-gray-900">{formatAed(v)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function SalesByPartView() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [sort, setSort] = useState<"total_revenue_ex_vat" | "qty_sold" | "gross_margin_pct">("total_revenue_ex_vat");
  const canExport = useAuthStore((s) => s.hasPermission("reporting.export"));

  const { data, isLoading } = useQuery<{ rows: SalesByPartRow[] }>({
    queryKey: ["report-sales-by-part", from, to, sort],
    queryFn: async () => (await api.get("/reporting/sales/by-part", { params: { from, to, sort, direction: "desc", top: 50 } })).data.data,
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
            onClick={() => downloadCsv("/reporting/sales/by-part", { from, to, sort, direction: "desc", top: 50 }, `sales-by-part_${from}_${to}.csv`)}
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
