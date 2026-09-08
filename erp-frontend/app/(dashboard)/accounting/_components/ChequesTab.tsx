"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, CheckCircle, XCircle, Ban } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import api from "@/lib/api";
import type { Cheque, ChequeDirection, ChequeStatus } from "@/types/accounting";

interface Paginated<T> { data: T[]; meta: { total: number } }

function formatAed(v: number) {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", minimumFractionDigits: 2 }).format(v);
}

const STATUS_VARIANT: Record<ChequeStatus, "success" | "warning" | "danger" | "neutral"> = {
  pending: "warning",
  cleared: "success",
  bounced: "danger",
  cancelled: "neutral",
};

export function ChequesTab() {
  const qc = useQueryClient();
  const [direction, setDirection] = useState<ChequeDirection | "">("");
  const [status, setStatus] = useState<ChequeStatus | "">("");
  const [bouncing, setBouncing] = useState<Cheque | null>(null);

  const { data, isLoading } = useQuery<Paginated<Cheque>>({
    queryKey: ["cheques", direction, status],
    queryFn: async () => {
      const p = new URLSearchParams({ per_page: "50", ...(direction && { direction }), ...(status && { status }) });
      return (await api.get(`/accounting/cheques?${p}`)).data;
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["cheques"] });

  const clearMutation = useMutation({
    mutationFn: (id: number) => api.post(`/accounting/cheques/${id}/clear`),
    onSuccess: invalidate,
  });
  const cancelMutation = useMutation({
    mutationFn: (id: number) => api.post(`/accounting/cheques/${id}/cancel`),
    onSuccess: invalidate,
  });

  const rows = data?.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <select value={direction} onChange={(e) => setDirection(e.target.value as ChequeDirection | "")}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]">
          <option value="">All Directions</option>
          <option value="received">Received</option>
          <option value="issued">Issued</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as ChequeStatus | "")}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="cleared">Cleared</option>
          <option value="bounced">Bounced</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Cheque No</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Direction</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Party</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Bank</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-400">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-400">No cheques recorded yet.</td></tr>
              ) : rows.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-3 font-mono text-xs font-semibold text-gray-900">{c.cheque_number}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{c.direction}</td>
                  <td className="px-4 py-3 text-gray-900">{c.customer_name ?? c.supplier_name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{c.bank_name ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatAed(c.amount)}</td>
                  <td className="px-4 py-3 text-gray-600">{c.due_date}</td>
                  <td className="px-4 py-3"><Badge variant={STATUS_VARIANT[c.status]} className="capitalize">{c.status}</Badge></td>
                  <td className="px-4 py-3">
                    {c.status === "pending" && (
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => clearMutation.mutate(c.id)} title="Mark cleared" className="text-gray-400 hover:text-green-600">
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button onClick={() => setBouncing(c)} title="Mark bounced" className="text-gray-400 hover:text-red-600">
                          <XCircle className="h-4 w-4" />
                        </button>
                        <button onClick={() => cancelMutation.mutate(c.id)} title="Cancel" className="text-gray-400 hover:text-gray-700">
                          <Ban className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {bouncing && (
        <BounceModal
          cheque={bouncing}
          onClose={() => setBouncing(null)}
          onSaved={() => { setBouncing(null); invalidate(); }}
        />
      )}
    </div>
  );
}

function BounceModal({ cheque, onClose, onSaved }: { cheque: Cheque; onClose: () => void; onSaved: () => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.post(`/accounting/cheques/${cheque.id}/bounce`, { reason }),
    onSuccess: onSaved,
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message ?? "Failed to mark cheque bounced.");
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Mark Cheque Bounced</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex flex-col gap-4 px-6 py-5">
          <p className="text-sm text-gray-600">
            Cheque {cheque.cheque_number} for {formatAed(cheque.amount)} will be marked bounced. The original invoice&apos;s
            balance will be restored — the money is owed again.
          </p>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Reason *</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Insufficient funds"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]" />
          </div>
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger" loading={mutation.isPending} disabled={!reason.trim()} onClick={() => mutation.mutate()}>
            Mark Bounced
          </Button>
        </div>
      </div>
    </div>
  );
}
