"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Plus, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import api from "@/lib/api";
import type { PurchaseInvoice } from "@/types/purchasing";

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "neutral" | "default"> = {
  paid:            "success",
  received:        "default",
  partially_paid:  "warning",
  draft:           "neutral",
};

const PAYMENT_MODE_LABEL: Record<string, string> = {
  cash:          "Cash",
  bank_transfer: "Bank Transfer",
  credit:        "Credit",
  cheque:        "Cheque",
};

function formatAed(v: number) {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", minimumFractionDigits: 2 }).format(v);
}

interface Paginated<T> {
  data: T[];
  meta: { current_page: number; last_page: number; total: number };
}

export default function PurchasingPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<Paginated<PurchaseInvoice>>({
    queryKey: ["purchase-invoices", search, status, page],
    queryFn: async () => {
      const p = new URLSearchParams({
        page: String(page), per_page: "20",
        ...(search && { search }), ...(status && { status }),
      });
      return (await api.get(`/purchasing/invoices?${p}`)).data;
    },
    placeholderData: (prev) => prev,
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Purchasing</h1>
          <p className="mt-0.5 text-sm text-gray-500">Purchase invoices, stock-in, and input VAT</p>
        </div>
        <Button size="sm" onClick={() => router.push("/purchasing/invoices/new")}>
          <Plus className="mr-1.5 h-4 w-4" />
          New Purchase Invoice
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search invoice no, supplier ref..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]"
          />
        </div>

        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]"
        >
          <option value="">All Statuses</option>
          {["draft", "received", "paid", "partially_paid"].map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>

        {(search || status) && (
          <button onClick={() => { setSearch(""); setStatus(""); setPage(1); }}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Purchase Invoices
            {meta && <span className="ml-2 font-normal text-gray-400">{meta.total} total</span>}
          </CardTitle>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <Th>Invoice No</Th><Th>Date</Th><Th>Supplier</Th>
                <Th>Mode</Th><Th right>Total</Th><Th right>Due</Th><Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => <SkRow key={i} />)
                : rows.length === 0
                  ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-sm text-gray-400">
                        No purchase invoices yet. Create one to receive stock.
                      </td>
                    </tr>
                  )
                  : rows.map((pi) => (
                    <tr key={pi.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3 font-mono text-xs font-semibold text-[#95271D]">{pi.invoice_number}</td>
                      <td className="px-4 py-3 text-gray-600">{pi.invoice_date}</td>
                      <td className="max-w-[200px] px-4 py-3">
                        <p className="truncate font-medium text-gray-900">{pi.supplier_name ?? "—"}</p>
                        {pi.supplier_invoice_ref && <p className="text-[11px] text-gray-400">Ref: {pi.supplier_invoice_ref}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{PAYMENT_MODE_LABEL[pi.payment_mode]}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatAed(pi.total)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{pi.amount_due > 0 ? formatAed(pi.amount_due) : "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANT[pi.status] ?? "neutral"}>{pi.status.replace("_", " ")}</Badge>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
            <p className="text-xs text-gray-500">Page {meta.current_page} of {meta.last_page}</p>
            <div className="flex gap-1">
              <PageBtn onClick={() => setPage((p) => p - 1)} disabled={meta.current_page === 1}><ChevronLeft className="h-3.5 w-3.5" /></PageBtn>
              <PageBtn onClick={() => setPage((p) => p + 1)} disabled={meta.current_page === meta.last_page}><ChevronRight className="h-3.5 w-3.5" /></PageBtn>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function Th({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return (
    <th className={cn("px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 first:px-6", right && "text-right")}>
      {children}
    </th>
  );
}

function SkRow() {
  return (
    <tr className="border-b border-gray-50">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-gray-100" /></td>
      ))}
    </tr>
  );
}

function PageBtn({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
      {children}
    </button>
  );
}
