"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User, Receipt, FileText, Wallet, Banknote, Plus, Trash2, CalendarDays,
  Target, AlertTriangle, CheckCircle, XCircle,
  Phone, Mail, MapPin, Calendar, Building2, Shield,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import api from "@/lib/api";
import type { UserDetail } from "@/types/hr";

type Tab = "overview" | "invoices" | "documents" | "expenses" | "leave" | "targets" | "payroll";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const ROLE_LABEL: Record<string, string> = {
  super_admin:     "Super Admin",
  manager:         "Manager",
  branch_manager:  "Branch Manager",
  sales_staff:     "Sales Staff",
  warehouse_staff: "Warehouse Staff",
  accountant:      "Accountant",
  viewer:          "Viewer",
};

const DOC_LABEL: Record<string, string> = {
  emirates_id:     "Emirates ID",
  passport:        "Passport",
  visa:            "Visa",
  labour_card:     "Labour Card",
  health_insurance:"Health Insurance",
  other:           "Other",
};

const APPROVAL_STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "neutral" | "default"> = {
  approved: "success",
  branch_approved: "default",
  pending:  "warning",
  rejected: "danger",
  paid:     "success",
};

const APPROVAL_STATUS_LABEL: Record<string, string> = {
  approved: "Approved",
  branch_approved: "Awaiting Admin",
  pending: "Awaiting Branch Manager",
  rejected: "Rejected",
  paid: "Paid",
};

const INVOICE_STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "neutral" | "default"> = {
  paid:           "success",
  confirmed:      "default",
  partially_paid: "warning",
  draft:          "neutral",
  void:           "danger",
};

function formatAed(v: number) {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", minimumFractionDigits: 2 }).format(v);
}

