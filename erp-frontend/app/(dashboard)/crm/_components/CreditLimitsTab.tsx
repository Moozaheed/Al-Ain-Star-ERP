"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type { CreditLimit } from "@/types/crm";
import type { Branch } from "@/types/auth";

function formatAed(v: number) {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", minimumFractionDigits: 2 }).format(v);
}

export function CreditLimitsTab({ customerId }: { customerId: number }) {
  const [editing, setEditing] = useState<{ branchId: number; branchName: string; current: number } | null>(null);
  const canManage = useAuthStore((s) => s.hasPermission("crm.manage_credit_limit"));

  const { data: limits, isLoading } = useQuery<CreditLimit[]>({
    queryKey: ["crm-credit-limits", customerId],
    queryFn: async () => (await api.get(`/sales/customers/${customerId}/credit-limits`)).data.data,
  });

  const { data: branchData } = useQuery<{ data: Branch[] }>({
    queryKey: ["branches-all"],
    queryFn: async () => (await api.get("/branches", { params: { per_page: 100 } })).data,
    enabled: canManage,
  });

  const branches = branchData?.data ?? [];
  const configuredBranchIds = new Set((limits ?? []).map((l) => l.branch_id));
  const unconfiguredBranches = branches.filter((b) => !configuredBranchIds.has(b.id));

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Branch</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Limit</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Used</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Available</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Set By</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">Loading...</td></tr>
              ) : !limits || limits.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">No credit limits set. Default is AED 0 for new B2B customers.</td></tr>
              ) : limits.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-3 text-gray-900">{l.branch_name ?? `Branch #${l.branch_id}`}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatAed(l.credit_limit)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatAed(l.credit_used)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${l.credit_available < 0 ? "text-red-600" : "text-green-700"}`}>
                    {formatAed(l.credit_available)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{l.set_by_name ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {canManage && (
                      <button
                        onClick={() => setEditing({ branchId: l.branch_id, branchName: l.branch_name ?? `Branch #${l.branch_id}`, current: l.credit_limit })}
                        className="flex items-center gap-1 text-xs font-medium text-[#95271D] hover:underline"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {canManage && unconfiguredBranches.length > 0 && (
        <Card>
          <div className="flex flex-wrap items-center gap-2 px-6 py-4">
            <span className="text-xs font-medium text-gray-500">Set a limit for:</span>
            {unconfiguredBranches.map((b) => (
              <button
                key={b.id}
                onClick={() => setEditing({ branchId: b.id, branchName: b.name, current: 0 })}
                className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:border-[#95271D] hover:text-[#95271D]"
              >
                {b.name}
              </button>
            ))}
          </div>
        </Card>
      )}

      {editing && (
        <SetCreditLimitModal
          customerId={customerId}
          branchId={editing.branchId}
          branchName={editing.branchName}
          current={editing.current}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function SetCreditLimitModal({
  customerId, branchId, branchName, current, onClose,
}: { customerId: number; branchId: number; branchName: string; current: number; onClose: () => void }) {
  const qc = useQueryClient();
  const [value, setValue] = useState(String(current));
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.post(`/sales/customers/${customerId}/credit-limits`, {
      branch_id: branchId,
      credit_limit: Number(value),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-credit-limits", customerId] });
      onClose();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message ?? "Failed to set credit limit.");
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Credit Limit — {branchName}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex flex-col gap-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Credit Limit (AED) *</label>
            <input
              type="number" min={0} step="0.01" value={value} onChange={(e) => setValue(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]"
            />
          </div>
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={mutation.isPending} disabled={value === "" || Number(value) < 0} onClick={() => mutation.mutate()}>Save</Button>
        </div>
      </div>
    </div>
  );
}
