"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, X, Pencil } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import api from "@/lib/api";
import type { ChartOfAccount, AccountType } from "@/types/accounting";

interface Paginated<T> { data: T[]; meta: { total: number } }

const TYPE_VARIANT: Record<AccountType, "default" | "success" | "warning" | "danger" | "neutral"> = {
  asset: "default",
  liability: "warning",
  equity: "neutral",
  revenue: "success",
  expense: "danger",
};

export function ChartOfAccountsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [modal, setModal] = useState<{ open: boolean; account: ChartOfAccount | null }>({ open: false, account: null });

  const { data, isLoading } = useQuery<Paginated<ChartOfAccount>>({
    queryKey: ["chart-of-accounts"],
    queryFn: async () => (await api.get("/accounting/accounts?per_page=200")).data,
  });

  const rows = (data?.data ?? []).filter((a) => {
    if (typeFilter && a.type !== typeFilter) return false;
    if (search && !`${a.code} ${a.name}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["chart-of-accounts"] });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code or name..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]"
        >
          <option value="">All Types</option>
          {(["asset", "liability", "equity", "revenue", "expense"] as AccountType[]).map((t) => (
            <option key={t} value={t} className="capitalize">{t}</option>
          ))}
        </select>
        {(search || typeFilter) && (
          <button onClick={() => { setSearch(""); setTypeFilter(""); }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
        <Button size="sm" onClick={() => setModal({ open: true, account: null })}>
          <Plus className="mr-1.5 h-4 w-4" /> Add Account
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Subtype</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">No accounts found.</td></tr>
              ) : rows.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-3 font-mono text-xs font-semibold text-gray-900">{a.code}</td>
                  <td className="px-4 py-3 text-gray-900">
                    {a.name}
                    {a.is_system && <span className="ml-1.5 text-[10px] text-gray-400">(system)</span>}
                  </td>
                  <td className="px-4 py-3"><Badge variant={TYPE_VARIANT[a.type]} className="capitalize">{a.type}</Badge></td>
                  <td className="px-4 py-3 text-gray-500">{a.subtype ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={a.is_active ? "success" : "neutral"}>{a.is_active ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setModal({ open: true, account: a })} className="text-gray-400 hover:text-[#95271D]">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {modal.open && (
        <AccountModal account={modal.account} onClose={() => setModal({ open: false, account: null })} onSaved={() => { setModal({ open: false, account: null }); invalidate(); }} />
      )}
    </div>
  );
}

function AccountModal({ account, onClose, onSaved }: { account: ChartOfAccount | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = account !== null;
  const [code, setCode] = useState(account?.code ?? "");
  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState<AccountType>(account?.type ?? "asset");
  const [subtype, setSubtype] = useState(account?.subtype ?? "");
  const [isActive, setIsActive] = useState(account?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError(null);
    setSaving(true);
    try {
      const payload = { code, name, type, subtype: subtype || null, is_active: isActive };
      if (isEdit) {
        await api.put(`/accounting/accounts/${account.id}`, payload);
      } else {
        await api.post("/accounting/accounts", payload);
      }
      onSaved();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const msgs = err?.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(" ") : err?.response?.data?.message ?? "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">{isEdit ? "Edit Account" : "New Account"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex flex-col gap-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Code *</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} disabled={isEdit && account.is_system}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D] disabled:bg-gray-50 disabled:text-gray-400"
              placeholder="e.g. 6700" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]"
              placeholder="e.g. Insurance Expense" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Type *</label>
            <select value={type} onChange={(e) => setType(e.target.value as AccountType)} disabled={isEdit && account.is_system}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D] disabled:bg-gray-50 disabled:text-gray-400 capitalize">
              {(["asset", "liability", "equity", "revenue", "expense"] as AccountType[]).map((t) => (
                <option key={t} value={t} className="capitalize">{t}</option>
              ))}
            </select>
            {isEdit && account.is_system && <p className="mt-1 text-xs text-gray-400">System account — type can&apos;t change.</p>}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Subtype</label>
            <input value={subtype} onChange={(e) => setSubtype(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#95271D] focus:outline-none focus:ring-1 focus:ring-[#95271D]"
              placeholder="e.g. operating_expense" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#95271D] focus:ring-[#95271D]" />
            Active
          </label>
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={saving} disabled={!code.trim() || !name.trim()} onClick={submit}>{isEdit ? "Save Changes" : "Add Account"}</Button>
        </div>
      </div>
    </div>
  );
}

