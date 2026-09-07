"use client";

import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Boxes,
  AlertCircle,
  CreditCard,
  ArrowRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { cn } from "@/lib/cn";

interface KpiData {
  today_sales: number;
  today_invoices: number;
  overdue_ar: number;
  low_stock_parts: number;
  pending_transfers: number;
  pending_cheques: number;
}

function formatAed(value: number) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
  }).format(value);
}

function KpiCard({
  title,
  value,
  sub,
  icon: Icon,
  trend,
  trendLabel,
  accentColor = "brand",
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  accentColor?: "brand" | "amber" | "green" | "red";
}) {
  const iconBg: Record<string, string> = {
    brand: "bg-[#95271D]/10 text-[#95271D]",
    amber: "bg-amber-100 text-amber-700",
    green: "bg-green-100 text-green-700",
    red:   "bg-red-100 text-red-700",
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", iconBg[accentColor])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
        </div>
        {trend && trendLabel && (
          <div className="flex items-center gap-1">
            {trend === "up" && <TrendingUp className="h-3 w-3 text-green-600" />}
            {trend === "down" && <TrendingDown className="h-3 w-3 text-red-500" />}
            <span className={cn("text-xs font-medium",
              trend === "up" && "text-green-600",
              trend === "down" && "text-red-500",
              trend === "neutral" && "text-gray-500"
            )}>
              {trendLabel}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-5">
        <div className="flex items-center justify-between">
          <div className="h-4 w-28 animate-pulse rounded bg-gray-100" />
          <div className="h-9 w-9 animate-pulse rounded-lg bg-gray-100" />
        </div>
        <div className="h-7 w-36 animate-pulse rounded bg-gray-100" />
        <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: kpi, isLoading } = useQuery<KpiData>({
    queryKey: ["dashboard-kpi"],
    queryFn: async () => {
      const res = await api.get("/dashboard/kpi");
      return res.data.data;
    },
    // show placeholder values if the endpoint isn't ready yet
    placeholderData: {
      today_sales: 0,
      today_invoices: 0,
      overdue_ar: 0,
      low_stock_parts: 0,
      pending_transfers: 0,
      pending_cheques: 0,
    },
    retry: false,
  });

  const greet = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          {greet()}, {user?.name?.split(" ")[0] ?? "there"}
        </h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {new Date().toLocaleDateString("en-AE", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <KpiCard
              title="Today's Sales"
              value={formatAed(kpi?.today_sales ?? 0)}
              sub={`${kpi?.today_invoices ?? 0} invoices`}
              icon={ShoppingBag}
              trend="up"
              trendLabel="vs. yesterday"
              accentColor="brand"
            />
            <KpiCard
              title="Overdue Receivables"
              value={formatAed(kpi?.overdue_ar ?? 0)}
              sub="Past due date"
              icon={CreditCard}
              trend={(kpi?.overdue_ar ?? 0) > 0 ? "down" : "neutral"}
              trendLabel={(kpi?.overdue_ar ?? 0) > 0 ? "Requires action" : "All clear"}
              accentColor={(kpi?.overdue_ar ?? 0) > 0 ? "red" : "green"}
            />
            <KpiCard
              title="Low Stock Parts"
              value={String(kpi?.low_stock_parts ?? 0)}
              sub="Below minimum threshold"
              icon={Boxes}
              trend={(kpi?.low_stock_parts ?? 0) > 0 ? "down" : "neutral"}
              trendLabel={(kpi?.low_stock_parts ?? 0) > 0 ? "Reorder needed" : "Stock healthy"}
              accentColor={(kpi?.low_stock_parts ?? 0) > 0 ? "amber" : "green"}
            />
            <KpiCard
              title="Pending Transfers"
              value={String(kpi?.pending_transfers ?? 0)}
              sub="Awaiting approval or issue"
              icon={ArrowRight}
              accentColor="amber"
            />
            <KpiCard
              title="Cheques Due Soon"
              value={String(kpi?.pending_cheques ?? 0)}
              sub="Due within 3 days"
              icon={AlertCircle}
              accentColor={(kpi?.pending_cheques ?? 0) > 0 ? "red" : "brand"}
            />
          </>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {[
              { label: "New Invoice",       href: "/sales/invoices/new" },
              { label: "New Quotation",     href: "/sales/quotations/new" },
              { label: "Stock Transfer",    href: "/inventory/transfers/new" },
              { label: "Purchase Invoice",  href: "/purchasing/invoices/new" },
            ].map(({ label, href }) => (
              <a
                key={href}
                href={href}
                className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 hover:border-[#95271D]/30 hover:bg-[#95271D]/5 hover:text-[#95271D] transition-colors"
              >
                {label}
                <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
              </a>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            {[
              { label: "Database",     status: "Operational" },
              { label: "Queue Worker", status: "Operational" },
              { label: "Redis Cache",  status: "Operational" },
              { label: "File Storage", status: "Operational" },
            ].map(({ label, status }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{label}</span>
                <Badge variant="success">{status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
