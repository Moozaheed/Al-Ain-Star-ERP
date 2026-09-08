"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { Card } from "@/components/ui/Card";
import api from "@/lib/api";
import { downloadCsv } from "@/lib/downloadCsv";
import { useAuthStore } from "@/store/authStore";
import type { BranchPerformanceRow } from "@/types/reporting";

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

export function BranchPerformanceTab() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const canExport = useAuthStore((s) => s.hasPermission("reporting.export"));

  const { data, isLoading } = useQuery<{ rows: BranchPerformanceRow[] }>({
    queryKey: ["report-branch-performance", from, to],
    queryFn: async () => (await api.get("/reporting/branches/performance", { params: { from, to } })).data.data,
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
        {canExport && (
          <button
            onClick={() => downloadCsv("/reporting/branches/performance", { from, to }, `branch-performance_${from}_${to}.csv`)}
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
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Branch</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Invoices</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Revenue</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Gross Profit</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">AR Overdue</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Low Stock Parts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">No branches to compare.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.branch_id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-3 font-medium text-gray-900">{r.branch_name}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{r.invoice_count}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{formatAed(r.revenue_ex_vat)}</td>
                  <td className={`px-4 py-3 text-right ${r.gross_profit >= 0 ? "text-gray-900" : "text-red-600"}`}>{formatAed(r.gross_profit)}</td>
                  <td className={`px-4 py-3 text-right ${r.ar_overdue > 0 ? "text-red-600" : "text-gray-600"}`}>{formatAed(r.ar_overdue)}</td>
                  <td className={`px-4 py-3 text-right ${r.low_stock_count > 0 ? "text-amber-600" : "text-gray-600"}`}>{r.low_stock_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
