"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserCircle, Wallet, StickyNote, ScrollText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type { Customer } from "@/types/sales";
import { ProfileTab } from "./ProfileTab";
import { CreditLimitsTab } from "./CreditLimitsTab";
import { NotesTab } from "./NotesTab";
import { StatementTab } from "./StatementTab";

type Tab = "profile" | "credit" | "notes" | "statement";

const STATEMENT_ROLES = ["super_admin", "manager", "branch_manager", "accountant"];

export function CustomerDetail({ customerId }: { customerId: number }) {
  const [tab, setTab] = useState<Tab>("profile");
  const roleSlug = useAuthStore((s) => s.user?.role_slug);
  const canViewStatement = !!roleSlug && STATEMENT_ROLES.includes(roleSlug);

  const { data: customer, isLoading } = useQuery<Customer>({
    queryKey: ["crm-customer", customerId],
    queryFn: async () => (await api.get(`/sales/customers/${customerId}`)).data.data,
  });

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "profile", label: "Profile", icon: UserCircle },
    { key: "credit", label: "Credit Limits", icon: Wallet },
    { key: "notes", label: "Notes", icon: StickyNote },
    ...(canViewStatement ? [{ key: "statement" as Tab, label: "Statement", icon: ScrollText }] : []),
  ];

  if (isLoading || !customer) {
    return <Card className="flex min-h-[300px] items-center justify-center text-sm text-gray-400">Loading...</Card>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{customer.name}</h2>
            <p className="text-xs text-gray-500">{customer.trade_name ?? customer.email ?? customer.phone ?? "—"}</p>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
        {tabs.map((t) => (
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

      {tab === "profile" && <ProfileTab customer={customer} />}
      {tab === "credit" && <CreditLimitsTab customerId={customerId} />}
      {tab === "notes" && <NotesTab customerId={customerId} />}
      {tab === "statement" && canViewStatement && <StatementTab customerId={customerId} />}
    </div>
  );
}
