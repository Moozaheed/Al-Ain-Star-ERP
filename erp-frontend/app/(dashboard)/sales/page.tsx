"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Plus, Search, FileText, Receipt, X,
  ChevronLeft, ChevronRight, ArrowRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import api from "@/lib/api";
import type { Invoice, Quotation } from "@/types/sales";

type Tab = "invoices" | "quotations";

const INVOICE_STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "neutral" | "default"> = {
  paid:           "success",
  confirmed:      "default",
  partially_paid: "warning",
  draft:          "neutral",
  void:           "danger",
};

const QUOTATION_STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "neutral" | "default"> = {
  accepted:  "success",
  draft:     "neutral",
  sent:      "default",
  expired:   "danger",
  rejected:  "danger",
  converted: "neutral",
};

const PAYMENT_MODE_LABEL: Record<string, string> = {
  cash:          "Cash",
  card:          "Card",
  bank_transfer: "Bank",
  credit:        "Credit",
  cheque:        "Cheque",
};

const CHANNEL_LABEL: Record<string, string> = {
  retail: "Retail",
  b2b:    "B2B",
  online: "Online",
};

function formatAed(v: number) {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", minimumFractionDigits: 2 }).format(v);
}

interface Paginated<T> {
  data: T[];
  meta: { current_page: number; last_page: number; total: number };
}

export default function SalesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("invoices");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const { data: invData, isLoading: invLoading } = useQuery<Paginated<Invoice>>({
    queryKey: ["invoices", search, status, page],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), per_page: "20",
        ...(search && { search }), ...(status && { status }) });
      return (await api.get(`/sales/invoices?${p}`)).data;
    },
    enabled: tab === "invoices",
    placeholderData: (prev) => prev,
  });

  const { data: qData, isLoading: qLoading } = useQuery<Paginated<Quotation>>({
    queryKey: ["quotations", search, status, page],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), per_page: "20",
        ...(search && { search }), ...(status && { status }) });
      return (await api.get(`/sales/quotations?${p}`)).data;
    },
    enabled: tab === "quotations",
    placeholderData: (prev) => prev,
  });

  function switchTab(t: Tab) {
    setTab(t);
    setSearch("");
    setStatus("");
    setPage(1);
  }

  const isLoading = tab === "invoices" ? invLoading : qLoading;
  const meta      = tab === "invoices" ? invData?.meta  : qData?.meta;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Sales</h1>
          <p className="mt-0.5 text-sm text-gray-500">Invoices, quotations, and sales history</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/sales/quotations/new")}>
            <FileText className="mr-1.5 h-4 w-4" />
            New Quotation
          </Button>
          <Button size="sm" onClick={() => router.push("/sales/invoices/new")}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(["invoices", "quotations"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px capitalize",
              tab === t
                ? "border-[#95271D] text-[#95271D]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {t === "invoices" ? (
              <span className="flex items-center gap-1.5"><Receipt className="h-4 w-4" /> Invoices</span>
            ) : (
              <span className="flex items-center gap-1.5"><FileText className="h-4 w-4" /> Quotations</span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={tab === "invoices" ? "Search invoice no, customer..." : "Search quotation no, customer..."}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]"
          />
        </div>

        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]"
        >
          <option value="">All Statuses</option>
          {tab === "invoices"
            ? ["confirmed", "paid", "partially_paid", "draft", "void"].map((s) => (
                <option key={s} value={s}>{s.replace("_", " ")}</option>
              ))
            : ["draft", "sent", "accepted", "rejected", "expired", "converted"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))
          }
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
            {tab === "invoices" ? "Invoices" : "Quotations"}
            {meta && <span className="ml-2 font-normal text-gray-400">{meta.total} total</span>}
          </CardTitle>
        </CardHeader>

        <div className="overflow-x-auto">
          {tab === "invoices" ? (
            <InvoiceTable rows={invData?.data ?? []} loading={isLoading} onView={(id) => router.push(`/sales/invoices/${id}`)} />
          ) : (
            <QuotationTable rows={qData?.data ?? []} loading={isLoading} onView={(id) => router.push(`/sales/quotations/${id}`)} />
          )}
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

