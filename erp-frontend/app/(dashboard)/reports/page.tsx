"use client";

import { useMemo, useState } from "react";
import { LineChart, Boxes, Building2, Landmark } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/store/authStore";
import { SalesReportsTab } from "./_components/SalesReportsTab";
import { StockReportsTab } from "./_components/StockReportsTab";
import { BranchPerformanceTab } from "./_components/BranchPerformanceTab";
import { FinancialReportsTab } from "./_components/FinancialReportsTab";

type Tab = "sales" | "stock" | "branch" | "financial";

const SALES_ROLES = ["super_admin", "manager", "branch_manager", "accountant", "viewer"];
const STOCK_ROLES = ["super_admin", "manager", "branch_manager", "warehouse_staff", "viewer"];
const BRANCH_ROLES = ["super_admin", "manager", "branch_manager"];

export default function ReportsPage() {
  const roleSlug = useAuthStore((s) => s.user?.role_slug);
  const canFinancial = useAuthStore((s) => s.hasPermission("accounting.read"));

  const tabs = useMemo(() => {
    const list: { key: Tab; label: string; icon: React.ElementType }[] = [];
    if (roleSlug && SALES_ROLES.includes(roleSlug)) list.push({ key: "sales", label: "Sales Reports", icon: LineChart });
    if (roleSlug && STOCK_ROLES.includes(roleSlug)) list.push({ key: "stock", label: "Stock Ageing & Balance", icon: Boxes });
    if (roleSlug && BRANCH_ROLES.includes(roleSlug)) list.push({ key: "branch", label: "Branch Performance", icon: Building2 });
    if (canFinancial) list.push({ key: "financial", label: "P&L / VAT", icon: Landmark });
    return list;
  }, [roleSlug, canFinancial]);

  const [tab, setTab] = useState<Tab | null>(null);
  const activeTab = tab && tabs.some((t) => t.key === tab) ? tab : tabs[0]?.key ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Reports</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Sales reports, stock ageing, P&L statements, VAT reports, and branch performance analytics
        </p>
      </div>

      {tabs.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white text-sm text-gray-400">
          No reports are available for your role.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors",
                  activeTab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === "sales" && <SalesReportsTab />}
          {activeTab === "stock" && <StockReportsTab />}
          {activeTab === "branch" && <BranchPerformanceTab />}
          {activeTab === "financial" && <FinancialReportsTab />}
        </>
      )}
    </div>
  );
}
