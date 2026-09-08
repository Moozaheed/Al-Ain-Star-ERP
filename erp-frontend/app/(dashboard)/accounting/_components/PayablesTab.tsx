"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import api from "@/lib/api";
import type { AgingReport, AgingRow } from "@/types/accounting";

function formatAed(v: number) {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", minimumFractionDigits: 2 }).format(v);
}

const BUCKET_LABEL: Record<string, string> = {
  current: "Current",
  days_1_30: "1-30 Days",
  days_31_60: "31-60 Days",
  days_61_90: "61-90 Days",
  days_90_plus: "90+ Days",
};

const BUCKET_VARIANT: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  current: "success",
  days_1_30: "neutral",
  days_31_60: "warning",
  days_61_90: "warning",
  days_90_plus: "danger",
};

export function PayablesTab() {
  const qc = useQueryClient();
  const [paying, setPaying] = useState<AgingRow | null>(null);

  const { data, isLoading } = useQuery<AgingReport>({
    queryKey: ["accounting-payables"],
    queryFn: async () => (await api.get("/accounting/payables")).data.data,
  });

  const rows = data?.invoices ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(["current", "days_1_30", "days_31_60", "days_61_90", "days_90_plus"] as const).map((b) => (
          <Card key={b}>
            <CardContent className="py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{BUCKET_LABEL[b]}</p>
              <p className="mt-1 text-lg font-bold text-gray-900">{formatAed(data?.summary[b] ?? 0)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Purchase Invoice</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Supplier</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Due Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Amount Due</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Aging</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">Nothing outstanding — all purchase invoices are settled.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-3 font-mono text-xs font-semibold text-[#95271D]">{r.number}</td>
                  <td className="px-4 py-3 text-gray-900">{r.party_name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{r.due_date ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatAed(r.amount_due)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={BUCKET_VARIANT[r.aging_bucket]}>
                      {BUCKET_LABEL[r.aging_bucket]}{r.days_overdue > 0 ? ` · ${r.days_overdue}d` : ""}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setPaying(r)} className="text-xs font-medium text-[#95271D] hover:underline">
                      Record Payment
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {paying && (
        <RecordPaymentModal
          row={paying}
          onClose={() => setPaying(null)}
          onSaved={() => { setPaying(null); qc.invalidateQueries({ queryKey: ["accounting-payables"] }); }}
        />
      )}
    </div>
  );
}

function RecordPaymentModal({ row, onClose, onSaved }: { row: AgingRow; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState(String(row.amount_due));
  const [paymentMode, setPaymentMode] = useState<"cash" | "bank_transfer" | "cheque">("bank_transfer");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeBank, setChequeBank] = useState("");
  const [chequeDue, setChequeDue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.post("/purchasing/payments", {
      purchase_invoice_id: row.id,
      amount: Number(amount),
      payment_mode: paymentMode,
      payment_date: paymentDate,
      reference: reference || null,
      ...(paymentMode === "cheque" && {
        cheque_number: chequeNumber,
        cheque_bank_name: chequeBank || null,
        cheque_due_date: chequeDue,
      }),
    }),
    onSuccess: onSaved,
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message ?? "Failed to record payment.");
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Record Payment</h2>
            <p className="text-xs text-gray-500">{row.number} · {row.party_name} · Due {formatAed(row.amount_due)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5">
          <Field label="Amount *">
            <input type="number" min={0.01} max={row.amount_due} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Payment Mode *">
            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as typeof paymentMode)} className={inputCls}>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
            </select>
          </Field>
          <Field label="Payment Date *">
            <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className={inputCls} />
          </Field>
          {paymentMode === "cheque" ? (
            <>
              <Field label="Cheque Number *">
                <input value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} className={inputCls} placeholder="e.g. 000123" />
              </Field>
              <Field label="Cheque Bank">
                <input value={chequeBank} onChange={(e) => setChequeBank(e.target.value)} className={inputCls} placeholder="e.g. ENBD" />
              </Field>
              <Field label="Cheque Due Date *">
                <input type="date" value={chequeDue} onChange={(e) => setChequeDue(e.target.value)} className={inputCls} />
              </Field>
            </>
          ) : (
            <Field label="Reference">
              <input value={reference} onChange={(e) => setReference(e.target.value)} className={inputCls} placeholder="Transaction ref" />
            </Field>
          )}
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            loading={mutation.isPending}
            disabled={!amount || Number(amount) <= 0 || (paymentMode === "cheque" && (!chequeNumber || !chequeDue))}
            onClick={() => mutation.mutate()}
          >
            Record Payment
          </Button>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}
