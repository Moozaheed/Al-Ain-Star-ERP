"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type { Customer, SalesChannel } from "@/types/sales";

export function ProfileTab({ customer }: { customer: Customer }) {
  const [editing, setEditing] = useState(false);
  const canUpdate = useAuthStore((s) => s.hasPermission("crm.update"));

  if (editing) {
    return <EditForm customer={customer} onDone={() => setEditing(false)} />;
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Badge variant={customer.is_active ? "success" : "neutral"}>{customer.is_active ? "Active" : "Inactive"}</Badge>
          {canUpdate && (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs font-medium text-[#95271D] hover:underline">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          )}
        </div>

        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Type" value={customer.type.toUpperCase()} />
          <Field label="Trade Name" value={customer.trade_name} />
          <Field label="Phone" value={customer.phone} />
          <Field label="Email" value={customer.email} />
          <Field label="TRN" value={customer.trn} />
          <Field label="Address" value={customer.address} />
        </dl>
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value || "—"}</dd>
    </div>
  );
}

function EditForm({ customer, onDone }: { customer: Customer; onDone: () => void }) {
  const qc = useQueryClient();
  const [type, setType] = useState<SalesChannel>(customer.type);
  const [name, setName] = useState(customer.name);
  const [tradeName, setTradeName] = useState(customer.trade_name ?? "");
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [email, setEmail] = useState(customer.email ?? "");
  const [trn, setTrn] = useState(customer.trn ?? "");
  const [address, setAddress] = useState(customer.address ?? "");
  const [isActive, setIsActive] = useState(customer.is_active);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.put(`/sales/customers/${customer.id}`, {
      type,
      name,
      trade_name: tradeName || null,
      phone: phone || null,
      email: email || null,
      trn: trn || null,
      address: address || null,
      is_active: isActive,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-customer", customer.id] });
      qc.invalidateQueries({ queryKey: ["crm-customers"] });
      onDone();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message ?? "Failed to update customer.");
    },
  });

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <Input label="Trade Name" value={tradeName} onChange={(e) => setTradeName(e.target.value)} />
          <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="TRN" value={trn} onChange={(e) => setTrn(e.target.value)} />
          <div className="sm:col-span-2">
            <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[#95271D] focus:ring-[#95271D]" />
            Active
          </label>
        </div>
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onDone}>Cancel</Button>
          <Button loading={mutation.isPending} disabled={!name.trim()} onClick={() => mutation.mutate()}>Save</Button>
        </div>
      </CardContent>
    </Card>
  );
}
