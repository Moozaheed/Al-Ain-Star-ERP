"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import api from "@/lib/api";
import { downloadFile } from "@/lib/downloadFile";
import type { Invoice } from "@/types/sales";

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "neutral" | "default"> = {
  paid:           "success",
  confirmed:      "default",
  partially_paid: "warning",
  draft:          "neutral",
  void:           "danger",
};

const PAYMENT_MODE_LABEL: Record<string, string> = {
  cash:          "Cash",
  card:          "Card",
  bank_transfer: "Bank Transfer",
  credit:        "Credit",
  cheque:        "Cheque",
};

function formatAed(v: number) {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", minimumFractionDigits: 2 }).format(v);
}

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [downloading, setDownloading] = useState(false);

  const { data: invoice, isLoading } = useQuery<Invoice>({
    queryKey: ["invoice", id],
    queryFn: async () => (await api.get(`/sales/invoices/${id}`)).data.data,
  });

  async function handleDownload() {
    if (!invoice) return;
    setDownloading(true);
    try {
      await downloadFile(`/sales/invoices/${id}/pdf`, `Invoice-${invoice.invoice_number}.pdf`, "application/pdf");
    } finally {
      setDownloading(false);
    }
  }

  if (isLoading || !invoice) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-100" />
        <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-xl font-bold text-gray-900">{invoice.invoice_number}</h1>
              <Badge variant={STATUS_VARIANT[invoice.status] ?? "neutral"}>{invoice.status.replace("_", " ")}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-gray-500">Invoice dated {invoice.invoice_date}</p>
          </div>
        </div>
        <Button onClick={handleDownload} loading={downloading}>
          <Download className="mr-1.5 h-4 w-4" />
          Download PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Items</CardTitle></CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-gray-500">Part</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase text-gray-500">Qty</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase text-gray-500">Price</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase text-gray-500">VAT</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {invoice.items.map((item, idx) => (
                    <tr key={item.id ?? idx}>
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs font-semibold text-gray-900">{item.part_number}</p>
                        <p className="text-xs text-gray-500">{item.description}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">{item.qty}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{formatAed(item.unit_price)}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{formatAed(item.line_vat)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatAed(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {invoice.notes && (
            <Card>
              <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-gray-600">{invoice.notes}</p></CardContent>
            </Card>
          )}

          {invoice.status === "void" && invoice.void_reason && (
            <Card>
              <CardHeader><CardTitle>Void Reason</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-red-600">{invoice.void_reason}</p></CardContent>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-1">
              <p className="font-medium text-gray-900">{invoice.customer_name ?? "CASH CUSTOMER"}</p>
              {invoice.customer_trn && <p className="text-xs text-gray-500">TRN: {invoice.customer_trn}</p>}
              <div className="mt-2 flex flex-col gap-1 text-xs text-gray-500">
                <p>Channel: <span className="font-medium text-gray-700 capitalize">{invoice.channel}</span></p>
                <p>Payment: <span className="font-medium text-gray-700">{PAYMENT_MODE_LABEL[invoice.payment_mode]}</span></p>
                {invoice.lpo_number && <p>LPO No: <span className="font-medium text-gray-700">{invoice.lpo_number}</span></p>}
                {invoice.ref_number && <p>Ref No: <span className="font-medium text-gray-700">{invoice.ref_number}</span></p>}
                {invoice.created_by_name && <p>Created by: <span className="font-medium text-gray-700">{invoice.created_by_name}</span></p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              <SummaryRow label="Subtotal" value={formatAed(invoice.subtotal)} />
              {invoice.discount_amount > 0 && <SummaryRow label="Discount" value={`-${formatAed(invoice.discount_amount)}`} />}
              <SummaryRow label="VAT" value={formatAed(invoice.vat_amount)} />
              <div className="my-1 border-t border-gray-100" />
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-gray-900">Total</span>
                <span className="text-lg font-bold text-[#95271D]">{formatAed(invoice.total)}</span>
              </div>
              {invoice.amount_due > 0 && (
                <div className="mt-1 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Amount Due: <span className="font-semibold">{formatAed(invoice.amount_due)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}
