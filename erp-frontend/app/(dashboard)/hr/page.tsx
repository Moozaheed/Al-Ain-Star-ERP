"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Search, X, Users, TrendingUp, UserCheck, UserX,
  ChevronRight, ChevronLeft, ArrowRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import api from "@/lib/api";
import type { HrUser } from "@/types/hr";

const ROLE_LABEL: Record<string, string> = {
  super_admin:     "Super Admin",
  manager:         "Manager",
  branch_manager:  "Branch Manager",
  sales_staff:     "Sales Staff",
  warehouse_staff: "Warehouse Staff",
  accountant:      "Accountant",
  viewer:          "Viewer",
};

const ROLE_VARIANT: Record<string, "default" | "success" | "warning" | "neutral"> = {
  super_admin:     "default",
  manager:         "default",
  branch_manager:  "success",
  sales_staff:     "neutral",
  warehouse_staff: "neutral",
  accountant:      "warning",
  viewer:          "neutral",
};

function formatAed(v: number) {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", minimumFractionDigits: 0 }).format(v);
}

interface Paginated<T> { data: T[]; meta: { current_page: number; last_page: number; total: number } }

export default function HRPage() {
  const router = useRouter();
  const [search, setSearch]       = useState("");
  const [activeFilter, setActive] = useState<string>("");
  const [page, setPage]           = useState(1);

  const { data, isLoading } = useQuery<Paginated<HrUser>>({
    queryKey: ["hr-users", search, activeFilter, page],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), per_page: "20",
        ...(search && { search }),
        ...(activeFilter !== "" && { is_active: activeFilter }),
      });
      return (await api.get(`/hr/users?${p}`)).data;
    },
    placeholderData: (prev) => prev,
  });

  const users  = data?.data ?? [];
  const meta   = data?.meta;
  const active = users.filter((u) => u.is_active).length;
  const total  = meta?.total ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">HR — People</h1>
        <p className="mt-0.5 text-sm text-gray-500">System users, roles, and sales activity</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiChip label="Total Users" value={total} icon={Users} color="brand" />
        <KpiChip label="Active" value={active} icon={UserCheck} color="green" />
        <KpiChip label="Inactive" value={total - active} icon={UserX} color="red" />
        <KpiChip
          label="Total Sales"
          value={formatAed(users.reduce((s, u) => s + (u.total_sales ?? 0), 0))}
          icon={TrendingUp}
          color="amber"
          isText
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, email..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]"
          />
        </div>
        <select
          value={activeFilter}
          onChange={(e) => { setActive(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        {(search || activeFilter) && (
          <button onClick={() => { setSearch(""); setActive(""); setPage(1); }}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      {/* User cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-gray-400">No users found.</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {users.map((user) => (
            <UserCard key={user.id} user={user} onClick={() => router.push(`/hr/${user.id}`)} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">Page {meta.current_page} of {meta.last_page}</p>
          <div className="flex gap-1">
            <PageBtn onClick={() => setPage((p) => p - 1)} disabled={meta.current_page === 1}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </PageBtn>
            <PageBtn onClick={() => setPage((p) => p + 1)} disabled={meta.current_page === meta.last_page}>
              <ChevronRight className="h-3.5 w-3.5" />
            </PageBtn>
          </div>
        </div>
      )}
    </div>
  );
}

function UserCard({ user, onClick }: { user: HrUser; onClick: () => void }) {
  const initials = user.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <button
      onClick={onClick}
      className="group w-full rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition-all hover:border-[#95271D]/30 hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className={cn(
          "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold",
          user.is_active ? "bg-[#95271D]/10 text-[#95271D]" : "bg-gray-100 text-gray-400"
        )}>
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-semibold text-gray-900">{user.name}</p>
            <ArrowRight className="h-4 w-4 flex-shrink-0 text-gray-300 group-hover:text-[#95271D] transition-colors" />
          </div>
          <p className="truncate text-xs text-gray-500">{user.email}</p>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {user.role && (
              <Badge variant={ROLE_VARIANT[user.role] ?? "neutral"} className="text-[10px]">
                {ROLE_LABEL[user.role] ?? user.role}
              </Badge>
            )}
            {user.branch_name && (
              <Badge variant="neutral" className="text-[10px]">{user.branch_name}</Badge>
            )}
            {!user.is_active && (
              <Badge variant="danger" className="text-[10px]">Inactive</Badge>
            )}
          </div>

          {user.designation && (
            <p className="mt-1.5 text-xs text-gray-500">{user.designation}</p>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-4 flex items-center gap-4 border-t border-gray-50 pt-3">
        <div className="flex-1 text-center">
          <p className="text-lg font-bold text-gray-900">{user.invoice_count}</p>
          <p className="text-[10px] uppercase tracking-wide text-gray-400">Invoices</p>
        </div>
        <div className="h-8 w-px bg-gray-100" />
        <div className="flex-1 text-center">
          <p className="text-sm font-bold text-gray-900">{formatAed(user.total_sales ?? 0)}</p>
          <p className="text-[10px] uppercase tracking-wide text-gray-400">Total Sales</p>
        </div>
        {user.join_date && (
          <>
            <div className="h-8 w-px bg-gray-100" />
            <div className="flex-1 text-center">
              <p className="text-xs font-medium text-gray-700">{user.join_date}</p>
              <p className="text-[10px] uppercase tracking-wide text-gray-400">Joined</p>
            </div>
          </>
        )}
      </div>
    </button>
  );
}

function KpiChip({ label, value, icon: Icon, color, isText }: {
  label: string; value: number | string; icon: React.ElementType;
  color: "brand" | "amber" | "green" | "red"; isText?: boolean;
}) {
  const styles = {
    brand: "bg-[#95271D]/10 text-[#95271D]",
    amber: "bg-amber-100 text-amber-700",
    green: "bg-green-100 text-green-700",
    red:   "bg-red-100 text-red-700",
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg", styles[color])}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className={cn("font-bold text-gray-900", isText ? "text-sm" : "text-xl")}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start gap-4">
        <div className="h-11 w-11 animate-pulse rounded-full bg-gray-100" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
          <div className="h-3 w-40 animate-pulse rounded bg-gray-100" />
          <div className="h-5 w-20 animate-pulse rounded-full bg-gray-100" />
        </div>
      </div>
      <div className="mt-4 flex gap-4 border-t border-gray-50 pt-3">
        {[1, 2].map((i) => (
          <div key={i} className="flex-1 space-y-1 text-center">
            <div className="mx-auto h-5 w-12 animate-pulse rounded bg-gray-100" />
            <div className="mx-auto h-2 w-16 animate-pulse rounded bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
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