export function UserDetailView({ data, editable = false, selfService = false }: { data: UserDetail; editable?: boolean; selfService?: boolean }) {
  const [tab, setTab] = useState<Tab>("overview");
  const { user, employee, invoice_stats, recent_invoices, monthly_stats } = data;
  const initials = user.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  const tabs: { key: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: "overview",  label: "Overview",  icon: User },
    { key: "invoices",  label: "Invoices",  icon: Receipt, count: invoice_stats?.total_invoices },
    { key: "documents", label: "Documents", icon: FileText, count: employee?.documents?.length },
    { key: "expenses",  label: "Expenses",  icon: Wallet, count: employee?.expense_claims?.length },
    { key: "leave",     label: "Leave",     icon: CalendarDays, count: employee?.leave_requests?.length },
    { key: "targets",   label: "Targets",   icon: Target, count: employee?.sales_targets?.length },
    { key: "payroll",   label: "Payroll",   icon: Banknote, count: employee?.payslips?.length },
  ];

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Profile header */}
      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            {/* Avatar + status */}
            <div className="flex flex-col items-center gap-2 sm:w-36">
              <div className={cn(
                "flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold",
                user.is_active ? "bg-[#95271D]/10 text-[#95271D]" : "bg-gray-100 text-gray-400"
              )}>
                {initials}
              </div>
              <Badge variant={user.is_active ? "success" : "danger"}>
                {user.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-start gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
                  {employee?.designation && (
                    <p className="text-sm text-gray-500">{employee.designation}</p>
                  )}
                </div>
                {user.role && (
                  <Badge variant="default" className="mt-1">{ROLE_LABEL[user.role] ?? user.role}</Badge>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {user.email && <InfoRow icon={Mail} text={user.email} />}
                {user.phone && <InfoRow icon={Phone} text={user.phone} />}
                {user.branch_name && <InfoRow icon={Building2} text={user.branch_name} />}
                {employee?.nationality && <InfoRow icon={MapPin} text={employee.nationality} />}
                {employee?.join_date && <InfoRow icon={Calendar} text={`Joined ${employee.join_date}`} />}
                {user.created_at && <InfoRow icon={Shield} text={`Account since ${user.created_at}`} />}
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-1 sm:w-40">
              <StatBox label="Invoices" value={String(invoice_stats?.total_invoices ?? 0)} />
              <StatBox label="Total Sales" value={formatAed(invoice_stats?.total_sales ?? 0)} small />
              {employee?.basic_salary ? (
                <StatBox label="Salary" value={formatAed(employee.basic_salary)} small />
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t.key
                ? "border-[#95271D] text-[#95271D]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}>
            <t.icon className="h-4 w-4" />
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="ml-0.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Account info */}
          <Card>
            <CardHeader><CardTitle>Account Details</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <DetailRow label="User ID" value={`#${user.id}`} />
              <DetailRow label="Role" value={ROLE_LABEL[user.role ?? ""] ?? user.role ?? "—"} />
              <DetailRow label="Branch" value={user.branch_name ?? "All Branches"} />
              <DetailRow label="Email" value={user.email} />
              <DetailRow label="Phone" value={user.phone ?? "—"} />
              <DetailRow label="Status" value={user.is_active ? "Active" : "Inactive"} />
              <DetailRow label="Member since" value={user.created_at} />
              {user.permissions.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-1.5">Permissions</p>
                  <div className="flex flex-wrap gap-1">
                    {user.permissions.slice(0, 12).map((p) => (
                      <Badge key={p} variant="neutral" className="text-[10px]">{p}</Badge>
                    ))}
                    {user.permissions.length > 12 && (
                      <Badge variant="neutral" className="text-[10px]">+{user.permissions.length - 12} more</Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly sales chart */}
          <Card>
            <CardHeader><CardTitle>Sales This Year</CardTitle></CardHeader>
            <CardContent>
              {monthly_stats.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">No sales data yet.</p>
              ) : (
                <div className="flex items-end gap-1.5 h-32">
                  {MONTH_NAMES.map((m, i) => {
                    const stat = monthly_stats.find((s) => s.month === i + 1);
                    const maxSales = Math.max(...monthly_stats.map((s) => s.sales), 1);
                    const height  = stat ? Math.max((stat.sales / maxSales) * 100, 4) : 0;
                    return (
                      <div key={m} className="flex flex-1 flex-col items-center gap-1 group">
                        <div className="relative w-full flex flex-col justify-end" style={{ height: "100px" }}>
                          {stat && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                              <div className="rounded bg-gray-900 px-2 py-1 text-[10px] text-white whitespace-nowrap">
                                {formatAed(stat.sales)}<br />{stat.invoices} inv.
                              </div>
                            </div>
                          )}
                          <div
                            className={cn("w-full rounded-t transition-all", stat ? "bg-[#95271D]" : "bg-gray-100")}
                            style={{ height: `${height}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-gray-400">{m}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Employee profile */}
          {employee && (
            <Card>
              <CardHeader><CardTitle>Employee Profile</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                {employee.employee_number && <DetailRow label="Employee No" value={employee.employee_number} />}
                <DetailRow label="Designation" value={employee.designation ?? "—"} />
                <DetailRow label="Nationality" value={employee.nationality ?? "—"} />
                <DetailRow label="Join Date" value={employee.join_date ?? "—"} />
                {employee.end_date && <DetailRow label="End Date" value={employee.end_date} />}
                <DetailRow label="Basic Salary" value={employee.basic_salary ? formatAed(employee.basic_salary) : "—"} />
              </CardContent>
            </Card>
          )}

          {/* Expiring documents */}
          {employee?.documents && employee.documents.filter((d) => d.expiry_status !== "valid").length > 0 && (
            <Card>
              <CardHeader><CardTitle>Document Alerts</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-2">
                {employee.documents
                  .filter((d) => d.expiry_status !== "valid")
                  .map((doc) => (
                    <div key={doc.id} className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
                      doc.expiry_status === "expired" ? "bg-red-50" : "bg-amber-50"
                    )}>
                      {doc.expiry_status === "expired"
                        ? <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                        : <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />}
                      <div>
                        <p className="font-medium text-gray-900">{DOC_LABEL[doc.doc_type]}</p>
                        <p className="text-xs text-gray-500">
                          {doc.expiry_status === "expired"
                            ? `Expired ${Math.abs(doc.days_until_expiry)} days ago`
                            : `Expires in ${doc.days_until_expiry} days (${doc.expiry_date})`}
                        </p>
                      </div>
                    </div>
                  ))
                }
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {tab === "invoices" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Invoices</CardTitle>
              <div className="flex gap-4 text-sm text-gray-500">
                <span>{invoice_stats?.total_invoices ?? 0} total</span>
                <span className="font-semibold text-gray-900">{formatAed(invoice_stats?.total_sales ?? 0)}</span>
              </div>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Invoice No","Date","Customer","Mode","Channel","Total","Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 first:px-6">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recent_invoices.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-400">No invoices yet.</td></tr>
                ) : recent_invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3 font-mono text-xs font-semibold text-[#95271D]">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-gray-600">{inv.invoice_date}</td>
                    <td className="max-w-[160px] px-4 py-3 truncate text-gray-900">{inv.customer_name ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{inv.payment_mode?.replace("_", " ")}</td>
                    <td className="px-4 py-3"><Badge variant="neutral" className="capitalize">{inv.channel}</Badge></td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{formatAed(inv.total)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={INVOICE_STATUS_VARIANT[inv.status] ?? "neutral"}>
                        {inv.status?.replace("_", " ")}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "documents" && (
        <Card>
          <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Type","Number","Issue Date","Expiry Date","Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 first:px-6">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {!employee?.documents?.length ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">No documents on file.</td></tr>
                ) : employee.documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-3 font-medium text-gray-900">{DOC_LABEL[doc.doc_type]}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{doc.document_number ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{doc.issue_date ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{doc.expiry_date}</td>
                    <td className="px-4 py-3">
                      {doc.expiry_status === "expired" && (
                        <Badge variant="danger" className="flex w-fit items-center gap-1">
                          <XCircle className="h-3 w-3" /> Expired
                        </Badge>
                      )}
                      {doc.expiry_status === "expiring_soon" && (
                        <Badge variant="warning" className="flex w-fit items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Expiring in {doc.days_until_expiry}d
                        </Badge>
                      )}
                      {doc.expiry_status === "valid" && (
                        <Badge variant="success" className="flex w-fit items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Valid
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "expenses" && employee && (
        <ExpenseClaimsSection employee={employee} selfService={selfService} />
      )}

      {tab === "leave" && employee && (
        <LeaveRequestsSection employee={employee} selfService={selfService} />
      )}

      {tab === "targets" && (
        <Card>
          <CardHeader><CardTitle>Sales Targets</CardTitle></CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Period","Target","Achieved","Achievement"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 first:px-6">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {!employee?.sales_targets?.length ? (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-400">No sales targets set.</td></tr>
                ) : employee.sales_targets.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {MONTH_NAMES[t.period_month - 1]} {t.period_year}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatAed(t.target_amount)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{formatAed(t.achieved_amount)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={cn("h-full rounded-full transition-all",
                              t.achievement_pct >= 100 ? "bg-green-500" :
                              t.achievement_pct >= 75  ? "bg-amber-500" : "bg-red-400"
                            )}
                            style={{ width: `${Math.min(t.achievement_pct, 100)}%` }}
                          />
                        </div>
                        <span className={cn("text-xs font-semibold",
                          t.achievement_pct >= 100 ? "text-green-600" :
                          t.achievement_pct >= 75  ? "text-amber-600" : "text-red-500"
                        )}>
                          {t.achievement_pct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "payroll" && employee && (
        <PayrollTab employee={employee} editable={editable} />
      )}
    </div>
  );
}

function ExpenseClaimsSection({ employee, selfService }: { employee: NonNullable<UserDetail["employee"]>; selfService: boolean }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [claimDate, setClaimDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);

  const submitMutation = useMutation({
    mutationFn: () => api.post("/hr/expenses", { description, amount: Number(amount), claim_date: claimDate }),
    onSuccess: () => {
      setAdding(false);
      setDescription("");
      setAmount("");
      qc.invalidateQueries({ queryKey: ["hr-user"] });
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Failed to submit expense claim.");
    },
  });

  const claims = employee.expense_claims ?? [];

  return (
    <div className="flex flex-col gap-4">
      {selfService && (
        <Card>
          <CardContent>
            {!adding ? (
              <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 text-sm font-medium text-[#95271D] hover:underline">
                <Plus className="h-4 w-4" /> New Expense Claim
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-gray-700">Description *</label>
                    <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Fuel for delivery run"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Amount (AED) *</label>
                    <input type="number" min={0.01} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]" />
                  </div>
                </div>
                <div className="w-40">
                  <label className="mb-1 block text-xs font-medium text-gray-700">Claim Date *</label>
                  <input type="date" value={claimDate} onChange={(e) => setClaimDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]" />
                </div>
                <p className="text-xs text-gray-400">Goes to your Branch Manager first, then to Admin for final approval.</p>
                {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setAdding(false); setError(null); }}>Cancel</Button>
                  <Button size="sm" disabled={!description.trim() || !amount} loading={submitMutation.isPending} onClick={() => submitMutation.mutate()}>Submit</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Expense Claims</CardTitle></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Date","Description","Amount","Status","Branch Manager","Admin"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 first:px-6">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!claims.length ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">No expense claims.</td></tr>
              ) : claims.map((claim) => (
                <tr key={claim.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-3 text-gray-600">{claim.claim_date}</td>
                  <td className="max-w-[240px] px-4 py-3 truncate text-gray-900">{claim.description}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatAed(claim.amount)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={APPROVAL_STATUS_VARIANT[claim.status] ?? "neutral"}>
                      {APPROVAL_STATUS_LABEL[claim.status] ?? claim.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{claim.branch_approved_by_name ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{claim.approved_by_name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

const LEAVE_TYPE_LABEL: Record<string, string> = { annual: "Annual", sick: "Sick", unpaid: "Unpaid" };

function LeaveRequestsSection({ employee, selfService }: { employee: NonNullable<UserDetail["employee"]>; selfService: boolean }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [leaveType, setLeaveType] = useState<"annual" | "sick" | "unpaid">("annual");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submitMutation = useMutation({
    mutationFn: () => api.post("/hr/leave", { leave_type: leaveType, start_date: startDate, end_date: endDate, reason: reason || undefined }),
    onSuccess: () => {
      setAdding(false);
      setReason("");
      qc.invalidateQueries({ queryKey: ["hr-user"] });
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Failed to submit leave request.");
    },
  });

  const requests = employee.leave_requests ?? [];

  return (
    <div className="flex flex-col gap-4">
      {selfService && (
        <Card>
          <CardContent>
            {!adding ? (
              <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 text-sm font-medium text-[#95271D] hover:underline">
                <Plus className="h-4 w-4" /> Apply for Leave
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Leave Type *</label>
                    <select value={leaveType} onChange={(e) => setLeaveType(e.target.value as typeof leaveType)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]">
                      <option value="annual">Annual</option>
                      <option value="sick">Sick</option>
                      <option value="unpaid">Unpaid</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Start Date *</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">End Date *</label>
                    <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Reason</label>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Optional"
                    className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]" />
                </div>
                <p className="text-xs text-gray-400">Goes to your Branch Manager first, then to Admin for final approval.</p>
                {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setAdding(false); setError(null); }}>Cancel</Button>
                  <Button size="sm" disabled={endDate < startDate} loading={submitMutation.isPending} onClick={() => submitMutation.mutate()}>Submit</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Leave Requests</CardTitle></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Type","Dates","Days","Status","Branch Manager","Admin"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 first:px-6">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!requests.length ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">No leave requests.</td></tr>
              ) : requests.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-3 text-gray-900">{LEAVE_TYPE_LABEL[r.leave_type] ?? r.leave_type}</td>
                  <td className="px-4 py-3 text-gray-600">{r.start_date} → {r.end_date}</td>
                  <td className="px-4 py-3 text-gray-900">{r.days}</td>
                  <td className="px-4 py-3">
                    <Badge variant={APPROVAL_STATUS_VARIANT[r.status] ?? "neutral"}>
                      {APPROVAL_STATUS_LABEL[r.status] ?? r.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{r.branch_approved_by_name ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{r.approved_by_name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

const SALARY_TYPE_VARIANT: Record<string, "success" | "danger"> = { allowance: "success", deduction: "danger" };

function PayrollTab({ employee, editable }: { employee: NonNullable<UserDetail["employee"]>; editable: boolean }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<"allowance" | "deduction">("allowance");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");

  const addMutation = useMutation({
    mutationFn: () => api.post(`/hr/employees/${employee.id}/salary-components`, { type, name, amount: Number(amount) }),
    onSuccess: () => {
      setAdding(false);
      setName("");
      setAmount("");
      qc.invalidateQueries({ queryKey: ["hr-user"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/hr/salary-components/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr-user"] }),
  });

  const components = employee.salary_components ?? [];
  const allowances = components.filter((c) => c.type === "allowance");
  const deductions = components.filter((c) => c.type === "deduction");
  const totalAllowances = allowances.reduce((s, c) => s + c.amount, 0);
  const totalDeductions = deductions.reduce((s, c) => s + c.amount, 0);
  const netEstimate = employee.basic_salary + totalAllowances - totalDeductions;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Current Salary Structure</CardTitle>
              {editable && !adding && (
                <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-xs font-medium text-[#95271D] hover:underline">
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <DetailRow label="Basic Salary" value={formatAed(employee.basic_salary)} />
            <DetailRow label="Bank" value={employee.bank_name ?? "—"} />
            <DetailRow label="IBAN" value={employee.bank_iban ?? "—"} />

            {adding && (
              <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3">
                <div className="flex gap-2">
                  <select value={type} onChange={(e) => setType(e.target.value as typeof type)}
                    className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]">
                    <option value="allowance">Allowance</option>
                    <option value="deduction">Deduction</option>
                  </select>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Housing Allowance"
                    className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]" />
                  <input type="number" min={0.01} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="AED"
                    className="w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
                  <Button size="sm" disabled={!name.trim() || !amount} loading={addMutation.isPending} onClick={() => addMutation.mutate()}>Save</Button>
                </div>
              </div>
            )}

            {components.length === 0 ? (
              <p className="text-xs text-gray-400">No allowances or deductions configured.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {components.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={SALARY_TYPE_VARIANT[c.type]} className="text-[10px] capitalize">{c.type}</Badge>
                      <span className="text-gray-900">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("font-medium", c.type === "deduction" ? "text-red-600" : "text-green-700")}>
                        {c.type === "deduction" ? "−" : "+"}{formatAed(c.amount)}
                      </span>
                      {editable && (
                        <button onClick={() => deleteMutation.mutate(c.id)} className="text-gray-400 hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-1 flex items-center justify-between rounded-lg bg-[#95271D]/5 px-3 py-2.5">
              <span className="text-sm font-bold text-gray-900">Estimated Net Pay</span>
              <span className="text-base font-bold text-[#95271D]">{formatAed(netEstimate)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Payslip History</CardTitle></CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Period","Net Pay","Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 first:px-6">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {!employee.payslips?.length ? (
                  <tr><td colSpan={3} className="px-6 py-12 text-center text-sm text-gray-400">No payslips yet.</td></tr>
                ) : employee.payslips.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-3 font-medium text-gray-900">{MONTH_NAMES[p.period_month - 1]} {p.period_year}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{formatAed(p.net_pay)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={p.status === "paid" ? "success" : p.status === "approved" ? "warning" : "neutral"} className="capitalize">
                        {p.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <Icon className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
      <span className="truncate">{text}</span>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="flex-shrink-0 text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{value}</span>
    </div>
  );
}

function StatBox({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3 text-center">
      <p className={cn("font-bold text-gray-900", small ? "text-sm" : "text-xl")}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
    </div>
  );
}
