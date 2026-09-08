"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type { ApprovalStatus, ExpenseClaim, LeaveRequest } from "@/types/hr";

function formatAed(v: number) {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", minimumFractionDigits: 2 }).format(v);
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "neutral" | "default"> = {
  pending: "warning",
  branch_approved: "default",
  approved: "success",
  rejected: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting Branch Manager",
  branch_approved: "Awaiting Admin",
  approved: "Approved",
  rejected: "Rejected",
};

const LEAVE_TYPE_LABEL: Record<string, string> = { annual: "Annual", sick: "Sick", unpaid: "Unpaid" };

interface Paginated<T> { data: T[] }

export function ApprovalsTab() {
  const canBranchApprove = useAuthStore((s) => s.hasPermission("hr.branch_approve"));
  const canAdminApprove = useAuthStore((s) => s.hasPermission("hr.approve"));

  return (
    <div className="flex flex-col gap-6">
      <ExpenseApprovalsSection canBranchApprove={canBranchApprove} canAdminApprove={canAdminApprove} />
      <LeaveApprovalsSection canBranchApprove={canBranchApprove} canAdminApprove={canAdminApprove} />
    </div>
  );
}

function ExpenseApprovalsSection({ canBranchApprove, canAdminApprove }: { canBranchApprove: boolean; canAdminApprove: boolean }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<Paginated<ExpenseClaim>>({
    queryKey: ["hr-expenses-approvals"],
    queryFn: async () => (await api.get("/hr/expenses", { params: { per_page: 50 } })).data,
  });

  const branchApprove = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "approve" | "reject" }) =>
      api.post(`/hr/expenses/${id}/branch-approve`, { action }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr-expenses-approvals"] }),
  });

  const adminApprove = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "approve" | "reject" }) =>
      api.post(`/hr/expenses/${id}/approve`, { action }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr-expenses-approvals"] }),
  });

  const rows = (data?.data ?? []).filter((c): c is ExpenseClaim & { status: ApprovalStatus } => c.status === "pending" || c.status === "branch_approved");

  return (
    <Card>
      <div className="border-b border-gray-100 px-6 py-4">
        <h2 className="text-sm font-semibold text-gray-900">Expense Claims</h2>
        <p className="text-xs text-gray-500">Pending your action or awaiting the next stage</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {["Employee", "Branch", "Description", "Amount", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 first:px-6">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">Nothing pending.</td></tr>
            ) : rows.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50/50">
                <td className="px-6 py-3 text-gray-900">{c.employee_name}</td>
                <td className="px-4 py-3 text-gray-600">{c.branch_name}</td>
                <td className="max-w-[220px] px-4 py-3 truncate text-gray-600">{c.description}</td>
                <td className="px-4 py-3 font-semibold text-gray-900">{formatAed(c.amount)}</td>
                <td className="px-4 py-3"><Badge variant={STATUS_VARIANT[c.status]}>{STATUS_LABEL[c.status]}</Badge></td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    {c.status === "pending" && canBranchApprove && (
                      <>
                        <Button size="sm" variant="outline" loading={branchApprove.isPending} onClick={() => branchApprove.mutate({ id: c.id, action: "approve" })}>Approve</Button>
                        <Button size="sm" variant="ghost" onClick={() => branchApprove.mutate({ id: c.id, action: "reject" })}>Reject</Button>
                      </>
                    )}
                    {c.status === "branch_approved" && canAdminApprove && (
                      <>
                        <Button size="sm" variant="outline" loading={adminApprove.isPending} onClick={() => adminApprove.mutate({ id: c.id, action: "approve" })}>Approve</Button>
                        <Button size="sm" variant="ghost" onClick={() => adminApprove.mutate({ id: c.id, action: "reject" })}>Reject</Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function LeaveApprovalsSection({ canBranchApprove, canAdminApprove }: { canBranchApprove: boolean; canAdminApprove: boolean }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<Paginated<LeaveRequest>>({
    queryKey: ["hr-leave-approvals"],
    queryFn: async () => (await api.get("/hr/leave", { params: { per_page: 50 } })).data,
  });

  const branchApprove = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "approve" | "reject" }) =>
      api.post(`/hr/leave/${id}/branch-approve`, { action }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr-leave-approvals"] }),
  });

  const adminApprove = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "approve" | "reject" }) =>
      api.post(`/hr/leave/${id}/approve`, { action }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr-leave-approvals"] }),
  });

  const rows = (data?.data ?? []).filter((l) => l.status === "pending" || l.status === "branch_approved");

  return (
    <Card>
      <div className="border-b border-gray-100 px-6 py-4">
        <h2 className="text-sm font-semibold text-gray-900">Leave Requests</h2>
        <p className="text-xs text-gray-500">Pending your action or awaiting the next stage</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {["Employee", "Branch", "Type", "Dates", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 first:px-6">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">Nothing pending.</td></tr>
            ) : rows.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50/50">
                <td className="px-6 py-3 text-gray-900">{l.employee_name}</td>
                <td className="px-4 py-3 text-gray-600">{l.branch_name}</td>
                <td className="px-4 py-3 text-gray-600">{LEAVE_TYPE_LABEL[l.leave_type] ?? l.leave_type}</td>
                <td className="px-4 py-3 text-gray-600">{l.start_date} → {l.end_date} ({l.days}d)</td>
                <td className="px-4 py-3"><Badge variant={STATUS_VARIANT[l.status]}>{STATUS_LABEL[l.status]}</Badge></td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    {l.status === "pending" && canBranchApprove && (
                      <>
                        <Button size="sm" variant="outline" loading={branchApprove.isPending} onClick={() => branchApprove.mutate({ id: l.id, action: "approve" })}>Approve</Button>
                        <Button size="sm" variant="ghost" onClick={() => branchApprove.mutate({ id: l.id, action: "reject" })}>Reject</Button>
                      </>
                    )}
                    {l.status === "branch_approved" && canAdminApprove && (
                      <>
                        <Button size="sm" variant="outline" loading={adminApprove.isPending} onClick={() => adminApprove.mutate({ id: l.id, action: "approve" })}>Approve</Button>
                        <Button size="sm" variant="ghost" onClick={() => adminApprove.mutate({ id: l.id, action: "reject" })}>Reject</Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
