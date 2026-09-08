"use client";

import { useState } from "react";
import { CustomerList } from "./_components/CustomerList";
import { CustomerDetail } from "./_components/CustomerDetail";

export default function CrmPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">CRM</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Customer profiles, credit limits, payment history, and relationship notes
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        <CustomerList selectedId={selectedId} onSelect={setSelectedId} />
        {selectedId ? (
          <CustomerDetail customerId={selectedId} />
        ) : (
          <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white text-sm text-gray-400">
            Select a customer to view their profile
          </div>
        )}
      </div>
    </div>
  );
}
