"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type { PayRun } from "@/types/hr";
import type { Branch } from "@/types/auth";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatAed(v: number) {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", minimumFractionDigits: 2 }).format(v);
}

const STATUS_VARIANT: Record<string, "neutral" | "warning" | "success"> = {
  draft: "neutral",
  approved: "warning",
  paid: "success",
};

export function PayRunsTab() {
  const qc = useQueryClient();
  const canCreate = useAuthStore((s) => s.hasPermission("hr.create"));
  const canApprove = useAuthStore((s) => s.hasPermission("hr.approve"));
  const [generating, setGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data, isLoading } = useQuery<{ data: PayRun[] }>({
    queryKey: ["hr-pay-runs"],
    queryFn: async () => (await api.get("/hr/payroll/pay-runs", { params: { per_page: 50 } })).data,
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => api.post(`/hr/payroll/pay-runs/${id}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr-pay-runs"] }),
  });

  const payMutation = useMutation({
    mutationFn: (id: number) => api.post(`/hr/payroll/pay-runs/${id}/pay`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr-pay-runs"] }),
  });

  const payRuns = data?.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      {canCreate && (
        <div>
          <Button size="sm" onClick={() => setGenerating(true)}>
            <Plus className="h-4 w-4" /> Generate Pay Run
          </Button>
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Branch</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Period</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Employees</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Total Net Pay</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">Loading...</td></tr>
              ) : payRuns.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">No pay runs yet.</td></tr>
              ) : payRuns.map((run) => (
                <PayRunRow
                  key={run.id}
                  run={run}
                  expanded={expandedId === run.id}
                  onToggle={() => setExpandedId(expandedId === run.id ? null : run.id)}
                  canApprove={canApprove}
                  onApprove={() => approveMutation.mutate(run.id)}
                  onPay={() => payMutation.mutate(run.id)}
                  approving={approveMutation.isPending}
                  paying={payMutation.isPending}
                />
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {generating && (
        <GeneratePayRunModal
          onClose={() => setGenerating(false)}
          onGenerated={() => { setGenerating(false); qc.invalidateQueries({ queryKey: ["hr-pay-runs"] }); }}
        />
      )}
    </div>
  );
}

function PayRunRow({
  run, expanded, onToggle, canApprove, onApprove, onPay, approving, paying,
}: {
  run: PayRun; expanded: boolean; onToggle: () => void; canApprove: boolean;
  onApprove: () => void; onPay: () => void; approving: boolean; paying: boolean;
}) {
  const { data: detail } = useQuery<{ data: PayRun }>({
    queryKey: ["hr-pay-run", run.id],
    queryFn: async () => (await api.get(`/hr/payroll/pay-runs/${run.id}`)).data,
    enabled: expanded,
  });

  return (
    <>
      <tr className="hover:bg-gray-50/50">
        <td className="px-6 py-3 text-gray-900">{run.branch_name}</td>
        <td className="px-4 py-3 text-gray-600">{MONTH_NAMES[run.period_month - 1]} {run.period_year}</td>
        <td className="px-4 py-3 text-right text-gray-900">{run.payslip_count}</td>
        <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatAed(run.total_net_pay)}</td>
        <td className="px-4 py-3"><Badge variant={STATUS_VARIANT[run.status]} className="capitalize">{run.status}</Badge></td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-2">
            {canApprove && run.status === "draft" && (
              <Button size="sm" variant="outline" loading={approving} onClick={onApprove}>Approve</Button>
            )}
            {canApprove && run.status === "approved" && (
              <Button size="sm" variant="outline" loading={paying} onClick={onPay}>Mark Paid</Button>
            )}
            <button onClick={onToggle} className="text-gray-400 hover:text-gray-600">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="bg-gray-50/50 px-6 py-4">
            {!detail ? (
              <p className="text-xs text-gray-400">Loading payslips...</p>
            ) : (
              <div className="flex flex-col gap-2">
                {detail.data.payslips?.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs">
                    <span className="font-medium text-gray-900">{p.employee_name}</span>
                    <div className="flex items-center gap-4 text-gray-600">
                      <span>Basic {formatAed(p.basic_salary)}</span>
                      <span>Allowances {formatAed(p.total_allowances)}</span>
                      <span>Deductions −{formatAed(p.total_deductions)}</span>
                      <span className="font-semibold text-gray-900">Net {formatAed(p.net_pay)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function GeneratePayRunModal({ onClose, onGenerated }: { onClose: () => void; onGenerated: () => void }) {
  const [branchId, setBranchId] = useState<number | "">("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [error, setError] = useState<string | null>(null);

  const { data: branchData } = useQuery<{ data: Branch[] }>({
    queryKey: ["branches-all"],
    queryFn: async () => (await api.get("/branches", { params: { per_page: 100 } })).data,
  });

  const mutation = useMutation({
    mutationFn: () => api.post("/hr/payroll/pay-runs", { branch_id: branchId, period_month: month, period_year: year }),
    onSuccess: onGenerated,
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message ?? "Failed to generate pay run.");
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Generate Pay Run</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex flex-col gap-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Branch *</label>
            <select value={branchId} onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : "")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]">
              <option value="">Select a branch...</option>
              {branchData?.data.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-700">Month *</label>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]">
                {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-700">Year *</label>
              <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]" />
            </div>
          </div>
          <p className="text-xs text-gray-400">Generates a payslip for every active employee at this branch, using their current basic salary and active salary components.</p>
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={mutation.isPending} disabled={!branchId} onClick={() => mutation.mutate()}>Generate</Button>
        </div>
      </div>
    </div>
  );
}