function InvoiceTable({ rows, loading, onView }: { rows: Invoice[]; loading: boolean; onView: (id: number) => void }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-100 bg-gray-50">
          <Th>Invoice No</Th><Th>Date</Th><Th>Customer</Th>
          <Th>Channel</Th><Th>Mode</Th><Th right>Total</Th>
          <Th right>Due</Th><Th>Status</Th><Th />
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkRow cols={9} key={i} />)
          : rows.length === 0
            ? <EmptyRow cols={9} msg="No invoices found." />
            : rows.map((inv) => (
              <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-3 font-mono text-xs font-semibold text-[#95271D]">{inv.invoice_number}</td>
                <td className="px-4 py-3 text-gray-600">{inv.invoice_date}</td>
                <td className="max-w-[180px] px-4 py-3">
                  <p className="truncate font-medium text-gray-900">{inv.customer_name ?? "—"}</p>
                  {inv.customer_trn && <p className="text-[11px] text-gray-400">TRN {inv.customer_trn}</p>}
                </td>
                <td className="px-4 py-3"><Badge variant="neutral">{CHANNEL_LABEL[inv.channel]}</Badge></td>
                <td className="px-4 py-3 text-gray-600">{PAYMENT_MODE_LABEL[inv.payment_mode]}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatAed(inv.total)}</td>
                <td className="px-4 py-3 text-right text-gray-600">{inv.amount_due > 0 ? formatAed(inv.amount_due) : "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant={INVOICE_STATUS_VARIANT[inv.status] ?? "neutral"}>
                    {inv.status.replace("_", " ")}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => onView(inv.id)} className="text-xs font-medium text-[#95271D] hover:underline flex items-center gap-0.5 ml-auto">
                    View <ArrowRight className="h-3 w-3" />
                  </button>
                </td>
              </tr>
            ))
        }
      </tbody>
    </table>
  );
}

function QuotationTable({ rows, loading, onView }: { rows: Quotation[]; loading: boolean; onView: (id: number) => void }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-100 bg-gray-50">
          <Th>Quot No</Th><Th>Date</Th><Th>Customer</Th>
          <Th>Channel</Th><Th>Expires</Th><Th right>Total</Th>
          <Th>Status</Th><Th />
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkRow cols={8} key={i} />)
          : rows.length === 0
            ? <EmptyRow cols={8} msg="No quotations found." />
            : rows.map((q) => (
              <tr key={q.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-3 font-mono text-xs font-semibold text-[#95271D]">{q.quotation_number}</td>
                <td className="px-4 py-3 text-gray-600">{q.created_at}</td>
                <td className="max-w-[180px] px-4 py-3 truncate font-medium text-gray-900">{q.customer_name ?? "—"}</td>
                <td className="px-4 py-3"><Badge variant="neutral">{CHANNEL_LABEL[q.channel]}</Badge></td>
                <td className="px-4 py-3 text-gray-600">{q.expires_at}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatAed(q.total)}</td>
                <td className="px-4 py-3">
                  <Badge variant={QUOTATION_STATUS_VARIANT[q.status] ?? "neutral"}>{q.status}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => onView(q.id)} className="text-xs font-medium text-[#95271D] hover:underline flex items-center gap-0.5 ml-auto">
                    View <ArrowRight className="h-3 w-3" />
                  </button>
                </td>
              </tr>
            ))
        }
      </tbody>
    </table>
  );
}

function Th({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return (
    <th className={cn("px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 first:px-6", right && "text-right")}>
      {children}
    </th>
  );
}

function SkRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-gray-50">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-gray-100" /></td>
      ))}
    </tr>
  );
}

function EmptyRow({ cols, msg }: { cols: number; msg: string }) {
  return (
    <tr><td colSpan={cols} className="px-6 py-16 text-center text-sm text-gray-400">{msg}</td></tr>
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
