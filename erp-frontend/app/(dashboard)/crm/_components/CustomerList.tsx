"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, X, Building2, User } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type { Customer, SalesChannel } from "@/types/sales";

const CHANNEL_LABEL: Record<SalesChannel, string> = { retail: "Retail", b2b: "B2B", online: "Online" };

export function CustomerList({ selectedId, onSelect }: { selectedId: number | null; onSelect: (id: number) => void }) {
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const canCreate = useAuthStore((s) => s.hasPermission("crm.create"));

  const { data, isLoading } = useQuery<{ data: Customer[] }>({
    queryKey: ["crm-customers", search],
    queryFn: async () => (await api.get("/sales/customers", { params: { search: search || undefined, per_page: 50 } })).data,
  });

  const customers = data?.data ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, TRN..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]"
          />
        </div>
        {canCreate && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Card className="max-h-[65vh] overflow-y-auto">
        {isLoading ? (
          <div className="px-6 py-10 text-center text-sm text-gray-400">Loading...</div>
        ) : customers.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-gray-400">No customers found.</div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {customers.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => onSelect(c.id)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50",
                    selectedId === c.id && "bg-[#95271D]/5"
                  )}
                >
                  <div className={cn(
                    "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg",
                    c.type === "b2b" ? "bg-[#95271D]/10 text-[#95271D]" : "bg-gray-100 text-gray-500"
                  )}>
                    {c.type === "b2b" ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{c.name}</p>
                    <p className="truncate text-xs text-gray-500">{c.phone ?? c.email ?? "No contact info"}</p>
                  </div>
                  <Badge variant={c.type === "b2b" ? "default" : "neutral"}>{CHANNEL_LABEL[c.type]}</Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {creating && <NewCustomerModal onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); onSelect(id); }} />}
    </div>
  );
}

function NewCustomerModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }) {
  const qc = useQueryClient();
  const [type, setType] = useState<SalesChannel>("retail");
  const [name, setName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [trn, setTrn] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.post("/sales/customers", {
      type,
      name,
      trade_name: tradeName || null,
      phone: phone || null,
      email: email || null,
      trn: trn || null,
      address: address || null,
    }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["crm-customers"] });
      onCreated(res.data.data.id);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message ?? "Failed to create customer.");
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">New Customer</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Type *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as SalesChannel)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]"
            >
              <option value="retail">Retail</option>
              <option value="b2b">B2B</option>
              <option value="online">Online</option>
            </select>
          </div>
          <Input label="Name *" value={name} onChange={(e) => setName(e.target.value)} required />
          {type === "b2b" && <Input label="Trade Name" value={tradeName} onChange={(e) => setTradeName(e.target.value)} />}
          <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          {type === "b2b" && <Input label="TRN" value={trn} onChange={(e) => setTrn(e.target.value)} placeholder="15-digit Tax Registration Number" />}
          <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={mutation.isPending} disabled={!name.trim()} onClick={() => mutation.mutate()}>Create</Button>
        </div>
      </div>
    </div>
  );
}
