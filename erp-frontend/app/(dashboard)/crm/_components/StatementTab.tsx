"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import api from "@/lib/api";
import type { CustomerStatement } from "@/types/crm";

function formatAed(v: number) {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", minimumFractionDigits: 2 }).format(v);
}

const TYPE_LABEL: Record<string, { label: string; variant: "default" | "success" | "warning" }> = {
  invoice: { label: "Invoice", variant: "default" },
  payment: { label: "Payment", variant: "success" },
  return: { label: "Return", variant: "warning" },
};

function monthsAgo(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
}

export function StatementTab({ customerId }: { customerId: number }) {
  const [from, setFrom] = useState(monthsAgo(3));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const { data, isLoading } = useQuery<CustomerStatement>({
    queryKey: ["crm-statement", customerId, from, to],
    queryFn: async () => (await api.get(`/sales/customers/${customerId}/statement`, { params: { from, to } })).data.data,
  });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-wrap items-end gap-3 px-6 py-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]" />
          </div>
          <div className="ml-auto text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Closing Balance</p>
            <p className={`text-lg font-bold ${(data?.closing_balance ?? 0) > 0 ? "text-red-600" : "text-gray-900"}`}>
              {formatAed(data?.closing_balance ?? 0)}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Reference</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Debit</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Credit</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">Loading...</td></tr>
              ) : !data || data.entries.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">No activity in this period.</td></tr>
              ) : data.entries.map((e, i) => (
                <tr key={i} className="hover:bg-gray-50/50">
                  <td className="px-6 py-3 text-gray-600">{new Date(e.date).toLocaleDateString("en-AE")}</td>
                  <td className="px-4 py-3"><Badge variant={TYPE_LABEL[e.type]?.variant ?? "default"}>{TYPE_LABEL[e.type]?.label ?? e.type}</Badge></td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-[#95271D]">{e.reference}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{e.debit > 0 ? formatAed(e.debit) : "—"}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{e.credit > 0 ? formatAed(e.credit) : "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatAed(e.running_balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
