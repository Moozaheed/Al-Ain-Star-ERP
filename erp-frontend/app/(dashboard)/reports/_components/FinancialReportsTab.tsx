"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { ProfitAndLossView, VatReturnView } from "../../accounting/_components/ReportsTab";

export function FinancialReportsTab() {
  const [view, setView] = useState<"pl" | "vat">("pl");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex w-fit gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
        {(["pl", "vat"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
              view === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            {v === "pl" ? "Profit & Loss" : "VAT Return"}
          </button>
        ))}
      </div>

      {view === "pl" ? <ProfitAndLossView /> : <VatReturnView />}
    </div>
  );
}
