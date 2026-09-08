"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, BookOpen, ListTree, Landmark,
  ArrowDownToLine, ArrowUpFromLine, FileSpreadsheet, ScrollText, Banknote,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import api from "@/lib/api";
import type { AgingReport, ProfitAndLossReport } from "@/types/accounting";
import { ChartOfAccountsTab } from "./_components/ChartOfAccountsTab";
import { JournalTab } from "./_components/JournalTab";
import { ReceivablesTab } from "./_components/ReceivablesTab";
import { PayablesTab } from "./_components/PayablesTab";
import { ChequesTab } from "./_components/ChequesTab";
import { ReportsTab } from "./_components/ReportsTab";
import { BankReconciliationTab } from "./_components/BankReconciliationTab";

type Tab = "overview" | "coa" | "journal" | "receivables" | "payables" | "cheques" | "reports" | "bank";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "coa", label: "Chart of Accounts", icon: ListTree },
  { key: "journal", label: "Journal", icon: BookOpen },
  { key: "receivables", label: "Receivables", icon: ArrowDownToLine },
  { key: "payables", label: "Payables", icon: ArrowUpFromLine },
  { key: "cheques", label: "Cheques", icon: FileSpreadsheet },
  { key: "reports", label: "Reports", icon: ScrollText },
  { key: "bank", label: "Bank Reconciliation", icon: Landmark },
];

export default function AccountingPage() {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Accounting</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Chart of accounts, journal, receivables/payables, cheques, and financial reports
        </p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors",
              tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab onNavigate={setTab} />}
      {tab === "coa" && <ChartOfAccountsTab />}
      {tab === "journal" && <JournalTab />}
      {tab === "receivables" && <ReceivablesTab />}
      {tab === "payables" && <PayablesTab />}
      {tab === "cheques" && <ChequesTab />}
      {tab === "reports" && <ReportsTab />}
      {tab === "bank" && <BankReconciliationTab />}
    </div>
  );
}

function formatAed(v: number) {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", minimumFractionDigits: 2 }).format(v);
}

function OverviewTab({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().slice(0, 10);
  const todayStr = new Date().toISOString().slice(0, 10);

  const { data: ar } = useQuery<AgingReport>({
    queryKey: ["accounting-overview-ar"],
    queryFn: async () => (await api.get("/accounting/receivables")).data.data,
  });

  const { data: ap } = useQuery<AgingReport>({
    queryKey: ["accounting-overview-ap"],
    queryFn: async () => (await api.get("/accounting/payables")).data.data,
  });

  const { data: pl } = useQuery<ProfitAndLossReport>({
    queryKey: ["accounting-overview-pl", monthStartStr, todayStr],
    queryFn: async () => (await api.get(`/accounting/profit-and-loss?date_from=${monthStartStr}&date_to=${todayStr}`)).data.data,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Total Receivable" value={formatAed(ar?.summary.total ?? 0)} color="brand" />
        <KpiCard label="Total Payable" value={formatAed(ap?.summary.total ?? 0)} color="amber" />
        <KpiCard
          label="Net Income (MTD)"
          value={formatAed(pl?.net_income ?? 0)}
          color={(pl?.net_income ?? 0) >= 0 ? "green" : "red"}
        />
        <KpiCard label="Overdue Receivable" value={formatAed((ar?.summary.total ?? 0) - (ar?.summary.current ?? 0))} color="red" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <QuickLink label="Chart of Accounts" desc="View and manage accounts" icon={ListTree} onClick={() => onNavigate("coa")} />
        <QuickLink label="Journal" desc="Post and browse journal entries" icon={BookOpen} onClick={() => onNavigate("journal")} />
        <QuickLink label="Receivables" desc="AR aging, record customer payments" icon={ArrowDownToLine} onClick={() => onNavigate("receivables")} />
        <QuickLink label="Payables" desc="AP aging, record supplier payments" icon={ArrowUpFromLine} onClick={() => onNavigate("payables")} />
        <QuickLink label="Cheques" desc="Received/issued, clear or bounce" icon={FileSpreadsheet} onClick={() => onNavigate("cheques")} />
        <QuickLink label="Reports" desc="P&L, Balance Sheet, VAT Return, GL" icon={ScrollText} onClick={() => onNavigate("reports")} />
      </div>
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string; color: "brand" | "amber" | "green" | "red" }) {
  const styles = {
    brand: "bg-[#95271D]/10 text-[#95271D]",
    amber: "bg-amber-100 text-amber-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
  };
  return (
    <Card>
      <CardContent className="py-4">
        <div className={cn("mb-2 inline-flex items-center rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-wide", styles[color])}>
          <Banknote className="mr-1 h-3 w-3" />
          {label}
        </div>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </CardContent>
    </Card>
  );
}

function QuickLink({ label, desc, icon: Icon, onClick }: { label: string; desc: string; icon: React.ElementType; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-left">
      <Card className="transition-colors hover:border-[#95271D]/30">
        <CardContent className="flex items-start gap-3 py-4">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#95271D]/10 text-[#95271D]">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{label}</p>
            <p className="text-xs text-gray-500">{desc}</p>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
